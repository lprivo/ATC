import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import { view } from './storybook.requires';

/**
 * Storybook's UI (the story list and canvas). With STORYBOOK_ENABLED=true this
 * file replaces the app's entry point (expo-router/entry), so it registers itself as the root.
 */
const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
  },
});

export default StorybookUIRoot;

registerRootComponent(StorybookUIRoot);
