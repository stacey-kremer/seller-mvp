// Экран входа

import React, { useState } from 'react';
import { TomatoLogo } from '../components/TomatoLogo';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from '../components/AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const router = useRouter();

    const handleLogin = async () => {
        setEmailError('');
        setPasswordError('');

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail) {
            setEmailError('Введите email');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            setEmailError('Некорректный формат email');
            return;
        }

        if (!trimmedPassword) {
            setPasswordError('Введите пароль');
            return;
        }

        if (trimmedPassword.length < 6) {
            setPasswordError('Минимум 6 символов');
            return;
        }

        const users = JSON.parse(await AsyncStorage.getItem('users') || '[]');

        const existingUser = users.find(
            (u: { email: string; password: string }) =>
                u.email === trimmedEmail && u.password === trimmedPassword
        );

        if (!existingUser) {
            setPasswordError('Неверный email или пароль');
            return;
        }

        await AsyncStorage.setItem('user', JSON.stringify(existingUser));
        router.replace('/(tabs)/seller');
    };
    return (
        <View style={styles.container}>

            <View style={styles.card}>
                <View style={styles.logoCircle}>
                    <TomatoLogo size={60} />
                </View>

                <AppText style={styles.title}>Войти в Market</AppText>
                <AppText style={styles.subtitle}>Заполните данные для доступа в кабинет продавца</AppText>

                <TextInput
                    style={[styles.input, emailError && { borderColor: '#EF4444' }]}
                    placeholder="example@mail.com"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={(value) => {
                        setEmail(value);
                        setEmailError('');
                    }}
                    autoCapitalize="none"
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

                <TextInput
                    style={[styles.input, passwordError && { borderColor: '#EF4444' }]}
                    placeholder="Пароль"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={(value) => {
                        setPassword(value);
                        setPasswordError('');
                    }}
                    secureTextEntry
                />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Войти</Text>
                </TouchableOpacity>

                <AppText style={styles.footer}>
                    Ещё нет аккаунта? <AppText style={styles.link} onPress={() => router.push('/register')}>
                        Регистрация
                    </AppText>
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
    errorText: {
        color: '#EF4444',
        fontSize: 13,
        marginBottom: 8,
        marginLeft: 4,
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
    forgot: {
        textAlign: 'center',
        color: '#54CCFF',
        marginTop: 16,
        fontSize: 14,
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