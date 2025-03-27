// Client-side configuration file for PM2 Applications Manager

const config = {
  // PM2 applications configuration
  applications: [
    {
      id: 1,
      name: 'Clinder',
      pm2Name: 'wppconnect-server_CLINBOT'
    },
    {
      id: 2,
      name: 'Babble',
      pm2Name: 'wppconnect-server_BABBLE'
    },
    {
      id: 3,
      name: 'Demo',
      pm2Name: 'wppconnect-server_DEMO'
    },
    {
      id: 4,
      name: 'Kersys',
      pm2Name: 'wppconnect-server_kersys'
    }
  ]
};

export default config;
