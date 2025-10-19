# 🚀 Appwrite Live Streaming Collections Setup Guide

## ⚠️ IMPORTANT: You need to create these collections in your Appwrite console

The error you're seeing (`Collection with the requested ID could not be found`) means the collections don't exist yet in your Appwrite database.

## 📋 Step-by-Step Setup Instructions

### 1. Access Your Appwrite Console
1. Go to [https://cloud.appwrite.io/console](https://cloud.appwrite.io/console)
2. Select your project: **ASAB Corp** (Project ID: `6854922e0036a1e8dee6`)
3. Navigate to **Databases** in the left sidebar
4. Select your database: **Database ID: `685494a1002f8417c2b2`**

### 2. Create Live Streams Collection

**Collection Name:** `Live Streams`  
**Collection ID:** `68f20f1f00332e083aff` (use this exact ID)

**Attributes to create:**
- `hostId` - String, Required, Size: 255
- `hostUsername` - String, Required, Size: 255  
- `hostAvatar` - String, Required, Size: 1000
- `title` - String, Required, Size: 500
- `description` - String, Optional, Size: 1000
- `category` - String, Required, Size: 100
- `isLive` - Boolean, Required
- `status` - String, Required, Size: 50
- `viewerCount` - Integer, Required
- `startTime` - DateTime, Required
- `endTime` - DateTime, Optional
- `thumbnail` - String, Optional, Size: 1000
- `streamUrl` - String, Optional, Size: 1000

### 3. Create Live Comments Collection

**Collection Name:** `Live Comments`  
**Collection ID:** `68f1fa55001f27618fa3` (use this exact ID)

**Attributes to create:**
- `streamId` - String, Required, Size: 255
- `userId` - String, Required, Size: 255
- `username` - String, Required, Size: 255
- `avatar` - String, Optional, Size: 1000
- `content` - String, Required, Size: 1000

### 4. Create Live Reactions Collection

**Collection Name:** `Live Reactions`  
**Collection ID:** `68f1f808001762821ffd` (use this exact ID)

**Attributes to create:**
- `streamId` - String, Required, Size: 255
- `userId` - String, Required, Size: 255
- `reactionType` - String, Required, Size: 100

### 5. Set Collection Permissions

For each collection, set these permissions:
- **Read**: `any` (so anyone can view live streams and comments)
- **Create**: `users` (only authenticated users can create)
- **Update**: `users` (only authenticated users can update)
- **Delete**: `users` (only authenticated users can delete)

## 🔧 Alternative: Use Auto-Generated IDs

If you prefer to let Appwrite generate the collection IDs automatically:

1. Create the collections with any names you want
2. Copy the generated collection IDs from the Appwrite console
3. Update the IDs in `lib/appwrite.js`:

```javascript
liveStreamsCollectionId: "your-actual-collection-id-here",
liveCommentsCollectionId: "your-actual-collection-id-here", 
liveReactionsCollectionId: "your-actual-collection-id-here",
```

## ✅ Verification Steps

After creating the collections:

1. **Check Collection IDs**: Make sure they match exactly in `lib/appwrite.js`
2. **Test the App**: Try creating a live stream or adding a comment
3. **Check Console**: Look for any remaining errors

## 🆘 Still Having Issues?

If you're still getting errors:

1. **Double-check Collection IDs**: They must match exactly (case-sensitive)
2. **Verify Database ID**: Make sure you're using the correct database
3. **Check Permissions**: Ensure the collections have proper read/write permissions
4. **Restart the App**: Sometimes you need to restart the development server

## 📞 Need Help?

If you need help with the Appwrite setup, you can:
1. Check the Appwrite documentation: [https://appwrite.io/docs](https://appwrite.io/docs)
2. Look at your existing collections for reference
3. Make sure you're using the correct project and database

---

**Once you've created these collections, your live streaming functionality should work perfectly!** 🎉
