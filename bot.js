const { Client } = require('discord.js');
const client = new Client();

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', (message) => {
  // Handle command listening
  const prefix = '!';

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);

  const command = args.shift().toLowerCase();
  if (!validCommands.includes(command)) return;

  let input = 0;
  if (requireInt.includes(command)) {
    if (args.length != 1) return message.reply(errorMsg);

    input = parseInt(args[0]);
    if (isNaN(input)) return message.reply(errorMsg);
  } else if (args.length != 0) return message.reply(errorMsg);

  // Channel
  const channel =
    client.channels.cache.find((c) => c.name === 'stalk-market') ||
    message.channel;

  // Reset prices
  let now = new Date();
  let noon = set(now, {
    hours: 12,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  });
  let close = set(now, {
    hours: 22,
    minutes: 0,
    seconds: 0,
    milliseconds: 0
  });

  if (!isSameDay(bestPrice.date, now)) {
    reset();
  } else if (
    isSameDay(bestPrice.date, now) &&
    isAfter(now, noon) &&
    isBefore(bestPrice.date, noon)
  ) {
    reset();
  }

  if (command === 'buy') {
    const inputPrice = input;
    if (isSunday(now)) {
      return message.reply(`Sorry, Timmy and Tommy don't buy on Sundays.`);
    } else if (isAfter(now, close)) {
      return message.reply(`Sorry, Timmy and Tommy close at 10PM.`);
    } else {
      updateContributors(message.author.username, now, inputPrice);
      if (inputPrice === bestPrice.price) {
        return message.reply(
          `${bestPrice.name}'s island is also buying for ${inputPrice} bells per turnip.`
        );
      } else if (
        inputPrice > bestPrice.price ||
        bestPrice.price === undefined
      ) {
        bestPrice = {
          name: message.author.username,
          price: inputPrice,
          date: now,
          set: true,
          type: 'buy'
        };
        return channel.send(
          `**New high!**\n${message.author.username}'s island is buying for ${inputPrice} bells per turnip.`
        );
      } else if (bestPrice.name === message.author.username) {
        let bestUser = _.maxBy(
          _.keys(contributors),
          (o) => contributors[o].price
        );
        let { price, date } = contributors[bestUser];
        bestPrice = {
          name: bestUser,
          price,
          date,
          set: true,
          type: 'buy'
        };
        return channel.send(
          `**${message.author.username} made a correction.**\nCurrent high is now ${bestUser}'s island buying for ${price} bells per turnip.`
        );
      } else {
        return message.reply(
          `Sorry, ${bestPrice.name}'s island is buying higher at ${bestPrice.price} bells per turnip.`
        );
      }
    }
  } else if (command === 'sell') {
    const inputPrice = input;
    if (!isSunday(now)) {
      return message.reply(`Sorry, Daisy Mae only sells on Sundays.`);
    } else if (isAfter(now, noon)) {
      return message.reply(`Sorry, Daisy Mae left at 12PM.`);
    } else {
      updateContributors(message.author.username, now, inputPrice);
      if (inputPrice === bestPrice.price) {
        return message.reply(
          `Daisy Mae on ${bestPrice.name}'s island is also selling for ${inputPrice} bells per turnip.`
        );
      } else if (
        inputPrice < bestPrice.price ||
        bestPrice.price === undefined
      ) {
        bestPrice = {
          name: message.author.username,
          price: inputPrice,
          date: now,
          set: true,
          type: 'sell'
        };
        return channel.send(
          `**Better price available!**\nDaisy Mae on ${message.author.username}'s island is selling turnips for ${inputPrice} bells per turnip.`
        );
      } else if (bestPrice.name === message.author.username) {
        let bestUser = _.minBy(
          _.keys(contributors),
          (o) => contributors[o].price
        );
        let { price, date } = contributors[bestUser];
        bestPrice = {
          name: bestUser,
          price,
          date,
          set: true,
          type: 'sell'
        };
        return channel.send(
          `**${message.author.username} made a correction.**\nBest price available from Daisy Mae on ${bestUser}'s island selling for ${bestPrice.price} bells per turnip.`
        );
      } else {
        return message.reply(
          `Sorry, better price at ${bestPrice.name}'s island, Daisy Mae is selling turnips for ${bestPrice.price} bells per turnip.`
        );
      }
    }
  } else if (command === 'update') {
    if (!bestPrice.set) {
      message.channel.send(`The prices for today have not been set.`);
    } else {
      message.channel.send(
        `These people have submitted prices: ${Object.keys(contributors).join(
          ', '
        )}`
      );
      if (bestPrice.type === 'buy') {
        message.channel.send(
          `${bestPrice.name}'s island is buying turnips for ${bestPrice.price} bells per turnip!`
        );
      }
      if (bestPrice.type === 'sell') {
        message.channel.send(
          `Daisy Mae on ${bestPrice.name}'s island is selling turnips for ${bestPrice.price} bells per turnip!`
        );
      }
    }
  } else if (command === 'help') {
    let content =
      'Type `!buy <number>` to tell me how much Timmy and Tommy are buying turnips for! Example: `!buy 100`\n' +
      'Type `!sell <number>` to tell me how much Daisy Mae is selling turnips for! Example: `!sell 100`\n' +
      'Type `!update` if you want to know who has the current best prices to buy and sell turnips!\n' +
      'Type `!hours` if you want to know what the hours to are to buy and sell turnips!';
    message.reply(content);
  } else if (command === 'hours') {
    let content =
      `Current server time: ${now}\n` +
      `Daisy Mae hours: Sunday 5AM-12PM\n` +
      `Timmy & Tommy hours: Monday-Saturday, 5AM-12PM/ 12PM-10PM`;
    message.reply(content);
  }
});

client.login(process.env.BOT_TOKEN);
