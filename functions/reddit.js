const { spawn } = require('child_process');
require('dotenv').config();


const reddit = spawn('python', [`${__dirname}/reddit.py`, process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.USER_AGENT])

reddit.stdout.on('data', (data) => {
  console.log(data.toString());
});

reddit.stderr.on('data', (data) => {
  console.error(data.toString());
});
