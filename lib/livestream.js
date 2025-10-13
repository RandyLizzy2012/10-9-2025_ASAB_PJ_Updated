import { ID, Query } from "react-native-appwrite";
import { databases, client, appwriteConfig } from "./appwrite";

// ================== LIVE STREAMING FUNCTIONS ==================

// Create a new live stream
export async function createLiveStream(userId, title, description, category) {
  try {
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

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
        thumbnail: user.avatar,
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

    console.log('Live stream ended:', streamId);
    return true;
  } catch (error) {
    console.error('Error ending live stream:', error);
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
    console.error('Error getting active live streams:', error);
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
    console.error('Error getting live stream:', error);
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
    console.error('Error joining live stream:', error);
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
    console.error('Error leaving live stream:', error);
    throw new Error(`Failed to leave live stream: ${error.message}`);
  }
}

// Add a live comment
export async function addLiveComment(streamId, userId, username, avatar, content) {
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
        createdAt: new Date().toISOString(),
      }
    );

    return comment;
  } catch (error) {
    console.error('Error adding live comment:', error);
    throw new Error(`Failed to add live comment: ${error.message}`);
  }
}

// Get live comments for a stream
export async function getLiveComments(streamId, limit = 50) {
  try {
    const comments = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.liveCommentsCollectionId,
      [
        Query.equal('streamId', streamId),
        Query.orderDesc('createdAt'),
        Query.limit(limit)
      ]
    );

    return comments.documents.reverse();
  } catch (error) {
    console.error('Error getting live comments:', error);
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
        createdAt: new Date().toISOString(),
      }
    );

    return reaction;
  } catch (error) {
    console.error('Error adding live reaction:', error);
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

// Subscribe to live stream updates using Appwrite Realtime
export function subscribeLiveStreamUpdates(streamId, callback) {
  try {
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.liveStreamsCollectionId}.documents.${streamId}`,
      callback
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to live stream updates:', error);
    return null;
  }
}

// Subscribe to live comments using Appwrite Realtime
export function subscribeLiveComments(streamId, callback) {
  try {
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.liveCommentsCollectionId}.documents`,
      (response) => {
        if (response.payload && response.payload.streamId === streamId) {
          callback(response);
        }
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to live comments:', error);
    return null;
  }
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

