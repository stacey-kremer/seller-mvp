import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
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

type SaleItem = {
  productId: string;
  name: string;
  barcode: string;
  quantity: number;
  price: number;
  unit?: string;
};

type SaleRecord = {
  id: string;
  createdAt: string;
  paymentMethod: 'cash' | 'qr' | 'card';
  note: string;
  items: SaleItem[];
  totalAmount: number;
};

const PAYMENT_FILTERS: Array<{ key: 'all' | 'cash' | 'qr' | 'card'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'Сегодня', icon: 'calendar-outline' },
  { key: 'qr', label: 'QR-Kaspi', icon: 'qr-code-outline' },
  { key: 'card', label: 'Карта', icon: 'card-outline' },
  { key: 'cash', label: 'Наличные', icon: 'cash-outline' },
];

const paymentMeta: Record<SaleRecord['paymentMethod'], { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; color: string }> = {
  cash: { label: 'Наличные', icon: 'cash-outline', bg: '#ECFDF5', color: '#16A34A' },
  qr: { label: 'QR-Kaspi', icon: 'qr-code-outline', bg: '#EFF6FF', color: '#2F80ED' },
  card: { label: 'Карта', icon: 'card-outline', bg: '#F5F3FF', color: '#7C3AED' },
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export default function SalesScreen() {
  const router = useRouter();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'qr' | 'card'>('all');

  const loadSales = async () => {
    const saved = await AsyncStorage.getItem('sales');
    setSales(saved ? JSON.parse(saved) : []);
  };

  useEffect(() => {
    loadSales();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadSales();
    }, []),
  );

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesPayment = paymentFilter === 'all' ? true : sale.paymentMethod === paymentFilter;
      if (!matchesPayment) return false;

      const haystack = sale.items
        .map((item) => `${item.name} ${item.barcode}`)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search.toLowerCase());
    });
  }, [paymentFilter, sales, search]);

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalChecks = filteredSales.length;

  const renderSale = ({ item }: { item: SaleRecord }) => {
    const firstItem = item.items[0];
    const meta = paymentMeta[item.paymentMethod];
    const positionCount = item.items.reduce((sum, saleItem) => sum + saleItem.quantity, 0);

    return (
      <View style={styles.saleCard}>
        <View style={styles.saleTop}>
          <View style={styles.saleMain}>
            <View style={styles.barcodeRow}>
              <Ionicons name="barcode-outline" size={12} color="#6B7280" />
              <Text style={styles.barcodeText}>{firstItem?.barcode || '—'}</Text>
            </View>
            <Text style={styles.saleName}>{firstItem?.name || 'Продажа'}</Text>
            <Text style={styles.saleMeta}>
              {positionCount} {firstItem?.unit || 'шт'} × {firstItem?.price || 0} ₸
              {item.items.length > 1 ? ` • +${item.items.length - 1} поз.` : ''}
            </Text>
            <Text style={styles.saleDate}>Сегодня, {formatTime(item.createdAt)}</Text>
          </View>

          <View style={styles.saleRight}>
            <View style={[styles.paymentBadge, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={16} color={meta.color} />
            </View>
            <Text style={styles.saleAmount}>{item.totalAmount} ₸</Text>
            <Text style={styles.saleDetails}>Детали</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppTopBar title="Продажи" />

      {sales.length ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="trending-up-outline" size={18} color="#2F80ED" />
              </View>
              <Text style={styles.statLabel}>Выручка</Text>
              <Text style={styles.statValue}>{totalRevenue.toLocaleString('ru-RU')} ₸</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="receipt-outline" size={18} color="#2F80ED" />
              </View>
              <Text style={styles.statLabel}>Чеки</Text>
              <Text style={styles.statValue}>{totalChecks}</Text>
            </View>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Поиск по штрихкоду или названию"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
            />
            <View style={styles.searchAction}>
              <Ionicons name="barcode-outline" size={16} color="#2F80ED" />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {PAYMENT_FILTERS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.paymentFilterChip,
                  paymentFilter === item.key && styles.paymentFilterChipActive,
                ]}
                onPress={() => setPaymentFilter(item.key)}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={paymentFilter === item.key ? '#FFFFFF' : '#2C3541'}
                />
                <Text
                  style={[
                    styles.paymentFilterText,
                    paymentFilter === item.key && styles.paymentFilterTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Последние транзакции</Text>
            <Text style={styles.listCounter}>{filteredSales.length} позиции</Text>
          </View>

          <FlatList
            data={filteredSales}
            keyExtractor={(item) => item.id}
            renderItem={renderSale}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Под выбранный фильтр продаж пока нет.</Text>
            }
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={28} color="#54CCFF" />
          </View>
          <Text style={styles.emptyTitle}>Продаж пока нет</Text>
          <Text style={styles.emptyDescription}>
            Создайте первую продажу через сканирование или выбор товара из каталога.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/sale-create')}>
        <Ionicons name="add" size={28} color="#2C3541" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F7FB',
    paddingHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 30,
    fontWeight: '800',
    color: '#2C3541',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: '#2C3541',
  },
  searchAction: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersRow: {
    paddingBottom: 6,
    gap: 8,
    marginBottom: 10,
  },
  paymentFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8EDF5',
  },
  paymentFilterChipActive: {
    backgroundColor: '#2F80ED',
    borderColor: '#2F80ED',
  },
  paymentFilterText: {
    color: '#2C3541',
    fontSize: 13,
    fontWeight: '600',
  },
  paymentFilterTextActive: {
    color: '#FFFFFF',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3541',
  },
  listCounter: {
    fontSize: 12,
    color: '#8E96A3',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 120,
  },
  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EDF5',
    marginBottom: 12,
  },
  saleTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  saleMain: {
    flex: 1,
    marginRight: 12,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  barcodeText: {
    marginLeft: 4,
    color: '#6B7280',
    fontSize: 12,
  },
  saleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 6,
  },
  saleMeta: {
    color: '#6B7280',
    fontSize: 13,
    marginBottom: 4,
  },
  saleDate: {
    color: '#8E96A3',
    fontSize: 12,
  },
  saleRight: {
    alignItems: 'flex-end',
  },
  paymentBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  saleAmount: {
    color: '#2F80ED',
    fontSize: 18,
    fontWeight: '800',
  },
  saleDetails: {
    color: '#8E96A3',
    fontSize: 12,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#EAF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 21,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 20,
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4F7E0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
