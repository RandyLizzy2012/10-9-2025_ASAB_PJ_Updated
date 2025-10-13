import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const PictureInPicturePlayer = ({ stream, onClose, onMaximize }) => {
  if (!stream) return null;

  const handlePress = () => {
    if (onMaximize) {
      onMaximize();
    } else {
      // Navigate back to full screen viewer
      router.push({
        pathname: '/live-viewer',
        params: {
          streamId: stream.$id,
        }
      });
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.videoContainer}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        {/* Thumbnail/Video Preview */}
        <Image 
          source={{ uri: stream.hostAvatar }} 
          style={styles.thumbnail}
        />
        
        {/* Live Indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Stream Info */}
        <View style={styles.infoOverlay}>
          <Text style={styles.hostName} numberOfLines={1}>
            {stream.hostUsername}
          </Text>
          <View style={styles.viewerCount}>
            <Text style={styles.viewerIcon}>👁️</Text>
            <Text style={styles.viewerText}>{stream.viewerCount || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Close Button */}
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={onClose}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: width * 0.35,
    height: width * 0.6,
    zIndex: 1000,
    flexDirection: 'row',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#a77df8',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#fff',
    marginRight: 3,
  },
  liveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 9,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  hostName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerIcon: {
    fontSize: 10,
    marginRight: 3,
  },
  viewerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 14,
  },
});

export default PictureInPicturePlayer;

