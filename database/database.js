// imports
const mongoose = require("mongoose");
require("dotenv").config(); // Getting all the environment variables.

// Database connection
mongoose.connect(
  process.env.DATABASE_URI,
  { useNewUrlParser: true, useUnifiedTopology: true }
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection ERROR :(:"));
db.once("open", function () {
  console.log("Database connected");
});

module.exports.Schema = mongoose.Schema;
module.exports.Model = mongoose.model;
