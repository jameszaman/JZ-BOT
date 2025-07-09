// Imports
const { set } = require('mongoose');
const bot = require('./bot/bot.js');
const express = require('express');
const monitor = require('./services/monitorECSService.js');

const { ECS_MONITOR_TIME } = process.env;

// Declaring Objects.
const app = express();

app.get('/', function(req, res) {
	res.send('Hello World')
})

// Call the monitor service every 5 minutes.
setInterval(() => {
	monitor();
}, ECS_MONITOR_TIME); // 5 minutes in milliseconds

// starting the bot.
bot();

const port = process.env.PORT || 3000;

// Starting server.
app.listen(port, () => {
	console.log('Server is running. 😁');
});

