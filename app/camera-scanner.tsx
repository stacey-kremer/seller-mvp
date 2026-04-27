import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

type Product = {
  id: string;
  barcode: string;
  name: string;
  retailPrice?: number;
  quantity?: number;
  image?: string;
  type?: string;
  manufacturer?: string;
  unit?: string;
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

type SaleDraft = {
  paymentMethod: 'cash' | 'qr' | 'card';
  note: string;
  items: Array<{
    productId: string;
    name: string;
    barcode: string;
    quantity: number;
    price: number;
    unit?: string;
  }>;
};

const SHEET_HEIGHT = 420;
const SHEET_HIDDEN_OFFSET = SHEET_HEIGHT + 40;

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

export default function CameraScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [recognizedProduct, setRecognizedProduct] = useState<Product | null>(null);
  const [recognizedBarcode, setRecognizedBarcode] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [sheetMode, setSheetMode] = useState<'hidden' | 'info' | 'result'>('hidden');
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string }>();
  const translateY = useRef(new Animated.Value(SHEET_HIDDEN_OFFSET)).current;
  const sheetModeRef = useRef<'hidden' | 'info' | 'result'>('hidden');

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const helperSubtitle = useMemo(() => {
    if (params.source === 'arrival') return 'Сканер поставки';
    if (params.source === 'sale') return 'Сканер продажи';
    return 'Сканер товаров';
  }, [params.source]);

  const animateSheetTo = (toValue: number) => {
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      damping: 22,
      stiffness: 180,
      mass: 0.9,
    }).start();
  };

  const openInfoSheet = () => {
    setSheetMode('info');
    sheetModeRef.current = 'info';
    animateSheetTo(0);
  };

  const openResultSheet = () => {
    setSheetMode('result');
    sheetModeRef.current = 'result';
    animateSheetTo(0);
  };

  const closeSheet = () => {
    sheetModeRef.current = 'hidden';
    Animated.timing(translateY, {
      toValue: SHEET_HIDDEN_OFFSET,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setSheetMode('hidden');
      }
    });
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    setScanned(true);
    setRecognizedBarcode(data);

    const savedProducts = await AsyncStorage.getItem('products');
    const products: Product[] = savedProducts ? JSON.parse(savedProducts) : [];
    const product = products.find((item) => item.barcode === data) || null;

    setRecognizedProduct(product);
    setIsAvailable(Boolean(product));
    openResultSheet();
  };

  const handleConfirm = async () => {
    if (params.source === 'arrival') {
      if (recognizedProduct) {
        const savedDraft = await AsyncStorage.getItem('arrivalDraft');
        const draft: ArrivalDraft = savedDraft ? JSON.parse(savedDraft) : createArrivalDraft();

        const existingItem = draft.items.find((item) => item.productId === recognizedProduct.id);

        draft.items = existingItem
          ? draft.items.map((item) =>
              item.productId === recognizedProduct.id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            )
          : [
              {
                productId: recognizedProduct.id,
                barcode: recognizedProduct.barcode,
                name: recognizedProduct.name,
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
        params: { barcode: recognizedBarcode, fromArrival: 'true' },
      });
      return;
    }

    if (params.source === 'sale') {
      if (!recognizedProduct) {
        Alert.alert('Товар не найден', 'Для продажи можно выбрать только товар из каталога.');
        handleScanAgain();
        return;
      }

      const savedDraft = await AsyncStorage.getItem('saleDraft');
      const draft: SaleDraft = savedDraft ? JSON.parse(savedDraft) : createSaleDraft();

      const existingItem = draft.items.find((item) => item.productId === recognizedProduct.id);

      draft.items = existingItem
        ? draft.items.map((item) =>
            item.productId === recognizedProduct.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [
            {
              productId: recognizedProduct.id,
              name: recognizedProduct.name,
              barcode: recognizedProduct.barcode,
              quantity: 1,
              price: recognizedProduct.retailPrice || 0,
              unit: recognizedProduct.unit || 'шт',
            },
            ...draft.items,
          ];

      await AsyncStorage.setItem('saleDraft', JSON.stringify(draft));
      router.replace('/sale-create');
      return;
    }

    if (recognizedProduct) {
      router.replace(`/product-edit?id=${recognizedProduct.id}`);
      return;
    }

    router.replace({
      pathname: '/product-edit',
      params: { barcode: recognizedBarcode },
    });
  };

  const handleScanAgain = () => {
    setScanned(false);
    setRecognizedProduct(null);
    setRecognizedBarcode('');
    setIsAvailable(false);
    closeSheet();
  };

  const toggleInfo = () => {
    if (sheetModeRef.current === 'info') {
      closeSheet();
      return;
    }

    if (!scanned) {
      openInfoSheet();
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 0.9) {
            closeSheet();
            return;
          }

          if (sheetModeRef.current !== 'hidden') {
            animateSheetTo(0);
          }
        },
        onPanResponderTerminate: () => {
          if (sheetModeRef.current !== 'hidden') {
            animateSheetTo(0);
          }
        },
      }),
    [translateY],
  );

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={30} color="#2F80ED" />
          </View>
          <Text style={styles.permissionTitle}>Нужен доступ к камере</Text>
          <Text style={styles.permissionText}>
            Разрешите приложению доступ к камере, чтобы сканировать штрихкоды и QR-коды.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Разрешить доступ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.permissionSecondaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.permissionSecondaryText}>Вернуться назад</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusText =
    isAvailable ? 'В наличии' : params.source === 'sale' ? 'Нет в каталоге' : 'Новый товар';
  const statusStyle = isAvailable ? styles.statusAvailable : styles.statusMissing;
  const statusTextStyle = isAvailable ? styles.statusAvailableText : styles.statusMissingText;
  const productMeta = [recognizedProduct?.type, recognizedProduct?.manufacturer]
    .filter(Boolean)
    .join(' • ');

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.cameraArea}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchEnabled}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'datamatrix'],
          }}
        />

        <View style={styles.overlay}>
          <SafeAreaView style={styles.overlaySafeArea}>
            <View style={styles.floatingTopBar}>
              <TouchableOpacity style={styles.topIconButton} onPress={() => router.back()}>
                <Ionicons name="chevron-back" size={24} color="#2C3541" />
              </TouchableOpacity>

              <View style={styles.topBarTextWrap}>
                <Text style={styles.topBarTitle}>Сканер</Text>
                <Text style={styles.topBarSubtitle}>{helperSubtitle}</Text>
              </View>

              <View style={styles.topBarActions}>
                <TouchableOpacity
                  style={styles.topIconButton}
                  onPress={() => setTorchEnabled((current) => !current)}
                >
                  <Ionicons
                    name={torchEnabled ? 'flash' : 'flash-off-outline'}
                    size={20}
                    color={torchEnabled ? '#2F80ED' : '#2C3541'}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.topIconButton} onPress={toggleInfo}>
                  <Ionicons name="information-circle-outline" size={20} color="#2C3541" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            <View style={styles.crosshairHorizontal} />
            <View style={styles.crosshairVertical} />
          </View>
        </View>
      </View>

      {sheetMode !== 'hidden' ? (
        <Animated.View
          style={[styles.sheetOverlay, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            {sheetMode === 'result' ? (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Товар распознан</Text>
                  <View style={[styles.statusBadge, statusStyle]}>
                    <Ionicons
                      name={isAvailable ? 'checkmark' : 'add'}
                      size={14}
                      color={isAvailable ? '#2F80ED' : '#9A6700'}
                    />
                    <Text style={[styles.statusBadgeText, statusTextStyle]}>{statusText}</Text>
                  </View>
                </View>

                <View style={styles.barcodeCard}>
                  <View style={styles.barcodeIcon}>
                    <Ionicons name="barcode-outline" size={20} color="#2C3541" />
                  </View>
                  <View style={styles.barcodeInfo}>
                    <Text style={styles.barcodeLabel}>Распознанный штрихкод</Text>
                    <Text style={styles.barcodeValue}>{recognizedBarcode}</Text>
                  </View>
                </View>

                {recognizedProduct ? (
                  <View style={styles.productCard}>
                    {recognizedProduct.image ? (
                      <Image source={{ uri: recognizedProduct.image }} style={styles.productImage} />
                    ) : (
                      <View style={styles.productImageFallback}>
                        <Ionicons name="cube-outline" size={22} color="#54CCFF" />
                      </View>
                    )}

                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{recognizedProduct.name}</Text>
                      <Text style={styles.productMeta}>{productMeta || 'Товар из каталога'}</Text>
                      <View style={styles.productFooter}>
                        <Text style={styles.productPrice}>
                          {recognizedProduct.retailPrice
                            ? `${recognizedProduct.retailPrice} ₸`
                            : 'Цена не указана'}
                        </Text>
                        <Text style={styles.productStock}>
                          Остаток: {recognizedProduct.quantity || 0} {recognizedProduct.unit || 'шт'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.productCard}>
                    <View style={styles.productImageFallback}>
                      <Ionicons name="add-circle-outline" size={22} color="#54CCFF" />
                    </View>

                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>Товар не найден</Text>
                      <Text style={styles.productMeta}>
                        {params.source === 'sale'
                          ? 'Для продажи можно использовать только товар, который уже есть в каталоге.'
                          : 'После подтверждения откроется создание новой карточки товара.'}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.actionHint}>
                  <Ionicons name="sparkles-outline" size={15} color="#2F80ED" />
                  <Text style={styles.actionHintText}>
                    {isAvailable
                      ? params.source === 'sale'
                        ? 'Товар будет сразу добавлен в текущую продажу.'
                        : 'Товар будет сразу добавлен в текущую поставку.'
                      : params.source === 'sale'
                        ? 'Сначала добавьте этот товар в каталог, а затем возвращайтесь к продаже.'
                        : 'После сохранения товар попадет и в каталог, и в эту поставку.'}
                  </Text>
                </View>

                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>
                    {isAvailable
                      ? 'Подтвердить'
                      : params.source === 'sale'
                        ? 'Понятно'
                        : 'Создать товар'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.retryButton} onPress={handleScanAgain}>
                  <Ionicons name="refresh-outline" size={18} color="#2C3541" />
                  <Text style={styles.retryButtonText}>Повторить</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Готово к сканированию</Text>
                </View>

                <View style={styles.helperList}>
                  <View style={styles.helperItem}>
                    <View style={styles.helperIcon}>
                      <Ionicons name="scan-outline" size={16} color="#2F80ED" />
                    </View>
                    <Text style={styles.helperText}>
                      Наведите код целиком внутрь рамки и удерживайте телефон ровно 1-2 секунды.
                    </Text>
                  </View>

                  <View style={styles.helperItem}>
                    <View style={styles.helperIcon}>
                      <Ionicons name="sunny-outline" size={16} color="#2F80ED" />
                    </View>
                    <Text style={styles.helperText}>
                      Если штрихкод плохо читается, проверьте освещение или включите вспышку.
                    </Text>
                  </View>

                  <View style={styles.helperItem}>
                    <View style={styles.helperIcon}>
                      <Ionicons name="qr-code-outline" size={16} color="#2F80ED" />
                    </View>
                    <Text style={styles.helperText}>
                      Поддерживаются EAN-13, EAN-8, QR, Code 128 и DataMatrix.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlaySafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  permissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E7EDF5',
  },
  permissionIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C3541',
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#6B7280',
    marginBottom: 18,
  },
  permissionButton: {
    borderRadius: 14,
    backgroundColor: '#2F80ED',
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  permissionSecondaryButton: {
    borderRadius: 14,
    backgroundColor: '#F8FAFD',
    paddingVertical: 15,
    alignItems: 'center',
  },
  permissionSecondaryText: {
    color: '#2C3541',
    fontSize: 15,
    fontWeight: '600',
  },
  floatingTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  topBarTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  topBarSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 2,
  },
  cameraArea: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#EDF1F6',
  },
  topBarActions: {
    flexDirection: 'row',
    gap: 8,
  },
  scanFrame: {
    width: 232,
    height: 232,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: '#3B82F6',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  crosshairHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.85)',
  },
  crosshairVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.85)',
  },
  sheetOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomSheet: {
    minHeight: 230,
    maxHeight: SHEET_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 22,
  },
  sheetHandle: {
    width: 46,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 18,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C3541',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusAvailable: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusMissing: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusAvailableText: {
    color: '#2563EB',
  },
  statusMissingText: {
    color: '#9A6700',
  },
  barcodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  barcodeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  barcodeInfo: {
    flex: 1,
  },
  barcodeLabel: {
    fontSize: 11,
    color: '#8E96A3',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  barcodeValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3541',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  productImageFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 4,
  },
  productMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 17,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
  productStock: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  actionHintText: {
    flex: 1,
    marginLeft: 8,
    color: '#2F80ED',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2F80ED',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 12,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  retryButtonText: {
    color: '#2C3541',
    fontSize: 18,
    fontWeight: '600',
  },
  helperList: {
    gap: 10,
  },
  helperItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    borderRadius: 16,
    backgroundColor: '#F8FAFD',
    padding: 12,
  },
  helperIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EAF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  helperText: {
    flex: 1,
    color: '#526070',
    fontSize: 13,
    lineHeight: 19,
  },
});
