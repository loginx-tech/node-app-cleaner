
const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config/config');

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

// Serve React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
