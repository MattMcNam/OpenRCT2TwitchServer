console.log('Starting Twitch integration server for OpenRCT2...');

const express = require('express');
const tmi = require('tmi.js');

const {PORT} = process.env;

Client = new tmi.client({
  identity: {
    username: 'justinfan123456',
    password: 'justinfan123456'
  },
  connection:{
    reconnect: true,
    reconnectInterval: 250,
    reconnectDecay: 2.0
  }
});

Client.connect().then(() => {
  console.log('Connected to TMI');

  const api = require('./api');
  api.init(Client);
  const app = express();
  app.use(api.app);

  console.log('Server initialised.');
  const port = PORT || 8080;
  app.listen(port, () => console.log(`Listening on ${port}`));
});
