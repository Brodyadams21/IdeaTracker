# IdeaTracker - AI-Powered Idea Management App

A modern React Native mobile app that helps you capture, organize, and track your ideas using intelligent AI categorization and beautiful, intuitive design.

## ✨ Features

- **🤖 AI-Powered Categorization**: Automatically categorizes ideas as locations, habits, or one-time tasks
- **📍 Location Tracking**: Map view for places to visit with geocoding support
- **🔄 Habit Management**: Track daily routines and learning goals
- **✨ Quick Capture**: Simple interface to capture ideas on the go
- **🏷️ Smart Tagging**: Automatic tag generation for easy organization
- **🗺️ Interactive Maps**: Visual representation of location-based ideas
- **📊 Statistics**: Track your idea patterns and progress
- **🎨 Beautiful UI**: Modern, intuitive design with smooth animations
- **📱 Cross-Platform**: Works on both iOS and Android
- **🔒 Secure**: Firebase authentication and data storage

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm/yarn
- React Native development environment set up
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Configure API Keys

Edit `src/config/api.ts` and replace the placeholder values with your actual API keys:

```typescript
export const API_CONFIG = {
  FIREBASE: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    // ... other Firebase config
  },
  OPENAI: {
    apiKey: 'YOUR_OPENAI_API_KEY',
    // ... other OpenAI config
  },
  GOOGLE_MAPS: {
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    // ... other Google Maps config
  },
};
```

### 3. Firebase Setup

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

### 4. Run the App

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

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── LoadingSpinner.tsx
│   └── ErrorBoundary.tsx
├── config/             # Configuration files
│   ├── api.ts          # Centralized API configuration
│   └── firebase.ts     # Firebase setup
├── context/            # React Context for state management
│   └── AppContext.tsx
├── navigation/         # Navigation setup
│   └── AppNavigator.tsx
├── screens/           # Main app screens
│   ├── HomeScreen.tsx
│   ├── CaptureScreen.tsx
│   ├── ListsScreen.tsx
│   ├── MapScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── IdeaDetailScreen.tsx
│   ├── EditIdeaScreen.tsx
│   ├── SettingsScreen.tsx
│   └── AboutScreen.tsx
├── services/          # Business logic and external services
│   ├── aiService.ts
│   ├── dataService.ts
│   └── locationService.ts
├── types/             # TypeScript type definitions
│   └── index.ts
└── utils/             # Utility functions
```

## 🎯 How It Works

### Idea Categories

- **📍 Locations**: Places to visit (restaurants, cities, landmarks)
- **🔄 Habits**: Repeated activities (learning, exercise, daily routines)
- **✨ One-Time Tasks**: Single activities (trying new foods, calling someone)

### AI Processing

The app uses OpenAI's GPT-3.5 to:
- Categorize ideas intelligently
- Extract metadata (priority, estimated time, sentiment)
- Generate relevant tags
- Provide context-aware processing

### Smart Examples

- "Try Papa Johns" → Location (specific restaurant)
- "Learn French" → Habit (ongoing learning)
- "Try Chinese food" → One-time task (no specific restaurant)
- "Meditate daily" → Habit (daily routine)

## 🔧 Configuration

### API Keys Required

1. **Firebase**: For authentication and data storage
2. **OpenAI**: For AI-powered categorization (optional)
3. **Google Maps**: For map functionality (optional)

### Environment Variables

The app uses a centralized configuration system in `src/config/api.ts`. All API keys are managed in one place for easy setup.

## 🎨 Design System

The app follows a consistent design system with:
- **Colors**: Primary blue (#007AFF), success green (#34C759), error red (#FF3B30)
- **Typography**: System fonts with proper hierarchy
- **Components**: Reusable, accessible components
- **Animations**: Smooth transitions and micro-interactions

## 📱 Screenshots

- **Home**: Dashboard with all ideas and quick actions
- **Capture**: Simple form to add new ideas with AI suggestions
- **Lists**: Organized view with filtering and sorting
- **Map**: Interactive map showing location-based ideas
- **Profile**: User stats and settings

## 🚀 Production Deployment

### Android

1. Generate a signed APK:
```bash
cd android
./gradlew assembleRelease
```

2. Or build an AAB for Google Play:
```bash
cd android
./gradlew bundleRelease
```

### iOS

1. Open `ios/IdeaTrackerApp.xcworkspace` in Xcode
2. Select your development team
3. Build and archive for App Store submission

## 🐛 Troubleshooting

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the troubleshooting section
- Review Firebase and React Native documentation
- Open an issue on GitHub

---

**Note**: This app is designed to work out of the box with minimal configuration. Firebase anonymous auth and local processing ensure basic functionality without external API keys.