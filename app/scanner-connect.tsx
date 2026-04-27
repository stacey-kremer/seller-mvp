import React, { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

type Product = {
  id: string;
  barcode: string;
  name: string;
};

type ArrivalDraft = {
  supplier: string;
  invoiceNumber: string;
  deliveryDate: string;
  note: string;
  items: Array<{
    productId: string;
    barcode: string;
    name: string;
    quantity: number;
  }>;
};

type ScannerDevice = {
  id: string;
  name: string;
  meta: string;
  type: 'bluetooth' | 'usb';
};

const MOCK_DEVICES: ScannerDevice[] = [
  {
    id: 'honeywell',
    name: 'Honeywell Voyager 1450',
    meta: 'HID-VID:0C2E-PID:0A07',
    type: 'usb',
  },
  {
    id: 'zebra',
    name: 'Zebra DS2208-SR',
    meta: 'BT-ADDR: 00:1B:44:11:3A:B7',
    type: 'bluetooth',
  },
  {
    id: 'datalogic',
    name: 'Datalogic QuickScan',
    meta: 'BT-ADDR: 14:F2:A1:00:99:C4',
    type: 'bluetooth',
  },
];

const createArrivalDraft = (): ArrivalDraft => ({
  supplier: 'ООО "ОптТорг Сибирь"',
  invoiceNumber: '',
  deliveryDate: new Date().toISOString().slice(0, 10),
  note: '',
  items: [],
});

export default function ScannerConnectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const [activeDevice, setActiveDevice] = useState<ScannerDevice | null>({
    id: 'netum',
    name: 'Netum DS7100 Wireless',
    meta: 'Подключено • Bluetooth',
    type: 'bluetooth',
  });
  const [devices, setDevices] = useState<ScannerDevice[]>(MOCK_DEVICES);
  const [isScanning, setIsScanning] = useState(false);
  const [hardwareBarcode, setHardwareBarcode] = useState('');

  const systemStatuses = useMemo(
    () => [
      { label: 'Bluetooth: Активен', icon: 'bluetooth-outline' as const },
      { label: 'USB: Активен', icon: 'flash-outline' as const },
    ],
    [],
  );

  const handleConnect = (device: ScannerDevice) => {
    setActiveDevice({
      ...device,
      meta: device.type === 'bluetooth' ? 'Подключено • Bluetooth' : 'Подключено • USB',
    });
  };

  const handleDisconnect = () => {
    setActiveDevice(null);
    setHardwareBarcode('');
  };

  const handleRefresh = () => {
    setIsScanning(true);
    setTimeout(() => {
      setDevices(MOCK_DEVICES);
      setIsScanning(false);
    }, 600);
  };

  const handleAddBarcode = async () => {
    const normalized = hardwareBarcode.trim();
    if (!normalized) {
      Alert.alert(
        'Ожидается сканирование',
        'Подключите сканер и отсканируйте штрихкод в поле ниже.',
      );
      return;
    }

    const savedProducts = await AsyncStorage.getItem('products');
    const products: Product[] = savedProducts ? JSON.parse(savedProducts) : [];
    const product = products.find((item) => item.barcode === normalized);

    if (params.source === 'arrival') {
      if (product) {
        const savedDraft = await AsyncStorage.getItem('arrivalDraft');
        const draft: ArrivalDraft = savedDraft ? JSON.parse(savedDraft) : createArrivalDraft();

        const existingItem = draft.items.find((item) => item.productId === product.id);

        draft.items = existingItem
          ? draft.items.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            )
          : [
              {
                productId: product.id,
                barcode: product.barcode,
                name: product.name,
                quantity: 1,
              },
              ...draft.items,
            ];

        await AsyncStorage.setItem('arrivalDraft', JSON.stringify(draft));
        router.replace('/(tabs)/arrival');
        return;
      }

      router.replace({
        pathname: '/product-edit',
        params: { barcode: normalized, fromArrival: 'true' },
      });
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#2C3541" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Подключение сканера</Text>
        <TouchableOpacity style={styles.headerIconButton} onPress={handleRefresh}>
          <Ionicons name="refresh-outline" size={20} color="#2C3541" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>СТАТУС СИСТЕМЫ</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>Включено</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          {systemStatuses.map((status) => (
            <View key={status.label} style={styles.systemChip}>
              <Ionicons name={status.icon} size={14} color="#2F80ED" />
              <Text style={styles.systemChipText}>{status.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>АКТИВНОЕ УСТРОЙСТВО</Text>
        <View style={styles.activeCard}>
          {activeDevice ? (
            <>
              <View style={styles.activeTop}>
                <View style={styles.activeIcon}>
                  <Ionicons
                    name={
                      activeDevice.type === 'bluetooth' ? 'bluetooth-outline' : 'flash-outline'
                    }
                    size={22}
                    color="#2F80ED"
                  />
                </View>
                <View style={styles.activeInfo}>
                  <Text style={styles.activeName}>{activeDevice.name}</Text>
                  <Text style={styles.activeMeta}>{activeDevice.meta}</Text>
                </View>
              </View>

              <View style={styles.scanInputCard}>
                <Text style={styles.scanInputLabel}>Сканирование с устройства</Text>
                <TextInput
                  style={styles.scanInput}
                  value={hardwareBarcode}
                  onChangeText={setHardwareBarcode}
                  placeholder="Ожидание сканирования..."
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                />
              </View>

              <TouchableOpacity style={styles.primaryButton} onPress={handleAddBarcode}>
                <Text style={styles.primaryButtonText}>Добавить в поставку</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
                <Ionicons name="close-circle-outline" size={16} color="#EF5350" />
                <Text style={styles.disconnectText}>Отключить сканер</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyActiveState}>
              <Text style={styles.emptyActiveTitle}>Сканер не подключен</Text>
              <Text style={styles.emptyActiveText}>
                Выберите устройство из списка ниже, чтобы начать приемку через физический сканер.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.searchSectionHeader}>
          <Text style={styles.sectionTitle}>ПОИСК УСТРОЙСТВ</Text>
          <Text style={styles.scanningText}>
            {isScanning ? 'Сканирование...' : 'Готово к поиску'}
          </Text>
        </View>

        <View style={styles.devicesList}>
          {devices.map((device) => (
            <View key={device.id} style={styles.deviceRow}>
              <View style={styles.deviceIcon}>
                <Ionicons
                  name={device.type === 'bluetooth' ? 'bluetooth-outline' : 'flash-outline'}
                  size={20}
                  color="#6B7280"
                />
              </View>

              <View style={styles.deviceInfo}>
                <Text style={styles.deviceName}>{device.name}</Text>
                <Text style={styles.deviceMeta}>{device.meta}</Text>
              </View>

              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => handleConnect(device)}
              >
                <Text style={styles.connectButtonText}>Подключить</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.refreshGhostButton} onPress={handleRefresh}>
          <Ionicons name="refresh-outline" size={16} color="#6B7280" />
          <Text style={styles.refreshGhostText}>Обновить список устройств</Text>
        </TouchableOpacity>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="information-circle-outline" size={18} color="#2F80ED" />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Совет по подключению</Text>
            <Text style={styles.tipText}>
              Для стабильной работы Bluetooth-сканеров рекомендуется использовать режим HID
              Profile. Убедитесь, что сканер переведен в режим сопряжения согласно инструкции.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3541',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  searchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 1,
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  systemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  systemChipText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  activeCard: {
    backgroundColor: '#F2F8FF',
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  activeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  activeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#DCEBFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activeInfo: {
    flex: 1,
  },
  activeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 3,
  },
  activeMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  scanInputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  scanInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
  },
  scanInput: {
    fontSize: 15,
    color: '#2C3541',
  },
  primaryButton: {
    backgroundColor: '#2F80ED',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F5B5B3',
    backgroundColor: '#FFF8F7',
    borderRadius: 12,
    paddingVertical: 13,
  },
  disconnectText: {
    marginLeft: 8,
    color: '#EF5350',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyActiveState: {
    paddingVertical: 12,
  },
  emptyActiveTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 6,
  },
  emptyActiveText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
  },
  scanningText: {
    color: '#2F80ED',
    fontSize: 12,
    fontWeight: '600',
  },
  devicesList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F4F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3541',
    marginBottom: 3,
  },
  deviceMeta: {
    fontSize: 11,
    color: '#8E96A3',
  },
  connectButton: {
    backgroundColor: '#2F80ED',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  refreshGhostButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#D9E1EC',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  refreshGhostText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  tipCard: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#6B7280',
  },
});
