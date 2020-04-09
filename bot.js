const axios = require('axios');
const { Client } = require('discord.js');
const client = new Client();

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);

  await getEvents();
  setInterval(getEvents, 60000 * 60 * 24); // 1 min *  every hour
});

async function getEvents() {
  const channel = client.channels.cache.find((c) => c.name === 'announcements');

  await axios
    .get('https://nookipedia.com/api/today/', {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    })
    .then(function (response) {
      let message = `**${response.data.message}**`;
      response.data.events.forEach((e) => {
        message += `\n• ${e}`;
      });
      channel.send(message, {
        files: response.data.villager_images
      });
    });
}

client.login(process.env.BOT_TOKEN);
