const { Reminder } = '../database/database.js';

function setReminder(message) {
  const messageSplit = message.content.split(' ');
  console.log(messageSplit);
}

module.exports.setReminder = setReminder;
