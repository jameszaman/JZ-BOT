// Imports
const { spawnSync } = require("child_process");
const axios = require("axios");
require("dotenv").config();

// User defined modules.
const Reddit = require("../database/redditModel");
const e = require("express");

async function updateRedditPosts(client) {
  // Get information about all the subreddits of every discord channel.
  const discordReddits = await Reddit.find();

  // Initial arguments are what is necessary for Reddit API.
  const arguments = [
    `${__dirname}/reddit.py`,
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.USER_AGENT,
    // discordReddits[discordIndex].subreddits[subredditIndex].subreddit,
  ];

  // Adding the list of subreddits to arguments.
  discordReddits.forEach((discordReddit) => {
    discordReddit.subreddits.forEach((subreddit) => {
      arguments.push(subreddit.subreddit);
    });
  });

  // Run python with necessary arguments for reddit API.
  const reddit = await spawnSync("python", arguments, {
    stdio: "pipe",
    encoding: "utf-8",
  });

  // Convert the recieved output to JSON. This makes it easier for us to work with.
  let str = reddit.output[1];
  str = `{${str}}`
    .replace(/\s/g, "")
    .replace(/'/g, '"')
    .replace(/"\]"/g, '"],"');
  const all_posts = JSON.parse(str);

  if (reddit.output[0] || reddit.output[2]) {
    // If there are any errors from python, just do nothing.
    // Once a while there is an error, but not interested
    // to solve this right now. [Probably due to my bad internet]
    return;
  }

  // Must update for each discord channel.
  // Code seems a bit more complex as we cannot use forEach.
  // forEach cannot be used because we need async functions.
  for (let discordIndex in discordReddits) {
    // tracking if the channel still exists.
    let channelDeleted = false;
    for (let subredditIndex in discordReddits[discordIndex].subreddits) {
      const posts =
        all_posts[
          discordReddits[discordIndex].subreddits[subredditIndex].subreddit
        ];

      // Update the posts list in the subreddit.
      for (let post of posts) {
        // if the post does not already exists in the database,
        // send it to discord and add it to the database.
        if (
          !discordReddits[discordIndex].subreddits[
            subredditIndex
          ].posts.includes(post)
        ) {
          try {
            // Sending it to discord.
            client.channels.cache
              .get(discordReddits[discordIndex].discord_channel_id)
              .send(post);
            // Adding it to the database.
            discordReddits[discordIndex].subreddits[subredditIndex].posts.push(
              post
            );
          } catch (err) {
            // Channel does not exist.
            channelDeleted = true;
            break;
          }
        }
      }
    }
    if (channelDeleted) {
      // If a channel has been deleted from discrod,
      // we also need to delete it from our database.
      Reddit.deleteOne(discordReddits[discordIndex])
        .then(() => {
          // This .then() is needed for delete. No idea why though.
        })
        .catch((err) => {
          console.error(err);
        });
    } else {
      // If everything is fine, updating the database.
      discordReddits[discordIndex].save();
    }
  }
}

async function addSubreddit(message) {
  // Extracting the necessary data.
  const discord_channel_id = message.channel.id.toString();
  const subreddit = message.content.split(" ")[1];

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
    .catch((err) => {
      message.reply(`Subreddit \`${subreddit}\` does not exist!`);
    });
}

async function removeSubreddit(message) {
  // Extracting the necessary data.
  const discord_channel_id = message.channel.id.toString();
  const subredditName = message.content.split(" ")[1];

  const discord_channel = await Reddit.findOne({ discord_channel_id });
  let index = -1;
  if (!discord_channel) {
    message.reply(`No Subreddit is added to this channel.`);
    return;
  }
  for (let i in discord_channel.subreddits) {
    if (discord_channel.subreddits[i].subreddit == subredditName) {
      index = i;
    }
  }
  // If index does not change, the subreddit is not in database.
  if (index == -1) {
    message.reply("Subreddit was never added.");
  } else if (discord_channel.subreddits.length == 1) {
    Reddit.findOneAndRemove({ discord_channel_id }, (err) => {
      if (err) {
        console.error(err);
      }
    });
  } else {
    discord_channel.subreddits.splice(index, 1);
    discord_channel.save().catch((err) => {
      console.error(err);
    });
  }
}

async function redditInfo(message) {
  const discord_channel_id = message.channel.id.toString();
  const discord_channel = await Reddit.findOne({ discord_channel_id });
  let info = `Added subreddits | Posts\n-------------------------------\n`;
  discord_channel.subreddits.forEach((subreddit) => {
    info += `${subreddit.subreddit}\t-\t${subreddit.posts.length}\n`;
  });
  // console.log(discord_channel);
  if (discord_channel) {
    message.channel.send(info);
  } else {
    message.reply("You don't have any subreddits in this channel.");
  }
}

module.exports.addSubreddit = addSubreddit;
module.exports.removeSubreddit = removeSubreddit;
module.exports.updateRedditPosts = updateRedditPosts;
module.exports.redditInfo = redditInfo;
