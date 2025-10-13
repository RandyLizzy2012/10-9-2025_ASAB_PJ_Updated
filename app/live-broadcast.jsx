import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LiveStreamBroadcaster, LiveChatPanel, LiveReactions } from '../components';
import { useGlobalContext } from '../context/GlobalProvider';

const { width, height } = Dimensions.get('window');

const LiveBroadcast = () => {
  const { streamId } = useLocalSearchParams();
  const { user } = useGlobalContext();
  const [showChat, setShowChat] = useState(false);

  const handleStreamEnd = () => {
    router.replace('/home');
  };

  if (!streamId) {
    router.replace('/home');
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.container}>
        {/* Camera View - Agora will work after EAS build */}
        <LiveStreamBroadcaster 
          streamId={streamId}
          onStreamEnd={handleStreamEnd}
        />

        {/* Live Reactions Overlay */}
        <LiveReactions streamId={streamId} isHost={true} />

        {/* Live Chat Modal */}
        <Modal
          visible={showChat}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowChat(false)}
        >
          <View style={styles.chatModal}>
            <LiveChatPanel streamId={streamId} isHost={true} />
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  chatModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    marginTop: height * 0.3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

export default LiveBroadcast;

