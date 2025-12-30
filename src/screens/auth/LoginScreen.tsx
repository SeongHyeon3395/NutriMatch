import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useUserStore } from '../../store/userStore';
import { COLORS } from '../../constants/colors';
import { Button } from '../../components/ui/Button';
import { useAppAlert } from '../../components/ui/AppAlert';

function GoogleMark({ size = 18 }: { size?: number }) {
  // 브랜드 에셋을 직접 포함하지 않고, 앱 팔레트로 "구글 느낌"을 맞춘 단순 마크입니다.
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 18 18">
      {/* Blue */}
      <Path d="M9 1.6c2.06 0 3.44.9 4.22 1.66l-1.72 1.66C11.02 4.5 10.2 4.1 9 4.1c-1.98 0-3.66 1.33-4.23 3.12H2.58V4.55C3.9 2.76 6.24 1.6 9 1.6z" fill={COLORS.primary} />
      {/* Red */}
      <Path d="M4.77 7.22A4.96 4.96 0 0 0 4.5 9c0 .62.1 1.21.27 1.78l-2.19 1.67A8.02 8.02 0 0 1 1.8 9c0-1.39.35-2.7.78-3.88l2.19 2.1z" fill={COLORS.danger} />
      {/* Yellow */}
      <Path d="M9 16.4c-2.76 0-5.1-1.16-6.42-2.95l2.19-1.67c.57 1.79 2.25 3.12 4.23 3.12 1.08 0 2.03-.35 2.78-.96l2.05 1.58C12.68 15.63 11.06 16.4 9 16.4z" fill={COLORS.warning} />
      {/* Green */}
      <Path d="M16.2 9c0-.55-.07-1.08-.2-1.58H9v3.02h3.98c-.2.99-.77 1.82-1.63 2.4l2.05 1.58C15.07 13.35 16.2 11.36 16.2 9z" fill={COLORS.success} />
    </Svg>
  );
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const profile = useUserStore(state => state.profile);
  const clearProfile = useUserStore(state => state.clearProfile);
  const { alert } = useAppAlert();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const canLogin = useMemo(() => {
    return email.trim().length > 0 && password.length > 0;
  }, [email, password]);

  const handleLogin = () => {
    if (!canLogin) {
      alert({ title: '입력이 필요해요', message: '이메일과 비밀번호를 입력해주세요.' });
      return;
    }
    // TODO: 서버 로그인 연동 전 임시(앱 내부 로그인)
    navigation.replace('MainTab');
  };

  const handleAccountFind = () => {
    alert({
      title: '계정 찾기',
      message: '찾으려는 항목을 선택해주세요.',
      actions: [
        {
          text: '이메일 찾기',
          variant: 'outline',
          onPress: () => alert({ title: '이메일 찾기', message: '현재 버전에서는 준비 중인 기능입니다.' }),
        },
        {
          text: '비밀번호 찾기',
          variant: 'primary',
          onPress: () => alert({ title: '비밀번호 찾기', message: '현재 버전에서는 준비 중인 기능입니다.' }),
        },
        { text: '취소', variant: 'outline' },
      ],
    });
  };

  const handleTestLogin = () => {
    navigation.replace('MainTab');
  };

  const handleNewStart = async () => {
    await clearProfile();
    navigation.replace('Onboarding');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>NutriMatch</Text>
          <Text style={styles.subtitle}>나만의 AI 영양 관리 파트너</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputStack}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>이메일</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor={COLORS.textGray}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>비밀번호</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="비밀번호"
                placeholderTextColor={COLORS.textGray}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                returnKeyType="done"
              />
            </View>
          </View>

          <Button title="로그인" onPress={handleLogin} disabled={!canLogin} style={{ width: '100%' }} />

          <View style={styles.linkRow}>
            <TouchableOpacity
              onPress={() => alert({ title: '회원가입', message: '현재 버전에서는 준비 중인 기능입니다.' })}
              style={styles.signupLink}
            >
              <Text style={styles.signupLinkText}>회원가입</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAccountFind} style={styles.accountFindLink}>
              <Text style={styles.signupLinkText}>계정 찾기</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.googleButton}
            onPress={() => alert({ title: 'Google 로그인', message: '출시 버전에서 연동 예정입니다.' })}
          >
            <View style={styles.googleIcon}>
              <GoogleMark />
            </View>
            <Text style={styles.googleText}>Google로 로그인</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footerButtons}>
        <TouchableOpacity style={styles.newButton} onPress={handleNewStart}>
          <Text style={styles.newButtonText}>New</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={handleTestLogin}>
          <Text style={styles.testButtonText}>테스트</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textGray,
  },
  form: {
    gap: 16,
  },
  inputStack: {
    gap: 10,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    width: '100%',
    maxWidth: 260,
    alignSelf: 'center',
  },
  signupLink: {
    alignItems: 'flex-start',
  },
  accountFindLink: {
    alignItems: 'flex-end',
  },
  signupLinkText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
    textDecorationColor: COLORS.border,
  },
  googleButton: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    position: 'absolute',
    left: 14,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C4043',
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: COLORS.text,
  },
  footerButtons: {
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  newButton: {
    backgroundColor: '#10B981', // Emerald 500
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  newButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  testButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
