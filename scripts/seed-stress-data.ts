import { Client } from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Configuration
const CASSANDRA_HOST = process.env.CASSANDRA_HOST || process.argv[2] || 'localhost';
const CASSANDRA_DC = process.env.CASSANDRA_DC || 'dc1';
const CASSANDRA_KEYSPACE = process.env.CASSANDRA_KEYSPACE || 'discord_app';
const SERVER_COUNT = parseInt(process.env.SERVER_COUNT || process.argv[3] || '1000');

const client = new Client({
  contactPoints: [CASSANDRA_HOST],
  localDataCenter: CASSANDRA_DC,
  keyspace: CASSANDRA_KEYSPACE
});

async function seed() {
  try {
    console.log(`🔗 Connecting to Cassandra at: ${CASSANDRA_HOST}`);
    await client.connect();
    console.log(`✅ Connected!`);
    
    console.log(`🌱 Generating IDs for ${SERVER_COUNT} servers...`);
    
    const channels = [];
    const profileId = uuidv4(); // Shared profile for simplicity
  
    // We generate valid UUIDs so the stress test doesn't fail on type checks
    for (let i = 0; i < SERVER_COUNT; i++) {
      channels.push({
        serverId: uuidv4(),
        channelId: uuidv4(),
        memberId: uuidv4(),
        profileId: profileId
      });
    }

    // Write to disk
    fs.writeFileSync('stress-test-config.json', JSON.stringify(channels));
    
    console.log(`💾 Saved ${channels.length} targets to stress-test-config.json`);
    console.log('✅ Seeding configuration complete.');
    
    await client.shutdown();
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

seed();