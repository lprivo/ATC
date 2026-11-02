// Metro config: Expo's default, plus Storybook. With STORYBOOK_ENABLED=true
// (`npm run storybook`) the app's entry point is swapped for Storybook's;
// without it the config is untouched and builds carry no Storybook code.
const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/withStorybook');

module.exports = withStorybook(getDefaultConfig(__dirname), { configPath: './.rnstorybook' });
