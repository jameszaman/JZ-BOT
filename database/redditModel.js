const { Schema, Model } = require('./database');

// Creating Schemas.
// This took me way longer than what I expected.
// Feel free to improve it.
const redditSchema = Schema({
  discord_channel_id: {
    type: Number,
    required: true
  },
  subreddits: {
    type: [
      {
        subreddit: {
          type: String,
          required: true
        },
        posts: [String],
      }
    ],
    required: true
  },
  
});


module.exports = Model("reddit", redditSchema);
