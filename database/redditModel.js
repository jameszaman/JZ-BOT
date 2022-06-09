const { Schema, Model } = require("./database");

// Creating Schemas.
// This took me way longer than what I expected.
// Feel free to improve it.
const redditSchema = Schema({
  discord_channel_id: {
    type: String,
    required: true,
    unique: true,
  },
  subreddits: {
    type: [
      {
        _id: false,
        subreddit: {
          type: String,
        },
        posts: [
          {
            type: String,
            // unique: true,
          },
        ],
      },
    ],
    required: true,
  },
});

module.exports = Model("reddit", redditSchema);
