const { aggregate } = require("../database/mongodb.js");



function inactivityTimeCheckPipeline(unique_browser_id) {
  return [
    {
      $match: {
        unique_browser_id: unique_browser_id,
        mode: "production",
        api: "/login",
      },
    },
    {
      $sort: {
        timestamp: -1,
      },
    },
    {
      $limit: 1,
    },
    {
      $lookup: {
        from: "CORE_PROP_CLOUD_LOGS",
        let: { ts: "$timestamp" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $eq: ["$unique_browser_id", unique_browser_id],
                  },
                  { $lt: ["$timestamp", "$$ts"] },
                  {
                    $eq: ["$is_authenticated", true],
                  },
                  { $eq: ["$mode", "production"] },
                ],
              },
            },
          },
          { $sort: { timestamp: -1 } },
          { $limit: 1 },
        ],
        as: "unauth_before",
      },
    },
    {
      $addFields: {
        timeDifferenceSeconds: {
          $cond: {
            if: { $gt: [{ $size: "$unauth_before" }, 0] },
            then: {
              $divide: [
                {
                  $subtract: [
                    "$timestamp",
                    { $arrayElemAt: ["$unauth_before.timestamp", 0] },
                  ],
                },
                1000,
              ],
            },
            else: null,
          },
        },
      },
    },
  ];
}

function checkLoginLogsHelper(message) {
  const jsonMessage = JSON.parse(message.content);
  const uniqueBrowserID = jsonMessage.unique_browser_id;

  const pipeline = inactivityTimeCheckPipeline(uniqueBrowserID);

  aggregate("Tracking", "CORE_PROP_CLOUD_LOGS", pipeline)
    .then((result) => {
      if (result[0].timeDifferenceSeconds) {
        const totalSeconds = Math.floor(result[0].timeDifferenceSeconds);
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const formattedDHMS = [
          String(days).padStart(2, "0"),
          String(hours).padStart(2, "0"),
          String(minutes).padStart(2, "0"),
          String(seconds).padStart(2, "0"),
        ].join(":");

        let shouldMentionAll = result[0].timeDifferenceSeconds < 24 * 60 * 60; // 24 hours in seconds

        // If the inactivity is less than 24 hours, we to also check if the reason is a manual logout.
        // If it is, we don't want to mention everyone.
        let postfix = "";
        try {
          if (shouldMentionAll) {
            if (result[0].unauth_before[0].api == "/logout") {
              shouldMentionAll = false;
              postfix = " **(manual logout)**";
            }
          }
        } catch (error) {
          console.error("Error checking logout reason:", error);
        }

        const prefix = shouldMentionAll ? "@everyone " : "";
        const allowedMentions = {
          parse: shouldMentionAll ? ["everyone"] : [],
          repliedUser: false, // prevents pinging the user you're replying to
        };

        const content = `${prefix}Browser ID: \`${uniqueBrowserID}\` | Inactivity Time: \`${formattedDHMS}\` ${postfix}.`;

        message.reply({
          content,
          allowedMentions,
        });
      }
    })
    .catch((err) => {
      console.error("Error aggregating data:", err);
    });
}

module.exports = async function checkLoginLogs(channelId, message) {
  if (message.channel.id == channelId) {
    if (message.content.includes(`logged in`)) {
      setTimeout(() => {
        checkLoginLogsHelper(message);
      }, 60 * 1000);
    }
  }
}
