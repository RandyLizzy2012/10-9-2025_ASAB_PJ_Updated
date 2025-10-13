import { useState, useEffect, useCallback, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlatList, Image, RefreshControl, Text, View, TouchableOpacity, Dimensions, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Share, Alert, ScrollView } from "react-native";
import { ResizeMode, Video } from "expo-av";
import { router, useFocusEffect } from "expo-router";
import { GestureHandlerRootView, PanGestureHandler, State, Gesture } from "react-native-gesture-handler";

import { images, icons } from "../../constants";
import useAppwrite from "../../lib/useAppwrite";
import { getAllPosts, getLatestPosts, toggleLikePost, getComments, addComment, getPostLikes, getFollowingPosts, toggleBookmark, isVideoBookmarked, getShareCount, incrementShareCount, getIOSCompatibleVideoUrl, toggleFollowUser } from "../../lib/appwrite";
import { useGlobalContext } from "../../context/GlobalProvider";
import { databases } from "../../lib/appwrite";
import { appwriteConfig } from "../../lib/appwrite";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const StrollVideoCard = ({ item, index, isVisible, onVideoStateChange, selectedTab, setSelectedTab, isHomeFocused }) => {
  const { user, followStatus, updateFollowStatus } = useGlobalContext();
  const [play, setPlay] = useState(false);
  const [liked, setLiked] = useState(item.likes?.includes(user?.$id));
  const [likesCount, setLikesCount] = useState(item.likes ? item.likes.length : 0);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentsCount, setCommentsCount] = useState(item.comments ? item.comments.length : 0);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [likesModalVisible, setLikesModalVisible] = useState(false);
  const [likesList, setLikesList] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [shareCount, setShareCount] = useState(item.shares || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showProfileHint, setShowProfileHint] = useState(false);

  // Show initial hint when video becomes visible (only once per video)
  useEffect(() => {
    if (isVisible && !showProfileHint) {
      // Show hint after 3 seconds of video being visible
      const timer = setTimeout(() => {
        setShowProfileHint(true);
        setTimeout(() => setShowProfileHint(false), 3000);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, showProfileHint]);

  // Fetch comments count on mount or when item changes
  useEffect(() => {
    async function fetchCommentsCount() {
      try {
        const comments = await getComments(item.$id);
        setCommentsCount(comments.length);
      } catch {}
    }
    fetchCommentsCount();
  }, [item.$id]);

  // Check bookmark status on mount
  useEffect(() => {
    async function checkBookmarkStatus() {
      if (user?.$id) {
        try {
          const isBookmarked = await isVideoBookmarked(user.$id, item.$id);
          setBookmarked(isBookmarked);
        } catch (error) {
          
        }
      }
    }
    checkBookmarkStatus();
  }, [user?.$id, item.$id]);

  // Fetch share count on mount
  useEffect(() => {
    async function fetchShareCount() {
      try {
        const shares = await getShareCount(item.$id);
        setShareCount(shares);
      } catch (error) {
       
      }
    }
    fetchShareCount();
  }, [item.$id]);

  // Check if current user is following the video creator
  useEffect(() => {
    async function checkFollowStatus() {
      if (user?.$id && item.creator?.$id && user.$id !== item.creator.$id) {
        // First check global state
        if (followStatus[item.creator.$id] !== undefined) {
          setIsFollowing(followStatus[item.creator.$id]);
        } else {
          // Fallback to database check
          try {
            const currentUser = await databases.getDocument(appwriteConfig.databaseId, appwriteConfig.userCollectionId, user.$id);
            const following = currentUser.following || [];
            const isFollowingUser = following.includes(item.creator.$id);
            setIsFollowing(isFollowingUser);
            // Update global state
            updateFollowStatus(item.creator.$id, isFollowingUser);
          } catch (error) {
            
          }
        }
      } else {
        // Reset follow status if it's the same user or no user
        setIsFollowing(false);
      }
    }
    checkFollowStatus();
  }, [user?.$id, item.creator?.$id, followStatus]);

  // Fetch comments when modal opens
  useEffect(() => {
    if (commentsModalVisible) {
      setLoadingComments(true);
      getComments(item.$id)
        .then((res) => setComments(res))
        .catch(() => setComments([]))
        .finally(() => setLoadingComments(false));
    }
  }, [commentsModalVisible, item.$id]);

  // Fetch likes list when modal opens
  useEffect(() => {
    if (likesModalVisible) {
      setLoadingLikes(true);
      getPostLikes(item.$id)
        .then(async (userIds) => {
          // Fetch user info for each userId
          const users = await Promise.all(
            userIds.map(async (uid) => {
              try {
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
  }, [likesModalVisible, item.$id]);

  // Handle visibility changes and home focus
  useEffect(() => {
    if (isVisible && isHomeFocused) {
      setPlay(true);
    } else {
      setPlay(false);
    }
  }, [isVisible, isHomeFocused]);

  const handleVideoPress = () => {
    setPlay((prev) => !prev);
  };

  const handleLike = async () => {
    if (!user?.$id) return;
    setLiked((prev) => !prev);
    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
    try {
      await toggleLikePost(item.$id, user.$id);
    } catch {}
  };

  const handleBookmark = async () => {
    if (!user?.$id) {
      Alert.alert("Error", "Please login to bookmark videos");
      return;
    }

    try {
      const videoData = {
        title: item.title,
        creator: item.creator.username,
        avatar: item.creator.avatar,
        thumbnail: item.thumbnail,
        video: item.video,
        videoId: item.$id
      };

      const newBookmarkStatus = await toggleBookmark(user.$id, item.$id, videoData);
      setBookmarked(newBookmarkStatus);
    } catch (error) {
      
      Alert.alert("Error", "Failed to bookmark video");
    }
  };

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this video: ${item.title} by ${item.creator.username}\n${item.video}`,
        title: item.title,
      });
      
      if (result.action === Share.sharedAction) {
        // Increment share count
        const newShareCount = await incrementShareCount(item.$id);
        setShareCount(newShareCount);
        
      }
    } catch (error) {
      
      Alert.alert("Error", "Failed to share video");
    }
  };

  const handleProfilePress = () => {
    if (item.creator.$id && item.creator.$id !== user?.$id) {
      router.push(`/profile/${item.creator.$id}`);
    }
  };

  // Handle left swipe gesture for profile opening
  const onGestureEvent = (event) => {
    const { translationX, state } = event.nativeEvent;
    
    // Check if it's a left swipe (negative translationX) and gesture is finished
    if (state === State.END && translationX < -100) {
      
      // Only open profile if it's not the current user's video
      if (item.creator?.$id && item.creator.$id !== user?.$id) {
        // Show hint briefly before opening profile
        setShowProfileHint(true);
        setTimeout(() => {
          setShowProfileHint(false);
          router.push(`/profile/${item.creator.$id}`);
        }, 300);
      }
    }
  };

  const handleFollowPress = async () => {
    if (!user?.$id || !item.creator?.$id || user.$id === item.creator.$id) return;
    
    // Immediate visual feedback - no loading state
    const newFollowState = !isFollowing;
    setIsFollowing(newFollowState);
    updateFollowStatus(item.creator.$id, newFollowState);
    
    try {
      await toggleFollowUser(user.$id, item.creator.$id);
      
      // Show success message
      const action = newFollowState ? 'followed' : 'unfollowed';
      
    } catch (error) {
      
      Alert.alert("Error", "Failed to follow/unfollow user");
      // Revert the state change on error
      setIsFollowing(!newFollowState);
      updateFollowStatus(item.creator.$id, !newFollowState);
    }
  };

  const handleCommentPress = () => {
    setCommentsModalVisible(true);
  };

  const handleAddComment = async () => {
    
    if (!newComment.trim() || !user?.$id) return;
    setPosting(true);
    try {
      const comment = await addComment(item.$id, user.$id, newComment.trim());
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

  return (
    <View style={{ height: SCREEN_HEIGHT, backgroundColor: '#000', overflow: 'hidden' }}>
    
                                         {/* Swipe Gesture Handler for Profile Opening - TikTok Style */}
                   <PanGestureHandler
            onHandlerStateChange={(event) => {
              const { translationX, state } = event.nativeEvent;
              
              if (state === State.END && translationX < -80) {
                // Only open profile if it's not the current user's video
                if (item.creator?.$id && item.creator.$id !== user?.$id) {
                  // Show hint briefly before opening profile
                  setShowProfileHint(true);
                  
                  // Navigate to profile
                  router.push(`/profile/${item.creator.$id}`);
                  
                  setTimeout(() => {
                    setShowProfileHint(false);
                  }, 1000);
                }
              }
            }}
            activeOffsetX={[-20, 20]} // Very sensitive horizontal detection
            activeOffsetY={[-100, 100]} // Allow more vertical movement without canceling
          >
          <View style={{ 
            position: 'absolute', 
            left: 0, 
            top: 0, 
            width: '50%', // Only cover left half of the video
            bottom: 0, 
            zIndex: 15 
          }}>
            
           </View>
        </PanGestureHandler>
      
      {/* Video Background */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleVideoPress}
        style={{ width: '100%', height: '100%', position: 'relative', backgroundColor: '#000' }}
      >
        {item.video ? (
        <Video
          source={{ 
            uri: getIOSCompatibleVideoUrl(item.video) || item.video
          }}
          style={{ width: '100%', height: '100%' }}
          resizeMode={ResizeMode.COVER}
          shouldPlay={play}
          isLooping
          isMuted={false}
          useNativeControls={false}
          onError={(error) => {
              
            }}
            onLoad={() => {
              
            }}
          onPlaybackStatusUpdate={(status) => {
            if (status.didJustFinish) {
              setPlay(false);
            }
          }}
        />
        ) : (
          <View style={{ width: '100%', height: '100%', backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 16 }}>No video available</Text>
          </View>
        )}
        {!play && item.video && (
          <View style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -24 }, { translateY: -24 }] }}>
            <Image source={icons.play} style={{ width: 48, height: 48 }} resizeMode="contain" />
          </View>
        )}
      </TouchableOpacity>

      {/* Top Navigation Tabs over each video - TikTok style */}
      <View style={{ position: 'absolute', top: 70, left: 0, right: 0, zIndex: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', paddingHorizontal: 20 }}>
          <TouchableOpacity 
            onPress={() => setSelectedTab('forYou')}
            style={{ 
              backgroundColor: selectedTab === 'forYou' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', 
              paddingHorizontal: 20, 
              paddingVertical: 8, 
              borderRadius: 20, 
              marginHorizontal: 5 
            }}
          >
            <Text style={{ color: '#fff', fontWeight: selectedTab === 'forYou' ? '600' : '400' }}>For You</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setSelectedTab('following')}
            style={{ 
              backgroundColor: selectedTab === 'following' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', 
              paddingHorizontal: 20, 
              paddingVertical: 8, 
              borderRadius: 20, 
              marginHorizontal: 5 
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: selectedTab === 'following' ? '600' : '400' }}>Following</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Right Side Interaction Buttons */}
      <View style={{ position: 'absolute', right: 15, bottom: 150, zIndex: 10 }}>
        {/* Profile Picture */}
        <TouchableOpacity onPress={handleProfilePress} style={{ marginBottom: 20, alignItems: 'center' }}>
          <View style={{ position: 'relative' }}>
            <Image
              source={{ uri: item.creator.avatar }}
              style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#fff' }}
              resizeMode="cover"
            />
                         {/* Follow/Following Icon */}
             {user?.$id !== item.creator?.$id && (
               <TouchableOpacity 
                 onPress={handleFollowPress}
                 style={{ 
                   position: 'absolute', 
                   bottom: -2, 
                   right: -2, 
                   backgroundColor: isFollowing ? '#4CAF50' : '#007AFF', 
                   width: 20, 
                   height: 20, 
                   borderRadius: 10, 
                   justifyContent: 'center', 
                   alignItems: 'center',
                   borderWidth: isFollowing ? 1 : 0,
                   borderColor: isFollowing ? '#fff' : 'transparent'
                 }}
               >
                 <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                   {isFollowing ? '✓' : '+'}
                 </Text>
               </TouchableOpacity>
             )}
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

      {/* Bottom Left Video Information */}
      <View style={{ position: 'absolute', bottom: 100, left: 15, right: 80, zIndex: 10 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          {item.creator.username}
        </Text>
        <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>
          {item.title} ♫ ✨
        </Text>
        <Text style={{ color: '#fff', fontSize: 12, marginBottom: 4 }}>
          ...more
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 12, marginRight: 5 }}>♫</Text>
          <Text style={{ color: '#fff', fontSize: 12 }}>Contains: {item.title}...</Text>
        </View>
      </View>

      {/* TikTok-style Comments Modal */}
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
    </View>
  );
};

const Home = () => {
  const { user } = useGlobalContext();
  const [selectedTab, setSelectedTab] = useState('forYou'); // 'forYou' or 'following'
  const [refreshing, setRefreshing] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isHomeFocused, setIsHomeFocused] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  
  // Get posts based on selected tab
  const { data: forYouPosts, refetch: refetchForYou } = useAppwrite(getAllPosts, []);
  const { data: followingPosts, refetch: refetchFollowing } = useAppwrite(
    () => user?.$id ? getFollowingPosts(user.$id) : Promise.resolve([]),
    [user?.$id]
  );
  
  // Get latest posts for trending section
  const { data: latestPosts } = useAppwrite(getLatestPosts, []);
  
 
  
  const posts = selectedTab === 'forYou' ? forYouPosts : followingPosts;
  const refetch = selectedTab === 'forYou' ? refetchForYou : refetchFollowing;

  // Simple search function that maintains focus
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const filteredPosts = posts?.filter(post => 
      post.title?.toLowerCase().includes(query.toLowerCase()) ||
      post.creator?.username?.toLowerCase().includes(query.toLowerCase())
    ) || [];
    
    setSearchResults(filteredPosts);
    
    
    // Ensure the input maintains focus
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // Use search results if searching, otherwise use normal posts
  const displayPosts = isSearching ? searchResults : posts;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Reset video index when switching tabs
  useEffect(() => {
    setCurrentVideoIndex(0);
  }, [selectedTab]);

  // Handle focus/blur to stop videos when navigating away
  useFocusEffect(
    useCallback(() => {
      setIsHomeFocused(true);
      return () => {
        setIsHomeFocused(false);
      };
    }, [])
  );

  const handleViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const newIndex = viewableItems[0].index;
      setCurrentVideoIndex(newIndex);
      
      // Ensure the video starts playing when it becomes visible
      if (__DEV__) {
        
      }
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  };

  const renderVideoCard = useCallback(({ item, index }) => (
    <StrollVideoCard
      item={item}
      index={index}
      isVisible={index === currentVideoIndex}
      onVideoStateChange={() => {}} // Empty function since we're not using it anymore
      selectedTab={selectedTab}
      setSelectedTab={setSelectedTab}
      isHomeFocused={isHomeFocused}
    />
  ), [currentVideoIndex, selectedTab, isHomeFocused]);

  // Render trending video item
  const renderTrendingItem = ({ item, index }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Debug logging for each trending item
    if (__DEV__) {
     
    }
    
    return (
    <TouchableOpacity 
      key={item.$id}
      style={{ 
        marginRight: 20, 
        alignItems: 'center',
        width: 200
      }}
      onPress={() => {
        // Toggle play/pause for the trending video
        setIsPlaying(!isPlaying);
        
      }}
    >
      <View style={{ 
        width: 200, 
        height: 280, 
        borderRadius: 33, 
        marginTop: 12, 
        backgroundColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        {item.video ? (
          <View style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Video
              source={{ 
                uri: getIOSCompatibleVideoUrl(item.video) || item.video
              }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
              shouldPlay={isPlaying}
              isMuted={false}
              isLooping={true}
              useNativeControls={false}
              posterSource={item.thumbnail ? { uri: item.thumbnail } : undefined}
              onError={(error) => {
                
              }}
              onLoad={() => {
                
              }}
            />
            
            {/* Play/Pause Overlay - Same as home page */}
            {!isPlaying && (
              <View style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -24 }, { translateY: -24 }] }}>
                <Image source={icons.play} style={{ width: 48, height: 48 }} resizeMode="contain" />
              </View>
            )}
          </View>
        ) : (
          <View style={{ 
            width: '100%', 
            height: '100%', 
            backgroundColor: '#333', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
              {item.title || 'No video'}
            </Text>
          </View>
        )}
      </View>
      {/* Creator name hidden as requested */}
    </TouchableOpacity>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#111624ff' }}>
        {/* Combined Scrollable Content with Trending and Videos */}
          <FlatList
            data={displayPosts}
            keyExtractor={(item) => item.$id}
            renderItem={renderVideoCard}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToInterval={SCREEN_HEIGHT}
            snapToAlignment="start"
            decelerationRate="fast"
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          getItemLayout={(data, index) => {
            // Calculate exact header height based on actual component heights
            // Welcome section: ~120px, Search: ~80px, Trending: 470px + padding
            const welcomeHeight = 120; // Welcome back + username
            const searchHeight = 80;   // Search bar
            const trendingHeight = 470 + 40; // Trending section + padding
            const totalHeaderHeight = welcomeHeight + searchHeight + trendingHeight;
            
            return {
              length: SCREEN_HEIGHT,
              offset: totalHeaderHeight + (SCREEN_HEIGHT * index),
              index,
            };
          }}
          ListHeaderComponent={() => (
            // Header Section with User Name and Search
            <View style={{ 
              backgroundColor: '#040b25ff', 
              paddingVertical: 20,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.1)'
            }}>
              {/* Welcome Back and Username */}
              <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ 
                      color: '#ccc', 
                      fontSize: 14, 
                      marginBottom: 5 
                    }}>

                     <View className="mt-6">
                    <Image
                      source={images.ASAB4}
                      className="w-22 h-24
                       justify-center right-10"
                      />
                  </View>
                  
                      Welcome Back
                    </Text>
                    <Text style={{ 
                      color: '#fff', 
                      fontSize: 24, 
                      fontWeight: 'bold' 
                    }}>
                      {user?.username || 'jsmastery'}
                    </Text>
                  </View>

                  {/* Go Live Button */}
                  <TouchableOpacity
                    onPress={() => router.push('/go-live')}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#ff4757',
                      paddingHorizontal: 15,
                      paddingVertical: 10,
                      borderRadius: 20,
                      marginTop: 10,
                    }}
                  >
                    <Text style={{ fontSize: 16, marginRight: 5 }}>📹</Text>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>
                      Go Live
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Bar */}
              <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 24,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)'
                }}>
                  <TextInput
                    ref={searchInputRef}
                    placeholder="Search for a video topic"
                    placeholderTextColor="rgba(255,255,255,0.6)"
                    style={{
                      flex: 1,
                      color: '#fff',
                      fontSize: 16,
                      marginRight: 10
                    }}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    blurOnSubmit={false}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    onFocus={() => console.log('Search field focused')}
                    onBlur={() => console.log('Search field blurred')}
                    onSubmitEditing={() => {
                      // Keep focus on the input
                      searchInputRef.current?.focus();
                      
                    }}
                  />
                  <TouchableOpacity onPress={() => {
                    if (searchQuery.trim()) {
                      // Clear search
                      setSearchQuery('');
                      setSearchResults([]);
                      setIsSearching(false);
                    }
                  }}>
                    <Text style={{ color: '#fff', fontSize: 18 }}>
                      {searchQuery.trim() ? '✕' : '🔍'}
                    </Text>
                  </TouchableOpacity>
                  

                </View>
              </View>

              {/* Search Results Indicator */}
              {isSearching && searchQuery.trim() && (
                <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                  <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
                    {searchResults.length > 0 
                      ? `Found ${searchResults.length} video${searchResults.length === 1 ? '' : 's'} for "${searchQuery}"`
                      : `No videos found for "${searchQuery}"`
                    }
                  </Text>
                </View>
              )}

              {/* Trending Videos Section */}
              {latestPosts && latestPosts.length > 0 ? (
                <View style={{ 
                  backgroundColor: '#0f152bff', 
                  paddingVertical: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(255,255,255,0.1)',
                  height: 470
                }}>
                  <Text style={{ 
                    color: '#fff', 
                    fontSize: 20, 
                    fontWeight: 'bold', 
                    marginBottom: 15, 
                    paddingHorizontal: 20 
                  }}>
                    Trending Videos
              </Text>
                  
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                  >
                    {latestPosts.slice(0, 5).map((item, index) => renderTrendingItem({ item, index }))}
                  </ScrollView>
                  
                  {/* Carousel Indicators */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'center', 
                  }}>
                    {latestPosts.slice(0, 4).map((_, index) => (
                      <View 
                        key={index}
                        style={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: 4, 
                          backgroundColor: index === 1 ? '#FFD700' : 'rgba(255,255,255,0.3)', 
                          marginHorizontal: 4 
                        }} 
                      />
                    ))}
                  </View>

                                                      </View>
               ) : null}


          </View>
        )}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default Home;
