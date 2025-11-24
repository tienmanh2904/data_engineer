import { Client } from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Configuration
const client = new Client({
  contactPoints: ['localhost'],
  localDataCenter: 'dc1',
  keyspace: 'discord_app',
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

const TOTAL_MESSAGES = 1_000_000;
const CONCURRENCY_LIMIT = 2000; // Number of parallel requests

async function run() {
  // 1. Load targets
  const config = JSON.parse(fs.readFileSync('stress-test-config.json', 'utf-8'));
  
  await client.connect();
  console.log(`🚀 Starting Cassandra Stress Test: ${TOTAL_MESSAGES} messages`);
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
  
  await client.shutdown();
}

run().catch(console.error);