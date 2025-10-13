# Real-Time Audio and Video Calling Setup

This document explains how the real-time calling functionality has been implemented using ZegoCloud.

## Overview

The calling system has been integrated into the existing chat application with the following features:

- **Audio Calls**: Voice-only communication
- **Video Calls**: Video and audio communication
- **Call Controls**: Mute, speaker toggle, camera toggle (for video calls)
- **Call Signaling**: Real-time call invitations and responses
- **Call Duration**: Timer display during active calls

## Implementation Details

### 1. ZegoCloud Integration

The calling system uses ZegoCloud's Express Engine and ZIM (Zego Instant Messaging) for:
- **Express Engine**: Handles real-time audio/video streaming
- **ZIM**: Handles call signaling (invites, accepts, rejects, ends)

### 2. Files Added/Modified

#### New Files:
- `lib/zegoCloud.js` - ZegoCloud configuration and call management
- `components/CallInterface.jsx` - Call UI component

#### Modified Files:
- `app/(tabs)/chat.jsx` - Integrated calling functionality
- `package.json` - Added ZegoCloud dependencies

### 3. Dependencies Added

```json
{
  "zego-express-engine-webrtc": "^3.10.0",
  "zego-express-engine-reactnative": "^3.21.0-private.38",
  "zego-zim-react-native": "^2.21.8"
}
```

## How to Test

### Prerequisites

1. **Two Devices**: You need at least two devices to test calling
2. **Different User Accounts**: Each device should be logged in with different user accounts
3. **Network Connection**: Both devices need internet connectivity
4. **Permissions**: Camera and microphone permissions will be requested

### Testing Steps

#### Step 1: Start the Application
```bash
npm start
```

#### Step 2: Login with Different Users
1. On Device A: Login with User A
2. On Device B: Login with User B

#### Step 3: Start a Chat
1. From User A's device, search for User B
2. Start a chat conversation

#### Step 4: Test Audio Call
1. In the chat, tap the phone icon (audio call)
2. User B should receive a call notification
3. User B can accept or reject the call
4. If accepted, both users should be able to hear each other

#### Step 5: Test Video Call
1. In the chat, tap the video icon (video call)
2. User B should receive a video call notification
3. User B can accept or reject the call
4. If accepted, both users should see and hear each other

#### Step 6: Test Call Controls
During an active call:
- **Mute**: Tap the microphone icon to mute/unmute
- **Speaker**: Tap the speaker icon to toggle speaker mode
- **Camera** (video calls): Tap the camera icon to toggle camera
- **End Call**: Tap the red hangup button to end the call

## Troubleshooting

### Common Issues

1. **"Failed to initialize calling service"**
   - Check internet connection
   - Verify ZegoCloud credentials in `lib/zegoCloud.js`
   - Ensure all dependencies are installed

2. **"Failed to start call"**
   - Check if both users are online
   - Verify camera/microphone permissions
   - Check network connectivity

3. **No audio/video in calls**
   - Grant camera and microphone permissions
   - Check device audio settings
   - Ensure no other apps are using the camera/microphone

4. **Call not connecting**
   - Verify both users are logged in
   - Check ZegoCloud service status
   - Try restarting the application

### Debug Information

The application includes extensive logging. Check the console for:
- ZegoCloud initialization status
- Call state updates
- Stream publishing/playing status
- Error messages

## Configuration

### ZegoCloud Credentials

The current configuration uses:
- **App ID**: 158223577
- **App Sign**: 9b0834517039c7a6869ef9acd88503a9e9d1430ea0ce469b2f5a5a0a3fc65fc3
- **Server Secret**: 7c7a2a87c199d55966ccd7d9e6c516c0

### Environment Setup

For production, consider:
1. **Server-side token generation**: Implement proper token generation on your backend
2. **User authentication**: Ensure proper user authentication before allowing calls
3. **Call logging**: Add call history and analytics
4. **Push notifications**: Implement push notifications for incoming calls

## Security Considerations

1. **Token Generation**: In production, generate tokens server-side
2. **User Validation**: Validate users before allowing calls
3. **Rate Limiting**: Implement call rate limiting
4. **Privacy**: Ensure user consent for camera/microphone access

## Next Steps

1. **Group Calls**: Extend to support group audio/video calls
2. **Call Recording**: Add call recording functionality
3. **Screen Sharing**: Implement screen sharing for video calls
4. **Call Quality**: Add call quality indicators and optimization
5. **Push Notifications**: Add push notifications for incoming calls

## Support

For ZegoCloud-specific issues, refer to:
- [ZegoCloud Documentation](https://docs.zegocloud.com/)
- [ZegoCloud Support](https://www.zegocloud.com/support)

For application-specific issues, check the console logs and ensure all dependencies are properly installed.
