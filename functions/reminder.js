const { Reminder } = "../database/database.js";

// *** Some necessary variables ***

// All the words one might say to refer time.
const timeWords = [
  "year",
  "years",
  "month",
  "months",
  "day",
  "days",
  "hour",
  "hours",
  "minute",
  "minutes",
  "second",
  "seconds",
];

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
  let message = fullString.reduce((prev, cur, index) => {
    if (index > lastTimeIndex) {
      return `${prev} ${cur}`;
    }
    return "";
  });
  if (message.startsWith(" to ")) {
    message = message.substring(4, message.length);
  } else {
    message = message.substring(1, message.length);
  }
  return message;
}

function setReminder(message) {
  const messageSplit = message.content.split(" ");
  // We need to know what type of reminder it is.
  if (messageSplit[1] === "after") {
    extraTime = {};
    let lastTimeIndex = -1;
    timeWords.forEach((time) => {
      const index = messageSplit.indexOf(time);
      if (index !== -1) {
        const key = messageSplit[index].replace(/s/g, "");
        extraTime[[key]] = Number(messageSplit[index - 1]);
        if (index > lastTimeIndex) {
          lastTimeIndex = index;
        }
      }
    });
    if (lastTimeIndex === -1) {
      console.error("Error");
    } else {
      console.log(new Date());
      console.log(getNewTime(extraTime));
      console.log(extractReminderMessage(messageSplit, lastTimeIndex));
    }
  }
}

module.exports.setReminder = setReminder;
