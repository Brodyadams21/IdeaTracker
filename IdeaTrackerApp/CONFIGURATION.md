# IdeaTracker Configuration Guide

This guide explains how to configure the IdeaTracker app with your API keys and settings.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
USE_AI=true

# Google Maps Configuration
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
GOOGLE_GEOCODING_API_KEY=your_google_geocoding_api_key_here

# MapBox Configuration (Optional)
MAPBOX_API_KEY=your_mapbox_api_key_here

# App Configuration
DEBUG_MODE=true
AI_TIMEOUT=10000
MAX_RETRIES=2
DEFAULT_SEARCH_RADIUS=25
MAX_SEARCH_RESULTS=10
```

## API Key Setup

### 1. OpenAI API Key
- Go to [OpenAI Platform](https://platform.openai.com/api-keys)
- Create a new API key
- Set `OPENAI_API_KEY` in your environment
- Set `USE_AI=true` to enable AI processing

### 2. Google Maps API Keys
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Enable the following APIs:
  - Maps SDK for Android
  - Maps SDK for iOS
  - Places API
  - Geocoding API
- Create API keys for each service
- Set the corresponding environment variables

### 3. MapBox API Key (Optional)
- Go to [MapBox](https://www.mapbox.com/)
- Create an account and get your API key
- Set `MAPBOX_API_KEY` in your environment

## Firebase Configuration

### Android
1. Download `google-services.json` from Firebase Console
2. Place it in `android/app/google-services.json`

### iOS
1. Download `GoogleService-Info.plist` from Firebase Console
2. Place it in `ios/IdeaTrackerApp/GoogleService-Info.plist`

### Firebase Services to Enable
- **Authentication** → Sign-in method → Anonymous (enable)
- **Firestore Database** → Create database → Start in test mode

## Configuration Validation

The app will automatically validate your configuration on startup and show warnings for missing API keys. Check the console logs for configuration status.

## Development vs Production

### Development
- Set `DEBUG_MODE=true` for detailed logging
- Use test API keys with limited quotas
- Enable all features for testing

### Production
- Set `DEBUG_MODE=false` to reduce logging
- Use production API keys with proper quotas
- Disable features you don't need

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Check if the API key is correctly set in environment variables
   - Verify the API key has the correct permissions
   - Check if you've enabled the required APIs in Google Cloud Console

2. **Firebase Connection Issues**
   - Ensure `google-services.json` and `GoogleService-Info.plist` are in the correct locations
   - Check if Firebase services are enabled in the console
   - Verify your bundle ID/package name matches Firebase configuration

3. **AI Processing Not Working**
   - Check if `USE_AI=true` is set
   - Verify your OpenAI API key is valid
   - Check your OpenAI account has sufficient credits

### Debug Mode

When `DEBUG_MODE=true`, the app will:
- Show detailed console logs
- Display configuration warnings
- Provide more verbose error messages

## Security Notes

- Never commit your `.env` file to version control
- Use different API keys for development and production
- Regularly rotate your API keys
- Monitor your API usage to avoid unexpected charges

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify your configuration matches this guide
3. Test with a minimal configuration first
4. Check the troubleshooting section above
