// imports
require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const path = require("path");
const fs = require("fs");
const checkLoginLogs = require("../services/loginLogMonitor");

// Declaring objects.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, // for guild-related events
    GatewayIntentBits.GuildMessages, // for message events in guilds
    GatewayIntentBits.MessageContent, // to read the content of messages
  ],
  partials: [
    Partials.Channel, // if you ever want to reply in DMs or uncached channels
    Partials.Message, // if you want to listen for reactions or edits to old messages
  ],
});

// Variable declarations.
const PREFIX = "!";

// Read all the commands
const commandFolders = fs.readdirSync("commands");

const commands = {};
commandFolders.forEach(
  (command) =>
    (commands[command] = require(path.join(__dirname, "../commands", command)))
);

client.on("messageCreate", async (message) => {
  // Ignore messages from bots
  if (message.author.bot) {
    checkLoginLogs("1394262761206317099", message);
    return;
  }

  if (message.content.startsWith(PREFIX)) {
    const [CMD_NAME, ...args] = message.content
      .trim()
      .substring(PREFIX.length)
      .split(/\s+/);

    try {
      commands[CMD_NAME](message, client);
    } catch (err) {
      message.reply(
        `Command \`${CMD_NAME}\` does not exist. Allowed commands are: \`${Object.keys(
          commands
        ).join("`, `")}\``
      );
    }
  }
});

// Schedules job for the bot to do.

// This one will work every minute.
// setInterval(() => {
//   updateRedditPosts(client);
// }, process.env.BOT_CALL_TIME);

// Exporting the starting function to use in another file.
module.exports = () => client.login(process.env.DISCORD_BOT_TOKEN);
