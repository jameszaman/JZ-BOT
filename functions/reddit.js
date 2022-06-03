// Imports
const { spawn } = require('child_process');
require('dotenv').config();

// User defined modules.
const Reddit = require('../database/redditModel');

function updateRedditPosts(subreddits) {
  subreddits.forEach(subreddit => {
    // Initial arguments are what is necessary for Reddit API.
    const arguments = [`${__dirname}/reddit.py`, process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.USER_AGENT, subreddit];
    // Run python with necessary arguments for reddit API.
    const reddit = spawn('python', arguments);

    reddit.stdout.on('data', (data) => {
      // Converting the recieved string to array.
      let posts = data.toString();
      posts = posts.replace(/['"\s\[\]]/g, '').split(',')
      // Adding the data to database.
      // First check if the subreddit 
      const reddit = Reddit({
        discord_channel_id: 10,
        subreddits: [
          {
            subreddit,
            posts
          }
        ]
      });
      reddit.save();
    });

    reddit.stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}

async function addSubreddit(discord_channel_id, subreddit) {
  // If there was no previous subreddit from that channel.
  // Add a new entry of subreddit for that channel.
  const reddit = Reddit({
    discord_channel_id: discord_channel_id,
    subreddits: [
      {
        subreddit,
        posts: []
      }
    ]
  });
  reddit.save().catch(async () => {
    // In case a subreddit already exists from this channel, update the subreddit list.
    const reddit = await Reddit.findOne({discord_channel_id});
    let alreadyExists = false;
    reddit.subreddits.forEach(savedSubreddit => {
      if(savedSubreddit.subreddit == subreddit) {
        alreadyExists = true;
      }
    });
    if(!alreadyExists) {
      reddit.subreddits = [...reddit.subreddits, {subreddit, posts:[]}],
      reddit.save().catch((err) => {
        // Not handling any error right now.
        console.error(err);
      });
    }
  })
}

// const args = ['memes']
// updateRedditPosts(args);

module.exports.addSubreddit = addSubreddit;
module.exports.updateRedditPosts = updateRedditPosts;
