// This file is separate and only used for Softwrd Mongodb cluster.
// Both clusters should be under the same file, but I am too lazy to do it right now.
const mongoose = require('mongoose');
require("dotenv").config(); // Getting all the environment variables.

// keep a cache of connections
const connections = {};

async function getConnection(dbName) {
  if (!connections[dbName]) {
    // build the connection URI however your setup needs
    const uri = process.env.SOFTWRD_MONGODB_URI;

    // createConnection uses its own internal pool
    const conn = mongoose.createConnection(uri, {
      useNewUrlParser:    true,
      useUnifiedTopology: true,
      // poolSize controls the max number of sockets in the pool
      maxPoolSize: 10,
    });

    // wait for it to open (or error)
    await new Promise((resolve, reject) => {
      conn.once('open',  () => resolve());
      conn.once('error', err => reject(err));
    });

    connections[dbName] = conn;
  }
  return connections[dbName];
}


async function aggregate(dbName, collectionName, pipeline) {
  const conn = await getConnection(dbName);
  const coll = conn.db.collection(collectionName);
  return coll.aggregate(pipeline).toArray();
}

module.exports = { aggregate };
