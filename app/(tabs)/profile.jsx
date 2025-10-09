import React, { useState, useEffect, useRef, useCallback } from "react";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Image, FlatList, TouchableOpacity, Modal, Text, TextInput, Alert, Platform, ScrollView, ActivityIndicator, KeyboardAvoidingView, Share } from "react-native";
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";

import { icons } from "../../constants";
import useAppwrite from "../../lib/useAppwrite";
import { getUserPosts, signOut, updateUserProfile, uploadFile, handleProfileAccessRequest, getFollowers, getFollowing, getUserBookmarks, toggleLikePost, getComments, addComment, getPostLikes, toggleBookmark, isVideoBookmarked, getShareCount, incrementShareCount } from "../../lib/appwrite";
import { useGlobalContext } from "../../context/GlobalProvider";
import { EmptyState, InfoBox, VideoCard } from "../../components";
import { images } from "../../constants/images";

// Component to display pending request with user details
const PendingRequestItem = ({ requestingUserId, onApprove, onDeny }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const { databases } = await import('../../lib/appwrite');
        const { appwriteConfig } = await import('../../lib/appwrite');
        
        const user = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          requestingUserId
        );
        
        setUserData(user);
      } catch (error) {
       
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [requestingUserId]);

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#333", padding: 12, borderRadius: 8, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        {/* User Avatar */}
        <View style={{ 
          width: 32, 
          height: 32, 
          borderRadius: 16, 
          backgroundColor: "#4CAF50", 
          alignItems: "center", 
          justifyContent: "center",
          marginRight: 12,
          overflow: "hidden"
        }}>
          {userData?.avatar ? (
            <Image
              source={{ uri: userData.avatar }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: "#000", fontSize: 14, fontWeight: "bold" }}>
              {userData?.username ? userData.username.charAt(0).toUpperCase() : 'U'}
            </Text>
          )}
        </View>
        
        {/* User Info */}
        <View style={{ flex: 1 }}>
          {loading ? (
            <Text style={{ color: "#fff", fontSize: 14 }}>Loading...</Text>
          ) : (
            <>
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
                {userData?.username || 'Unknown User'}
              </Text>
              <Text style={{ color: "#ccc", fontSize: 12 }}>
                @{userData?.username || 'unknown'}
              </Text>
            </>
          )}
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TouchableOpacity onPress={onApprove} style={{ backgroundColor: "#4CAF50", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDeny} style={{ backgroundColor: "#f44336", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>Deny</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Profile = () => {
  const { user, setUser, setIsLogged } = useGlobalContext();
  const { data: posts } = useAppwrite(() => getUserPosts(user.$id), [user?.$id]);
  const { data: followers } = useAppwrite(() => getFollowers(user?.$id), [user?.$id]);
  const { data: following } = useAppwrite(() => getFollowing(user?.$id), [user?.$id]);
  const { data: bookmarks, loading: bookmarksLoading, error: bookmarksError, refetch: refetchBookmarks } = useAppwrite(() => {
   
    if (!user?.$id) {
    
      return Promise.resolve([]);
    }
    
    return getUserBookmarks(user.$id);
  }, [user?.$id]);
  
  // Debug: Log bookmarks hook data
  console.log('Bookmarks hook data:', {
    bookmarks,
    bookmarksLoading,
    bookmarksError,
    userId: user?.$id
  });

  // Refresh bookmarks when screen comes into focus (with debounce)
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      const timeSinceLastRefresh = now - lastRefreshTime;
      
      // Only refresh if it's been more than 2 seconds since last refresh
      if (timeSinceLastRefresh > 2000) {
       
        if (user?.$id && refetchBookmarks && !isRefreshingBookmarks) {
          setIsRefreshingBookmarks(true);
          refetchBookmarks().finally(() => {
            setIsRefreshingBookmarks(false);
            setLastRefreshTime(now);
          });
        }
      } else {
       
      }
    }, [user?.$id, refetchBookmarks, lastRefreshTime])
  );

  // Stop videos when profile loses focus
  useFocusEffect(
    useCallback(() => {
      // When profile gains focus, do nothing (videos can play)
      return () => {
        // When profile loses focus, stop all videos
        if (modalVideoRef.current) {
          modalVideoRef.current.pauseAsync();
        }
        setIsVideoPlaying(false);
        setModalVisible(false);
      };
    }, [])
  );

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [newAvatar, setNewAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // Re-enable privacy states
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);
  const [pendingRequests, setPendingRequests] = useState(user?.pendingRequests || []);

  // Video playback state
  const [playingVideo, setPlayingVideo] = useState(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  
  // TikTok-style video modal state
  const [modalVideo, setModalVideo] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const modalVideoRef = useRef(null);
  
  // Modal interaction states
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [likesList, setLikesList] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
    const [shareCount, setShareCount] = useState(0);
  
  // Bookmark videos state
  const [bookmarkVideos, setBookmarkVideos] = useState({});
  const [bookmarkVideosLoading, setBookmarkVideosLoading] = useState(false);
 
  // Following/Followers modal state
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [followModalType, setFollowModalType] = useState(''); // 'following' or 'followers'
  const [followModalData, setFollowModalData] = useState([]);

  // Profile section state
  const [activeSection, setActiveSection] = useState('videos'); // 'videos' or 'bookmarks'
  const [isRefreshingBookmarks, setIsRefreshingBookmarks] = useState(false);

  // Function to handle section change and refresh bookmarks if needed
  const handleSectionChange = (section) => {
    setActiveSection(section);
    // If switching to bookmarks, refresh the data only if not already on bookmarks
    if (section === 'bookmarks' && activeSection !== 'bookmarks' && user?.$id && refetchBookmarks && !isRefreshingBookmarks) {

      setIsRefreshingBookmarks(true);
      refetchBookmarks().finally(() => {
        setIsRefreshingBookmarks(false);
      });
    }
  };

  // Calculate total likes from all posts
  const totalLikes = posts?.reduce((total, post) => total + (post.likes?.length || 0), 0) || 0;

  const logout = async () => {
    await signOut();
    setUser(null);
    setIsLogged(false);
    router.replace("/sign-in");
  };

  const openEditModal = () => {
    setNewUsername(user?.username || "");
    setNewAvatar(user?.avatar || "");
    // Re-enable privacy states
    setIsPrivate(user?.isPrivate || false);
    setPendingRequests(user?.pendingRequests || []);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
  };

  const pickAvatarImage = async () => {
    try {
      setUploadingAvatar(true);
      
      // Request permissions
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Gallery permission is required to select avatar image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        aspect: [1, 1], // Square aspect ratio for avatar
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const fileName = selectedAsset.fileName || selectedAsset.name || selectedAsset.uri.split('/').pop() || `avatar_${Date.now()}.jpg`;
        const fileType = 'image/jpeg';
        const fileSize = selectedAsset.fileSize || selectedAsset.size;
        const file = {
          uri: selectedAsset.uri,
          name: fileName,
          type: fileType,
          size: fileSize,
        };
        
      
        
        // Upload image to Appwrite storage
        const avatarUrl = await uploadFile(file, "image");
        
        
        setNewAvatar(avatarUrl);
        Alert.alert("Success", "Avatar image uploaded successfully!");
      }
    } catch (error) {
     
      Alert.alert("Error", "Failed to upload avatar image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfileChanges = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }
    setSaving(true);
    try {
      // Re-enable isPrivate parameter
      const updatedUser = await updateUserProfile(user.$id, newUsername, newAvatar, isPrivate);
      setUser(updatedUser);
      Alert.alert("Success", "Profile updated successfully!");
      setEditModalVisible(false);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Re-enable access request handler
  const handleAccessRequest = async (requestingUserId, action) => {
    try {
      const updatedUser = await handleProfileAccessRequest(user.$id, requestingUserId, action);
      setUser(updatedUser);
      setPendingRequests(updatedUser.pendingRequests || []);
      Alert.alert("Success", `Request ${action === 'approve' ? 'approved' : 'denied'} successfully!`);
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to handle request");
    }
  };

  // Get user initials for avatar
  const getUserInitials = (username) => {
    if (!username) return "U";
    return username.split(' ').map(name => name.charAt(0).toUpperCase()).join('').slice(0, 2);
  };

  // Handle video playback with actual video player
  const handleVideoPress = async (post) => {
    try {
      // If this is a bookmark (has postId but no video), fetch the actual video data
      if (post.postId && !post.video) {
        
        
        // Import the function to get video by ID
        const { getVideoById } = await import('../../lib/appwrite');
        
        try {
          const videoData = await getVideoById(post.postId);
   
          
          // Create a complete post object with the fetched data
          const completePost = {
            $id: post.postId,
            title: videoData.title || post.title,
            video: videoData.video,
            thumbnail: videoData.thumbnail || post.thumbnail,
            creator: videoData.creator || post.creator
          };
          
          setPlayingVideo(completePost);
          setVideoModalVisible(true);
        } catch (error) {
          
          Alert.alert('Error', 'Could not load video data');
        }
      } else {
        // Regular post, play directly
        setPlayingVideo(post);
        setVideoModalVisible(true);
      }
    } catch (error) {
     
      Alert.alert('Error', 'Could not play video');
    }
  };

  const closeVideoModal = () => {
    setVideoModalVisible(false);
    setPlayingVideo(null);
  };

  // TikTok-style video modal functions
  const openVideoModal = (item, index) => {
  
    
    // Ensure we have the correct data structure
    const videoData = {
      ...item,
      thumbnail: item.thumbnail || 'https://via.placeholder.com/300x300',
      video: item.video,
      title: item.title || 'Untitled Video',
      creator: item.creator || { username: user?.username || 'Unknown' }
    };
    
    setModalVideo(videoData);
    setModalIndex(index);
    setModalVisible(true);
    setIsVideoPlaying(true);
  };

  const navigateToNextVideo = () => {
    if (modalIndex < posts.length - 1) {
      const nextVideo = posts[modalIndex + 1];
      setModalVideo(nextVideo);
      setModalIndex(modalIndex + 1);
      setIsVideoPlaying(true);
      // Reset modal states for new video
      setLiked(nextVideo.likes?.includes(user?.$id));
      setLikesCount(nextVideo.likes ? nextVideo.likes.length : 0);
      setCommentsCount(nextVideo.comments ? nextVideo.comments.length : 0);
      setBookmarked(false);
      setComments([]);
      setNewComment("");
    }
  };

  const navigateToPreviousVideo = () => {
    if (modalIndex > 0) {
      const prevVideo = posts[modalIndex - 1];
      setModalVideo(prevVideo);
      setModalIndex(modalIndex - 1);
      setIsVideoPlaying(true);
      // Reset modal states for new video
      setLiked(prevVideo.likes?.includes(user?.$id));
      setLikesCount(prevVideo.likes ? prevVideo.likes.length : 0);
      setCommentsCount(prevVideo.comments ? prevVideo.comments.length : 0);
      setBookmarked(false);
      setComments([]);
      setNewComment("");
    }
  };

  const onGestureEvent = (event) => {
    const { translationY } = event.nativeEvent;
    
    if (translationY > 50) {
      // Swipe down - go to previous video
      navigateToPreviousVideo();
    } else if (translationY < -50) {
      // Swipe up - go to next video
      navigateToNextVideo();
    }
  };

  const handleLike = async () => {
    if (!user?.$id || !modalVideo) return;
    setLiked((prev) => !prev);
    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
    try {
      await toggleLikePost(modalVideo.$id, user.$id);
    } catch {}
  };

  const handleBookmark = async () => {
    if (!user?.$id || !modalVideo) {
      Alert.alert("Error", "Please login to bookmark videos");
      return;
    }

    try {
      const videoData = {
        title: modalVideo.title,
        creator: modalVideo.creator.username,
        avatar: modalVideo.creator.avatar,
        thumbnail: modalVideo.thumbnail,
        video: modalVideo.video,
        videoId: modalVideo.$id
      };

      const newBookmarkStatus = await toggleBookmark(user.$id, modalVideo.$id, videoData);
      setBookmarked(newBookmarkStatus);
    } catch (error) {
     
      Alert.alert("Error", "Failed to bookmark video");
    }
  };

  const handleShare = async () => {
    if (!modalVideo) return;
    
    try {
      const result = await Share.share({
        message: `Check out this video: ${modalVideo.title} by ${modalVideo.creator.username}\n${modalVideo.video}`,
        title: modalVideo.title,
      });
      
      if (result.action === Share.sharedAction) {
        // Increment share count
        const newShareCount = await incrementShareCount(modalVideo.$id);
        setShareCount(newShareCount);
        
      }
    } catch (error) {
     
      Alert.alert("Error", "Failed to share video");
    }
  };

  const handleCommentPress = () => {
    setCommentsModalVisible(true);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.$id || !modalVideo) return;
    setPosting(true);
    try {
      const comment = await addComment(modalVideo.$id, user.$id, newComment.trim());
      setComments([comment, ...comments]);
      setNewComment("");
      setCommentsCount((prev) => prev + 1);
    } catch {}
    setPosting(false);
  };

  const handleOpenLikesModal = () => {
    setLikesModalVisible(true);
  };

  const handleUserPress = (userId) => {
    setLikesModalVisible(false);
    if (userId && userId !== user?.$id) {
      router.push(`/profile/${userId}`);
    }
  };

  // Real-time follow toggle function
  const handleFollowToggle = async (targetUserId) => {
    if (!user?.$id || !targetUserId || user.$id === targetUserId) return;
    
    try {
      const { toggleFollowUser } = await import('../../lib/appwrite');
      await toggleFollowUser(user.$id, targetUserId);
      
      // Update local state immediately for real-time feedback
      // Refresh the follow modal data if it's currently open
      if (followModalVisible) {
        const { getFollowers, getFollowing } = await import('../../lib/appwrite');
        if (followModalType === 'followers') {
          const updatedFollowers = await getFollowers(user.$id);
          setFollowModalData(updatedFollowers || []);
        } else if (followModalType === 'following') {
          const updatedFollowing = await getFollowing(user.$id);
          setFollowModalData(updatedFollowing || []);
        }
      }
      
     
    } catch (error) {
      
      Alert.alert("Error", "Failed to update follow status");
    }
  };

  const formatCount = (count) => {
    if (!count || count === undefined || count === null) {
      return '0';
    }
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    } else if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  };

  // When modalVideo changes, set up like/comment state
  useEffect(() => {
    if (modalVideo) {
      setLiked(modalVideo.likes?.includes(user?.$id));
      setLikesCount(modalVideo.likes ? modalVideo.likes.length : 0);
      setBookmarked(false); // TODO: implement bookmark logic
      setCommentsCount(modalVideo.comments ? modalVideo.comments.length : 0);
    }
  }, [modalVideo, user]);

  // Comments logic for modal
  useEffect(() => {
    if (commentsModalVisible && modalVideo) {
      setLoadingComments(true);
      getComments(modalVideo.$id)
        .then((res) => setComments(res))
        .catch(() => setComments([]))
        .finally(() => setLoadingComments(false));
    }
  }, [commentsModalVisible, modalVideo]);

  // Likes list logic for modal
  useEffect(() => {
    if (likesModalVisible && modalVideo) {
      setLoadingLikes(true);
      getPostLikes(modalVideo.$id)
        .then(async (userIds) => {
          const users = await Promise.all(
            userIds.map(async (uid) => {
              try {
                const { databases, appwriteConfig } = await import('../../lib/appwrite');
                const u = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, uid);
                return { $id: u.$id, username: u.username, avatar: u.avatar };
              } catch {
                return { $id: uid, username: 'Unknown', avatar: images.profile };
              }
            })
          );
          setLikesList(users);
        })
        .catch(() => setLikesList([]))
        .finally(() => setLoadingLikes(false));
    }
  }, [likesModalVisible, modalVideo]);

  // Check bookmark status and share count when modal video changes
  useEffect(() => {
    if (modalVideo && user?.$id) {
      // Check bookmark status
      const checkBookmarkStatus = async () => {
        try {
          const isBookmarked = await isVideoBookmarked(user.$id, modalVideo.$id);
          setBookmarked(isBookmarked);
        } catch (error) {
          
        }
      };

      // Get share count
      const fetchShareCount = async () => {
        try {
          const shares = await getShareCount(modalVideo.$id);
          setShareCount(shares);
        } catch (error) {
          
        }
      };

      checkBookmarkStatus();
      fetchShareCount();
    }
  }, [modalVideo, user?.$id]);

  // Fetch bookmark videos when bookmarks change
  useEffect(() => {
    if (bookmarks && bookmarks.length > 0) {
      const fetchBookmarkVideos = async () => {
        // Check if we already have the data to prevent unnecessary fetches
        const bookmarkIds = bookmarks.map(b => b.$id).sort().join(',');
        const existingIds = Object.keys(bookmarkVideos).sort().join(',');
        
        if (bookmarkIds === existingIds && Object.keys(bookmarkVideos).length > 0) {
          
          return;
        }
        
        
        setBookmarkVideosLoading(true);
        const { getVideoById } = await import('../../lib/appwrite');
        const newBookmarkVideos = {};
        
        for (const bookmark of bookmarks) {
          if (bookmark.postId) {
            try {
              const videoData = await getVideoById(bookmark.postId);
              newBookmarkVideos[bookmark.$id] = {
                title: videoData.title || 'Bookmarked Video',
                thumbnail: videoData.thumbnail || 'https://via.placeholder.com/300x300',
                creator: videoData.creator || { username: 'Unknown' },
                video: videoData.video
              };
            } catch (error) {
              
              newBookmarkVideos[bookmark.$id] = {
                title: 'Bookmarked Video',
                thumbnail: 'https://via.placeholder.com/300x300',
                creator: { username: 'Unknown' },
                video: null
              };
            }
          }
        }
        
        setBookmarkVideos(newBookmarkVideos);
        setBookmarkVideosLoading(false);
      };
      
      fetchBookmarkVideos();
    }
  }, [bookmarks]);

  // Handle following/followers modal
  const openFollowModal = async (type) => {
    try {
      setFollowModalType(type);
      setFollowModalVisible(true);
      
      if (type === 'following') {
        setFollowModalData(following || []);
      } else if (type === 'followers') {
        setFollowModalData(followers || []);
      }
    } catch (error) {
      
    }
  };

  const closeFollowModal = () => {
    setFollowModalVisible(false);
    setFollowModalType('');
    setFollowModalData([]);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView className="flex-1">
        {/* Header with logout and menu */}
        <View className="flex-row justify-between items-center px-4 pt-4 pb-6">
          <TouchableOpacity onPress={logout}>
            <Image
              source={icons.logout}
              resizeMode="contain"
              className="w-6 h-6"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditModal}>
            <Image
              source={icons.menu}
              resizeMode="contain"
              className="w-6 h-6"
            />
          </TouchableOpacity>
        </View>

       {/* Profile Section */}
        <View className="items-center px-4 mb-8 mt-6">
          {/* Profile Picture */}
          <View className="w-20 h-20 border border-secondary items-center justify-center mb-4 rounded-lg">
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                className="w-[90%] h-[90%]"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-black text-xl font-bold">
                {getUserInitials(user?.username)}
              </Text>
            )}
          </View>

          {/* Username and Handle */}
          <Text className="text-white text-xl font-bold mb-1">
            {user?.username || "User"}
          </Text>
          <Text className="text-gray-400 text-sm mb-6">
            @{user?.username || "user"}
          </Text>

          {/* Statistics */}
          <View className="flex-row space-x-8 mb-6">
            <TouchableOpacity 
              className="items-center"
              onPress={() => openFollowModal('following')}
            >
              <Text className="text-white text-lg font-bold">{following?.length || 0}</Text>
              <Text className="text-gray-400 text-sm">Following</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="items-center"
              onPress={() => openFollowModal('followers')}
            >
              <Text className="text-white text-lg font-bold">{followers?.length || 0}</Text>
              <Text className="text-gray-400 text-sm">Followers</Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-white text-lg font-bold">{totalLikes}</Text>
              <Text className="text-gray-400 text-sm">Likes</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-4">
            <TouchableOpacity 
              onPress={() => router.push('/donation')}
              className="bg-green-500 px-6 py-3 rounded-lg flex-row items-center"
            >
              <Text className="text-white font-bold mr-2">💰</Text>
              <Text className="text-white font-bold">Support Me</Text>
            </TouchableOpacity>
          </View>
        </View>

                 {/* Section Tabs */}
         <View className="px-4 mb-4">
           <View className="flex-row bg-gray-800 rounded-lg p-1">
                           <TouchableOpacity 
                className={`flex-1 py-2 px-4 rounded-lg ${activeSection === 'videos' ? 'bg-primary' : 'bg-transparent'}`}
                onPress={() => handleSectionChange('videos')}
              >
                <Text className={`text-center font-medium ${activeSection === 'videos' ? 'text-white' : 'text-gray-400'}`}>
                  Videos
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className={`flex-1 py-2 px-4 rounded-lg ${activeSection === 'bookmarks' ? 'bg-primary' : 'bg-transparent'}`}
                onPress={() => handleSectionChange('bookmarks')}
              >
                <Text className={`text-center font-medium ${activeSection === 'bookmarks' ? 'text-white' : 'text-gray-400'}`}>
                  Bookmarks
                </Text>
              </TouchableOpacity>
           </View>
         </View>

                   {/* Videos Section */}
          {activeSection === 'videos' && (
            <View className="px-4 mb-8">
              <Text className="text-white text-lg font-semibold mb-4">Your Videos</Text>
              {posts && posts.length > 0 ? (
                <View className="flex-row flex-wrap justify-between gap-1">
                 
                  {posts.map((post, index) => (
                                         <TouchableOpacity 
                       key={post.$id}
                       className="w-[48%] aspect-square bg-gray-800 rounded-lg mb-3 overflow-hidden"
                       onPress={() => openVideoModal(post, index)}
                     >
                      <View className="relative w-full h-full">
                        {post.video ? (
                          <Video
                            source={{ uri: post.video }}
                            className="w-full h-full"
                            resizeMode="cover"
                            shouldPlay={false}
                            isMuted={true}
                            useNativeControls={false}
                            posterSource={post.thumbnail && !post.thumbnail.includes('placeholder') ? { uri: post.thumbnail } : undefined}
                          />
                        ) : (
                          <Image
                            source={{ uri: post.thumbnail || 'https://via.placeholder.com/300x300' }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        )}
                        {/* Play Icon */}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="items-center py-8">
                  <Text className="text-gray-400 text-center">No videos uploaded yet</Text>
                  <Text className="text-gray-500 text-sm text-center mt-2">Upload your first video to see it here</Text>
                </View>
              )}
            </View>
          )}

         {/* Bookmarks Section */}
         {activeSection === 'bookmarks' && (
           <View className="px-4 mb-8">
             <Text className="text-white text-lg font-semibold mb-4">Your Bookmarks</Text>
             {/* Debug: Log bookmarks data */}
             {console.log('Bookmarks data in profile:', {
               bookmarks: bookmarks,
               bookmarksLength: bookmarks?.length,
               bookmarksType: typeof bookmarks,
               activeSection: activeSection
             })}
                           {bookmarksLoading || isRefreshingBookmarks ? (
                <View className="items-center py-8">
                  <Text className="text-gray-400 text-center">
                    {isRefreshingBookmarks ? 'Refreshing bookmarks...' : 'Loading bookmarks...'}
                  </Text>
                </View>
              ) : bookmarksError ? (
               <View className="items-center py-8">
                 <Text className="text-gray-400 text-center">Error loading bookmarks</Text>
                 <Text className="text-gray-500 text-sm text-center mt-2">{bookmarksError.message}</Text>
               </View>
             ) : bookmarks && bookmarks.length > 0 ? (
               <View className="flex-row flex-wrap justify-between">
                                   {bookmarks.map((bookmark, index) => {
                    // Get the fetched video data for this bookmark
                    const videoData = bookmarkVideos[bookmark.$id] || {
                      title: 'Loading...',
                      thumbnail: 'https://via.placeholder.com/300x300',
                      creator: { username: 'Unknown' },
                      video: null
                    };
                    
                    return (
                                             <TouchableOpacity 
                         key={bookmark.$id}
                         className="w-[48%] aspect-square bg-gray-800 rounded-lg mb-3 overflow-hidden"
                         onPress={() => {
                           // For bookmarks, we need to fetch the actual video data first
                           if (bookmark.postId) {
                             // Import the function to get video by ID
                             import('../../lib/appwrite').then(({ getVideoById }) => {
                               getVideoById(bookmark.postId)
                                 .then((videoData) => {
                                   const completePost = {
                                     $id: bookmark.postId,
                                     title: videoData.title || videoData.title || 'Bookmarked Video',
                                     video: videoData.video,
                                    
                                     creator: videoData.creator || videoData.creator || { username: 'Unknown' }
                                   };
                                   openVideoModal(completePost, index);
                                 })
                                 .catch((error) => {
                                  
                                   Alert.alert('Error', 'Could not load bookmarked video');
                                 });
                             });
                           }
                         }}
                       >
                        <View className="relative w-full h-full">
                          {!bookmarkVideosLoading && videoData.video ? (
                            <Video
                              source={{ uri: videoData.video }}
                              className="w-full h-full"
                              resizeMode="cover"
                              shouldPlay={false}
                              isMuted={true}
                              useNativeControls={false}
                              posterSource={videoData.thumbnail && !videoData.thumbnail.includes('placeholder') ? { uri: videoData.thumbnail } : undefined}
                            />
                          ) : (
                            <Image
                              source={{ uri: videoData.thumbnail || 'https://via.placeholder.com/300x300' }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          )}
                          {/* Bookmark Icon */}
                          <View className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1">
                            <Text className="text-white text-xs">🔖</Text>
                          </View>
                                                    {/* Video Title Overlay */}
                        
                        </View>
                      </TouchableOpacity>
                    );
                  })}
               </View>
             ) : (
               <View className="items-center py-8">
                 <Text className="text-gray-400 text-center">No bookmarked videos yet</Text>
                 <Text className="text-gray-500 text-sm text-center mt-2">Bookmark videos to see them here</Text>
               </View>
             )}
           </View>
         )}

        {/* Pending Requests Section */}
        {isPrivate && pendingRequests && pendingRequests.length > 0 && (
          <View className="mx-4 mb-8 bg-secondary px-4 py-3 rounded-lg">
            <Text className="text-white font-semibold mb-2">🔒 Pending Access Requests ({pendingRequests.length})</Text>
            <Text className="text-gray-300 text-sm">You have pending requests to view your private profile</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(true)} className="mt-2 bg-primary px-4 py-2 rounded-lg self-start">
              <Text className="text-white font-medium text-sm">Manage Requests</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TikTok-style Video Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setModalVisible(false)}
          style={{ backgroundColor: '#000' }}
        >
          {modalVideo && (
            <GestureHandlerRootView style={{ flex: 1 }}>
              <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={(event) => {
                  if (event.nativeEvent.state === State.END) {
                    onGestureEvent(event);
                  }
                }}
              >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                  {/* Close Button */}
                  <TouchableOpacity onPress={() => setModalVisible(false)} style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}>
                    <Text style={{ color: '#fff', fontSize: 28 }}>×</Text>
                  </TouchableOpacity>
                  
                  {/* Video */}
                  <View style={{ flex: 1, backgroundColor: '#000', position: 'relative' }}>
                    <Video
                      ref={modalVideoRef}
                      source={{ uri: modalVideo.video }}
                      style={{ flex: 1, width: '100%', height: '100%' }}
                      resizeMode={ResizeMode.CONTAIN}
                      shouldPlay={isVideoPlaying}
                      isMuted={false}
                      useNativeControls={false}
                      posterSource={modalVideo.thumbnail && !modalVideo.thumbnail.includes('placeholder') ? { uri: modalVideo.thumbnail } : undefined}
                      onPlaybackStatusUpdate={status => {
                        
                        if (status.didJustFinish) setModalVisible(false);
                      }}
                      onError={(error) => {
                       
                      }}
                      onLoadStart={() => {
                       
                      }}
                      onLoad={() => {
                        
                      }}
                      onReadyForDisplay={() => {
                        
                      }}
                    />
                    
                    {/* Video Control Overlay */}
                    <TouchableOpacity
                      onPress={() => {
                        if (isVideoPlaying) {
                          modalVideoRef.current?.pauseAsync();
                          setIsVideoPlaying(false);
                        } else {
                          modalVideoRef.current?.playAsync();
                          setIsVideoPlaying(true);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        opacity: 0
                      }}
                      activeOpacity={1}
                    />
                    
                    {/* Play/Pause Button */}
                    <TouchableOpacity
                      onPress={() => {
                        if (isVideoPlaying) {
                          modalVideoRef.current?.pauseAsync();
                          setIsVideoPlaying(false);
                        } else {
                          modalVideoRef.current?.playAsync();
                          setIsVideoPlaying(true);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: [{ translateX: -25 }, { translateY: -25 }],
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 5
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 24 }}>
                        {isVideoPlaying ? '❚❚' : '▶'}
                      </Text>
                    </TouchableOpacity>
                    
                    {/* Fallback thumbnail if video doesn't load - only show if video fails to load */}
                    {modalVideo.thumbnail && (
                      <Image
                        source={{ uri: modalVideo.thumbnail }}
                        style={{ 
                          position: 'absolute', 
                          top: 0, 
                          left: 0, 
                          width: '100%', 
                          height: '100%',
                          opacity: 0.1
                        }}
                        resizeMode="cover"
                      />
                    )}
                  </View>
                  
                  {/* Right Side Interaction Buttons - TikTok Style */}
                  <View style={{ position: 'absolute', right: 15, bottom: 150, zIndex: 10 }}>
                    {/* Profile Picture - Above Like Button */}
                    <TouchableOpacity style={{ marginBottom: 15, alignItems: 'center' }}>
                      <View style={{ position: 'relative' }}>
                        <Image
                          source={{ uri: modalVideo.creator?.avatar || user?.avatar }}
                          style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#fff' }}
                          resizeMode="cover"
                        />
                        <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#007AFF', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>+</Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Like Button */}
                    <TouchableOpacity onPress={handleLike} style={{ marginBottom: 20, alignItems: 'center' }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: liked ? 'rgba(255, 71, 87, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 5
                      }}>
                        <Text style={{ color: liked ? '#ff4757' : '#fff', fontSize: 20 }}>❤️</Text>
                      </View>
                      <TouchableOpacity onPress={handleOpenLikesModal}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{formatCount(likesCount)}</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {/* Comments Button */}
                    <TouchableOpacity onPress={handleCommentPress} style={{ marginBottom: 20, alignItems: 'center' }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 5
                      }}>
                        <Text style={{ color: '#fff', fontSize: 18 }}>💬</Text>
                      </View>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{formatCount(commentsCount)}</Text>
                    </TouchableOpacity>
                    
                    {/* Bookmark Button */}
                    <TouchableOpacity onPress={handleBookmark} style={{ marginBottom: 20, alignItems: 'center' }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: bookmarked ? 'rgba(255, 193, 7, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 5
                      }}>
                        <View style={{
                          width: 20,
                          height: 24,
                          backgroundColor: bookmarked ? '#ffc107' : '#fff',
                          borderRadius: 2,
                          position: 'relative'
                        }}>
                          <View style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 8,
                            backgroundColor: bookmarked ? '#ffc107' : '#fff',
                            borderTopLeftRadius: 0,
                            borderTopRightRadius: 0,
                            borderBottomLeftRadius: 2,
                            borderBottomRightRadius: 2,
                            transform: [{ rotate: '45deg' }],
                            top: 16
                          }} />
                        </View>
                      </View>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{bookmarked ? 'Saved' : 'Save'}</Text>
                    </TouchableOpacity>
                    
                    {/* Share Button */}
                    <TouchableOpacity onPress={handleShare} style={{ marginBottom: 20, alignItems: 'center' }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginBottom: 5
                      }}>
                        <View style={{
                          width: 20,
                          height: 20,
                          position: 'relative'
                        }}>
                          {/* Main arrow body */}
                          <View style={{
                            width: 16,
                            height: 2,
                            backgroundColor: '#fff',
                            position: 'absolute',
                            top: 9,
                            left: 0
                          }} />
                          {/* Arrow head */}
                          <View style={{
                            width: 0,
                            height: 0,
                            backgroundColor: 'transparent',
                            borderStyle: 'solid',
                            borderLeftWidth: 8,
                            borderRightWidth: 0,
                            borderBottomWidth: 6,
                            borderTopWidth: 6,
                            borderLeftColor: '#fff',
                            borderRightColor: 'transparent',
                            borderBottomColor: 'transparent',
                            borderTopColor: 'transparent',
                            position: 'absolute',
                            top: 7,
                            right: 0
                          }} />
                          {/* Vertical line */}
                          <View style={{
                            width: 2,
                            height: 12,
                            backgroundColor: '#fff',
                            position: 'absolute',
                            top: 4,
                            left: 2
                          }} />
                        </View>
                      </View>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>{formatCount(shareCount)}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Bottom Left Video Information - TikTok Style */}
                  <View style={{ position: 'absolute', bottom: 120, left: 15, right: 80, zIndex: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginRight: 8 }}>
                        @{modalVideo.creator?.username || user?.username}
                      </Text>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: 18 }}>
                      {modalVideo.title || 'Untitled'} ♫ ✨
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 12, marginRight: 5 }}>♫</Text>
                      <Text style={{ color: '#fff', fontSize: 12 }}>Original Sound - {modalVideo.creator?.username || user?.username}</Text>
                    </View>
                    <Text style={{ color: '#fff', fontSize: 12, opacity: 0.8 }}>
                      #trending #viral #fyp
                    </Text>
                  </View>
                  
                  {/* Comments Modal */}
                  <Modal
                    visible={commentsModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setCommentsModalVisible(false)}
                  >
                    <KeyboardAvoidingView
                      style={{ flex: 1, justifyContent: 'flex-end' }}
                      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                      <View style={{ backgroundColor: '#22223b', borderTopLeftRadius: 18, borderTopRightRadius: 18, width: '100%', maxHeight: '80%', paddingBottom: 0 }}>
                        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                          <View style={{ width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, marginBottom: 4 }} />
                          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Comments</Text>
                        </View>
                        {loadingComments ? (
                          <ActivityIndicator color="#a77df8" size="large" style={{ marginVertical: 24 }} />
                        ) : (
                          <FlatList
                            data={[...comments].reverse()} // Newest at bottom
                            keyExtractor={c => c.$id}
                            renderItem={({ item: c }) => (
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, paddingHorizontal: 16 }}>
                                <Image source={{ uri: c.avatar || images.profile }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: '#a77df8', fontWeight: 'bold', fontSize: 15 }}>{c.username || c.userId}</Text>
                                  <Text style={{ color: '#fff', fontSize: 16 }}>{c.content}</Text>
                                  <Text style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{new Date(c.createdAt).toLocaleString()}</Text>
                                </View>
                              </View>
                            )}
                            style={{ maxHeight: 320, marginBottom: 8 }}
                            showsVerticalScrollIndicator={false}
                            inverted // So newest is at the bottom
                          />
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, backgroundColor: '#22223b' }}>
                          <TextInput
                            value={newComment}
                            onChangeText={setNewComment}
                            placeholder="Add a comment..."
                            placeholderTextColor="#aaa"
                            style={{ flex: 1, backgroundColor: '#333', color: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 }}
                            editable={!posting}
                          />
                          <TouchableOpacity
                            onPress={handleAddComment}
                            disabled={posting || !newComment.trim()}
                            style={{ marginLeft: 8, backgroundColor: posting ? '#888' : '#a77df8', borderRadius: 8, paddingHorizontal: 18, paddingVertical: 12 }}
                          >
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{posting ? '...' : 'Post'}</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => setCommentsModalVisible(false)} style={{ alignSelf: 'center', backgroundColor: '#444', paddingHorizontal: 32, paddingVertical: 10, borderRadius: 8, marginBottom: 12, marginTop: 2 }}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Close</Text>
                        </TouchableOpacity>
                      </View>
                    </KeyboardAvoidingView>
                  </Modal>
                  
                  {/* Likes List Modal */}
                  <Modal
                    visible={likesModalVisible}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setLikesModalVisible(false)}
                  >
                    <KeyboardAvoidingView
                      style={{ flex: 1, justifyContent: 'flex-end' }}
                      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                      <View style={{ backgroundColor: '#22223b', borderTopLeftRadius: 18, borderTopRightRadius: 18, width: '100%', maxHeight: '70%' }}>
                        <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                          <View style={{ width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, marginBottom: 4 }} />
                          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Likes</Text>
                        </View>
                        {loadingLikes ? (
                          <ActivityIndicator color="#a77df8" size="large" style={{ marginVertical: 24 }} />
                        ) : likesList.length === 0 ? (
                          <Text style={{ color: '#fff', textAlign: 'center', marginVertical: 24 }}>No likes yet.</Text>
                        ) : (
                          <FlatList
                            data={likesList}
                            keyExtractor={u => u.$id}
                            renderItem={({ item: u }) => (
                              <TouchableOpacity onPress={() => handleUserPress(u.$id)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 18 }}>
                                <Image source={{ uri: u.avatar || images.profile }} style={{ width: 38, height: 38, borderRadius: 19, marginRight: 12 }} />
                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{u.username}</Text>
                              </TouchableOpacity>
                            )}
                            style={{ maxHeight: 320, marginBottom: 8 }}
                            showsVerticalScrollIndicator={false}
                          />
                        )}
                        <TouchableOpacity onPress={() => setLikesModalVisible(false)} style={{ alignSelf: 'center', backgroundColor: '#444', paddingHorizontal: 32, paddingVertical: 10, borderRadius: 8, marginBottom: 12, marginTop: 2 }}>
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Close</Text>
                        </TouchableOpacity>
                      </View>
                    </KeyboardAvoidingView>
                  </Modal>
                </SafeAreaView>
              </PanGestureHandler>
            </GestureHandlerRootView>
          )}
        </Modal>

        {/* Following/Followers Modal */}
        <Modal
          visible={followModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={closeFollowModal}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20
          }}>
            <View style={{ 
              backgroundColor: "#22223b", 
              padding: 24, 
              borderRadius: 12, 
              width: "100%",
              maxWidth: 350,
              maxHeight: 500
            }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
                  {followModalType === 'following' ? 'Following' : 'Followers'}
                </Text>
                <TouchableOpacity onPress={closeFollowModal}>
                  <Text style={{ color: "#fff", fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={{ maxHeight: 400 }}>
                {followModalData.length > 0 ? (
                  followModalData.map((modalUser, index) => {
                    // Check if current user is following this user
                    const isFollowingUser = modalUser.followers?.includes(user?.$id) || false;
                    
                    return (
                      <View key={index} style={{ 
                        flexDirection: "row", 
                        alignItems: "center", 
                        paddingVertical: 12, 
                        borderBottomWidth: 1, 
                        borderBottomColor: "#333" 
                      }}>
                        <View style={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 20, 
                          backgroundColor: "#4CAF50", 
                          alignItems: "center", 
                          justifyContent: "center",
                          marginRight: 12,
                          overflow: "hidden"
                        }}>
                          {modalUser.avatar ? (
                            <Image
                              source={{ uri: modalUser.avatar }}
                              style={{ width: 40, height: 40, borderRadius: 20 }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Text style={{ color: "#000", fontSize: 16, fontWeight: "bold" }}>
                              {modalUser.username ? modalUser.username.charAt(0).toUpperCase() : 'U'}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>
                            {modalUser.username || 'Unknown User'}
                          </Text>
                          <Text style={{ color: "#ccc", fontSize: 14 }}>
                            @{modalUser.username || 'unknown'}
                          </Text>
                        </View>
                        {/* Follow/Unfollow Button */}
                        {modalUser.$id !== user?.$id && (
                          <TouchableOpacity
                            onPress={() => handleFollowToggle(modalUser.$id)}
                            style={{
                              backgroundColor: isFollowingUser ? '#444' : '#ff2d55',
                              paddingHorizontal: 16,
                              paddingVertical: 6,
                              borderRadius: 6
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>
                              {isFollowingUser ? 'Unfollow' : 'Follow'}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={{ alignItems: "center", paddingVertical: 40 }}>
                    <Text style={{ color: "#ccc", fontSize: 16 }}>
                      {followModalType === 'following' ? 'Not following anyone yet' : 'No followers yet'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Edit Profile Modal */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={closeEditModal}
        >
          <View style={{ 
            flex: 1, 
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 20
          }}>
            <View style={{ 
              backgroundColor: "#22223b", 
              padding: 24, 
              borderRadius: 12, 
              width: "100%",
              maxWidth: 350
            }}>
              <Text style={{ color: "#fff", fontSize: 20, marginBottom: 20, textAlign: "center" }}>
                Edit Profile
              </Text>
              
              {/* Username Input */}
              <Text style={{ color: "#fff", fontSize: 16, marginBottom: 8 }}>Username</Text>
              <TextInput
                value={newUsername}
                onChangeText={setNewUsername}
                style={{ backgroundColor: "#333", color: "#fff", padding: 12, borderRadius: 8, marginBottom: 20 }}
                placeholder="Enter username"
                placeholderTextColor="#666"
              />

              {/* Avatar Upload */}
              <Text style={{ color: "#fff", fontSize: 16, marginBottom: 8 }}>Avatar</Text>
              <TouchableOpacity onPress={pickAvatarImage} style={{ backgroundColor: "#333", padding: 12, borderRadius: 8, marginBottom: 20, alignItems: "center" }}>
                <Text style={{ color: "#fff" }}>{uploadingAvatar ? "Uploading..." : "Upload Avatar"}</Text>
              </TouchableOpacity>

              {/* Re-enable privacy toggle */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingVertical: 8 }}>
                <Text style={{ color: "#fff", fontSize: 16 }}>Private Profile</Text>
                <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)} style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: isPrivate ? "#a77df8" : "#444", justifyContent: "center", alignItems: isPrivate ? "flex-end" : "flex-start", paddingHorizontal: 4 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" }} />
                </TouchableOpacity>
              </View>

              {/* Re-enable pending requests section in modal */}
              {isPrivate && pendingRequests && pendingRequests.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ color: "#fff", fontSize: 16, marginBottom: 12 }}>Pending Access Requests ({pendingRequests.length})</Text>
                  <View style={{ maxHeight: 200 }}>
                    {pendingRequests.map((requestingUserId, index) => (
                      <PendingRequestItem 
                        key={index} 
                        requestingUserId={requestingUserId}
                        onApprove={() => handleAccessRequest(requestingUserId, 'approve')}
                        onDeny={() => handleAccessRequest(requestingUserId, 'deny')}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Save and Cancel Buttons */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity onPress={saveProfileChanges} disabled={saving} style={{ flex: 1, backgroundColor: "#a77df8", padding: 12, borderRadius: 8, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>{saving ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeEditModal} style={{ flex: 1, backgroundColor: "#666", padding: 12, borderRadius: 8, alignItems: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "bold" }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
