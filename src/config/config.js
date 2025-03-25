
const path = require('path');

const config = {
  // User credentials
  users: [
    {
      username: 'admin',
      password: 'admin123'
    }
  ],
  // PM2 applications configuration
  applications: [
    {
      id: 1,
      name: 'App1',
      directory: '/path/to/app1',
      pm2Name: 'app1'
    },
    {
      id: 2,
      name: 'App2',
      directory: '/path/to/app2',
      pm2Name: 'app2'
    },
    {
      id: 3,
      name: 'App3',
      directory: '/path/to/app3',
      pm2Name: 'app3'
    },
    {
      id: 4,
      name: 'App4',
      directory: '/path/to/app4',
      pm2Name: 'app4'
    }
  ]
};

// Ensure the config is available in both Node.js and browser environments
if (typeof module !== 'undefined') {
  module.exports = config;
}

// Make sure it's available in the browser context too
if (typeof window !== 'undefined') {
  window.PM2Config = config;
}

