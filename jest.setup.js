// Jest setup for React Native project

jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native-image-crop-picker', () => ({
  openCamera: jest.fn(() => Promise.reject(new Error('ImagePicker mocked'))),
  openPicker: jest.fn(() => Promise.reject(new Error('ImagePicker mocked'))),
}));
