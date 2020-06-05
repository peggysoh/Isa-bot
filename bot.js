const {
  isSameDay,
  set,
  isAfter,
  isBefore,
  endOfMonth,
  differenceInDays
} = require('date-fns');
const axios = require('axios');
const Months = require('./months.js');
const { Client } = require('discord.js');
const client = new Client();

const validCommands = [
  'today',
  'info',
  'help',
  'villager',
  'bug',
  'fish',
  'new',
  'leaving'
];
let lastChecked = new Date(2020, 1, 1);
let hasAnnounced = false;
let isEndOfMonth = false;
let isNewMonth = false;

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
    await getEvents(now, true);
  } else if (command === 'villager') {
    await getVillager(message, args);
  } else if (command === 'new') {
    const content = await getNewCritters(now.getMonth());
    message.reply(content);
  } else if (command === 'leaving') {
    const content = await getLeavingCritters(now.getMonth());
    message.reply(content);
  } else if (command === 'bug') {
    await getBug(message, args, now.getMonth());
  } else if (command === 'fish') {
    await getFish(message, args, now.getMonth());
  } else if (command === 'info') {
    getInfo(message, now);
  } else if (command === 'help') {
    getHelp(message);
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
    await getEvents(now);
  }

  lastChecked = now;
}

async function getEvents(now, byPass = false) {
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
          .then(async () => {
            if (isEndOfMonth) {
              const content = await getLeavingCritters(now.getMonth());
              channel.send(content);
            }
            if (isNewMonth) {
              const content = await getNewCritters(now.getMonth());
              channel.send(content);
            }
          });

        hasAnnounced = true;
      });
  }
}

async function getVillager(message, args) {
  const errorMsg = 'Invalid command. Try `$villager <name>`.';
  if (args.length < 1) return message.reply(errorMsg);

  const villager = encodeURI(args.join(' ')).replace(/[!'()*]/g, escape);
  let image = '';

  await axios
    .get(`https://nookipedia.com/api/villager/${villager}/`, {
      headers: {
        'x-api-key': process.env.API_KEY
      }
    })
    .then(function (response) {
      if (response.data.image) image = response.data.image;
    })
    .catch((error) => {
      console.log(error);
    });

  await axios
    .get(`https://acnh.tnrd.net/api/v3/villagers/name/${villager}/`)
    .then(function (response) {
      let content =
        `\`\`\`\n` +
        `Name:            ${response.data.name}\n` +
        `Gender:          ${response.data.gender}\n` +
        `Personality:     ${response.data.personality}\n` +
        `Species:         ${response.data.species}\n` +
        `Birthday:        ${response.data.birthday}\n` +
        `Favorite Styles: ${response.data.style1}${
          response.data.style2 != response.data.style1
            ? ', ' + response.data.style2
            : ''
        }\n` +
        `Favorite Colors: ${response.data.color1}${
          response.data.color2 != response.data.color1
            ? ', ' + response.data.color2
            : ''
        }\n` +
        `\`\`\``;

      if (image === '') image = response.data.iconImage;

      if (image !== '') message.reply(content, { files: [image] });
      else message.reply(content);
    })
    .catch((error) => {
      if (error.response.status === 404) {
        message.reply(`I could not find a villager named ${args.join(' ')}.`);
        return;
      }
      console.log(error);
      message.reply(
        `Something went wrong. ${error.response.status}: ${error.response.statusText}`
      );
    });
}

async function getBug(message, args, currentMonth) {
  const errorMsg = 'Invalid command. Try `$bug <name>`.';
  if (args.length < 1) return message.reply(errorMsg);

  const bug = encodeURI(args.join(' ')).replace(/[!'()*]/g, escape);
  const currentMonthName = Months[currentMonth];

  await axios
    .get(`https://acnh.tnrd.net/api/v3/insects/name/${bug}`)
    .then(function (response) {
      let content =
        `**This bug is ${
          response.data[currentMonthName][0] === 'NA' ? 'not ' : ''
        }available this month.**\n` +
        `\`\`\`\n` +
        `Name:     ${response.data.name}\n` +
        `Time:     ${response.data[currentMonthName].join(', ')}\n` +
        `Location: ${response.data.whereHow}\n` +
        `Weather:  ${response.data.weather}\n` +
        `Price:    ${response.data.sell}\n` +
        `\`\`\``;

      if (response.data.iconImage)
        message.reply(content, { files: [response.data.iconImage] });
      else message.reply(content);
    })
    .catch((error) => {
      if (error.response.status === 404) {
        message.reply(`I could not find a bug named ${args.join(' ')}.`);
        return;
      }
      console.log(error);
      message.reply(
        `Something went wrong. ${error.response.status}: ${error.response.statusText}`
      );
    });
}

async function getFish(message, args, currentMonth) {
  const errorMsg = 'Invalid command. Try `$fish <name>`.';
  if (args.length < 1) return message.reply(errorMsg);

  const fish = encodeURI(args.join(' ')).replace(/[!'()*]/g, escape);
  const currentMonthName = Months[currentMonth];

  await axios
    .get(`https://acnh.tnrd.net/api/v3/fish/name/${fish}`)
    .then(function (response) {
      let content =
        `**This fish is ${
          response.data[currentMonthName][0] === 'NA' ? 'not ' : ''
        }available this month.**\n` +
        `\`\`\`\n` +
        `Name:     ${response.data.name}\n` +
        `Time:     ${response.data[currentMonthName].join(', ')}\n` +
        `Location: ${response.data.whereHow}\n` +
        `Shadow:   ${response.data.shadow}\n` +
        `Price:    ${response.data.sell}\n` +
        `\`\`\``;

      if (response.data.iconImage)
        message.reply(content, { files: [response.data.iconImage] });
      else message.reply(content);
    })
    .catch((error) => {
      if (error.response.status === 404) {
        message.reply(`I could not find a fish named ${args.join(' ')}.`);
        return;
      }
      console.log(error);
      message.reply(
        `Something went wrong. ${error.response.status}: ${error.response.statusText}`
      );
    });
}

function getNewCritters(currentMonth) {
  const lastMonth = currentMonth - 1;
  if (lastMonth < 0) lastMonth = Months.nhDec;
  return getCrittersByMonth(currentMonth, lastMonth, 'new');
}

function getLeavingCritters(currentMonth) {
  const nextMonth = currentMonth + 1;
  if (nextMonth > 11) nextMonth = Months.nhJan;
  return getCrittersByMonth(currentMonth, nextMonth, 'leaving');
}

async function getCrittersByMonth(currentMonth, compareMonth, label) {
  const currentMonthName = Months[currentMonth];
  const compareMonthName = Months[compareMonth];

  let content = '';
  let maxNameLength = 0;
  let maxTimeLength = 0;

  await axios
    .get(`https://acnh.tnrd.net/api/v3/fish`)
    .then(function (response) {
      let fish = [];
      content += `**Fish ${label} this month:**\n` + `\`\`\`\n`;

      response.data.forEach((f) => {
        if (
          f[currentMonthName][0] !== 'NA' &&
          f[compareMonthName][0] === 'NA'
        ) {
          fish.push(f);

          if (f.name.length > maxNameLength) maxNameLength = f.name.length;
          if (f[currentMonthName].join(', ').length > maxTimeLength)
            maxTimeLength = f[currentMonthName].join(', ').length;
        }
      });

      fish.forEach((f) => {
        content +=
          `${f.name.padEnd(maxNameLength)} | ` +
          `${f[currentMonthName].join(', ').padEnd(maxTimeLength)}\n`;
      });
      content += `\`\`\`\n`;
    })
    .catch((error) => {
      console.log(error);
      content += `Something went wrong. ${error.response.status}: ${error.response.statusText}\n`;
    });

  maxNameLength = 0;
  maxTimeLength = 0;

  await axios
    .get(`https://acnh.tnrd.net/api/v3/insects`)
    .then(function (response) {
      let bugs = [];
      content += `**Bugs ${label} this month:**\n` + `\`\`\`\n`;

      response.data.forEach((b) => {
        if (
          b[currentMonthName][0] !== 'NA' &&
          b[compareMonthName][0] === 'NA'
        ) {
          bugs.push(b);

          if (b.name.length > maxNameLength) maxNameLength = b.name.length;
          if (b[currentMonthName].join(', ').length > maxTimeLength)
            maxTimeLength = b[currentMonthName].join(', ').length;
        }
      });

      bugs.forEach((b) => {
        content +=
          `${b.name.padEnd(maxNameLength)} | ` +
          `${b[currentMonthName].join(', ').padEnd(maxTimeLength)}\n`;
      });
      content += `\`\`\`\n`;
    })
    .catch((error) => {
      console.log(error);
      content += `Something went wrong. ${error.response.status}: ${error.response.statusText}\n`;
    });

  return content;
}

function getInfo(message, now) {
  const content =
    `Current server time: ${now}\n` +
    `Last checked: ${lastChecked}\n` +
    `Has announced today: ${hasAnnounced}\n` +
    `Is end of month: ${isEndOfMonth}\n` +
    `Is new month: ${isNewMonth}`;
  message.reply(content);
}

function getHelp(message) {
  const content =
    'Type `!villager <name>` to look up information about a villager. Example: `!villager agnes`\n' +
    'Type `!new` to look up what fish and bugs are new this month.\n' +
    'Type `!leaving` to look up what fish and bugs are leaving this month.\n' +
    'Type `!fish <name>` to look up information about a fish. Example: `!fish great white shark`\n' +
    'Type `!bug <name>` to look up information about a bug. Example: `!bug golden stag`';
  message.reply(content);
}

client.login(process.env.BOT_TOKEN);
