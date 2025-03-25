
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

module.exports = config;
