import { useState, useEffect } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Image, FlatList, TouchableOpacity, Text, Alert } from "react-native";
import { Query } from 'react-native-appwrite';

import { icons } from "../../constants";
import { databases, appwriteConfig, getNotifications } from "../../lib/appwrite";
import { useGlobalContext } from "../../context/GlobalProvider";
import { images } from "../../constants/images";

// Helper function to get proper avatar URL
const getAvatarUrl = (avatarField) => {
  if (!avatarField) return images.profile;
  
  // If it's already a full URL, return it
  if (avatarField.startsWith('http')) {
    return avatarField;
  }
  
  // If it's just a file ID, construct the full URL
  if (avatarField.length < 50 && !avatarField.includes('/')) {
    return `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.storageId}/files/${avatarField}/preview?width=2000&height=2000&gravity=top&quality=100&project=${appwriteConfig.projectId}`;
  }
  
  // If it's truncated, try to use the original avatar or fallback
  return images.profile;
};

const Inbox = () => {
  const { user: currentUser } = useGlobalContext();
  const [notifications, setNotifications] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    fetchRecentMessages();

    // Add polling for real-time updates
    const intervalId = setInterval(() => {
      fetchRecentMessages();
    }, 2000); // every 2 seconds

    return () => clearInterval(intervalId);
  }, [currentUser]);

  const fetchNotifications = async () => {
    try {
      const notificationsData = await getNotifications(currentUser.$id);
      setNotifications(notificationsData);
    } catch (error) {
     
    }
  };

  const getUnreadCount = (chat) => {
    if (!chat.messages) return 0;
    return chat.messages.filter(
      m => m.receiverId === currentUser.$id && m.is_read === false
    ).length;
  };

  const fetchRecentMessages = async () => {
    try {
      const messagesQuery = Query.equal('participants', currentUser.$id);
      const messagesResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        'chats',
        [messagesQuery]
      );

      // For each chat, fetch its messages
      const chatsWithMessages = await Promise.all(
        messagesResponse.documents.map(async (chat) => {
          const chatMessagesRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.messagesCollectionId,
            [Query.equal('chatId', chat.$id)]
          );
          return { ...chat, messages: chatMessagesRes.documents };
        })
      );

      setRecentMessages(chatsWithMessages);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };
    
  const handleNotificationPress = (notification) => {
    if (notification.type === 'follow') {
      // Navigate to user profile
      router.push(`/profile/${notification.fromUserId}`);
    } else if (notification.type === 'like' || notification.type === 'comment') {
      // Navigate to the post
      router.push(`/post/${notification.postId}`);
    }
  };

  const handleMessagePress = (message) => {
    // Navigate to chat
    router.push({ pathname: '/chat', params: { userId: message.otherUserId } });
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = (now - time) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  const renderNotificationItem = ({ item }) => {
    const isFollow = item.type === 'follow';
    const isLike = item.type === 'like';
    const isComment = item.type === 'comment';

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: item.isRead ? 'transparent' : 'rgba(255, 45, 85, 0.1)',
          borderBottomWidth: 0.5,
          borderBottomColor: '#333'
        }}
      >
        {/* User Avatar */}
        <Image
          source={{ uri: getAvatarUrl(item.fromUserAvatar) }}
          style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
          resizeMode="cover"
        />

        {/* Notification Content */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            {item.fromUsername}
          </Text>
          <Text style={{ color: '#aaa', fontSize: 14 }}>
            {isFollow && 'started following you'}
            {isLike && 'liked your video'}
            {isComment && 'commented on your video'}
          </Text>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {/* Action Button */}
        {isFollow && (
          <TouchableOpacity
            style={{
              backgroundColor: '#ff2d55',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16
            }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
              Follow back
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderMessageItem = ({ item }) => {
    const unreadCount = getUnreadCount(item);
    // Find the latest message from item.messages
    const latestMsg = item.messages && item.messages.length > 0
      ? item.messages.reduce((a, b) => new Date(a.$createdAt) > new Date(b.$createdAt) ? a : b)
      : null;
    return (
      <TouchableOpacity
        onPress={() => handleMessagePress(item)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 0.5,
          borderBottomColor: '#333'
        }}
      >
        {/* User Avatar */}
        <Image
          source={{ uri: item.otherUserAvatar || images.profile }}
          style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
          resizeMode="cover"
        />
        {/* Message Content */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            {item.otherUsername}
          </Text>
          <Text style={{ color: '#aaa', fontSize: 14 }}>
            {latestMsg ? latestMsg.content : ''}
          </Text>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
            {latestMsg ? formatTime(latestMsg.$createdAt) : ''}
          </Text>
        </View>
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <View style={{
            backgroundColor: '#7f5af0',
            borderRadius: 10,
            minWidth: 20,
            paddingHorizontal: 6,
            paddingVertical: 2,
            marginLeft: 8,
            alignItems: 'center'
          }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
              {unreadCount}
            </Text>
          </View>
        )}
        {/* Camera Icon */}
        <TouchableOpacity style={{ marginLeft: 8 }}>
          <Image
            source={icons.camera}
            style={{ width: 24, height: 24, tintColor: '#666' }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ title, count }) => (
    <View style={{
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: '#1a1a1a'
    }}>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
        {title}
      </Text>
      {count > 0 && (
        <View style={{
          backgroundColor: '#ff2d55',
          borderRadius: 10,
          paddingHorizontal: 8,
          paddingVertical: 2
        }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="bg-primary h-full">
        <View className="flex-1 justify-center items-center">
          <Text className="text-white text-lg">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#333'
      }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
            Inbox
          </Text>
        <TouchableOpacity>
          <Image
            source={icons.search}
            style={{ width: 24, height: 24, tintColor: '#fff' }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={[
          { type: 'header', title: 'New followers', count: notifications.filter(n => n.type === 'follow' && !n.isRead).length },
          ...notifications.filter(n => n.type === 'follow'),
          { type: 'header', title: 'Activity', count: notifications.filter(n => (n.type === 'like' || n.type === 'comment') && !n.isRead).length },
          ...notifications.filter(n => n.type === 'like' || n.type === 'comment'),
          { type: 'header', title: 'Recent messages', count: recentMessages.length },
          ...recentMessages
        ]}
        keyExtractor={(item, index) => item.type === 'header' ? `header-${index}` : item.$id || `item-${index}`}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return renderSectionHeader({ title: item.title, count: item.count });
          } else if (item.type === 'follow' || item.type === 'like' || item.type === 'comment') {
            return renderNotificationItem({ item });
          } else {
            return renderMessageItem({ item });
          }
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default Inbox; 