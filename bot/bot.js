// imports
require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const path = require("path");
const fs = require("fs");
const { aggregate } = require("../database/mongodb.js");
// Declaring objects.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,            // for guild-related events
    GatewayIntentBits.GuildMessages,     // for message events in guilds
    GatewayIntentBits.MessageContent     // to read the content of messages
  ],
  partials: [
    Partials.Channel,                    // if you ever want to reply in DMs or uncached channels
    Partials.Message                     // if you want to listen for reactions or edits to old messages
  ]
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
    if (message.channel.id == "1394262761206317099") {
      if (message.content.includes(`"message": "User logged in",`)) {
        const jsonMessage = JSON.parse(message.content);
        const uniqueBrowserID = jsonMessage.unique_browser_id;

        const currentTime = new Date();

        const pipeline = [
          {
            $match: {
              unique_browser_id: uniqueBrowserID,
              is_authenticated: true,
              timestamp: { $lte: currentTime },
            },
          },
          { $sort: { timestamp: -1 } },
          { $limit: 1 },
        ];

        aggregate("Tracking", "CORE_PROP_CLOUD_LOGS", pipeline)
          .then((result) => {
            const elapsedMs = Date.now() - result[0].timestamp;
            const formattedHMS = new Date(elapsedMs)
              .toISOString()
              .substr(11, 8);

            const shouldMentionAll = elapsedMs < 24 * 60 * 60 * 1000;

            // Build your message prefix and allowedMentions accordingly
            const prefix = shouldMentionAll ? "@everyone " : "";
            const allowedMentions = {
              parse: shouldMentionAll ? ["everyone"] : [],
              repliedUser: false,
            };

            const content = `${prefix}Browser ID: \`${uniqueBrowserID}\` | Inactivity Time: \`${formattedHMS}\` .`;

            message.channel.send({
              content,
              allowedMentions,
              messageReference: {
                messageID: message.id,
                channelID: message.channel.id,
                guildID: message.guild.id,
              },
            });
          })
          .catch((err) => {
            console.error("Error aggregating data:", err);
          });
      }
    }
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
