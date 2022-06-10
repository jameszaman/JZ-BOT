// Imports
const { spawnSync } = require("child_process");
const axios = require("axios");
require("dotenv").config();

// User defined modules.
const Reddit = require("../database/redditModel");

async function updateRedditPosts(client) {
  // return;
  // Get information about all the subreddits of every discord channel.
  const discordReddits = await Reddit.find();

  // Must update for each discord channel.
  // Code seems a bit more complex as we cannot use forEach.
  // forEach cannot be used because we need async functions.
  for (let discordIndex in discordReddits) {
    for (let subredditIndex in discordReddits[discordIndex].subreddits) {
      // Initial arguments are what is necessary for Reddit API.
      const arguments = [
        `${__dirname}/reddit.py`,
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.USER_AGENT,
        discordReddits[discordIndex].subreddits[subredditIndex].subreddit,
      ];

      // Run python with necessary arguments for reddit API.
      const reddit = await spawnSync("python", arguments, {
        stdio: "pipe",
        encoding: "utf-8",
      });
      let posts = reddit.output[1];
      posts = posts.replace(/['"\s\[\]]/g, "").split(",");
      // Update the posts list in the subreddit.
      posts.forEach((post) => {
        // if the post does not already exists, add it to the database and
        // Also send it discord.
        if (
          !discordReddits[discordIndex].subreddits[
            subredditIndex
          ].posts.includes(post)
        ) {
          // Sending it to discord.
          client.channels.cache
            .get(discordReddits[discordIndex].discord_channel_id)
            .send(post);
          // Adding it to the database.
          discordReddits[discordIndex].subreddits[subredditIndex].posts.push(
            post
          );
        }
      });
    }
    discordReddits[discordIndex].save();
  }
}

async function addSubreddit(message) {
  // Extracting the necessary data.
  discord_channel_id = message.channel.id.toString();
  subreddit = message.content.split(" ")[1];

  // First we send a head request to the subreddit.
  // And check if we get a proper response.
  // If there is not proper response, the subreddit
  // Does not exist. We only add if the subreddit exists.
  const url = "https://www.reddit.com/r";
  axios
    .head(`${url}/${subreddit}`)
    .then(() => {
      // If there was no previous subreddit from that channel.
      // Add a new entry of subreddit for that channel.
      const reddit = Reddit({
        discord_channel_id: discord_channel_id,
        subreddits: [
          {
            subreddit,
            posts: [],
          },
        ],
      });
      reddit.save().catch(async () => {
        // In case a subreddit already exists from this channel, update the subreddit list.
        const reddit = await Reddit.findOne({ discord_channel_id });
        // We also need to make sure that the same subreddit is not being added again.
        let alreadyExists = false;
        reddit.subreddits.forEach((savedSubreddit) => {
          if (savedSubreddit.subreddit == subreddit) {
            alreadyExists = true;
          }
        });
        if (!alreadyExists) {
          (reddit.subreddits = [
            ...reddit.subreddits,
            { subreddit, posts: [] },
          ]),
            reddit.save().catch((err) => {
              // Not handling any error right now.
              console.error(err);
            });
        } else {
          message.reply(
            "This subreddit has already been added to this channel."
          );
        }
      });
    })
    .catch(() => {
      message.reply("Subreddit does not exist!");
    });
}

module.exports.addSubreddit = addSubreddit;
module.exports.updateRedditPosts = updateRedditPosts;
