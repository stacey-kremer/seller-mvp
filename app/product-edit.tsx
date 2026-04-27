import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

type Product = {
  id: string;
  barcode: string;
  name: string;
  type: string;
  manufacturer: string;
  supplier: string;
  unit: string;
  retailPrice: number;
  quantity: number;
  purchasePrice: number;
  arrivalDate: string;
  note: string;
  image: string;
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

const PRODUCT_TYPES = [
  'Овощи и фрукты',
  'Молочная продукция',
  'Мясо и птица',
  'Напитки',
  'Бакалея',
  'Сладости',
  'Заморозка',
  'Хозяйственные товары',
];

const UNIT_OPTIONS = [
  { value: 'кг', label: 'кг' },
  { value: 'шт', label: 'шт' },
  { value: 'литр', label: 'литр' },
];

const createProduct = (): Product => ({
  id: Date.now().toString(),
  barcode: '',
  name: '',
  type: '',
  manufacturer: '',
  supplier: '',
  unit: 'шт',
  retailPrice: 0,
  quantity: 0,
  purchasePrice: 0,
  arrivalDate: '',
  note: '',
  image: '',
});

export default function ProductEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    barcode?: string;
    fromArrival?: string;
  }>();
  const [product, setProduct] = useState<Product>(createProduct());
  const [isEditing, setIsEditing] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; retailPrice?: string }>({});

  useEffect(() => {
    const loadProduct = async () => {
      if (typeof params.id !== 'string' || !params.id.length) {
        setIsEditing(false);
        if (typeof params.barcode === 'string' && params.barcode.length) {
          setProduct((current) => ({ ...current, barcode: params.barcode ?? '' }));
        }
        return;
      }

      const saved = await AsyncStorage.getItem('products');
      const list: Product[] = saved ? JSON.parse(saved) : [];
      const existingProduct = list.find((item) => item.id === params.id);

      if (existingProduct) {
        setProduct(existingProduct);
        setIsEditing(true);
        return;
      }

      setIsEditing(false);
    };

    loadProduct();
  }, [params.id, params.barcode]);

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setProduct({ ...product, image: result.assets[0].uri });
    }
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setProduct({ ...product, image: result.assets[0].uri });
    }
  };

  const handlePickImage = () => {
    Alert.alert('Загрузка фото', 'Выберите источник изображения', [
      { text: 'Камера', onPress: handleTakePhoto },
      { text: 'Галерея', onPress: handlePickFromGallery },
      { text: 'Отмена', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    const nextErrors: { name?: string; retailPrice?: string } = {};
    const trimmedName = product.name.trim();

    if (!trimmedName) {
      nextErrors.name = 'Укажите наименование товара';
    }

    if (!product.retailPrice || product.retailPrice <= 0) {
      nextErrors.retailPrice = 'Укажите рекомендованную цену';
    }

    if (nextErrors.name || nextErrors.retailPrice) {
      setErrors(nextErrors);
      return;
    }

    const normalizedProduct = {
      ...product,
      name: trimmedName,
    };

    const saved = await AsyncStorage.getItem('products');
    const list: Product[] = saved ? JSON.parse(saved) : [];

    const nextList = isEditing
      ? list.map((item) => (item.id === normalizedProduct.id ? normalizedProduct : item))
      : [...list, normalizedProduct];

    await AsyncStorage.setItem('products', JSON.stringify(nextList));

    if (params.fromArrival === 'true' && !isEditing) {
      const savedDraft = await AsyncStorage.getItem('arrivalDraft');
      const draft: ArrivalDraft = savedDraft
        ? JSON.parse(savedDraft)
        : {
            supplier: normalizedProduct.supplier || 'ООО "ОптТорг Сибирь"',
            invoiceNumber: '',
            deliveryDate: new Date().toISOString().slice(0, 10),
            note: '',
            items: [],
          };

      draft.items = [
        {
          productId: normalizedProduct.id,
          barcode: normalizedProduct.barcode,
          name: normalizedProduct.name,
          quantity: 1,
        },
        ...(draft.items || []),
      ];

      await AsyncStorage.setItem('arrivalDraft', JSON.stringify(draft));
      router.replace('/(tabs)/arrival');
      return;
    }

    router.replace('/(tabs)/products');
  };

  const handleDelete = async () => {
    const saved = await AsyncStorage.getItem('products');
    const list: Product[] = saved ? JSON.parse(saved) : [];
    const nextList = list.filter((item) => item.id !== product.id);
    await AsyncStorage.setItem('products', JSON.stringify(nextList));
    router.replace('/(tabs)/products');
  };

  const renderInputField = (
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
    value: string,
    onChangeText: (value: string) => void,
    placeholder: string,
    error?: string,
  ) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWithIcon, error && styles.inputError]}>
        <Ionicons name={icon} size={18} color="#6B7280" style={styles.inputIcon} />
        <TextInput
          style={styles.inputInner}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#2C3541" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditing
            ? 'Редактирование товара'
            : params.fromArrival === 'true'
              ? 'Новый товар для поставки'
              : 'Создание товара'}
        </Text>
      </View>

      <View style={styles.barcodeCard}>
        <View style={styles.barcodeContent}>
          <Text style={styles.barcodeLabel}>Штрихкод</Text>
          <TextInput
            style={styles.barcodeInput}
            value={product.barcode}
            onChangeText={(value) => setProduct({ ...product, barcode: value })}
            placeholder="Введите штрихкод"
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity
          style={styles.barcodeButton}
          onPress={() =>
            router.push({
              pathname: '/camera-scanner',
              params: params.fromArrival === 'true' ? { source: 'arrival' } : {},
            })
          }
        >
          <Ionicons name="barcode-outline" size={28} color="#2F80ED" />
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Тип товара</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setTypeModalVisible(true)}>
          <View style={styles.dropdownLeft}>
            <Ionicons name="pricetag-outline" size={18} color="#6B7280" />
            <Text style={styles.dropdownText}>{product.type || 'Выберите тип'}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {renderInputField(
        'Наименование',
        'cube-outline',
        product.name,
        (value) => {
          setProduct({ ...product, name: value });
          if (errors.name) {
            setErrors((current) => ({ ...current, name: undefined }));
          }
        },
        'Введите название товара',
        errors.name,
      )}

      {renderInputField(
        'Производитель',
        'business-outline',
        product.manufacturer,
        (value) => setProduct({ ...product, manufacturer: value }),
        'Введите производителя',
      )}

      {renderInputField(
        'Поставщик',
        'car-outline',
        product.supplier,
        (value) => setProduct({ ...product, supplier: value }),
        'Введите поставщика',
      )}

      <View style={styles.inventorySection}>
        <View style={styles.inventoryHeader}>
          <Ionicons name="layers-outline" size={16} color="#2F80ED" />
          <Text style={styles.inventoryTitle}>Учет и наличие</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Единица измерения</Text>
          <View style={styles.segmentedControl}>
            {UNIT_OPTIONS.map((unit) => {
              const active = product.unit === unit.value;
              return (
                <TouchableOpacity
                  key={unit.value}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={() => setProduct({ ...product, unit: unit.value })}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {unit.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Рекомендованная цена</Text>
        <View style={[styles.inputWithIcon, errors.retailPrice && styles.inputError]}>
          <Ionicons name="cash-outline" size={18} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.inputInner}
            value={product.retailPrice ? String(product.retailPrice) : ''}
            onChangeText={(value) => {
              setProduct({ ...product, retailPrice: Number(value) || 0 });
              if (errors.retailPrice) {
                setErrors((current) => ({ ...current, retailPrice: undefined }));
              }
            }}
            keyboardType="numeric"
            placeholder="Введите цену"
            placeholderTextColor="#9CA3AF"
          />
        </View>
        {errors.retailPrice ? <Text style={styles.errorText}>{errors.retailPrice}</Text> : null}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Фотография товара</Text>
        {product.image ? <Image source={{ uri: product.image }} style={styles.image} /> : null}
        <TouchableOpacity style={styles.photoBox} onPress={handlePickImage}>
          <Ionicons name="camera-outline" size={22} color="#6B7280" />
          <Text style={styles.photoText}>Добавить фото</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Примечание</Text>
        <TextInput
          style={[styles.textarea]}
          multiline
          value={product.note}
          onChangeText={(value) => setProduct({ ...product, note: value })}
          placeholder="Введите примечание"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>
          {isEditing
            ? 'Сохранить изменения'
            : params.fromArrival === 'true'
              ? 'Сохранить и добавить в поставку'
              : 'Сохранить и открыть карточку'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() =>
          router.replace(params.fromArrival === 'true' ? '/(tabs)/arrival' : '/(tabs)/products')
        }
      >
        <Text style={styles.cancelText}>Отмена</Text>
      </TouchableOpacity>

      {isEditing ? (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Ionicons name="trash-outline" size={18} color="#EF5350" />
          <Text style={styles.deleteText}>Удалить товар</Text>
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={typeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Выберите тип товара</Text>
            {PRODUCT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={styles.typeOption}
                onPress={() => {
                  setProduct({ ...product, type });
                  setTypeModalVisible(false);
                }}
              >
                <Text style={styles.typeOptionText}>{type}</Text>
                {product.type === type ? (
                  <Ionicons name="checkmark" size={18} color="#54CCFF" />
                ) : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setTypeModalVisible(false)}
            >
              <Text style={styles.cancelText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="trash-outline" size={20} color="#EF5350" />
            </View>
            <Text style={styles.deleteModalTitle}>Удалить товар?</Text>
            <Text style={styles.deleteModalText}>
              Товар будет удален из списка товаров без возможности восстановления.
            </Text>

            <TouchableOpacity
              style={styles.deleteConfirmButton}
              onPress={async () => {
                setDeleteModalVisible(false);
                await handleDelete();
              }}
            >
              <Text style={styles.deleteConfirmText}>Удалить</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteCancelButton}
              onPress={() => setDeleteModalVisible(false)}
            >
              <Text style={styles.deleteCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3541',
    marginLeft: 10,
  },
  barcodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#CFE5FF',
    borderStyle: 'dashed',
    padding: 16,
    marginBottom: 22,
  },
  barcodeContent: {
    flex: 1,
    marginRight: 14,
  },
  barcodeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  barcodeInput: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C3541',
    paddingVertical: 0,
  },
  barcodeButton: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    color: '#2C3541',
    marginBottom: 6,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 52,
  },
  inputInner: {
    flex: 1,
    fontSize: 15,
    color: '#2C3541',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
    marginLeft: 2,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  dropdownText: {
    color: '#2C3541',
    fontSize: 15,
    marginLeft: 10,
  },
  inventorySection: {
    marginBottom: 18,
  },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  inventoryTitle: {
    marginLeft: 8,
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '700',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  segmentText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'lowercase',
  },
  segmentTextActive: {
    color: '#2F80ED',
    fontWeight: '700',
  },
  photoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
  },
  photoText: {
    marginLeft: 8,
    color: '#6B7280',
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginTop: 10,
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#2C3541',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#D4F7E0',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveText: {
    color: '#2C3541',
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
  },
  cancelText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#F5B5B3',
    backgroundColor: '#FFF1F0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  deleteText: {
    marginLeft: 8,
    color: '#EF5350',
    fontSize: 15,
    fontWeight: '700',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3541',
    marginBottom: 12,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  typeOptionText: {
    fontSize: 15,
    color: '#2C3541',
  },
});
