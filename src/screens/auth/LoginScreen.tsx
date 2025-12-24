import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { useUserStore } from '../../store/userStore';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const profile = useUserStore(state => state.profile);
  const clearProfile = useUserStore(state => state.clearProfile);

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
          <TouchableOpacity style={styles.loginButton} disabled>
            <Text style={styles.loginButtonText}>로그인 (준비중)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signupButton} disabled>
            <Text style={styles.signupButtonText}>회원가입 (준비중)</Text>
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
    backgroundColor: '#FFF',
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
    color: '#3B82F6',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
  },
  form: {
    gap: 16,
  },
  loginButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  signupButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
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
