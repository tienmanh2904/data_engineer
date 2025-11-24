import { Client } from 'cassandra-driver';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs'; // 1. Import fs here

const client = new Client({
  contactPoints: ['localhost'],
  localDataCenter: 'dc1',
  keyspace: 'discord_app'
});

const SERVER_COUNT = 1000;

async function seed() {
  await client.connect();
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
  await client.shutdown();
}

seed();