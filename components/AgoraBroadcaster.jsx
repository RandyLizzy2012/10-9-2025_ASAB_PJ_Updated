import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, PermissionsAndroid, Platform } from 'react-native';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  VideoEncoderConfiguration,
  VideoEncoderConfigurationPreset,
  CameraCapturerConfiguration,
  RtcSurfaceView,
} from 'react-native-agora';
import { useGlobalContext } from '../context/GlobalProvider';
import { endLiveStream, joinLiveStream } from '../lib/livestream';
import { AGORA_CONFIG } from '../lib/config';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

const AgoraBroadcaster = ({ streamId, onStreamEnd }) => {
  const { user } = useGlobalContext();
  const [isStreaming, setIsStreaming] = useState(false);
  const [duration, setDuration] = useState(0);
  const [viewerCount, setViewerCount] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [facing, setFacing] = useState(true); // true = front, false = back
  const agoraEngineRef = useRef(null);
  const durationIntervalRef = useRef(null);

  useEffect(() => {
    initializeAgora();
    return () => {
      cleanup();
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);
        
        return (
          granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
        );
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
        Alert.alert('Permissions Required', 'Camera and microphone permissions are required to go live.');
        return;
      }

      // Create Agora engine
      agoraEngineRef.current = createAgoraRtcEngine();
      const agoraEngine = agoraEngineRef.current;

      // Register event handlers
      agoraEngine.registerEventHandler({
        onJoinChannelSuccess: (connection, elapsed) => {
          console.log('✅ Successfully joined channel:', connection.channelId);
          setIsStreaming(true);
          
          // Start duration counter
          durationIntervalRef.current = setInterval(() => {
            setDuration(prev => prev + 1);
          }, 1000);
        },
        onUserJoined: (connection, remoteUid, elapsed) => {
          console.log('👤 Viewer joined:', remoteUid);
          setViewerCount(prev => prev + 1);
        },
        onUserOffline: (connection, remoteUid, reason) => {
          console.log('👋 Viewer left:', remoteUid);
          setViewerCount(prev => Math.max(0, prev - 1));
        },
        onError: (err, msg) => {
          console.error('❌ Agora Error:', err, msg);
          Alert.alert('Streaming Error', 'An error occurred during streaming.');
        },
      });

      // Initialize engine
      agoraEngine.initialize({
        appId: AGORA_CONFIG.appId,
        channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
      });

      // Enable video
      agoraEngine.enableVideo();
      agoraEngine.enableAudio();

      // Set client role to broadcaster
      agoraEngine.setClientRole(ClientRoleType.ClientRoleBroadcaster);

      // Set video encoder configuration
      agoraEngine.setVideoEncoderConfiguration({
        dimensions: {
          width: AGORA_CONFIG.videoProfile.width,
          height: AGORA_CONFIG.videoProfile.height,
        },
        frameRate: AGORA_CONFIG.videoProfile.frameRate,
        bitrate: AGORA_CONFIG.videoProfile.bitrate,
      });

      // Start preview
      agoraEngine.startPreview();

      // Join channel (using streamId as channel name)
      const channelName = `stream_${streamId}`;
      const uid = parseInt(user.$id.substring(0, 8), 16); // Convert user ID to number
      
      // Join channel (token can be null for testing if certificate is disabled)
      agoraEngine.joinChannel(null, channelName, uid, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: true,
      });

      // Update viewer count in database
      await joinLiveStream(streamId, user.$id);

    } catch (error) {
      console.error('Error initializing Agora:', error);
      Alert.alert('Error', 'Failed to start live stream. Please try again.');
    }
  };

  const cleanup = async () => {
    try {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      const agoraEngine = agoraEngineRef.current;
      if (agoraEngine) {
        agoraEngine.leaveChannel();
        agoraEngine.release();
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  };

  const handleEndStream = async () => {
    Alert.alert(
      'End Live Stream',
      'Are you sure you want to end this live stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Stream',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsStreaming(false);
              await cleanup();
              await endLiveStream(streamId);
              if (onStreamEnd) {
                onStreamEnd();
              }
              router.replace('/home');
            } catch (error) {
              console.error('Error ending stream:', error);
              Alert.alert('Error', 'Failed to end stream');
            }
          }
        }
      ]
    );
  };

  const toggleMute = () => {
    const agoraEngine = agoraEngineRef.current;
    if (agoraEngine) {
      const newMutedState = !isMuted;
      agoraEngine.muteLocalAudioStream(newMutedState);
      setIsMuted(newMutedState);
    }
  };

  const toggleCamera = () => {
    const agoraEngine = agoraEngineRef.current;
    if (agoraEngine) {
      const newCameraState = !cameraEnabled;
      agoraEngine.enableLocalVideo(newCameraState);
      setCameraEnabled(newCameraState);
    }
  };

  const switchCamera = () => {
    const agoraEngine = agoraEngineRef.current;
    if (agoraEngine) {
      agoraEngine.switchCamera();
      setFacing(prev => !prev);
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Agora Video View */}
      <RtcSurfaceView
        style={styles.videoView}
        canvas={{ uid: 0 }}
      />

      {/* Top Controls */}
      <View style={styles.topControls}>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>

        <View style={styles.viewerInfo}>
          <Text style={styles.viewerIcon}>👁️</Text>
          <Text style={styles.viewerText}>{viewerCount}</Text>
        </View>

        <TouchableOpacity style={styles.endButton} onPress={handleEndStream}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        <TouchableOpacity 
          style={[styles.controlButton, isMuted && styles.controlButtonActive]} 
          onPress={toggleMute}
        >
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
          <Text style={styles.controlText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, !cameraEnabled && styles.controlButtonActive]} 
          onPress={toggleCamera}
        >
          <Text style={styles.controlIcon}>{cameraEnabled ? '📹' : '🚫'}</Text>
          <Text style={styles.controlText}>{cameraEnabled ? 'Camera' : 'Off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={switchCamera}
        >
          <Text style={styles.controlIcon}>🔄</Text>
          <Text style={styles.controlText}>Flip</Text>
        </TouchableOpacity>
      </View>

      {/* Status Overlay */}
      {!isStreaming && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Connecting...</Text>
        </View>
      )}
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
  topControls: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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
    fontSize: 14,
    marginRight: 8,
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
  },
  viewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewerIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  viewerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  endButton: {
    backgroundColor: '#ff4757',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  endButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
    borderRadius: 50,
    minWidth: 80,
  },
  controlButtonActive: {
    backgroundColor: '#ff4757',
  },
  controlIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  controlText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AgoraBroadcaster;

