let doc = `
	Welcome to JZ-BOT documentation.
	************************************
	All commands must start with '!'
	
	***List of commands***
	ban [id]
		Used to ban any member.
	doc
		Get the documentation for this BOT!
	kick [id]
		Used to kick any member.
	weight
		Guesses your weight.
	addsubreddit [subreddit]
		hot posts from added subreddit will be posted to the channel where this command is used.
`;

function sendDocumentation(message) {
  message.reply(doc);
}

module.exports.sendDocumentation = sendDocumentation;
