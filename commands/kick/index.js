// ! Untested in the new folder structure as we are not supporting this yet.

module.exports = function kick(message, args) {
  // Making sure that the user has permission to do this.
  if (!message.member.hasPermission("KICK_MEMBERS")) {
    return message.reply("You do not have permission to use that command");
  }
  // In case it they did not give who to ban.
  if (args.length === 0) return message.reply("Please provide an ID");
  // get the member whos ID was given.
  const member = message.guild.members.cache.get(args[0]);
  if (member) {
    // If the member exists.
    member
      .kick()
      .then((member) => {
        message.channel.send(`${member} was kicked.`);
      })
      .catch((err) => {
        message.channel.send("I do not have permissions to kick that memeber");
      });
  } else {
    message.channel.send("That member was not found");
  }
};
