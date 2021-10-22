// imports
require('dotenv').config();
const Discord = require('discord.js');

// User defined imports.
const { setReminder } = require('./functions/reminder.js');


// Declaring objects.
const client = new Discord.Client();

// Variable declarations.
const PREFIX = '!';
let guessgamestart = 'false';
let guessNumber = NaN;
let doc = `
	Welcome to JZ-BOT documentation.
	************************************
	All commands must start with '!'
	
	***List of commands***
	kick [id]
		Used to kick any member.
	ban [id]
		Used to ban any member.
	doc
		Get the documentation for this BOT!
	whohaspower
		Says the name of the most omnipotent being in all of existence.
	joke
		Says a random joke from the list of jokes in the database.
	weight
		Guesses your weight.
	*Guess Game Commands*
		guessgamestart
			starts the guess game.
		guessgameend
			ends the gues game.
		guess
			to guess the randomly generated number.
`

// Jokes. Need to put them in a database.
const jokes = [
   'Today at the bank, an old lady asked me to help check her balance. So I pushed her over.',
   "I bought some shoes from a drug dealer. I don't know what he laced them with, but I've been tripping all day.",
   "I told my girlfriend she drew her eyebrows too high. She seemed surprised.",
   "My dog used to chase people on a bike a lot. It got so bad, finally I had to take his bike away.",
   "I'm so good at sleeping. I can do it with my eyes closed.",
   "My boss told me to have a good day.. so I went home.",
   "Why is Peter Pan always flying? He neverlands.",
   `A woman walks into a library and asked if they had any books about paranoia. The librarian says "They're right behind you!"`,
   "The other day, my wife asked me to pass her lipstick but I accidentally passed her a glue stick. She still isn't talking to me.",
   "Why do blind people hate skydiving? It scares the hell out of their dogs.",
   'When you look really closely, all mirrors look like eyeballs.',
   `My friend says to me: "What rhymes with orange" I said: "No it doesn't"`,
   'What do you call a guy with a rubber toe? Roberto.',
   'What did the pirate say when he turned 80 years old? Aye matey.',
   'My wife told me I had to stop acting like a flamingo. So I had to put my foot down.'
]


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
			message.reply(doc)
		}
		else if(CMD_NAME === 'whohaspower') {
			message.channel.send('James!');
		}
		else if(CMD_NAME === 'joke') {
			let index = Math.floor(Math.random() * 16);
			message.channel.send(jokes[index]);
		}
		else if(CMD_NAME === 'weight') {
			message.reply(`Your weight is ${Math.ceil(Math.random() * 70 + 30)} kilograms`);
		}
		// Commands for guess game.
		else if(CMD_NAME === 'guessgamestart') {
			if(guessgamestart === 'true') {
				message.reply('The game is already on')
			}
			else { // if the game has not already been started start the game based on the given range.
				if(args[0] && args[1]) { // Here args have the range for the randomly generated number.
					guessgamestart = 'true';
					guessNumber = Math.ceil(Math.random() * Number(args[1]) + - args[0]);
					message.channel.send('Game started!');
				}
				else { // In case numbers were not given.
					message.reply('Give start and end numbers');
				}
			}
		}
		else if(CMD_NAME === 'guessgameend') {
			if(guessgamestart === 'true') {
				guessgamestart = false;
				guessNumber = NaN;
			}
			else {
				message.reply('The game is already off!');
			}
		}
		else if(CMD_NAME === 'guess') {
			if(guessNumber === Number(args[0])) {
				message.reply('You Win!');
				guessNumber = NaN;
				guessgamestart = 'false';
			}
			else if(guessNumber > Number(args[0])){
				message.reply('It is a bigger number')
			}
			else if(guessNumber < Number(args[0])){
				message.reply('It is a smaller number')
			}
		}
		else if(CMD_NAME === 'remind') {
			setReminder(message);
		}
	}
	else if(message.toString().includes('bot')) {
		message.reply(`HEY! Don't talk behind my back!`);
	}
})

// Exporting the starting function to use in another file.
module.exports = () => client.login(process.env.DISCORD_BOT_TOKEN)
