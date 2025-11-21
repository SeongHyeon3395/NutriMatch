// Ambient type augmentations for React Native FormData file support
// Allow FormData.append to accept the common RN file descriptor { uri, type, name }

export {};

declare global {
  type ReactNativeFile = {
    uri: string;
    name?: string;
    type?: string;
  };

  interface FormData {
    append(name: string, value: string | Blob | ReactNativeFile, fileName?: string): void;
  }
}
