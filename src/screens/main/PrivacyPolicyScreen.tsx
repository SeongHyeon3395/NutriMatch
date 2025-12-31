import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { AppIcon } from '../../components/ui/AppIcon';

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>개인정보 처리방침</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.notice}>
          아래 내용은 “앱 내 노출용” 기본 템플릿입니다.\n실제 서비스(회사명/문의처/처리 위탁/국외 이전/보유기간 등)에 맞춰 반드시 수정해 주세요.
        </Text>

        <Text style={styles.meta}>시행일: {effectiveDate}</Text>

        <Text style={styles.sectionTitle}>1. 처리 목적</Text>
        <Text style={styles.paragraph}>
          NutriMatch(이하 “서비스”)는 회원 식별, 서비스 제공, 고객지원, 부정 이용 방지(무료 혜택 중복 수령 방지 등)를 위해
          최소한의 개인정보를 처리합니다.
        </Text>

        <Text style={styles.sectionTitle}>2. 수집 항목</Text>
        <Text style={styles.paragraph}>서비스는 아래 정보를 수집·이용할 수 있습니다.</Text>
        <Text style={styles.bullet}>• 계정 정보: 아이디, 닉네임</Text>
        <Text style={styles.bullet}>• 기기 정보(안드로이드): Android ID(기기 식별자), OS/앱 버전 등(오류 분석/부정 이용 방지 목적)</Text>
        <Text style={styles.bullet}>• 이용 기록: 접속/이용 로그, 오류 로그(서비스 품질 개선 목적)</Text>

        <Text style={styles.sectionTitle}>3. 수집 방법</Text>
        <Text style={styles.paragraph}>이용자가 회원가입/로그인 등 기능을 이용하는 과정에서 앱이 직접 입력받거나 자동 생성되는 정보로 수집합니다.</Text>

        <Text style={styles.sectionTitle}>4. 보유 및 이용기간</Text>
        <Text style={styles.paragraph}>
          원칙적으로 개인정보의 처리 목적이 달성되면 지체 없이 파기합니다.\n단, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>5. 제3자 제공 및 처리 위탁</Text>
        <Text style={styles.paragraph}>
          서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.\n다만, 서비스 운영을 위해 외부 업체에 처리를 위탁하는 경우
          위탁받는 자, 위탁 업무 내용 등을 본 방침에 공개하거나 별도 고지합니다.
        </Text>

        <Text style={styles.sectionTitle}>6. 이용자의 권리</Text>
        <Text style={styles.paragraph}>
          이용자는 개인정보 열람, 정정, 삭제, 처리정지 등을 요청할 수 있습니다.\n요청 방법 및 절차는 아래 문의처를 통해 안내합니다.
        </Text>

        <Text style={styles.sectionTitle}>7. 안전성 확보조치</Text>
        <Text style={styles.paragraph}>
          서비스는 개인정보 보호를 위해 접근 통제, 암호화(필요 시), 최소 권한 부여, 로그 모니터링 등 합리적인 보호조치를 적용합니다.
        </Text>

        <Text style={styles.sectionTitle}>8. 문의처</Text>
        <Text style={styles.paragraph}>이메일: support@example.com</Text>

        <Text style={styles.sectionTitle}>9. 고지 의무</Text>
        <Text style={styles.paragraph}>
          본 개인정보 처리방침이 변경되는 경우 앱 내 공지 또는 업데이트를 통해 고지합니다.
        </Text>
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
  bullet: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});
