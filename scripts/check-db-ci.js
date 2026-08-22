// Database connectivity check for CI pipeline
// Verifies MongoDB (in-memory or configured) is reachable

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI ;
const dbName = process.env.MONGODB_DB_NAME ;

console.log('🔍 Checking database connectivity...');
console.log(`   URI: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
console.log(`   Database: ${dbName}`);

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
});

try {
  await client.connect();
  await client.db(dbName).command({ ping: 1 });
  console.log('✅ Database connection successful');
  
  // List collections to verify access
  const collections = await client.db(dbName).listCollections().toArray();
  console.log(`   Collections: ${collections.map(c => c.name).join(', ') || '(empty)'}`);
  
  await client.close();
  process.exit(0);
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  process.exit(1);
}