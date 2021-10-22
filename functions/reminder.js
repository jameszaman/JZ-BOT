const { Reminder } = '../database/database.js';

// *** Misc Functions ***.

// This funnction takes an object which lets it know much time to add.
// It adds those times to current time and returns a new Date();
// Object keys are year, month, day, hour, minute, second. Zero to all keys are accepted.
function getNewTime(extraTime) {
  let now = new Date();
  // Variables used for adding extra time.
  let year = 0,
    month = 0,
    day = 0,
    hour = 0,
    minute = 0,
    second = 0;
  console.log(extraTime);

  // Adding extra time to appropiate variables.
  if (extraTime.year) {
    year = extraTime.year;
  }
  if (extraTime.month) {
    month = extraTime.month;
  }
  if (extraTime.day) {
    day = extraTime.day;
  }
  if (extraTime.hour) {
    hour = extraTime.hour;
  }
  if (extraTime.minute) {
    minute = extraTime.minute;
  }
  if (extraTime.second) {
    second = extraTime.second;
  }

  // Return the new date by adding all the extra time to current time.
  return new Date(
    now.getFullYear() + year,
    now.getMonth() + month,
    now.getDate() + day,
    now.getHours() + hour,
    now.getMinutes() + minute,
    now.getSeconds() + second
  );
}

function extractReminderMessage(fullString, lastTimeIndex) {
  return fullString.reduce((prev, cur, index) => {
    if (index > lastTimeIndex) {
      return `${prev} ${cur}`;
    }
    return "";
  });
}


function setReminder(message) {
  const messageSplit = message.content.split(' ');
  console.log(messageSplit);
}

module.exports.setReminder = setReminder;
