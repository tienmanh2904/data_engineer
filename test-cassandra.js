const { Client } = require('cassandra-driver');

const client = new Client({
  contactPoints: ['localhost'],
  localDataCenter: 'dc1',
  keyspace: 'discord_app'
});

async function test() {
  console.log('🔍 Testing Cassandra connection...\n');
  
  try {
    // Test basic connection
    await client.connect();
    console.log('✅ Connected to Cassandra cluster');
    
    // Test keyspace
    const keyspaceResult = await client.execute(
      "SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name = 'discord_app'"
    );
    
    if (keyspaceResult.rows.length > 0) {
      console.log('✅ Keyspace "discord_app" exists');
    } else {
      console.log('❌ Keyspace "discord_app" not found');
      await client.shutdown();
      return;
    }
    
    // List all tables
    const tablesResult = await client.execute(
      "SELECT table_name FROM system_schema.tables WHERE keyspace_name = 'discord_app'"
    );
    
    console.log(`✅ Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Test a simple query
    const testResult = await client.execute(
      'SELECT * FROM profiles_by_id LIMIT 1'
    );
    console.log('\n✅ Can execute queries successfully');
    console.log(`   Profiles in database: ${testResult.rows.length}`);
    
    console.log('\n🎉 All tests passed! Cassandra is ready to use.\n');
    
    await client.shutdown();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Cassandra connection failed:');
    console.error(`   Error: ${error.message}`);
    console.error('\n💡 Make sure Cassandra is running:');
    console.error('   docker-compose up -d');
    await client.shutdown();
    process.exit(1);
  }
}

test();
