
const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config/config');
const archiver = require('archiver');

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
    
    res.json(directories);
  } catch (error) {
    console.error('Error reading user directories:', error);
    res.status(500).json({ success: false, message: 'Error reading user directories' });
  }
});

app.delete('/api/application/:appId/user-directory/:dirId', (req, res) => {
  const appId = parseInt(req.params.appId);
  const dirId = req.params.dirId;
  
  const application = config.applications.find(app => app.id === appId);
  
  if (!application) {
    return res.status(404).json({ success: false, message: 'Application not found' });
  }
  
  const userDataDirPath = path.join(application.directory, 'userDataDir', dirId);
  const tokensFilePath = path.join(application.directory, 'tokens', `${dirId}.json`);
  
  try {
    // Delete user directory
    if (fs.existsSync(userDataDirPath)) {
      fs.removeSync(userDataDirPath);
    }
    
    // Delete tokens file
    if (fs.existsSync(tokensFilePath)) {
      fs.removeSync(tokensFilePath);
    }
    
    // Restart PM2 process
    exec(`pm2 restart ${application.pm2Name}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error restarting PM2 process: ${error}`);
        return res.status(500).json({ 
          success: false, 
          message: `Error restarting PM2 process: ${error.message}` 
        });
      }
      
      res.json({ 
        success: true, 
        message: `Successfully deleted directory and restarted ${application.name}` 
      });
    });
  } catch (error) {
    console.error('Error deleting directory:', error);
    res.status(500).json({ success: false, message: 'Error deleting directory' });
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

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
