import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../theme/ThemeProvider';

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
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.backgroundGray }]}>
      <Card style={styles.card} variant="elevated">
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
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
