import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { AppTopBar } from '@/components/AppTopBar';

type Product = {
  id: string;
  name: string;
  retailPrice?: number;
  image: string;
  barcode?: string;
  unit?: string;
};

type ArrivalRecord = {
  id: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

type SaleRecord = {
  id: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
};

type ProductWithStock = Product & {
  stockQuantity: number;
};

const LOW_STOCK_THRESHOLD = 5;
const FILTERS = ['Все', 'В наличии', 'Заканчиваются', 'Нет на складе'];

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [arrivals, setArrivals] = useState<ArrivalRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Все');
  const [productToDelete, setProductToDelete] = useState<ProductWithStock | null>(null);
  const router = useRouter();

  const loadData = async () => {
    const [savedProducts, savedArrivals, savedSales] = await Promise.all([
      AsyncStorage.getItem('products'),
      AsyncStorage.getItem('arrivals'),
      AsyncStorage.getItem('sales'),
    ]);

    setProducts(savedProducts ? JSON.parse(savedProducts) : []);
    setArrivals(savedArrivals ? JSON.parse(savedArrivals) : []);
    setSales(savedSales ? JSON.parse(savedSales) : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, []),
  );

  const productsWithStock = useMemo<ProductWithStock[]>(() => {
    const arrivalsMap = arrivals.reduce<Record<string, number>>((acc, arrival) => {
      arrival.items.forEach((item) => {
        acc[item.productId] = (acc[item.productId] || 0) + (Number(item.quantity) || 0);
      });
      return acc;
    }, {});

    const salesMap = sales.reduce<Record<string, number>>((acc, sale) => {
      sale.items.forEach((item) => {
        acc[item.productId] = (acc[item.productId] || 0) + (Number(item.quantity) || 0);
      });
      return acc;
    }, {});

    return products.map((product) => ({
      ...product,
      stockQuantity: Math.max(
        0,
        (arrivalsMap[product.id] || 0) - (salesMap[product.id] || 0),
      ),
    }));
  }, [arrivals, products, sales]);

  const handleDelete = async (id: string) => {
    const updated = products.filter((item) => item.id !== id);
    setProducts(updated);
    await AsyncStorage.setItem('products', JSON.stringify(updated));
  };

  const filtered = productsWithStock.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      (product.barcode || '').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'В наличии') return product.stockQuantity > 0;
    if (filter === 'Заканчиваются') {
      return product.stockQuantity > 0 && product.stockQuantity <= LOW_STOCK_THRESHOLD;
    }
    if (filter === 'Нет на складе') return product.stockQuantity <= 0;

    return true;
  });

  const renderItem = ({ item }: { item: ProductWithStock }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Image source={{ uri: item.image }} style={styles.image} />

        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>

          <View style={styles.barcodeRow}>
            <Ionicons name="barcode-outline" size={14} color="#6B7280" />
            <Text style={styles.barcode}>{item.barcode || '—'}</Text>
          </View>

          <View style={styles.stockRow}>
            <Text style={styles.stockLabel}>Остаток:</Text>
            <View
              style={[
                styles.stockBadge,
                item.stockQuantity <= 0 && styles.stockBadgeEmpty,
                item.stockQuantity > 0 &&
                  item.stockQuantity <= LOW_STOCK_THRESHOLD &&
                  styles.stockBadgeLow,
              ]}
            >
              <Text style={styles.stockValue}>
                {item.stockQuantity} {item.unit || 'шт'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.priceBlock}>
          <Text style={styles.priceLabel}>Цена:</Text>
          <Text style={styles.price}>{item.retailPrice ? `${item.retailPrice} ₸` : '—'}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/product-edit?id=${item.id}`)}
        >
          <Ionicons name="create-outline" size={16} color="#2C3541" />
          <Text style={styles.actionText}>Изменить</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setProductToDelete(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={[styles.actionText, styles.deleteActionText]}>Удалить</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppTopBar title="Товары" />

      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Поиск по названию или штрихкоду"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScroll}
      >
        {FILTERS.map((value) => (
          <TouchableOpacity
            key={value}
            style={[styles.filterButton, filter === value && styles.filterActive]}
            onPress={() => setFilter(value)}
          >
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Ionicons name="cube-outline" size={20} color="#54CCFF" />
          <View>
            <Text style={styles.statLabel}>Всего SKU</Text>
            <Text style={styles.statValue}>{products.length}</Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="archive-outline" size={20} color="#54CCFF" />
          <View>
            <Text style={styles.statLabel}>Всего на складе</Text>
            <Text style={styles.statValue}>
              {productsWithStock.reduce((sum, item) => sum + item.stockQuantity, 0)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listLabel}>Список позиций</Text>
        <Text style={styles.listCounter}>
          {filtered.length} из {productsWithStock.length}
        </Text>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Под выбранный фильтр товаров пока нет.</Text>
          }
        />
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => router.push('/product-edit')}>
        <Ionicons name="add" size={28} color="#2C3541" />
      </TouchableOpacity>

      <Modal
        visible={Boolean(productToDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setProductToDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="trash-outline" size={20} color="#EF5350" />
            </View>
            <Text style={styles.deleteModalTitle}>Удалить товар?</Text>
            <Text style={styles.deleteModalText}>
              {productToDelete
                ? `Товар "${productToDelete.name}" будет удален из списка товаров.`
                : 'Товар будет удален из списка товаров.'}
            </Text>

            <TouchableOpacity
              style={styles.deleteConfirmButton}
              onPress={async () => {
                if (productToDelete) {
                  await handleDelete(productToDelete.id);
                }
                setProductToDelete(null);
              }}
            >
              <Text style={styles.deleteConfirmText}>Удалить</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteCancelButton}
              onPress={() => setProductToDelete(null)}
            >
              <Text style={styles.deleteCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 14,
    color: '#2C3541',
    height: '100%',
  },
  filtersScroll: {
    paddingVertical: 4,
    paddingRight: 8,
    height: 40,
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    borderWidth: 1,
    justifyContent: 'center',
    borderColor: '#E5E7EB',
  },
  filterActive: {
    backgroundColor: '#D4F7E0',
    borderColor: '#D4F7E0',
  },
  filterText: {
    fontSize: 13,
    color: '#2C3541',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#2C3541',
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 10,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3541',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#171A1C',
  },
  listCounter: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContainer: {
    flex: 1,
    minHeight: 420,
  },
  listContent: {
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3541',
    marginBottom: 4,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  barcode: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  stockBadge: {
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  stockBadgeLow: {
    backgroundColor: '#FEF3C7',
  },
  stockBadgeEmpty: {
    backgroundColor: '#FEE2E2',
  },
  stockValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3541',
  },
  priceBlock: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#54CCFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3541',
  },
  deleteActionText: {
    color: '#EF4444',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#D4F7E0',
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 53, 65, 0.24)',
    justifyContent: 'center',
    padding: 20,
  },
  deleteModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  deleteModalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  deleteConfirmButton: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#EF5350',
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteCancelButton: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#F8FAFD',
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteCancelText: {
    color: '#2C3541',
    fontSize: 15,
    fontWeight: '600',
  },
});
