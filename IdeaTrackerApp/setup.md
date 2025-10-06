# Quick Setup Guide for IdeaTracker

Follow these steps to get IdeaTracker running on your device:

## 🚀 Step 1: Prerequisites

Make sure you have:
- [Node.js 18+](https://nodejs.org/) installed
- [React Native CLI](https://reactnative.dev/docs/environment-setup) set up
- [Android Studio](https://developer.android.com/studio) (for Android)
- [Xcode](https://developer.apple.com/xcode/) (for iOS, macOS only)

## 📱 Step 2: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd IdeaTrackerApp

# Install dependencies
npm install
# or
yarn install
```

## 🔥 Step 3: Firebase Setup (Required)

1. **Go to [Firebase Console](https://console.firebase.google.com/)**
2. **Create a new project** or select existing one
3. **Add Android app:**
   - Package name: Check `android/app/build.gradle` for `applicationId`
   - Download `google-services.json` → place in `android/app/`
4. **Add iOS app:**
   - Bundle ID: Check `ios/IdeaTrackerApp/Info.plist` for `CFBundleIdentifier`
   - Download `GoogleService-Info.plist` → place in `ios/IdeaTrackerApp/`
5. **Enable services:**
   - **Authentication** → Sign-in methods → Anonymous (enable)
   - **Firestore Database** → Create database → Start in test mode

## 🤖 Step 4: AI Setup (Optional)

For enhanced idea categorization:

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Edit `src/services/ai/ideaProcessor.ts`
3. Replace `'YOUR_API_KEY_HERE'` with your key
4. Set `USE_AI = true`

**Note**: App works without AI using local processing!

## 🗺️ Step 5: Google Maps (Optional)

For map functionality:

1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Edit `src/screens/MapScreen.tsx`
3. Replace `'YOUR_GOOGLE_MAPS_API_KEY'` with your key

## ▶️ Step 6: Run the App

### Android
```bash
# Start Metro bundler
npm start

# In new terminal, run Android
npm run android
```

### iOS
```bash
# Install CocoaPods dependencies
cd ios && bundle install && cd ..

# Start Metro bundler
npm start

# In new terminal, run iOS
npm run ios
```

## ✅ Step 7: Test the App

1. **Quick Capture**: Tap the + button and try:
   - "Try Papa Johns" (should be location)
   - "Learn French" (should be habit)
   - "Try Chinese food" (should be one-time task)

2. **Home Screen**: View all your ideas with category filters

3. **Map View**: See location-based ideas on a map

## 🔧 Troubleshooting

### Common Issues:

**"Firebase not configured"**
- Check `google-services.json` and `GoogleService-Info.plist` files
- Verify Firebase project settings

**"AI not working"**
- Check OpenAI API key in `ideaProcessor.ts`
- Ensure internet connection

**"Maps not loading"**
- Check Google Maps API key
- Verify billing is enabled in Google Cloud Console

**Build errors**
- Run `npm install` again
- Clear Metro cache: `npm start -- --reset-cache`
- For iOS: `cd ios && pod install && cd ..`

### Still having issues?

1. Check the console logs for error messages
2. Verify all configuration files are in place
3. Ensure Firebase services are enabled
4. Check your internet connection

## 🎯 What's Next?

Once the app is running:

- **Add your first idea** using Quick Capture
- **Explore the different screens** and navigation
- **Customize the AI prompts** in `ideaProcessor.ts`
- **Add your own categories** and tags
- **Integrate with other services** as needed

---

**Need help?** Check the main README.md for detailed documentation or open an issue on GitHub.
