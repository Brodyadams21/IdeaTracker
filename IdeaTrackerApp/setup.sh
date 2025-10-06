#!/bin/bash

echo "🚀 Setting up IdeaTracker App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if React Native CLI is installed
if ! command -v npx react-native &> /dev/null; then
    echo "❌ React Native CLI not found. Installing..."
    npm install -g @react-native-community/cli
fi

# For iOS, install pods
if [ -d "ios" ]; then
    echo "🍎 Setting up iOS..."
    cd ios
    if command -v pod &> /dev/null; then
        pod install
        if [ $? -ne 0 ]; then
            echo "❌ Failed to install iOS pods"
            exit 1
        fi
        echo "✅ iOS pods installed"
    else
        echo "⚠️  CocoaPods not found. Please install CocoaPods for iOS development."
    fi
    cd ..
fi

# Create necessary directories
mkdir -p android/app/src/main/assets

echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your API keys in src/config/api.ts"
echo "2. Set up Firebase (see README.md for details)"
echo "3. Run the app:"
echo "   - Android: npm run android"
echo "   - iOS: npm run ios"
echo ""
echo "📖 For detailed setup instructions, see README.md"