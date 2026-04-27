import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

type UserProfile = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  profileImage?: string;
};

type AppTopBarProps = {
  title: string;
};

export function AppTopBar({ title }: AppTopBarProps) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});

  const initials = useMemo(() => {
    const first = profile.firstName?.trim()?.[0] || '';
    const last = profile.lastName?.trim()?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  }, [profile.firstName, profile.lastName]);

  const loadProfile = async () => {
    const savedUser = await AsyncStorage.getItem('user');
    const savedUsers = await AsyncStorage.getItem('users');

    if (!savedUser) return;

    const user = JSON.parse(savedUser);
    const users = savedUsers ? JSON.parse(savedUsers) : [];
    const fullUser = users.find((item: { email: string }) => item.email === user.email) || user;

    setProfile({
      firstName: fullUser.firstName || '',
      lastName: fullUser.lastName || '',
      phone: fullUser.phone || '',
      email: fullUser.email || '',
      profileImage: fullUser.profileImage || '',
    });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const persistProfileImage = async (uri: string) => {
    const savedUsers = await AsyncStorage.getItem('users');
    const savedUser = await AsyncStorage.getItem('user');
    const users = savedUsers ? JSON.parse(savedUsers) : [];
    const user = savedUser ? JSON.parse(savedUser) : null;

    if (!user?.email) return;

    const updatedUsers = users.map((item: { email: string }) =>
      item.email === user.email ? { ...item, profileImage: uri } : item,
    );
    const updatedUser = { ...user, profileImage: uri };

    await AsyncStorage.setItem('users', JSON.stringify(updatedUsers));
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    await loadProfile();
  };

  const handlePickProfileImage = () => {
    Alert.alert('Фото профиля', 'Выберите источник изображения', [
      {
        text: 'Камера',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled) {
            await persistProfileImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Галерея',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled) {
            await persistProfileImage(result.assets[0].uri);
          }
        },
      },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const handleLogout = async () => {
    setMenuVisible(false);
    setProfileVisible(false);
    await AsyncStorage.removeItem('user');
    router.replace('/login');
  };

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setMenuVisible(true)}>
          <Ionicons name="menu-outline" size={30} color="#2C3541" />
        </TouchableOpacity>

        <Text style={styles.title}>{title}</Text>

        <TouchableOpacity style={styles.avatarButton} onPress={() => setProfileVisible(true)}>
          {profile.profileImage ? (
            <Image source={{ uri: profile.profileImage }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            </View>
          )}
          <View style={styles.avatarStatus} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                router.push('/(tabs)/seller');
              }}
            >
              <Ionicons name="storefront-outline" size={18} color="#2C3541" />
              <Text style={styles.menuText}>Кабинет продавца</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={[styles.menuText, styles.logoutText]}>Выйти</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={profileVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileVisible(false)}
      >
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setProfileVisible(false)}>
          <View style={styles.profileCard}>
            <View style={styles.profileTop}>
              {profile.profileImage ? (
                <Image source={{ uri: profile.profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileFallback}>
                  <Text style={styles.profileFallbackText}>{initials}</Text>
                </View>
              )}
              <Text style={styles.profileName}>
                {[profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Профиль'}
              </Text>
            </View>

            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Имя</Text>
              <Text style={styles.profileValue}>{profile.firstName || '—'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Фамилия</Text>
              <Text style={styles.profileValue}>{profile.lastName || '—'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Телефон</Text>
              <Text style={styles.profileValue}>{profile.phone || '—'}</Text>
            </View>
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Email</Text>
              <Text style={styles.profileValue}>{profile.email || '—'}</Text>
            </View>

            <TouchableOpacity style={styles.profileButton} onPress={handlePickProfileImage}>
              <Ionicons name="image-outline" size={18} color="#2C3541" />
              <Text style={styles.profileButtonText}>Загрузить фото профиля</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => Alert.alert('Смена пароля', 'Эта функция появится позже.')}
            >
              <Ionicons name="key-outline" size={18} color="#2C3541" />
              <Text style={styles.profileButtonText}>Сменить пароль</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.profileButton, styles.logoutButton]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
              <Text style={[styles.profileButtonText, styles.logoutText]}>Выйти</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 42,
    paddingBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  iconButton: {
    width: 40,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3541',
    marginLeft: 10,
  },
  avatarButton: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#D4F7E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3541',
  },
  avatarStatus: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 53, 65, 0.18)',
    paddingTop: 94,
    paddingHorizontal: 16,
  },
  menuCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3541',
  },
  profileCard: {
    marginTop: 8,
    marginLeft: 'auto',
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  profileTop: {
    alignItems: 'center',
    marginBottom: 14,
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
  },
  profileFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D4F7E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileFallbackText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3541',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3541',
    textAlign: 'center',
  },
  profileRow: {
    marginBottom: 10,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E96A3',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  profileValue: {
    fontSize: 15,
    color: '#2C3541',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3541',
  },
  logoutButton: {
    marginTop: 12,
  },
  logoutText: {
    color: '#EF4444',
  },
});
