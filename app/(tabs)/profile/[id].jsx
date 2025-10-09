import { useState, useEffect, useRef } from "react";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Image, FlatList, TouchableOpacity, Text, Alert, Linking, Modal, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, FlatList as RNFlatList, Share } from "react-native";
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Query } from 'react-native-appwrite';
import { Video, ResizeMode } from "expo-av";
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { icons } from "../../../constants";
import useAppwrite from "../../../lib/useAppwrite";
import { getUserPosts, getCurrentUser, databases, appwriteConfig } from "../../../lib/appwrite";
import { useGlobalContext } from "../../../context/GlobalProvider";
import { EmptyState, InfoBox, VideoCard } from "../../../components";
import { toggleFollowUser, getFollowers, getUserLikesCount, toggleLikePost, getComments, addComment, getPostLikes, toggleBookmark, isVideoBookmarked, getShareCount, incrementShareCount } from "../../../lib/appwrite";
import { images } from "../../../constants/images";

const UserProfile = () => {
  const { id } = useLocalSearchParams();
  const { user: currentUser, followStatus, updateFollowStatus } = useGlobalContext();
  const [profileUser, setProfileUser] = useState(null);
  // Re-enable privacy states
  const [isPrivate, setIsPrivate] = useState(false);
  const [canView, setCanView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalVideo, setModalVideo] = useState(null);
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
  const videoRefs = useRef({});
  const [modalIndex, setModalIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const modalVideoRef = useRef(null);

  // Get posts for the profile user
  const { data: posts } = useAppwrite(() => {
    if (!id) return Promise.resolve([]);
    return getUserPosts(id);
  }, [id]);

  useEffect(() => {
    const fetchProfileUser = async () => {
      try {
        setLoading(true);
        
        // Get the profile user's data
        const userResponse = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          id
        );
        
        setProfileUser(userResponse);
        
        // Re-enable privacy logic
        const isProfilePrivate = userResponse.isPrivate || false;
        setIsPrivate(isProfilePrivate);
        
        // Re-enable access control logic
        if (currentUser.$id === id) {
          // User viewing their own profile
          setCanView(true);
        } else if (isProfilePrivate) {
          // Check if current user is in the allowed viewers list
          const allowedViewers = userResponse.allowedViewers || [];
          setCanView(allowedViewers.includes(currentUser.$id));
        } else {
          // Public profile
          setCanView(true);
        }
        
        // Fetch followers for follow/unfollow button
        if (currentUser.$id !== id) {
          const followers = userResponse.followers || [];
          const isFollowingUser = followers.includes(currentUser.$id);
          setIsFollowing(isFollowingUser);
          setFollowersCount(followers.length);
          // Update global state
          updateFollowStatus(id, isFollowingUser);
        } else {
          setFollowersCount(userResponse.followers ? userResponse.followers.length : 0);
        }
        // Fetch likes count for this user
        const totalLikes = await getUserLikesCount(id);
        setLikesCount(totalLikes);
        
      } catch (error) {
        console.error("Error fetching profile user:", error);
        Alert.alert("Error", "Failed to load profile");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (id && currentUser) {
      fetchProfileUser();
    }
  }, [id, currentUser]);

  // When modalVideo changes, set up like/comment state
  useEffect(() => {
    if (modalVideo) {
      setLiked(modalVideo.likes?.includes(currentUser?.$id));
      setLikesCount(modalVideo.likes ? modalVideo.likes.length : 0);
      setBookmarked(false); // TODO: implement bookmark logic
      setCommentsCount(modalVideo.comments ? modalVideo.comments.length : 0);
    }
  }, [modalVideo, currentUser]);

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

  const handleBack = () => {
    router.back();
  };

  // Re-enable request access function
  const requestAccess = async () => {
    try {
      // Add current user to the profile user's pending requests
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        id,
        {
          pendingRequests: [...(profileUser.pendingRequests || []), currentUser.$id]
        }
      );
      
      Alert.alert("Request Sent", "Your request to view this profile has been sent.");
    } catch (error) {
      console.error("Error requesting access:", error);
      Alert.alert("Error", "Failed to send request");
    }
  };

  const handleFollowToggle = async () => {
    // Immediate visual feedback
    const newFollowState = !isFollowing;
    setIsFollowing(newFollowState);
    setFollowersCount((prev) => newFollowState ? prev + 1 : prev - 1);
    updateFollowStatus(id, newFollowState);
    
    try {
      await toggleFollowUser(currentUser.$id, id);
      
      // Show success message
      const action = newFollowState ? 'followed' : 'unfollowed';
      console.log(`Successfully ${action} ${profileUser?.username || 'user'}`);
    } catch (error) {
      // Revert on error
      setIsFollowing(!newFollowState);
      setFollowersCount((prev) => !newFollowState ? prev + 1 : prev - 1);
      updateFollowStatus(id, !newFollowState);
      Alert.alert("Error", error.message || "Failed to update follow status");
      console.error("Follow error:", error);
    }
  };

  const handleMessage = () => {
    // Open chat with this user
    router.push({ pathname: '/chat', params: { userId: id } });
  };

  const handleLike = async () => {
    if (!currentUser?.$id || !modalVideo) return;
    setLiked((prev) => !prev);
    setLikesCount((prev) => (liked ? prev - 1 : prev + 1));
    try {
      await toggleLikePost(modalVideo.$id, currentUser.$id);
    } catch {}
  };

  const handleBookmark = async () => {
    if (!currentUser?.$id || !modalVideo) {
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

      const newBookmarkStatus = await toggleBookmark(currentUser.$id, modalVideo.$id, videoData);
      setBookmarked(newBookmarkStatus);
    } catch (error) {
      console.error("Error toggling bookmark:", error);
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
        console.log("Video shared successfully");
      }
    } catch (error) {
      console.error("Error sharing video:", error);
      Alert.alert("Error", "Failed to share video");
    }
  };

  const handleCommentPress = () => {
    setCommentsModalVisible(true);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser?.$id || !modalVideo) return;
    setPosting(true);
    try {
      const comment = await addComment(modalVideo.$id, currentUser.$id, newComment.trim());
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
    if (userId && userId !== currentUser?.$id) {
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

  const openVideoModal = (item, index) => {
    console.log("Opening video modal:", item);
    console.log("Video URL:", item.video);
    setModalVideo(item);
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
      setLiked(nextVideo.likes?.includes(currentUser?.$id));
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
      setLiked(prevVideo.likes?.includes(currentUser?.$id));
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

  // Check bookmark status and share count when modal video changes
  useEffect(() => {
    if (modalVideo && currentUser?.$id) {
      // Check bookmark status
      const checkBookmarkStatus = async () => {
        try {
          const isBookmarked = await isVideoBookmarked(currentUser.$id, modalVideo.$id);
          setBookmarked(isBookmarked);
        } catch (error) {
          console.error("Error checking bookmark status:", error);
        }
      };

      // Get share count
      const fetchShareCount = async () => {
        try {
          const shares = await getShareCount(modalVideo.$id);
          setShareCount(shares);
        } catch (error) {
          console.error("Error fetching share count:", error);
        }
      };

      checkBookmarkStatus();
      fetchShareCount();
    }
  }, [modalVideo, currentUser?.$id]);

  if (loading) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            headerShown: false 
          }} 
        />
        <SafeAreaView className="bg-primary h-full">
          <View className="flex-1 justify-center items-center">
            <Text className="text-white text-lg">Loading profile...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }

  // Re-enable private profile view
  if (!canView) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            headerShown: false 
          }} 
        />
        <SafeAreaView className="bg-primary h-full">
          <View className="flex flex-row items-center justify-between px-4 mt-6 mb-8">
            <TouchableOpacity onPress={handleBack}>
              <Image
                source={icons.leftArrow}
                resizeMode="contain"
                className="w-6 h-6"
              />
            </TouchableOpacity>
            <Text className="text-white text-lg font-psemibold">Profile</Text>
            <View className="w-6" />
          </View>

          <View className="flex-1 justify-center items-center px-4">
            <View className="w-20 h-20 border border-secondary rounded-full flex justify-center items-center mb-6">
              <Image
                source={{ uri: profileUser?.avatar }}
                className="w-[90%] h-[90%] rounded-full"
                resizeMode="cover"
              />
            </View>
            
            <Text className="text-white text-xl font-psemibold mb-2">
              {profileUser?.username}
            </Text>
            
            <Text className="text-gray-300 text-center mb-8">
              This profile is private. Only approved users can view this content.
            </Text>
            
            <TouchableOpacity
              onPress={requestAccess}
              className="bg-secondary px-6 py-3 rounded-lg"
            >
              <Text className="text-white font-psemibold">Request Access</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="bg-primary h-full">
        <FlatList
          data={posts}
          keyExtractor={(item) => item.$id}
          numColumns={3}
          renderItem={({ item, index }) => (
            <View style={{ flex: 1/3, aspectRatio: 4/5, margin: 2, backgroundColor: '#000', borderRadius: 8, overflow: 'hidden' }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openVideoModal(item, index)}
                style={{ width: '100%', height: '100%' }}
              >
                <Video
                  ref={ref => videoRefs.current[index] = ref}
                  source={{ uri: item.video }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode={ResizeMode.COVER}
                  isMuted
                  shouldPlay={false}
                  useNativeControls={false}
                  posterSource={item.thumbnail ? { uri: item.thumbnail } : undefined}
                />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={() => (
            <EmptyState
              title="No Videos Found"
              subtitle="No videos found for this profile"
            />
          )}
          ListHeaderComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 30, marginBottom: 16 }}>
              {/* Profile Picture */}
              <View className="w-20 h-20 border border-secondary items-center justify-center mb-4 rounded-lg">
                <Image
                  source={{ uri: profileUser?.avatar }}
                  className="w-[90%] h-[90%]"
                  resizeMode="cover"
                />
              </View>
              {/* Username and handle */}
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 22 }}>{profileUser?.username}</Text>
              <Text style={{ color: '#aaa', fontSize: 15, marginBottom: 8 }}>@{profileUser?.username}</Text>
              {/* Stats Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ alignItems: 'center', marginHorizontal: 18 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>{profileUser?.following?.length || 0}</Text>
                  <Text style={{ color: '#aaa', fontSize: 13 }}>Following</Text>
                </View>
                <View style={{ alignItems: 'center', marginHorizontal: 18 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>{followersCount}</Text>
                  <Text style={{ color: '#aaa', fontSize: 13 }}>Followers</Text>
                </View>
                <View style={{ alignItems: 'center', marginHorizontal: 18 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>{likesCount}</Text>
                  <Text style={{ color: '#aaa', fontSize: 13 }}>Likes</Text>
                </View>
              </View>
              {/* Buttons Row */}
              {currentUser.$id !== id && (
                <View style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                    <TouchableOpacity
                      onPress={handleFollowToggle}
                      style={{ backgroundColor: isFollowing ? '#444' : '#ff2d55', borderRadius: 8, paddingHorizontal: 32, paddingVertical: 10, marginHorizontal: 6 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleMessage}
                      style={{ backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 32, paddingVertical: 10, marginHorizontal: 6 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Message</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, marginHorizontal: 6 }}
                      onPress={() => {
                        Alert.alert(
                          "Profile Options",
                          "What would you like to do?",
                          [
                            {
                              text: "Report Profile",
                              onPress: () => {
                                Alert.alert("Report", "Profile reported successfully!");
                              },
                              style: "destructive",
                            },
                            {
                              text: "Block User",
                              onPress: () => {
                                Alert.alert("Block", "User blocked successfully!");
                              },
                              style: "destructive",
                            },
                            {
                              text: "Cancel",
                              style: "cancel",
                            },
                          ]
                        );
                      }}
                    >
                      <Image source={icons.menu} style={{ width: 22, height: 22, tintColor: '#fff' }} resizeMode="contain" />
                    </TouchableOpacity>
                  </View>
                  {/* Donation Button */}
                  <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity
                      onPress={() => router.push('/donation')}
                      style={{ backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', marginRight: 6 }}>💰</Text>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Support Creator</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {/* Bio and Link */}
              {/* {profileUser?.bio && (
                <Text style={{ color: '#fff', fontSize: 15, textAlign: 'center', marginBottom: 6 }}>{profileUser.bio}</Text>
              )} */}
              {/* {profileUser?.link && (
                <TouchableOpacity onPress={() => Linking.openURL(profileUser.link)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                  <Image source={icons.link} style={{ width: 16, height: 16, marginRight: 4, tintColor: '#3ec6ff' }} />
                  <Text style={{ color: '#3ec6ff', fontSize: 15 }}>{profileUser.link}</Text>
                </TouchableOpacity>
              )} */}
            </View>
          )}
        />
                 {/* Full Screen Video Modal */}
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
                    posterSource={modalVideo.thumbnail ? { uri: modalVideo.thumbnail } : undefined}
                    onPlaybackStatusUpdate={status => {
                      console.log("Video status:", status);
                      if (status.didJustFinish) setModalVisible(false);
                    }}
                    onError={(error) => {
                      console.error("Video error:", error);
                    }}
                    onLoadStart={() => {
                      console.log("Video loading started for:", modalVideo.video);
                    }}
                    onLoad={() => {
                      console.log("Video loaded successfully for:", modalVideo.video);
                    }}
                    onReadyForDisplay={() => {
                      console.log("Video ready for display");
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
                  
                  {/* Fallback thumbnail if video doesn't load */}
                  {modalVideo.thumbnail && (
                    <Image
                      source={{ uri: modalVideo.thumbnail }}
                      style={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        width: '100%', 
                        height: '100%',
                        opacity: 0.3
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
                       source={{ uri: modalVideo.creator?.avatar || profileUser?.avatar }}
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
                     @{modalVideo.creator?.username || profileUser?.username}
                   </Text>
                   
                 </View>
                 <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8, lineHeight: 18 }}>
                   {modalVideo.title || 'Untitled'} ♫ ✨
                 </Text>
                 <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                   <Text style={{ color: '#fff', fontSize: 12, marginRight: 5 }}>♫</Text>
                   <Text style={{ color: '#fff', fontSize: 12 }}>Original Sound - {modalVideo.creator?.username || profileUser?.username}</Text>
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
   </SafeAreaView>
 </>
);
};

export default UserProfile; 
