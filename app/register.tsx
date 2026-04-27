import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Некорректный email';
    }
    if (form.password.length < 6) {
      newErrors.password = 'Минимум 6 символов';
    }
    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const users = JSON.parse((await AsyncStorage.getItem('users')) || '[]');

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

  const renderInput = ({
    icon,
    placeholder,
    value,
    field,
    keyboardType,
    secureTextEntry,
    autoCapitalize,
    rightIcon,
    onRightPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    placeholder: string;
    value: string;
    field: string;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    secureTextEntry?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    rightIcon?: keyof typeof Ionicons.glyphMap;
    onRightPress?: () => void;
  }) => (
    <>
      <View style={[styles.inputWrapper, errors[field] && styles.inputWrapperError]}>
        <Ionicons name={icon} size={18} color="#9ca3af" />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={(v) => handleChange(field, v)}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
        />
        {rightIcon ? (
          <TouchableOpacity onPress={onRightPress}>
            <Ionicons name={rightIcon} size={18} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>
      {errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null}
    </>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <AppText style={styles.title}>Регистрация</AppText>
          <AppText style={styles.subtitle}>Создайте аккаунт продавца</AppText>

          {renderInput({
            icon: 'person-outline',
            placeholder: 'Имя',
            value: form.firstName,
            field: 'firstName',
            autoCapitalize: 'words',
          })}

          {renderInput({
            icon: 'person-circle-outline',
            placeholder: 'Фамилия',
            value: form.lastName,
            field: 'lastName',
            autoCapitalize: 'words',
          })}

          {renderInput({
            icon: 'call-outline',
            placeholder: 'Номер телефона',
            value: form.phone,
            field: 'phone',
            keyboardType: 'phone-pad',
          })}

          {renderInput({
            icon: 'mail-outline',
            placeholder: 'Email',
            value: form.email,
            field: 'email',
            keyboardType: 'email-address',
            autoCapitalize: 'none',
          })}

          {renderInput({
            icon: 'lock-closed-outline',
            placeholder: 'Пароль',
            value: form.password,
            field: 'password',
            secureTextEntry: !showPassword,
            rightIcon: showPassword ? 'eye-outline' : 'eye-off-outline',
            onRightPress: () => setShowPassword((value) => !value),
          })}

          {renderInput({
            icon: 'shield-checkmark-outline',
            placeholder: 'Подтвердите пароль',
            value: form.confirmPassword,
            field: 'confirmPassword',
            secureTextEntry: !showConfirmPassword,
            rightIcon: showConfirmPassword ? 'eye-outline' : 'eye-off-outline',
            onRightPress: () => setShowConfirmPassword((value) => !value),
          })}

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
      </ScrollView>
    </KeyboardAvoidingView>
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
