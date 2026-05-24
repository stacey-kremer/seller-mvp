import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
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
import { SafeAreaView } from 'react-native-safe-area-context';

type Product = {
  id: string;
  barcode: string;
  name: string;
  retailPrice?: number;
  unit?: string;
};

type ArrivalDraft = {
  supplier: string;
  invoiceNumber: string;
  deliveryDate: string;
  note: string;
  items: {
    productId: string;
    barcode: string;
    name: string;
    quantity: number;
  }[];
};

type SaleDraft = {
  paymentMethod: 'cash' | 'qr' | 'card';
  note: string;
  items: {
    productId: string;
    name: string;
    barcode: string;
    quantity: number;
    price: number;
    unit?: string;
  }[];
};

type ScannerDevice = {
  id: string;
  name: string;
  meta: string;
  type: 'bluetooth' | 'usb';
  isRemembered?: boolean;
};

const ACTIVE_SCANNER_KEY = 'activeHardwareScanner';
const SALE_DRAFT_KEY = 'saleDraft';
const SCAN_IDLE_TIMEOUT_MS = 250;

const createArrivalDraft = (): ArrivalDraft => ({
  supplier: 'ООО "ОптТорг Сибирь"',
  invoiceNumber: '',
  deliveryDate: new Date().toISOString().slice(0, 10),
  note: '',
  items: [],
});

const createSaleDraft = (): SaleDraft => ({
  paymentMethod: 'cash',
  note: '',
  items: [],
});

const createManualDevice = (name?: string): ScannerDevice => ({
  id: 'paired-hid-scanner',
  name: name?.trim() || 'Подключенный HID-сканер',
  meta: 'Подключено через системный Bluetooth',
  type: 'bluetooth',
  isRemembered: true,
});

const normalizeBarcode = (value: string) => value.replace(/[\r\n\t]/g, '').trim();

export default function ScannerConnectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const inputRef = useRef<TextInput | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSubmittingRef = useRef(false);
  const isScanLockedRef = useRef(false);

  const [activeDevice, setActiveDevice] = useState<ScannerDevice | null>(null);
  const [knownDevices, setKnownDevices] = useState<ScannerDevice[]>([]);
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [hardwareBarcode, setHardwareBarcode] = useState('');
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void restoreActiveDevice();

    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);

    return () => {
      clearTimeout(focusTimer);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const restoreActiveDevice = async () => {
    const savedDevice = await AsyncStorage.getItem(ACTIVE_SCANNER_KEY);
    if (!savedDevice) {
      setKnownDevices([]);
      return;
    }

    try {
      const parsedDevice = JSON.parse(savedDevice) as ScannerDevice;
      setActiveDevice(parsedDevice);
      setKnownDevices([parsedDevice]);
      setDeviceNameInput(parsedDevice.name);
    } catch {
      await AsyncStorage.removeItem(ACTIVE_SCANNER_KEY);
      setKnownDevices([]);
    }
  };

  const persistActiveDevice = async (device: ScannerDevice) => {
    setActiveDevice(device);
    setKnownDevices([device]);
    await AsyncStorage.setItem(ACTIVE_SCANNER_KEY, JSON.stringify(device));
  };

  const addProductToArrival = async (product: Product) => {
    const savedDraft = await AsyncStorage.getItem('arrivalDraft');
    const draft: ArrivalDraft = savedDraft ? JSON.parse(savedDraft) : createArrivalDraft();

    const existingItem = draft.items.find((item) => item.productId === product.id);

    draft.items = existingItem
      ? draft.items.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
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
  };

  const addProductToSale = async (product: Product) => {
    const savedDraft = await AsyncStorage.getItem(SALE_DRAFT_KEY);
    const draft: SaleDraft = savedDraft ? JSON.parse(savedDraft) : createSaleDraft();

    const existingItem = draft.items.find((item) => item.productId === product.id);

    draft.items = existingItem
      ? draft.items.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        )
      : [
          {
            productId: product.id,
            name: product.name,
            barcode: product.barcode,
            quantity: 1,
            price: product.retailPrice || 0,
            unit: product.unit || 'шт',
          },
          ...draft.items,
        ];

    await AsyncStorage.setItem(SALE_DRAFT_KEY, JSON.stringify(draft));
  };

  const submitScannedBarcode = async (rawValue?: string) => {
    const normalized = normalizeBarcode(rawValue ?? hardwareBarcode);
    if (!normalized || isSubmittingRef.current || isScanLockedRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    isScanLockedRef.current = true;
    setIsSubmitting(true);
    let keepLockedUntilUnmount = false;

    try {
      const savedProducts = await AsyncStorage.getItem('products');
      const products: Product[] = savedProducts ? JSON.parse(savedProducts) : [];
      const product = products.find((item) => item.barcode === normalized);

      setHardwareBarcode('');
      setLastScannedBarcode(normalized);

      if (params.source === 'arrival') {
        if (product) {
          await addProductToArrival(product);
          Alert.alert('Товар добавлен', `${product.name} добавлен в поставку.`);
          return;
        }

        keepLockedUntilUnmount = true;
        setHardwareBarcode('');
        router.push({
          pathname: '/product-edit',
          params: { barcode: normalized, fromArrival: 'true' },
        });
        return;
      }

      if (params.source === 'sale') {
        if (!product) {
          Alert.alert('Товар не найден', 'Для продажи можно добавить только товар из каталога.');
          return;
        }

        await addProductToSale(product);
        Alert.alert('Товар добавлен', `${product.name} добавлен в продажу.`);
        return;
      }

      if (product) {
        Alert.alert('Штрихкод считан', `${product.name}\n${normalized}`);
      } else {
        Alert.alert('Штрихкод считан', normalized);
      }
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);

      if (keepLockedUntilUnmount) {
        return;
      }

      setTimeout(() => {
        isScanLockedRef.current = false;
        inputRef.current?.focus();
      }, 150);
    }
  };

  const scheduleScannerSubmit = (value: string) => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    const normalized = normalizeBarcode(value);
    if (!normalized) {
      return;
    }

    setIsScanning(true);
    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(false);
      void submitScannedBarcode(normalized);
    }, SCAN_IDLE_TIMEOUT_MS);
  };

  const handleBarcodeChange = (value: string) => {
    if (isScanLockedRef.current) {
      return;
    }

    setHardwareBarcode(value);
    scheduleScannerSubmit(value);
  };

  const handleBarcodeSubmit = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }

    setIsScanning(false);
    void submitScannedBarcode();
  };

  const handleConnectRemembered = async () => {
    const device = createManualDevice(deviceNameInput);
    await persistActiveDevice(device);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleDisconnect = async () => {
    setActiveDevice(null);
    setKnownDevices([]);
    setHardwareBarcode('');
    setLastScannedBarcode('');
    isScanLockedRef.current = false;
    await AsyncStorage.removeItem(ACTIVE_SCANNER_KEY);
  };

  const handleRefresh = async () => {
    setIsScanning(true);
    isScanLockedRef.current = false;
    await restoreActiveDevice();
    setTimeout(() => {
      setIsScanning(false);
      inputRef.current?.focus();
    }, 250);
  };

  const systemStatuses = useMemo(
    () => [
      {
        label: activeDevice ? 'Bluetooth HID готов' : 'Bluetooth ожидает подключения',
        icon: 'bluetooth-outline' as const,
      },
      {
        label: 'Сканирование через ввод с клавиатуры',
        icon: 'barcode-outline' as const,
      },
    ],
    [activeDevice],
  );

  const helperText = useMemo(() => {
    if (params.source === 'arrival') {
      return 'После сканирования товар будет добавлен в поставку или откроется создание товара.';
    }

    if (params.source === 'sale') {
      return 'После сканирования товар будет добавлен в черновик продажи.';
    }

    return 'Экран готов принять штрихкод от физического сканера в режиме HID.';
  }, [params.source]);

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#2C3541" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Подключение сканера</Text>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => void handleRefresh()}>
          <Ionicons name="refresh-outline" size={20} color="#2C3541" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>СТАТУС СИСТЕМЫ</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{activeDevice ? 'Подключено' : 'Ожидание'}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          {systemStatuses.map((status) => (
            <View key={status.label} style={styles.systemChip}>
              <Ionicons name={status.icon} size={14} color="#54CCFF" />
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
                  <Ionicons name="bluetooth-outline" size={22} color="#2F80ED" />
                </View>
                <View style={styles.activeInfo}>
                  <Text style={styles.activeName}>{activeDevice.name}</Text>
                  <Text style={styles.activeMeta}>{activeDevice.meta}</Text>
                </View>
              </View>

              <View style={styles.scanInputCard}>
                <Text style={styles.scanInputLabel}>Сканирование с устройства</Text>
                <Text style={styles.scanHint}>{helperText}</Text>
                <TextInput
                  ref={inputRef}
                  style={styles.scanInput}
                  value={hardwareBarcode}
                  onChangeText={handleBarcodeChange}
                  onSubmitEditing={handleBarcodeSubmit}
                  placeholder="Ожидание сканирования..."
                  placeholderTextColor="#9CA3AF"
                  autoFocus
                  blurOnSubmit={false}
                  autoCorrect={false}
                  autoCapitalize="none"
                  showSoftInputOnFocus={false}
                  contextMenuHidden
                  returnKeyType="done"
                />
                {!!lastScannedBarcode && (
                  <Text style={styles.lastScanText}>Последний код: {lastScannedBarcode}</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
                onPress={handleBarcodeSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.primaryButtonText}>
                  {params.source === 'sale' ? 'Добавить в продажу' : 'Добавить в поставку'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.disconnectButton} onPress={() => void handleDisconnect()}>
                <Ionicons name="close-circle-outline" size={16} color="#EF5350" />
                <Text style={styles.disconnectText}>Отключить сканер</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyActiveState}>
              <Text style={styles.emptyActiveTitle}>Сканер не подключен</Text>
              <Text style={styles.emptyActiveText}>
                Подключите barcode scanner к телефону через системный Bluetooth как HID-клавиатуру,
                затем укажите его название ниже.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.searchSectionHeader}>
          <Text style={styles.sectionTitle}>РЕАЛЬНОЕ УСТРОЙСТВО</Text>
          <Text style={styles.scanningText}>{isScanning ? 'Принимаем сигнал...' : 'Готово к сканированию'}</Text>
        </View>

        <View style={styles.deviceSetupCard}>
          <Text style={styles.deviceSetupTitle}>Название подключенного сканера</Text>
          <Text style={styles.deviceSetupText}>
            Android уже держит bluetooth-соединение. Здесь мы сохраняем реальное имя устройства, чтобы
            экран работал как точка приема штрихкодов от HID-сканера.
          </Text>
          <TextInput
            style={styles.deviceNameInput}
            value={deviceNameInput}
            onChangeText={setDeviceNameInput}
            placeholder="Например, Netum C750 или Zebra DS2278"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
          <TouchableOpacity style={styles.connectButton} onPress={() => void handleConnectRemembered()}>
            <Text style={styles.connectButtonText}>Сохранить и подключить</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.devicesList}>
          {knownDevices.length ? (
            knownDevices.map((device) => (
              <View key={device.id} style={styles.deviceRow}>
                <View style={styles.deviceIcon}>
                  <Ionicons name="bluetooth-outline" size={20} color="#6B7280" />
                </View>

                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceMeta}>
                    {device.isRemembered ? 'Сохраненное устройство' : device.meta}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.connectButtonCompact}
                  onPress={() => void persistActiveDevice(device)}
                >
                  <Text style={styles.connectButtonText}>Выбрать</Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyDevicesState}>
              <Text style={styles.emptyDevicesTitle}>Список пока пуст</Text>
              <Text style={styles.emptyDevicesText}>
                После первого подключения мы сохраним ваш сканер здесь и будем использовать его как
                активное устройство.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.refreshGhostButton} onPress={() => void handleRefresh()}>
          <Ionicons name="refresh-outline" size={16} color="#6B7280" />
          <Text style={styles.refreshGhostText}>Обновить состояние сканера</Text>
        </TouchableOpacity>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="information-circle-outline" size={18} color="#54CCFF" />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Как это работает</Text>
            <Text style={styles.tipText}>
              Большинство bluetooth barcode scanner работают в режиме HID и отправляют символы как
              обычная клавиатура. Экран держит фокус на поле ввода, ловит быстрый поток символов,
              дожидается Enter или короткой паузы и сразу обрабатывает штрихкод.
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
    flexWrap: 'wrap',
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
  scanHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    marginBottom: 10,
  },
  scanInput: {
    fontSize: 15,
    color: '#2C3541',
    minHeight: 24,
  },
  lastScanText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: '#2F80ED',
  },
  primaryButton: {
    backgroundColor: '#D4F7E0FF',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#2C3541',
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
  deviceSetupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 14,
  },
  deviceSetupTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 6,
  },
  deviceSetupText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    marginBottom: 12,
  },
  deviceNameInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F9FAFB',
    fontSize: 15,
    color: '#2C3541',
    marginBottom: 12,
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
    backgroundColor: '#D4F7E0FF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  connectButtonCompact: {
    backgroundColor: '#D4F7E0FF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  connectButtonText: {
    color: '#2C3541',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyDevicesState: {
    padding: 18,
  },
  emptyDevicesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 6,
  },
  emptyDevicesText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
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
    backgroundColor: '#EFF9FF',
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
