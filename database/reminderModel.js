const { Schema, Model } = require("./database");

// Creating Schemas.
const reminderSchema = new Schema({
  channel_id: { type: String, required: true },
  user_id: { type: String, required: true },
  reminderMessage: { type: String, required: true },
  time: { type: Date, required: true },
  repeat: { type: Number, default: 1 },
});

// Setting TTL, so the reminder is auto deleted after reminder is sent.
reminderSchema.index({time: 1}, { expireAfterSeconds: 0 });

module.exports = Model("reminder", reminderSchema);
