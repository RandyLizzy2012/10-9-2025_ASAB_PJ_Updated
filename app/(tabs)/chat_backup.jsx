import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from 'expo-image-picker';
import * as VideoPicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, Modal as RNModal, Pressable } from "react-native";
import { Query } from 'react-native-appwrite';
import { SafeAreaView } from "react-native-safe-area-context";
import { account, appwriteConfig, databases, getCurrentUser, storage, uploadFile } from '../../lib/appwrite';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Contacts from 'expo-contacts';
import * as Location from 'expo-location';
import { Video } from 'expo-av';

const Chat = () => {
  const navigation = useNavigation();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  // Chat window hooks (always at top level)
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [messagedUserIds, setMessagedUserIds] = useState(new Set());
  const [receivedFromUsers, setReceivedFromUsers] = useState(new Map());
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [chattedUserIds, setChattedUserIds] = useState(new Set());
  const [messageCounts, setMessageCounts] = useState(new Map());
  const [allMessages, setAllMessages] = useState([]);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [chatReads, setChatReads] = useState([]); // New state for chat reads
  const [recentlyMessagedUserId, setRecentlyMessagedUserId] = useState(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState(null);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [soundObj, setSoundObj] = useState(null);
  const [audioPlaybackStatus, setAudioPlaybackStatus] = useState({});

  // Add this function at the top level of the component
  // Update fetchMessagesForChat to only append new messages
  const fetchMessagesForChat = async (chatUserOrGroup) => {
    let newMessages = [];
    if (chatUserOrGroup.type === 'group') {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        [Query.equal('chatId', [chatUserOrGroup.$id]), Query.orderDesc('$createdAt')]
      );
      newMessages = res.documents.reverse();
    } else {
      // Private chat: fetch all messages between currentUser and selectedUser
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        [
          Query.or([
            Query.and([
              Query.equal('senderId', [currentUser?.$id]),
              Query.equal('receiverId', [chatUserOrGroup.$id])
            ]),
            Query.and([
              Query.equal('senderId', [chatUserOrGroup.$id]),
              Query.equal('receiverId', [currentUser?.$id])
            ])
          ]),
          Query.orderDesc('$createdAt')
        ]
      );
      newMessages = res.documents.reverse();
    }
    setMessages(prev => {
      const existingIds = new Set(prev.map(m => m.$id));
      const merged = [...prev];
      newMessages.forEach(m => {
        if (!existingIds.has(m.$id)) merged.push(m);
      });
      // Sort by $createdAt ascending
      merged.sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt));
      return merged;
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Check for session first
        const session = await account.getSession('current');
        if (!session) {
          Alert.alert('Please sign in first');
          router.replace('/sign-in');
          return;
        }
        // Use user document for currentUser
        const userDoc = await getCurrentUser();
        setCurrentUser(userDoc);
        // Fetch all users (from your user profile collection)
        const userRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId
        );
        setUsers(userRes.documents);
        // Fetch all chats/groups where current user is a member
        const chatRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.chatsCollectionId,
          [Query.contains('members', [userDoc.$id])]
        );
        setChats(chatRes.documents.filter(c => c.type === 'private'));
        setGroups(chatRes.documents.filter(c => c.type === 'group'));
        // Fetch all messages where current user is sender or receiver
        const messagesRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.messagesCollectionId,
          [
            Query.or([
              Query.equal('senderId', [userDoc.$id]),
              Query.equal('receiverId', [userDoc.$id])
            ])
          ]
        );
        setAllMessages(messagesRes.documents); // Store all messages for inbox preview
        // Build a map of users who have messaged me and count
        const receivedMap = new Map();
        messagesRes.documents.forEach(msg => {
          if (
            msg.receiverId === userDoc.$id &&
            msg.senderId !== userDoc.$id
          ) {
            receivedMap.set(
              msg.senderId,
              (receivedMap.get(msg.senderId) || 0) + 1
            );
          }
        });
        setReceivedFromUsers(receivedMap);
        // Build a set of user IDs for users I have chatted with (sent or received)
        const chatIds = new Set();
        const counts = new Map();
        messagesRes.documents.forEach(msg => {
          // If I received a message from someone
          if (msg.receiverId === userDoc.$id && msg.senderId !== userDoc.$id) {
            chatIds.add(msg.senderId);
            counts.set(msg.senderId, (counts.get(msg.senderId) || 0) + 1);
          }
          // If I sent a message to someone
          if (msg.senderId === userDoc.$id && msg.receiverId && msg.receiverId !== userDoc.$id) {
            chatIds.add(msg.receiverId);
            // Optionally, you can count sent messages too if you want
          }
        });
        setChattedUserIds(chatIds);
        setMessageCounts(counts);

        // Fetch chat reads for the current user
        const chatReadRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.chatReadsCollectionId,
          [Query.equal('userId', [userDoc.$id])]
        );
        setChatReads(chatReadRes.documents);

      } catch (e) {
        Alert.alert('Error', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 1. Robust polling for allMessages every 2 seconds
  useEffect(() => {
    if (!currentUser) return;
    let intervalId = null;
    const pollAllMessages = async () => {
      try {
        const groupIds = groups.map(g => g.$id);
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.messagesCollectionId,
          [
            Query.or([
              Query.equal('senderId', [currentUser.$id]),
              Query.equal('receiverId', [currentUser.$id]),
              ...(groupIds.length > 0 ? [Query.equal('chatId', groupIds)] : [])
            ])
          ]
        );
        setAllMessages(prev => {
          const optimistic = prev.filter(m => m.optimistic);
          const confirmed = res.documents;
          const stillOptimistic = optimistic.filter(om => {
            return !confirmed.some(cm =>
              cm.content === om.content &&
              cm.senderId === om.senderId &&
              cm.receiverId === om.receiverId &&
              cm.type === om.type &&
              Math.abs(new Date(cm.$createdAt) - new Date(om.$createdAt)) < 10000
            );
          });
          return [...confirmed, ...stillOptimistic];
        });
      } catch (e) {}
    };
    pollAllMessages();
    intervalId = setInterval(pollAllMessages, 2000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentUser, groups]);

  // Replace polling for open chat with logic that fetches and sets only that chat's messages, and marks unread as read
  useEffect(() => {
    if (!selectedUser || !selectedUser.$id || !currentUser) return;
    let intervalId = null;
    const fetchAndMarkRead = async () => {
      let newMessages = [];
      if (selectedUser.type === 'group') {
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.messagesCollectionId,
          [Query.equal('chatId', [selectedUser.$id]), Query.orderDesc('$createdAt')]
        );
        newMessages = res.documents.reverse();
      } else {
        const res = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.messagesCollectionId,
          [
            Query.or([
              Query.and([
                Query.equal('senderId', [currentUser.$id]),
                Query.equal('receiverId', [selectedUser.$id])
              ]),
              Query.and([
                Query.equal('senderId', [selectedUser.$id]),
                Query.equal('receiverId', [currentUser.$id])
              ])
            ]),
            Query.orderDesc('$createdAt')
          ]
        );
        newMessages = res.documents.reverse();
      }
      setMessages(newMessages); // Replace, not append
      // Mark all unread messages as read
      const unread = newMessages.filter(m => m.receiverId === currentUser.$id && m.is_read === false);
      for (const msg of unread) {
        try {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.messagesCollectionId,
            msg.$id,
            { is_read: true }
          );
          setAllMessages(prev =>
            prev.map(m =>
              m.$id === msg.$id ? { ...m, is_read: true } : m
            )
          );
        } catch (e) {}
      }
    };
    fetchAndMarkRead(); // Initial fetch and mark
    intervalId = setInterval(fetchAndMarkRead, 3000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [selectedUser, currentUser]);

  // Centralized sendMessage function
  const sendMessage = async ({ type, content = '', fileUrl = '', optimistic = true }) => {
    if (sending) return;
    setSending(true);

    // Prepare message fields
    const messageData = {
      chatId: selectedUser.$id,
      senderId: currentUser.$id,
      receiverId: selectedUser.type === 'group'
        ? selectedUser.$id
        : selectedUser.$id === currentUser.$id
          ? null
          : selectedUser.$id,
      type,
      content: type === 'text' ? content : '',
      fileUrl: type !== 'text' ? (fileUrl || content) : '',
    };

    // Optimistic UI update
    if (optimistic) {
      const tempId = 'temp-' + Date.now();
      const optimisticMessage = {
        $id: tempId,
        ...messageData,
        $createdAt: new Date().toISOString(),
        optimistic: true,
      };
      setMessages(prev => [...prev, optimisticMessage]);
      setAllMessages(prev => [...prev, optimisticMessage]);
      setRecentlyMessagedUserId(selectedUser.$id);
      if (type === 'text') setMessageText("");
    }

    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        "unique()",
        {
          ...messageData,
          // For backward compatibility, store fileUrl in content if fileUrl is not present
          content: type === 'text' ? content : (fileUrl || content),
          fileUrl: type !== 'text' ? (fileUrl || content) : '',
        }
      );
      // Real-time subscription will update the list with the real message
    } catch (e) {
      Alert.alert('Error', e.message);
      // Remove optimistic message if sending fails
      setMessages(prev => prev.filter(m => !m.optimistic));
      setAllMessages(prev => prev.filter(m => !m.optimistic));
    } finally {
      setSending(false);
    }
  };

  // Refactor text message send
  const handleSendText = () => {
    if (!messageText.trim() || sending) return;
    sendMessage({ type: 'text', content: messageText.trim() });
  };

  // Handler for camera button
  const handleCameraPress = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Camera permission is required to take photos or record videos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || asset.name || asset.uri.split('/').pop() || `file_${Date.now()}`;
        const fileType = asset.type === 'image' ? 'image/jpeg' : asset.type === 'video' ? 'video/mp4' : asset.type;
        const fileSize = asset.fileSize || asset.size;
        const file = {
          uri: asset.uri,
          name: fileName,
          type: fileType,
          size: fileSize,
        };
        const fileUrl = await uploadFile(file, asset.type === 'video' ? 'video' : 'image');
        await sendMessage({
          type: asset.type === 'video' ? 'video' : 'image',
          fileUrl: fileUrl.href || fileUrl,
          content: '',
        });
        setShowAttachmentOptions(false);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Refactor video handler
  const handleVideoPress = async () => {
    try {
      const permission = await VideoPicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Camera permission is required to record videos.');
        return;
      }
      const result = await VideoPicker.launchCameraAsync({
        mediaTypes: VideoPicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        const response = await fetch(video.uri);
        const blob = await response.blob();
        const fileName = video.uri.split('/').pop();
        const fileType = video.type || 'video/mp4';
        const file = new File([blob], fileName, { type: fileType });
        let uploaded;
        try {
          uploaded = await storage.createFile(
            appwriteConfig.storageId,
            "unique()",
            file
          );
        } catch (e) {
          Alert.alert('Upload error', e.message);
          return;
        }
        if (!uploaded || !uploaded.$id) {
          Alert.alert('Upload failed', 'No file ID returned from Appwrite.');
          return;
        }
        const fileUrl = storage.getFileView(appwriteConfig.storageId, uploaded.$id);
        await sendMessage({
          type: 'video',
          fileUrl: fileUrl.href || fileUrl,
          content: '',
        });
        setShowAttachmentOptions(false);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Handler for audio recording
  const handleRecordPress = async () => {
    setAudioModalVisible(true);
  };

  // Handler for contact sharing
  const handleContactPress = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Contacts permission is required to share contacts.');
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (contact) {
        // Prepare minimal contact info
        const contactInfo = {
          name: contact.name || '',
          phone: contact.phoneNumbers && contact.phoneNumbers.length > 0 ? contact.phoneNumbers[0].number : '',
          email: contact.emails && contact.emails.length > 0 ? contact.emails[0].email : '',
        };
        await sendMessage({
          type: 'contact',
          content: JSON.stringify(contactInfo),
        });
        setShowAttachmentOptions(false);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Handler for gallery image picking
  const handleGalleryPress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'video/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        for (const asset of result.assets) {
          const fileType = asset.mimeType || (fileName.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
          const isVideo = fileType.startsWith('video');
          const fileUrl = await uploadFile(asset, isVideo ? 'video' : 'image');
          await sendMessage({
            type: isVideo ? 'video' : 'image',
            fileUrl: fileUrl.href || fileUrl,
            content: '',
          });
        }
        setShowAttachmentOptions(false);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Handler for location sharing
  const handleLocationPress = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Location permission is required to share your location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let address = '';
      try {
        const geocode = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geocode && geocode.length > 0) {
          address = `${geocode[0].name || ''} ${geocode[0].street || ''}, ${geocode[0].city || ''}, ${geocode[0].region || ''}`.trim();
        }
      } catch {}
      const locationInfo = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        address,
      };
      await sendMessage({
        type: 'location',
        content: JSON.stringify(locationInfo),
      });
      setShowAttachmentOptions(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Handler for document picking
  const handleDocumentPress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.name || asset.fileName || asset.uri.split('/').pop() || `file_${Date.now()}`;
        const fileType = asset.mimeType || 'application/octet-stream';
        const fileSize = asset.size;
        const file = {
          uri: asset.uri,
          name: fileName,
          type: fileType,
          size: fileSize,
        };
        const fileUrl = await uploadFile(file, 'document');
        await sendMessage({
          type: 'document',
          fileUrl: fileUrl.href || fileUrl,
          content: fileName,
        });
        setShowAttachmentOptions(false);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // Build a set of user IDs for all users you have messaged or who have messaged you
  const chatPartnerIds = new Set();
  allMessages.forEach(msg => {
    if (msg.senderId === currentUser?.$id && msg.receiverId && msg.receiverId !== currentUser?.$id) {
      chatPartnerIds.add(msg.receiverId);
    }
    if (msg.receiverId === currentUser?.$id && msg.senderId && msg.senderId !== currentUser?.$id) {
      chatPartnerIds.add(msg.senderId);
    }
  });
  // Filter users for chat list: only those in chatPartnerIds or the selectedUser
  const filteredUsers = users.filter(u =>
    u.$id !== currentUser?.$id &&
    (
      chatPartnerIds.has(u.$id) ||
      (selectedUser && u.$id === selectedUser.$id)
    ) &&
    (u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  // 2. Always include the messaged user in the chat list and sort to top
  let displayedUsers = [...filteredUsers];
  if (
    selectedUser &&
    selectedUser.$id !== currentUser?.$id &&
    !displayedUsers.some(u => u.$id === selectedUser.$id)
  ) {
    displayedUsers.push(selectedUser);
  }

  // Filter groups for chat list
  const filteredGroups = groups.filter(g =>
    g.name?.toLowerCase().includes(search.toLowerCase())
  );

  // Always include all groups the user is a member of
  const displayedGroups = [...filteredGroups];

  // Combine users and groups for the chat list
  let displayedChats = [...displayedGroups, ...displayedUsers];

  // Place these helper functions before chat list logic
  const getLastMessage = (item) => {
    if (item.type === 'group') {
      return allMessages
        .filter(m => m.chatId === item.$id)
        .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))[0];
    } else {
      return allMessages
        .filter(m =>
          (m.senderId === currentUser?.$id && m.receiverId === item.$id) ||
          (m.senderId === item.$id && m.receiverId === currentUser?.$id)
        )
        .sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt))[0];
    }
  };

  const getUnreadCount = (item) => {
    if (item.type === 'group') {
      return allMessages.filter(m =>
        m.chatId === item.$id &&
        m.is_read === false &&
        m.receiverId === currentUser?.$id &&
        !m.optimistic
      ).length;
    } else {
      return allMessages.filter(m =>
        m.senderId === item.$id &&
        m.receiverId === currentUser?.$id &&
        m.is_read === false &&
        !m.optimistic
      ).length;
    }
  };

  displayedChats.sort((a, b) => {
    const aLast = getLastMessage(a)?.$createdAt
      ? new Date(getLastMessage(a).$createdAt)
      : (selectedUser && a.$id === selectedUser.$id && messages.length > 0
          ? new Date(messages[messages.length - 1].$createdAt)
          : new Date(0));
    const bLast = getLastMessage(b)?.$createdAt
      ? new Date(getLastMessage(b).$createdAt)
      : (selectedUser && b.$id === selectedUser.$id && messages.length > 0
          ? new Date(messages[messages.length - 1].$createdAt)
          : new Date(0));
    return bLast - aLast;
  });

  const totalUnread = displayedChats.reduce((sum, item) => sum + getUnreadCount(item), 0);
  const groupCount = displayedGroups.length;

  const getPrivateChatDocForUser = (userId) => {
    return chats.find(
      c => c.type === 'private' && c.members.includes(userId) && c.members.includes(currentUser?.$id)
    );
  };

 

  
  if (loading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#181A20', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff' }}>Loading...</Text></SafeAreaView>;
  }

  const handleOpenChat = async (item) => {
    setMessages([]);
    setSelectedUser(item);
    fetchMessagesForChat(item);
    // Update lastReadAt in chatReads
    let chatRead = chatReads.find(r => r.chatId === item.$id);
    const nowIso = new Date().toISOString();
    try {
      if (chatRead) {
        await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.chatReadsCollectionId,
          chatRead.$id,
          { lastReadAt: nowIso }
        );
        setChatReads(prev =>
          prev.map(r =>
            r.chatId === item.$id ? { ...r, lastReadAt: nowIso } : r
          )
        );
      } else {
        const newRead = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.chatReadsCollectionId,
               "unique()",

          {
            userId: currentUser.$id,
            chatId: item.$id,
            lastReadAt: nowIso,
          }
        );
        setChatReads(prev => [...prev, newRead]);
      }
    } catch (e) {}
  };

  const toggleFavourite = async (item) => {
    // For user chats, find or create the private chat document
    if (!item.type || (item.type !== 'group' && item.type !== 'private')) {
      try {
        // Find the private chat doc for this user
        const existing = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.chatsCollectionId,
          [
            Query.equal('type', ['private']),
            Query.contains('members', [currentUser.$id]),
            Query.contains('members', [item.$id])
          ]
        );
        let chatDoc;
        if (existing.documents && existing.documents.length > 0) {
          chatDoc = existing.documents[0];
          // Toggle isFavourite
          const isFavourite = !chatDoc.isFavourite;
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.chatsCollectionId,
            chatDoc.$id,
            { isFavourite }
          );
          setChats(prev =>
            prev.map(c => c.$id === chatDoc.$id ? { ...c, isFavourite } : c)
          );
        } else {
          // Create a new private chat document with isFavourite: true
          chatDoc = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.chatsCollectionId,
                 "unique()",

            {
              type: 'private',
              members: [currentUser.$id, item.$id],
              isFavourite: true
            }
          );
          setChats(prev => [...prev, chatDoc]);
        }
        return;
      } catch (e) {
        Alert.alert('Error', e.message);
        return;
      }
    }
    // If group or private chat document, just toggle
    try {
      const isFavourite = !item.isFavourite;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.chatsCollectionId,
        item.$id,
        { isFavourite: isFavourite }
      );
      setChats(prev =>
        prev.map(c => (c.$id === item.$id ? { ...c, isFavourite: isFavourite } : c))
      );
      setGroups(prev =>
        prev.map(g => (g.$id === item.$id ? { ...g, isFavourite: isFavourite } : g))
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  let filteredChats = [...displayedChats];

  if (selectedTab === 'unread') {
    filteredChats = filteredChats.filter(item => getUnreadCount(item) > 0);
  }
  if (selectedTab === 'favourites') {
    filteredChats = filteredChats.filter(item => {
      if (item.type === 'group' || item.type === 'private') {
        return item.isFavourite;
      } else {
        // User chat: check if a private chat doc exists and isFavourite
        const chatDoc = getPrivateChatDocForUser(item.$id);
        return chatDoc && chatDoc.isFavourite;
      }
    });
  }
  if (selectedTab === 'groups') {
    filteredChats = filteredChats.filter(item => item.type === 'group');
  }
  if (selectedTab === 'users') {
    filteredChats = filteredChats.filter(item => !item.type || item.type !== 'group');
  }

  // Audio recording handler
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to start recording: ' + err.message);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setAudioModalVisible(false);
      if (uri) {
        // Copy to cache for upload
        const fileName = `audio_${Date.now()}.m4a`;
        const cacheUri = FileSystem.cacheDirectory + fileName;
        await FileSystem.copyAsync({ from: uri, to: cacheUri });
        const fileInfo = await FileSystem.getInfoAsync(cacheUri);
        const file = {
          uri: cacheUri,
          name: fileName,
          type: 'audio/m4a',
          size: fileInfo.size,
        };
        const fileUrl = await uploadFile(file, 'audio');
        await sendMessage({
          type: 'audio',
          fileUrl: fileUrl.href || fileUrl,
          content: '',
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to save recording: ' + err.message);
    }
  };

  const cancelRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
      } catch {}
      setRecording(null);
    }
    setIsRecording(false);
    setAudioModalVisible(false);
  };

  // Audio playback
  const playAudio = async (audioUrl, messageId) => {
    try {
      if (soundObj) {
        await soundObj.unloadAsync();
        setSoundObj(null);
        setPlayingAudioId(null);
      }
      const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, {}, (status) => setAudioPlaybackStatus(status));
      setSoundObj(sound);
      setPlayingAudioId(messageId);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        setAudioPlaybackStatus(status);
        if (status.didJustFinish) {
          setPlayingAudioId(null);
          sound.unloadAsync();
        }
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to play audio: ' + err.message);
    }
  };

  const pauseAudio = async () => {
    if (soundObj) {
      await soundObj.pauseAsync();
      setPlayingAudioId(null);
    }
  };

  return (
    <>
      {/* Main UI: either chat list or chat window */}
      {(!selectedUser) ? (
      <SafeAreaView className="bg-primary h-full">
        <LinearGradient colors={["#a8edea", "#fed6e3", "#7f5af0"]} start={{x:0, y:0}} end={{x:1, y:1}} style={{ paddingTop: 32, paddingBottom: 24, paddingHorizontal: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, height: 44, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 }}>
              <MaterialCommunityIcons name="magnify" size={22} color="#888" />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: '#222', fontSize: 16 }}
                placeholder="Search"
                placeholderTextColor="#aaa"
                value={search}
                onChangeText={setSearch}
              />
              </View>
            </View>
          </LinearGradient>
          {/* Tab Bar */}
          <View style={{ flexDirection: 'row', marginTop: 10, marginBottom: 4, marginHorizontal: 10 }}>
            {['all', 'unread', 'favourites', 'groups', 'users'].map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setSelectedTab(tab)}
                style={{
                  backgroundColor: selectedTab === tab ? '#232533' : 'transparent',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  marginRight: 8,
                  borderWidth: selectedTab === tab ? 0 : 1,
                  borderColor: '#444',
                }}
              >
                <Text style={{
                  color: selectedTab === tab ? '#7f5af0' : '#aaa',
                  fontWeight: selectedTab === tab ? 'bold' : 'normal',
                  fontSize: 15
                }}>
                  {tab === 'all' && 'All'}
                  {tab === 'unread' && `Unread${totalUnread > 0 ? ' ' + totalUnread : ''}`}
                  {tab === 'favourites' && 'Favourites'}
                  {tab === 'groups' && `Groups${groupCount > 0 ? ' ' + groupCount : ''}`}
                  {tab === 'users' && 'User Chats'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {/* Chat List */}
          <FlatList
            data={filteredChats}
            keyExtractor={item => item.$id}
            renderItem={({ item }) => {
              const unreadCount = getUnreadCount(item);
              if (item.type === 'group') {
                // Group avatars: up to 3, then +N
                const groupMembers = users.filter(u => item.members.includes(u.$id));
                const maxAvatars = 3;
                const extraCount = groupMembers.length - maxAvatars;
                // Last message
                const groupMessages = allMessages.filter(m => m.chatId === item.$id);
                const lastMsg = groupMessages.length > 0 ? groupMessages[groupMessages.length - 1] : null;
                // Unread count
                return (
                  <TouchableOpacity onPress={() => handleOpenChat(item)} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 0.5, borderBottomColor: '#232533', backgroundColor: '#181A20', borderRadius: 16, marginHorizontal: 6, marginVertical: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14, width: 54 }}>
                      {groupMembers.slice(0, maxAvatars).map((u, i) => (
                        <Image key={u.$id} source={{ uri: u.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.username || u.email || 'User') }} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#181A20', position: 'absolute', left: i * 18, zIndex: 10 - i, backgroundColor: '#232533' }} />
                      ))}
                      {extraCount > 0 && (
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#232533', justifyContent: 'center', alignItems: 'center', position: 'absolute', left: maxAvatars * 18, zIndex: 1, borderWidth: 2, borderColor: '#181A20' }}>
                          <Text style={{ color: '#7f5af0', fontWeight: 'bold', fontSize: 13 }}>+{extraCount}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }} numberOfLines={1}>{item.name || 'Unnamed Group'}</Text>
                      <Text style={{ color: '#aaa', fontSize: 14, marginTop: 2 }} numberOfLines={1}>
                        {lastMsg
                          ? lastMsg.type === 'image'
                            ? '📷 Photo'
                            : lastMsg.type === 'video'
                              ? '🎥 Video'
                              : lastMsg.type === 'audio'
                                ? '🎤 Audio'
                                : lastMsg.type === 'document'
                                  ? '📄 Document'
                                  : lastMsg.type === 'location'
                                    ? '📍 Location'
                                    : lastMsg.type === 'contact'
                                      ? '👤 Contact'
                                      : lastMsg.content
                          : 'No messages yet'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 60 }}>
                      {lastMsg && (
                        <Text style={{ color: '#aaa', fontSize: 13 }}>
                          {(() => {
                            const d = new Date(lastMsg.$createdAt);
                            const now = new Date();
                            if (d.toDateString() === now.toDateString()) {
                              return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                            } else {
                              return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
                            }
                          })()}
                        </Text>
                      )}
                      {unreadCount > 0 && (
                        <View style={{ backgroundColor: '#7f5af0', borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{unreadCount}</Text>
                        </View>
                      )}
                      {/* Favourite star */}
                      {(item.type === 'group' || item.type === 'private') && (
                        <TouchableOpacity onPress={() => toggleFavourite(item)} style={{ marginTop: 6 }}>
                          <MaterialCommunityIcons
                            name={item.isFavourite ? 'star' : 'star-outline'}
                            size={22}
                            color={item.isFavourite ? '#FFD700' : '#aaa'}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              } else {
                // Individual chat
                const userMessages = allMessages.filter(m =>
                  (m.senderId === currentUser?.$id && m.receiverId === item.$id) ||
                  (m.senderId === item.$id && m.receiverId === currentUser?.$id)
                );
                const lastMsg = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
                const chatDoc = getPrivateChatDocForUser(item.$id);
                const isFavourite = chatDoc ? chatDoc.isFavourite : false;
                
                return (
                  <TouchableOpacity onPress={() => handleOpenChat(item)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: '#232533', backgroundColor: '#181A20', borderRadius: 16, marginHorizontal: 6, marginVertical: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2 }}>
                    <Image source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.username || item.email || 'User') }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 14, backgroundColor: '#232533', borderWidth: 2, borderColor: '#181A20' }} />
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }} numberOfLines={1}>{item.username || item.email || 'Unknown User'}</Text>
                      <Text style={{ color: '#aaa', fontSize: 14, marginTop: 2 }} numberOfLines={1}>
                        {lastMsg
                          ? lastMsg.type === 'image'
                            ? '📷 Photo'
                            : lastMsg.type === 'video'
                              ? '🎥 Video'
                              : lastMsg.type === 'audio'
                                ? '🎤 Audio'
                                : lastMsg.type === 'document'
                                  ? '📄 Document'
                                  : lastMsg.type === 'location'
                                    ? '📍 Location'
                                    : lastMsg.type === 'contact'
                                      ? '👤 Contact'
                                      : lastMsg.content
                          : 'No messages yet'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', minWidth: 60 }}>
                      {lastMsg && (
                        <Text style={{ color: '#aaa', fontSize: 13 }}>
                          {(() => {
                            const d = new Date(lastMsg.$createdAt);
                            const now = new Date();
                            if (d.toDateString() === now.toDateString()) {
                              return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                            } else {
                              return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
                            }
                          })()}
                        </Text>
                      )}
                      {unreadCount > 0 && (
                        <View style={{ backgroundColor: '#7f5af0', borderRadius: 10, minWidth: 20, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{unreadCount}</Text>
                        </View>
                      )}
                      {/* Favourite star for user chats, using chatDoc */}
                      <TouchableOpacity onPress={() => toggleFavourite(item)} style={{ marginTop: 6 }}>
                        <MaterialCommunityIcons
                          name={isFavourite ? 'star' : 'star-outline'}
                          size={22}
                          color={isFavourite ? '#FFD700' : '#aaa'}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }
            }}
            contentContainerStyle={{ paddingBottom: 16 }}
            ListEmptyComponent={() => (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: '#aaa', fontSize: 16 }}>No users or groups found.</Text>
              </View>
            )}
          />
          {/* Floating New Chat Button (only if not in Groups tab) */}
          {selectedTab !== 'groups' && (
            <TouchableOpacity
              onPress={() => setShowUserSearch(true)}
              style={{
                position: 'absolute',
                bottom: 32,
                right: 32,
                backgroundColor: '#7f5af0',
                borderRadius: 24,
                padding: 16,
                zIndex: 10
              }}
            >
              <MaterialCommunityIcons name="account-plus" size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {/* Floating Create Group Button (only if in Groups tab) */}
          {selectedTab === 'groups' && (
            <View style={{ position: 'absolute', bottom: 32, left: 24, right: 24 }}>
              <TouchableOpacity
                onPress={() => setShowCreateGroup(true)}
                style={{
                  backgroundColor: '#7f5af0',
                  borderRadius: 8,
                  padding: 16,
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>+ Create Group</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      ) : selectedUser && !selectedUser.$id ? (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#181A20', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff' }}>Invalid user or group selected.</Text>
        </SafeAreaView>
      ) : (
        // Chat window UI
        <SafeAreaView style={{ flex: 1, backgroundColor: '#181A20' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#232533', backgroundColor: '#232533' }}>
            <TouchableOpacity onPress={() => setSelectedUser(null)} style={{ marginRight: 12 }}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
            {selectedUser.type === 'group' ? (
              <MaterialCommunityIcons name="account-group" size={36} color="#7DE2FC" style={{ marginRight: 12 }} />
            ) : (
              <Image source={{ uri: selectedUser.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(selectedUser.username || selectedUser.email || 'User') }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }} />
            )}
            <View>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{selectedUser.name || selectedUser.username || selectedUser.email || 'Unknown'}</Text>
              <Text style={{ color: '#aaa', fontSize: 13 }}>{selectedUser.type === 'group' ? 'Group chat' : 'User'}</Text>
            </View>
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
          >
            {/* Messages */}
            <FlatList
              data={messages.filter(m => m.content)}
              keyExtractor={item => item.$id}
              renderItem={({ item, index }) => {
                const isMe = item.senderId === currentUser.$id;
                const isOther = item.senderId === selectedUser.$id;
                const sender = users.find(u => u.$id === item.senderId);
                // Group messages from the same sender
                const prev = messages[index - 1];
                const isFirstOfGroup = !prev || prev.senderId !== item.senderId;
                const d = new Date(item.$createdAt);
                const now = new Date();
                const showDate = d.toDateString() !== now.toDateString();
                return (
                  <View style={{
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    marginTop: isFirstOfGroup ? 12 : 2,
                    marginBottom: 2,
                    marginHorizontal: 8,
                  }}>
                    <Image
                      source={{ uri: sender?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(sender?.username || sender?.email || 'User') }}
                      style={{ width: 0, height: 0, marginHorizontal: 0, display: 'none' }} // Hide avatar for now
                    />
                    <View style={{
                      backgroundColor: isMe ? '#7f5af0' : isOther ? '#fff' : '#e5e5ea',
                      borderRadius: 18,
                      borderBottomRightRadius: isMe ? 4 : 18,
                      borderBottomLeftRadius: isMe ? 18 : 4,
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      maxWidth: '75%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                      shadowColor: '#000',
                      shadowOpacity: 0.06,
                      shadowRadius: 4,
                    }}>
                      {item.type === 'contact' ? (() => {
                        let contact = null;
                        try { contact = JSON.parse(item.content); } catch {}
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isMe ? '#1e3a2f' : '#f5f5f5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 220, marginBottom: 6 }}>
                            <MaterialCommunityIcons name="account-box" size={18} color={isMe ? '#fff' : '#7f5af0'} style={{ marginRight: 8 }} />
                            <Text style={{ color: isMe ? '#fff' : '#222', fontSize: 15, fontWeight: 'bold' }} numberOfLines={1}>
                              {contact?.name || 'Contact'}{contact?.phone ? ` • ${contact.phone}` : ''}{contact?.email ? ` • ${contact.email}` : ''}
                            </Text>
                          </View>
                        );
                      })() : item.type === 'audio' ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isMe ? '#1e3a2f' : '#f5f5f5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, maxWidth: 240, marginBottom: 6 }}>
                          <TouchableOpacity
                            onPress={() => playingAudioId === item.$id ? pauseAudio() : playAudio(item.fileUrl || item.content, item.$id)}
                            style={{ marginRight: 10 }}
                          >
                            <MaterialCommunityIcons name={playingAudioId === item.$id ? 'pause-circle' : 'play-circle'} size={32} color={isMe ? '#fff' : '#7f5af0'} />
                          </TouchableOpacity>
                          <Text style={{ color: isMe ? '#fff' : '#222', fontSize: 15 }}>
                            {audioPlaybackStatus.durationMillis ? `${Math.floor((audioPlaybackStatus.durationMillis/1000) % 60)}s` : 'Audio message'}
                          </Text>
                        </View>
                      ) : item.type === 'video' ? (
                        <Video
                          source={{ uri: item.fileUrl || item.content }}
                          style={{ width: 220, height: 180, borderRadius: 12, marginBottom: 6, backgroundColor: '#000' }}
                          useNativeControls
                          resizeMode="contain"
                          shouldPlay={false}
                          isLooping={false}
                        />
                      ) : item.type === 'image' ? (
                        <TouchableOpacity onPress={() => {
                          setModalImageUrl(item.fileUrl || item.content);
                          setImageModalVisible(true);
                        }}>
                          <Image source={{ uri: item.fileUrl || item.content }} style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 6 }} resizeMode="cover" />
                        </TouchableOpacity>
                      ) : item.type === 'document' ? (
                        <View
                          style={{ backgroundColor: isMe ? '#1e3a2f' : '#f5f5f5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, maxWidth: 240, marginBottom: 6, flexDirection: 'row', alignItems: 'center' }}
                        >
                          <MaterialCommunityIcons name="file-document" size={26} color={isMe ? '#fff' : '#7f5af0'} style={{ marginRight: 8 }} />
                          <Text style={{ color: isMe ? '#fff' : '#222', fontWeight: 'bold', fontSize: 15, flexShrink: 1 }} numberOfLines={1}>
                            {item.content || 'Document'}
                          </Text>
                          {!isMe && (
                            <TouchableOpacity
                              onPress={() => Linking.openURL(item.fileUrl || item.content)}
                              style={{ marginLeft: 8, padding: 4 }}
                              activeOpacity={0.7}
                            >
                              <MaterialCommunityIcons name="arrow-down-circle" size={20} color={'#7f5af0'} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ) : item.type === 'location' ? (() => {
                        let loc = null;
                        try { loc = JSON.parse(item.content); } catch {}
                        const coords = loc ? `${loc.latitude?.toFixed(5)}, ${loc.longitude?.toFixed(5)}` : '';
                        const mapsUrl = loc ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}` : '';
                        return (
                          <TouchableOpacity
                            onPress={() => mapsUrl && Linking.openURL(mapsUrl)}
                            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isMe ? '#1e3a2f' : '#f5f5f5', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, maxWidth: 220, marginBottom: 6 }}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name="map-marker" size={18} color={isMe ? '#fff' : '#7f5af0'} style={{ marginRight: 8 }} />
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={{ color: isMe ? '#fff' : '#222', fontWeight: 'bold', fontSize: 15 }} numberOfLines={1}>
                                {loc?.address ? loc.address : coords || 'Location'}
                              </Text>
                              {coords && !loc?.address ? (
                                <Text style={{ color: isMe ? '#b2f5ea' : '#888', fontSize: 12 }}>{coords}</Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })() : (
                        <Text style={{ color: isMe ? '#fff' : '#222', fontSize: 16 }}>{item.content}</Text>
                      )}
                      <Text style={{
                        color: '#aaa',
                        fontSize: 11,
                        marginTop: 4,
                        textAlign: isMe ? 'right' : 'left',
                      }}>
                        {showDate
                          ? d.toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                          : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </Text>
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', padding: 8 }}
            />
            {/* Input */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#232533' }}>
              <TouchableOpacity 
                onPress={() => setShowAttachmentOptions(!showAttachmentOptions)}
                style={{
                  width: 36, height: 36, borderRadius: 18, backgroundColor: '#181A20', justifyContent: 'center', alignItems: 'center', marginRight: 8
                }}>
                <MaterialCommunityIcons name="plus" size={22} color="#7f5af0" />
              </TouchableOpacity>
              {/* Attachment Options Section */}
              {showAttachmentOptions && (
                <View style={{
                  position: 'absolute',
                  bottom: 60,
                  left: 10,
                  right: 10,
                  backgroundColor: '#232533',
                  borderRadius: 16,
                  padding: 16,
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  zIndex: 100,
                  shadowColor: '#000',
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                }}>
                  <View style={{ alignItems: 'center', width: '30%', marginBottom: 16 }}>
                    <TouchableOpacity onPress={handleCameraPress}>
                      <MaterialCommunityIcons name="camera" size={32} color="#a259f7" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', marginTop: 6, fontSize: 13 }}>Camera</Text>
                  </View>
                  <View style={{ alignItems: 'center', width: '30%', marginBottom: 16 }}>
                    <TouchableOpacity onPress={handleRecordPress}>
                      <MaterialCommunityIcons name="microphone" size={32} color="#a259f7" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', marginTop: 6, fontSize: 13 }}>Audio</Text>
                  </View>
                  <View style={{ alignItems: 'center', width: '30%', marginBottom: 16 }}>
                    <TouchableOpacity onPress={handleContactPress}>
                      <MaterialCommunityIcons name="account-box" size={32} color="#a259f7" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', marginTop: 6, fontSize: 13 }}>Contact</Text>
                  </View>
                  <View style={{ alignItems: 'center', width: '30%', marginBottom: 16 }}>
                    <TouchableOpacity onPress={handleGalleryPress}>
                      <MaterialCommunityIcons name="image" size={32} color="#a259f7" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', marginTop: 6, fontSize: 13 }}>Gallery</Text>
                  </View>
                  <View style={{ alignItems: 'center', width: '30%', marginBottom: 16 }}>
                    <TouchableOpacity onPress={handleLocationPress}>
                      <MaterialCommunityIcons name="map-marker" size={32} color="#a259f7" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', marginTop: 6, fontSize: 13 }}>Location</Text>
                  </View>
                  <View style={{ alignItems: 'center', width: '30%', marginBottom: 16 }}>
                    <TouchableOpacity onPress={handleDocumentPress}>
                      <MaterialCommunityIcons name="file-document" size={32} color="#a259f7" />
                    </TouchableOpacity>
                    <Text style={{ color: '#fff', marginTop: 6, fontSize: 13 }}>Document</Text>
                  </View>
                </View>
              )}
              <TextInput
                style={{ flex: 1, backgroundColor: '#181A20', color: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, marginRight: 8 }}
                placeholder="Type a message..."
                placeholderTextColor="#aaa"
                value={messageText}
                onChangeText={setMessageText}
                editable={!sending}
              />
              <TouchableOpacity onPress={handleSendText} disabled={sending || !messageText.trim()} style={{
                width: 36, height: 36, borderRadius: 18, backgroundColor: '#7f5af0', justifyContent: 'center', alignItems: 'center', opacity: sending || !messageText.trim() ? 0.5 : 1
              }}>
                <MaterialCommunityIcons name="send" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
      {/* User Search Modal is always rendered */}
      <Modal visible={showUserSearch} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#232533', borderRadius: 16, padding: 24, width: '100%', height: '100%' }}>
            {/* Cancel button in top right */}
            <TouchableOpacity onPress={() => setShowUserSearch(false)} style={{ position: 'absolute', top: 24, right: 24, zIndex: 10 }}>
              <Text style={{ color: '#7f5af0', fontSize: 18 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, marginBottom: 12, marginTop: 24, textAlign: 'center' }}>Start New Chat</Text>
            <TextInput
              style={{ backgroundColor: '#181A20', color: '#fff', borderRadius: 8, padding: 8, marginBottom: 12 }}
              placeholder="Search users..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
            <FlatList
              data={users.filter(u => u.$id !== currentUser?.$id && (u.username?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())))}
              keyExtractor={item => item.$id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => {
                  setSelectedUser(item);
                  fetchMessagesForChat(item);
                  setShowUserSearch(false);
                }} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                  <Image source={{ uri: item.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(item.username || item.email || 'User') }} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }} />
                  <Text style={{ color: '#fff', fontSize: 16 }}>{item.username || item.email}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 300 }}
            />
            {/* Create Group Button at Bottom */}
            <View style={{ position: 'absolute', bottom: 32, left: 24, right: 24 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowUserSearch(false);
                  setShowCreateGroup(true);
                }}
                style={{
                  backgroundColor: '#7f5af0',
                  borderRadius: 8,
                  padding: 16,
                  alignItems: 'center',
                  width: '100%',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>+ Create Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Create Group Modal */}
      <Modal visible={showCreateGroup} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#232533', borderRadius: 16, padding: 24, width: '100%', height: '100%' }}>
            <TouchableOpacity onPress={() => setShowCreateGroup(false)} style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
              <Text style={{ color: '#7f5af0', fontSize: 18 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontSize: 18, marginBottom: 12, marginTop: 8, textAlign: 'center' }}>Create Group</Text>
            <TextInput
              style={{ backgroundColor: '#181A20', color: '#fff', borderRadius: 8, padding: 8, marginBottom: 12 }}
              placeholder="Group name..."
              placeholderTextColor="#aaa"
              value={groupName}
              onChangeText={setGroupName}
            />
            <Text style={{ color: '#fff', marginBottom: 8 }}>Add members:</Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: 12 }}>
              {users.filter(u => u.$id !== currentUser?.$id).map(u => (
                <TouchableOpacity key={u.$id} onPress={() => {
                  setGroupMembers(prev => prev.includes(u.$id) ? prev.filter(id => id !== u.$id) : [...prev, u.$id]);
                }} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: groupMembers.includes(u.$id) ? '#7f5af0' : '#aaa', backgroundColor: groupMembers.includes(u.$id) ? '#7f5af0' : 'transparent', marginRight: 10, justifyContent: 'center', alignItems: 'center' }}>
                    {groupMembers.includes(u.$id) && <MaterialCommunityIcons name="check" size={18} color="#fff" />}
                  </View>
                  <Image source={{ uri: u.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.username || u.email || 'User') }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 10 }} />
                  <Text style={{ color: '#fff', fontSize: 16 }}>{u.username || u.email}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* Create Group Button at Bottom of Create Group Modal */}
            <View style={{ position: 'absolute', bottom: 32, left: 24, right: 24 }}>
              <TouchableOpacity
                onPress={async () => {
                  if (!groupName.trim() || groupMembers.length === 0) {
                    Alert.alert('Please enter a group name and select members.');
                    return;
                  }
                  setCreatingGroup(true);
                  try {
                    const newGroup = await databases.createDocument(
                      appwriteConfig.databaseId,
                      appwriteConfig.chatsCollectionId,
                           "unique()",

                      {
                        name: groupName.trim(),
                        type: 'group',
                        members: [currentUser.$id, ...groupMembers],
                      }
                    );
                    setGroups(prev => [...prev, newGroup]);
                    setShowCreateGroup(false);
                    setGroupName("");
                    setGroupMembers([]);
                    setSelectedUser(newGroup);
                    fetchMessagesForChat(newGroup);
                  } catch (e) {
                    Alert.alert('Error', e.message);
                  } finally {
                    setCreatingGroup(false);
                  }
                }}
                style={{ backgroundColor: '#7f5af0', borderRadius: 8, padding: 16, alignItems: 'center', width: '100%', opacity: creatingGroup ? 0.5 : 1 }}
                disabled={creatingGroup}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{creatingGroup ? 'Creating...' : '+ Create Group'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Image Modal */}
      <RNModal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setImageModalVisible(false)}
        >
          {modalImageUrl && (
            <Image
              source={{ uri: modalImageUrl }}
              style={{ width: '90%', height: '70%', borderRadius: 16, resizeMode: 'contain' }}
            />
          )}
          <TouchableOpacity
            onPress={() => setImageModalVisible(false)}
            style={{ position: 'absolute', top: 40, right: 30, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 8 }}
          >
            <MaterialCommunityIcons name="close" size={32} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </RNModal>
      {/* Audio Recording Modal */}
      <RNModal
        visible={audioModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelRecording}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
          onPress={cancelRecording}
        >
          <View style={{ backgroundColor: '#232533', borderRadius: 16, padding: 32, alignItems: 'center' }}>
            <MaterialCommunityIcons name="microphone" size={48} color="#7f5af0" />
            <Text style={{ color: '#fff', fontSize: 18, marginVertical: 16 }}>{isRecording ? 'Recording...' : 'Ready to record'}</Text>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              {!isRecording ? (
                <TouchableOpacity onPress={startRecording} style={{ backgroundColor: '#7f5af0', borderRadius: 24, padding: 16, marginHorizontal: 8 }}>
                  <MaterialCommunityIcons name="record" size={28} color="#fff" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={stopRecording} style={{ backgroundColor: '#f54242', borderRadius: 24, padding: 16, marginHorizontal: 8 }}>
                  <MaterialCommunityIcons name="stop" size={28} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={cancelRecording} style={{ backgroundColor: '#aaa', borderRadius: 24, padding: 16, marginHorizontal: 8 }}>
                <MaterialCommunityIcons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </RNModal>
    </>
  );
};

export default Chat; 