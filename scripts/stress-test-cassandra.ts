import { Client, types } from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Configuration
const CASSANDRA_HOST = process.env.CASSANDRA_HOST || process.argv[2] || 'localhost';
const CASSANDRA_DC = process.env.CASSANDRA_DC || 'dc1';
const CASSANDRA_KEYSPACE = process.env.CASSANDRA_KEYSPACE || 'discord_app';
const TOTAL_MESSAGES = parseInt(process.env.TOTAL_MESSAGES || process.argv[3] || '1000000');
const CONCURRENCY_LIMIT = parseInt(process.env.CONCURRENCY || process.argv[4] || '2000');

// --- CSV LOGGING SETUP ---
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_FILE = `benchmark-results-${TIMESTAMP}.csv`;
// Write Headers
fs.writeFileSync(LOG_FILE, 'Elapsed_Seconds,Total_Written,Instant_TPS,Average_TPS,Total_Errors\n');

console.log('------------------------------------------------');
console.log(`🎯 TARGET: ${CASSANDRA_HOST}`);
console.log(`📨 MESSAGES: ${TOTAL_MESSAGES.toLocaleString()}`);
console.log(`🌊 CONCURRENCY: ${CONCURRENCY_LIMIT}`);
console.log(`📝 LOG FILE: ${LOG_FILE}`);
console.log('------------------------------------------------');

const client = new Client({
  contactPoints: [CASSANDRA_HOST],
  localDataCenter: CASSANDRA_DC,
  keyspace: CASSANDRA_KEYSPACE,
  socketOptions: {
    readTimeout: 12000,
    connectTimeout: 10000,
  },
  pooling: {
    maxRequestsPerConnection: 32768,
    coreConnectionsPerHost: { [0]: 2, [1]: 2 }
  },
  isMetadataSyncEnabled: false 
});

async function run() {
  try {
    if (!fs.existsSync('stress-test-config.json')) {
      throw new Error('stress-test-config.json not found! Run seed script first.');
    }
    
    const config = JSON.parse(fs.readFileSync('stress-test-config.json', 'utf-8'));
    
    console.log('🔌 Connecting...');
    await client.connect();
    console.log('✅ Connected! Starting stress test...');

    const startTime = Date.now();
    let lastLogTime = startTime;
    let completed = 0;
    let lastCompleted = 0;
    let errors = 0;

    const writeMessage = async () => {
      try {
        const target = config[Math.floor(Math.random() * config.length)];
        const messageId = uuidv4();
        const now = new Date();

        const queries = [
          {
            query: 'INSERT INTO messages_by_id (id, content, file_url, member_id, channel_id, deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            params: [messageId, "Stress test message content payload", null, target.memberId, target.channelId, false, now, now]
          },
          {
            query: 'INSERT INTO messages_by_channel (channel_id, created_at, id, content, file_url, member_id, member_profile_id, member_profile_name, member_profile_image_url, member_role, deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            params: [target.channelId, now, messageId, "Stress test message content payload", null, target.memberId, target.profileId, "Tester", "http://img", "GUEST", false, now]
          }
        ];

        await client.batch(queries, { 
          prepare: true,
          consistency: types.consistencies.localOne 
        });
        
        completed++;
        
        // Log to CSV every 2000 messages (Small interval = smoother chart)
        if (completed % 2000 === 0) {
          const nowTime = Date.now();
          const totalElapsed = (nowTime - startTime) / 1000;
          
          // Calculate Instant Throughput (Speed since last log)
          const intervalSeconds = (nowTime - lastLogTime) / 1000;
          const messagesInInterval = completed - lastCompleted;
          const instantTPS = (messagesInInterval / intervalSeconds).toFixed(0);
          
          // Calculate Average Throughput (Speed since start)
          const averageTPS = (completed / totalElapsed).toFixed(0);

          // Write to CSV
          const csvRow = `${totalElapsed.toFixed(2)},${completed},${instantTPS},${averageTPS},${errors}\n`;
          fs.appendFileSync(LOG_FILE, csvRow);
          
          process.stdout.write(`\r   ... ${completed} written. Instant: ${instantTPS}/s | Avg: ${averageTPS}/s | Err: ${errors}   `);

          // Update tracking variables
          lastLogTime = nowTime;
          lastCompleted = completed;
        }
      } catch (err: any) {
        errors++;
      }
    };

    const activePromises = new Set();

    for (let i = 0; i < TOTAL_MESSAGES; i++) {
      const promise = writeMessage();
      activePromises.add(promise);
      promise.finally(() => activePromises.delete(promise));
      if (activePromises.size >= CONCURRENCY_LIMIT) await Promise.race(activePromises);
    }

    await Promise.all(activePromises);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n\n📊 RESULTS:');
    console.log(`   Total Time: ${duration.toFixed(2)}s`);
    console.log(`   Throughput: ${(TOTAL_MESSAGES / duration).toFixed(0)} messages/sec`);
    console.log(`   Data saved to: ${LOG_FILE}`);
    
    await client.shutdown();
  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  }
}

run();