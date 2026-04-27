import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function ArrivalScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Оприходование</Text>

            <View style={styles.infoCard}>
                <View style={styles.iconCircle}>
                    <Ionicons name="cube-outline" size={36} color="#54CCFF" />
                </View>
                <Text style={styles.infoTitle}>Выберите способ</Text>
                <Text style={styles.infoText}>
                    Выберите наиболее удобный вариант для добавления товаров в систему
                </Text>
            </View>

            <Text style={styles.subtitle}>Выберите способ</Text>

            <TouchableOpacity 
            style={styles.option}
             onPress={() => router.push("/camera-scanner")}>
                <Ionicons name="camera-outline" size={22} color="#54CCFF" />
                <View>
                    <Text style={styles.optionTitle}>Камера телефона</Text>
                    <Text style={styles.optionDesc}>
                        Сканируйте штрихкод или QR через камеру устройства
                    </Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option}>
                <Ionicons name="create-outline" size={22} color="#54CCFF" />
                <View>
                    <Text style={styles.optionTitle}>Ручной ввод</Text>
                    <Text style={styles.optionDesc}>
                        Введите штрихкод или артикул товара вручную
                    </Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.option}>
                <Ionicons name="bluetooth-outline" size={22} color="#54CCFF" />
                <View>
                    <Text style={styles.optionTitle}>Физический сканер</Text>
                    <Text style={styles.optionDesc}>
                        Подключите Bluetooth или USB сканер к приложению
                    </Text>
                </View>
            </TouchableOpacity>
            <View style={styles.tipBox}>
                <Ionicons name="information-circle-outline" size={20} color="#54CCFF" />
                <Text style={styles.tipText}>
                    Система автоматически распознает большинство форматов EAN-13, QR и
                    DataMatrix. Убедитесь, что освещение достаточное.
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 16,
        paddingTop: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#2C3541",
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 20,
    },
    infoCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        alignItems: "center",
        paddingVertical: 30,
        paddingHorizontal: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: "#E0F2FE",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#2C3541",
        marginBottom: 6,
    },
    infoText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 20,
    },
    option: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
        gap: 12,
    },
    optionTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: "#2C3541",
    },
    optionDesc: {
        fontSize: 13,
        color: "#6B7280",
    },
    tipBox: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#F9FAFAFF",
        borderRadius: 10,
        padding: 14,
        marginTop: 16,
        gap: 10,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        color: "#2C3541",
        lineHeight: 18,
    },
});