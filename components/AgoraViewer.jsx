import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, PermissionsAndroid, Platform } from 'react-native';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
  RenderModeType,
} from 'react-native-agora';
import { AGORA_CONFIG } from '../lib/config';
import { joinLiveStream, leaveLiveStream } from '../lib/livestream';

const { width, height } = Dimensions.get('window');

const AgoraViewer = ({ stream, userId, onClose }) => {
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null);
  const [selectedQuality, setSelectedQuality] = useState('Auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const agoraEngineRef = useRef(null);

  useEffect(() => {
    initializeAgora();
    return () => {
      cleanup();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    return true;
  };

  const initializeAgora = async () => {
    try {
      // Request permissions
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        Alert.alert('Permission Required', 'Audio permission is required to watch streams.');
        return;
      }

      // Create Agora engine
      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      // Register event handlers
      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: (connection, elapsed) => {
          console.log('✅ Successfully joined channel as viewer:', connection.channelId);
          setIsJoined(true);
        },
        onUserJoined: (connection, uid, elapsed) => {
          console.log('👤 Broadcaster found:', uid);
          setRemoteUid(uid);
        },
        onUserOffline: (connection, uid, reason) => {
          console.log('👋 Broadcaster offline:', uid);
          setRemoteUid(null);
          Alert.alert('Stream Ended', 'The broadcaster has ended this stream.');
          if (onClose) onClose();
        },
        onError: (err, msg) => {
          console.error('❌ Agora Error:', err, msg);
        },
      });

      // Initialize engine
      agoraEngine.initialize({
        appId: AGORA_CONFIG.appId,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      // Enable video and audio
      agoraEngine.enableVideo();
      agoraEngine.enableAudio();

      // Set client role to audience
      agoraEngine.setClientRole(ClientRoleType.ClientRoleAudience);

      // Join channel
      const channelName = `stream_${stream.$id}`;
      const uid = parseInt(userId.substring(0, 8), 16); // Convert user ID to number

      agoraEngine.joinChannel(null, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleAudience,
      });

      // Update viewer count in database
      await joinLiveStream(stream.$id, userId);

    } catch (error) {
      console.error('Error initializing Agora viewer:', error);
      Alert.alert('Error', 'Failed to join live stream. Please try again.');
    }
  };

  const cleanup = async () => {
    try {
      const agoraEngine = agoraEngineRef.current;
      if (agoraEngine) {
        agoraEngine.leaveChannel();
        agoraEngine.release();
      }

      // Update viewer count in database
      if (stream?.$id && userId) {
        await leaveLiveStream(stream.$id, userId);
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const changeQuality = (quality) => {
    const agoraEngine = agoraEngineRef.current;
    if (!agoraEngine) return;

    let config = {};
    switch (quality) {
      case '1080p':
        config = { width: 1920, height: 1080, frameRate: 30, bitrate: 3000 };
        break;
      case '720p':
        config = { width: 1280, height: 720, frameRate: 30, bitrate: 2000 };
        break;
      case '480p':
        config = { width: 854, height: 480, frameRate: 30, bitrate: 1000 };
        break;
      default: // Auto
        config = { width: 1280, height: 720, frameRate: 30, bitrate: 2000 };
    }

    // Note: Viewers can't change broadcaster's quality, but we can adjust our decode preferences
    agoraEngine.setRemoteVideoStreamType(remoteUid, quality === 'Auto' ? 0 : 1);
    setSelectedQuality(quality);
    setShowQualityMenu(false);
  };

  const formatDuration = (startTime) => {
    if (!startTime) return '0:00';
    const start = new Date(startTime);
    const now = new Date();
    const diffInSeconds = Math.floor((now - start) / 1000);
    
    const hrs = Math.floor(diffInSeconds / 3600);
    const mins = Math.floor((diffInSeconds % 3600) / 60);
    const secs = diffInSeconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Remote Video View */}
      {remoteUid ? (
        <RtcSurfaceView
          style={styles.videoView}
          canvas={{
            uid: remoteUid,
            renderMode: RenderModeType.RenderModeHidden,
          }}
        />
      ) : (
        <View style={styles.loadingView}>
          <Text style={styles.loadingText}>
            {isJoined ? 'Waiting for broadcaster...' : 'Connecting...'}
          </Text>
        </View>
      )}

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        <View style={styles.liveInfo}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
            <Text style={styles.durationText}>{formatDuration(stream.startTime)}</Text>
          </View>

          <View style={styles.viewerCount}>
            <Text style={styles.viewerIcon}>👁️</Text>
            <Text style={styles.viewerText}>{stream.viewerCount || 0}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.qualityButton}
          onPress={() => setShowQualityMenu(!showQualityMenu)}
        >
          <Text style={styles.qualityText}>{selectedQuality}</Text>
        </TouchableOpacity>
      </View>

      {/* Quality Menu */}
      {showQualityMenu && (
        <View style={styles.qualityMenu}>
          {['Auto', '1080p', '720p', '480p'].map((quality) => (
            <TouchableOpacity
              key={quality}
              style={styles.qualityOption}
              onPress={() => changeQuality(quality)}
            >
              <Text style={[
                styles.qualityOptionText,
                selectedQuality === quality && styles.qualityOptionSelected
              ]}>
                {quality} {selectedQuality === quality && '✓'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Stream Info Overlay */}
      <View style={styles.infoOverlay}>
        <Text style={styles.streamTitle}>{stream.title}</Text>
        <View style={styles.hostInfo}>
          <Text style={styles.hostName}>{stream.hostUsername}</Text>
          <Text style={styles.categoryText}>{stream.category}</Text>
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
  videoView: {
    width: width,
    height: height,
  },
  loadingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  liveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff4757',
    marginRight: 6,
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
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  viewerIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  viewerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  qualityButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  qualityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  qualityMenu: {
    position: 'absolute',
    top: 100,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: 10,
    padding: 8,
    minWidth: 100,
  },
  qualityOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  qualityOptionText: {
    color: '#fff',
    fontSize: 14,
  },
  qualityOptionSelected: {
    color: '#a77df8',
    fontWeight: 'bold',
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  hostName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  categoryText: {
    color: '#a77df8',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(167,125,248,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

export default AgoraViewer;

