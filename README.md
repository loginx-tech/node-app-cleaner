
# PM2 Applications Manager

A web application to manage PM2 processes and their associated user directories and token files.

## Features

- Authentication system
- List PM2 applications
- View user directories for each application
- Delete user directories and token files
- Restart PM2 processes after deletion

## Installation

1. Clone the repository
2. Install frontend dependencies:
   ```
   npm install
   ```
3. Install backend dependencies:
   ```
   npm install --save express cors body-parser fs-extra
   npm install --save-dev concurrently nodemon
   ```
4. Update the configuration in `src/config/config.js` with your applications paths and PM2 names

## Configuration

Edit the `src/config/config.js` file:

- Update the `users` array with your credentials
- Update the `applications` array with your PM2 applications:
  - `id`: Unique identifier
  - `name`: Display name
  - `directory`: Full path to the application directory
  - `pm2Name`: Name of the PM2 process

## Running the application

1. Build the frontend:
   ```
   npm run build
   ```

2. Start the server:
   ```
   node src/server.js
   ```

3. Access the application at http://localhost:5000

## Development

For development, you can run:

```
npx concurrently "npm run dev" "nodemon src/server.js"
```

This will start both the frontend development server and the backend server with hot reloading.
