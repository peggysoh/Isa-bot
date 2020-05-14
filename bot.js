const {
  isSameDay,
  set,
  isAfter,
  isBefore,
  endOfMonth,
  differenceInDays
} = require('date-fns');
const axios = require('axios');
const { Client } = require('discord.js');
const client = new Client();

const validCommands = ['today', 'info', 'villager', 'update', 'fossils'];
let lastChecked = new Date(2020, 1, 1);
let hasAnnounced = false;
let isEndOfMonth = false;
let isNewMonth = false;
let leavingImage = '';
let comingImage = '';
let fossilsUrl =
  'https://docs.google.com/spreadsheets/d/1w2n5pa8ltyW85UfLaoED2_bfnKOzFq98RyTx75GDrVc/edit?usp=sharing';

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
  } else if (command === 'update') {
    await update(message, args);
  } else if (command === 'fossils') {
    await getFossils(message);
  } else if (command === 'info') {
    let content =
      `Current server time: ${now}\n` +
      `Last checked: ${lastChecked}\n` +
      `Has announced today: ${hasAnnounced}\n` +
      `Is end of month: ${isEndOfMonth}\n` +
      `Is new month: ${isNewMonth}`;
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

  isNewMonth = isSameDay(endOfMonth(now), now);
  isEndOfMonth = differenceInDays(now, endOfMonth(now)) === -2;

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

  if (!hasAnnounced || byPass) {
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
        channel
          .send(message, {
            files: response.data.villager_images
          })
          .then((_) => {
            if (isEndOfMonth) getLeaving(channel);
            if (isNewMonth) getComing(channel);
          });

        hasAnnounced = true;
      });
  }
}

async function getVillager(message, args) {
  const errorMsg = 'Invalid command. Try `$villager <name>`.';
  let input = '';
  if (args.length != 1) return message.reply(errorMsg);
  input = args[0];
  let villager = encodeURI(input).replace(/[!'()*]/g, escape);
  await axios
    .get(`https://nookipedia.com/api/villager/${villager}/`, {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    })
    .then(function (response) {
      let content =
        `**${!!response.data.message ? response.data.message : ''}**\n` +
        `Name: ${!!response.data.name ? response.data.name : ''}\n` +
        `Gender: ${!!response.data.gender ? response.data.gender : ''}\n` +
        `Personality: ${
          !!response.data.personality ? response.data.personality : ''
        }\n` +
        `Species: ${!!response.data.species ? response.data.species : ''}\n` +
        `Birthday: ${
          !!response.data.birthday ? response.data.birthday : ''
        }\n` +
        `Favorite Clothing: ${
          !!response.data.favclothing ? response.data.favclothing : ''
        }\n` +
        `Least Favorite Clothing: ${
          !!response.data.leastfavclothing ? response.data.leastfavclothing : ''
        }`;

      if (response.data.image)
        message.reply(content, { files: [response.data.image] });
      else message.reply(content);
    })
    .catch((error) => {
      if (error.response.data.error) {
        message.reply(error.response.data.error);
        return;
      }
      console.log(error);
      message.reply('Something went wrong');
    });
}

async function update(message, args) {
  const errorMsg =
    'Invalid command. Try `$update <leaving/coming/fossils> <url>`.';
  let input = '',
    url = '';
  if (args.length != 2) return message.reply(errorMsg);
  input = args[0];
  url = args[1];

  if (input === 'leaving') {
    leavingImage = url;
    message.reply('Only a few days left to end of the month!', {
      files: [leavingImage]
    });
  }

  if (input === 'coming') {
    comingImage = url;
    message.reply('New fish and bugs coming!', {
      files: [comingImage]
    });
  }

  if (input === 'fossils') {
    fossils = url;
  }
}

async function getLeaving(channel) {
  if (leavingImage)
    channel.send('• Only a few days left to end of the month!', {
      files: [leavingImage]
    });
}

async function getComing(channel) {
  if (comingImage)
    channel.send('• New fish and bugs coming!', {
      files: [comingImage]
    });
}

async function getFossils(message) {
  message.reply(`Fossils sheet: ${fossilsUrl}`);
}

client.login(process.env.BOT_TOKEN);
