import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
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
import { Stack, useFocusEffect, useRouter } from 'expo-router';

type Product = {
  id: string;
  barcode: string;
  name: string;
  retailPrice?: number;
  unit?: string;
};

type SaleItem = {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  price: number;
  unit?: string;
};

type SaleDraft = {
  paymentMethod: 'cash' | 'qr' | 'card';
  note: string;
  items: SaleItem[];
};

const SALE_DRAFT_KEY = 'saleDraft';
const PAYMENT_OPTIONS: Array<{ key: SaleDraft['paymentMethod']; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'cash', label: 'Наличные', icon: 'cash-outline' },
  { key: 'qr', label: 'QR-Kaspi', icon: 'qr-code-outline' },
  { key: 'card', label: 'Карта', icon: 'card-outline' },
];

const createEmptyDraft = (): SaleDraft => ({
  paymentMethod: 'cash',
  note: '',
  items: [],
});

export default function SaleCreateScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<SaleDraft>(createEmptyDraft());
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogVisible, setCatalogVisible] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  const loadData = async () => {
    const [savedDraft, savedProducts] = await Promise.all([
      AsyncStorage.getItem(SALE_DRAFT_KEY),
      AsyncStorage.getItem('products'),
    ]);

    setDraft(savedDraft ? JSON.parse(savedDraft) : createEmptyDraft());
    setProducts(savedProducts ? JSON.parse(savedProducts) : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, []),
  );

  const persistDraft = async (nextDraft: SaleDraft) => {
    setDraft(nextDraft);
    await AsyncStorage.setItem(SALE_DRAFT_KEY, JSON.stringify(nextDraft));
  };

  const addProductToDraft = async (product: Product) => {
    const existingItem = draft.items.find((item) => item.productId === product.id);
    const nextItems = existingItem
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

    await persistDraft({ ...draft, items: nextItems });
  };

  const updateItemQuantity = async (productId: string, quantity: number) => {
    const normalized = Number.isNaN(quantity) ? 0 : Math.max(0, quantity);
    const nextItems =
      normalized === 0
        ? draft.items.filter((item) => item.productId !== productId)
        : draft.items.map((item) =>
            item.productId === productId ? { ...item, quantity: normalized } : item,
          );

    await persistDraft({ ...draft, items: nextItems });
  };

  const handleManualAdd = async () => {
    const normalized = manualBarcode.trim();
    if (!normalized) {
      Alert.alert('Введите штрихкод', 'Нужен штрихкод для поиска товара.');
      return;
    }

    const product = products.find((item) => item.barcode === normalized);
    setManualVisible(false);
    setManualBarcode('');

    if (!product) {
      Alert.alert('Товар не найден', 'Для продажи можно выбрать только товар из каталога.');
      return;
    }

    await addProductToDraft(product);
  };

  const totalAmount = useMemo(
    () => draft.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [draft.items],
  );

  const totalPositions = useMemo(
    () => draft.items.reduce((sum, item) => sum + item.quantity, 0),
    [draft.items],
  );

  const saveSale = async () => {
    if (!draft.items.length) {
      Alert.alert('Продажа пустая', 'Сначала добавьте хотя бы один товар.');
      return;
    }

    const savedSales = await AsyncStorage.getItem('sales');
    const sales = savedSales ? JSON.parse(savedSales) : [];

    const saleRecord = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      paymentMethod: draft.paymentMethod,
      note: draft.note,
      items: draft.items,
      totalAmount,
    };

    await AsyncStorage.setItem('sales', JSON.stringify([saleRecord, ...sales]));
    await AsyncStorage.removeItem(SALE_DRAFT_KEY);
    router.replace('/(tabs)/sales');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={24} color="#2C3541" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Новая продажа</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Итог</Text>
            <Text style={styles.summaryValue}>{totalAmount.toLocaleString('ru-RU')} ₸</Text>
          </View>
          <View style={styles.summaryRight}>
            <Text style={styles.summaryPositions}>{totalPositions} поз.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>СПОСОБ ОПЛАТЫ</Text>
        <View style={styles.paymentRow}>
          {PAYMENT_OPTIONS.map((option) => {
            const active = draft.paymentMethod === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.paymentChip, active && styles.paymentChipActive]}
                onPress={() => persistDraft({ ...draft, paymentMethod: option.key })}
              >
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={active ? '#FFFFFF' : '#2C3541'}
                />
                <Text style={[styles.paymentChipText, active && styles.paymentChipTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>ДОБАВИТЬ ТОВАР</Text>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push({ pathname: '/camera-scanner', params: { source: 'sale' } })}
        >
          <View style={styles.actionIcon}>
            <Ionicons name="scan-outline" size={20} color="#54CCFF" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Сканировать штрихкод</Text>
            <Text style={styles.actionDescription}>Добавить товар через камеру</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E96A3" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => setManualVisible(true)}>
          <View style={styles.actionIcon}>
            <Ionicons name="barcode-outline" size={20} color="#54CCFF" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Ввести штрихкод</Text>
            <Text style={styles.actionDescription}>Ручной поиск товара</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E96A3" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => setCatalogVisible(true)}>
          <View style={styles.actionIcon}>
            <Ionicons name="cube-outline" size={20} color="#54CCFF" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Выбрать из каталога</Text>
            <Text style={styles.actionDescription}>Добавить товар из существующего списка</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E96A3" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>СОСТАВ ПРОДАЖИ</Text>
        <View style={styles.itemsCard}>
          {draft.items.length ? (
            draft.items.map((item) => (
              <View key={item.productId} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.barcode || '—'} • {item.price} ₸ / {item.unit || 'шт'}
                  </Text>
                </View>
                <View style={styles.itemControls}>
                  <TouchableOpacity
                    style={styles.quantityControl}
                    onPress={() => updateItemQuantity(item.productId, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color="#2C3541" />
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityControl}
                    onPress={() => updateItemQuantity(item.productId, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color="#2C3541" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Пока нет товаров в продаже.</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>КОММЕНТАРИЙ</Text>
        <TextInput
          style={styles.noteInput}
          value={draft.note}
          onChangeText={(value) => persistDraft({ ...draft, note: value })}
          placeholder="Например, продажа по предзаказу"
          placeholderTextColor="#9CA3AF"
          multiline
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={saveSale}>
          <Text style={styles.primaryButtonText}>Сохранить продажу</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={catalogVisible} transparent animationType="fade" onRequestClose={() => setCatalogVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.catalogModal]}>
            <Text style={styles.modalTitle}>Каталог товаров</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {products.length ? (
                products.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.catalogItem}
                    onPress={async () => {
                      await addProductToDraft(product);
                      setCatalogVisible(false);
                    }}
                  >
                    <View>
                      <Text style={styles.catalogName}>{product.name}</Text>
                      <Text style={styles.catalogMeta}>
                        {product.barcode || '—'} • {product.retailPrice || 0} ₸
                      </Text>
                    </View>
                    <Ionicons name="add" size={18} color="#54CCFF" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>В каталоге пока нет товаров.</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setCatalogVisible(false)}>
              <Text style={styles.secondaryButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ввести штрихкод</Text>
            <TextInput
              style={styles.manualInput}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Например, 4870001234567"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              autoFocus
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleManualAdd}>
              <Text style={styles.primaryButtonText}>Добавить товар</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setManualVisible(false)}>
              <Text style={styles.secondaryButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF5',
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3541',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 6,
  },
  summaryValue: {
    color: '#2C3541',
    fontSize: 28,
    fontWeight: '800',
  },
  summaryRight: {
    backgroundColor: '#EFF6FF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryPositions: {
    color: '#2F80ED',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4B5563',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  paymentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  paymentChipActive: {
    backgroundColor: '#2F80ED',
    borderColor: '#2F80ED',
  },
  paymentChipText: {
    color: '#2C3541',
    fontWeight: '600',
    fontSize: 13,
  },
  paymentChipTextActive: {
    color: '#FFFFFF',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 14,
    marginBottom: 12,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EFF9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: '#8E96A3',
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 14,
    marginBottom: 18,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quantityControl: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityValue: {
    minWidth: 24,
    textAlign: 'center',
    fontWeight: '700',
    color: '#2C3541',
  },
  noteInput: {
    minHeight: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    padding: 14,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#2C3541',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EDF5',
  },
  primaryButton: {
    backgroundColor: '#2F80ED',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#2C3541',
    fontWeight: '600',
    fontSize: 15,
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
    padding: 18,
  },
  catalogModal: {
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 14,
  },
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  catalogName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 3,
  },
  catalogMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  manualInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F9FAFB',
    fontSize: 15,
    color: '#2C3541',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 13,
    paddingVertical: 10,
  },
});
