import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useGlobalContext } from '../../context/GlobalProvider';
import { getActiveLiveStreams } from '../../lib/livestream';
import { EmptyState } from '../../components';

const LiveStreamCard = ({ stream, onPress }) => {
  const getDuration = () => {
    const startTime = new Date(stream.startTime).getTime();
    const now = Date.now();
    const diff = Math.floor((now - startTime) / 1000);
    
    const minutes = Math.floor(diff / 60);
    if (minutes < 1) return 'Just started';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.thumbnailContainer}>
        <Image 
          source={{ uri: stream.thumbnail || stream.hostAvatar }} 
          style={styles.thumbnail}
        />
        
        {/* Live Indicator */}
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>

        {/* Viewer Count */}
        <View style={styles.viewerCount}>
          <Text style={styles.viewerIcon}>👁️</Text>
          <Text style={styles.viewerText}>{stream.viewerCount || 0}</Text>
        </View>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.hostInfo}>
          <Image 
            source={{ uri: stream.hostAvatar }} 
            style={styles.hostAvatar}
          />
          <View style={styles.hostDetails}>
            <Text style={styles.streamTitle} numberOfLines={2}>
              {stream.title}
            </Text>
            <Text style={styles.hostName}>{stream.hostUsername}</Text>
            <View style={styles.metaInfo}>
              <Text style={styles.category}>{stream.category}</Text>
              <Text style={styles.duration}>• {getDuration()}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const LiveStreams = () => {
  const { user } = useGlobalContext();
  const [streams, setStreams] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStreams = async () => {
    try {
      const activeStreams = await getActiveLiveStreams();
      setStreams(activeStreams);
    } catch (error) {
      console.error('Error loading live streams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStreams();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStreams, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStreams();
    setRefreshing(false);
  };

  const handleStreamPress = (stream) => {
    router.push({
      pathname: '/live-viewer',
      params: {
        streamId: stream.$id,
      }
    });
  };

  const handleGoLive = () => {
    router.push('/go-live');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Streams</Text>
        <TouchableOpacity style={styles.goLiveButton} onPress={handleGoLive}>
          <Text style={styles.goLiveIcon}>📹</Text>
          <Text style={styles.goLiveText}>Go Live</Text>
        </TouchableOpacity>
      </View>

      {/* Live Streams List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading live streams...</Text>
        </View>
      ) : streams.length === 0 ? (
        <EmptyState
          title="No Live Streams"
          subtitle="Be the first to go live!"
        />
      ) : (
        <FlatList
          data={streams}
          keyExtractor={(item) => item.$id}
          renderItem={({ item }) => (
            <LiveStreamCard stream={item} onPress={() => handleStreamPress(item)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#161622',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  goLiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4757',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  goLiveIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  goLiveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 15,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  liveIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 71, 87, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 5,
  },
  liveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  viewerCount: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  viewerIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  viewerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardInfo: {
    padding: 15,
  },
  hostInfo: {
    flexDirection: 'row',
  },
  hostAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
  },
  hostDetails: {
    flex: 1,
  },
  streamTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hostName: {
    color: '#a77df8',
    fontSize: 14,
    marginBottom: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  category: {
    color: '#888',
    fontSize: 12,
  },
  duration: {
    color: '#888',
    fontSize: 12,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default LiveStreams;

