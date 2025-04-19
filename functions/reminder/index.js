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

function timeToAdd(messageSplit) {
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

  return {extraTime, lastTimeIndex};
}

// This function takes an object which lets it know much time to add.
// It adds those times to current time and returns a new Date();
// Object keys are year, month, day, hour, minute, second. Zero to all keys are accepted.
function getNewTime(extraTime, multiplier = 1) {
  let now = new Date();
  // Variables used for adding extra time.
  let year = 0,
    month = 0,
    day = 0,
    hour = 0,
    minute = 0,
    second = 0;

  // Adding extra time to appropriate variables.
  // The multiplier is useful when you want to add the same time multiple times.
  if (extraTime.year) {
    year = extraTime.year * multiplier;
  }
  if (extraTime.month) {
    month = extraTime.month * multiplier;
  }
  if (extraTime.day) {
    day = extraTime.day * multiplier;
  }
  if (extraTime.hour) {
    hour = extraTime.hour * multiplier;
  }
  if (extraTime.minute) {
    minute = extraTime.minute * multiplier;
  }
  if (extraTime.second) {
    second = extraTime.second * multiplier;
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

  if(message) {
    return message;
  }
  // In case no reminder message was found.
  return 'You are being reminded about.... ***something***. Unfortunately, you never told me what.'
}

function setReminder(message, client) {
  // The message that will be sent.
  let reminderMessage;

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

  // In case they say the message after the time.
  if(remindType == 'to') {
    reminderMessage = '';
    for(let i = 3; i < messageSplit.length; ++i) {
      if(['in', 'after', 'at', 'every'].includes(messageSplit[i])) {
        // This is the proper remind type.
        remindType = messageSplit[i];
        break;
      }
      else {
        reminderMessage += messageSplit[i] + ' ';
      }
    }
  }

  if(['after', 'in'].includes(remindType)) {
    const [extraTime, lastTimeIndex] = timeToAdd(messageSplit);

    if(lastTimeIndex == -1) {
      message.reply("Please give a proper time.");
      return;
    }
  
    // Get the message and when to remind.
    // We should try to extract the reminder message in case we have not already done that.
    if(!reminderMessage) {
      reminderMessage = extractReminderMessage(
        messageSplit,
        lastTimeIndex
      );
    }
    // Basically when the reminder should be sent. It is in milliseconds.
    const reminderTime = getNewTime(extraTime) - new Date();

    // We use a timeout to send the user the reminder
    // After the given time.
    setTimeout(() => {
      client.users.cache.get(remindPerson).send(reminderMessage);
    }, reminderTime);
    message.reply("Your reminder has been added!");
  } else if (remindType === "at") {
    message.reply("Not Implemented yet");
  } else if (remindType === "every") {
    const {extraTime, lastTimeIndex} = timeToAdd(messageSplit);
    
    if(lastTimeIndex == -1) {
      message.reply("Please give a proper time.");
      return;
    }

    // Users should say how many times the message should be repeated.
    // The count should always be right after the time.
    // That is why we are checking values relative to the last time index.
    const repeatCount = Number(messageSplit[lastTimeIndex + 1]);

    if(isNaN(repeatCount)) {
      message.reply("Please give a proper repeat count.");
      return;
    }
    
    // Remove the repeat count from the message.
    if (["time", "times"].includes(messageSplit[lastTimeIndex + 2])) {   
      messageSplit.splice(lastTimeIndex + 1, 2);
    }
    else {
      messageSplit.splice(lastTimeIndex + 1, 1);
    }

    // Get the message and when to remind.
    // We should try to extract the reminder message in case we have not already done that.
    if(!reminderMessage) {
      reminderMessage = extractReminderMessage(
        messageSplit,
        lastTimeIndex
      );
    }
    for(let i = 1; i <= repeatCount; ++i) {
      // Basically when the reminder should be sent. It is in milliseconds.
      const reminderTime = getNewTime(extraTime, i) - new Date();

      // We use a timeout to send the user the reminder
      // After the given time.
      setTimeout(() => {
        client.users.cache.get(remindPerson).send(reminderMessage);
      }, reminderTime);
    }
    message.reply("Your reminder has been added!");
  } else {
    message.reply("Please give proper reminder type. [after, at, every]");
  }
}

module.exports.setReminder = setReminder;
