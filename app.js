// Imports
const bot = require('./bot.js');
const express = require('express');

// Objects.
const app = express();

// starting the bot.
bot();

// Starting server.
app.listen(3000)

