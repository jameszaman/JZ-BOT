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

function activeDevicesSummaryPipeline(user_id) {
  return [
    {
      $match: { user_id: user_id }
    },
    {
      $group: {
        _id: "$unique_browser_id",
        count: {
          $sum: 1
        },
        user_agent: {$last: "$user_agent"},
        ip: {$last: "$ip"},
        timestamp: {$last: "$timestamp"}
      }
    },
    {
      $sort: {
        count: -1
      }
    }
  ]
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
      else {
        // If no inactivity time is found, we can log it or handle it accordingly.
        const pipeline = activeDevicesSummaryPipeline(jsonMessage.user_id);

        aggregate("Tracking", "CORE_PROP_CLOUD_LOGS", pipeline)
          .then((result) => {
            if (result.length > 0) {
              // First check if number of devices and unique_browser_id are the same.
              // If they match, there are no auto logout as the user used different devices for each session.
              const headers = {}
              result.forEach((device) => {
                headers[device.user_agent] = headers[device.user_agent] || 0;
                headers[device.user_agent]++;
              });

              if(Object.keys(headers).length != result.length) {
                message.reply({
                  content: `@everyone Attention: User ID \`${jsonMessage.user_id}\` has multiple active sessions in same device.\n ${JSON.stringify(result, null, 2)}`,
                  allowedMentions: { parse: ["everyone"] }
                })
              }
              else {
                message.reply({
                  content: `No inactivity time found for Browser ID: \`${uniqueBrowserID}\`.`,
                  allowedMentions: { parse: [] },
                });
              }
            } else {
              // There should never be a case where no logs are found. If that happens, we made some mistake to call the query.
              message.reply({
                content: `@everyone Error: No logs found for Browser ID: \`${uniqueBrowserID}\`, User ID: \`${jsonMessage.user_id}\``,
                allowedMentions: { parse: ["everyone"] },
              });
            }
          })
          .catch((err) => {
            message.reply({
              content: `@everyone Error: Error Finding logs for Browser ID: \`${uniqueBrowserID}\`, User ID: \`${jsonMessage.user_id}\``,
              allowedMentions: { parse: ["everyone"] },
            });
            console.error("Error finding logs:", err);
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
