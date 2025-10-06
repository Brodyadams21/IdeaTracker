# IdeaTracker - AI-Powered Idea Management App

A React Native mobile app that helps you capture, organize, and track your ideas using intelligent AI categorization.

## Features

- **🤖 AI-Powered Categorization**: Automatically categorizes ideas as locations, habits, or one-time tasks
- **📍 Location Tracking**: Map view for places to visit with geocoding support
- **🔄 Habit Management**: Track daily routines and learning goals
- **✨ Quick Capture**: Simple interface to capture ideas on the go
- **🏷️ Smart Tagging**: Automatic tag generation for easy organization
- **🗺️ Interactive Maps**: Visual representation of location-based ideas
- **📊 Statistics**: Track your idea patterns and progress

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn
- React Native development environment set up
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Firebase Setup

The app uses Firebase for backend services. Follow these steps:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Add Android app:
   - Package name: Check `android/app/build.gradle`
   - Download `google-services.json` and place in `android/app/`
4. Add iOS app:
   - Bundle ID: Check `ios/IdeaTrackerApp/Info.plist`
   - Download `GoogleService-Info.plist` and place in `ios/IdeaTrackerApp/`
5. Enable services:
   - **Authentication** → Sign-in method → Anonymous (enable)
   - **Firestore Database** → Create database → Start in test mode

### 3. AI Configuration (Optional)

For AI-powered idea categorization:

1. Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Edit `src/services/ai/ideaProcessor.ts`
3. Replace `'YOUR_API_KEY_HERE'` with your actual API key
4. Set `USE_AI = true`

**Note**: The app works without AI using local processing. AI enhances categorization but isn't required.

### 4. Google Maps (Optional)

For map functionality:

1. Get a Google Maps API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Edit `src/screens/MapScreen.tsx`
3. Replace `'YOUR_GOOGLE_MAPS_API_KEY'` with your actual API key

### 5. Run the App

#### Android
```bash
npm run android
# or
yarn android
```

#### iOS
```bash
cd ios && bundle install && cd ..
npm run ios
# or
yarn ios
```

## How It Works

### Idea Categories

- **📍 Locations**: Places to visit (restaurants, cities, landmarks)
- **🔄 Habits**: Repeated activities (learning, exercise, daily routines)
- **✨ One-Time Tasks**: Single activities (trying new foods, calling someone)

### Smart Examples

- "Try Papa Johns" → Location (specific restaurant)
- "Learn French" → Habit (ongoing learning)
- "Try Chinese food" → One-time task (no specific restaurant)
- "Meditate daily" → Habit (daily routine)

### AI Processing

The app uses OpenAI's GPT-3.5 to:
- Categorize ideas intelligently
- Extract metadata (priority, estimated time, sentiment)
- Generate relevant tags
- Provide context-aware processing

## Project Structure

```
src/
├── components/          # Reusable UI components
├── config/             # Firebase and app configuration
├── navigation/         # App navigation setup
├── screens/           # Main app screens
│   ├── HomeScreen.tsx    # Dashboard with all ideas
│   ├── QuickCapture.tsx  # Idea input and processing
│   ├── MapScreen.tsx     # Location-based ideas map
│   └── IdeaDetail.tsx    # Detailed idea view
├── services/          # Business logic and AI
│   └── ai/
│       └── ideaProcessor.ts  # AI categorization logic
└── navigation/
    └── AppNavigator.tsx      # Main navigation structure
```

## Troubleshooting

### Common Issues

1. **Firebase connection errors**: Check your `google-services.json` and `GoogleService-Info.plist` files
2. **AI not working**: Verify your OpenAI API key and internet connection
3. **Maps not loading**: Check your Google Maps API key and billing setup
4. **Build errors**: Ensure all native dependencies are properly linked

### Development Tips

- The app uses anonymous authentication by default
- Local processing works offline without AI
- Check console logs for debugging information
- Use React Native Debugger for better debugging experience

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the troubleshooting section
- Review Firebase and React Native documentation
- Open an issue on GitHub

---

**Note**: This app is designed to work out of the box with minimal configuration. Firebase anonymous auth and local processing ensure basic functionality without external API keys.
