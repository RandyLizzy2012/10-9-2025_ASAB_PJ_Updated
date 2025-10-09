# Google Authentication Setup Guide

This guide will help you set up Google OAuth authentication for your app using Appwrite's built-in OAuth support.

## ⚠️ Current Issue: OAuth Not Configured

The error `User (role: guests) missing scope (account)` indicates that Google OAuth is not properly configured in your Appwrite project. Follow the steps below to fix this.

## Step 1: Configure Appwrite OAuth (Required)

### 1.1 Access Appwrite Console
1. Go to your [Appwrite Console](https://console.appwrite.io/)
2. Select your project (the one with ID: `6854922e0036a1e8dee6`)

### 1.2 Enable Google OAuth Provider
1. Navigate to **Auth** → **OAuth2 Providers**
2. Find **Google** in the list of providers
3. Click the toggle to **Enable** Google OAuth
4. You'll see configuration fields appear

### 1.3 Configure Google OAuth Settings
Fill in the following fields:

**Client ID**: Your Google OAuth Client ID (see Step 2)
**Client Secret**: Your Google OAuth Client Secret (see Step 2)
**Redirect URL**: `com.jsm.asabcorp://auth`

### 1.4 Save Configuration
1. Click **Save** to apply the changes
2. The Google OAuth provider should now show as **Enabled**

## Step 2: Get Google OAuth Credentials

### 2.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** and **Google OAuth2 API**

### 2.2 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application** as the application type
4. Set the following:
   - **Name**: Your app name (e.g., "ASAB App")
   - **Authorized redirect URIs**:
     - `https://nyc.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google`
     - `com.jsm.asabcorp://auth`

### 2.3 Copy Credentials
1. After creating, you'll get a **Client ID** and **Client Secret**
2. Copy these values
3. Go back to your Appwrite console and paste them in the Google OAuth configuration

## Step 3: Test the Implementation

### 3.1 Verify Configuration
1. In Appwrite console, go to **Auth** → **OAuth2 Providers**
2. Ensure Google shows as **Enabled**
3. Verify the Client ID and Secret are saved

### 3.2 Test in Your App
1. Run your app: `npm start`
2. Go to the sign-in or sign-up page
3. Click **"Continue with Google"**
4. You should be redirected to Google's login page
5. After successful login, you should be redirected back to your app

## Troubleshooting

### Common Issues and Solutions:

#### 1. "User (role: guests) missing scope (account)"
**This is the exact error you're experiencing**

**Solution**: Google OAuth is not properly configured in Appwrite
1. **Go to Appwrite Console**: [console.appwrite.io](https://console.appwrite.io/)
2. **Select your project**: ID: `6854922e0036a1e8dee6`
3. **Navigate to Auth → OAuth2 Providers**
4. **Find Google and click Enable**
5. **Add your Google credentials**:
   - **Client ID**: Your Google OAuth Client ID
   - **Client Secret**: Your Google OAuth Client Secret
   - **Redirect URL**: `com.jsm.asabcorp://auth`
6. **Click Save**
7. **Verify the provider shows as "Enabled"**

**If still getting the error**:
- Check that your Google Cloud OAuth credentials are correct
- Verify the redirect URIs in Google Cloud Console include:
  - `https://nyc.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google`
  - `com.jsm.asabcorp://auth`
- Make sure the Google+ API and Google OAuth2 API are enabled in Google Cloud Console

#### 2. "Invalid redirect URI"
**Solution**: Check redirect URI configuration
- In Google Cloud Console, verify the redirect URIs include:
  - `https://nyc.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google`
  - `com.jsm.asabcorp://auth`

#### 3. "OAuth provider not found"
**Solution**: Provider not enabled
- Make sure Google OAuth is enabled in Appwrite console
- Check that you're using the correct project ID

#### 4. Authentication fails silently
**Solution**: Check console logs
- Look for detailed error messages in the app console
- Verify all configuration steps are completed

### Debug Steps:

1. **Check Appwrite Console**:
   - Verify Google OAuth is enabled
   - Check that Client ID and Secret are saved
   - Ensure redirect URL is correct

2. **Check Google Cloud Console**:
   - Verify OAuth 2.0 credentials are created
   - Check that redirect URIs are correct
   - Ensure APIs are enabled

3. **Check App Configuration**:
   - Verify app.json has correct scheme: `com.jsm.asabcorp`
   - Check that the app is running with latest changes

### Verification Checklist:

**Before testing Google Sign-In, verify these settings**:

#### Appwrite Console Settings:
- [ ] Google OAuth provider is **Enabled**
- [ ] Client ID is entered and saved
- [ ] Client Secret is entered and saved
- [ ] Redirect URL is set to: `com.jsm.asabcorp://auth`
- [ ] Project ID matches: `6854922e0036a1e8dee6`

#### Google Cloud Console Settings:
- [ ] OAuth 2.0 Client ID is created
- [ ] Application type is set to "Web application"
- [ ] Authorized redirect URIs include:
  - [ ] `https://nyc.cloud.appwrite.io/v1/account/sessions/oauth2/callback/google`
  - [ ] `com.jsm.asabcorp://auth`
- [ ] Google+ API is enabled
- [ ] Google OAuth2 API is enabled

#### App Configuration:
- [ ] app.json has correct scheme: `com.jsm.asabcorp`
- [ ] App is running with latest changes
- [ ] Metro cache is cleared (`npm start -- --clear`)

### Testing the Configuration:

1. **Clear any existing sessions**:
   ```bash
   npm start -- --clear
   ```

2. **Test Google Sign-In**:
   - Go to sign-in or sign-up page
   - Click "Continue with Google"
   - Check console logs for detailed error messages

3. **If still failing**:
   - Check the console logs for the exact error message
   - Verify all items in the checklist above
   - Try creating a new OAuth 2.0 Client ID in Google Cloud Console 