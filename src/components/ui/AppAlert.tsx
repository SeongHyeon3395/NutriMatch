import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from './Card';
import { Button } from './Button';

export type AppAlertActionVariant = 'primary' | 'outline' | 'danger';

export interface AppAlertAction {
  text: string;
  variant?: AppAlertActionVariant;
  onPress?: () => void;
}

export interface AppAlertOptions {
  title: string;
  message?: string;
  actions?: AppAlertAction[];
}

interface AppAlertContextValue {
  alert: (options: AppAlertOptions) => void;
  dismiss: () => void;
}

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AppAlertOptions>({ title: '' });

  const dismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const alert = useCallback((next: AppAlertOptions) => {
    setOptions(next);
    setVisible(true);
  }, []);

  const actions = useMemo<AppAlertAction[]>(() => {
    if (options.actions && options.actions.length > 0) return options.actions;
    return [{ text: '확인', variant: 'primary' }];
  }, [options.actions]);

  const handleActionPress = useCallback(
    (action: AppAlertAction) => {
      dismiss();
      action.onPress?.();
    },
    [dismiss]
  );

  const isTwoActions = actions.length === 2;

  return (
    <AppAlertContext.Provider value={{ alert, dismiss }}>
      {children}
      <Modal transparent visible={visible} animationType="fade" onRequestClose={dismiss}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdropPressable} onPress={dismiss}>
            <View style={styles.backdrop} />
          </Pressable>

          <View style={styles.center} pointerEvents="box-none">
            <Card style={styles.alertCard}>
              <Text style={styles.title}>{options.title}</Text>
              {!!options.message && <Text style={styles.message}>{options.message}</Text>}

              <View style={[styles.actions, isTwoActions && styles.actionsRow]}>
                {actions.map((action, idx) => (
                  <Button
                    key={`${action.text}-${idx}`}
                    title={action.text}
                    onPress={() => handleActionPress(action)}
                    variant={action.variant || 'primary'}
                    style={isTwoActions ? styles.actionButtonHalf : styles.actionButtonFull}
                  />
                ))}
              </View>
            </Card>
          </View>
        </View>
      </Modal>
    </AppAlertContext.Provider>
  );
}

export function useAppAlert() {
  const ctx = useContext(AppAlertContext);
  if (!ctx) {
    throw new Error('useAppAlert must be used within AppAlertProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.text,
    opacity: 0.4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  alertCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actions: {
    marginTop: SPACING.lg,
    gap: 12,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionButtonHalf: {
    flex: 1,
  },
  actionButtonFull: {
    width: '100%',
  },
});
