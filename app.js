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

const port = process.env.PORT || 3000;

// Starting server.
app.listen(port, () => {
	console.log('Server is running. 😁');
});

