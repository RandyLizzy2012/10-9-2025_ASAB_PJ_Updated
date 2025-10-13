import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { useGlobalContext } from '../context/GlobalProvider';
import { addLiveComment, getLiveComments, subscribeLiveComments } from '../lib/livestream';
import { images } from '../constants';

const LiveChatPanel = ({ streamId, isHost = false }) => {
  const { user } = useGlobalContext();
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    let unsubscribe;

    // Load initial comments
    const loadComments = async () => {
      try {
        const initialComments = await getLiveComments(streamId);
        setComments(initialComments);
      } catch (error) {
        console.error('Error loading comments:', error);
      }
    };

    loadComments();

    // Subscribe to new comments
    unsubscribe = subscribeLiveComments(streamId, (response) => {
      if (response.events && response.events.includes('databases.*.collections.*.documents.*.create')) {
        const newComment = response.payload;
        setComments(prev => [...prev, newComment]);
        
        // Auto-scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [streamId]);

  const handleSendComment = async () => {
    if (!newComment.trim() || !user?.$id) return;

    setPosting(true);
    try {
      await addLiveComment(
        streamId,
        user.$id,
        user.username,
        user.avatar,
        newComment.trim()
      );
      setNewComment('');
    } catch (error) {
      console.error('Error sending comment:', error);
    } finally {
      setPosting(false);
    }
  };

  const renderComment = ({ item }) => (
    <View style={styles.commentItem}>
      <Image 
        source={{ uri: item.avatar || images.profile }} 
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentUsername}>{item.username}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      {/* Comments List */}
      <FlatList
        ref={flatListRef}
        data={comments}
        keyExtractor={(item) => item.$id}
        renderItem={renderComment}
        contentContainerStyle={styles.commentsContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input Box */}
      {!isHost && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Say something..."
            placeholderTextColor="#888"
            value={newComment}
            onChangeText={setNewComment}
            editable={!posting}
            multiline
            maxLength={200}
          />
          <TouchableOpacity 
            style={[styles.sendButton, posting && styles.sendButtonDisabled]}
            onPress={handleSendComment}
            disabled={posting || !newComment.trim()}
          >
            <Text style={styles.sendButtonText}>
              {posting ? '...' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  commentsContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 10,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    color: '#a77df8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    maxHeight: 80,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#a77df8',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LiveChatPanel;

