import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { AppIcon } from '../../components/ui/AppIcon';

export default function TermsScreen() {
  const navigation = useNavigation();
  const today = new Date();
  const effectiveDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppIcon name="chevron-left" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>서비스 이용약관</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.notice}>
          아래 내용은 “앱 내 노출용” 기본 템플릿입니다.\n실제 서비스(회사명/문의처/유료 정책/책임 범위 등)에 맞춰 반드시 수정해 주세요.
        </Text>

        <Text style={styles.meta}>시행일: {effectiveDate}</Text>

        <Text style={styles.sectionTitle}>1. 목적</Text>
        <Text style={styles.paragraph}>
          본 약관은 NutriMatch 서비스 이용과 관련하여 회사와 이용자 간 권리·의무 및 책임사항을 규정합니다.
        </Text>

        <Text style={styles.sectionTitle}>2. 용어의 정의</Text>
        <Text style={styles.paragraph}>
          “이용자”란 본 약관에 따라 서비스를 이용하는 회원을 말합니다. “계정”이란 서비스 이용을 위한 아이디 등을 의미합니다.
        </Text>

        <Text style={styles.sectionTitle}>2. 계정 및 이용</Text>
        <Text style={styles.paragraph}>
          이용자는 회원가입 시 정확한 정보를 제공해야 하며, 계정 정보 관리 책임은 이용자에게 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>3. 서비스 제공 및 변경</Text>
        <Text style={styles.paragraph}>
          서비스는 기능 개선, 운영 정책 변경 등 사유로 제공 내용을 변경할 수 있으며, 필요한 경우 앱 내 공지 등을 통해 고지합니다.
        </Text>

        <Text style={styles.sectionTitle}>3. 금지행위</Text>
        <Text style={styles.paragraph}>
          이용자는 관련 법령 및 본 약관을 위반하는 행위를 해서는 안 됩니다.
        </Text>

        <Text style={styles.sectionTitle}>4. 이용 제한 및 계약 해지</Text>
        <Text style={styles.paragraph}>
          회사는 이용자가 약관을 위반하거나 서비스 운영을 방해하는 경우, 사전 통지 후(또는 긴급한 경우 사후 통지) 서비스 이용을 제한할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>5. 면책 및 책임 제한</Text>
        <Text style={styles.paragraph}>
          회사는 천재지변 등 불가항력 사유로 인한 서비스 제공 불가에 대해 책임을 지지 않습니다.\n또한, 무료로 제공되는 서비스에 대해서는 관련 법령이 허용하는 범위 내에서 책임을 제한할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>6. 준거법 및 분쟁</Text>
        <Text style={styles.paragraph}>
          본 약관은 대한민국 법령을 준거법으로 하며, 분쟁 발생 시 관할 법원은 관련 법령에 따릅니다.
        </Text>

        <Text style={styles.sectionTitle}>7. 문의</Text>
        <Text style={styles.paragraph}>문의: support@example.com</Text>
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
    padding: 24,
  },
  notice: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  meta: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
});
