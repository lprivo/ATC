import { registerRootComponent } from 'expo';
import { kv } from '../src/storage/kv';
import { view } from './storybook.requires';

/**
 * Storybook's UI (the story list and canvas). With STORYBOOK_ENABLED=true this
 * file replaces the app's entry point (expo-router/entry), so it registers itself as the root.
 */
const StorybookUIRoot = view.getStorybookUI({
  // Remembers the last story open, in the app's own key-value store (no extra native module).
  storage: {
    getItem: async (key: string) => kv.get(key),
    setItem: async (key: string, value: string) => kv.set(key, value),
  },
});

export default StorybookUIRoot;

registerRootComponent(StorybookUIRoot);
