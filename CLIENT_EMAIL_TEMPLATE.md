# 📧 Email Template for Client (Agora Credentials Request)

Copy paste this email and send to your client:

---

**Subject: Agora Credentials Required for Video Streaming Integration**

Hi [Client Name],

I hope this email finds you well!

We are currently integrating **Agora** for live streaming and video calling features in the app. To proceed with the implementation, we need the following credentials from your Agora account:

## 🔑 Required Credentials:

### 1. **Agora App ID** (Mandatory)
- Location: Agora Console → Project Management → Your Project
- It looks like: `4a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p`

### 2. **Agora App Certificate** (Mandatory for Security)
- Location: Agora Console → Project Management → Configure
- It looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

### 3. **Token Server URL** (Recommended for Production)
- If you have a backend server for generating tokens
- Example: `https://your-backend.com/api/agora/token`
- If not, we can help set this up

---

## 📝 How to Get These:

If you don't have an Agora account yet, please follow these steps:

1. **Create Account:**
   - Go to: https://console.agora.io/
   - Sign up (Free account available)

2. **Create a Project:**
   - Click "Project Management"
   - Click "Create" button
   - Enter project name
   - Select "Secured mode: APP ID + Token"

3. **Get App ID:**
   - Click on your project
   - Copy the "App ID"

4. **Enable Certificate:**
   - Click "Configure" button
   - Click "Enable" under "Primary Certificate"
   - Copy the certificate

5. **Share Credentials:**
   - Reply to this email with:
     - App ID
     - App Certificate
     - Token Server URL (if available)

---

## 💰 Pricing Information:

Agora offers:
- ✅ **10,000 minutes/month FREE**
- ✅ First 10,000 minutes are completely free every month
- 💰 After that: ~$0.99 per 1,000 minutes

For our current usage, the free tier should be more than sufficient.

---

## 🔒 Security Note:

- Please share these credentials through a **secure channel**
- These are sensitive credentials and should not be exposed publicly
- We will store them securely in our backend environment variables

---

## ⏰ Timeline:

Once we receive these credentials, we can:
- Complete the integration within 1-2 days
- Conduct testing
- Deploy to production

Please let me know if you need any assistance with:
- Creating the Agora account
- Navigating the console
- Setting up the token server

Looking forward to your response!

Best regards,  
[Your Name]

---

## 📎 Attachments:

I've attached a detailed guide (AGORA_CLIENT_REQUIREMENTS.md) that explains everything in detail.

---


