const { Reminder } = "../database/database.js";

// *** Some necessary variables ***

// All the words one might say to refer time.
const timeWords = {
  year: ["year", "years"],
  month: ["month", "months"],
  day: ["day", "days"],
  hour: ["hour", "hours", "hrs"],
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
  // If me/my/myself/mine is used in the message, we would assume that they
  // Are talking about the author of the message.
  message.content = message.content.replace(
    /\bme\b|\bmyself\b/g,
    `<@${message.author.id}>`
  );
  message.content = message.content.replace(
    /\bmy\b|\bmine\b/g,
    `<@${message.author.id}>'s`
  );
  message.content = message.content.replace(
    /\bI\b/g,
    `You`
  );
  // Taking all the words.
  const messageSplit = message.content.split(/\s+/);
  // We need to know what type of reminder it is.
  let remindType, remindPerson;
  // We need to check if a user was specified who should be reminded.
  if (messageSplit[1].startsWith("<@")) {
    const lastCharIndex = messageSplit[1].length - 1;
    // A proper ID should be of the format <@number>. These 2 ifs are to make sure proper ID was provided.
    if (messageSplit[1][lastCharIndex] == ">") {
      remindPerson = messageSplit[1].substring(2, lastCharIndex);
      remindType = messageSplit[2];
    }
  }
  // If none was specified, the sender should be reminded.
  else {
    remindType = messageSplit[1]; // Starts from index 1 was none was specified.
    remindPerson = message.author.id;
  }

  if (remindType === "after") {
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
      let reminderMessage = extractReminderMessage(
        messageSplit,
        lastTimeIndex
      );
      if(!reminderMessage) {
        reminderMessage = 'You are being reminded about.... ***something***. Unfortunately, you never told me what.'
      }
      // Basically when the reminder should be sent. It is in miliseconds.
      const reminderTime = getNewTime(extraTime) - new Date();

      // We use a timeout to send the user the reminder
      // After the given time.
      setTimeout(() => {
        client.users.cache.get(remindPerson).send(reminderMessage);
      }, reminderTime);
      message.reply("Your reminder has been added!");
    }
  } else if (remindType === "at") {
    message.reply("Not Implemented yet");
  } else if (remindType === "every") {
    message.reply("Not Implemented yet");
  } else {
    message.reply("Please give proper reminder type. [after, at, every]");
  }
}

module.exports.setReminder = setReminder;
