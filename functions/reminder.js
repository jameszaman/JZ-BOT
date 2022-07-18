const { Reminder } = "../database/database.js";

// *** Some necessary variables ***

// All the words one might say to refer time.
const timeWords = {
  year: ["year", "years"],
  month: ["month", "months"],
  day: ["day", "days"],
  hour: ["hour", "hours"],
  minute: ["minute", "minutes", "min", "mins"],
  second: ["second", "seconds", "sec", "secs"],
};

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

function setReminder(message, client) {
  const messageSplit = message.content.split(" ");
  // We need to know what type of reminder it is.
  if (messageSplit[1] === "after") {
    extraTime = {};
    let lastTimeIndex = -1;
    for (word in timeWords) {
      for (time of timeWords[word]) {
        const index = messageSplit.indexOf(time);
        if (index !== -1) {
          extraTime[[word]] = Number(messageSplit[index - 1]);
          // As we are checking for time from the whole string,
          // We do not know where is the time part of the message ends.
          // We need to save this to know where the message starts.
          if (index > lastTimeIndex) {
            lastTimeIndex = index;
          }
        }
      }
    }
    if (lastTimeIndex === -1) {
      message.reply("Please give proper reminder message.");
    } else {
      // Get the message and when to remind.
      const reminderMessage = extractReminderMessage(
        messageSplit,
        lastTimeIndex
      );
      // Basically when the reminder should be sent. It is in miliseconds.
      const reminderTime = getNewTime(extraTime) - new Date();

      // We use a timeout to send the user the reminder
      // After the given time.
      setTimeout(() => {
        client.users.cache.get(message.author.id).send(reminderMessage);
      }, reminderTime);
    }
  } else if (messageSplit[1] === "at") {
    message.reply("Not Implemented yet");
  } else if (messageSplit[1] === "every") {
    message.reply("Not Implemented yet");
  } else {
    message.reply("Please give proper reminder type. [after, at, every]");
  }
}

module.exports.setReminder = setReminder;
