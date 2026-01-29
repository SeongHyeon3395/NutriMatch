// Jest setup for React Native project

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const passthrough = (v) => v;

  return {
    __esModule: true,
    default: {
      View,
      // Fallback for other Animated.* usages
      createAnimatedComponent: (Comp) => Comp,
    },
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: (updater) => updater(),
    withTiming: passthrough,
    withSpring: passthrough,
    withSequence: (...values) => values[values.length - 1],
  };
});

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-image-crop-picker', () => ({
  openCamera: jest.fn(() => Promise.reject(new Error('ImagePicker mocked'))),
  openPicker: jest.fn(() => Promise.reject(new Error('ImagePicker mocked'))),
  openCropper: jest.fn(() => Promise.reject(new Error('cancel'))),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(() => Promise.resolve({ didCancel: true })),
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
}));

jest.mock('react-native-image-resizer', () => ({
  createResizedImage: jest.fn(async (uri) => ({ uri, path: uri })),
}));

jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Camera: React.forwardRef((props, ref) => React.createElement(View, { ...props, ref })),
    useCameraDevice: () => ({ id: 'mock-device' }),
    useCameraPermission: () => ({ hasPermission: true, requestPermission: async () => true }),
  };
});
