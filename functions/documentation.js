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

function sendDocumentation(message) {
  message.reply(doc);
}

module.exports.sendDocumentation = sendDocumentation;
