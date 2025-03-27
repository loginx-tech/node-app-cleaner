import express from 'express';
import { exec, execSync } from 'child_process';
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
  
  console.log('=== DELETE REQUEST ===');
  console.log(`Attempting to delete directory for app ${appId}, directory ${dirId}`);
  
  const application = config.applications.find(app => app.id === appId);
  
  if (!application) {
    console.log('Application not found:', appId);
    return res.status(404).json({ success: false, message: 'Application not found' });
  }
  
  console.log('Found application:', application);
  
  // Usar caminhos absolutos
  const userDataDirPath = path.resolve(application.directory, 'userDataDir', dirId);
  const tokensFilePath = path.resolve(application.directory, 'tokens', `${dirId}.json`);
  
  console.log('Full paths to delete:', {
    userDataDirPath,
    tokensFilePath,
    currentUser: process.getuid(),
    currentGroup: process.getgid()
  });
  
  try {
    // Verificar permissões e existência do diretório base
    try {
      fs.accessSync(application.directory, fs.constants.W_OK);
      console.log('Base directory is writable:', application.directory);
    } catch (permError) {
      console.error('Permission error on base directory:', permError);
      return res.status(500).json({ 
        success: false, 
        message: 'No permission to access base directory',
        error: permError.message
      });
    }

    // Verificar se os diretórios existem
    const userDirExists = fs.existsSync(userDataDirPath);
    const tokenFileExists = fs.existsSync(tokensFilePath);
    
    console.log('Existence check:', {
      userDirExists,
      tokenFileExists,
      userDataDirPath,
      tokensFilePath
    });
    
    if (!userDirExists && !tokenFileExists) {
      return res.status(404).json({ 
        success: false, 
        message: 'Directory and token file not found',
        paths: {
          userDataDirPath,
          tokensFilePath
        }
      });
    }
    
    let deletionResults = {
      userDirDeleted: false,
      tokenFileDeleted: false,
      errors: []
    };

    // Delete user directory
    if (userDirExists) {
      try {
        // Verificar permissão específica para o diretório do usuário
        fs.accessSync(userDataDirPath, fs.constants.W_OK);
        console.log('User directory is writable:', userDataDirPath);
        
        // Primeiro tenta usar fs.rmSync
        try {
          fs.rmSync(userDataDirPath, { recursive: true, force: true });
          console.log('Successfully deleted user directory using fs.rmSync');
          deletionResults.userDirDeleted = true;
        } catch (rmError) {
          console.error('Error using fs.rmSync:', rmError);
          
          // Se falhar, tenta usar rm -rf
          try {
            execSync(`rm -rf "${userDataDirPath}"`);
            console.log('Successfully deleted user directory using rm -rf');
            deletionResults.userDirDeleted = true;
          } catch (execError) {
            console.error('Error using rm -rf:', execError);
            deletionResults.errors.push(`Failed to delete user directory: ${execError.message}`);
          }
        }
      } catch (dirError) {
        console.error('Error with user directory:', dirError);
        deletionResults.errors.push(`Permission error on user directory: ${dirError.message}`);
      }
    }
    
    // Delete tokens file
    if (tokenFileExists) {
      try {
        // Verificar permissão específica para o arquivo de token
        fs.accessSync(tokensFilePath, fs.constants.W_OK);
        console.log('Token file is writable:', tokensFilePath);
        
        try {
          fs.unlinkSync(tokensFilePath);
          console.log('Successfully deleted token file');
          deletionResults.tokenFileDeleted = true;
        } catch (unlinkError) {
          console.error('Error deleting token file:', unlinkError);
          deletionResults.errors.push(`Failed to delete token file: ${unlinkError.message}`);
        }
      } catch (tokenError) {
        console.error('Error with token file:', tokenError);
        deletionResults.errors.push(`Permission error on token file: ${tokenError.message}`);
      }
    }

    // Se houve erros mas algumas operações foram bem sucedidas
    if (deletionResults.errors.length > 0 && (deletionResults.userDirDeleted || deletionResults.tokenFileDeleted)) {
      return res.json({
        success: true,
        message: 'Partial success: Some items were deleted but there were errors',
        details: deletionResults
      });
    }
    
    // Se houve apenas erros
    if (deletionResults.errors.length > 0) {
      throw new Error('Failed to delete any items: ' + deletionResults.errors.join('; '));
    }

    // Verificar se o PM2 está disponível
    exec('pm2 list', (pmError, stdout, stderr) => {
      if (pmError) {
        console.log('PM2 not available, skipping restart');
        return res.json({ 
          success: true, 
          message: `Successfully deleted items (PM2 restart skipped)`,
          details: {
            ...deletionResults,
            pm2Available: false
          }
        });
      }
      
      // PM2 está disponível, tenta reiniciar o processo
      console.log('PM2 available, attempting to restart process:', application.pm2Name);
      
      exec(`pm2 restart ${application.pm2Name}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error restarting PM2 process: ${error}`);
          return res.json({ 
            success: true, 
            message: `Items deleted but failed to restart PM2 process: ${error.message}`,
            details: {
              ...deletionResults,
              pm2Available: true,
              pm2Restarted: false
            }
          });
        }
        
        console.log('Successfully restarted PM2 process');
        res.json({ 
          success: true, 
          message: `Successfully deleted items and restarted ${application.name}`,
          details: {
            ...deletionResults,
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
      message: 'Error in delete operation',
      error: error.message,
      stack: error.stack
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
