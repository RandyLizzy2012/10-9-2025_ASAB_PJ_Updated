# Appwrite Collections Schema

## Quick Setup Guide

Create these 3 collections in your Appwrite console with the exact specifications below.

---

## Collection 1: Live Streams

### Collection Settings
- **Name:** Live Streams
- **Collection ID:** (Copy this and paste into `lib/appwrite.js`)

### Attributes

| Attribute Name | Type | Size | Required | Array | Default |
|----------------|------|------|----------|-------|---------|
| hostId | String | 100 | Yes | No | - |
| hostUsername | String | 100 | Yes | No | - |
| hostAvatar | String | 500 | No | No | - |
| title | String | 200 | Yes | No | - |
| description | String | 500 | No | No | - |
| category | String | 50 | Yes | No | General |
| isLive | Boolean | - | Yes | No | true |
| viewerCount | Integer | Min: 0, Max: 999999 | Yes | No | 0 |
| viewers | String | 100 | No | Yes | [] |
| startTime | String | 50 | Yes | No | - |
| endTime | String | 50 | No | No | - |
| thumbnail | String | 500 | No | No | - |

### Indexes

1. **isLive_index**
   - Type: Key
   - Attributes: isLive
   - Order: ASC

2. **hostId_index**
   - Type: Key
   - Attributes: hostId
   - Order: DESC

### Permissions

```
Document Security: Enabled

Read Access:
- Role: Any

Create Documents:
- Role: Users

Update Documents:
- Role: Users

Delete Documents:
- Role: Users
```

---

## Collection 2: Live Comments

### Collection Settings
- **Name:** Live Comments
- **Collection ID:** (Copy this and paste into `lib/appwrite.js`)

### Attributes

| Attribute Name | Type | Size | Required | Array | Default |
|----------------|------|------|----------|-------|---------|
| streamId | String | 100 | Yes | No | - |
| userId | String | 100 | Yes | No | - |
| username | String | 100 | Yes | No | - |
| avatar | String | 500 | No | No | - |
| content | String | 500 | Yes | No | - |
| createdAt | String | 50 | Yes | No | - |

### Indexes

1. **streamId_index**
   - Type: Key
   - Attributes: streamId
   - Order: DESC

2. **createdAt_index**
   - Type: Key
   - Attributes: createdAt
   - Order: DESC

### Permissions

```
Document Security: Enabled

Read Access:
- Role: Any

Create Documents:
- Role: Users

Update Documents:
- Role: Users

Delete Documents:
- Role: Users
```

---

## Collection 3: Live Reactions

### Collection Settings
- **Name:** Live Reactions
- **Collection ID:** (Copy this and paste into `lib/appwrite.js`)

### Attributes

| Attribute Name | Type | Size | Required | Array | Default |
|----------------|------|------|----------|-------|---------|
| streamId | String | 100 | Yes | No | - |
| userId | String | 100 | Yes | No | - |
| reactionType | String | 50 | Yes | No | - |
| createdAt | String | 50 | Yes | No | - |

### Indexes

1. **streamId_index**
   - Type: Key
   - Attributes: streamId
   - Order: DESC

2. **createdAt_index**
   - Type: Key
   - Attributes: createdAt
   - Order: DESC

### Permissions

```
Document Security: Enabled

Read Access:
- Role: Any

Create Documents:
- Role: Users

Update Documents:
- Role: Users

Delete Documents:
- Role: Users
```

---

## Step-by-Step Creation Guide

### For Each Collection:

1. **Go to Appwrite Console**
   - Navigate to your project
   - Click on "Databases"
   - Select your database

2. **Create Collection**
   - Click "Create Collection"
   - Enter the collection name
   - Click "Create"

3. **Add Attributes**
   - For each attribute in the table:
     - Click "Create Attribute"
     - Select the type
     - Enter the attribute name
     - Set the size/constraints
     - Mark as required if specified
     - Set default value if specified
     - Click "Create"

4. **Create Indexes**
   - Click "Indexes" tab
   - For each index:
     - Click "Create Index"
     - Enter the index key
     - Select the attributes
     - Choose the order (ASC/DESC)
     - Click "Create"

5. **Set Permissions**
   - Click "Settings" tab
   - Scroll to "Permissions"
   - Enable "Document Security"
   - Add permissions as specified above

6. **Copy Collection ID**
   - At the top of the collection page
   - Copy the Collection ID
   - Paste into `lib/appwrite.js`

---

## Update lib/appwrite.js

After creating all collections, open `lib/appwrite.js` and update:

```javascript
export const appwriteConfig = {
  // ... existing config
  liveStreamsCollectionId: "PASTE_LIVE_STREAMS_COLLECTION_ID",
  liveCommentsCollectionId: "PASTE_LIVE_COMMENTS_COLLECTION_ID",
  liveReactionsCollectionId: "PASTE_LIVE_REACTIONS_COLLECTION_ID",
};
```

---

## Verification Checklist

Before testing, verify:

- [ ] All 3 collections created
- [ ] All attributes added with correct types and sizes
- [ ] All indexes created
- [ ] Permissions set correctly
- [ ] Collection IDs updated in `lib/appwrite.js`
- [ ] Realtime enabled in Appwrite project settings

---

## Common Issues

### "Collection not found"
- Verify collection ID is correct in `lib/appwrite.js`
- Ensure you copied the ID correctly (no extra spaces)

### "Permission denied"
- Check document security is enabled
- Verify "Role: Any" is set for Read access
- Verify "Role: Users" is set for Create/Update/Delete

### "Attribute validation failed"
- Check attribute sizes match the schema
- Verify required fields are set
- Check data types match (String, Integer, Boolean)

---

## Need Help?

See `LIVE_STREAMING_SETUP.md` for detailed explanations and troubleshooting.

