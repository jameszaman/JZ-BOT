import { Schema, Model } from './database';

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
        posts: {
          type: [String],
          required: true
        },
      }
    ],
    required: true
  },
  
});


module.exports = Model("reddit", redditSchema);
