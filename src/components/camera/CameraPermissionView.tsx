import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { COLORS } from '../../constants/colors';

type Props = {
  title?: string;
  message: string;
  primaryLabel: string;
  onPressPrimary: () => void | Promise<void>;
  showSettings?: boolean;
};

export function CameraPermissionView({
  title = '카메라 권한이 필요해요',
  message,
  primaryLabel,
  onPressPrimary,
  showSettings,
}: Props) {
  return (
    <View style={styles.root}>
      <Card style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <Button title={primaryLabel} onPress={onPressPrimary} />
          {!!showSettings && (
            <View style={{ height: 10 }} />
          )}
          {!!showSettings && (
            <Button
              title="설정 열기"
              variant="outline"
              onPress={() => {
                void Linking.openSettings();
              }}
            />
          )}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  message: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actions: {
    marginTop: 16,
  },
});
