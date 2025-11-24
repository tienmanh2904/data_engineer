import { MongoClient,UUID } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

interface MessageDocument {
  _id: string; // Explicitly overwrite the default ObjectId type
  channel_id: string;
  content: string;
  member_id: string;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
}
// Connection URL - assumes local default
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);

// Database Name
const dbName = 'discord_stress';

const TOTAL_MESSAGES = 1_000_000;
// We process in chunks to prevent Node.js memory issues, 
// simulating waves of concurrent users.
const CHUNK_SIZE = 5000; 

async function run() {
  // 1. Load the shared configuration so targets are identical to Cassandra test
  const config = JSON.parse(fs.readFileSync('stress-test-config.json', 'utf-8'));

  await client.connect();
  console.log('Connected successfully to MongoDB server');
  const db = client.db(dbName);
  const collection = db.collection<MessageDocument>('messages');

  // 2. Setup Indexes
  // Cassandra automatically indexes by Partition Key (channel_id).
  // To be fair, MongoDB must also maintain an index, otherwise reads would be impossible at scale.
  // These index updates add overhead to every write.
  console.log('Creating indexes...');
  await collection.createIndex({ channel_id: 1 });
  await collection.createIndex({ created_at: -1 });

  console.log(`🚀 Starting MongoDB Stress Test: ${TOTAL_MESSAGES} messages`);

  const startTime = Date.now();
  let completed = 0;

  // Helper to generate data
  const createMessage = () => {
    const target = config[Math.floor(Math.random() * config.length)];
    return {
      _id: new UUID(), // Using UUID string to match Cassandra format (MongoDB native is ObjectId)
      channel_id: target.channelId,
      content: "Stress test message content payload",
      member_id: target.memberId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted: false
    };
  };

  // 3. Execution Loop
  // We use insertOne in parallel to simulate distinct user requests.
  // (Using insertMany would be faster but less realistic for a chat app receiving live messages)
  for (let i = 0; i < TOTAL_MESSAGES; i += CHUNK_SIZE) {
    const promises = [];
    for (let j = 0; j < CHUNK_SIZE; j++) {
        promises.push(collection.insertOne(createMessage() as any));
    }
    await Promise.all(promises);
    
    completed += CHUNK_SIZE;
    if (completed % 50000 === 0) console.log(`   ... ${completed} messages written`);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n📊 MongoDB Results:');
  console.log(`   Total Time: ${duration.toFixed(2)}s`);
  console.log(`   Throughput: ${(TOTAL_MESSAGES / duration).toFixed(0)} messages/sec`);

  await client.close();
}

run().catch(console.error);