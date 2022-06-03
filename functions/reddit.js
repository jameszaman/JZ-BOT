const { spawn } = require('child_process');
require('dotenv').config();


function updateRedditPosts(subreddits) {
  subreddits.forEach(subreddit => {
    // Initial arguments are what is necessary for Reddit API.
    const arguments = [`${__dirname}/reddit.py`, process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.USER_AGENT, subreddit];
    // Run python with necessary arguments for reddit API.
    const reddit = spawn('python', arguments);

    reddit.stdout.on('data', (data) => {
      // Converting the recieved string to array.
      let str = data.toString();
      str = str.replace(/['"\s\[\]]/g, '').split(',')
      console.log(str);
    });

    reddit.stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}

const args = ['memes', 'pics']
updateRedditPosts(args);
