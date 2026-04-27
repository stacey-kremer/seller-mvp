import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppTopBar } from '@/components/AppTopBar';

const DAYS = [
  { key: 'monday', label: 'Понедельник' },
  { key: 'tuesday', label: 'Вторник' },
  { key: 'wednesday', label: 'Среда' },
  { key: 'thursday', label: 'Четверг' },
  { key: 'friday', label: 'Пятница' },
  { key: 'saturday', label: 'Суббота' },
  { key: 'sunday', label: 'Воскресенье' },
];

const createEmptyForm = () => ({
  name: '',
  bin: '',
  address: '',
  phone: '',
  email: '',
  schedule: {
    monday: { from: '', to: '' },
    tuesday: { from: '', to: '' },
    wednesday: { from: '', to: '' },
    thursday: { from: '', to: '' },
    friday: { from: '', to: '' },
    saturday: { from: '', to: '' },
    sunday: { from: '', to: '' },
  },
  delivery: {
    cost: '',
    freeFrom: '',
    radius: '',
    time: '',
  },
});

export default function SellerCabinet() {
  const router = useRouter();
  const [form, setForm] = useState(createEmptyForm());
  const [savedForm, setSavedForm] = useState(createEmptyForm());

  useEffect(() => {
    const loadData = async () => {
      const saved = await AsyncStorage.getItem('sellerProfile');
      const nextForm = saved
        ? {
            ...createEmptyForm(),
            ...JSON.parse(saved),
            schedule: {
              ...createEmptyForm().schedule,
              ...(JSON.parse(saved).schedule || {}),
            },
            delivery: {
              ...createEmptyForm().delivery,
              ...(JSON.parse(saved).delivery || {}),
            },
          }
        : createEmptyForm();

      setForm(nextForm);
      setSavedForm(nextForm);
    };

    loadData();
  }, []);

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem('sellerProfile', JSON.stringify(form));
      setSavedForm(form);
      router.replace('/(tabs)/products');
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
    }
  };

  const handleCancel = () => {
    setForm(savedForm);
  };

  const updateSchedule = (dayKey: string, field: 'from' | 'to', value: string) => {
    setForm((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        [dayKey]: {
          ...current.schedule[dayKey as keyof typeof current.schedule],
          [field]: value,
        },
      },
    }));
  };

  const updateDelivery = (field: 'cost' | 'freeFrom' | 'radius' | 'time', value: string) => {
    setForm((current) => ({
      ...current,
      delivery: {
        ...current.delivery,
        [field]: value,
      },
    }));
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
        <AppTopBar title="Кабинет продавца" />

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="storefront-outline" size={18} color="#54CCFF" />
            <Text style={styles.sectionTitle}>Основное</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Название магазина</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите название магазина"
              placeholderTextColor="#9ca3af"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>БИН организации</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите БИН"
              placeholderTextColor="#9ca3af"
              value={form.bin}
              onChangeText={(v) => setForm({ ...form, bin: v })}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={18} color="#54CCFF" />
            <Text style={styles.sectionTitle}>Адрес и геолокация</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Фактический адрес</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите адрес магазина"
              placeholderTextColor="#9ca3af"
              value={form.address}
              onChangeText={(v) => setForm({ ...form, address: v })}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Геолокация (2ГИС)</Text>
            <View style={styles.geoRow}>
              <Text style={styles.coords}>Координаты: 43.2389, 76.8897</Text>
              <TouchableOpacity style={styles.geoButton}>
                <Text style={styles.geoButtonText}>Выбрать на карте 2ГИС</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="call-outline" size={18} color="#54CCFF" />
            <Text style={styles.sectionTitle}>Контакты</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Телефон для связи</Text>
            <TextInput
              style={styles.input}
              placeholder="+7 (___) ___-__-__"
              placeholderTextColor="#9ca3af"
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v })}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Рабочий email</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите email"
              placeholderTextColor="#9ca3af"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={18} color="#54CCFF" />
            <Text style={styles.sectionTitle}>График работы</Text>
          </View>

          {DAYS.map((day) => (
            <View key={day.key} style={styles.scheduleRow}>
              <Text style={styles.label}>{day.label}</Text>
              <View style={styles.timeInputs}>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="09:00"
                  placeholderTextColor="#9ca3af"
                  value={form.schedule[day.key as keyof typeof form.schedule]?.from || ''}
                  onChangeText={(value) => updateSchedule(day.key, 'from', value)}
                />
                <Text style={styles.dash}>–</Text>
                <TextInput
                  style={[styles.input, styles.timeInput]}
                  placeholder="21:00"
                  placeholderTextColor="#9ca3af"
                  value={form.schedule[day.key as keyof typeof form.schedule]?.to || ''}
                  onChangeText={(value) => updateSchedule(day.key, 'to', value)}
                />
              </View>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bicycle-outline" size={18} color="#54CCFF" />
            <Text style={styles.sectionTitle}>Доставка</Text>
          </View>

          <View style={styles.deliveryRow}>
            <View style={styles.deliveryField}>
              <Text style={styles.label}>Стоимость</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                value={form.delivery.cost}
                onChangeText={(value) => updateDelivery('cost', value)}
              />
            </View>

            <View style={styles.deliveryField}>
              <Text style={styles.label}>Мин. сумма (бесплатно)</Text>
              <TextInput
                style={styles.input}
                placeholder="5000"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                value={form.delivery.freeFrom}
                onChangeText={(value) => updateDelivery('freeFrom', value)}
              />
            </View>
          </View>

          <View style={styles.deliveryRow}>
            <View style={styles.deliveryField}>
              <Text style={styles.label}>Радиус (км)</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                value={form.delivery.radius}
                onChangeText={(value) => updateDelivery('radius', value)}
              />
            </View>

            <View style={styles.deliveryField}>
              <Text style={styles.label}>Время (мин)</Text>
              <TextInput
                style={styles.input}
                placeholder="45"
                keyboardType="numeric"
                placeholderTextColor="#9ca3af"
                value={form.delivery.time}
                onChangeText={(value) => updateDelivery('time', value)}
              />
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="key-outline" size={18} color="#54CCFF" />
            <Text style={styles.sectionTitle}>Идентификация</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Уникальный ID магазина</Text>
            <TextInput
              style={styles.input}
              value="STORE-ALM-10294-X"
              editable={false}
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.helperText}>
              ID используется для внутренней идентификации магазина и не подлежит изменению.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerButtons}>
        <View style={styles.footerInner}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Ionicons name="close-circle-outline" size={18} color="#2C3541" />
            <Text style={styles.cancelText}>Отмена</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Ionicons name="save-outline" size={18} color="#2C3541" />
            <Text style={styles.saveText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 60,
    marginBottom: 20,
    color: '#2C3541',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3541',
    marginLeft: 6,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#2C3541',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#2C3541',
    backgroundColor: '#F9FAFB',
  },
  geoRow: {
    flexDirection: 'column',
    gap: 8,
  },
  coords: {
    fontSize: 14,
    color: '#6B7280',
  },
  geoButton: {
    backgroundColor: '#D4F7E0FF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  geoButtonText: {
    color: '#2C3541',
    fontWeight: '600',
    fontSize: 14,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    width: 80,
    textAlign: 'center',
  },
  dash: {
    marginHorizontal: 6,
    color: '#6B7280',
    fontWeight: '600',
  },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  deliveryField: {
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  footerButtons: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    elevation: 4,
  },
  footerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    color: '#2C3541',
    fontWeight: '600',
    fontSize: 15,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#D4F7E0FF',
    borderRadius: 8,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#2C3541',
    fontWeight: '700',
    fontSize: 15,
  },
});
