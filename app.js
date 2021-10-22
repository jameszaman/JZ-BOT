// Imports
const bot = require('./bot.js');
const express = require('express');

// Declaring Objects.
const app = express();

app.get('/', function(req, res) {
	res.send('Hello World')
})

// starting the bot.
bot();

// Starting server.
app.listen(3000)

