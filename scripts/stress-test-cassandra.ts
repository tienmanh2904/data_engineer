import { Client } from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Configuration from environment or command line
const CASSANDRA_HOST = process.env.CASSANDRA_HOST || process.argv[2] || 'localhost';
const CASSANDRA_DC = process.env.CASSANDRA_DC || 'dc1';
const CASSANDRA_KEYSPACE = process.env.CASSANDRA_KEYSPACE || 'discord_app';
const TOTAL_MESSAGES = parseInt(process.env.TOTAL_MESSAGES || process.argv[3] || '1000000');
const CONCURRENCY_LIMIT = parseInt(process.env.CONCURRENCY || process.argv[4] || '2000');

console.log('\n🎯 Stress Test Configuration:');
console.log(`   Cassandra Host: ${CASSANDRA_HOST}`);
console.log(`   Data Center: ${CASSANDRA_DC}`);
console.log(`   Keyspace: ${CASSANDRA_KEYSPACE}`);
console.log(`   Total Messages: ${TOTAL_MESSAGES.toLocaleString()}`);
console.log(`   Concurrency: ${CONCURRENCY_LIMIT}\n`);

const client = new Client({
  contactPoints: [CASSANDRA_HOST],
  localDataCenter: CASSANDRA_DC,
  keyspace: CASSANDRA_KEYSPACE,
  pooling: {
    // Increase connection pool to handle high concurrency
    maxRequestsPerConnection: 32768,
    coreConnectionsPerHost: {
      [0]: 2, // LOCAL
      [1]: 2  // REMOTE
    }
  },
  // Disable query tracing to save bandwidth during stress test
  isMetadataSyncEnabled: false 
});

async function run() {
  try {
    // 1. Load targets
    if (!fs.existsSync('stress-test-config.json')) {
      console.error('❌ Error: stress-test-config.json not found!');
      console.log('   Run seed-stress-data.ts first to generate test data.');
      process.exit(1);
    }
    
    const config = JSON.parse(fs.readFileSync('stress-test-config.json', 'utf-8'));
    
    console.log('🔌 Connecting to Cassandra...');
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    console.log(`🚀 Starting Cassandra Stress Test: ${TOTAL_MESSAGES.toLocaleString()} messages`);
    console.log(`   Target: Distributed across ${config.length} servers`);
    console.log(`   Concurrency: ${CONCURRENCY_LIMIT} parallel requests`);

  const startTime = Date.now();
  let completed = 0;

  // 2. Define the write operation
  const writeMessage = async () => {
    const target = config[Math.floor(Math.random() * config.length)];
    const messageId = uuidv4();
    const now = new Date();

    // We use a BATCH to ensure atomicity and efficiency
    // Ideally, prepared statements are prepared once, but the driver handles caching.
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

    await client.batch(queries, { prepare: true });
    
    completed++;
    if (completed % 50000 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (completed / elapsed).toFixed(0);
      console.log(`   ... ${completed} written (${rate} msg/s)`);
    }
  };

  // 3. Execution Loop (Sliding Window / Semaphore Pattern)
  // This maintains exactly CONCURRENCY_LIMIT active promises at all times.
  const activePromises = new Set();

  for (let i = 0; i < TOTAL_MESSAGES; i++) {
    const promise = writeMessage();
    
    // Add to pool
    activePromises.add(promise);

    // Clean up when finished
    promise.then(() => activePromises.delete(promise));

    // If pool is full, wait for the fastest one to finish
    if (activePromises.size >= CONCURRENCY_LIMIT) {
      await Promise.race(activePromises);
    }
  }

  // 4. Wait for remaining stragglers
  await Promise.all(activePromises);

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n📊 Cassandra Results:');
  console.log(`   Total Time: ${duration.toFixed(2)}s`);
  console.log(`   Throughput: ${(TOTAL_MESSAGES / duration).toFixed(0)} messages/sec`);
  console.log(`   Average Latency: ${(duration / TOTAL_MESSAGES * 1000).toFixed(2)}ms per message`);
  
  await client.shutdown();
  console.log('\n👋 Disconnected from Cassandra');
  } catch (error) {
    console.error('\n❌ Error during stress test:', error);
    await client.shutdown();
    process.exit(1);
  }
}

console.log('📝 Usage:');
console.log('  ts-node stress-test-cassandra.ts [cassandra_host] [total_messages] [concurrency]');
console.log('  OR set environment variables: CASSANDRA_HOST, TOTAL_MESSAGES, CONCURRENCY');
console.log('\nExamples:');
console.log('  ts-node stress-test-cassandra.ts 143.198.123.45');
console.log('  ts-node stress-test-cassandra.ts 143.198.123.45 500000 1000');
console.log('  CASSANDRA_HOST=143.198.123.45 TOTAL_MESSAGES=100000 ts-node stress-test-cassandra.ts\n');

run().catch(console.error);