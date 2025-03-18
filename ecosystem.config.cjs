module.exports = {
  apps: [{
    name: 'nftgen',
    script: 'npm',
    args: 'run dev',
    env: {
      NODE_ENV: 'development'
    }
  }]
};
