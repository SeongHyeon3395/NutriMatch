import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS, SPACING, RADIUS } from '../../constants/colors';
import { Card } from '../../components/ui/Card';
import { AppIcon } from '../../components/ui/AppIcon';
import { Button } from '../../components/ui/Button';
import { useAppAlert } from '../../components/ui/AppAlert';
import { useUserStore } from '../../store/userStore';
import { ALL_ALLERGENS } from '../../constants';

export default function EditAllergensScreen() {
  const navigation = useNavigation();
  const { alert } = useAppAlert();

  const profile = useUserStore(state => state.profile);
  const updateProfile = useUserStore(state => state.updateProfile);

  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(
    Array.isArray(profile?.allergens) ? profile!.allergens : []
  );
  const [allergenSearch, setAllergenSearch] = useState('');
  const [customAllergen, setCustomAllergen] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredAllergens = useMemo(() => {
    const q = allergenSearch.trim();
    if (!q) return [];
    return ALL_ALLERGENS.filter(a => a.includes(q));
  }, [allergenSearch]);

  const toggleAllergen = (allergen: string) => {
    setSelectedAllergens(prev => {
      if (prev.includes(allergen)) return prev.filter(a => a !== allergen);
      return [...prev, allergen];
    });
  };

  const addCustomAllergen = () => {
    const next = customAllergen.trim();
    if (!next) return;
    setSelectedAllergens(prev => (prev.includes(next) ? prev : [...prev, next]));
    setCustomAllergen('');
  };

  const handleSave = async () => {
    if (!profile) {
      alert({ title: '프로필 없음', message: '로그인/온보딩 후 변경할 수 있어요.' });
      return;
    }

    try {
      setSaving(true);
      await updateProfile({ allergens: selectedAllergens });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알레르기 수정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>검색해서 추가</Text>

          <View style={styles.searchContainer}>
            <View style={styles.searchIcon}>
              <AppIcon name="search" size={20} color={COLORS.textGray} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="알레르기 성분 검색... (예: 땅콩, 우유)"
              placeholderTextColor={COLORS.textGray}
              value={allergenSearch}
              onChangeText={setAllergenSearch}
            />
          </View>

          {!!filteredAllergens.length && (
            <View style={styles.suggestions}>
              {filteredAllergens.slice(0, 20).map(a => (
                <TouchableOpacity key={a} style={styles.suggestionItem} onPress={() => toggleAllergen(a)}>
                  <Text style={styles.suggestionText}>{a}</Text>
                  <AppIcon
                    name={selectedAllergens.includes(a) ? 'check-circle' : 'plus-circle'}
                    size={18}
                    color={selectedAllergens.includes(a) ? COLORS.primary : COLORS.textGray}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>직접 추가</Text>
          <View style={styles.customInputRow}>
            <TextInput
              style={styles.customInput}
              placeholder="예: 고수, 민트 등"
              placeholderTextColor={COLORS.textGray}
              value={customAllergen}
              onChangeText={setCustomAllergen}
            />
            <Button variant="outline" size="sm" onPress={addCustomAllergen}>
              추가
            </Button>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>선택된 알레르기 (눌러서 제거)</Text>
          <View style={styles.tags}>
            {selectedAllergens.length === 0 ? (
              <Text style={styles.emptyText}>없음</Text>
            ) : (
              selectedAllergens.map((a, idx) => (
                <TouchableOpacity key={`${a}-${idx}`} style={styles.tag} onPress={() => toggleAllergen(a)}>
                  <Text style={styles.tagText}>{a}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={{ height: 12 }} />
          <Button onPress={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </Button>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  content: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  card: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: COLORS.text,
  },
  suggestions: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  suggestionText: {
    color: COLORS.text,
    fontSize: 13,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  customInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    color: COLORS.text,
    backgroundColor: COLORS.background,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.backgroundGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});
