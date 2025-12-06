// =============================================================================
// NFTGen PM2 Ecosystem Configuration (Standardized Ports)
// =============================================================================
// Port Allocation:
// - Frontend: 7103 (matches .env PORT)
// - API: 7105 (updated to avoid conflict with Nwallet compatibility server)
// - WebSocket: 7104 (matches .env WEBSOCKET_PORT)
// =============================================================================

module.exports = {
  apps: [
    {
      name: 'nftgen-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: '/home/ubuntu/Sandeep/projects/NFTGen',
      env: {
        PORT: 7103,
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        VITE_DISABLE_STRICT_MODE: 'true', // Disable StrictMode in production
        VITE_NWALLET_WS_URL: 'ws://3.111.22.56:6103/ws', // Production WebSocket URL
        VITE_ENABLE_INIT_LOGGING: 'false' // Disable verbose logging in production
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: '768M', // Optimized for NFTGen with Apollo GraphQL and WebSocket
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true,
      max_restarts: 5, // Balanced restart policy for frontend
      restart_delay: 12000, // Optimized delay for NFTGen initialization
      min_uptime: '45s', // Minimum uptime for NFTGen stability
      exp_backoff_restart_delay: 200, // Moderate exponential backoff
      kill_timeout: 8000, // Graceful shutdown for WebSocket connections
      listen_timeout: 12000, // Time for NFTGen initialization
      node_args: '--max-old-space-size=768', // Optimize Node.js memory
      watch_delay: 1000, // Delay for file watching
      ignore_watch: ['node_modules', 'logs', 'dist', 'build']
    },
    {
      name: 'nftgen-health',
      script: 'node',
      args: 'health-check.js',
      cwd: '/home/ubuntu/Sandeep/projects/NFTGen',
      env: {
        NODE_ENV: 'production'
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: '256M', // Lightweight health monitoring
      error_file: './logs/health-error.log',
      out_file: './logs/health-out.log',
      log_file: './logs/health-combined.log',
      time: true,
      max_restarts: 10, // Allow more restarts for monitoring service
      restart_delay: 5000,
      min_uptime: '10s',
      exp_backoff_restart_delay: 100
    },
    {
      name: 'nftgen-api',
      script: 'npm',
      args: 'run api',
      cwd: '/home/ubuntu/Sandeep/projects/NFTGen',
      env: {
        PORT: 7105,
        NODE_ENV: 'production',
        HOST: '0.0.0.0'
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_file: './logs/api-combined.log',
      time: true
    },
    {
      name: 'nftgen-websocket',
      script: 'npm',
      args: 'run websocket',
      cwd: '/home/ubuntu/Sandeep/projects/NFTGen',
      env: {
        PORT: 7104,
        NODE_ENV: 'production',
        HOST: '0.0.0.0'
      },
      watch: false,
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
      log_file: './logs/websocket-combined.log',
      time: true
    }
  ]
};
