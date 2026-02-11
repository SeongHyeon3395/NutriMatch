import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from './Card';
import { Button } from './Button';
import { AppIcon } from './AppIcon';

export type AppAlertActionVariant = 'primary' | 'outline' | 'danger';

export interface AppAlertAction {
  text: string;
  description?: string;
  variant?: AppAlertActionVariant;
  onPress?: () => void;
}

export interface AppAlertOptions {
  title: string;
  message?: string;
  content?: React.ReactNode;
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
              <View style={styles.titleRow}>
                <Text style={styles.title}>{options.title}</Text>
                <TouchableOpacity onPress={dismiss} style={styles.closeButton} accessibilityRole="button">
                  <AppIcon name="close" size={20} color={COLORS.textGray} />
                </TouchableOpacity>
              </View>
              {!!options.message && <Text style={styles.message}>{options.message}</Text>}
              {!!options.content && <View style={styles.content}>{options.content}</View>}

              <ScrollView
                style={styles.actionsScroll}
                contentContainerStyle={[styles.actions, isTwoActions && styles.actionsRow, styles.actionsContent]}
              >
                {actions.map((action, idx) => (
                  <Button
                    key={`${action.text}-${idx}`}
                    title={action.description ? undefined : action.text}
                    children={
                      action.description ? (
                        <View style={styles.actionTextStack}>
                          <Text style={styles.actionMainText}>{action.text}</Text>
                          <Text style={styles.actionSubText}>{action.description}</Text>
                        </View>
                      ) : undefined
                    }
                    onPress={() => handleActionPress(action)}
                    variant={action.variant || 'primary'}
                    size={actions.length > 5 ? 'sm' : 'md'}
                    style={isTwoActions ? styles.actionButtonHalf : styles.actionButtonFull}
                    textStyle={styles.actionTitleText}
                  />
                ))}
              </ScrollView>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderRadius: RADIUS.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 0,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  content: {
    marginTop: SPACING.md,
  },
  actions: {
    marginTop: SPACING.md,
    gap: 8,
  },
  actionsContent: {
    paddingBottom: 0,
  },
  actionsScroll: {
    maxHeight: 520,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionTextStack: {
    alignItems: 'center',
  },
  actionMainText: {
    fontWeight: '700',
    color: COLORS.text,
  },
  actionSubText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  actionTitleText: {
    // title-only button text style override (keeps current look)
  },
  actionButtonHalf: {
    flex: 1,
  },
  actionButtonFull: {
    width: '100%',
  },
});
