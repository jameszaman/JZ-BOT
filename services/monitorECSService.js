require('dotenv').config();
const AWS = require('aws-sdk');
const axios = require('axios');
const { MessageEmbed } = require('discord.js');
const fs = require('fs');
const path = require('path');

const {
  CLUSTER_NAME,
  SERVICE_NAME,
  REGION,
  DISCORD_WEBHOOK_URL,
  SERVICE_API_URL,
  API_RESPONSE_TIME_LIMIT,
  SUCCESS_CALL_THRESHOLD,
  AUTH_COOKIE: initialCookie,
} = process.env;

// validate
if (!CLUSTER_NAME || !SERVICE_NAME || !REGION || !DISCORD_WEBHOOK_URL || !SERVICE_API_URL) {
  console.error('❌ Missing required env vars; please check your .env');
  process.exit(1);
}

// AWS setup
AWS.config.update({ region: REGION });
const ecs = new AWS.ECS();
const cloudwatch = new AWS.CloudWatch();

// mutable state
let currentCookie = initialCookie;
let successCount = 0;

// —————————————————————————————————————————————————————————————
// Helpers for ECS + CloudWatch
// —————————————————————————————————————————————————————————————

async function getTaskArns() {
  const { taskArns = [] } = await ecs.listTasks({
    cluster: CLUSTER_NAME,
    serviceName: SERVICE_NAME,
    desiredStatus: 'RUNNING',
  }).promise();
  return taskArns;
}

async function getTaskDetails(arns) {
  if (!arns.length) return [];
  const { tasks = [] } = await ecs.describeTasks({
    cluster: CLUSTER_NAME,
    tasks: arns,
  }).promise();
  return tasks;
}

async function getMetric(metricName) {
  const end = new Date();
  const start = new Date(end.getTime() - 5 * 60 * 1000);
  const { Datapoints = [] } = await cloudwatch.getMetricStatistics({
    Namespace: 'ECS/ContainerInsights',
    MetricName: metricName,
    Dimensions: [
      { Name: 'ClusterName', Value: CLUSTER_NAME },
      { Name: 'ServiceName', Value: SERVICE_NAME },
    ],
    StartTime: start,
    EndTime: end,
    Period: 300,
    Statistics: ['Average'],
  }).promise();

  if (!Datapoints.length) return 'N/A';
  return parseFloat(Datapoints[0].Average).toFixed(2);
}

// —————————————————————————————————————————————————————————————
// Persist rotated cookie into your .env
// —————————————————————————————————————————————————————————————

function updateEnvCookie(newCookie) {
  const envPath = path.resolve(__dirname, '.env');
  let data = fs.readFileSync(envPath, 'utf8');
  if (/^AUTH_COOKIE=/m.test(data)) {
    data = data.replace(/^AUTH_COOKIE=.*$/m, `AUTH_COOKIE=${newCookie}`);
  } else {
    data += `\nAUTH_COOKIE=${newCookie}`;
  }
  fs.writeFileSync(envPath, data, 'utf8');
  currentCookie = newCookie;  // also update in memory
}

// —————————————————————————————————————————————————————————————
// Hit your API up to 3× if slow, rotating cookies if needed
// —————————————————————————————————————————————————————————————


async function checkApiHealth(thresholdMs = 1000, maxAttempts = 3) {
  let lastResult = { label: '', ms: 0, attempts: 0 };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      const res = await axios.get(SERVICE_API_URL, {
        headers: { Cookie: currentCookie },
        maxRedirects: 0,
        validateStatus: s => s < 500,
      });
      const ms = Date.now() - start;
      lastResult = {
        label: `✅ ${res.status} ${res.statusText}`,
        ms,
        attempts: attempt,
        statusCode: res.status,
      };

      // — rotate cookie if Set-Cookie present —
      const set = res.headers['set-cookie'];
      if (Array.isArray(set)) {
        const found = set.find(c => c.startsWith('auth_token='));
        if (found && found !== currentCookie) {
          updateEnvCookie(found);
          console.log('🔁 Rotated auth cookie');
        }
      }

      // if fast enough, we’re done
      if (ms <= thresholdMs) return lastResult;
      // otherwise loop to retry
    } catch (err) {
      const ms = Date.now() - start;
      lastResult = {
        label: `❌ ${err.response?.status || 'ERR'} ${err.message}`,
        ms,
        attempts: attempt,
        statusCode: err.response?.status,
      };
      // retry
    }
  }

  // after all attempts (all slow or errors)
  return lastResult;
}

// —————————————————————————————————————————————————————————————
// Build Discord embed
// —————————————————————————————————————————————————————————————

function createEcsReportEmbed({
  clusterName,
  serviceName,
  tasks,
  cpu,
  cpuReserved,      // this was your cpuCores var
  memory,
  storageReadBytes,
  storageWriteBytes,
  apiHealth,
}) {
  const fmtBytes = b => {
    b = Number(b) || 0;
    if (b === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes','KB','MB','GB','TB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return `${(b / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const fastEnough = apiHealth.ms <= Number(API_RESPONSE_TIME_LIMIT);
  return new MessageEmbed()
    .setTitle('ECS Service Monitoring Report')
    .setColor(fastEnough ? 'GREEN' : 'RED')
    .setTimestamp()
    .addField(
      '🛠️ Service Info',
      [
        `• Cluster: \`${clusterName}\``,
        `• Service: \`${serviceName}\``,
        `• Running Tasks: \`${tasks.length.toLocaleString()}\``,
      ].join('\n'),
      false
    )
    .addField(
      '📊 Metrics',
      [
        `• CPU Used: \`${cpu}%\``,
        `• CPU Reserved: \`${cpuReserved}\``,
        `• Memory Used: \`${memory} MB\``,
        `• Storage Read: \`${fmtBytes(storageReadBytes)}\``,
        `• Storage Write: \`${fmtBytes(storageWriteBytes)}\``,
      ].join('\n'),
      false
    )
    .addField(
      '🚦 API Health',
      `${apiHealth.label} — ${apiHealth.ms} ms over ${apiHealth.attempts} attempt${apiHealth.attempts > 1 ? 's' : ''}`,
      false
    )
    .setFooter(`Report generated at ${new Date().toISOString()}`);
}

// —————————————————————————————————————————————————————————————
// Send via webhook, ping @everyone on failure
// —————————————————————————————————————————————————————————————

async function sendToDiscord({ embed, pingEveryone = false }) {
  const payload = {
    embeds: [embed.toJSON()],
    allowed_mentions: {
      parse: pingEveryone ? ['everyone'] : [],
    },
  };

  if (pingEveryone) payload.content = '@everyone';

  try{
    await axios.post(DISCORD_WEBHOOK_URL, payload);
  }
  catch (err) {
    console.error('❌ Failed to send report to Discord:', err.message);
  }
}

// —————————————————————————————————————————————————————————————
// Main monitor function
// —————————————————————————————————————————————————————————————

async function monitor() {
  try {
    // 1) ECS + metrics
    const arns = await getTaskArns();
    const tasks = await getTaskDetails(arns);

    const [cpu, mem, write, read, reserved] = await Promise.all([
      getMetric('CpuUtilized'),
      getMetric('MemoryUtilized'),
      getMetric('StorageWriteBytes'),
      getMetric('StorageReadBytes'),
      getMetric('CpuReserved'),
    ]);

    // 2) API health
    const apiHealth = await checkApiHealth(
      Number(API_RESPONSE_TIME_LIMIT),
      3
    );

    // 3) success batching
    if (apiHealth.ms <= Number(API_RESPONSE_TIME_LIMIT)) {
      successCount++;
      console.log(`✅ API health check passed (${apiHealth.ms} ms) - Success count: ${successCount}`);
      if (successCount < Number(SUCCESS_CALL_THRESHOLD)) {
        return; // skip sending until threshold reached
      }
      successCount = 0;   
    } else {
      successCount = 0; // reset on failure
    }

    // 4) build + send
    const embed = createEcsReportEmbed({
      clusterName: CLUSTER_NAME,
      serviceName: SERVICE_NAME,
      tasks,
      cpu,
      cpuReserved: reserved,
      memory: mem,
      storageReadBytes: read,
      storageWriteBytes: write,
      apiHealth,
    });

    const pingEveryone = apiHealth.ms > Number(API_RESPONSE_TIME_LIMIT);
    await sendToDiscord({ embed, pingEveryone });
    console.log('✅ Report sent to Discord');
  } catch (err) {
    console.error('❌ Error Happened: ', err.message);
  }
}

// run if invoked directly
if (require.main === module) {
  monitor();
}

module.exports = monitor;
