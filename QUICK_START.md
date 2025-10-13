# 🚀 Quick Start Guide - Live Streaming with Agora

## ⚡ 3 Steps to Start

### 1️⃣ Install Dependencies
```bash
npm install
```

### 2️⃣ Build Native App
```bash
# For Android:
npm run android

# For iOS:
npm run ios
```

### 3️⃣ Test Live Streaming
1. Open app on device/emulator
2. Go to "Live Streams" tab
3. Tap "Go Live" → Fill details → Start streaming
4. Open another device to watch!

---

## 📦 What's Included

✅ **Agora SDK** - Real-time video streaming
✅ **Broadcasting Component** - Stream your camera
✅ **Viewer Component** - Watch live streams
✅ **Token Server** - Secure authentication
✅ **Complete Documentation** - Both English & Urdu

---

## 🔑 Your Credentials

```javascript
App ID: efc51ac11ca648d6b9833416d087b5ae
App Certificate: 419c6e6a72cc4ea3b7036677d286a121
```

**Location:** `lib/config.js`

---

## 🎯 Features

### For Broadcasters:
- ✅ Live camera streaming
- ✅ Flip camera (front/back)
- ✅ Mute/unmute audio
- ✅ Toggle video on/off
- ✅ See viewer count
- ✅ Stream duration

### For Viewers:
- ✅ Watch live streams
- ✅ Change video quality
- ✅ Live chat
- ✅ Send reactions
- ✅ Picture-in-Picture mode

---

## 🔧 Optional: Token Server

For production security:

```bash
npm run token-server
```

Then update `lib/config.js`:
```javascript
tokenServerUrl: 'http://YOUR_IP:8080/token'
```

---

## 📚 Documentation

- **English:** `AGORA_SETUP_COMPLETE.md`
- **Urdu:** `AGORA_SETUP_URDU.md`

---

## ⚠️ Important Notes

1. **Must build native app** - Expo Go won't work
2. **Permissions required** - Camera + Microphone
3. **Good internet needed** - 2-3 Mbps upload speed
4. **Test on 2 devices** - One broadcaster, one viewer

---

## 🐛 Quick Troubleshooting

**No video showing?**
→ Grant camera permissions

**Can't join channel?**
→ Check internet connection

**High delay?**
→ Use better internet (WiFi/4G/5G)

---

## 💡 How It Works

```
Broadcaster → Agora Cloud → Viewers
    📹           ☁️          👁️
   (You)     (< 500ms)   (Audience)
```

**Ultra-low latency:** Only 300-500ms delay!

---

## 🎉 Ready to Go!

Everything is configured and ready. Just run:

```bash
npm install
npm run android  # or npm run ios
```

**Happy Streaming! 🎥✨**

