module.exports = {
  apps: [
    {
      name: 'node-app-cleaner',
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
        NODE_PATH: './node_modules'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        NODE_PATH: './node_modules'
      },
      interpreter: 'node',
      interpreter_args: '--experimental-specifier-resolution=node',
      cwd: '.',
      node_args: '--experimental-specifier-resolution=node'
    }
  ]
}; 