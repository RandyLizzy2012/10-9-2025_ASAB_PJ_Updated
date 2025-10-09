import { useState } from "react";
import { ResizeMode, Video } from "expo-av";
import { View, Text, TouchableOpacity, Image, Alert, Share } from "react-native";
import { router } from "expo-router";

import { icons } from "../constants";
import { addBookmark, isVideoBookmarked, incrementShareCount } from "../lib/appwrite";
import { useGlobalContext } from "../context/GlobalProvider";

const VideoCard = ({ title, creator, avatar, thumbnail, video, $id: videoId, creatorId }) => {
  const [play, setPlay] = useState(false);
  const { user } = useGlobalContext();

  const shareVideo = async () => {
    try {
      const result = await Share.share({
        message: `Check out this video: ${title} by ${creator}\n${video}`,
        title: title,
      });
      
      if (result.action === Share.sharedAction) {
      
        // Increment share count in database
        try {
          await incrementShareCount(videoId);
         
        } catch (shareError) {
          
          // Don't show error to user since sharing was successful
        }
      }
    } catch (error) {
      
      Alert.alert("Error", "Failed to share video");
    }
  };

  const bookmarkVideo = async () => {
    try {
      if (!user || !user.$id) {
        Alert.alert("Error", "Please login to bookmark videos");
        return;
      }

      // Check if already bookmarked
      const isBookmarked = await isVideoBookmarked(user.$id, videoId);
      
      if (isBookmarked) {
        Alert.alert("Info", "Video is already bookmarked!");
        return;
      }

      // Add bookmark
      const videoData = {
        title,
        creator,
        avatar,
        thumbnail,
        video,
        videoId
      };

      await addBookmark(user.$id, videoId, videoData);
      Alert.alert("Success", "Video added to bookmarks!");
    } catch (error) {
      
      Alert.alert("Error", "Failed to bookmark video");
    }
  };

  const reportVideo = async () => {
    try {
      // TODO: Implement report functionality with Appwrite
      
      Alert.alert("Success", "Video reported successfully!");
    } catch (error) {
      
      Alert.alert("Error", "Failed to report video");
    }
  };

  const handleMenuPress = () => {
    Alert.alert(
      "Video Options",
      "What would you like to do?",
      [
        {
          text: "Share",
          onPress: shareVideo,
        },
        {
          text: "Bookmark",
          onPress: bookmarkVideo,
        },
        {
          text: "Report",
          onPress: reportVideo,
          style: "destructive",
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleProfilePress = () => {
    if (creatorId && creatorId !== user?.$id) {
      router.push(`/profile/${creatorId}`);
    }
  };

  return (
    <View className="flex flex-col items-center px-4 mb-14">
      <View className="flex flex-row gap-3 items-start">
        <View className="flex justify-center items-center flex-row flex-1">
          <TouchableOpacity 
            onPress={handleProfilePress}
            activeOpacity={0.7}
            className="w-[46px] h-[46px] rounded-lg border border-secondary flex justify-center items-center p-0.5"
          >
            <Image
              source={{ uri: avatar }}
              className="w-full h-full rounded-lg"
              resizeMode="cover"
            />
          </TouchableOpacity>

          <View className="flex justify-center flex-1 ml-3 gap-y-1">
            <Text
              className="font-psemibold text-sm text-white"
              numberOfLines={1}
            >
              {title}
            </Text>
            <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
              <Text
                className="text-xs text-gray-100 font-pregular"
                numberOfLines={1}
              >
                {creator}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          className="pt-2" 
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Image source={icons.menu} className="w-5 h-5" resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {play ? (
        <Video
          source={{ uri: video }}
          className="w-full h-60 rounded-xl mt-3"
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          shouldPlay
          onPlaybackStatusUpdate={(status) => {
            if (status.didJustFinish) {
              setPlay(false);
            }
          }}
        />
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setPlay(true)}
          className="w-full h-60 rounded-xl mt-3 relative flex justify-center items-center"
        >
          <Image
            source={{ uri: thumbnail }}
            className="w-full h-full rounded-xl mt-3"
            resizeMode="cover"
          />

          <Image
            source={icons.play}
            className="w-12 h-12 absolute"
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

export default VideoCard;
