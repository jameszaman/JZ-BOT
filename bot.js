require('dotenv').config();
const Discord = require('discord.js');

const client = new Discord.Client();

const PREFIX = '!';


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

// Variable declarations.
let guessgamestart = 'false';
let guessNumber = NaN;


// Functions of the bot.
const sqlCommands = (message) => {
   // if it is a create database query.
   if(message.content.trim().toLowerCase().startsWith('create database')) {
      // extracting database name from message.
      let splt = message.content.trim().split(' ');
      let databaseName = splt[splt.length - 1];
      if(databaseName[databaseName.length - 1] === ';') {
         databaseName = databaseName.slice(0, databaseName.length - 1);
      }
      // creating the channel on 'SQL' category.
      message.guild.channels.create(databaseName, {
         type: 'text',
         parent: '828334984577679451'
      })
      const sql = `CREATE DATABASE IF NOT EXISTS ${databaseName}`;
      db.query(sql);
   }
   if(message.content.trim().toLowerCase().startsWith('drop database')) {
      // extracting database name from message.
      let splt = message.content.trim().split(' ');
      let databaseName = splt[splt.length - 1];
      if(databaseName[databaseName.length - 1] === ';') {
         databaseName = databaseName.slice(0, databaseName.length - 1);
      }
      const sql = `DROP DATABASE IF EXISTS ${databaseName}`;
      db.query(sql, (err, result) => {
         if(err) {
            message.channel.send(err.sqlMessage);
         }
         else {
            message.channel.delete();
         }
      })
   }
   else {
      // get the channel name
      const channelName = message.guild.channels.cache.get(message.channel.id)['name'];
      const sql = `USE ${channelName}`;
      // first set the database to channel name.
      db.query(sql, (err, result) => {
         if(err) {
            console.error(err)
            message.channel.send(err.sqlMessage);
         }
         const sql = message.content;
         // if it is a select query.
         if(message.content.trim().toLowerCase().startsWith('select')) {
            const sql = message.content; // the message is the query.
            db.query(sql, (err, result) => {
               if(err) {
                  console.error(err)
                  message.channel.send(err.sqlMessage);
               }
               else {
                  // Turn the whole object to a string.
                  msg = '';
                  for(let i = 0; i < result.length; ++i) {
                     for(j in result[i]) {
                        msg += `${j}: ${result[i][j]}\n`;
                     }
                     msg += '\n';
                  }
                  // send that string.
                  message.channel.send(msg);
               }
            })
         }
         // any other query.
         else {
            db.query(sql, (err, result) => {
               if(err) {
                  console.log(err);
                  message.channel.send(err.sqlMessage);
               }
            })
         }
      })
   }
}


client.on('message', async (message) => {
   if(message.author.bot) return;
   if(message.content.startsWith(PREFIX)) {
      const [CMD_NAME, ...args] = message.content
                                 .trim().substring(PREFIX.length).split(/\s+/)

      if(CMD_NAME === 'kick') {
         if(!message.member.hasPermission('KICK_MEMBERS')) {
            return message.reply('You do not have permission to use that command');
         }
         if(args.length === 0) return message.reply('Please provide an ID');

         const member = message.guild.members.cache.get(args[0]);
         if(member) {
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
      else if(CMD_NAME === 'guessgamestart') {
         if(guessgamestart === 'true') {
            message.reply('The game is already on')
         }
         else {
            if(args[0] && args[1]) {
               guessgamestart = 'true';
               guessNumber = Math.ceil(Math.random() * Number(args[1]) + - args[0]);
               message.channel.send('Game started!');
            }
            else {
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
   }
   else if(message.toString().includes('bot')) {
      if(message.member.id !== '546626744233230354') {
         message.reply(`HEY! Don't talk behind my back!`);
      }
   }
})


module.exports = () => client.login(process.env.DISCORD_BOT_TOKEN)
