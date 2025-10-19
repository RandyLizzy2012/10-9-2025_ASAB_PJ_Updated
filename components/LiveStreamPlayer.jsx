import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useGlobalContext } from '../context/GlobalProvider';
import { joinLiveStream, leaveLiveStream, subscribeLiveStreamUpdates, followStreamer, unfollowStreamer, isFollowing, getFollowerCount } from '../lib/livestream';
import { 
  initializeAgora, 
  startViewing, 
  stopStreaming, 
  destroyEngine, 
  generateChannelName, 
  generateUserId 
} from '../lib/agora';

const { width, height } = Dimensions.get('window');

const LiveStreamPlayer = ({ stream, onClose }) => {
  const { user } = useGlobalContext();
  const [viewerCount, setViewerCount] = useState(stream?.viewerCount || 0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [agoraClient, setAgoraClient] = useState(null);
  const [isAgoraConnected, setIsAgoraConnected] = useState(false);

  const qualityOptions = [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: '1080p' },
    { label: '720p', value: '720p' },
    { label: '480p', value: '480p' },
  ];

  useEffect(() => {
    let durationInterval;
    let unsubscribe;

    // Initialize Agora and start viewing
    const initializeViewing = async () => {
      try {
        console.log('👀 Initializing Agora for live viewing...');
        const client = await initializeAgora();
        setAgoraClient(client);
        
        const channelName = generateChannelName(stream.$id);
        const userId = generateUserId();
        
        console.log('📺 Starting viewing on channel:', channelName);
        await startViewing(client, channelName, userId);
        setIsAgoraConnected(true);
        setIsBuffering(false);
        
        console.log('✅ Live viewing started successfully!');
      } catch (error) {
        console.error('❌ Failed to start live viewing:', error);
        Alert.alert('Viewing Error', 'Failed to connect to live stream. Please try again.');
      }
    };

    // Join the stream
    if (user?.$id && stream?.$id) {
      joinLiveStream(stream.$id, user.$id).catch(console.error);

      // Initialize Agora viewing
      initializeViewing();

      // Check follow status
      if (stream.hostId && user.$id !== stream.hostId) {
        isFollowing(user.$id, stream.hostId)
          .then(setIsFollowingUser)
          .catch(console.error);
        
        getFollowerCount(stream.hostId)
          .then(setFollowerCount)
          .catch(console.error);
      }

      // Subscribe to stream updates
      unsubscribe = subscribeLiveStreamUpdates(stream.$id, (response) => {
        if (response.payload) {
          setViewerCount(response.payload.viewerCount || 0);
          
          // Check if stream ended
          if (response.payload.isLive === false) {
            if (onClose) onClose();
          }
        }
      });

      // Calculate duration
      const startTime = new Date(stream.startTime).getTime();
      durationInterval = setInterval(() => {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000);
        setDuration(diff);
      }, 1000);
    }

    return () => {
      // Stop Agora viewing
      if (agoraClient && isAgoraConnected) {
        console.log('🛑 Stopping Agora viewing...');
        stopStreaming(agoraClient).catch(console.error);
        destroyEngine(agoraClient).catch(console.error);
        console.log('✅ Agora viewing stopped');
      }

      // Leave the stream
      if (user?.$id && stream?.$id) {
        leaveLiveStream(stream.$id, user.$id).catch(console.error);
      }

      if (durationInterval) {
        clearInterval(durationInterval);
      }

      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [stream?.$id, user?.$id]);

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQualityChange = (quality) => {
    setSelectedQuality(quality);
    setShowQualityMenu(false);
    // Here you would actually change the video quality
    console.log('Quality changed to:', quality);
  };

  const handleFollowToggle = async () => {
    if (!user?.$id) {
      Alert.alert('Error', 'Please login to follow streamers');
      return;
    }

    if (!stream.hostId) {
      Alert.alert('Error', 'Invalid stream host');
      return;
    }

    try {
      if (isFollowingUser) {
        await unfollowStreamer(user.$id, stream.hostId);
        setIsFollowingUser(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        Alert.alert('Success', `Unfollowed ${stream.hostUsername}`);
      } else {
        await followStreamer(user.$id, stream.hostId, stream.hostUsername);
        setIsFollowingUser(true);
        setFollowerCount(prev => prev + 1);
        Alert.alert('Success', `Following ${stream.hostUsername}`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  if (!stream) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Stream not found</Text>
      </View>
    );
  }

  // Note: For a real implementation, you would need actual video streaming URLs
  // This is a placeholder showing the UI structure
  const videoUrl = stream.streamUrl || null;

  return (
    <View style={styles.container}>
      {/* Video Player or Camera Feed Placeholder */}
      <View style={styles.videoContainer}>
        {videoUrl ? (
          <Video
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isLooping={false}
            onLoadStart={() => setIsBuffering(true)}
            onLoad={() => setIsBuffering(false)}
            useNativeControls={false}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: stream.hostAvatar }} 
                style={styles.hostAvatar}
              />
            </View>
            <Text style={styles.placeholderText}>
              Live stream in progress...
            </Text>
            <Text style={styles.placeholderSubtext}>
              Connect to WebRTC or streaming service for live video
            </Text>
          </View>
        )}

        {isBuffering && (
          <View style={styles.bufferingOverlay}>
            <Text style={styles.bufferingText}>Connecting...</Text>
          </View>
        )}

        {/* Top Overlay - Stream Info */}
        <View style={styles.topOverlay}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>

          <View style={styles.viewerCounter}>
            <Text style={styles.viewerIcon}>👁️</Text>
            <Text style={styles.viewerText}>{viewerCount}</Text>
          </View>

          <View style={styles.topRightControls}>
            <TouchableOpacity 
              style={styles.qualityButton} 
              onPress={() => setShowQualityMenu(!showQualityMenu)}
            >
              <Text style={styles.qualityButtonText}>{selectedQuality}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quality Menu */}
        {showQualityMenu && (
          <View style={styles.qualityMenu}>
            <Text style={styles.qualityMenuTitle}>Video Quality</Text>
            {qualityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.qualityMenuItem,
                  selectedQuality === option.value && styles.qualityMenuItemSelected
                ]}
                onPress={() => handleQualityChange(option.value)}
              >
                <Text style={[
                  styles.qualityMenuItemText,
                  selectedQuality === option.value && styles.qualityMenuItemTextSelected
                ]}>
                  {option.label}
                </Text>
                {selectedQuality === option.value && (
                  <Text style={styles.qualityCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Bottom Overlay - Stream Details */}
        <View style={styles.bottomOverlay}>
          <View style={styles.hostInfoContainer}>
            <View style={styles.hostInfo}>
              <Image 
                source={{ uri: stream.hostAvatar }} 
                style={styles.hostAvatarSmall}
              />
              <View style={styles.hostDetails}>
                <Text style={styles.hostName}>{stream.hostUsername}</Text>
                <Text style={styles.followerCountText}>
                  {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
                </Text>
                <Text style={styles.streamTitle} numberOfLines={2}>{stream.title}</Text>
              </View>
            </View>

            {/* Follow Button */}
            {user?.$id && stream.hostId && user.$id !== stream.hostId && (
              <TouchableOpacity 
                style={[styles.followButton, isFollowingUser && styles.followingButton]}
                onPress={handleFollowToggle}
              >
                <Text style={[styles.followButtonText, isFollowingUser && styles.followingButtonText]}>
                  {isFollowingUser ? '✓ Following' : '+ Follow'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  avatarContainer: {
    marginBottom: 20,
  },
  hostAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#a77df8',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  placeholderSubtext: {
    color: '#aaa',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferingText: {
    color: '#fff',
    fontSize: 16,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
    marginRight: 5,
  },
  liveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 6,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
  },
  viewerCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  viewerIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  viewerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qualityButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  qualityButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  qualityMenu: {
    position: 'absolute',
    top: 100,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 10,
    padding: 10,
    minWidth: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  qualityMenuTitle: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  qualityMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  qualityMenuItemSelected: {
    backgroundColor: 'rgba(167, 125, 248, 0.2)',
  },
  qualityMenuItemText: {
    color: '#fff',
    fontSize: 14,
  },
  qualityMenuItemTextSelected: {
    color: '#a77df8',
    fontWeight: 'bold',
  },
  qualityCheck: {
    color: '#a77df8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 15,
    paddingBottom: 120,
  },
  hostInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  hostAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  hostDetails: {
    flex: 1,
  },
  hostName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  followerCountText: {
    color: '#aaa',
    fontSize: 11,
    marginBottom: 4,
  },
  streamTitle: {
    color: '#ddd',
    fontSize: 12,
  },
  followButton: {
    backgroundColor: '#a77df8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  followingButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: '#a77df8',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  followingButtonText: {
    color: '#a77df8',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default LiveStreamPlayer;

