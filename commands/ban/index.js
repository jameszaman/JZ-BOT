// ! Untested in the new folder structure as we are not supporting this yet.

module.exports = async function ban(message, args) {
    if (!message.member.hasPermission("BAN_MEMBERS")) {
    return message.reply("You do not have permission to use that command");
  }
  if (args.length === 0) return message.reply("Please provide an ID");

  try {
    const user = await message.guild.members.ban(args[0]);
  } catch (err) {
    console.error("There was some error while banning!");
  }
};
