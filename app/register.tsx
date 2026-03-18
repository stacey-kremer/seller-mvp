// Экран регистрации

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../components/AppText';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RegisterScreen() {
    
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    accepted: false,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
    setErrors({ ...errors, [key]: '' });
  };

  const handleRegister = async () => {
  const newErrors: { [key: string]: string } = {};

  if (!form.firstName.trim()) newErrors.firstName = 'Введите имя';
  if (!form.lastName.trim()) newErrors.lastName = 'Введите фамилию';
  if (!form.phone.trim()) newErrors.phone = 'Введите номер телефона';
  if (!form.email.trim()) newErrors.email = 'Введите email';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    newErrors.email = 'Некорректный email';
  if (form.password.length < 6)
    newErrors.password = 'Минимум 6 символов';
  if (form.password !== form.confirmPassword)
    newErrors.confirmPassword = 'Пароли не совпадают';

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  const users = JSON.parse(await AsyncStorage.getItem('users') || '[]');

  if (users.some((u: { email: string }) => u.email === form.email)) {
    setErrors({ email: 'Такой email уже зарегистрирован' });
    return;
  }

  users.push({
    firstName: form.firstName,
    lastName: form.lastName,
    phone: form.phone,
    email: form.email,
    password: form.password,
  });

  await AsyncStorage.setItem('users', JSON.stringify(users));

  await AsyncStorage.setItem('user', JSON.stringify({ email: form.email }));
  router.replace('/(tabs)/seller');
};

  return (
    <View style={styles.container}>
      <View style={styles.card}>

        <AppText style={styles.title}>Регистрация</AppText>
        <AppText style={styles.subtitle}>Создайте аккаунт продавца</AppText>

        <TextInput
          style={[styles.input, errors.firstName && { borderColor: '#EF4444' }]}
          placeholder="Имя"
          value={form.firstName}
          onChangeText={(v) => handleChange('firstName', v)}
        />
        {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

        <TextInput
          style={[styles.input, errors.lastName && { borderColor: '#EF4444' }]}
          placeholder="Фамилия"
          value={form.lastName}
          onChangeText={(v) => handleChange('lastName', v)}
        />
        {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

        <TextInput
          style={[styles.input, errors.phone && { borderColor: '#EF4444' }]}
          placeholder="Номер телефона"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={(v) => handleChange('phone', v)}
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

        <TextInput
          style={[styles.input, errors.email && { borderColor: '#EF4444' }]}
          placeholder="Email"
          autoCapitalize="none"
          value={form.email}
          onChangeText={(v) => handleChange('email', v)}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <TextInput
          style={[styles.input, errors.password && { borderColor: '#EF4444' }]}
          placeholder="Пароль"
          secureTextEntry
          value={form.password}
          onChangeText={(v) => handleChange('password', v)}
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <TextInput
          style={[styles.input, errors.confirmPassword && { borderColor: '#EF4444' }]}
          placeholder="Повторите пароль"
          secureTextEntry
          value={form.confirmPassword}
          onChangeText={(v) => handleChange('confirmPassword', v)}
        />
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

        {errors.accepted && <Text style={styles.errorText}>{errors.accepted}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Зарегистрироваться</Text>
        </TouchableOpacity>

        <AppText style={styles.footer}>
          Уже есть аккаунт?{' '}
          <Text style={styles.link} onPress={() => router.replace('/login')}>
            Войти
          </Text>
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
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
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: '#f9fafb',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#8E96A3',
    borderRadius: 4,
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: '#54CCFF',
    borderColor: '#54CCFF',
  },
  checkboxText: {
    color: '#2C3541',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#D4F7E0FF',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 4,
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
});