// imports
require('dotenv').config();
const Discord = require('discord.js');

// User defined imports.
const { setReminder } = require('./functions/reminder.js');
const { sendDocumentation } = require('./functions/documentation');


// Declaring objects.
const client = new Discord.Client();

// Variable declarations.
const PREFIX = '!';
let guessgamestart = 'false';
let guessNumber = NaN;

client.on('message', async (message) => {
	// DO nothing if the message is from the bot.
	if(message.author.bot) return;
	if(message.content.startsWith(PREFIX)) {
		const [CMD_NAME, ...args] = message.content
																.trim().substring(PREFIX.length).split(/\s+/)

		// For a given command do something.
		// Admin commands.
		if(CMD_NAME === 'kick') {
			// Making sure that the user has permission to do this.
			if(!message.member.hasPermission('KICK_MEMBERS')) {
				return message.reply('You do not have permission to use that command');
			}
			// In case it they did not give who to ban.
			if(args.length === 0) return message.reply('Please provide an ID');
			// get the member whos ID was given.
			const member = message.guild.members.cache.get(args[0]);
			if(member) { // If the member exists.
				member.kick()
				.then(member => {
					message.channel.send(`${member} was kicked.`)
				})
				.catch(err => {
					message.channel.send('I do not have permissions to kick that memeber');
				})
			}
			else {
				message.channel.send('That member was not found');
			}
		}
		else if(CMD_NAME === 'ban') {
			if(!message.member.hasPermission('BAN_MEMBERS')) {
				return message.reply('You do not have permission to use that command');
			}
			if(args.length === 0) return message.reply('Please provide an ID');

			try {
				const user = await message.guild.members.ban(args[0]);
			}
			catch(err) {
				console.log('There was some error while banning!');
			}
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
	}
})

// Exporting the starting function to use in another file.
module.exports = () => client.login(process.env.DISCORD_BOT_TOKEN)
