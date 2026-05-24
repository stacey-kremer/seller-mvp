import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { AppTopBar } from '@/components/AppTopBar';

type SaleItem = {
  name: string;
  quantity: number;
  price: number;
};

type SaleRecord = {
  id: string;
  createdAt: string;
  items: SaleItem[];
  totalAmount: number;
};

type FinanceType = 'income' | 'refund' | 'payout';
type PeriodKey = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all';
type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest';

type FinanceTransaction = {
  id: string;
  date: string;
  type: FinanceType;
  title: string;
  subtitle: string;
  amount: number;
  balance: number;
};

const COLORS = {
  bg: '#F9FAFB',
  card: '#FFFFFF',
  text: '#2C3541',
  muted: '#8E96A3',
  border: '#E5E7EB',
  blue: '#54CCFF',
  blueSoft: '#EFF9FF',
  blueStrong: '#2F80ED',
  green: '#D4F7E0',
  red: '#EF4444',
};

const FILTERS: { key: FinanceType | 'all'; label: string }[] = [
  { key: 'all', label: 'Все операции' },
  { key: 'income', label: 'Доходы' },
  { key: 'refund', label: 'Возвраты' },
  { key: 'payout', label: 'Выплаты' },
];

const PERIOD_OPTIONS: { key: PeriodKey; label: string; description: string }[] = [
  { key: 'today', label: 'Сегодня', description: 'Только операции за текущий день' },
  { key: 'week', label: '7 дней', description: 'Последние семь дней' },
  { key: 'month', label: 'Месяц', description: 'Текущий календарный месяц' },
  { key: 'quarter', label: 'Квартал', description: 'Текущий квартал' },
  { key: 'year', label: 'Год', description: 'Текущий календарный год' },
  { key: 'all', label: 'Все время', description: 'Показать всю историю операций' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Сначала новые' },
  { key: 'oldest', label: 'Сначала старые' },
  { key: 'highest', label: 'По сумме: больше' },
  { key: 'lowest', label: 'По сумме: меньше' },
];

const FALLBACK_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: 'ID-1',
    date: '2026-05-24T10:15:00.000Z',
    type: 'income',
    title: 'Заказ #4521 (Оплата)',
    subtitle: 'Поступление',
    amount: 12500,
    balance: 245000,
  },
  {
    id: 'ID-2',
    date: '2026-05-24T11:40:00.000Z',
    type: 'refund',
    title: 'Возврат #4490',
    subtitle: 'Возврат',
    amount: -3200,
    balance: 232500,
  },
  {
    id: 'ID-3',
    date: '2026-05-23T14:20:00.000Z',
    type: 'income',
    title: 'Заказ #4518 (Оплата)',
    subtitle: 'Поступление',
    amount: 8900,
    balance: 235700,
  },
  {
    id: 'ID-4',
    date: '2026-05-23T17:05:00.000Z',
    type: 'income',
    title: 'Заказ #4515 (Оплата)',
    subtitle: 'Поступление',
    amount: 15000,
    balance: 226800,
  },
  {
    id: 'ID-5',
    date: '2026-05-22T09:10:00.000Z',
    type: 'payout',
    title: 'Вывод на карту',
    subtitle: 'Выплата',
    amount: -100000,
    balance: 211800,
  },
  {
    id: 'ID-6',
    date: '2026-05-22T19:25:00.000Z',
    type: 'income',
    title: 'Заказ #4510 (Оплата)',
    subtitle: 'Поступление',
    amount: 5400,
    balance: 311800,
  },
];

const typeMeta: Record<
  FinanceType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    amountColor: string;
  }
> = {
  income: {
    icon: 'arrow-up-outline',
    iconColor: COLORS.blueStrong,
    amountColor: COLORS.text,
  },
  refund: {
    icon: 'return-up-back-outline',
    iconColor: COLORS.red,
    amountColor: COLORS.red,
  },
  payout: {
    icon: 'arrow-down-outline',
    iconColor: COLORS.blueStrong,
    amountColor: COLORS.text,
  },
};

const formatMoney = (value: number) => `${value.toLocaleString('ru-RU')} ₸`;

const formatSignedMoney = (value: number) =>
  `${value > 0 ? '+' : ''}${value.toLocaleString('ru-RU')} ₸`;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

const getDateRange = (period: PeriodKey) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'all') return null;
  if (period === 'today') return { from: startOfToday, to: now };
  if (period === 'week') {
    const from = new Date(startOfToday);
    from.setDate(from.getDate() - 6);
    return { from, to: now };
  }
  if (period === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (period === 'quarter') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return { from: new Date(now.getFullYear(), quarterStartMonth, 1), to: now };
  }

  return { from: new Date(now.getFullYear(), 0, 1), to: now };
};

const getPeriodLabel = (period: PeriodKey) => {
  const option = PERIOD_OPTIONS.find((item) => item.key === period);
  return option?.label || 'Период';
};

export default function FinanceScreen() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [filter, setFilter] = useState<FinanceType | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('month');
  const [selectedSort, setSelectedSort] = useState<SortKey>('newest');
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [draftFilter, setDraftFilter] = useState<FinanceType | 'all'>('all');
  const [draftSort, setDraftSort] = useState<SortKey>('newest');

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

  const transactions = useMemo<FinanceTransaction[]>(() => {
    if (!sales.length) return FALLBACK_TRANSACTIONS;

    let runningBalance = 0;
    const orderedSales = [...sales].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    return orderedSales
      .map((sale, index) => {
        runningBalance += sale.totalAmount;
        const firstItem = sale.items[0];

        return {
          id: sale.id || `sale-${index}`,
          date: sale.createdAt,
          type: 'income',
          title: `Заказ #${String(sale.id).slice(-4)} (Оплата)`,
          subtitle: firstItem?.name ? `Поступление · ${firstItem.name}` : 'Поступление',
          amount: sale.totalAmount,
          balance: runningBalance,
        };
      })
      .reverse();
  }, [sales]);

  const filteredTransactions = useMemo(() => {
    const dateRange = getDateRange(selectedPeriod);

    let nextItems = transactions.filter((item) => {
      const matchesType = filter === 'all' ? true : item.type === filter;
      if (!matchesType) return false;

      if (!dateRange) return true;

      const itemDate = new Date(item.date).getTime();
      return itemDate >= dateRange.from.getTime() && itemDate <= dateRange.to.getTime();
    });

    nextItems = [...nextItems].sort((a, b) => {
      if (selectedSort === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (selectedSort === 'oldest') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (selectedSort === 'highest') {
        return Math.abs(b.amount) - Math.abs(a.amount);
      }
      return Math.abs(a.amount) - Math.abs(b.amount);
    });

    return nextItems;
  }, [filter, selectedPeriod, selectedSort, transactions]);

  const stats = useMemo(() => {
    const revenue = filteredTransactions
      .filter((item) => item.type === 'income')
      .reduce((sum, item) => sum + item.amount, 0);
    const refunds = filteredTransactions
      .filter((item) => item.type === 'refund')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);
    const payouts = filteredTransactions
      .filter((item) => item.type === 'payout')
      .reduce((sum, item) => sum + Math.abs(item.amount), 0);

    return { revenue, refunds, payouts };
  }, [filteredTransactions]);

  const activeFilterCount =
    (filter !== 'all' ? 1 : 0) +
    (selectedSort !== 'newest' ? 1 : 0) +
    (selectedPeriod !== 'month' ? 1 : 0);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppTopBar title="Финансы" />

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Итоги периода</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsRow}
        >
          <View style={[styles.metricCard, styles.revenueCard]}>
            <View style={[styles.metricIcon, { backgroundColor: COLORS.blueSoft }]}>
              <Ionicons name="trending-up-outline" size={16} color={COLORS.blue} />
            </View>
            <Text style={styles.metricLabel}>Выручка</Text>
            <Text style={styles.metricValue}>{formatMoney(stats.revenue)}</Text>
            <Text style={styles.metricDelta}>+12%</Text>
          </View>

          <View style={[styles.metricCard, styles.refundCard]}>
            <View style={[styles.metricIcon, { backgroundColor: '#FFF3F4' }]}>
              <Ionicons name="refresh-outline" size={16} color={COLORS.red} />
            </View>
            <Text style={[styles.metricLabel, { color: '#F87171' }]}>Возвраты</Text>
            <Text style={[styles.metricValue, { color: '#EF4444' }]}>
              {formatMoney(stats.refunds)}
            </Text>
            <Text style={[styles.metricDelta, { color: '#EF4444' }]}>-5%</Text>
          </View>

          <View style={[styles.metricCard, styles.payoutCard]}>
            <View style={[styles.metricIcon, { backgroundColor: COLORS.blueSoft }]}>
              <Ionicons name="arrow-down-outline" size={16} color={COLORS.blue} />
            </View>
            <Text style={[styles.metricLabel, { color: '#16A34A' }]}>Выплаты</Text>
            <Text style={[styles.metricValue, { color: '#166534' }]}>
              {formatMoney(stats.payouts)}
            </Text>
            <Text style={[styles.metricDelta, { color: '#16A34A' }]}>+3%</Text>
          </View>
        </ScrollView>

        <View style={styles.filtersWrap}>
          <TouchableOpacity
            style={styles.periodButton}
            onPress={() => setPeriodModalVisible(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={COLORS.text} />
            <Text style={styles.periodText}>{getPeriodLabel(selectedPeriod)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconFilterButton}
            onPress={() => {
              setDraftFilter(filter);
              setDraftSort(selectedSort);
              setFilterModalVisible(true);
            }}
          >
            <Ionicons name="filter-outline" size={18} color={COLORS.text} />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {FILTERS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, filter === item.key && styles.filterChipActive]}
              onPress={() => setFilter(item.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === item.key && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>История транзакций</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeadText, styles.dateColumn]}>Дата</Text>
          <Text style={[styles.tableHeadText, styles.descriptionColumn]}>Описание</Text>
          <Text style={[styles.tableHeadText, styles.amountColumn]}>Сумма / баланс</Text>
        </View>

        <View style={styles.listCard}>
          {filteredTransactions.map((item) => {
            const meta = typeMeta[item.type];

            return (
              <View key={item.id} style={styles.transactionRow}>
                <View style={styles.dateColumn}>
                  <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
                  <Text style={styles.transactionId}>{item.id}</Text>
                </View>

                <View style={styles.descriptionColumn}>
                  <Text style={styles.transactionTitle}>{item.title}</Text>
                  <View style={styles.subtitleRow}>
                    <Ionicons name={meta.icon} size={12} color={meta.iconColor} />
                    <Text style={styles.transactionSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.amountColumn}>
                  <Text style={[styles.transactionAmount, { color: meta.amountColor }]}>
                    {formatSignedMoney(item.amount)}
                  </Text>
                  <Text style={styles.transactionBalance}>{formatMoney(item.balance)}</Text>
                </View>
              </View>
            );
          })}

          {!filteredTransactions.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Нет операций под выбранные параметры</Text>
              <Text style={styles.emptyText}>
                Попробуйте изменить период или сбросить дополнительные фильтры.
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.loadMoreButton}>
          <Text style={styles.loadMoreText}>Загрузить ещё операции</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={periodModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPeriodModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Выбор периода</Text>
              <TouchableOpacity onPress={() => setPeriodModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {PERIOD_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.optionRow}
                onPress={() => {
                  setSelectedPeriod(item.key);
                  setPeriodModalVisible(false);
                }}
              >
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{item.label}</Text>
                  <Text style={styles.optionDescription}>{item.description}</Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    selectedPeriod === item.key && styles.radioOuterActive,
                  ]}
                >
                  {selectedPeriod === item.key ? <View style={styles.radioInner} /> : null}
                </View>
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.filterModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Фильтры и параметры</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionTitle}>Тип операции</Text>
            <View style={styles.choiceGrid}>
              {FILTERS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.choiceChip,
                    draftFilter === item.key && styles.choiceChipActive,
                  ]}
                  onPress={() => setDraftFilter(item.key)}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      draftFilter === item.key && styles.choiceChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalSectionTitle}>Сортировка</Text>
            <View style={styles.sortList}>
              {SORT_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.optionRow}
                  onPress={() => setDraftSort(item.key)}
                >
                  <Text style={styles.optionTitle}>{item.label}</Text>
                  <View
                    style={[
                      styles.radioOuter,
                      draftSort === item.key && styles.radioOuterActive,
                    ]}
                  >
                    {draftSort === item.key ? <View style={styles.radioInner} /> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setDraftFilter('all');
                  setDraftSort('newest');
                  setFilter('all');
                  setSelectedSort('newest');
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.resetButtonText}>Сбросить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setFilter(draftFilter);
                  setSelectedSort(draftSort);
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.applyButtonText}>Применить</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 0,
    paddingBottom: 120,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontWeight: '800',
    color: COLORS.muted,
  },
  cardsRow: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    gap: 12,
  },
  metricCard: {
    width: 162,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#1F2937',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  revenueCard: {
    backgroundColor: COLORS.blueSoft,
    borderColor: '#CBEFFF',
  },
  refundCard: {
    backgroundColor: '#FFF6F6',
    borderColor: '#FDE1E1',
  },
  payoutCard: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  metricLabel: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
  },
  metricDelta: {
    position: 'absolute',
    top: 18,
    right: 16,
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.blueStrong,
  },
  filtersWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  periodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  periodText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  iconFilterButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  tabsRow: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 10,
  },
  filterChip: {
    backgroundColor: COLORS.card,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  filterChipTextActive: {
    color: COLORS.text,
    fontWeight: '700',
  },
  historyHeader: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 22,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  tableHeadText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: COLORS.muted,
  },
  listCard: {
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  transactionRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateColumn: {
    width: 86,
  },
  descriptionColumn: {
    flex: 1,
    paddingRight: 10,
  },
  amountColumn: {
    width: 110,
    alignItems: 'flex-end',
  },
  transactionDate: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 6,
  },
  transactionId: {
    fontSize: 11,
    color: COLORS.muted,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  transactionSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  transactionBalance: {
    fontSize: 12,
    color: COLORS.muted,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 18,
  },
  loadMoreText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 53, 65, 0.24)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterModalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  optionTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  optionDescription: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
    lineHeight: 17,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: COLORS.blue,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.blue,
  },
  choiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  choiceChip: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceChipActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  choiceChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  choiceChipTextActive: {
    color: COLORS.text,
  },
  sortList: {
    marginBottom: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  resetButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  applyButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
});
