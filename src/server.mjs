import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import cors from 'cors';
import bodyParser from 'body-parser';
import config from './config/config.js';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Authentication middleware
const authenticate = (req, res, next) => {
  const { username, password } = req.body;
  
  const user = config.users.find(
    user => user.username === username && user.password === password
  );
  
  if (user) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
};

// API Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = config.users.find(
    user => user.username === username && user.password === password
  );
  
  if (user) {
    res.json({ success: true, message: 'Login successful' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

app.get('/api/applications', (req, res) => {
  res.json(config.applications);
});

// Nova rota para verificar se os diretórios base existem
app.get('/api/application/:id/check-directories', (req, res) => {
  const appId = parseInt(req.params.id);
  const application = config.applications.find(app => app.id === appId);
  
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }
  
  try {
    const userDataDirPath = path.join(application.directory, 'userDataDir');
    const tokensPath = path.join(application.directory, 'tokens');
    
    const hasUserDataDir = fs.existsSync(userDataDirPath);
    const hasTokensDir = fs.existsSync(tokensPath);
    
    res.json({
      success: true,
      hasValidDirectories: hasUserDataDir && hasTokensDir,
      directories: {
        userDataDir: hasUserDataDir,
        tokensDir: hasTokensDir
      }
    });
  } catch (error) {
    console.error('Error checking directories:', error);
    res.status(500).json({ success: false, message: 'Error checking directories' });
  }
});

app.get('/api/application/:id/user-directories', (req, res) => {
  const appId = parseInt(req.params.id);
  const application = config.applications.find(app => app.id === appId);
  
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }
  
  const userDataDirPath = path.join(application.directory, 'userDataDir');
  
  try {
    // Read all user directories
    const directories = fs.readdirSync(userDataDirPath)
      .filter(item => fs.statSync(path.join(userDataDirPath, item)).isDirectory())
      .map(dir => ({
        id: dir,
        name: dir
      }));
    
    // Modificado para retornar no formato esperado pelo frontend
    res.json({
      success: true,
      directories: directories
    });
  } catch (error) {
    console.error('Error reading user directories:', error);
    res.status(500).json({ success: false, message: 'Error reading user directories' });
  }
});

app.delete('/api/application/:appId/user-directory/:dirId', (req, res) => {
  const appId = parseInt(req.params.appId);
  const dirId = req.params.dirId;
  
  console.log(`Attempting to delete directory for app ${appId}, directory ${dirId}`);
  
  const application = config.applications.find(app => app.id === appId);
  
  if (!application) {
    console.log('Application not found:', appId);
    return res.status(404).json({ success: false, message: 'Application not found' });
  }
  
  console.log('Found application:', application.name);
  
  const userDataDirPath = path.join(application.directory, 'userDataDir', dirId);
  const tokensFilePath = path.join(application.directory, 'tokens', `${dirId}.json`);
  
  console.log('Paths to delete:', {
    userDataDirPath,
    tokensFilePath
  });
  
  try {
    // Verificar se os diretórios existem antes de tentar deletar
    const userDirExists = fs.existsSync(userDataDirPath);
    const tokenFileExists = fs.existsSync(tokensFilePath);
    
    console.log('Existence check:', {
      userDirExists,
      tokenFileExists
    });
    
    if (!userDirExists && !tokenFileExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Directory and token file not found' 
      });
    }
    
    // Delete user directory
    if (userDirExists) {
      try {
        fs.removeSync(userDataDirPath);
        console.log('Successfully deleted user directory');
      } catch (dirError) {
        console.error('Error deleting user directory:', dirError);
        throw dirError;
      }
    }
    
    // Delete tokens file
    if (tokenFileExists) {
      try {
        fs.removeSync(tokensFilePath);
        console.log('Successfully deleted token file');
      } catch (tokenError) {
        console.error('Error deleting token file:', tokenError);
        throw tokenError;
      }
    }
    
    // Verificar se o PM2 está disponível
    exec('pm2 list', (pmError, stdout, stderr) => {
      if (pmError) {
        console.log('PM2 not available, skipping restart');
        // Se PM2 não estiver disponível, ainda retornamos sucesso pois os arquivos foram deletados
        return res.json({ 
          success: true, 
          message: `Successfully deleted directory (PM2 restart skipped)`,
          details: {
            userDirDeleted: userDirExists,
            tokenFileDeleted: tokenFileExists,
            pm2Available: false
          }
        });
      }
      
      // PM2 está disponível, tenta reiniciar o processo
      console.log('PM2 available, attempting to restart process:', application.pm2Name);
      
      exec(`pm2 restart ${application.pm2Name}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error restarting PM2 process: ${error}`);
          // Mesmo com erro no PM2, retornamos sucesso pois os arquivos foram deletados
          return res.json({ 
            success: true, 
            message: `Directory deleted but failed to restart PM2 process: ${error.message}`,
            details: {
              userDirDeleted: userDirExists,
              tokenFileDeleted: tokenFileExists,
              pm2Available: true,
              pm2Restarted: false
            }
          });
        }
        
        console.log('Successfully restarted PM2 process');
        res.json({ 
          success: true, 
          message: `Successfully deleted directory and restarted ${application.name}`,
          details: {
            userDirDeleted: userDirExists,
            tokenFileDeleted: tokenFileExists,
            pm2Available: true,
            pm2Restarted: true
          }
        });
      });
    });
  } catch (error) {
    console.error('Error in delete operation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting directory',
      error: error.message
    });
  }
});

// Download project ZIP
app.get('/api/download', (req, res) => {
  try {
    const rootDir = path.join(__dirname, '..');
    const output = fs.createWriteStream(path.join(rootDir, 'pm2-apps-manager.zip'));
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Handle archive events
    output.on('close', () => {
      console.log(`Archive created: ${archive.pointer()} total bytes`);
      const zipPath = path.join(rootDir, 'pm2-apps-manager.zip');
      res.download(zipPath, 'pm2-apps-manager.zip', (err) => {
        if (err) {
          console.error('Error sending file:', err);
        }
        // Clean up - delete the file after sending
        fs.unlink(zipPath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting zip file:', unlinkErr);
          }
        });
      });
    });
    
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      res.status(500).json({ success: false, message: 'Error creating archive' });
    });
    
    // Pipe the archive to the output file
    archive.pipe(output);
    
    // Add files to the archive
    const filesToExclude = [
      'node_modules', 
      'dist', 
      '.git',
      'pm2-apps-manager.zip'
    ];
    
    // Add all files from the project root, excluding the ones in filesToExclude
    fs.readdirSync(rootDir).forEach(item => {
      const itemPath = path.join(rootDir, item);
      if (!filesToExclude.includes(item)) {
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          archive.directory(itemPath, item);
        } else {
          archive.file(itemPath, { name: item });
        }
      }
    });
    
    // Finalize the archive
    archive.finalize();
    
  } catch (error) {
    console.error('Error in download endpoint:', error);
    res.status(500).json({ success: false, message: 'Error creating download' });
  }
});

// New route for PM2 status
app.get('/api/pm2/status', (req, res) => {
  exec('pm2 jlist', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error getting PM2 status: ${error}`);
      return res.status(500).json({ 
        success: false, 
        message: `Error getting PM2 status: ${error.message}` 
      });
    }
    
    try {
      const processes = JSON.parse(stdout);
      res.json({ success: true, processes });
    } catch (parseError) {
      console.error(`Error parsing PM2 status: ${parseError}`);
      res.status(500).json({ 
        success: false, 
        message: `Error parsing PM2 status: ${parseError.message}` 
      });
    }
  });
});

// New route for PM2 logs
app.get('/api/pm2/logs/:appName', (req, res) => {
  const appName = req.params.appName;
  
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Function to send log data to client
  const sendLog = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Start tailing the logs
  const logProcess = exec(`pm2 logs ${appName} --raw --lines 50`, { maxBuffer: 1024 * 1024 });
  
  logProcess.stdout.on('data', (data) => {
    sendLog({ type: 'out', data: data.toString() });
  });
  
  logProcess.stderr.on('data', (data) => {
    sendLog({ type: 'error', data: data.toString() });
  });
  
  // Handle client disconnect
  req.on('close', () => {
    logProcess.kill();
  });
});

app.get('/favicon.ico', (req, res) => {
  // Servir o favicon do diretório public
  res.sendFile(path.join(__dirname, '../public/favicon.ico'));
});

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
