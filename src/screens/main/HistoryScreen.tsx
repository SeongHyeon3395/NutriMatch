import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';
import { Card } from '../../components/ui/Card';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { getFoodScore100, score100ToBadgeVariant } from '../../services/foodScore';
import { deleteFoodLogsRemote, getSessionUserId, listFoodLogsRemote } from '../../services/userData';

// Mock Data
const MOCK_HISTORY = [
  {
    id: '1',
    type: 'meal',
    title: '닭가슴살 샐러드',
    date: '오늘, 오후 12:30',
    calories: 450,
    score100: 88,
  },
  {
    id: '2',
    type: 'product',
    title: '귀리 우유',
    date: '어제, 오전 09:15',
    calories: 120,
    score100: 74,
  },
  {
    id: '3',
    type: 'meal',
    title: '까르보나라 파스타',
    date: '어제, 오후 07:45',
    calories: 850,
    score100: 38,
  },
  {
    id: '4',
    type: 'product',
    title: '프로틴 바',
    date: '10월 24일, 오후 03:30',
    calories: 210,
    score100: 82,
  },
  {
    id: '5',
    type: 'meal',
    title: '아보카도 토스트',
    date: '10월 24일, 오전 08:00',
    calories: 320,
    score100: 85,
  },
];

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const { alert } = useAppAlert();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('전체'); // All, Meals, Products
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const profile = useUserStore(state => state.profile);
  const foodLogs = useUserStore(state => state.foodLogs);
  const loadFoodLogs = useUserStore(state => state.loadFoodLogs);
  const setFoodLogs = useUserStore(state => state.setFoodLogs);

  const isMaster =
    (profile as any)?.plan_id === 'master' ||
    profile?.id === 'local-master' ||
    profile?.username === 'master';

  useEffect(() => {
    let mounted = true;
    (async () => {
      const userId = await getSessionUserId().catch(() => null);
      if (!mounted) return;

      if (userId) {
        try {
          const remote = await listFoodLogsRemote(100);
          if (!mounted) return;
          if (typeof setFoodLogs === 'function') setFoodLogs(remote);
          return;
        } catch {
          // 서버 실패 시 로컬 폴백
        }
      }

      await loadFoodLogs();
    })();

    return () => {
      mounted = false;
    };
  }, [loadFoodLogs, setFoodLogs]);

  useEffect(() => {
    if (!isEditMode) setSelectedIds({});
  }, [isEditMode]);

  const historyData = useMemo(() => {
    const realItems = (foodLogs || [])
      .slice()
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .map(log => {
        const calories = log.analysis?.macros?.calories;
        const score100 = getFoodScore100(log.analysis);
        const displayDate = (() => {
          try {
            return new Date(log.timestamp).toLocaleString('ko-KR');
          } catch {
            return log.timestamp;
          }
        })();

        return {
          id: log.id,
          type: 'meal',
          title: log.analysis?.dishName ?? '기록',
          date: displayDate,
          calories: typeof calories === 'number' ? calories : 0,
          score100,
          __kind: 'real' as const,
          imageUri: log.imageUri,
          analysis: log.analysis,
        };
      });

    const base = realItems.length > 0 ? realItems : (isMaster ? (MOCK_HISTORY as any[]) : []);

    const filtered = base.filter(item => {
      const matchesFilter =
        activeFilter === '전체' ||
        (activeFilter === '식사' && item.type === 'meal') ||
        (activeFilter === '제품' && item.type === 'product');

      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        q.length === 0 ||
        String(item.title ?? '').toLowerCase().includes(q);

      return matchesFilter && matchesQuery;
    });

    return filtered;
  }, [activeFilter, foodLogs, isMaster, searchQuery]);

  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

  const allSelectableIds = useMemo(() => {
    return (historyData as any[])
      .filter((x) => x?.__kind === 'real')
      .map((x) => String(x.id));
  }, [historyData]);

  const isAllSelected = useMemo(() => {
    if (allSelectableIds.length === 0) return false;
    return allSelectableIds.every((id) => Boolean(selectedIds[id]));
  }, [allSelectableIds, selectedIds]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next: Record<string, boolean> = { ...prev };
      const nextValue = !isAllSelected;
      for (const id of allSelectableIds) next[id] = nextValue;
      return next;
    });
  };

  const handleDeleteSelected = () => {
    const ids = Object.entries(selectedIds)
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k);

    if (ids.length === 0) {
      alert({ title: '삭제할 기록이 없어요', message: '먼저 삭제할 기록을 선택해주세요.' });
      return;
    }

    alert({
      title: '기록 삭제',
      message: `선택한 ${ids.length}개 기록을 삭제할까요?\n삭제하면 복구할 수 없어요.`,
      actions: [
        { text: '취소', variant: 'outline' },
        {
          text: '삭제',
          variant: 'danger',
          onPress: async () => {
            try {
              const userId = await getSessionUserId().catch(() => null);

              if (userId) {
                await deleteFoodLogsRemote(ids);
                const remote = await listFoodLogsRemote(100).catch(() => null);
                if (remote && typeof setFoodLogs === 'function') await setFoodLogs(remote);
              } else {
                const next = (foodLogs || []).filter((l) => !ids.includes(String(l.id)));
                if (typeof setFoodLogs === 'function') await setFoodLogs(next);
              }

              setIsEditMode(false);
              alert({ title: '삭제 완료', message: '선택한 기록을 삭제했어요.' });
            } catch (e: any) {
              const msg = (() => {
                const m = String(e?.message || '').trim();
                const code = String(e?.code || '').trim();
                const details = String(e?.details || '').trim();
                const hint = String(e?.hint || '').trim();
                const parts = [
                  m || '기록 삭제 중 문제가 발생했습니다.',
                  code ? `code: ${code}` : '',
                  details ? `details: ${details}` : '',
                  hint ? `hint: ${hint}` : '',
                ].filter(Boolean);
                return parts.join('\n');
              })();
              alert({ title: '삭제 실패', message: msg });
            }
          },
        },
      ],
    });
  };

  const handlePressItem = (item: any) => {
    if (isEditMode && item?.__kind === 'real') {
      toggleSelect(String(item.id));
      return;
    }

    if (item?.__kind === 'real' && item?.imageUri && item?.analysis) {
      navigation.navigate('Result', { imageUri: item.imageUri, analysis: item.analysis });
      return;
    }

    navigation.navigate('MealDetail', {
      title: item.title,
      date: item.date,
      calories: item.calories,
      grade: item.grade ?? '-',
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.itemCard} onPress={() => handlePressItem(item)}>
      <View style={styles.itemLeft}>
        {isEditMode && item?.__kind === 'real' ? (
          <TouchableOpacity
            onPress={() => toggleSelect(String(item.id))}
            style={styles.checkbox}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: Boolean(selectedIds[String(item.id)]) }}
          >
            <AppIcon
              name={selectedIds[String(item.id)] ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={selectedIds[String(item.id)] ? COLORS.primary : COLORS.textSecondary}
            />
          </TouchableOpacity>
        ) : null}

        {typeof item?.imageUri === 'string' && item.imageUri.trim() ? (
          <Image source={{ uri: item.imageUri }} style={styles.thumb} />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <AppIcon name={item.type === 'meal' ? 'restaurant' : 'qr-code-scanner'} size={18} color={COLORS.textSecondary} />
          </View>
        )}
      </View>
      
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">{item.title}</Text>
        <View style={styles.itemMeta}>
          <AppIcon name="calendar-today" size={12} color={COLORS.textSecondary} />
          <Text style={styles.itemDate} numberOfLines={1} ellipsizeMode="tail">{item.date}</Text>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.itemCalories} numberOfLines={1} ellipsizeMode="tail">{item.calories} kcal</Text>
        </View>
      </View>

      <View style={styles.itemRight}>
        <Badge 
          variant={score100ToBadgeVariant(item.score100)}
          text={typeof item.score100 === 'number' ? `${item.score100}점` : '-'}
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ alignSelf: 'center', maxWidth: 72 }}
          textStyle={{ fontSize: 11 }}
        />
        <View style={{ marginLeft: 8 }}>
          <AppIcon name="chevron-right" size={22} color={COLORS.textSecondary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const handleEditPress = () => {
    if (allSelectableIds.length === 0) {
      alert({
        title: '편집할 내용이 없어요',
        message: '먼저 음식을 스캔해서 기록을 남겨주세요.\n기록이 있어야 편집할 수 있어요.',
      });
      return;
    }
    setIsEditMode(true);
  };

  const renderEmpty = () => (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
      <Text style={styles.emptyDesc}>음식을 스캔해 기록을 남겨보세요.</Text>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>기록</Text>
          {!isEditMode ? (
            <TouchableOpacity onPress={handleEditPress} style={styles.headerAction}>
              <Text style={styles.headerActionText}>편집</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerEditActions}>
              <TouchableOpacity onPress={toggleSelectAll} style={styles.headerAction}>
                <Text style={styles.headerActionText}>{isAllSelected ? '선택 해제' : '모두 선택'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerAction}>
                <Text style={styles.headerDeleteText}>삭제({selectedCount})</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsEditMode(false)} style={styles.headerAction}>
                <Text style={styles.headerDoneText}>완료</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchIcon}>
            <AppIcon name="search" size={20} color={COLORS.textSecondary} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="기록 검색..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          {['전체', '식사', '제품'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                activeFilter === filter && styles.activeFilterChip,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === filter && styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={historyData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        updateCellsBatchingPeriod={50}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.backgroundGray,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerEditActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerActionText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  headerDeleteText: {
    color: COLORS.danger,
    fontWeight: '800',
  },
  headerDoneText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeFilterChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeFilterText: {
    color: 'white',
  },
  listContent: {
    padding: 16,
  },
  emptyCard: {
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  checkbox: {
    marginRight: 8,
    padding: 2,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.background,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  dot: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginHorizontal: 6,
  },
  itemCalories: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
