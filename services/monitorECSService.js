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

if (!CLUSTER_NAME || !SERVICE_NAME || !REGION || !DISCORD_WEBHOOK_URL || !SERVICE_API_URL) {
  console.error('❌ Missing required env vars; please check your .env');
  process.exit(1);
}

AWS.config.update({ region: REGION });
const ecs = new AWS.ECS();
const cloudwatch = new AWS.CloudWatch();
let currentCookie = initialCookie;
let successCount = 0;

/** List running task ARNs */
async function getTaskArns() {
  const { taskArns = [] } = await ecs
    .listTasks({
      cluster: CLUSTER_NAME,
      serviceName: SERVICE_NAME,
      desiredStatus: 'RUNNING'
    })
    .promise();
  return taskArns;
}

/** Describe those tasks */
async function getTaskDetails(arns) {
  if (!arns.length) return [];
  const { tasks = [] } = await ecs
    .describeTasks({
      cluster: CLUSTER_NAME,
      tasks: arns
    })
    .promise();
  return tasks;
}

/** Fetch one metric from CW (Average over last 5m) */
async function getMetric(metricName) {
  const end = new Date();
  const start = new Date(end.getTime() - 5 * 60 * 1000);
  const { Datapoints = [] } = await cloudwatch
    .getMetricStatistics({
      Namespace: 'ECS/ContainerInsights',
      MetricName: metricName,
      Dimensions: [
        { Name: 'ClusterName', Value: CLUSTER_NAME },
        { Name: 'ServiceName', Value: SERVICE_NAME }
      ],
      StartTime: start,
      EndTime: end,
      Period: 300,
      Statistics: ['Average']
    })
    .promise();

  if (!Datapoints.length) return 'N/A';
  return parseFloat(Datapoints[0].Average).toFixed(2);
}

/** Persist updated AUTH_COOKIE back into your .env */
function updateEnvCookie(newCookie) {
  const envPath = path.resolve(__dirname, '.env');
  let data = fs.readFileSync(envPath, 'utf8');
  if (/^AUTH_COOKIE=/m.test(data)) {
    data = data.replace(/^AUTH_COOKIE=.*$/m, `AUTH_COOKIE=${newCookie}`);
  } else {
    data += `\nAUTH_COOKIE=${newCookie}`;
  }
  fs.writeFileSync(envPath, data, 'utf8');
}

async function checkApiHealth(threshold = 1000, maxAttempts = 3) {
  let last;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now();
    try {
      const res = await axios.get(SERVICE_API_URL, {
        headers: { Cookie: currentCookie },
        maxRedirects: 0,
        validateStatus: s => s < 500
      });
      const ms = Date.now() - start;
      last = { label: `✅ ${res.status} ${res.statusText}`, ms, attempts: attempt };
      // rotate cookie if needed...
      if (ms <= threshold) return last;
    } catch (err) {
      const ms = Date.now() - start;
      last = { label: `❌ ${err.response?.status || 'ERR'} ${err.message}`, ms, attempts: attempt };
    }
  }
  return last;
}

function createEcsReportEmbed({ clusterName, serviceName, tasks, cpu, cpuCores, memory, storageReadBytes, storageWriteBytes, apiHealth }) {
  const fmtBytes = b => {
    if (b === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes','KB','MB','GB','TB'], i = Math.floor(Math.log(b)/Math.log(k));
    return `${(b/Math.pow(k,i)).toFixed(2)} ${sizes[i]}`;
  };

  const fastEnough = apiHealth.ms <= API_RESPONSE_TIME_LIMIT;
  return new MessageEmbed()
    .setTitle('ECS Service Monitoring Report')
    .setColor(fastEnough ? 'GREEN' : 'RED')
    .setTimestamp()
    .addField('🛠️ Service Info', [
        `• Cluster: \`${clusterName}\``,
        `• Service: \`${serviceName}\``,
        `• Running Tasks: \`${tasks.length.toLocaleString()}\``
      ].join('\n'), false)
    .addField('📊 Metrics', [
        `• CPU Used: \`${cpu}%\``,
        `• CPU Cores: \`${cpuCores / 1024}\``,
        `• Memory Used: \`${memory} MB\``,
        `• Storage Read: \`${fmtBytes(+storageReadBytes)}\``,
        `• Storage Write: \`${fmtBytes(+storageWriteBytes)}\``
      ].join('\n'), false)
    .addField('🚦 API Health', `${apiHealth.label} — ${apiHealth.ms} ms over ${apiHealth.attempts} attempt${apiHealth.attempts>1?'s':''}`, false)
    .setFooter(`Report generated at ${new Date().toISOString()}`);
}

/** Send your embed via webhook, with optional mention */
async function sendToDiscord({ embed, content = '' }) {
  await axios.post(DISCORD_WEBHOOK_URL, {
    content,
    embeds: [embed.toJSON()]
  });
}

async function monitor() {
  try {
    const arns = await getTaskArns();
    const tasks = await getTaskDetails(arns);
    const [cpu, mem, write, read, cpuCores] = await Promise.all([
      getMetric('CpuUtilized'),
      getMetric('MemoryUtilized'),
      getMetric('StorageWriteBytes'),
      getMetric('StorageReadBytes'),
      getMetric('CpuReserved'),
    ]);

    const apiHealth = await checkApiHealth(API_RESPONSE_TIME_LIMIT, 3);
    
    // We do not need to send every successful API call to Discord,
    // only if it exceeds the threshold.
    if (apiHealth.ms <= API_RESPONSE_TIME_LIMIT) {
      successCount++;
      if (successCount < SUCCESS_CALL_THRESHOLD) {
        return;
      }
      successCount = 0; // reset after sending
    } else {
      successCount = 0; // reset on failure
    }

    const embed = createEcsReportEmbed({
      clusterName: CLUSTER_NAME,
      serviceName: SERVICE_NAME,
      tasks,
      cpu,
      cpuCores: cpuCores,
      memory: mem,
      storageReadBytes: read,
      storageWriteBytes: write,
      apiHealth
    });

    // if still too slow after 3 tries, mention the user
    const mention = apiHealth.ms > API_RESPONSE_TIME_LIMIT
      ? `@everyone`
      : '';

    await sendToDiscord({ embed, content: mention });
  } catch (err) {
    console.error('❌ Error monitoring ECS service:', err);
  }
}

if (require.main === module) monitor();
module.exports = monitor;
