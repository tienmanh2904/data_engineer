import { Client, types } from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Configuration
const CASSANDRA_HOST = process.env.CASSANDRA_HOST || process.argv[2] || 'localhost';
const CASSANDRA_DC = process.env.CASSANDRA_DC || 'dc1';
const CASSANDRA_KEYSPACE = process.env.CASSANDRA_KEYSPACE || 'discord_app';
const TOTAL_MESSAGES = parseInt(process.env.TOTAL_MESSAGES || process.argv[3] || '1000000');
const CONCURRENCY_LIMIT = parseInt(process.env.CONCURRENCY || process.argv[4] || '2000');

console.log('------------------------------------------------');
console.log(`🎯 TARGET: ${CASSANDRA_HOST}`);
console.log(`📨 MESSAGES: ${TOTAL_MESSAGES.toLocaleString()}`);
console.log(`🌊 CONCURRENCY: ${CONCURRENCY_LIMIT}`);
console.log('------------------------------------------------');

const client = new Client({
  contactPoints: [CASSANDRA_HOST],
  localDataCenter: CASSANDRA_DC,
  keyspace: CASSANDRA_KEYSPACE,
  // CRITICAL FOR WAN TESTING: Increase timeouts
  socketOptions: {
    readTimeout: 12000,
    connectTimeout: 10000,
  },
  pooling: {
    maxRequestsPerConnection: 32768,
    coreConnectionsPerHost: {
      [0]: 2, 
      [1]: 2 
    }
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
    let completed = 0;
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

        // OPTIMIZATION: Use localOne consistency for WAN testing
        await client.batch(queries, { 
          prepare: true,
          consistency: types.consistencies.localOne 
        });
        
        completed++;
        if (completed % 5000 === 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = (completed / elapsed).toFixed(0);
          console.log(`   ... ${completed} written (${rate} msg/s) | Errors: ${errors}`);
        }
      } catch (err: any) {
        errors++;
        // Optional: Log sporadic errors if needed
        // console.error(err.message);
      }
    };

    // --- Sliding Window Pattern ---
    const activePromises = new Set();

    for (let i = 0; i < TOTAL_MESSAGES; i++) {
      const promise = writeMessage();
      activePromises.add(promise);

      // CRITICAL FIX: Use .finally() so errors don't hang the script
      promise.finally(() => activePromises.delete(promise));

      if (activePromises.size >= CONCURRENCY_LIMIT) {
        await Promise.race(activePromises);
      }
    }

    await Promise.all(activePromises);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📊 RESULTS:');
    console.log(`   Total Time: ${duration.toFixed(2)}s`);
    console.log(`   Throughput: ${(TOTAL_MESSAGES / duration).toFixed(0)} messages/sec`);
    console.log(`   Total Errors: ${errors}`);
    
    await client.shutdown();
  } catch (error) {
    console.error('\n❌ Fatal Error:', error);
    process.exit(1);
  }
}

run();