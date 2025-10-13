// ZEGO Cloud Configuration
export const ZEGO_CONFIG = {
  appID: 158223577,
  appSign: '9b0834517039c7a6869ef9acd88503a9e9d1430ea0ce469b2f5a5a0a3fc65fc3',
  serverSecret: '7c7a2a87c199d55966ccd7d9e6c516c0'
};

// Agora Configuration
export const AGORA_CONFIG = {
  // ✅ Agora Credentials (Configured)
  appId: 'efc51ac11ca648d6b9833416d087b5ae',              // Agora App ID
  appCertificate: '419c6e6a72cc4ea3b7036677d286a121',     // Agora App Certificate
  
  // Token Server (Optional - for production security)
  // To use token server: 
  // 1. Run: npm run token-server
  // 2. Update this URL to: 'http://YOUR_IP:8080/token'
  tokenServerUrl: '',  // Leave empty for testing without tokens
  
  // Channel Configuration
  channelName: '',                          // Runtime pe set hoga
  uid: 0,                                   // User ID (0 = auto-generate)
  
  // Stream Settings
  videoProfile: {
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 2000,  // Kbps
  },
  
  // Audio Settings
  audioProfile: {
    sampleRate: 48000,
    channels: 2,
    bitrate: 128,  // Kbps
  },
  
  // Features
  enableVideo: true,
  enableAudio: true,
  enableBeautyEffect: false,
  enableScreenSharing: false,
  
  // Recording (Optional)
  enableCloudRecording: false,
};
