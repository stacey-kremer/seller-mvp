import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { TomatoLogo } from '../components/TomatoLogo';
import { AppText } from '../components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) return setEmailError('Введите email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) return setEmailError('Некорректный формат email');
    if (!trimmedPassword) return setPasswordError('Введите пароль');
    if (trimmedPassword.length < 6) return setPasswordError('Минимум 6 символов');

    const users = JSON.parse((await AsyncStorage.getItem('users')) || '[]');
    const existingUser = users.find(
      (u: { email: string; password: string }) =>
        u.email === trimmedEmail && u.password === trimmedPassword,
    );

    if (!existingUser) return setPasswordError('Неверный email или пароль');

    await AsyncStorage.setItem('user', JSON.stringify(existingUser));
    router.replace('/(tabs)/seller');
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid
      extraScrollHeight={60}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.logoCircle}>
          <TomatoLogo size={60} />
        </View>

        <AppText style={styles.title}>Войти в Market</AppText>
        <AppText style={styles.subtitle}>
          Заполните данные для доступа в кабинет продавца
        </AppText>

        <View style={[styles.inputWrapper, emailError && styles.inputWrapperError]}>
          <Ionicons name="mail-outline" size={18} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder="example@mail.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setEmailError('');
            }}
            autoCapitalize="none"
          />
        </View>
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

        <View style={[styles.inputWrapper, passwordError && styles.inputWrapperError]}>
            <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder="Пароль"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setPasswordError('');
            }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword((value) => !value)}>
            <Ionicons
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color="#9ca3af"
            />
          </TouchableOpacity>
        </View>
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Войти</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={() => setForgotPasswordVisible(true)}
        >
          <Text style={styles.forgotPasswordText}>Забыли пароль?</Text>
        </TouchableOpacity>

        <AppText style={styles.footer}>
          Ещё нет аккаунта?{' '}
          <AppText style={styles.link} onPress={() => router.push('/register')}>
            Регистрация
          </AppText>
        </AppText>
      </View>

      <Modal
        visible={forgotPasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotPasswordVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="mail-open-outline" size={20} color="#54CCFF" />
            </View>
            <Text style={styles.modalTitle}>Восстановление пароля</Text>
            <Text style={styles.modalText}>
              Эта функция пока в разработке. Позже здесь появится отправка письма для
              восстановления пароля на вашу электронную почту.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setForgotPasswordVisible(false)}
            >
              <Text style={styles.modalButtonText}>Понятно</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f9fafb',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: '#2C3541',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  logoCircle: {
    alignSelf: 'center',
    backgroundColor: '#D4F7E0FF',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    color: '#2C3541',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: '#8E96A3',
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f9fafb',
    marginBottom: 14,
    gap: 10,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2C3541',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#D4F7E0FF',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 4,
  },
  forgotPasswordText: {
    color: '#54CCFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonText: {
    color: '#2C3541',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    textAlign: 'center',
    color: '#8E96A3',
    marginTop: 20,
    fontSize: 14,
  },
  link: {
    color: '#54CCFF',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 53, 65, 0.24)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  modalButton: {
    backgroundColor: '#D4F7E0FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#2C3541',
    fontSize: 15,
    fontWeight: '700',
  },
});
