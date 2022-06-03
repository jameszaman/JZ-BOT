// imports
require('dotenv').config();
const Discord = require('discord.js');

// User defined imports.
const { setReminder } = require('./functions/reminder.js');
const { sendDocumentation } = require('./functions/documentation');
const { ban, kick } = require('./functions/moderator');
const { addSubreddit } = require('./functions/reddit');

// Declaring objects.
const client = new Discord.Client();

// Variable declarations.
const PREFIX = '!';

client.on('message', async (message) => {
	// DO nothing if the message is from the bot.
	if(message.author.bot) return;
	if(message.content.startsWith(PREFIX)) {
		const [CMD_NAME, ...args] = message.content.trim().substring(PREFIX.length).split(/\s+/)

		// For a given command do something.
		// Admin commands.
		if(CMD_NAME === 'kick') {
			kick(message, args);
		}
		else if(CMD_NAME === 'ban') {
			ban(message, args);
		}
		// General purpose commands.
		else if(CMD_NAME === 'doc') {
			sendDocumentation(message);
		}
		else if(CMD_NAME === 'whohaspower') {
			message.channel.send('James!');
		}
		else if(CMD_NAME === 'weight') {
			message.reply(`Your weight is ${Math.ceil(Math.random() * 70 + 30)} kilograms`);
		}
		else if(CMD_NAME === 'remind') {
			setReminder(message);
		}
		else if(CMD_NAME === 'addsubreddit') {
			addSubreddit(message.channel.id.toString(), message.content.split(' ')[1]);
		}
	}
})

// Exporting the starting function to use in another file.
module.exports = () => client.login(process.env.DISCORD_BOT_TOKEN)
