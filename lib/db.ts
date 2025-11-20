import { Client } from 'cassandra-driver';

// Connect to the Cassandra cluster
export const db = new Client({
  contactPoints: ['localhost'], // or 'cassandra-1' if running inside docker network
  localDataCenter: 'dc1',
  keyspace: 'discord_app'
});