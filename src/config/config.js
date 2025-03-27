// Configuration file for PM2 Applications Manager
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

const config = {
  // User credentials
  users: [
    {
      username: 'admin',
      password: '1D30gr4m4'
    }
  ],
  // PM2 applications configuration
  applications: [
    {
      id: 1,
      name: 'Clinder',
      directory: '/opt/NODE/wppconnect-server_clinbot',
      pm2Name: 'wppconnect-server_CLINBOT'
    },
    {
      id: 2,
      name: 'Babble',
      directory: '/opt/NODE/wppconnect-server_babble',
      pm2Name: 'wppconnect-server_BABBLE'
    },
    {
      id: 3,
      name: 'Demo',
      directory: '/opt/NODE/wppconnect-server_demo',
      pm2Name: 'wppconnect-server_DEMO'
    },
    {
      id: 4,
      name: 'Kersys',
      directory: '/opt/NODE/wppconnect-server_kersys',
      pm2Name: 'wppconnect-server_kersys'
    }
  ]
};

export default config;

// Ensure the config is available in Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = config;
}

// Make sure it's available in the browser context too
if (typeof window !== 'undefined') {
  window.PM2Config = config;
}
