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
      password: 'admin123'
    }
  ],
  // PM2 applications configuration
  applications: [
    {
      id: 1,
      name: 'WPPConnect Server',
      directory: join(projectRoot, 'wppconnect-server'),
      pm2Name: 'wppconnect-server'
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
