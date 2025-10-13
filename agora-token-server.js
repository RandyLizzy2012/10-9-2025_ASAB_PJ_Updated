/**
 * Agora Token Generation Server
 * 
 * This server generates RTC tokens for Agora live streaming
 * 
 * Installation:
 * npm install express agora-access-token cors
 * 
 * Usage:
 * node agora-token-server.js
 * 
 * API Endpoint:
 * GET /rtc/:channelName/:role/:tokenType/:uid
 * 
 * Example:
 * http://localhost:8080/rtc/stream_123/publisher/uid/12345
 */

const express = require('express');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const cors = require('cors');

// Agora Configuration
const AGORA_APP_ID = 'efc51ac11ca648d6b9833416d087b5ae';
const AGORA_APP_CERTIFICATE = '419c6e6a72cc4ea3b7036677d286a121';

const app = express();
const PORT = 8080;

// Enable CORS
app.use(cors());

// Token expiration time (24 hours)
const expirationTimeInSeconds = 24 * 3600;

/**
 * Generate RTC Token
 * 
 * @route GET /rtc/:channelName/:role/:tokenType/:uid
 * @param {string} channelName - Channel name
 * @param {string} role - publisher or audience
 * @param {string} tokenType - uid or userAccount
 * @param {string} uid - User ID (number) or user account (string)
 */
app.get('/rtc/:channelName/:role/:tokenType/:uid', (req, res) => {
  try {
    const { channelName, role, tokenType, uid } = req.params;

    // Validate inputs
    if (!channelName || !role || !tokenType || !uid) {
      return res.status(400).json({
        error: 'Missing required parameters',
        required: 'channelName, role, tokenType, uid'
      });
    }

    // Determine role
    let agoraRole;
    if (role === 'publisher') {
      agoraRole = RtcRole.PUBLISHER;
    } else if (role === 'audience') {
      agoraRole = RtcRole.SUBSCRIBER;
    } else {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be either "publisher" or "audience"'
      });
    }

    // Calculate privilege expiration time
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Generate token
    let token;
    if (tokenType === 'userAccount') {
      token = RtcTokenBuilder.buildTokenWithAccount(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uid,
        agoraRole,
        privilegeExpiredTs
      );
    } else if (tokenType === 'uid') {
      const uidInt = parseInt(uid);
      if (isNaN(uidInt)) {
        return res.status(400).json({
          error: 'Invalid UID',
          message: 'UID must be a number when tokenType is "uid"'
        });
      }

      token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uidInt,
        agoraRole,
        privilegeExpiredTs
      );
    } else {
      return res.status(400).json({
        error: 'Invalid tokenType',
        message: 'tokenType must be either "uid" or "userAccount"'
      });
    }

    // Return token
    res.json({
      token: token,
      appId: AGORA_APP_ID,
      channelName: channelName,
      uid: uid,
      role: role,
      expiresIn: expirationTimeInSeconds,
      expiresAt: privilegeExpiredTs
    });

  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      error: 'Failed to generate token',
      message: error.message
    });
  }
});

/**
 * Simplified endpoint for quick token generation
 * 
 * @route GET /token
 * @query {string} channelName - Channel name
 * @query {string} uid - User ID (defaults to 0)
 * @query {string} role - publisher or audience (defaults to publisher)
 */
app.get('/token', (req, res) => {
  try {
    const channelName = req.query.channelName;
    const uid = parseInt(req.query.uid || '0');
    const role = req.query.role === 'audience' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

    if (!channelName) {
      return res.status(400).json({
        error: 'Missing channelName',
        message: 'Please provide channelName as query parameter'
      });
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpiredTs
    );

    res.json({
      token: token,
      appId: AGORA_APP_ID,
      channelName: channelName,
      uid: uid,
      expiresIn: expirationTimeInSeconds
    });

  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({
      error: 'Failed to generate token',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    appId: AGORA_APP_ID,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Agora Token Server Started!');
  console.log('━'.repeat(50));
  console.log(`📡 Server running at: http://localhost:${PORT}`);
  console.log(`🔑 App ID: ${AGORA_APP_ID}`);
  console.log(`⏰ Token expiration: ${expirationTimeInSeconds / 3600} hours`);
  console.log('━'.repeat(50));
  console.log('\n📝 API Endpoints:');
  console.log(`   GET /token?channelName=<name>&uid=<uid>&role=<role>`);
  console.log(`   GET /rtc/:channelName/:role/:tokenType/:uid`);
  console.log(`   GET /health`);
  console.log('\n💡 Example:');
  console.log(`   curl "http://localhost:${PORT}/token?channelName=test&uid=12345&role=publisher"`);
  console.log('\n✅ Ready to generate tokens!\n');
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
});

