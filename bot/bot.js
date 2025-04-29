// imports
require("dotenv").config();
const Discord = require("discord.js");
const path = require("path");
const fs = require("fs");

// Declaring objects.
const client = new Discord.Client();

// Variable declarations.
const PREFIX = "!";

// Read all the commands
const commandFolders = fs.readdirSync("commands");

const commands = {};
commandFolders.forEach(
  (command) =>
    (commands[command] = require(path.join(__dirname, "../commands", command)))
);

client.on("message", async (message) => {
  // DO nothing if the message is from the bot.
  if (message.author.bot) return;
  if (message.content.startsWith(PREFIX)) {
    const [CMD_NAME, ...args] = message.content
      .trim()
      .substring(PREFIX.length)
      .split(/\s+/);

    try {
      commands[CMD_NAME](message, client);
    }
    catch (err) {
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
