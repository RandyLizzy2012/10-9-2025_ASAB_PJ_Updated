# Live Streaming Database Setup

This document outlines the database collections that need to be created in Appwrite for the live streaming functionality to work properly.

## Required Collections

### 1. Live Streams Collection
**Collection ID:** `68f20f1f00332e083aff`

**Attributes:**
- `hostId` (String, Required) - ID of the user hosting the stream
- `hostUsername` (String, Required) - Username of the host
- `hostAvatar` (String, Required) - Avatar URL of the host
- `title` (String, Required) - Title of the live stream
- `description` (String, Optional) - Description of the stream
- `category` (String, Optional) - Category of the stream (default: 'General')
- `isLive` (Boolean, Required) - Whether the stream is currently live
- `status` (String, Required) - Status of the stream ('live', 'ended')
- `viewerCount` (Integer, Required) - Number of current viewers
- `startTime` (DateTime, Required) - When the stream started
- `endTime` (DateTime, Optional) - When the stream ended
- `thumbnail` (String, Optional) - Thumbnail URL for the stream
- `streamUrl` (String, Optional) - URL for the actual video stream

### 2. Live Comments Collection
**Collection ID:** `68f1fa55001f27618fa3`

**Attributes:**
- `streamId` (String, Required) - ID of the stream this comment belongs to
- `userId` (String, Required) - ID of the user who made the comment
- `username` (String, Required) - Username of the commenter
- `avatar` (String, Optional) - Avatar URL of the commenter
- `content` (String, Required) - The comment content

### 3. Live Reactions Collection
**Collection ID:** `68f1f808001762821ffd`

**Attributes:**
- `streamId` (String, Required) - ID of the stream this reaction belongs to
- `userId` (String, Required) - ID of the user who made the reaction
- `reactionType` (String, Required) - Type of reaction (emoji or reaction name)

## Setup Instructions

1. **Create the Collections in Appwrite Console:**
   - Go to your Appwrite console
   - Navigate to your database
   - Create each collection with the specified attributes
   - Note down the collection IDs and update them in `lib/appwrite.js` if different

2. **Set Permissions:**
   - For Live Streams: Allow read access to all users, write access to authenticated users
   - For Live Comments: Allow read/write access to authenticated users
   - For Live Reactions: Allow read/write access to authenticated users

3. **Update Collection IDs:**
   - If your collection IDs are different from the ones specified, update them in `lib/appwrite.js`

## Notes

- The `$createdAt` and `$updatedAt` attributes are automatically created by Appwrite
- The polling-based approach is used instead of real-time subscriptions for better reliability
- Comments are polled every 2 seconds, stream updates every 3 seconds
- Make sure your Appwrite project has the correct permissions set for these collections

## Testing

After setting up the collections, you can test the live streaming functionality by:
1. Creating a live stream
2. Adding comments to the stream
3. Checking if the polling updates work correctly
4. Verifying that viewer counts update properly
