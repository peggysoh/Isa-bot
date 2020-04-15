const { isSameDay, set, isAfter, isBefore } = require('date-fns');
const axios = require('axios');
const { Client } = require('discord.js');
const client = new Client();

const validCommands = ['today', 'info', 'villager'];
let lastChecked = new Date(2020, 1, 1);
let hasAnnounced = false;

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await checkDateTime();
  setInterval(checkDateTime, 60000 * 60); // every hour
});

client.on('message', async (message) => {
  const prefix = '$';

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);

  const command = args.shift().toLowerCase();
  if (!validCommands.includes(command)) return;

  let now = new Date();

  if (command === 'today') {
    await getEvents(true);
  } else if (command === 'villager') {
    await getVillager(message, args);
  } else if (command === 'info') {
    let content =
      `Current server time: ${now}\n` +
      `Last checked: ${lastChecked}\n` +
      `Has announced today: ${hasAnnounced}`;
    message.reply(content);
  }
});

async function checkDateTime() {
  let now = new Date();
  let startTime = set(now, {
    hours: 8,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  });
  let endTime = set(now, {
    hours: 9,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  });

  if (!isSameDay(lastChecked, now)) {
    hasAnnounced = false;
  } else if (
    isSameDay(lastChecked, now) &&
    isAfter(now, startTime) &&
    isBefore(now, endTime)
  ) {
    await getEvents();
  }

  lastChecked = now;
}

async function getEvents(byPass = false) {
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
      if (!hasAnnounced || byPass)
        channel.send(message, {
          files: response.data.villager_images
        });

      hasAnnounced = true;
    });
}

async function getVillager(message, args) {
  const errorMsg = 'Invalid command. Try `$villager <name>`.';
  let input = 0;
  if (args.length != 1) return message.reply(errorMsg);
  input = args[0];

  await axios
    .get(`https://nookipedia.com/api/villager/${input}/`, {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    })
    .then(function (response) {
      let content =
        `**${response.data.message || ''}**\n` +
        `Name: ${response.data.name || ''}\n` +
        `Gender: ${response.data.gender || ''}\n` +
        `Personality: ${response.data.personality || ''}\n` +
        `Species: ${response.data.species || ''}\n` +
        `Birthday: ${response.data.birthday || ''}\n` +
        `Favorite Clothing: ${response.data.favclothing || ''}\n` +
        `Least Favorite Clothing: ${response.data.leastfavclothing || ''}`;

      let images = [response.data.image] || [];
      message.reply(content, { files: images });
    })
    .catch((error) => {
      if (error.response.data.error) {
        message.reply(error.response.data.error);
        return;
      }
      console.log(error);
    });
}

client.login(process.env.BOT_TOKEN);
