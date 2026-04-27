import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppTopBar } from '@/components/AppTopBar';

type Product = {
  id: string;
  barcode: string;
  name: string;
};

type ArrivalItem = {
  productId: string;
  barcode: string;
  name: string;
  quantity: number;
};

type ArrivalDraft = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  supplier: string;
  invoiceNumber: string;
  deliveryDate: string;
  note: string;
  items: ArrivalItem[];
};

type ArrivalRecord = Required<Pick<ArrivalDraft, 'id' | 'createdAt' | 'updatedAt'>> &
  Omit<ArrivalDraft, 'id' | 'createdAt' | 'updatedAt'>;

const ARRIVAL_DRAFT_KEY = 'arrivalDraft';
const ARRIVALS_KEY = 'arrivals';

const createEmptyDraft = (): ArrivalDraft => ({
  supplier: 'ООО "ОптТорг Сибирь"',
  invoiceNumber: '',
  deliveryDate: new Date().toISOString().slice(0, 10),
  note: '',
  items: [],
});

const formatDate = (value?: string) => {
  if (!value) return 'Без даты';
  return value;
};

export default function ArrivalReceiptScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<ArrivalDraft>(createEmptyDraft());
  const [arrivals, setArrivals] = useState<ArrivalRecord[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualVisible, setManualVisible] = useState(false);
  const [catalogVisible, setCatalogVisible] = useState(false);

  const totalItems = useMemo(
    () => draft.items.reduce((sum, item) => sum + item.quantity, 0),
    [draft.items],
  );

  const loadData = async () => {
    const [savedDraft, savedProducts, savedArrivals] = await Promise.all([
      AsyncStorage.getItem(ARRIVAL_DRAFT_KEY),
      AsyncStorage.getItem('products'),
      AsyncStorage.getItem(ARRIVALS_KEY),
    ]);

    setDraft(savedDraft ? JSON.parse(savedDraft) : createEmptyDraft());
    setCatalogProducts(savedProducts ? JSON.parse(savedProducts) : []);
    setArrivals(savedArrivals ? JSON.parse(savedArrivals) : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, []),
  );

  const persistDraft = async (nextDraft: ArrivalDraft) => {
    setDraft(nextDraft);
    await AsyncStorage.setItem(ARRIVAL_DRAFT_KEY, JSON.stringify(nextDraft));
  };

  const persistArrivals = async (nextArrivals: ArrivalRecord[]) => {
    setArrivals(nextArrivals);
    await AsyncStorage.setItem(ARRIVALS_KEY, JSON.stringify(nextArrivals));
  };

  const updateDraftField = async (field: keyof ArrivalDraft, value: string) => {
    const nextDraft = { ...draft, [field]: value };
    await persistDraft(nextDraft);
  };

  const addProductToDraft = async (product: Product) => {
    const existingItem = draft.items.find((item) => item.productId === product.id);
    const nextItems = existingItem
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

    await persistDraft({ ...draft, items: nextItems });
  };

  const updateItemQuantity = async (productId: string, quantity: number) => {
    const normalizedQuantity = Number.isNaN(quantity) ? 0 : Math.max(0, quantity);
    const nextItems =
      normalizedQuantity === 0
        ? draft.items.filter((item) => item.productId !== productId)
        : draft.items.map((item) =>
            item.productId === productId ? { ...item, quantity: normalizedQuantity } : item,
          );

    await persistDraft({ ...draft, items: nextItems });
  };

  const handleManualAdd = async () => {
    const normalized = manualBarcode.trim();
    if (!normalized) {
      Alert.alert('Введите штрихкод', 'Нужен штрихкод для поиска товара.');
      return;
    }

    const product = catalogProducts.find((item) => item.barcode === normalized);
    setManualVisible(false);
    setManualBarcode('');

    if (product) {
      await addProductToDraft(product);
      return;
    }

    router.push({
      pathname: '/product-edit',
      params: {
        barcode: normalized,
        fromArrival: 'true',
      },
    });
  };

  const buildRecordFromDraft = (): ArrivalRecord => {
    const now = new Date().toISOString();
    return {
      id: draft.id || Date.now().toString(),
      createdAt: draft.createdAt || now,
      updatedAt: now,
      supplier: draft.supplier,
      invoiceNumber: draft.invoiceNumber,
      deliveryDate: draft.deliveryDate,
      note: draft.note,
      items: draft.items,
    };
  };

  const saveArrival = async () => {
    if (!draft.items.length) {
      Alert.alert('Поставка пустая', 'Сначала добавьте хотя бы один товар в накладную.');
      return null;
    }

    if (draft.items.some((item) => !item.quantity || item.quantity <= 0)) {
      Alert.alert(
        'Проверьте количество',
        'У каждой позиции в накладной должно быть количество больше нуля.',
      );
      return null;
    }

    const record = buildRecordFromDraft();
    const exists = arrivals.some((item) => item.id === record.id);
    const nextArrivals = exists
      ? arrivals.map((item) => (item.id === record.id ? record : item))
      : [record, ...arrivals];

    await persistArrivals(nextArrivals);
    return record;
  };

  const handleFinalize = async () => {
    const record = await saveArrival();
    if (!record) return;

    await AsyncStorage.removeItem(ARRIVAL_DRAFT_KEY);
    setDraft(createEmptyDraft());
    Alert.alert(
      record.id === draft.id ? 'Изменения сохранены' : 'Приемка завершена',
      record.id === draft.id
        ? 'Накладная обновлена и сохранена в журнале поставок.'
        : 'Поставка сохранена в журнале.',
    );
  };

  const handleSaveDraft = async () => {
    await persistDraft(draft);
    Alert.alert('Черновик сохранен', 'Текущая поставка доступна для продолжения.');
  };

  const handleEditArrival = async (record: ArrivalRecord) => {
    await persistDraft(record);
    setDraft(record);
  };

  const handleCreateNew = async () => {
    const nextDraft = createEmptyDraft();
    await persistDraft(nextDraft);
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <AppTopBar title="Приемка" />
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleIcon}>
              <Ionicons name="cube-outline" size={20} color="#54CCFF" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.title}>
                {draft.id ? 'Редактирование поставки' : 'Новая поставка'}
              </Text>
              <Text style={styles.subtitle}>
                Все накладные хранятся в журнале ниже и доступны для редактирования
              </Text>
            </View>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              ID: {draft.invoiceNumber || draft.id || 'NEW'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.newArrivalButton} onPress={handleCreateNew}>
          <Ionicons name="add-circle-outline" size={18} color="#2C3541" />
          <Text style={styles.newArrivalButtonText}>Создать новую накладную</Text>
        </TouchableOpacity>

        <Text style={styles.sectionCaption}>ОСНОВНАЯ ИНФОРМАЦИЯ</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Поставщик</Text>
            <TextInput
              style={styles.input}
              value={draft.supplier}
              onChangeText={(value) => updateDraftField('supplier', value)}
              placeholder="Введите поставщика"
              placeholderTextColor="#8E96A3"
            />
          </View>

          <View style={styles.inlineFields}>
            <View style={[styles.field, styles.inlineField]}>
              <Text style={styles.label}>Дата завоза</Text>
              <TextInput
                style={styles.input}
                value={draft.deliveryDate}
                onChangeText={(value) => updateDraftField('deliveryDate', value)}
                placeholder="2026-04-25"
                placeholderTextColor="#8E96A3"
              />
            </View>
            <View style={[styles.field, styles.inlineField]}>
              <Text style={styles.label}>№ накладной</Text>
              <TextInput
                style={styles.input}
                value={draft.invoiceNumber}
                onChangeText={(value) => updateDraftField('invoiceNumber', value)}
                placeholder="000000"
                placeholderTextColor="#8E96A3"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Примечание</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={draft.note}
              onChangeText={(value) => updateDraftField('note', value)}
              placeholder="Добавьте комментарий к поставке..."
              placeholderTextColor="#8E96A3"
              multiline
            />
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionCaption}>СОСТАВ ПОСТАВКИ</Text>
          <Text style={styles.counter}>{totalItems} товаров</Text>
        </View>

        <View style={styles.tipCard}>
          <View style={styles.tipIcon}>
            <Ionicons name="information-circle-outline" size={18} color="#54CCFF" />
          </View>
          <Text style={styles.tipText}>
            Система автоматически распознает большинство форматов EAN-13, QR и
            DataMatrix. Убедитесь, что освещение достаточное.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() =>
            router.push({
              pathname: '/camera-scanner',
              params: { source: 'arrival' },
            })
          }
        >
          <View style={styles.actionIcon}>
            <Ionicons name="scan-outline" size={20} color="#54CCFF" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Сканировать штрихкод</Text>
            <Text style={styles.actionDescription}>
              Если товар есть на складе, он сразу попадет в накладную
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E96A3" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => setManualVisible(true)}>
          <View style={styles.actionIcon}>
            <Ionicons name="barcode-outline" size={20} color="#54CCFF" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Ввести штрихкод</Text>
            <Text style={styles.actionDescription}>
              Ручной ввод, если упаковка не читается камерой
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E96A3" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => setCatalogVisible(true)}>
          <View style={styles.actionIcon}>
            <Ionicons name="add-circle-outline" size={20} color="#54CCFF" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Добавить из каталога</Text>
            <Text style={styles.actionDescription}>
              Выбрать товар из уже заведенного ассортимента
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E96A3" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() =>
            router.push({
              pathname: '/scanner-connect',
              params: { source: 'arrival' },
            })
          }
        >
          <View style={styles.actionIcon}>
            <Ionicons name="bluetooth-outline" size={20} color="#54CCFF" />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>Физический сканер</Text>
            <Text style={styles.actionDescription}>
              Подключите Bluetooth или USB сканер к приложению
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#8E96A3" />
        </TouchableOpacity>

        <View style={styles.listCard}>
          {draft.items.length ? (
            draft.items.map((item) => (
              <View key={`${item.productId}-${item.barcode}`} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemBarcode}>{item.barcode || 'Без штрихкода'}</Text>
                </View>
                <View style={styles.itemControls}>
                  <TouchableOpacity
                    style={styles.quantityControl}
                    onPress={() => updateItemQuantity(item.productId, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color="#2C3541" />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={String(item.quantity)}
                    onChangeText={(value) =>
                      updateItemQuantity(item.productId, Number(value.replace(/\D/g, '')) || 0)
                    }
                    keyboardType="numeric"
                  />
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
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="clipboard-outline" size={24} color="#8E96A3" />
              </View>
              <Text style={styles.emptyTitle}>Список пуст</Text>
              <Text style={styles.emptyText}>
                Добавьте товары через сканирование или из каталога, чтобы собрать поставку.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionCaption}>ЖУРНАЛ ПОСТАВОК</Text>
          <Text style={styles.counter}>{arrivals.length} накладных</Text>
        </View>

        <View style={styles.historyCard}>
          {arrivals.length ? (
            arrivals.map((record) => (
              <TouchableOpacity
                key={record.id}
                style={styles.historyRow}
                onPress={() => handleEditArrival(record)}
              >
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTitle}>
                    {record.invoiceNumber ? `Накладная №${record.invoiceNumber}` : 'Без номера'}
                  </Text>
                  <Text style={styles.historySubtitle}>
                    {record.supplier} · {formatDate(record.deliveryDate)}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {record.items.reduce((sum, item) => sum + item.quantity, 0)} шт · обновлено{' '}
                    {formatDate(record.updatedAt?.slice(0, 10))}
                  </Text>
                </View>
                <View style={styles.historyActions}>
                  <View style={styles.historyBadge}>
                    <Text style={styles.historyBadgeText}>{record.items.length} поз.</Text>
                  </View>
                  <Ionicons name="create-outline" size={18} color="#54CCFF" />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>Сохраненные поставки появятся здесь после первой приемки.</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleFinalize}>
          <Text style={styles.primaryButtonText}>
            {draft.id ? 'Сохранить изменения' : 'Завершить приемку'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveDraft}>
          <Text style={styles.secondaryButtonText}>Сохранить черновик</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={manualVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ввести штрихкод</Text>
            <TextInput
              style={styles.input}
              value={manualBarcode}
              onChangeText={setManualBarcode}
              placeholder="Например, 4870001234567"
              placeholderTextColor="#8E96A3"
              keyboardType="numeric"
              autoFocus
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleManualAdd}>
              <Text style={styles.primaryButtonText}>Найти товар</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setManualVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={catalogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCatalogVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.catalogCard]}>
            <Text style={styles.modalTitle}>Каталог товаров</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {catalogProducts.length ? (
                catalogProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.catalogItem}
                    onPress={async () => {
                      await addProductToDraft(product);
                      setCatalogVisible(false);
                    }}
                  >
                    <View>
                      <Text style={styles.itemName}>{product.name}</Text>
                      <Text style={styles.itemBarcode}>
                        {product.barcode || 'Без штрихкода'}
                      </Text>
                    </View>
                    <Ionicons name="add" size={18} color="#54CCFF" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.emptyText}>В каталоге пока нет товаров.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setCatalogVisible(false)}
            >
              <Text style={styles.secondaryButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerTextWrap: {
    flex: 1,
  },
  titleIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#DFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C3541',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#8E96A3',
  },
  badge: {
    backgroundColor: '#D4F7E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: '#2C3541',
    fontSize: 12,
    fontWeight: '700',
  },
  newArrivalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 18,
    gap: 8,
  },
  newArrivalButtonText: {
    color: '#2C3541',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionCaption: {
    fontSize: 12,
    fontWeight: '800',
    color: '#54CCFF',
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  counter: {
    fontSize: 12,
    color: '#8E96A3',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#2C3541',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 8,
  },
  field: {
    marginBottom: 14,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 12,
  },
  inlineField: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E96A3',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#F9FAFB',
    fontSize: 15,
    color: '#2C3541',
  },
  noteInput: {
    minHeight: 92,
    textAlignVertical: 'top',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
    shadowColor: '#2C3541',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
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
    lineHeight: 17,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    minHeight: 180,
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
  },
  itemBarcode: {
    marginTop: 3,
    fontSize: 12,
    color: '#8E96A3',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityControl: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EFF9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    minWidth: 56,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
    color: '#2C3541',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#8E96A3',
    textAlign: 'center',
    lineHeight: 18,
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyInfo: {
    flex: 1,
    marginRight: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3541',
  },
  historySubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },
  historyMeta: {
    marginTop: 3,
    fontSize: 12,
    color: '#8E96A3',
  },
  historyActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  historyBadge: {
    backgroundColor: '#D4F7E0',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
    borderTopColor: '#E5E7EB',
  },
  primaryButton: {
    backgroundColor: '#D4F7E0',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#2C3541',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#2C3541',
    fontSize: 15,
    fontWeight: '600',
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
  catalogCard: {
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
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
});
