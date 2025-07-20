// imports
require("dotenv").config();
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const path = require("path");
const fs = require("fs");
const { aggregate } = require("../database/mongodb.js");
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
            // In case no log is found for the unique browser ID with matching criteria.
            if (result.length === 0) {
              console.log("No matching records found for pipeline:\n", JSON.stringify(pipeline, null, 2));
              return;
            }

            // Find the document just after this one.
            const nextPipeline = [
              {
                $match: {
                  unique_browser_id: uniqueBrowserID,
                  timestamp: { $gt: result[0].timestamp },
                },
              },
              { $sort: { timestamp: 1 } },
              { $limit: 1 },
            ];

            aggregate("Tracking", "CORE_PROP_CLOUD_LOGS", nextPipeline).then(
              (nextResult) => {
                if(nextResult.length === 0) {
                  console.log("No next record found for pipeline:\n", JSON.stringify(nextPipeline, null, 2));
                  return;
                }

                const elapsedMs = nextResult[0].timestamp - result[0].timestamp;

                const totalSeconds = Math.floor(elapsedMs / 1000);
                const days = Math.floor(totalSeconds / (3600 * 24));
                const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;

                const formattedDHMS = [
                  String(days).padStart(2, "0"),
                  String(hours).padStart(2, "0"),
                  String(minutes).padStart(2, "0"),
                  String(seconds).padStart(2, "0"),
                ].join(":");

                const shouldMentionAll = elapsedMs < 24 * 60 * 60 * 1000;

                // If the inactivity is less than 24 hours, we to also check if the reason is a manual logout.
                // If it is, we don't want to mention everyone.
                let postfix = "";
                if(shouldMentionAll) {
                  if (result[0].api == "/logout") {
                    shouldMentionAll = false;
                    postfix = " (manual logout)";
                  }
                }

                const prefix = shouldMentionAll ? "@everyone " : "";
                const allowedMentions = {
                  parse: shouldMentionAll ? ["everyone"] : [],
                  repliedUser: false, // prevents pinging the user you're replying to
                };

                const content = `${prefix}Browser ID: \`${uniqueBrowserID}\` | Inactivity Time: \`${formattedDHMS}\` ${postfix}.`;

                message.reply({
                  content,
                  allowedMentions,
                });
              }
            );
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
