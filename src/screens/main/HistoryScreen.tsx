import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { Badge } from '../../components/ui/Badge';
import { AppIcon } from '../../components/ui/AppIcon';

// Mock Data
const MOCK_HISTORY = [
  {
    id: '1',
    type: 'meal',
    title: '닭가슴살 샐러드',
    date: '오늘, 오후 12:30',
    calories: 450,
    grade: 'A',
  },
  {
    id: '2',
    type: 'product',
    title: '귀리 우유',
    date: '어제, 오전 09:15',
    calories: 120,
    grade: 'B',
  },
  {
    id: '3',
    type: 'meal',
    title: '까르보나라 파스타',
    date: '어제, 오후 07:45',
    calories: 850,
    grade: 'D',
  },
  {
    id: '4',
    type: 'product',
    title: '프로틴 바',
    date: '10월 24일, 오후 03:30',
    calories: 210,
    grade: 'A',
  },
  {
    id: '5',
    type: 'meal',
    title: '아보카도 토스트',
    date: '10월 24일, 오전 08:00',
    calories: 320,
    grade: 'A',
  },
];

export default function HistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('전체'); // All, Meals, Products

  const getGradeLabel = (grade: string) => {
    switch (grade) {
      case 'A':
        return '매우좋음';
      case 'B':
        return '좋음';
      case 'C':
        return '보통';
      case 'D':
        return '나쁨';
      case 'E':
        return '매우나쁨';
      default:
        return grade;
    }
  };

  const getGradeVariant = (grade: string) => {
    switch (grade) {
      case 'A':
      case 'B':
        return 'success' as const;
      case 'C':
        return 'warning' as const;
      case 'D':
      case 'E':
        return 'danger' as const;
      default:
        return 'default' as const;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.itemCard}>
      <View style={styles.itemIconContainer}>
        {item.type === 'meal' ? (
          <AppIcon name="restaurant" size={20} color={COLORS.primary} />
        ) : (
          <AppIcon name="qr-code-scanner" size={20} color={COLORS.secondary} />
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
          variant={getGradeVariant(item.grade)}
          text={getGradeLabel(item.grade)}
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>기록</Text>
        
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
        data={MOCK_HISTORY}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
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
  itemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
