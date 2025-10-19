import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useGlobalContext } from '../context/GlobalProvider';
import { addLiveReaction } from '../lib/livestream';

const { width, height } = Dimensions.get('window');

const REACTIONS = [
  { type: 'heart', emoji: '❤️', color: '#ff4757' },
  { type: 'fire', emoji: '🔥', color: '#ff6348' },
  { type: 'clap', emoji: '👏', color: '#ffa502' },
  { type: 'laugh', emoji: '😂', color: '#ffd700' },
  { type: 'wow', emoji: '😮', color: '#70a1ff' },
];

const FloatingEmoji = ({ emoji, onComplete }) => {
  const [translateY] = useState(new Animated.Value(0));
  const [translateX] = useState(new Animated.Value(0));
  const [opacity] = useState(new Animated.Value(1));
  const [scale] = useState(new Animated.Value(0.5));

  useEffect(() => {
    // Random horizontal drift
    const randomX = (Math.random() - 0.5) * 100;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -height * 0.8,
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: randomX,
        duration: 3000,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 3000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onComplete) onComplete();
    });
  }, []);

  return (
    <Animated.Text
      style={[
        styles.floatingEmoji,
        {
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
};

const LiveReactions = ({ streamId, isHost = false }) => {
  const { user } = useGlobalContext();
  const [showReactions, setShowReactions] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);

  const handleReaction = async (reaction) => {
    if (!user?.$id) return;

    try {
      // Add to database
      await addLiveReaction(streamId, user.$id, reaction.type);

      // Add floating emoji
      addFloatingEmoji(reaction.emoji);
      
      // Auto-hide reactions panel after selecting
      setShowReactions(false);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const addFloatingEmoji = (emoji) => {
    // Generate unique ID using timestamp and random number
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setFloatingEmojis(prev => [...prev, { id, emoji }]);
  };

  const removeFloatingEmoji = (id) => {
    setFloatingEmojis(prev => prev.filter(item => item.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Floating Emojis */}
      <View style={styles.floatingContainer} pointerEvents="none">
        {floatingEmojis.map((item) => (
          <FloatingEmoji
            key={item.id}
            emoji={item.emoji}
            onComplete={() => removeFloatingEmoji(item.id)}
          />
        ))}
      </View>

      {/* Reaction Button */}
      {!isHost && (
        <View style={styles.reactionsPanel}>
          {showReactions ? (
            <View style={styles.reactionsExpanded}>
              {REACTIONS.map((reaction) => (
                <TouchableOpacity
                  key={reaction.type}
                  style={[styles.reactionButton, { backgroundColor: reaction.color }]}
                  onPress={() => handleReaction(reaction)}
                >
                  <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.closeReactionsButton}
                onPress={() => setShowReactions(false)}
              >
                <Text style={styles.closeReactionsText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.reactionToggle}
              onPress={() => setShowReactions(true)}
            >
              <Text style={styles.reactionToggleText}>😊</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height,
    pointerEvents: 'box-none',
  },
  floatingContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: height * 0.8,
    justifyContent: 'flex-end',
  },
  floatingEmoji: {
    position: 'absolute',
    fontSize: 30,
    bottom: 0,
    right: 0,
  },
  reactionsPanel: {
    position: 'absolute',
    bottom: 100,
    right: 20,
  },
  reactionToggle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionToggleText: {
    fontSize: 24,
  },
  reactionsExpanded: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 25,
    padding: 10,
    alignItems: 'center',
  },
  reactionButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  reactionEmoji: {
    fontSize: 22,
  },
  closeReactionsButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  closeReactionsText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default LiveReactions;

