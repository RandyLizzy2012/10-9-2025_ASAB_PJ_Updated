import { ID, Query } from "react-native-appwrite";
import { databases, client, appwriteConfig } from "./appwrite";

// Debug function to test collections
export async function debugCollections() {
  console.log('🔍 Debugging Appwrite Collections...');
  console.log('Database ID:', appwriteConfig.databaseId);
  console.log('Live Streams Collection ID:', appwriteConfig.liveStreamsCollectionId);
  
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
        console.log(`💡 Collection doesn't exist. Create it with ID: ${collection.id}`);
      } else if (error.message.includes('unauthorized')) {
        console.log(`💡 Permission issue. Check collection permissions.`);
      } else if (error.message.includes('Invalid query')) {
        console.log(`💡 Schema issue. Check collection attributes.`);
      } else if (error.message.includes('Attribute not found')) {
        console.log(`💡 Missing attribute in collection schema.`);
      }
    }
  }
  
  // Test creating a simple document
  try {
    console.log('\n🧪 Testing document creation...');
    const testDoc = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      ID.unique(),
      {
        hostId: 'test-user-id',
        hostUsername: 'Test User',
        hostAvatar: 'https://example.com/avatar.jpg',
        title: 'Test Stream',
        description: 'Test Description',
        category: 'Test',
        isLive: false,
        status: 'test',
        viewerCount: 0,
        startTime: new Date().toISOString()
      }
    );
    console.log('✅ Document creation test successful!');
    
    // Clean up test document
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      testDoc.$id
    );
    console.log('✅ Test document cleaned up.');
  } catch (error) {
    console.error('❌ Document creation test failed:', error.message);
  }
}

// ================== LIVE STREAMING FUNCTIONS ==================

// Create a new live stream
export async function createLiveStream(userId, title, description, category) {
  try {
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    // Truncate thumbnail URL if it's too long (for collections with 32 char limit)
    const thumbnail = user.avatar && user.avatar.length > 32 
      ? user.avatar.substring(0, 32) 
      : user.avatar || '';

    const liveStream = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      ID.unique(),
      {
        hostId: userId,
        hostUsername: user.username,
        hostAvatar: user.avatar,
        title: title,
        description: description || '',
        category: category || 'General',
        isLive: true,
        status: 'live',
        viewerCount: 0,
        startTime: new Date().toISOString(),
        thumbnail: thumbnail,
      }
    );

    console.log('Live stream created:', liveStream.$id);
    return liveStream;
  } catch (error) {
    console.error('Error creating live stream:', error);
    throw new Error(`Failed to create live stream: ${error.message}`);
  }
}

// End a live stream
export async function endLiveStream(streamId) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      streamId,
      {
        isLive: false,
        status: 'ended',
        endTime: new Date().toISOString(),
      }
    );

   
    return true;
  } catch (error) {
    
    throw new Error(`Failed to end live stream: ${error.message}`);
  }
}

// Get all active live streams
export async function getActiveLiveStreams() {
  try {
    const streams = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      [
        Query.equal('isLive', true),
        Query.orderDesc('startTime'),
        Query.limit(50)
      ]
    );

   
    return streams.documents;
  } catch (error) {
    
    // Check if it's a collection not found error
    if (error.message.includes('Collection with the requested ID could not be found')) {
     
      return [];
    }
    
    // Check if it's a database connection error
    if (error.message.includes('Database with the requested ID could not be found')) {
     
      return [];
    }
    
    return [];
  }
}

// Get live stream by ID
export async function getLiveStreamById(streamId) {
  try {
    const stream = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      streamId
    );

    return stream;
  } catch (error) {
   
    throw new Error(`Failed to get live stream: ${error.message}`);
  }
}

// Join a live stream (add viewer)
export async function joinLiveStream(streamId, userId) {
  try {
    const stream = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      streamId
    );

    // Simply increment viewer count (don't track individual viewers due to attribute limitations)
    const currentCount = stream.viewerCount || 0;
    
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      streamId,
      {
        viewerCount: currentCount + 1,
      }
    );

    return true;
  } catch (error) {
   
    throw new Error(`Failed to join live stream: ${error.message}`);
  }
}

// Leave a live stream (remove viewer)
export async function leaveLiveStream(streamId, userId) {
  try {
    const stream = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      streamId
    );

    // Simply decrement viewer count (don't track individual viewers due to attribute limitations)
    const currentCount = stream.viewerCount || 0;
    const newCount = Math.max(0, currentCount - 1); // Don't go below 0

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      streamId,
      {
        viewerCount: newCount,
      }
    );

    return true;
  } catch (error) {
   
    throw new Error(`Failed to leave live stream: ${error.message}`);
  }
}

// Add a live comment
export async function addLiveComment(streamId, userId, username, avatar, content) {
  // Validate streamId before proceeding
  if (!isValidStreamId(streamId)) {
   
    throw new Error('Invalid streamId provided');
  }

  try {
    const comment = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveCommentsCollectionId,
      ID.unique(),
      {
        streamId: streamId,
        userId: userId,
        username: username,
        avatar: avatar,
        content: content,
      }
    );

    return comment;
  } catch (error) {
   
    
    // Check if it's a collection not found error
    if (error.message.includes('Collection with the requested ID could not be found')) {
     
      throw new Error('Live comments collection not found. Please set up the database collections.');
    }
    
    throw new Error(`Failed to add live comment: ${error.message}`);
  }
}

// Get live comments for a stream
export async function getLiveComments(streamId, limit = 50) {
  // Validate streamId before proceeding
  if (!isValidStreamId(streamId)) {
   
    return [];
  }

  try {
    // Use fallback method directly - get all recent comments and filter client-side
   
    const allComments = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.liveCommentsCollectionId,
      [
        Query.orderDesc('$createdAt'),
        Query.limit(limit * 2) // Get more to account for filtering
      ]
    );
    
    // Filter comments by streamId on client side
    const filteredComments = allComments.documents.filter(comment => comment.streamId === streamId);
   
    return filteredComments.reverse();
  } catch (error) {
   
    return [];
  }
}

// Add a live reaction (emoji)
export async function addLiveReaction(streamId, userId, reactionType) {
  try {
    const reaction = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.liveReactionsCollectionId,
      ID.unique(),
      {
        streamId: streamId,
        userId: userId,
        reactionType: reactionType,
      }
    );

    return reaction;
  } catch (error) {
    
    throw new Error(`Failed to add live reaction: ${error.message}`);
  }
}

// Get user's live streams
export async function getUserLiveStreams(userId) {
  try {
    const streams = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.liveStreamsCollectionId,
      [
        Query.equal('hostId', userId),
        Query.orderDesc('startTime'),
        Query.limit(20)
      ]
    );

    return streams.documents;
  } catch (error) {
    console.error('Error getting user live streams:', error);
    return [];
  }
}

// Subscribe to live stream updates using polling (since realtime subscriptions are not working)
export function subscribeLiveStreamUpdates(streamId, callback) {
  let intervalId;
  
  const pollUpdates = async () => {
    try {
      const stream = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.liveStreamsCollectionId,
        streamId
      );
      
      if (stream) {
        callback({ payload: stream });
      }
    } catch (error) {
      console.error('Error polling stream updates:', error);
    }
  };
  
  // Poll every 3 seconds
  intervalId = setInterval(pollUpdates, 3000);
  
  // Return unsubscribe function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}

// Helper function to validate streamId
function isValidStreamId(streamId) {
  if (!streamId || typeof streamId !== 'string') {
    return false;
  }
  
  const trimmedId = streamId.trim();
  if (trimmedId === '' || trimmedId === 'null' || trimmedId === 'undefined') {
    return false;
  }
  
  // Check if it looks like a valid Appwrite document ID (16-24 characters, alphanumeric)
  if (trimmedId.length < 16 || trimmedId.length > 24 || !/^[a-zA-Z0-9]+$/.test(trimmedId)) {
    return false;
  }
  
  // Additional check: ensure it doesn't contain any special characters that might cause issues
  if (trimmedId.includes(' ') || trimmedId.includes('\n') || trimmedId.includes('\t')) {
    return false;
  }
  
  return true;
}

// Subscribe to live comments using polling (since realtime subscriptions are not working)
export function subscribeLiveComments(streamId, callback) {
  // Validate streamId before proceeding
  if (!isValidStreamId(streamId)) {
    console.error('Invalid streamId provided to subscribeLiveComments:', streamId);
    return () => {}; // Return empty unsubscribe function
  }

  let intervalId;
  let lastCommentTime = new Date().toISOString();
  let errorCount = 0;
  
  const pollComments = async () => {
    // Re-validate streamId on each poll to catch any changes
    if (!isValidStreamId(streamId)) {
      console.error('StreamId became invalid during polling:', streamId);
      return;
    }

    try {
      // Use fallback method directly - get all recent comments and filter client-side
      console.log('📡 Polling live comments using fallback method...');
      const allComments = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.liveCommentsCollectionId,
        [
          Query.orderDesc('$createdAt'),
          Query.limit(50)
        ]
      );
      
      // Filter comments for this stream and newer than last check
      const filteredComments = allComments.documents.filter(comment => {
        const isForThisStream = comment.streamId === streamId;
        const isNewer = new Date(comment.$createdAt) > new Date(lastCommentTime);
        return isForThisStream && isNewer;
      });

      if (filteredComments.length > 0) {
        console.log(`📨 Found ${filteredComments.length} new comments for stream ${streamId}`);
        filteredComments.forEach(comment => {
          callback({
            events: ['databases.*.collections.*.documents.*.create'],
            payload: comment
          });
        });
        
        // Update last comment time
        lastCommentTime = filteredComments[0].$createdAt;
      }
      
      // Reset error count on successful query
      errorCount = 0;
    } catch (error) {
      errorCount++;
      console.error(`Error polling live comments (attempt ${errorCount}):`, error);
      
      // If we get too many errors, stop polling
      if (errorCount > 5) {
        console.error('Too many errors, stopping comment polling');
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      }
    }
  };
  
  // Poll every 3 seconds to reduce load
  intervalId = setInterval(pollComments, 3000);
  
  // Return unsubscribe function
  return () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };
}



// ================== FOLLOW/SUBSCRIBE FUNCTIONS ==================

// Follow a streamer
export async function followStreamer(followerId, followingId, followingUsername) {
  try {
    // Check if already following
    const existing = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [
        Query.equal('followerId', followerId),
        Query.equal('followingId', followingId),
      ]
    );

    if (existing.documents.length > 0) {
      console.log('Already following this user');
      return existing.documents[0];
    }

    // Create follow relationship (store in user's following list)
    // Note: This is a simplified implementation. In production, you'd have a separate follows collection
    const follower = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      followerId
    );

    const currentFollowing = follower.following || [];
    const updatedFollowing = [...currentFollowing, followingId];

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      followerId,
      {
        following: updatedFollowing,
      }
    );

    console.log('Successfully followed user:', followingId);
    return { followerId, followingId, followingUsername };
  } catch (error) {
    console.error('Error following streamer:', error);
    throw new Error(`Failed to follow streamer: ${error.message}`);
  }
}

// Unfollow a streamer
export async function unfollowStreamer(followerId, followingId) {
  try {
    const follower = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      followerId
    );

    const currentFollowing = follower.following || [];
    const updatedFollowing = currentFollowing.filter(id => id !== followingId);

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      followerId,
      {
        following: updatedFollowing,
      }
    );

    console.log('Successfully unfollowed user:', followingId);
    return true;
  } catch (error) {
    console.error('Error unfollowing streamer:', error);
    throw new Error(`Failed to unfollow streamer: ${error.message}`);
  }
}

// Check if following a user
export async function isFollowing(followerId, followingId) {
  try {
    const follower = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      followerId
    );

    const following = follower.following || [];
    return following.includes(followingId);
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
}

// Get follower count
export async function getFollowerCount(userId) {
  try {
    // Count how many users have this userId in their following array
    const allUsers = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId
    );

    const followerCount = allUsers.documents.filter(user => {
      const following = user.following || [];
      return following.includes(userId);
    }).length;

    return followerCount;
  } catch (error) {
    console.error('Error getting follower count:', error);
    return 0;
  }
}

// Get following count
export async function getFollowingCount(userId) {
  try {
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    const following = user.following || [];
    return following.length;
  } catch (error) {
    console.error('Error getting following count:', error);
    return 0;
  }
}

