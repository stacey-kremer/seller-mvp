import React, { useState } from 'react';
import { TomatoLogo } from '../components/TomatoLogo';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { AppText } from './AppText';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Ошибка', 'Введите логин и пароль');
            return;
        }

        await AsyncStorage.setItem('user', JSON.stringify({ email }));
        router.replace('/(tabs)');
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
                    style={styles.input}
                    placeholder="example@mail.com"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />

                <TextInput
                    style={styles.input}
                    placeholder="Пароль"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Продолжить</Text>
                </TouchableOpacity>

                <TouchableOpacity>
                    <Text style={styles.forgot}>Забыли пароль?</Text>
                </TouchableOpacity>

                <AppText style={styles.footer}>
                    Уже есть аккаунт? <AppText style={styles.link}>Войти</AppText>
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
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 4,
        color: '#2C3541',
    },
    subtitle: {
        textAlign: 'center',
        fontSize: 14,
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