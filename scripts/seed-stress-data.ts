import { Client } from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'; // 1. Import fs here

// Get Cassandra host from environment variable or command line argument
const CASSANDRA_HOST = process.env.CASSANDRA_HOST || process.argv[2] || 'localhost';
const CASSANDRA_DC = process.env.CASSANDRA_DC || 'dc1';
const CASSANDRA_KEYSPACE = process.env.CASSANDRA_KEYSPACE || 'discord_app';

console.log(`🔗 Connecting to Cassandra at: ${CASSANDRA_HOST}`);
console.log(`📍 Data Center: ${CASSANDRA_DC}`);
console.log(`🗄️  Keyspace: ${CASSANDRA_KEYSPACE}`);

const client = new Client({
  contactPoints: [CASSANDRA_HOST],
  localDataCenter: CASSANDRA_DC,
  keyspace: CASSANDRA_KEYSPACE
});

const SERVER_COUNT = parseInt(process.env.SERVER_COUNT || process.argv[3] || '1000');

async function seed() {
  try {
    await client.connect();
    console.log(`✅ Connected to Cassandra successfully!`);
    console.log(`🌱 Seeding ${SERVER_COUNT} servers and channels...`);

    const channels = [];
    const profileId = uuidv4();
  
  console.time('Seeding');
  
  for (let i = 0; i < SERVER_COUNT; i++) {
    const serverId = uuidv4();
    const channelId = uuidv4();
    const memberId = uuidv4();

    channels.push({
      serverId,
      channelId,
      memberId,
      profileId
    });
  }

  console.timeEnd('Seeding');
  
  // 2. require('fs') is removed; we use the imported 'fs' variable
  fs.writeFileSync('stress-test-config.json', JSON.stringify(channels));
  
  console.log('✅ Config saved to stress-test-config.json');
  console.log(`📦 Generated ${channels.length} test targets`);
  await client.shutdown();
  console.log('👋 Disconnected from Cassandra');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    await client.shutdown();
    process.exit(1);
  }
}

console.log('\n📝 Usage:');
console.log('  ts-node seed-stress-data.ts [cassandra_host] [server_count]');
console.log('  OR set environment variables: CASSANDRA_HOST, SERVER_COUNT');
console.log('\nExamples:');
console.log('  ts-node seed-stress-data.ts 143.198.123.45');
console.log('  ts-node seed-stress-data.ts 143.198.123.45 2000');
console.log('  CASSANDRA_HOST=143.198.123.45 ts-node seed-stress-data.ts\n');

seed();