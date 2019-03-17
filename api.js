const express = require('express');
const app = express();

let tmi;
const channels = new Map();

const NEWS_COMMAND = '!news';

const MAX_NEWS_MESSAGES_PER_CHANNEL = parseInt(process.env.MAX_NEWS_MESSAGES_PER_CHANNEL) || 10;

function join(channelName) {
  return tmi.join(channelName).then(() => {
    console.log(`TMI joined ${channelName}`);
    const channel = {
      Name: channelName,
      Active: true,
      Pagination: '',
      Members: new Set(),
      Messages: []
    };

    channels.set(channelName, channel);
  });
}

app.get('/join/:channelName', (req, res) => {
  const channelName = req.params.channelName.toLowerCase();

  join(channelName).then(() => {
    res.json({status: 200});
  })
  .catch(err => {
    console.error(`Error joining ${channelName}`, err);
    res.json({status: 500});
  })
});

app.get('/channel/:channelName/*', (req, res, next) => {
  const channelName = req.params.channelName.toLowerCase();
  if (!channels.has(channelName)) {
    console.warn(`Tried to access '${channelName}' before it was joined!`);
    join(channelName)
      .then(() => next())
      .catch(err => {
        console.error(`Error joining ${channelName}`, err);
        res.json({status: 500});
      });
  } else {
    next();
  }
})

app.get('/channel/:channelName/audience', (req, res) => {
  const channelName = req.params.channelName.toLowerCase();
  const channel = channels.get(channelName);

  if (channel.Members.size === 0) {
    console.warn(`No members in ${channelName}`);
    return res.json({status: 500});
  }

  res.json(Array.from(channel.Members).map(member => {
    return {
      name: member,
      inChat: true,
      isFollower: false,
      isMod: false
    };
  }));
});

app.get('/channel/:channelName/messages', (req, res) => {
  const channelName = req.params.channelName.toLowerCase();
  const channel = channels.get(channelName);
  res.json(channel.Messages);
  channel.Messages = [];
});

const addNews = (channelName, data, message) => {
  if (!channels.has(channelName)) {
    return;
  }

  const channel = channels.get(channelName);
  if (channel.messages.length >= MAX_NEWS_MESSAGES_PER_CHANNEL) {
    console.warn(`Channel ${channelName} at news message limit`);
    return;
  }

  channel.messages.push({
    message: `${NEWS_COMMAND} ${data['display-name']}: ${message.substr(NEWS_COMMAND.length)}`
  })
};

const init = (_tmi) => {
  tmi = _tmi;

  tmi.on('chat', (channel, data, message, isOwnMessage) => {
    if (isOwnMessage || !message.startsWith('!')) {
      return;
    }

    if (channel.startsWith('#')) {
      channel = channel.substr(1);
    }

    const parts = message.split(' ');
    switch(parts[0]) {
      case NEWS_COMMAND:
        return addNews(channel, data, message);
      default:
        break;
    }
  });

  tmi.on('join', (channelName, username, self) => {
    if (self) return;
    if (channelName.startsWith('#')) channelName = channelName.substr(1);
    if (!channels.has(channelName)) {
      throw new Error(`GOT JOIN FOR ${channelName} BUT CHANNEL NOT IN LIST. CHANNELS: ${Array.from(channels.keys())}`);
    }
    console.log(`JOIN ${channelName} ${username}`);
    const channel = channels.get(channelName);
    channel.Members.add(username);
  });

  tmi.on('part', (channelName, username, self) => {
    if (self) return;
    if (channelName.startsWith('#')) channelName = channelName.substr(1);
    if (!channels.has(channelName)) {
      throw new Error(`GOT JOIN FOR ${channelName} BUT CHANNEL NOT IN LIST`);
    }
    console.log(`PART ${channelName} ${username}`);
    const channel = channels.get(channelName);
    channel.Members.delete(username);
  });
}

module.exports = {
  init,
  app
};
