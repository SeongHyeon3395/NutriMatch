import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { RADIUS, SPACING } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { AppIcon } from '../../components/ui/AppIcon';
import { useAppAlert } from '../../components/ui/AppAlert';
import { ManualLogEditor } from '../../components/editor/ManualLogEditor';
import { useUserStore } from '../../store/userStore';
import type { ManualMealLog } from '../../types/user';
import { useTheme } from '../../theme/ThemeProvider';
import {
  deleteManualMealLogRemote,
  getSessionUserId,
  insertManualMealLogRemote,
  listManualMealLogsRemote,
  updateManualMealLogRemote,
} from '../../services/userData';

type MealType = ManualMealLog['mealType'];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  snack: '간식',
};
const MEAL_COLORS: Record<MealType, string> = {
  breakfast: '#F59E0B',
  lunch: '#10B981',
  dinner: '#6366F1',
  snack: '#EC4899',
};
const MEAL_ORDER: Record<MealType, number> = {
  breakfast: 0,
  lunch: 1,
  dinner: 2,
  snack: 3,
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}
function toYmd(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthLabel(d: Date) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
}

type MacroTotals = { calories: number; carbs_g: number; protein_g: number; fat_g: number };

function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calories: a.calories + b.calories,
    carbs_g: a.carbs_g + b.carbs_g,
    protein_g: a.protein_g + b.protein_g,
    fat_g: a.fat_g + b.fat_g,
  };
}
function toText(v: number | undefined) {
  return typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
}
function parseNumOrUndefined(s: string): number | undefined {
  const t = String(s ?? '').trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, n);
}

function MacroBar({
  label,
  value,
  goal,
  color,
  unit = 'g',
}: {
  label: string;
  value: number;
  goal?: number;
  color: string;
  unit?: string;
}) {
  const { colors } = useTheme();
  const pct = goal && goal > 0 ? Math.min(value / goal, 1) : 0;
  const over = goal != null && value > goal;

  return (
    <View style={macroBarStyles.wrap}>
      <View style={macroBarStyles.row}>
        <Text style={[macroBarStyles.label, { color: colors.textSecondary }]}>{label}</Text>
        <View style={macroBarStyles.valueRow}>
          <Text style={[macroBarStyles.value, { color: over ? colors.danger : colors.text }]}>
            {Math.round(value)}
            <Text style={[macroBarStyles.unit, { color: colors.textSecondary }]}>{unit}</Text>
          </Text>
          {goal != null ? (
            <Text style={[macroBarStyles.goal, { color: colors.textSecondary }]}>
              {' '}/ {Math.round(goal)}{unit}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[macroBarStyles.track, { backgroundColor: colors.surfaceElevated }]}>
        <View
          style={[
            macroBarStyles.fill,
            {
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: over ? colors.danger : color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const macroBarStyles = StyleSheet.create({
  wrap: { gap: 5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline' },
  value: { fontSize: 15, fontWeight: '700' },
  unit: { fontSize: 11, fontWeight: '500' },
  goal: { fontSize: 12, fontWeight: '500' },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 4,
  },
});

function GoalEditor(props: {
  initial: { calories?: number; carbs?: number; protein?: number; fat?: number };
  onSave: (next: { calories?: number; carbs?: number; protein?: number; fat?: number }) => void | Promise<void>;
}) {
  const { colors } = useTheme();
  const [calories, setCalories] = useState(toText(props.initial.calories));
  const [carbs, setCarbs] = useState(toText(props.initial.carbs));
  const [protein, setProtein] = useState(toText(props.initial.protein));
  const [fat, setFat] = useState(toText(props.initial.fat));

  return (
    <View style={goalEditorStyles.root}>
      <View style={goalEditorStyles.grid}>
        {[
          { label: '칼로리 (kcal)', value: calories, set: setCalories, placeholder: '2000' },
          { label: '탄수화물 (g)', value: carbs, set: setCarbs, placeholder: '250' },
          { label: '단백질 (g)', value: protein, set: setProtein, placeholder: '120' },
          { label: '지방 (g)', value: fat, set: setFat, placeholder: '60' },
        ].map((f) => (
          <View key={f.label} style={goalEditorStyles.field}>
            <Text style={[goalEditorStyles.label, { color: colors.textSecondary }]}>{f.label}</Text>
            <TextInput
              value={f.value}
              onChangeText={f.set}
              keyboardType="numeric"
              placeholder={f.placeholder}
              placeholderTextColor={colors.textSecondary}
              style={[
                goalEditorStyles.input,
                { borderColor: colors.border, backgroundColor: colors.surfaceElevated, color: colors.text },
              ]}
            />
          </View>
        ))}
      </View>
      <Button
        title="저장"
        onPress={() =>
          props.onSave({
            calories: parseNumOrUndefined(calories),
            carbs: parseNumOrUndefined(carbs),
            protein: parseNumOrUndefined(protein),
            fat: parseNumOrUndefined(fat),
          })
        }
      />
    </View>
  );
}

const goalEditorStyles = StyleSheet.create({
  root: { gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  field: { width: '48%', gap: 5 },
  label: { fontSize: 12, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
});

export default function CalendarScreen() {
  const navigation = useNavigation<any>();
  const { alert, dismiss } = useAppAlert();
  const { colors, isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const profile = useUserStore((state) => state.profile);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const manualMealLogs = useUserStore((state) => state.manualMealLogs);
  const loadManualMealLogs = useUserStore((state) => state.loadManualMealLogs);
  const setManualMealLogs = useUserStore((state) => state.setManualMealLogs);

  const today = useMemo(() => new Date(), []);
  const todayYmd = useMemo(() => toYmd(today), [today]);
  const [activeMonth, setActiveMonth] = useState(() => startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(() => toYmd(today));

  const goalCal = typeof profile?.targetCalories === 'number' ? profile.targetCalories : undefined;
  const goalCarb = typeof profile?.targetCarbs === 'number' ? profile.targetCarbs : undefined;
  const goalProt = typeof profile?.targetProtein === 'number' ? profile.targetProtein : undefined;
  const goalF = typeof profile?.targetFat === 'number' ? profile.targetFat : undefined;
  const [isEditing, setIsEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;

      void (async () => {
        const userId = await getSessionUserId().catch(() => null);
        if (!alive) return;

        if (!userId) {
          await loadManualMealLogs();
          return;
        }

        const remoteLogs = await listManualMealLogsRemote(1000).catch(() => null);
        if (!alive) return;

        if (Array.isArray(remoteLogs)) {
          await setManualMealLogs(remoteLogs);
          return;
        }

        retryTimer = setTimeout(() => {
          if (!alive) return;
          void (async () => {
            const retried = await listManualMealLogsRemote(1000).catch(() => null);
            if (alive && Array.isArray(retried)) await setManualMealLogs(retried);
          })();
        }, 900);
      })();

      return () => {
        alive = false;
        if (retryTimer) clearTimeout(retryTimer);
      };
    }, [loadManualMealLogs, setManualMealLogs])
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsEditing(false);
        dismiss();
      };
    }, [dismiss])
  );

  const monthKey = useMemo(
    () => `${activeMonth.getFullYear()}-${pad2(activeMonth.getMonth() + 1)}`,
    [activeMonth]
  );

  useEffect(() => {
    if (!selectedDate.startsWith(monthKey)) {
      setSelectedDate(`${activeMonth.getFullYear()}-${pad2(activeMonth.getMonth() + 1)}-01`);
    }
  }, [activeMonth, monthKey, selectedDate]);

  const logsByDate = useMemo(() => {
    const map: Record<string, ManualMealLog[]> = {};
    for (const log of manualMealLogs || []) {
      const k = String(log?.date ?? '').trim();
      if (!k) continue;
      if (!map[k]) map[k] = [];
      map[k].push(log);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => {
        const aO = MEAL_ORDER[a.mealType] ?? 99;
        const bO = MEAL_ORDER[b.mealType] ?? 99;
        if (aO !== bO) return aO - bO;
        return String(b.timestamp || '').localeCompare(String(a.timestamp || ''));
      });
    }
    return map;
  }, [manualMealLogs]);

  const selectedLogs = useMemo(() => logsByDate[selectedDate] || [], [logsByDate, selectedDate]);
  const todayLogs = useMemo(() => logsByDate[todayYmd] || [], [logsByDate, todayYmd]);

  const todayTotals = useMemo<MacroTotals>(() => {
    return (todayLogs || []).reduce(
      (acc, log) =>
        addTotals(acc, {
          calories: Number(log.calories) || 0,
          carbs_g: Number(log.carbs_g) || 0,
          protein_g: Number(log.protein_g) || 0,
          fat_g: Number(log.fat_g) || 0,
        }),
      { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 }
    );
  }, [todayLogs]);

  const selectedTotals = useMemo<MacroTotals>(() => {
    return (selectedLogs || []).reduce(
      (acc, log) =>
        addTotals(acc, {
          calories: Number(log.calories) || 0,
          carbs_g: Number(log.carbs_g) || 0,
          protein_g: Number(log.protein_g) || 0,
          fat_g: Number(log.fat_g) || 0,
        }),
      { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 }
    );
  }, [selectedLogs]);

  const dayTotalsMap = useMemo(() => {
    const out: Record<string, MacroTotals> = {};
    for (const log of manualMealLogs || []) {
      const d = String(log?.date ?? '');
      if (!d.startsWith(monthKey)) continue;
      if (!out[d]) out[d] = { calories: 0, carbs_g: 0, protein_g: 0, fat_g: 0 };
      out[d] = addTotals(out[d], {
        calories: Number(log.calories) || 0,
        carbs_g: Number(log.carbs_g) || 0,
        protein_g: Number(log.protein_g) || 0,
        fat_g: Number(log.fat_g) || 0,
      });
    }
    return out;
  }, [manualMealLogs, monthKey]);

  const calendarCells = useMemo(() => {
    const y = activeMonth.getFullYear();
    const m = activeMonth.getMonth();
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: Array<{ key: string; ymd?: string; day?: number }> = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ key: `blank_${i}` });
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(y, m, day);
      cells.push({ key: toYmd(d), ymd: toYmd(d), day });
    }
    return cells;
  }, [activeMonth]);

  const cellSize = useMemo(
    () => Math.floor((screenWidth - SPACING.lg * 2 - SPACING.md * 2) / 7),
    [screenWidth]
  );

  const goPrevMonth = useCallback(() => {
    setActiveMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);
  const goNextMonth = useCallback(() => {
    setActiveMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const openGoalEditor = useCallback(() => {
    alert({
      title: '목표 설정',
      message: '설정한 목표가 매일 기준으로 사용돼요.',
      content: (
        <GoalEditor
          initial={{ calories: goalCal, carbs: goalCarb, protein: goalProt, fat: goalF }}
          onSave={async (next) => {
            await updateProfile({
              targetCalories: next.calories,
              targetCarbs: next.carbs,
              targetProtein: next.protein,
              targetFat: next.fat,
            });
            dismiss();
          }}
        />
      ),
      actions: [{ text: '닫기', variant: 'outline' }],
    });
  }, [alert, dismiss, goalCal, goalCarb, goalF, goalProt, updateProfile]);

  const openChatWithTodaySummary = useCallback(() => {
    const lines: string[] = [];
    lines.push(`오늘(${todayYmd}) 식단 합계 분석 부탁해요.`);
    lines.push('다음 식사/메뉴 추천은 하지 말고, 목표 대비 분석과 개선점만 알려줘.');
    lines.push('');
    lines.push(`- 칼로리: ${Math.round(todayTotals.calories)} kcal`);
    lines.push(`- 탄수화물: ${Math.round(todayTotals.carbs_g)} g`);
    lines.push(`- 단백질: ${Math.round(todayTotals.protein_g)} g`);
    lines.push(`- 지방: ${Math.round(todayTotals.fat_g)} g`);
    if ((todayLogs || []).length > 0) {
      lines.push('');
      lines.push('기록:');
      for (const log of todayLogs) {
        lines.push(
          `- ${MEAL_LABELS[log.mealType]}${log.foodName ? `(${log.foodName})` : ''}: ${Math.round(log.calories)}kcal`
        );
      }
    }
    navigation.navigate('Chat', { prefillMessage: lines.join('\n'), autoSend: true });
  }, [navigation, todayLogs, todayTotals, todayYmd]);

  const openAddLog = useCallback(() => {
    const userId = profile?.id || '';
    const draft: ManualMealLog = {
      id: 'draft',
      userId,
      date: selectedDate,
      mealType: 'breakfast',
      foodName: undefined,
      calories: 0,
      carbs_g: 0,
      protein_g: 0,
      fat_g: 0,
      imageUri: undefined,
      timestamp: new Date().toISOString(),
    };
    alert({
      title: '기록 추가',
      message: selectedDate,
      content: (
        <ManualLogEditor
          initial={draft}
          submitLabel="추가"
          onClose={dismiss}
          onSubmit={async (updates) => {
            const sessionUserId = await getSessionUserId().catch(() => null);
            if (!sessionUserId) throw new Error('로그인 상태에서만 캘린더 기록을 저장할 수 있어요.');
            const newLog: ManualMealLog = {
              ...draft,
              ...updates,
              id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
              userId: sessionUserId,
              date: selectedDate,
              timestamp: new Date().toISOString(),
            };
            await insertManualMealLogRemote(newLog);
            const remoteLogs = await listManualMealLogsRemote(1000);
            await setManualMealLogs(remoteLogs);
            dismiss();
          }}
        />
      ),
      actions: [],
    });
  }, [alert, dismiss, profile?.id, selectedDate, setManualMealLogs]);

  const openEditLog = useCallback(
    (log: ManualMealLog) => {
      alert({
        title: '기록 편집',
        message: `${log.date} · ${MEAL_LABELS[log.mealType]}`,
        content: (
          <ManualLogEditor
            initial={log}
            submitLabel="저장"
            onClose={dismiss}
            onSubmit={async (updates) => {
              const sessionUserId = await getSessionUserId().catch(() => null);
              if (!sessionUserId) throw new Error('로그인 상태에서만 캘린더 기록을 수정할 수 있어요.');
              await updateManualMealLogRemote(log.id, updates);
              const remoteLogs = await listManualMealLogsRemote(1000);
              await setManualMealLogs(remoteLogs);
              dismiss();
            }}
          />
        ),
        actions: [],
      });
    },
    [alert, dismiss, setManualMealLogs]
  );

  const confirmDeleteLog = useCallback(
    (log: ManualMealLog) => {
      alert({
        title: '기록 삭제',
        message: `${log.date} · ${MEAL_LABELS[log.mealType]} 기록을 삭제할까요?`,
        actions: [
          { text: '취소', variant: 'outline' },
          {
            text: '삭제',
            variant: 'danger',
            onPress: () => {
              void (async () => {
                const sessionUserId = await getSessionUserId().catch(() => null);
                if (!sessionUserId) return;
                await deleteManualMealLogRemote(log.id);
                const remoteLogs = await listManualMealLogsRemote(1000);
                await setManualMealLogs(remoteLogs);
              })();
            },
          },
        ],
      });
    },
    [alert, setManualMealLogs]
  );

  const hasAnyGoal = [goalCal, goalCarb, goalProt, goalF].some((v) => typeof v === 'number');
  const isSelectedToday = selectedDate === todayYmd;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.backgroundGray }]}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>캘린더</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingHorizontal: SPACING.lg }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Calendar Card ── */}
          <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            {/* Month navigation */}
            <View style={styles.monthRow}>
              <TouchableOpacity
                onPress={goPrevMonth}
                style={[styles.monthNavBtn, { backgroundColor: colors.surfaceElevated }]}
                accessibilityRole="button"
                accessibilityLabel="이전 달"
              >
                <AppIcon name="chevron-left" size={20} color={colors.text} />
              </TouchableOpacity>

              <Text style={[styles.monthLabel, { color: colors.text }]}>
                {monthLabel(activeMonth)}
              </Text>

              <TouchableOpacity
                onPress={goNextMonth}
                style={[styles.monthNavBtn, { backgroundColor: colors.surfaceElevated }]}
                accessibilityRole="button"
                accessibilityLabel="다음 달"
              >
                <AppIcon name="chevron-right" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w, i) => (
                <Text
                  key={w}
                  style={[
                    styles.weekLabel,
                    { color: i === 0 ? colors.danger : i === 6 ? '#6366F1' : colors.textSecondary },
                    { width: cellSize },
                  ]}
                >
                  {w}
                </Text>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.gridWrap}>
              {calendarCells.map((cell) => {
                if (!cell.ymd || !cell.day) {
                  return <View key={cell.key} style={{ width: cellSize, height: cellSize + 8 }} />;
                }

                const ymd = cell.ymd;
                const isSelected = ymd === selectedDate;
                const isToday = ymd === todayYmd;
                const totals = dayTotalsMap[ymd];
                const hasLogs = (totals?.calories ?? 0) > 0;
                const weekdayIndex = new Date(
                  activeMonth.getFullYear(),
                  activeMonth.getMonth(),
                  cell.day
                ).getDay();
                const isSunday = weekdayIndex === 0;
                const isSaturday = weekdayIndex === 6;

                return (
                  <TouchableOpacity
                    key={cell.key}
                    onPress={() => setSelectedDate(ymd)}
                    style={[styles.cell, { width: cellSize, height: cellSize + 8 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${ymd} 선택`}
                    activeOpacity={0.7}
                  >
                    {/* Circle highlight */}
                    <View
                      style={[
                        styles.cellCircle,
                        { width: cellSize - 8, height: cellSize - 8, borderRadius: (cellSize - 8) / 2 },
                        isSelected && { backgroundColor: colors.primary },
                        isToday && !isSelected && {
                          borderWidth: 2,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellDay,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : isSunday
                              ? colors.danger
                              : isSaturday
                              ? '#6366F1'
                              : colors.text,
                          },
                          isToday && !isSelected && { color: colors.primary, fontWeight: '800' },
                        ]}
                      >
                        {cell.day}
                      </Text>
                    </View>

                    {/* Log dot */}
                    {hasLogs ? (
                      <View
                        style={[
                          styles.logDot,
                          {
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : colors.primary,
                          },
                        ]}
                      />
                    ) : (
                      <View style={styles.logDotPlaceholder} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Macro Summary Card ── */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, shadowColor: isDark ? 'transparent' : '#000' },
            ]}
          >
            {/* Card header */}
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {isSelectedToday ? '오늘' : selectedDate} 영양 합계
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                  {selectedLogs.length > 0 ? `${selectedLogs.length}개 기록` : '기록 없음'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.chatBtn, { backgroundColor: colors.primary + '18' }]}
                onPress={openChatWithTodaySummary}
              >
                <AppIcon name="chat-bubble-outline" size={16} color={colors.primary} />
                <Text style={[styles.chatBtnText, { color: colors.primary }]}>AI 분석</Text>
              </TouchableOpacity>
            </View>

            {/* Calorie hero */}
            <View style={[styles.calorieHero, { backgroundColor: colors.surfaceElevated }]}>
              <View style={styles.calorieMain}>
                <Text style={[styles.calorieValue, { color: colors.text }]}>
                  {Math.round(selectedTotals.calories)}
                </Text>
                <Text style={[styles.calorieUnit, { color: colors.textSecondary }]}>kcal</Text>
              </View>
              {goalCal != null ? (
                <View style={styles.calorieGoalRow}>
                  <Text style={[styles.calorieGoalLabel, { color: colors.textSecondary }]}>
                    목표 {Math.round(goalCal)} kcal
                  </Text>
                  <Text
                    style={[
                      styles.calorieGoalPct,
                      {
                        color:
                          selectedTotals.calories > goalCal ? colors.danger : colors.primary,
                      },
                    ]}
                  >
                    {Math.round((selectedTotals.calories / goalCal) * 100)}%
                  </Text>
                </View>
              ) : null}
              {goalCal != null ? (
                <View style={[styles.calorieTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.calorieFill,
                      {
                        width: `${Math.min(
                          Math.round((selectedTotals.calories / goalCal) * 100),
                          100
                        )}%`,
                        backgroundColor:
                          selectedTotals.calories > goalCal ? colors.danger : colors.primary,
                      },
                    ]}
                  />
                </View>
              ) : null}
            </View>

            {/* Macro bars */}
            <View style={styles.macroBarsWrap}>
              <MacroBar
                label="탄수화물"
                value={selectedTotals.carbs_g}
                goal={goalCarb}
                color="#F59E0B"
              />
              <MacroBar
                label="단백질"
                value={selectedTotals.protein_g}
                goal={goalProt}
                color="#10B981"
              />
              <MacroBar
                label="지방"
                value={selectedTotals.fat_g}
                goal={goalF}
                color="#6366F1"
              />
            </View>

            {/* Goal section */}
            {hasAnyGoal ? (
              <TouchableOpacity
                onPress={openGoalEditor}
                style={[styles.goalChip, { backgroundColor: colors.surfaceElevated }]}
              >
                <AppIcon name="flag" size={14} color={colors.textSecondary} />
                <Text style={[styles.goalChipText, { color: colors.textSecondary }]}>목표 수정</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={openGoalEditor}
                style={[
                  styles.goalSetBtn,
                  { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' },
                ]}
              >
                <AppIcon name="flag" size={14} color={colors.primary} />
                <Text style={[styles.goalSetBtnText, { color: colors.primary }]}>
                  목표(제한량) 설정하기
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Log List Card ── */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, shadowColor: isDark ? 'transparent' : '#000' },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>식사 기록</Text>
              <View style={styles.logHeaderBtns}>
                {selectedLogs.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setIsEditing((v) => !v)}
                    style={[
                      styles.editToggleBtn,
                      {
                        backgroundColor: isEditing
                          ? colors.primary + '18'
                          : colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.editToggleBtnText,
                        { color: isEditing ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {isEditing ? '완료' : '편집'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  onPress={openAddLog}
                  style={[styles.addBtn, { backgroundColor: colors.primary }]}
                >
                  <AppIcon name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>추가</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedLogs.length === 0 ? (
              <View
                style={[
                  styles.emptyState,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                ]}
              >
                <AppIcon name="restaurant" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>기록이 없어요</Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  "추가"를 눌러 오늘 먹은 것을 기록해보세요
                </Text>
              </View>
            ) : (
              <View style={styles.logList}>
                {selectedLogs.map((log, idx) => {
                  const mealColor = MEAL_COLORS[log.mealType] ?? colors.primary;
                  return (
                    <View
                      key={log.id}
                      style={[
                        styles.logItem,
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderColor: colors.border,
                        },
                        idx < selectedLogs.length - 1 && styles.logItemMargin,
                      ]}
                    >
                      {/* Left accent bar */}
                      <View style={[styles.logAccent, { backgroundColor: mealColor }]} />

                      <View style={styles.logItemInner}>
                        {log.imageUri ? (
                          <Image source={{ uri: log.imageUri }} style={styles.logThumb} />
                        ) : (
                          <View
                            style={[
                              styles.logThumbFallback,
                              { backgroundColor: mealColor + '20' },
                            ]}
                          >
                            <AppIcon name="restaurant" size={18} color={mealColor} />
                          </View>
                        )}

                        <View style={styles.logTextBox}>
                          <View style={styles.logTitleRow}>
                            <View
                              style={[styles.mealBadge, { backgroundColor: mealColor + '20' }]}
                            >
                              <Text style={[styles.mealBadgeText, { color: mealColor }]}>
                                {MEAL_LABELS[log.mealType]}
                              </Text>
                            </View>
                            {log.foodName ? (
                              <Text
                                style={[styles.logFoodName, { color: colors.text }]}
                                numberOfLines={1}
                              >
                                {log.foodName}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={[styles.logMacros, { color: colors.textSecondary }]} numberOfLines={1}>
                            {Math.round(log.calories)}kcal · 탄{Math.round(log.carbs_g)}g · 단{Math.round(log.protein_g)}g · 지{Math.round(log.fat_g)}g
                          </Text>
                        </View>

                        {isEditing ? (
                          <View style={styles.logActions}>
                            <TouchableOpacity
                              onPress={() => openEditLog(log)}
                              style={[
                                styles.logActionBtn,
                                { backgroundColor: colors.primary + '18' },
                              ]}
                            >
                              <AppIcon name="edit" size={14} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => confirmDeleteLog(log)}
                              style={[
                                styles.logActionBtn,
                                { backgroundColor: colors.danger + '18' },
                              ]}
                            >
                              <AppIcon name="delete" size={14} color={colors.danger} />
                            </TouchableOpacity>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },

  content: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },

  card: {
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: SPACING.sm,
  },

  // ─ Calendar
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { fontSize: 18, fontWeight: '800' },

  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { textAlign: 'center', fontSize: 12, fontWeight: '700' },

  gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  cellCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDay: { fontSize: 14, fontWeight: '600' },
  logDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  logDotPlaceholder: { width: 5, height: 5, marginTop: 2 },

  // ─ Macro Summary
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 1 },

  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  chatBtnText: { fontSize: 13, fontWeight: '700' },

  calorieHero: {
    borderRadius: RADIUS.md,
    padding: 14,
    gap: 6,
  },
  calorieMain: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  calorieValue: { fontSize: 36, fontWeight: '800' },
  calorieUnit: { fontSize: 16, fontWeight: '600' },
  calorieGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieGoalLabel: { fontSize: 12, fontWeight: '600' },
  calorieGoalPct: { fontSize: 13, fontWeight: '800' },
  calorieTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  calorieFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 6,
  },

  macroBarsWrap: { gap: 10, paddingVertical: 4 },

  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  goalChipText: { fontSize: 12, fontWeight: '700' },
  goalSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  goalSetBtnText: { fontSize: 13, fontWeight: '700' },

  // ─ Log List
  logHeaderBtns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  editToggleBtnText: { fontSize: 13, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  emptyState: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyDesc: { fontSize: 13, fontWeight: '500', textAlign: 'center' },

  logList: { gap: 0 },
  logItem: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  logItemMargin: { marginBottom: 8 },
  logAccent: { width: 4 },
  logItemInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  logThumb: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
  },
  logThumbFallback: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logTextBox: { flex: 1, gap: 3 },
  logTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mealBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  mealBadgeText: { fontSize: 11, fontWeight: '700' },
  logFoodName: { fontSize: 13, fontWeight: '600', flex: 1 },
  logMacros: { fontSize: 12, fontWeight: '500' },

  logActions: { flexDirection: 'row', gap: 6 },
  logActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
