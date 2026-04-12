module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['jest.setup.js', '**/__tests__/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}'],
      env: {
        jest: true,
        node: true,
      },
    },
    {
      files: ['test-gemini-api.js'],
      env: {
        node: true,
      },
    },
  ],
};
