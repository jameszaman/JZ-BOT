const { Schema, Model } = require("./database");

// Creating Schemas.
const reminderSchema = Schema({
  message: {
    String,
  },
  time: {
    type: Date,
  },
  user_id: {
    type: String,
  },
});

module.exports.Reminder = Model("reminder", reminderSchema);
