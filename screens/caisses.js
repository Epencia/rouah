import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,Dimensions,
  TouchableOpacity,
  Modal,Alert,
  TextInput,
} from "react-native";
import { GlobalContext } from "../global/GlobalState";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 45) / 2; // Two columns with padding

export default function Caisses() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState("Tous");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [user] = useContext(GlobalContext);

  // État Modal ajout/modif
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [motif, setMotif] = useState("");
  const [montant, setMontant] = useState("");
  const [type, setType] = useState("Vente");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [heure, setHeure] = useState(new Date().toTimeString().slice(0, 5));
  const [dateTime, setDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // État Modal recherche période
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [isPeriodFilterActive, setIsPeriodFilterActive] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = () => {
    fetch(`https://rouah.net/api/caisses.php?utilisateur_id=${user.matricule}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTransactions(json.transactions);
        setLoading(false);
      })
      .catch((err) => {
        //console.log(err);
        setLoading(false);
      });
  };

  // Formatage des montants
  const formatAmount = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
  };

  // Formatage des dates en JJ-MM-AAAA
  const formatDate = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Filtrage par date standard
  const filterByDate = (itemDate) => {
    const today = new Date();
    const d = new Date(itemDate);

    if (filter === "Quotidien")
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );

    if (filter === "Hebdomadaire") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return d >= startOfWeek && d <= endOfWeek;
    }

    if (filter === "Mensuel")
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

    return true;
  };

  // Filtrage par période
  const filterByPeriod = (itemDate) => {
    const d = new Date(itemDate);
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setHours(23, 59, 59, 999); // Inclure toute la journée de endDate
    return d >= startDate && d <= adjustedEndDate;
  };

  // Filtrage des transactions
  const filteredTransactions = transactions.filter((item) => {
    const isInDate = isPeriodFilterActive ? filterByPeriod(item.date_transaction) : filterByDate(item.date_transaction);

    if (typeFilter === "Vente") return isInDate && item.type_transaction === "Vente";
    if (typeFilter === "Achat") return isInDate && item.type_transaction === "Achat";
    return isInDate;
  });

  const totalVente = filteredTransactions
    .filter((t) => t.type_transaction === "Vente")
    .reduce((sum, t) => sum + parseFloat(t.montant_total), 0);

  const totalAchat = filteredTransactions
    .filter((t) => t.type_transaction === "Achat")
    .reduce((sum, t) => sum + parseFloat(t.montant_total), 0);

  const solde = totalVente - totalAchat;

  // Ajouter ou mettre à jour une transaction
const handleAddTransaction = async () => {
  if (!motif || !montant || !date || !heure) {
    Alert.alert("Message","❌ Veuillez remplir tous les champs");
    return;
  }

  // Valider que montant est un nombre valide
  const parsedMontant = parseFloat(montant);
  if (isNaN(parsedMontant) || parsedMontant <= 0) {
    Alert.alert("Message","❌ Le montant doit être un nombre valide supérieur à 0");
    return;
  }

  // Valider numero_transaction pour les mises à jour
  if (editingTransaction) {
    const numeroTransaction = editingTransaction.numero_transaction;
    if (!numeroTransaction) {
      //console.error("Numéro de transaction invalide:", numeroTransaction);
      Alert.alert("Message","❌ Numéro de transaction invalide pour la mise à jour");
      return;
    }
  }

  const apiUrl = editingTransaction
    ? "https://rouah.net/api/caisses-update.php"
    : "https://rouah.net/api/caisses-add.php";

  // Données à envoyer
  const requestData = {
    numero_transaction: editingTransaction ? editingTransaction.numero_transaction : null,
    utilisateur_id: user.matricule,
    motif_transaction: motif,
    montant_transaction: parsedMontant,
    montant_total: parsedMontant, // <-- ajouté
    type_transaction: type,
    date_transaction: date,
    heure_transaction: heure,
  };

  // Journaliser les données envoyées pour débogage
  //console.log("Données envoyées vers", apiUrl, ":", JSON.stringify(requestData, null, 2));
  if (editingTransaction) {
    //console.log("editingTransaction:", JSON.stringify(editingTransaction, null, 2));
  }

  try {
    // Timeout de 30 secondes
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Délai d'attente dépassé")), 30000);
    });

    const fetchPromise = fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    const res = await Promise.race([fetchPromise, timeoutPromise]);

    // Vérifier si la réponse HTTP est valide
    if (!res.ok) {
      const errorText = await res.text();
      //console.error(`Erreur HTTP ${res.status} pour ${apiUrl}:`, errorText);
      throw new Error(`Erreur HTTP ${res.status}: ${errorText || "Erreur inconnue"}`);
    }

    // Journaliser la réponse brute
    const responseText = await res.text();
    //console.log("Réponse brute de", apiUrl, ":", responseText);

    // Tenter de parser la réponse JSON
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (jsonError) {
      //console.error("Erreur de parsing JSON:", jsonError, "Réponse:", responseText);
      throw new Error("Réponse non-JSON reçue de l'API");
    }

    if (json.success) {
      fetchTransactions();
      resetModal();
      Alert.alert("Message","✅ Transaction enregistrée avec succès");
    } else {
      Alert.alert("Message",`❌ Erreur : ${json.message || "Erreur inconnue"}`);
    }
  } catch (err) {
    //console.error("Erreur lors de la requête vers", apiUrl, ":", err);
    Alert.alert("Message",`❌ Impossible de traiter la transaction : ${err.message}`);
  }
};

  // Supprimer une transaction
  const handleDeleteTransaction = async () => {
  if (!editingTransaction) return;

  try {
    const res = await fetch(
      `https://rouah.net/api/caisses-delete.php?numero_transaction=${editingTransaction.numero_transaction}`,
      { method: "POST" }
    );

    const text = await res.text(); // Lire la réponse brute
    console.log("Réponse brute:", text);

    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      //console.error("Erreur parsing JSON:", err, text);
      Alert.alert("Message","❌ Réponse du serveur invalide");
      return;
    }

    if (json.success) {
      fetchTransactions();
      resetModal();
      Alert.alert("Message","✅ Transaction supprimée");
    } else {
      Alert.alert("Message","❌ " + json.message);
    }
  } catch (err) {
    console.log(err);
    Alert.alert("Message","Impossible de supprimer la transaction");
  }
};


  const resetModal = () => {
    setModalVisible(false);
    setEditingTransaction(null);
    setMotif("");
    setMontant("");
    setType("Vente");
    setDate(new Date().toISOString().split("T")[0]);
    setHeure(new Date().toTimeString().slice(0, 5));
    setDateTime(new Date());
  };

  // Réinitialiser le filtre par période
  const resetPeriodFilter = () => {
    setIsPeriodFilterActive(false);
    setSearchModalVisible(false);
    setStartDate(new Date());
    setEndDate(new Date());
    setFilter("Tous");
  };

  const openEditModal = (transaction) => {
    setEditingTransaction(transaction);
    setMotif(transaction.motif_transaction);
    setMontant(transaction.montant_total.toString());
    setType(transaction.type_transaction);
    setDate(transaction.date_transaction);
    setHeure(transaction.heure_transaction);
    setDateTime(new Date(`${transaction.date_transaction}T${transaction.heure_transaction}`));
    setModalVisible(true);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={() => openEditModal(item)} style={styles.row}>
      <Text style={styles.date}>
        {formatDate(item.date_transaction)} {item.heure_transaction}
      </Text>
      <Text style={item.type_transaction === "Vente" ? styles.vente : styles.achat}>
        {formatAmount(item.montant_total)}
      </Text>
      <Text style={styles.motif}>{item.motif_transaction}</Text>
    </TouchableOpacity>
  );

   // ✅ Skeleton Loader
const SkeletonCard = () => (
  <View style={styles.skeletonRow}>
    <View style={styles.skeletonDate} />
    <View style={styles.skeletonMontant} />
    <View style={styles.skeletonMotif} />
  </View>
);
  
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <FlatList
            data={[1, 2, 3, 4]}
            renderItem={() => <SkeletonCard />}
            keyExtractor={(item, index) => index.toString()}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContainer}
          />
        </View>
      );
    }



  return (
    <View style={styles.container}>
      {/* Onglets période */}
      <View style={styles.tabs}>
        {["Quotidien", "Hebdomadaire", "Mensuel", "Tous"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, filter === tab && !isPeriodFilterActive && styles.tabButtonActive]}
            onPress={() => {
              setFilter(tab);
              setIsPeriodFilterActive(false);
            }}
          >
            <Text style={[styles.tabText, filter === tab && !isPeriodFilterActive && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Boutons Vente / Achat / Tous */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.venteBtn, typeFilter === "Vente" && { opacity: 0.7 }]}
          onPress={() => setTypeFilter("Vente")}
        >
          <Text style={styles.btnText}>Vente</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.achatBtn, typeFilter === "Achat" && { opacity: 0.7 }]}
          onPress={() => setTypeFilter("Achat")}
        >
          <Text style={styles.btnText}>Achat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.allBtn, typeFilter === "Tous" && { opacity: 0.7 }]}
          onPress={() => setTypeFilter("Tous")}
        >
          <Text style={styles.btnText}>Tous</Text>
        </TouchableOpacity>
      </View>

      {/* Résumé */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {filteredTransactions.length} transactions affichées
        </Text>
        {isPeriodFilterActive && (
          <Text style={styles.summaryText}>
            Période : {formatDate(startDate)} au {formatDate(endDate)}
          </Text>
        )}
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.numero_transaction}
        renderItem={renderItem}
        style={{ marginBottom: 10 }}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.col}>
          <Text>Total Vente</Text>
          <Text style={styles.vente}>{formatAmount(totalVente)}</Text>
        </View>
        <View style={styles.col}>
          <Text>Total Achat</Text>
          <Text style={styles.achat}>{formatAmount(totalAchat)}</Text>
        </View>
        <View style={styles.col}>
          <Text>Solde</Text>
          <Text style={styles.solde}>{formatAmount(solde)}</Text>
        </View>
      </View>

      {/* Bouton Ajouter */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <MaterialIcons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Bouton Recherche période */}
      <TouchableOpacity
        style={styles.fabSearch}
        onPress={() => setSearchModalVisible(true)}
      >
        <MaterialIcons name="search" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal ajout/modif */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTransaction ? "Modifier Transaction" : "Nouvelle Transaction"}
            </Text>

            <TextInput
              placeholder="Motif"
              style={styles.input}
              value={motif}
              onChangeText={setMotif}
            />
            <TextInput
              placeholder="Montant"
              style={styles.input}
              keyboardType="numeric"
              value={montant}
              onChangeText={setMontant}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
              <Text>{formatDate(date)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.input}>
              <Text>{heure}</Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dateTime}
                mode="date"
                display="calendar"
                onChange={(event, selectedDate) => {
                  const currentDate = selectedDate || dateTime;
                  setShowDatePicker(false);
                  setDateTime(currentDate);
                  setDate(currentDate.toISOString().split("T")[0]);
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={dateTime}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  const currentTime = selectedTime || dateTime;
                  setShowTimePicker(false);
                  setDateTime(currentTime);
                  const hours = currentTime.getHours().toString().padStart(2, "0");
                  const minutes = currentTime.getMinutes().toString().padStart(2, "0");
                  setHeure(`${hours}:${minutes}`);
                }}
              />
            )}

            <View style={styles.typeButtons}>
              <TouchableOpacity
                style={[styles.typeBtn, type === "Vente" && styles.activeType]}
                onPress={() => setType("Vente")}
              >
                <Text style={styles.btnText}>Vente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === "Achat" && styles.activeType]}
                onPress={() => setType("Achat")}
              >
                <Text style={styles.btnText}>Achat</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddTransaction}>
                <Text style={styles.btnText}>{editingTransaction ? "Mettre à jour" : "Enregistrer"}</Text>
              </TouchableOpacity>

              {editingTransaction && (
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteTransaction}>
                  <Text style={styles.btnText}>Supprimer</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.cancelBtn} onPress={resetModal}>
                <Text style={styles.btnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal recherche période */}
      <Modal visible={searchModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrer par période</Text>

            <TouchableOpacity style={styles.input} onPress={() => setShowStartPicker(true)}>
              <Text>Du : {formatDate(startDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.input} onPress={() => setShowEndPicker(true)}>
              <Text>Au : {formatDate(endDate)}</Text>
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="calendar"
                onChange={(e, date) => {
                  setShowStartPicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="calendar"
                onChange={(e, date) => {
                  setShowEndPicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  setSearchModalVisible(false);
                  setIsPeriodFilterActive(true);
                }}
              >
                <Text style={styles.btnText}>Appliquer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={resetPeriodFilter}
              >
                <Text style={styles.btnText}>Réinitialiser</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#fff" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 10, color: "#007BFF", textAlign: "center" },
  row: { borderBottomWidth: 1, borderColor: "#eee", paddingVertical: 10 },
  date: { fontSize: 12, color: "#555" },
  motif: { fontSize: 14, color: "#333", marginTop: 5 },
  vente: { color: "green", fontWeight: "bold", fontSize: 16 },
  achat: { color: "red", fontWeight: "bold", fontSize: 16 },
  tabs: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  tabButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#eee" },
  tabButtonActive: { backgroundColor: "#007BFF" },
  tabText: { fontSize: 14, color: "#333" },
  tabTextActive: { color: "#fff", fontWeight: "bold" },
  actionButtons: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  venteBtn: { flex: 1, backgroundColor: "green", marginRight: 5, padding: 12, borderRadius: 8, alignItems: "center" },
  achatBtn: { flex: 1, backgroundColor: "red", marginLeft: 5, padding: 12, borderRadius: 8, alignItems: "center" },
  allBtn: { flex: 1, backgroundColor: "#555", marginLeft: 5, padding: 12, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  summary: { backgroundColor: "#f1f1f1", padding: 10, marginBottom: 10, borderRadius: 8 },
  summaryText: { fontSize: 14, textAlign: "center", marginBottom: 3 },
  footer: { flexDirection: "row", justifyContent: "space-around", marginTop: 15, padding: 10, borderTopWidth: 1, borderColor: "#ccc", backgroundColor: "#f9f9f9" },
  col: { alignItems: "center" },
  solde: { fontWeight: "bold", fontSize: 16, color: "#000" },
  fab: { position: "absolute", bottom: 80, right: 20, backgroundColor: "#fa4447", width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", elevation: 5 },
  modalContainer: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", backgroundColor: "#fff", padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6, marginBottom: 10 },
  typeButtons: { flexDirection: "row", justifyContent: "space-around" },
  typeBtn: { flex: 1, margin: 5, backgroundColor: "#555", padding: 10, borderRadius: 6, alignItems: "center" },
  activeType: { backgroundColor: "#007BFF" },
  modalActions: { flexDirection: "row", justifyContent: "space-around", marginTop: 15 },
  saveBtn: { backgroundColor: "green", padding: 10, borderRadius: 6, flex: 1, margin: 5, alignItems: "center" },
  cancelBtn: { backgroundColor: "red", padding: 10, borderRadius: 6, flex: 1, margin: 5, alignItems: "center" },
  deleteBtn: { backgroundColor: "darkred", padding: 10, borderRadius: 6, flex: 1, margin: 5, alignItems: "center" },
  fabSearch: {
    position: "absolute",
    bottom: 150,
    right: 20,
    backgroundColor: "#fa4447",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  listContainer: { padding: 15, paddingTop: 0 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 15 },
  skeletonRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 10,
  borderBottomWidth: 1,
  borderColor: '#eee',
  backgroundColor: '#fff',
  borderRadius: 6,
  marginBottom: 5,
},
skeletonDate: {
  width: 80,
  height: 12,
  backgroundColor: '#e0e0e0',
  borderRadius: 4,
},
skeletonMontant: {
  width: 60,
  height: 16,
  backgroundColor: '#e0e0e0',
  borderRadius: 4,
},
skeletonMotif: {
  flex: 1,
  height: 14,
  backgroundColor: '#e0e0e0',
  borderRadius: 4,
  marginLeft: 10,
},
});