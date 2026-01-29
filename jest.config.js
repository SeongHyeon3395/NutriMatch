module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native-worklets-core|react-native-worklets|react-native-reanimated|react-native|@react-native|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-svg|react-native-gesture-handler|react-native-vector-icons|@react-native-community)/)',
  ],
};
