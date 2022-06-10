// imports
const mongoose = require("mongoose");
require("dotenv").config(); // Getting all the environment variables.

// Database connection
mongoose.connect(
  `mongodb+srv://${process.env.DATABASE_USER}:${process.env.DATABASE_PASSWORD}@main.adjy4.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`,
  { useNewUrlParser: true, useUnifiedTopology: true }
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection ERROR :(:"));
db.once("open", function () {
  console.log("Database connected");
});

// Creating Schemas.
const reminderSchema = new mongoose.Schema({
  name: {
    String,
  },
  time: {
    type: [Date],
  },
  user_id: {
    type: Number,
  },
});

module.exports.Reminder = mongoose.model("reminder", reminderSchema);
module.exports.Schema = mongoose.Schema;
module.exports.Model = mongoose.model;
