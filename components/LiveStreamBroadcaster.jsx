import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useGlobalContext } from '../context/GlobalProvider';
import { endLiveStream } from '../lib/livestream';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

const LiveStreamBroadcaster = ({ streamId, onStreamEnd }) => {
  const { user } = useGlobalContext();
  const [facing, setFacing] = useState('front');
  const [flash, setFlash] = useState('off');
  const [isStreaming, setIsStreaming] = useState(true);
  const [duration, setDuration] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const durationIntervalRef = useRef(null);

  useEffect(() => {
    // Start duration counter
    durationIntervalRef.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission is required to go live</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
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
              if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
              }
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
      <CameraView 
        style={styles.camera} 
        facing={facing}
        enableTorch={flash === 'on'}
        ref={cameraRef}
      >
        {/* Top Controls */}
        <View style={styles.topControls}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
            <Text style={styles.durationText}>{formatDuration(duration)}</Text>
          </View>

          <TouchableOpacity style={styles.endButton} onPress={handleEndStream}>
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Text style={styles.controlIcon}>{flash === 'on' ? '⚡' : '🔦'}</Text>
            <Text style={styles.controlText}>Flash</Text>
          </TouchableOpacity>

          <View style={styles.spacer} />

          <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
            <Text style={styles.controlIcon}>🔄</Text>
            <Text style={styles.controlText}>Flip</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingBottom: 40,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 15,
    borderRadius: 50,
    minWidth: 70,
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  controlText: {
    color: '#fff',
    fontSize: 12,
  },
  spacer: {
    flex: 1,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#a77df8',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default LiveStreamBroadcaster;

