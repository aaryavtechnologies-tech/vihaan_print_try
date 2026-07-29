module.exports = {
  apps: [
    {
      name: 'vihaan-print',
      script: 'npm',
      args: 'run start:vps',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
    },
  ],
};
