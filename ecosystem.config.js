module.exports = {
  apps: [{
    name: 'social-media-manager',
    script: 'npm',
    args: 'start',
    cwd: '/home/aziz/social-media-manager',
    env: {
      NODE_ENV: 'production',
      PORT: 5050
    }
  }]
};
