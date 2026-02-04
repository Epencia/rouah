import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlobalContext } from "../global/GlobalState";

const API_URL = "https://rouah.net/api/liste-licence.php";

export default function Licences({navigation}) {
  const [user] = useContext(GlobalContext);

  const [licences, setLicences] = useState([]);
  const [filteredLicences, setFilteredLicences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [form, setForm] = useState({
    formule: "Standard",
    date_debut: "",
    duree: "",
    utilisateur_id: user?.matricule ?? "",
  });

  const maxDateFin = licences.length
  ? licences
      .map((l) => new Date(l.date_fin))
      .reduce((a, b) => (a > b ? a : b), new Date())
  : new Date();


  const minDate = new Date();
if (maxDateFin > minDate) minDate.setTime(maxDateFin.getTime());



  // Remplir utilisateur_id si user arrive plus tard
  useEffect(() => {
    if (user?.matricule) {
      setForm((p) => ({ ...p, utilisateur_id: user.matricule }));
    }
  }, [user]);

  const fetchLicences = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.success) {
        setLicences(data.licences);
        setFilteredLicences(data.licences);
      } else {
        setLicences([]);
        setFilteredLicences([]);
      }
    } catch (err) {
      Alert.alert("Erreur", "Impossible de charger les licences");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLicences();
  }, []);

  const addLicence = async () => {
    const newForm = {
      ...form,
      utilisateur_id: user?.matricule || "",
      prix_licence: "2000",
    };

    if (!newForm.date_debut || !newForm.duree || !newForm.utilisateur_id) {
      Alert.alert("Erreur", "Tous les champs sont obligatoires");
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newForm),
      });
      const data = await res.json();
      if (!data.success) {
  if (data.code === 'solde_insuffisant') {
    Alert.alert("⚠️ Solde insuffisant", "Veuillez recharger votre compte.", [
      { text: "OK", onPress: () => navigation.navigate("Paiement UVE") }
    ]);
  } else {
    Alert.alert("Erreur", data.message);
  }
  return;
}

    // ✅ Si tout est ok
    Alert.alert("✅ Succès", data.message, [
      {
        text: "OK",
        onPress: () => {
          setModalVisible(false);       // fermer le modal
          fetchLicences();              // recharger les licences
          setForm({                      // réinitialiser le formulaire
            formule: "Standard",
            date_debut: "",
            duree: "",
            utilisateur_id: user?.matricule || "",
          });
        },
      },
    ]);
  } catch (err) {
    Alert.alert("Erreur", "Problème de connexion serveur");
  }
};

  const searchFilter = (text) => {
    setSearch(text);
    if (text.trim() === "") {
      setFilteredLicences(licences);
    } else {
      const filtered = licences.filter((item) =>
        (item.formule || "").toLowerCase().includes(text.toLowerCase())
      );
      setFilteredLicences(filtered);
    }
  };

  // Utils
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date)) return dateStr;
    // Format JJ-MM-AAAA
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const getDateFin = (dateDebut, dureeMois) => {
    if (!dateDebut || !dureeMois) return "-";
    const d = new Date(dateDebut);
    d.setMonth(d.getMonth() + parseInt(dureeMois, 10));
    return formatDate(d.toISOString().split("T")[0]);
  };

  const formatPrice = (price) => {
    if (!price) return "-";
    const num = parseInt(price, 10) || 0;
    // remplace les virgules par espace comme séparateur de milliers FR
    return num.toLocaleString("fr-FR");
  };

  const SkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonLineShort} />
      <View style={styles.skeletonLineLong} />
      <View style={styles.skeletonLineMedium} />
    </View>
  );

  const renderItem = ({ item }) => {
    const borderColor = item.etat_licence === "Actif" ? "#28a745" : "#fa4447";
    return (
      <View style={[styles.cardContainer, { borderColor }]}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="shield-account" size={22} color="#000" />
            </View>
            <Text style={styles.titre}>{item.formule || "Standard"}</Text>
          </View>

          <Text style={styles.dataText}>
            💰 Prix : <Text style={styles.bold}>{formatPrice(item.prix_licence)} F</Text>
          </Text>

          <Text style={styles.dataText}>
            📅 Début : <Text style={styles.bold}>{formatDate(item.date_debut)}</Text>
          </Text>

          <Text style={styles.dataText}>
            🗓️ Fin : <Text style={styles.bold}>{getDateFin(item.date_debut, item.duree)}</Text>
          </Text>

          <Text style={styles.dataText}>
            ⏱️ Durée : <Text style={styles.bold}>{item.duree} mois</Text>
          </Text>

          <Text style={[styles.etat, { color: borderColor }]}>⚙️ {item.etat_licence}</Text>
        </View>
      </View>
    );
  };

  return (
<SafeAreaView style={{ flex: 1, backgroundColor: "#f5f6fa" }} edges={['left', 'right']}>
        <View style={styles.container}>
        <TextInput
          placeholder="🔍 Rechercher une licence..."
          placeholderTextColor="#888"
          style={styles.searchInput}
          value={search}
          onChangeText={searchFilter}
        />

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <FlatList
            data={filteredLicences}
            keyExtractor={(item) => item.code_licence}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Payer une licence</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nouvelle Licence</Text>

            <TextInput style={[styles.input, { backgroundColor: "#eee" }]} value={form.formule} editable={false} />

            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text>{form.date_debut ? `Date : ${form.date_debut}` : "📅 Sélectionner la date de début"}</Text>
            </TouchableOpacity>

           {showDatePicker && (
  <DateTimePicker
    value={new Date()}
    minimumDate={minDate}  // <-- ici la restriction
    mode="date"
    display={Platform.OS === "ios" ? "spinner" : "default"}
    onChange={(event, date) => {
      setShowDatePicker(false);
      if (date) {
        const iso = date.toISOString().split("T")[0];
        setForm((p) => ({ ...p, date_debut: iso }));
      }
    }}
  />
)}


            <TextInput placeholder="Durée (en mois)" style={styles.input} value={form.duree} keyboardType="numeric" onChangeText={(v) => setForm((p) => ({ ...p, duree: v }))} />

            <Text style={styles.fixedPrice}>💰 Prix : 2 000 F (fixe)</Text>

            <TouchableOpacity style={styles.saveBtn} onPress={addLicence}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Enregistrer</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: "red", marginTop: 10 }}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
 container: { 
    flex: 1, 
    paddingHorizontal: 16,
    paddingTop: 12, // Réduit l'espace au-dessus
  },
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
    marginTop:0
  },

  // Card wrapper avec bordure colorée
  cardContainer: {
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden", // pour que le contenu suive le rayon
  },

  // intérieur blanc
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    elevation: 3,
    borderColor: "#eee",
    borderWidth: 1,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff1f5",
    marginRight: 12,
  },
  titre: { fontSize: 18, fontWeight: "bold", color: "#414d63" },
  dataText: { color: "#333", fontSize: 14, marginBottom: 4 },
  bold: { fontWeight: "bold", color: "#000" },
  etat: { fontWeight: "bold", marginTop: 6 },

  addButton: {
    backgroundColor: "#fa4447",
    padding: 14,
    borderRadius: 30,
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    paddingHorizontal: 30,
    elevation: 6,
  },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  modalContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.4)" },
  modalBox: { backgroundColor: "#fff", padding: 20, borderRadius: 15, width: "85%", elevation: 6 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "center", color: "#fa4447" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 10 },
  fixedPrice: { textAlign: "center", fontWeight: "bold", marginBottom: 10, color: "#414d63" },
  saveBtn: { backgroundColor: "#414d63", padding: 12, borderRadius: 8, alignItems: "center" },

  skeletonCard: { backgroundColor: "#e0e0e0", padding: 16, borderRadius: 10, marginBottom: 10 },
  skeletonLineShort: { width: "40%", height: 10, backgroundColor: "#ccc", borderRadius: 4, marginBottom: 8 },
  skeletonLineLong: { width: "80%", height: 10, backgroundColor: "#ccc", borderRadius: 4, marginBottom: 8 },
  skeletonLineMedium: { width: "60%", height: 10, backgroundColor: "#ccc", borderRadius: 4 },
});
