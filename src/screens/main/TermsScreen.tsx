import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { AppIcon } from '../../components/ui/AppIcon';

export default function TermsScreen() {
  const navigation = useNavigation();
  const appName = '뉴핏';
  // 실제 출시 시 "약관 최종 개정일"은 고정값으로 관리하는 것을 권장합니다.
  const effectiveDate = '2026-01-30';
  const contactEmail = 'psunghyi@gmail.com';

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
        <Text style={styles.meta}>시행일(최종 개정일): {effectiveDate}</Text>

        <Text style={styles.sectionTitle}>제1조 (목적)</Text>
        <Text style={styles.paragraph}>
          본 약관은 {appName}(NewFit) 애플리케이션 및 관련 서비스(이하 “서비스”)의 이용과 관련하여, 서비스 제공자(이하 “운영자”)와
          이용자 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        </Text>

        <Text style={styles.sectionTitle}>제2조 (정의)</Text>
        <Text style={styles.paragraph}>
          1) “이용자”란 본 약관에 따라 서비스를 이용하는 자를 말합니다.\n2) “회원”이란 계정을 생성하여 로그인한 이용자를 말합니다.\n3)
          “계정”이란 회원 식별 및 서비스 이용을 위해 회원이 설정한 아이디 및 이에 부수한 정보를 말합니다.\n4) “콘텐츠”란 이용자가
          서비스에 업로드하거나 서비스 이용 과정에서 생성되는 텍스트, 이미지(음식 사진/프로필 이미지), 기록, 분석 결과 등을 말합니다.
        </Text>

        <Text style={styles.sectionTitle}>제3조 (약관의 효력 및 변경)</Text>
        <Text style={styles.paragraph}>
          운영자는 본 약관의 내용을 앱 내에 게시함으로써 효력을 발생시킵니다. 운영자는 관련 법령을 위반하지 않는 범위에서 약관을 변경할
          수 있으며, 약관을 변경하는 경우 적용일자 및 변경사유를 적용일자 7일 전부터 공지합니다. 이용자에게 불리한 변경의 경우에는
          적용일자 30일 전부터 공지합니다.
        </Text>

        <Text style={styles.sectionTitle}>제4조 (회원가입 및 계정 관리)</Text>
        <Text style={styles.paragraph}>
          회원가입은 이용자가 약관 및 개인정보 처리방침에 동의하고 필요한 정보를 입력한 후, 운영자가 이를 승낙함으로써 완료됩니다.
          이용자는 본인의 계정 정보를 최신으로 유지해야 하며, 계정·비밀번호 관리 책임은 이용자에게 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>제5조 (서비스의 내용)</Text>
        <Text style={styles.paragraph}>
          서비스는 음식 사진 촬영/선택을 통한 분석, 목표·식습관·알레르기 설정 기반의 맞춤형 정보 제공, 식사/신체 기록(히스토리) 저장 및
          조회, 알림 설정 등의 기능을 제공할 수 있습니다. 운영자는 서비스의 품질 향상 및 정책 변경을 위해 서비스의 일부 또는 전부를 변경,
          중단할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>제6조 (AI 분석 결과의 성격 및 유의사항)</Text>
        <Text style={styles.paragraph}>
          서비스의 분석/추천/점수는 사진 및 입력 정보에 기반한 추정 결과로, 의료행위(진단·치료·처방)를 대체하지 않습니다. 알레르기 등
          건강 관련 의사결정은 반드시 제품 표시사항/성분표 확인 및 전문가 상담을 우선으로 하며, 이용자는 본 서비스 정보의 활용에 신중을
          기해야 합니다.
        </Text>

        <Text style={styles.sectionTitle}>제7조 (유료 서비스 및 결제)</Text>
        <Text style={styles.paragraph}>
          운영자는 일부 기능을 유료로 제공할 수 있으며, 유료 서비스의 내용·이용기간·가격·결제/환불 조건은 구매 화면 또는 별도 안내에
          따릅니다. 앱스토어/플레이스토어 등 오픈마켓을 통한 결제의 경우, 해당 마켓의 정책이 함께 적용될 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>제8조 (이용자의 의무 및 금지행위)</Text>
        <Text style={styles.paragraph}>
          이용자는 관련 법령, 본 약관, 공지사항 및 운영자가 정한 운영정책을 준수해야 합니다. 이용자는 (1) 타인의 정보 도용, (2) 서비스
          안정성을 해치는 행위(비정상 트래픽, 리버스 엔지니어링, 자동화된 접근 등), (3) 불법·유해 콘텐츠 업로드, (4) 권리 침해(저작권,
          초상권 등) 행위를 해서는 안 됩니다.
        </Text>

        <Text style={styles.sectionTitle}>제9조 (콘텐츠의 권리 및 책임)</Text>
        <Text style={styles.paragraph}>
          이용자가 업로드한 콘텐츠에 대한 권리는 이용자에게 귀속됩니다. 다만 운영자는 서비스 제공(분석, 저장, 조회, 고객지원, 품질 개선)을
          위해 필요한 범위에서 콘텐츠를 처리할 수 있습니다. 이용자는 업로드하는 콘텐츠가 제3자의 권리를 침해하지 않도록 보증하며, 분쟁이
          발생하는 경우 이용자의 책임으로 해결합니다.
        </Text>

        <Text style={styles.sectionTitle}>제10조 (서비스 이용 제한 및 해지)</Text>
        <Text style={styles.paragraph}>
          운영자는 이용자가 약관을 위반하거나 서비스 운영을 방해하는 경우, 사전 통지 후(긴급한 경우 사후 통지) 서비스 이용을 제한할 수
          있습니다. 이용자는 언제든지 앱 내 기능을 통해 계정 삭제를 요청할 수 있으며, 계정 삭제 시 관련 법령 및 개인정보 처리방침에 따라
          정보가 처리됩니다.
        </Text>

        <Text style={styles.sectionTitle}>제11조 (면책 및 책임 제한)</Text>
        <Text style={styles.paragraph}>
          운영자는 천재지변, 통신 장애, 서비스 제공자(클라우드/AI) 장애 등 불가항력 사유로 인한 서비스 제공 불가에 대해 책임을 지지
          않습니다. 또한 무료로 제공되는 서비스에 대해서는 관련 법령이 허용하는 범위 내에서 책임을 제한할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>제12조 (준거법 및 분쟁해결)</Text>
        <Text style={styles.paragraph}>
          본 약관은 대한민국 법령을 준거법으로 합니다. 서비스 이용과 관련하여 분쟁이 발생한 경우, 운영자와 이용자는 원만한 해결을 위해
          성실히 협의하며, 협의가 이루어지지 않을 경우 관련 법령에 따른 관할 법원에 제기할 수 있습니다.
        </Text>

        <Text style={styles.sectionTitle}>제13조 (문의처)</Text>
        <Text style={styles.paragraph}>이메일: {contactEmail}</Text>
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
