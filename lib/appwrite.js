import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

export const appwriteConfig = {
  endpoint: "https://nyc.cloud.appwrite.io/v1",
  platform: "com.jsm.asabcorp",
  projectId: "6854922e0036a1e8dee6",
  storageId: "6854976e000db585d780",
  databaseId: "685494a1002f8417c2b2",
  userCollectionId: "685494cd001135a4d108",
  videoCollectionId: "685494f9001c3ccb2ba2",
  chatsCollectionId: "687b05170001d79853e1",
  messagesCollectionId: "687b06060030cdc17a80",
  groupsCollectionId: "687b0448001ac393a59e",
  chatReadsCollectionId: "687bc8b4003cd8c8935d", 
  commentsCollectionId: "68861f970015406a3ff2",
  postCollectionId: "68861f35001b5a7a28da",
  bookmarksCollectionId: "6880a1ec000c120c271c",
  notificationsCollectionId: "6889d903000dd865f451", // You'll need to create this collection
};

const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

export const account = new Account(client);
export const storage = new Storage(client)
export const avatars = new Avatars(client);
export const databases = new Databases(client);

// iOS Video URL Helper
export function getIOSCompatibleVideoUrl(videoUrl) {
  if (!videoUrl) return null;
  
  try {
    // Clean the URL and ensure it's properly formatted for iOS
    const url = new URL(videoUrl);
    
    // Remove any problematic parameters that might cause NSURLErrorDomain issues
    url.searchParams.delete('format');
    url.searchParams.delete('quality');
    url.searchParams.delete('mode');
    
    // Ensure the URL is clean and iOS-compatible
    const cleanUrl = url.toString();
    
    console.log('iOS Video URL:', cleanUrl);
    return cleanUrl;
  } catch (error) {
    console.error('Error processing video URL:', error);
    return videoUrl; // Return original if processing fails
  }
}

// File Extension Helper for Appwrite Compatibility
export function ensureAppwriteCompatibleFileName(fileName, fileType) {
  if (!fileName) return `file_${Date.now()}`;
  
  const baseName = fileName.split('.')[0];
  
  if (fileType === 'video' || fileType === 'video/mp4') {
    return `${baseName}.mp4`;
  } else if (fileType === 'image' || fileType === 'image/jpeg') {
    return `${baseName}.jpg`;
  } else if (fileType === 'image/png') {
    return `${baseName}.png`;
  }
  
  return fileName; // Return original if no specific handling needed
}

// Network connectivity helper
export async function checkNetworkConnectivity() {
  try {
    // Try multiple endpoints for better reliability
    const endpoints = [
      'https://nyc.cloud.appwrite.io/v1/health',
      'https://www.google.com',
      'https://httpbin.org/get'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log('Network connectivity confirmed via:', endpoint);
          return true;
        }
      } catch (error) {
        console.log(`Network check failed for ${endpoint}:`, error.message);
        continue; // Try next endpoint
      }
    }
    
    console.warn('All network connectivity checks failed');
    return false;
  } catch (error) {
    console.error('Network connectivity check failed:', error);
    return false;
  }
}

// Retry mechanism for network requests
export async function retryNetworkRequest(requestFn, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${maxRetries}`);
      const result = await requestFn();
      console.log(`Upload successful on attempt ${attempt}`);
      return result;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      // Don't retry for certain types of errors
      if (error.message.includes('extension not allowed') || 
          error.message.includes('File extension not allowed') ||
          error.message.includes('unauthorized') ||
          error.message.includes('Unauthorized')) {
        throw error; // Don't retry these errors
      }
      
      if (attempt === maxRetries) {
        console.error(`All ${maxRetries} attempts failed`);
        throw error;
      }
      
      // Wait before retrying with exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Register user
export async function createUser(email, password, username) {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      username
    );

    if (!newAccount) throw Error;
    try {
      await signOut();
    } catch (sessionError) {
      // It's okay if there's no active session
      console.log("No active session to delete:", sessionError.message);
    }

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`;
    console.log(avatarUrl, "Avatar URL");
    await signIn(email, password);

    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        accountId: newAccount.$id,
        email: email,
        username: username,
        avatar: avatarUrl,
      }
    );
    console.log("New user created:", newUser);
    return newUser;
  } catch (error) {
    console.log(error, "Error creating user");
    throw new Error(error);
  }
}

// Sign In
export async function signIn(email, password) {
  try {
    const session = await account.createEmailPasswordSession(email, password);

    return session;
  } catch (error) {
    throw new Error(error);
  }
}

// Get Account
export async function getAccount() {
  try {
    const currentAccount = await account.get();

    return currentAccount;
  } catch (error) {
    throw new Error(error);
  }
}

// Get Current User
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();
    if (!currentAccount) throw Error;

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (!currentUser) throw Error;

    return currentUser.documents[0];
  } catch (error) {
    console.log(error);
    return null;
  }
}

// Sign Out
export async function signOut() {
  try {
    const session = await account.deleteSession("current");
    return session;
  } catch (error) {
    throw new Error(error);
  }
}



// Upload File
export async function uploadFile(file, type) {
  if (!file) {
    console.log("No file provided for upload");
    return null;
  }

  console.log("Uploading file:", {
    name: file.name,
    size: file.size,
    type: type,
    mimeType: file.mimeType,
    uri: file.uri ? 'present' : 'missing' // Don't log full URI for security
  });

  // Handle iOS file structure - ensure mimeType is properly set
  const mimeType = file.mimeType || file.type;
  const { mimeType: _, ...rest } = file;
  
  // Ensure Appwrite-compatible file name
  const compatibleFileName = ensureAppwriteCompatibleFileName(file.name, mimeType);
  
  // For iOS videos, ensure proper MIME type
  let finalMimeType = mimeType;
  if (type === 'video' && mimeType && mimeType.includes('mov')) {
    finalMimeType = 'video/mp4'; // Force MP4 for iOS compatibility
  }
  
  const asset = { 
    type: finalMimeType, 
    name: compatibleFileName,
    ...rest 
  };
  console.log(asset , 'asset')
  
  // Proceed directly with upload - retry mechanism will handle network issues
  console.log('Starting file upload with retry mechanism...');
  
  try {
    const uploadedFile = await retryNetworkRequest(async () => {
      return await storage.createFile(
        appwriteConfig.storageId,
        ID.unique(),
        asset
      );
    });
    console.log(uploadedFile,"uploadedFile")
    console.log("File uploaded successfully:", uploadedFile.$id);

    if (type === 'image' || type === 'video') {
      const fileUrl = await getFilePreview(uploadedFile.$id, type);
      console.log("File URL generated:", fileUrl);
      return fileUrl;
    } else if (type === 'document' || type === 'audio') {
      // Return direct file view URL for documents and audio
      const fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${uploadedFile.$id}/view?project=${appwriteConfig.projectId}`;
      console.log("Document/Audio file URL generated:", fileUrl);
      return fileUrl;
    } else {
      throw new Error('Unsupported file type for uploadFile');
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      type: error.type,
      response: error.response
    });
    
    // Provide more specific error messages for common iOS issues
    if (error.message.includes('permission')) {
      throw new Error('Permission denied. Please check your app permissions in Settings.');
    } else if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('Network request failed')) {
      throw new Error('Network error. Please check your internet connection and try again. If the problem persists, try restarting the app.');
    } else if (error.message.includes('size') || error.message.includes('too large')) {
      throw new Error('File too large. Please select a smaller video file.');
    } else if (error.message.includes('format') || error.message.includes('type')) {
      throw new Error('Unsupported file format. Please select a valid video file.');
    } else if (error.message.includes('extension not allowed') || error.message.includes('File extension not allowed')) {
      throw new Error('File extension not supported. Please try recording the video again or select a different video file.');
    } else if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      throw new Error('Authentication error. Please log out and log back in.');
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      throw new Error('Storage limit reached. Please contact support.');
    }
    
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

// Get File Preview
export async function getFilePreview(fileId, type) {
  try {
    console.log("Getting file preview for:", fileId, "type:", type);
    
    let fileUrl;

    if (type === "video") {
      // For videos, construct direct URL with iOS-compatible parameters
      // Try multiple URL formats for better iOS compatibility
      const baseUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${fileId}`;
      fileUrl = `${baseUrl}/view?project=${appwriteConfig.projectId}`;
      console.log("Video URL generated:", fileUrl);
    } else if (type === "image") {
      // For images, construct preview URL
      fileUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${fileId}/preview?width=2000&height=2000&gravity=top&quality=100&project=${appwriteConfig.projectId}`;
      console.log("Image URL generated:", fileUrl);
    } else {
      throw new Error("Invalid file type");
    }

    if (!fileUrl) {
      console.log("No file URL generated");
      throw new Error("No file URL generated");
    }

    console.log("Final file URL:", fileUrl);
    return fileUrl;
  } catch (error) {
    console.error("Error in getFilePreview:", error);
    console.error("Error details:", {
      fileId,
      type,
      storageId: appwriteConfig.storageId,
      error: error.message
    });
    throw new Error(`Failed to get file preview: ${error.message}`);
  }
}


// Create Video Post
export async function createVideoPost(form) {
  try {
    console.log("Creating video post with form:", {
      title: form.title,
      prompt: form.prompt,
      userId: form.userId,
      hasThumbnail: !!form.thumbnail,
      hasVideo: !!form.video
    });

    let thumbnailUrl = null;
    let videoUrl = null;

    // Upload video first
    videoUrl = await uploadFile(form.video, "video");
    
    // Only upload thumbnail if it exists
    if (form.thumbnail) {
      thumbnailUrl = await uploadFile(form.thumbnail, "image");
    } else {
      // Create a default thumbnail or use video URL as thumbnail
      thumbnailUrl = videoUrl; // Use video URL as thumbnail for now
    }

    console.log("Uploaded URLs:", {
      thumbnailUrl,
      videoUrl
    });

    if (!videoUrl) {
      throw new Error("Failed to upload video");
    }

    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      ID.unique(),
      {
        title: form.title,
        thumbnail: thumbnailUrl,
        video: videoUrl,
        prompt: form.prompt,
        creator: form.userId,
      }
    );

    console.log("Video post created successfully:", newPost.$id);
    return newPost;
  } catch (error) {
    console.error("Error creating video post:", error);
    throw new Error(`Failed to create video post: ${error.message}`);
  }
}

// Get all video Posts
export async function getAllPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId
    );

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

// Get video posts created by user
export async function getUserPosts(userId) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      [Query.equal("creator", userId)]
    );

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

// Get video by ID
export async function getVideoById(videoId) {
  try {
    console.log('Fetching video by ID:', videoId);
    
    const video = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      videoId
    );

    console.log('Fetched video data:', video);
    return video;
  } catch (error) {
    console.error('Error fetching video by ID:', error);
    throw new Error(`Failed to fetch video: ${error.message}`);
  }
}

// Get video posts that matches search query
export async function searchPosts(query) {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      [Query.search("title", query)]
    );

    if (!posts) throw new Error("Something went wrong");

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

// Get latest created video posts
export async function getLatestPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(7)]
    );

    return posts.documents;
  } catch (error) {
    throw new Error(error);
  }
}

// Get posts from users that the current user follows
export async function getFollowingPosts(userId) {
  try {
    // Get the current user's following list
    const currentUser = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );
    
    const followingIds = currentUser.following || [];
    
    if (followingIds.length === 0) {
      return [];
    }
    
    // Get posts from all followed users using Query.equal for each user ID
    const allPosts = [];
    for (const followingId of followingIds) {
      try {
        const userPosts = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.videoCollectionId,
          [Query.equal("creator", followingId)]
        );
        allPosts.push(...userPosts.documents);
      } catch (error) {
        console.error(`Error fetching posts for user ${followingId}:`, error);
      }
    }
    
    // Sort by creation date (newest first)
    return allPosts.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
  } catch (error) {
    console.error("Error getting following posts:", error);
    return [];
  }
}

// Add bookmark
export async function addBookmark(userId, videoId, videoData) {
  try {
    // Create a very compact string representation
    const title = (videoData?.title || '').substring(0, 15);
    const creator = (videoData?.creator || '').substring(0, 10);
    
    // Create a minimal JSON string
    const compactVideoData = JSON.stringify({
      t: title,
      c: creator
    });

    console.log("Creating bookmark with data:", {
      userId,
      videoId,
      compactVideoData,
      dataLength: compactVideoData.length
    });

    const bookmark = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.bookmarksCollectionId,
      ID.unique(),
      {
        userId: userId,
        postId: videoId,
        postData: compactVideoData,
        createdAt: new Date().toISOString(),
      }
    );

    console.log("Bookmark added successfully:", bookmark.$id);
    console.log("Stored data:", compactVideoData);
    return bookmark;
  } catch (error) {
    console.error("Error adding bookmark:", error);
    throw new Error(`Failed to add bookmark: ${error.message}`);
  }
}

// Remove bookmark
export async function removeBookmark(bookmarkId) {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.bookmarksCollectionId,
      bookmarkId
    );

    console.log("Bookmark removed successfully");
    return true;
  } catch (error) {
    console.error("Error removing bookmark:", error);
    throw new Error(`Failed to remove bookmark: ${error.message}`);
  }
}

// Get user bookmarks
export async function getUserBookmarks(userId) {
  try {
    console.log('=== getUserBookmarks called ===');
    console.log('Fetching bookmarks for userId:', userId);
    console.log('Collection ID:', appwriteConfig.bookmarksCollectionId);
    console.log('Database ID:', appwriteConfig.databaseId);
    
    const bookmarks = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.bookmarksCollectionId,
      [Query.equal("userId", userId)]
    );

    console.log('Raw bookmarks from database:', bookmarks.documents);
    console.log('Total documents found:', bookmarks.documents.length);

    // Filter out bookmarks with invalid data and log for debugging
    const validBookmarks = bookmarks.documents.filter(bookmark => {
      console.log('Processing bookmark:', {
        id: bookmark.$id,
        userId: bookmark.userId,
        postId: bookmark.postId,
        postData: bookmark.postData,
        postDataLength: bookmark.postData?.length || 0
      });
      
      if (!bookmark.postData || bookmark.postData.trim() === '') {
        console.log('Found bookmark with empty postData:', bookmark.$id);
        return false; // Remove bookmarks with empty data
      }
      
      try {
        const parsed = JSON.parse(bookmark.postData);
        console.log('Successfully parsed bookmark data:', parsed);
        // Check if the parsed data has the expected structure (support both old and new format)
        if (parsed && typeof parsed === 'object' && (parsed.title || parsed.creator || parsed.thumbnail || parsed.t || parsed.c)) {
          console.log('Bookmark is valid:', bookmark.$id);
          return true; // Keep valid bookmarks
        } else {
          console.log('Found bookmark with invalid structure:', bookmark.$id, parsed);
          return false;
        }
      } catch (error) {
        console.log('Found bookmark with invalid JSON:', bookmark.$id, bookmark.postData);
        console.log('JSON parse error:', error.message);
        return false; // Remove bookmarks with invalid JSON
      }
    });

    console.log(`Found ${bookmarks.documents.length} total bookmarks, ${validBookmarks.length} valid`);
    console.log('=== getUserBookmarks completed ===');
    return validBookmarks;
  } catch (error) {
    console.error("=== Error in getUserBookmarks ===");
    console.error("Error fetching bookmarks:", error);
    console.error("Error details:", {
      userId,
      collectionId: appwriteConfig.bookmarksCollectionId,
      databaseId: appwriteConfig.databaseId,
      errorMessage: error.message,
      errorCode: error.code
    });
    return [];
  }
}

// Check if video is bookmarked
export async function isVideoBookmarked(userId, videoId) {
  try {
    const bookmarks = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.bookmarksCollectionId,
      [
        Query.equal("userId", userId),
        Query.equal("postId", videoId)
      ]
    );

    return bookmarks.documents.length > 0;
  } catch (error) {
    console.error("Error checking bookmark status:", error);
    return false;
  }
}

// Toggle bookmark (add or remove)
export async function toggleBookmark(userId, videoId, videoData) {
  try {
    const isBookmarked = await isVideoBookmarked(userId, videoId);
    
    if (isBookmarked) {
      // Remove bookmark
      const bookmarks = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.bookmarksCollectionId,
        [
          Query.equal("userId", userId),
          Query.equal("postId", videoId)
        ]
      );
      
      if (bookmarks.documents.length > 0) {
        await databases.deleteDocument(
          appwriteConfig.databaseId,
          appwriteConfig.bookmarksCollectionId,
          bookmarks.documents[0].$id
        );
      }
      return false; // Bookmark removed
    } else {
      // Add bookmark
      await addBookmark(userId, videoId, videoData);
      return true; // Bookmark added
    }
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    throw new Error(`Failed to toggle bookmark: ${error.message}`);
  }
}

// Get share count for a video
export async function getShareCount(videoId) {
  try {
    const video = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      videoId
    );
    
    // Return shares count if field exists, otherwise return 0
    return video.shares || 0;
  } catch (error) {
    console.error("Error getting share count:", error);
    return 0;
  }
}

// Increment share count for a video
export async function incrementShareCount(videoId) {
  try {
    const video = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.videoCollectionId,
      videoId
    );
    
    // Check if shares field exists, if not, create it
    const currentShares = video.shares || 0;
    const newShares = currentShares + 1;
    
    // Try to update with shares field
    try {
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.videoCollectionId,
        videoId,
        { shares: newShares }
      );
    } catch (updateError) {
      // If shares field doesn't exist in schema, just log the share action
      console.log(`Share action recorded for video ${videoId} (shares field not in schema)`);
      return currentShares + 1; // Return incremented count even if we can't save it
    }
    
    return newShares;
  } catch (error) {
    console.error("Error incrementing share count:", error);
    // Don't throw error, just log it since sharing itself was successful
    console.log(`Share action recorded for video ${videoId} (error: ${error.message})`);
    return 1; // Return 1 to indicate a share was attempted
  }
}

// Update user profile (username, avatar, and privacy settings)
export async function updateUserProfile(userId, newUsername, newAvatar, isPrivate = false) {
  try {
    const updateData = {
      username: newUsername,
      avatar: newAvatar,
      isPrivate: isPrivate, // Re-enabled now that field exists in schema
    };
    
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      updateData
    );
    console.log("User profile updated:", updatedUser);
    return updatedUser;
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw new Error("Failed to update profile: " + error.message);
  }
}

// Handle profile access request
export async function handleProfileAccessRequest(profileUserId, requestingUserId, action) {
  try {
    const profileUser = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      profileUserId
    );

    let updatedAllowedViewers = profileUser.allowedViewers || [];
    let updatedPendingRequests = profileUser.pendingRequests || [];

    if (action === 'approve') {
      // Add to allowed viewers and remove from pending requests
      if (!updatedAllowedViewers.includes(requestingUserId)) {
        updatedAllowedViewers.push(requestingUserId);
      }
      updatedPendingRequests = updatedPendingRequests.filter(id => id !== requestingUserId);
    } else if (action === 'deny') {
      // Remove from pending requests
      updatedPendingRequests = updatedPendingRequests.filter(id => id !== requestingUserId);
    }

    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      profileUserId,
      {
        allowedViewers: updatedAllowedViewers,
        pendingRequests: updatedPendingRequests,
      }
    );

    console.log("Profile access request handled:", action);
    return updatedUser;
  } catch (error) {
    console.error("Error handling profile access request:", error);
    throw new Error("Failed to handle access request: " + error.message);
  }
}

// Like or unlike a post
export async function toggleLikePost(postId, userId) {
  const post = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.postCollectionId, postId);
    let likes = post.likes || [];
    const wasLiked = likes.includes(userId);
    if (wasLiked) {
      likes = likes.filter(id => id !== userId);
    } else {
      likes.push(userId);
    // Create notification for like
    if (post.creator !== userId) {
      try {
        await createNotification('like', userId, post.creator, postId);
  } catch (error) {
        console.error('Error creating like notification:', error);
      }
    }
  }
  return databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.postCollectionId, postId, { likes });
}

// Get users who liked a post
export async function getPostLikes(postId) {
  const post = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.postCollectionId, postId);
    return post.likes || [];
}

// Add a comment to a post (with username and avatar)
export async function addComment(postId, userId, content) {
  try {
    console.log('addComment called', { postId, userId, content });
    // Fetch user info
    const user = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, userId);
    console.log('Fetched user:', user);
    const comment = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.commentsCollectionId,
      'unique()',
      {
        postId,
        userId,
        username: user.username || '',
        avatar: user.avatar || '',
        content,
        createdAt: new Date().toISOString(),
      }
    );
    console.log('Created comment:', comment);
    
    // Get post creator to send notification
    // Try to find the post in both video and post collections
    let post = null;
    let postCreator = null;
    
    try {
      // First try the video collection
      post = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.videoCollectionId, postId);
      postCreator = post.creator;
    } catch (videoError) {
      try {
        // If not found in video collection, try the post collection
        post = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.postCollectionId, postId);
        postCreator = post.creator;
      } catch (postError) {
        console.log('Post not found in either collection:', postId);
        // Don't throw error, just skip notification
        return comment;
      }
    }
    
    if (postCreator && postCreator !== userId) {
      try {
        await createNotification('comment', userId, postCreator, postId);
      } catch (error) {
        console.error('Error creating comment notification:', error);
      }
    }
    
    return comment;
  } catch (error) {
    console.log('addComment error:', error);
    throw error;
  }
}

// Get comments for a post
export async function getComments(postId) {
  const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.commentsCollectionId,
        [Query.equal('postId', postId), Query.orderDesc('createdAt')]
    );
    return res.documents;
}

// Follow or unfollow a user
export async function toggleFollowUser(currentUserId, targetUserId) {
  // Get both user docs
  const currentUser = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, currentUserId);
  const targetUser = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, targetUserId);
  let following = currentUser.following || [];
  let followers = targetUser.followers || [];
  let isFollowing = following.includes(targetUserId);
  if (isFollowing) {
    following = following.filter(id => id !== targetUserId);
    followers = followers.filter(id => id !== currentUserId);
  } else {
    following.push(targetUserId);
    followers.push(currentUserId);
    // Create notification for new follower
    try {
      await createNotification('follow', currentUserId, targetUserId);
    } catch (error) {
      console.error('Error creating follow notification:', error);
    }
  }
  await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, currentUserId, { following });
  await databases.updateDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, targetUserId, { followers });
  return { following, followers };
}

// Get followers of a user with complete user details
export async function getFollowers(userId) {
  try {
    const user = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, userId);
    const followerIds = user.followers || [];
    
    // Fetch complete user details for each follower
    const followers = [];
    for (const followerId of followerIds) {
      try {
        const follower = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, followerId);
        followers.push({
          $id: follower.$id,
          username: follower.username,
          avatar: follower.avatar,
          email: follower.email
        });
      } catch (error) {
        console.error("Error fetching follower details:", error);
      }
    }
    
    return followers;
  } catch (error) {
    console.error("Error getting followers:", error);
    return [];
  }
}

// Get following of a user with complete user details
export async function getFollowing(userId) {
  try {
    const user = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, userId);
    const followingIds = user.following || [];
    
    // Fetch complete user details for each following
    const following = [];
    for (const followingId of followingIds) {
      try {
        const followingUser = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, followingId);
        following.push({
          $id: followingUser.$id,
          username: followingUser.username,
          avatar: followingUser.avatar,
          email: followingUser.email
        });
      } catch (error) {
        console.error("Error fetching following details:", error);
      }
    }
    
    return following;
  } catch (error) {
    console.error("Error getting following:", error);
    return [];
  }
}

// Sum all likes for a user's posts
export async function getUserLikesCount(userId) {
    const res = await databases.listDocuments(
      appwriteConfig.databaseId,
    appwriteConfig.postCollectionId,
      [Query.equal('creator', userId)]
    );
    let totalLikes = 0;
    for (const post of res.documents) {
      if (Array.isArray(post.likes)) {
        totalLikes += post.likes.length;
      }
    }
    return totalLikes;
}

// Notification functions
export async function createNotification(type, fromUserId, targetUserId, postId = null) {
  try {
    // Get user details
    const fromUser = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      fromUserId
    );

    // Handle avatar URL length limitation
    let avatarField = '';
    if (fromUser.avatar) {
      // If avatar URL is too long, store just the file ID or truncate
      if (fromUser.avatar.length > 100) {
        // Try to extract file ID from the URL
        const fileIdMatch = fromUser.avatar.match(/\/files\/([^\/\?]+)/);
        if (fileIdMatch) {
          avatarField = fileIdMatch[1]; // Store just the file ID
        } else {
          // If we can't extract file ID, truncate the URL
          avatarField = fromUser.avatar.substring(0, 97) + '...';
        }
      } else {
        avatarField = fromUser.avatar;
      }
    }

    const notification = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      'unique()',
      {
        type,
        fromUserId,
        fromUsername: fromUser.username,
        fromUserAvatar: avatarField,
        targetUserId,
        postId,
        isRead: false,
        createdAt: new Date().toISOString(),
      }
    );

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      notificationId,
      {
        isRead: true,
      }
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function getNotifications(userId) {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.notificationsCollectionId,
      [
        Query.equal('targetUserId', userId),
        Query.orderDesc('createdAt'),
      ]
    );
    return response.documents;
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
}

// Recently watched videos functions
export async function addToRecentlyWatched(userId, videoId) {
  try {
    console.log(`Adding video ${videoId} to recently watched for user ${userId}`);
    
    // Get the user document directly using userId
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    // Check if recentlyWatched attribute exists, if not create it
    let recentlyWatched = [];
    try {
      recentlyWatched = user.recentlyWatched || [];
      console.log('Current recently watched:', recentlyWatched);
    } catch (attrError) {
      // If attribute doesn't exist, start with empty array
      recentlyWatched = [];
      console.log('No recentlyWatched attribute found, starting with empty array');
    }
    
    // Remove if already exists to avoid duplicates
    recentlyWatched = recentlyWatched.filter(id => id !== videoId);
    
    // Add to beginning (most recent first)
    recentlyWatched.unshift(videoId);
    
    // Keep only last 10 videos
    if (recentlyWatched.length > 10) {
      recentlyWatched = recentlyWatched.slice(0, 10);
    }

    console.log('Updated recently watched list:', recentlyWatched);

    // Update user document
    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId,
      {
        recentlyWatched: recentlyWatched
      }
    );
    
    console.log(`Successfully added video ${videoId} to recently watched`);
  } catch (error) {
    console.error('Error adding to recently watched:', error);
    // Don't throw error to avoid breaking video playback
  }
}

export async function getRecentlyWatchedVideos(userId) {
  try {
    console.log(`Getting recently watched videos for user ${userId}`);
    
    // Get user's recently watched video IDs
    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    // Check if recentlyWatched attribute exists
    let recentlyWatchedIds = [];
    try {
      recentlyWatchedIds = user.recentlyWatched || [];
      console.log('Found recently watched IDs:', recentlyWatchedIds);
    } catch (attrError) {
      // If attribute doesn't exist, return empty array
      console.log('No recentlyWatched attribute found');
      return [];
    }
    
    if (recentlyWatchedIds.length === 0) {
      return [];
    }

    // Get the actual video documents and clean up invalid IDs
    const validVideos = [];
    const validVideoIds = [];
    
    for (const videoId of recentlyWatchedIds) {
      try {
        const video = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.postCollectionId,
          videoId
        );
        if (video) {
          validVideos.push(video);
          validVideoIds.push(videoId);
        }
      } catch (error) {
        console.error(`Error fetching video ${videoId}:`, error);
        // Skip invalid video IDs
      }
    }

    // Update the user's recentlyWatched array to remove invalid IDs
    if (validVideoIds.length !== recentlyWatchedIds.length) {
      try {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          userId,
          {
            recentlyWatched: validVideoIds
          }
        );
        console.log(`Cleaned up recently watched list. Removed ${recentlyWatchedIds.length - validVideoIds.length} invalid video IDs.`);
      } catch (updateError) {
        console.error('Error updating recently watched list:', updateError);
      }
    }

    console.log(`Returning ${validVideos.length} valid videos`);
    return validVideos;
  } catch (error) {
    console.error('Error getting recently watched videos:', error);
    return [];
  }
}


