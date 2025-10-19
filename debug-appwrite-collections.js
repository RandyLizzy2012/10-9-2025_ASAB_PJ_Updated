// Debug script to check Appwrite collections
import { databases, appwriteConfig } from './lib/appwrite.js';

async function debugCollections() {
  console.log('🔍 Debugging Appwrite Collections...');
  console.log('Database ID:', appwriteConfig.databaseId);
  console.log('Live Streams Collection ID:', appwriteConfig.liveStreamsCollectionId);
  console.log('Live Comments Collection ID:', appwriteConfig.liveCommentsCollectionId);
  console.log('Live Reactions Collection ID:', appwriteConfig.liveReactionsCollectionId);
  
  // Test each collection
  const collections = [
    { name: 'Live Streams', id: appwriteConfig.liveStreamsCollectionId },
    { name: 'Live Comments', id: appwriteConfig.liveCommentsCollectionId },
    { name: 'Live Reactions', id: appwriteConfig.liveReactionsCollectionId }
  ];
  
  for (const collection of collections) {
    try {
      console.log(`\n✅ Testing ${collection.name} (${collection.id})...`);
      const result = await databases.listDocuments(
        appwriteConfig.databaseId,
        collection.id,
        []
      );
      console.log(`✅ ${collection.name} is working! Found ${result.documents.length} documents.`);
    } catch (error) {
      console.error(`❌ ${collection.name} failed:`, error.message);
      
      if (error.message.includes('Collection with the requested ID could not be found')) {
        console.log(`💡 Solution: Create collection with ID: ${collection.id}`);
      } else if (error.message.includes('unauthorized')) {
        console.log(`💡 Solution: Check collection permissions`);
      } else if (error.message.includes('Invalid query')) {
        console.log(`💡 Solution: Check collection attributes/schema`);
      }
    }
  }
  
  // List all collections in the database
  try {
    console.log('\n📋 All collections in your database:');
    const allCollections = await databases.listCollections(appwriteConfig.databaseId);
    allCollections.collections.forEach(col => {
      console.log(`- ${col.name} (ID: ${col.$id})`);
    });
  } catch (error) {
    console.error('❌ Could not list collections:', error.message);
  }
}

export default debugCollections;
