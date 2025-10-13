/**
 * Agora Helper Functions
 * 
 * Agora credentials configured:
 * - App ID: efc51ac11ca648d6b9833416d087b5ae
 * - App Certificate: 419c6e6a72cc4ea3b7036677d286a121
 */

import { AGORA_CONFIG } from './config';

/**
 * Get Agora RTC Token from server
 * Note: For testing without token server, returns null (works if certificate not enforced)
 */
export async function getAgoraToken(channelName, uid = 0, role = 'publisher') {
  try {
    // If token server URL is configured, fetch from server
    if (AGORA_CONFIG.tokenServerUrl) {
      const response = await fetch(
        `${AGORA_CONFIG.tokenServerUrl}?channelName=${channelName}&uid=${uid}&role=${role}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch token from server');
      }
      
      const data = await response.json();
      return data.token;
    }

    // For development/testing without token server
    console.warn('⚠️ No token server configured. Using null token (testing mode).');
    console.warn('⚠️ This will only work if App Certificate is disabled or in testing mode.');
    return null;
  } catch (error) {
    console.error('Error fetching Agora token:', error);
    throw error;
  }
}

/**
 * Validate Agora Configuration
 * App start hone se pehle check karo
 */
export function validateAgoraConfig() {
  const errors = [];
  const warnings = [];
  
  // Check App ID
  if (!AGORA_CONFIG.appId || AGORA_CONFIG.appId === 'YOUR_AGORA_APP_ID') {
    errors.push('❌ Agora App ID missing!');
  } else {
    console.log('✅ Agora App ID configured:', AGORA_CONFIG.appId);
  }
  
  // Check App Certificate
  if (!AGORA_CONFIG.appCertificate || AGORA_CONFIG.appCertificate === 'YOUR_APP_CERTIFICATE') {
    warnings.push('⚠️ App Certificate missing. Token authentication disabled.');
  } else {
    console.log('✅ Agora App Certificate configured');
  }
  
  // Check Token Server
  if (!AGORA_CONFIG.tokenServerUrl) {
    warnings.push('⚠️ Token server not configured. Using testing mode.');
  }
  
  // Log results
  if (errors.length > 0) {
    console.error('🚨 Agora Configuration Errors:');
    errors.forEach(err => console.error(err));
    return { valid: false, errors, warnings };
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Agora Configuration Warnings:');
    warnings.forEach(warn => console.warn(warn));
  }
  
  console.log('✅ Agora configuration validated successfully!');
  return { valid: true, errors: [], warnings };
}

/**
 * Get Agora Channel Configuration
 */
export function getChannelConfig(channelName, userId) {
  return {
    appId: AGORA_CONFIG.appId,
    channelName: channelName,
    uid: userId || 0,
    
    // Video settings
    videoEncoderConfiguration: {
      dimensions: {
        width: AGORA_CONFIG.videoProfile.width,
        height: AGORA_CONFIG.videoProfile.height,
      },
      frameRate: AGORA_CONFIG.videoProfile.frameRate,
      bitrate: AGORA_CONFIG.videoProfile.bitrate,
    },
    
    // Audio settings
    audioProfile: AGORA_CONFIG.audioProfile,
    
    // Features
    enableVideo: AGORA_CONFIG.enableVideo,
    enableAudio: AGORA_CONFIG.enableAudio,
  };
}

/**
 * Generate unique channel name
 */
export function generateChannelName(prefix = 'live') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Agora Event Handlers
 */
export const AgoraEventHandlers = {
  onUserJoined: (uid, elapsed) => {
    console.log(`👤 User joined: ${uid}, elapsed: ${elapsed}ms`);
  },
  
  onUserOffline: (uid, reason) => {
    console.log(`👋 User offline: ${uid}, reason: ${reason}`);
  },
  
  onJoinChannelSuccess: (channel, uid, elapsed) => {
    console.log(`✅ Join channel success: ${channel}, uid: ${uid}, elapsed: ${elapsed}ms`);
  },
  
  onLeaveChannel: (stats) => {
    console.log(`🚪 Leave channel:`, stats);
  },
  
  onError: (err) => {
    console.error('❌ Agora error:', err);
  },
  
  onWarning: (warn) => {
    console.warn('⚠️ Agora warning:', warn);
  },
  
  onConnectionStateChanged: (state, reason) => {
    console.log(`🔌 Connection state changed: ${state}, reason: ${reason}`);
  },
  
  onNetworkQuality: (uid, txQuality, rxQuality) => {
    // Quality: 0 = Unknown, 1 = Excellent, 2 = Good, 3 = Poor, 4 = Bad, 5 = Very Bad, 6 = Down
    if (txQuality > 3 || rxQuality > 3) {
      console.warn(`⚠️ Poor network quality for user ${uid}: TX=${txQuality}, RX=${rxQuality}`);
    }
  },
};

/**
 * Helper: Check if Agora is properly configured
 */
export function isAgoraConfigured() {
  return (
    AGORA_CONFIG.appId && 
    AGORA_CONFIG.appId !== 'YOUR_AGORA_APP_ID' &&
    AGORA_CONFIG.appId === 'efc51ac11ca648d6b9833416d087b5ae'
  );
}

/**
 * Helper: Get human-readable error messages
 */
export function getAgoraErrorMessage(errorCode) {
  const errorMessages = {
    2: 'Invalid App ID',
    3: 'Invalid Channel Name',
    5: 'Request Rejected',
    17: 'Join Channel Rejected',
    101: 'Invalid Token',
    102: 'Token Expired',
    109: 'Token Expired (Need to regenerate)',
    110: 'Invalid Token',
    111: 'Token Authentication Failed',
  };
  
  return errorMessages[errorCode] || `Unknown error: ${errorCode}`;
}

/**
 * Initialize Agora Engine Configuration
 */
export function getAgoraEngineConfig() {
  return {
    appId: AGORA_CONFIG.appId,
    // For React Native Agora SDK
    channelProfile: 1, // 1 = Live Broadcasting
    videoEncoderConfig: {
      width: AGORA_CONFIG.videoProfile.width,
      height: AGORA_CONFIG.videoProfile.height,
      frameRate: AGORA_CONFIG.videoProfile.frameRate,
      bitrate: AGORA_CONFIG.videoProfile.bitrate,
    },
  };
}

// Export configuration for easy access
export { AGORA_CONFIG };


