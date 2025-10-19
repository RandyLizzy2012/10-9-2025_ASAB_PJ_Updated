// Mock Agora implementation for Expo compatibility
// This provides the live streaming interface without external dependencies

// Agora Configuration
export const AGORA_CONFIG = {
  APP_ID: 'efc51ac11ca648d6b9833416d087b5ae',
  APP_CERTIFICATE: '419c6e6a72cc4ea3b7036677d286a121',
};

// Mock Agora Client
class MockAgoraClient {
  constructor() {
    this.isConnected = false;
    this.channelName = null;
    this.uid = null;
    this.tracks = null;
    this.eventHandlers = {};
  }

  async join(appId, channelName, token, uid) {
    console.log(`🎥 Joining channel: ${channelName} with UID: ${uid}`);
    this.isConnected = true;
    this.channelName = channelName;
    this.uid = uid;
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Successfully joined Agora channel');
    return true;
  }

  async leave() {
    console.log('🛑 Leaving Agora channel');
    this.isConnected = false;
    this.channelName = null;
    this.uid = null;
    
    if (this.tracks) {
      this.tracks.audioTrack?.close();
      this.tracks.videoTrack?.close();
      this.tracks = null;
    }
    
    console.log('✅ Successfully left Agora channel');
    return true;
  }

  async publish(tracks) {
    console.log('📡 Publishing tracks to Agora channel');
    this.tracks = tracks;
    
    // Simulate publishing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('✅ Successfully published tracks');
    return true;
  }

  async subscribe(user, mediaType) {
    console.log(`📺 Subscribing to ${mediaType} from user: ${user.uid}`);
    
    // Simulate subscription delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    console.log(`✅ Successfully subscribed to ${mediaType}`);
    return true;
  }

  on(event, handler) {
    this.eventHandlers[event] = handler;
    console.log(`🎧 Event handler registered for: ${event}`);
  }

  emit(event, data) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event](data);
    }
  }
}

// Mock Media Tracks
class MockMediaTrack {
  constructor(type) {
    this.type = type;
    this.isPlaying = false;
  }

  async play() {
    console.log(`▶️ Playing ${this.type} track`);
    this.isPlaying = true;
    return true;
  }

  async stop() {
    console.log(`⏹️ Stopping ${this.type} track`);
    this.isPlaying = false;
    return true;
  }

  close() {
    console.log(`🔒 Closing ${this.type} track`);
    this.isPlaying = false;
  }
}

// Initialize Agora Engine
export const initializeAgora = async () => {
  try {
    console.log('🎥 Initializing Mock Agora client...');
    
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const client = new MockAgoraClient();
    console.log('✅ Mock Agora client created successfully');
    return client;
  } catch (error) {
    console.error('❌ Failed to initialize Mock Agora client:', error);
    throw error;
  }
};

// Start broadcasting (for streamers)
export const startBroadcasting = async (client, channelName, uid) => {
  try {
    // Join channel as broadcaster
    await client.join(AGORA_CONFIG.APP_ID, channelName, null, uid);
    
    // Create mock local tracks
    const audioTrack = new MockMediaTrack('audio');
    const videoTrack = new MockMediaTrack('video');
    
    // Publish tracks
    await client.publish([audioTrack, videoTrack]);
    
    console.log('✅ Started broadcasting on channel:', channelName);
    return { client, audioTrack, videoTrack };
  } catch (error) {
    console.error('❌ Failed to start broadcasting:', error);
    throw error;
  }
};

// Start viewing (for viewers)
export const startViewing = async (client, channelName, uid) => {
  try {
    // Join channel as audience
    await client.join(AGORA_CONFIG.APP_ID, channelName, null, uid);
    
    // Set up remote user event handlers
    client.on("user-published", async (user, mediaType) => {
      await client.subscribe(user, mediaType);
      if (mediaType === "video") {
        console.log('📺 Remote video track received');
      }
      if (mediaType === "audio") {
        console.log('🔊 Remote audio track received');
      }
    });
    
    // Simulate receiving remote user data after a delay
    setTimeout(() => {
      const mockUser = { uid: 'broadcaster_123' };
      client.emit("user-published", mockUser, "video");
      client.emit("user-published", mockUser, "audio");
    }, 2000);
    
    console.log('✅ Started viewing channel:', channelName);
    return { client };
  } catch (error) {
    console.error('❌ Failed to start viewing:', error);
    throw error;
  }
};

// Stop streaming
export const stopStreaming = async (client, tracks = null) => {
  try {
    if (tracks) {
      // Stop local tracks
      tracks.audioTrack?.close();
      tracks.videoTrack?.close();
    }
    
    await client.leave();
    console.log('✅ Left channel successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to leave channel:', error);
    throw error;
  }
};

// Destroy client
export const destroyEngine = async (client) => {
  try {
    await client.leave();
    console.log('✅ Mock Agora client destroyed');
    return true;
  } catch (error) {
    console.error('❌ Failed to destroy client:', error);
    throw error;
  }
};

// Generate channel name from stream ID
export const generateChannelName = (streamId) => {
  return `stream_${streamId}`;
};

// Generate unique user ID
export const generateUserId = () => {
  return Math.floor(Math.random() * 1000000);
};
