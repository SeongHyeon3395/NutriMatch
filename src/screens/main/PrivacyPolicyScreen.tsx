import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { AppIcon } from '../../components/ui/AppIcon';

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const appName = '뉴핏';
  // 실제 출시 시 "시행일/최종 개정일"은 고정값으로 관리하는 것을 권장합니다.
  const effectiveDate = '2026-01-30';
  const contactEmail = 'psunghyi@gmail.com';

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
        <Text style={styles.meta}>시행일(최종 개정일): {effectiveDate}</Text>

        <Text style={styles.sectionTitle}>1. 총칙</Text>
        <Text style={styles.paragraph}>
          {appName}(NewFit)(이하 “서비스”)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 안전하게 보호하기 위해
          아래와 같이 개인정보 처리방침을 수립·공개합니다.
        </Text>

        <Text style={styles.sectionTitle}>2. 개인정보의 처리 목적</Text>
        <Text style={styles.bullet}>• 회원 식별 및 인증(가입/로그인/계정관리)</Text>
        <Text style={styles.bullet}>• 음식 사진 분석 및 결과 제공, 기록 저장/조회, 맞춤형 피드백 제공</Text>
        <Text style={styles.bullet}>• 알림 설정 저장 및 서비스 이용 편의 제공</Text>
        <Text style={styles.bullet}>• 고객문의 응대 및 공지사항 전달</Text>
        <Text style={styles.bullet}>• 서비스 품질 개선 및 부정 이용 방지</Text>

        <Text style={styles.sectionTitle}>3. 처리하는 개인정보의 항목</Text>
        <Text style={styles.paragraph}>서비스는 아래 정보를 처리할 수 있습니다.</Text>
        <Text style={styles.bullet}>[필수] 계정 정보: 아이디(사용자명), 닉네임, 인증 식별자(사용자 ID)</Text>
        <Text style={styles.bullet}>[선택] 프로필/설정: 목표(예: 감량/벌크업), 식단 성향, 알레르기 정보</Text>
        <Text style={styles.bullet}>[선택] 신체 정보: 키/나이/성별, 현재·목표 체중, 체지방/근육량 등(기록 기능 사용 시)</Text>
        <Text style={styles.bullet}>[선택] 이미지/콘텐츠: 음식 사진, 프로필 이미지(아바타), 식사/메모/기록</Text>
        <Text style={styles.bullet}>[자동 생성] 서비스 이용기록: 접속/이용 로그, 오류 로그</Text>
        <Text style={styles.paragraph}>
          비밀번호는 운영자가 평문으로 저장하지 않으며, 인증 제공자(예: Supabase Auth)에서 안전한 방식으로 처리됩니다.
        </Text>

        <Text style={styles.sectionTitle}>4. 개인정보의 처리 및 보유기간</Text>
        <Text style={styles.bullet}>• 회원가입/서비스 제공을 위한 정보: 회원 탈퇴(계정 삭제) 시까지</Text>
        <Text style={styles.bullet}>• 이용자가 저장한 기록(식사/신체/알림설정 등): 이용자가 삭제하거나 회원 탈퇴 시까지</Text>
        <Text style={styles.bullet}>• 오류/이용 로그: 서비스 품질 개선을 위해 필요한 기간(통상 90일 이내) 보관 후 파기</Text>
        <Text style={styles.paragraph}>
          단, 관계 법령에 따라 보존이 필요한 경우 해당 법령에서 정한 기간 동안 보관할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>5. 개인정보의 제3자 제공</Text>
        <Text style={styles.paragraph}>
          운영자는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 법령에 근거가 있거나 수사기관의 적법한 절차에 따른
          요청이 있는 경우에는 예외로 합니다.
        </Text>

        <Text style={styles.sectionTitle}>6. 개인정보 처리의 위탁</Text>
        <Text style={styles.paragraph}>
          운영자는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁할 수 있습니다.
        </Text>
        <Text style={styles.bullet}>• Supabase: 회원 인증, 데이터베이스, 파일 저장(프로필/음식 이미지), Edge Functions 운영</Text>
        <Text style={styles.bullet}>• AI 분석 제공자(예: Google Gemini): 음식 사진 분석 및 텍스트/영양 정보 생성</Text>
        <Text style={styles.paragraph}>
          위탁업무의 내용이나 수탁자가 변경되는 경우, 본 방침을 통해 공개하거나 별도로 고지합니다.
        </Text>

        <Text style={styles.sectionTitle}>7. 개인정보의 국외 이전</Text>
        <Text style={styles.paragraph}>
          서비스는 클라우드/AI 제공자의 서버 위치에 따라 이용자의 정보가 국외로 이전(전송/저장/처리)될 수 있습니다. 국외 이전이 발생하는
          경우, 이전되는 항목·국가·이전 시점·이전 방법·이용 목적·보유기간 등은 서비스 내 공지 또는 업데이트를 통해 안내합니다.
        </Text>

        <Text style={styles.sectionTitle}>8. 이용자의 권리 및 행사 방법</Text>
        <Text style={styles.bullet}>• 개인정보 열람, 정정, 삭제, 처리정지 요구</Text>
        <Text style={styles.bullet}>• 회원 탈퇴(계정 삭제) 요청</Text>
        <Text style={styles.paragraph}>
          이용자는 앱 내 기능(설정/계정) 또는 아래 문의처를 통해 권리를 행사할 수 있습니다. 운영자는 관련 법령에 따라 지체 없이
          조치하겠습니다.
        </Text>

        <Text style={styles.sectionTitle}>9. 민감정보 처리에 관한 사항</Text>
        <Text style={styles.paragraph}>
          서비스는 이용자가 입력하는 신체 정보(체중, 체지방 등) 및 식단/건강 관련 설정을 처리할 수 있으며, 이는 민감정보에 해당할 수
          있습니다. 해당 기능은 이용자의 선택에 따라 제공되며, 이용자는 언제든지 입력 정보의 삭제를 요청할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>10. 안전성 확보조치</Text>
        <Text style={styles.bullet}>• 접근 권한 관리 및 최소 권한 원칙 적용</Text>
        <Text style={styles.bullet}>• 전송 구간 암호화(HTTPS 등)</Text>
        <Text style={styles.bullet}>• 계정 인증 토큰 기반 접근 통제</Text>
        <Text style={styles.bullet}>• 보안 업데이트 및 모니터링</Text>

        <Text style={styles.sectionTitle}>11. 개인정보 보호책임자 및 문의처</Text>
        <Text style={styles.paragraph}>개인정보 관련 문의: {contactEmail}</Text>

        <Text style={styles.sectionTitle}>12. 고지 의무</Text>
        <Text style={styles.paragraph}>
          본 개인정보 처리방침의 내용 추가/삭제/수정이 있을 경우, 변경 사항의 시행일 7일 전부터 앱 내 공지 또는 업데이트를 통해
          고지합니다.
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
