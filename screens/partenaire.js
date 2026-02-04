import React, { useEffect, useState } from "react";
import { 
  View, Text, FlatList, StyleSheet, Image, TouchableOpacity, 
  TextInput, Modal, Linking, ScrollView 
} from "react-native";
import { MaterialCommunityIcons, Feather, Ionicons } from "@expo/vector-icons";

export default function Partenaires() {
  const [searchText, setSearchText] = useState("");
  const [societes, setSocietes] = useState([]);
  const [selectedSociete, setSelectedSociete] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchSocietes = async () => {
    try {
      const response = await fetch("https://rouah.net/api/liste-partenaire.php");
      const json = await response.json();

      if (json.status === "success") setSocietes(json.data);

    } catch (err) {
      console.log("Erreur API:", err);
    }
  };

  useEffect(() => {
    fetchSocietes();
  }, []);

  const filteredData = societes.filter(
    (item) =>
      item.nom_societe?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.type_societe?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.pays_societe?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.ville_societe?.toLowerCase().includes(searchText.toLowerCase())
  );

  const openDetails = (item) => {
    setSelectedSociete(item);
    setModalVisible(true);
  };

  const callPhone = () => {
    Linking.openURL(`tel:${selectedSociete.telephone_societe}`);
  };

  const sendSMS = () => {
    Linking.openURL(`sms:${selectedSociete.telephone_societe}`);
  };

  const whatsapp = () => {
    Linking.openURL(`whatsapp://send?phone=${selectedSociete.telephone_societe}`);
  };

  const openMap = () => {
    if (!selectedSociete.coordonnee_gps) return;
    const gps = selectedSociete.coordonnee_gps.replace(" ", "");
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${gps}`);
  };

    // Formatage des montants
  const formatAmount = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.listItem} onPress={() => openDetails(item)}>
      <View style={styles.cardIcon}>
        {item.logo_societe ? (
          <Image source={{ uri: item.logo_societe }} style={styles.image} />
        ) : (
          <MaterialCommunityIcons name="office-building" size={30} color="#000" />
        )}
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.text}>{item.nom_societe}</Text>
        <Text style={styles.dataText}>{item.type_societe}</Text>
        <Text numberOfLines={1} style={styles.dataTextGray}>{item.ville_societe || 'Aucune ville'} - {item.pays_societe || 'Aucun pays'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* BARRE DE RECHERCHE */}
      <View style={styles.searchBar}>
        <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Rechercher un partenaire..."
          onChangeText={(text) => setSearchText(text)}
          value={searchText}
        />
      </View>

      {/* LISTE */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.code_societe}
        renderItem={renderItem}
      />

      {/* MODAL DETAILS SOCIETE */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            
            <ScrollView>
              {/* Logo */}
              <View style={{ alignItems: "center" }}>
                {selectedSociete?.logo_societe ? (
                  <Image 
                    source={{ uri: selectedSociete.logo_societe }} 
                    style={{ width: 90, height: 90, borderRadius: 50 }} 
                  />
                ) : (
                  <MaterialCommunityIcons name="office-building" size={80} color="#000" />
                )}
              </View>

              <Text style={styles.modalTitle}>{selectedSociete?.nom_societe}</Text>

              <Text style={styles.info}>
                📍 {selectedSociete?.adresse_societe}, {selectedSociete?.ville_societe}
              </Text>
              <Text style={styles.info}>📞 {selectedSociete?.telephone_societe}</Text>
              <Text style={styles.info}>✉️ {selectedSociete?.email_societe}</Text>

              {/* Boutons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.actionButton} onPress={callPhone}>
                  <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={sendSMS}>
                  <Ionicons name="chatbubble" size={20} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={whatsapp}>
                  <Ionicons name="logo-whatsapp" size={20} color="white" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={openMap}>
                  <Ionicons name="location" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {/* Prestations */}
              <Text style={styles.sectionTitle}>Prestations</Text>

              {selectedSociete?.articles?.length === 0 && (
                <Text style={{ textAlign: "center", color: "gray" }}>
                  Aucun article pour le moment
                </Text>
              )}

              {selectedSociete?.articles?.map((a) => (
                <View key={a.article_id} style={styles.articleCard}>
                  <View style={{ flexDirection: "row" }}>
                    {a.photo ? (
                      <Image source={{ uri: a.photo }} style={styles.articleImage} />
                    ) : (
                      <MaterialCommunityIcons name="image-off" size={40} color="gray" />
                    )}

                    <View style={{ flex: 1 }}>
                      <Text style={styles.articleTitle}>{a.titre}</Text>
                      <Text numberOfLines={1} style={styles.articleDesc}>{a.description || 'Aucune description'}</Text>
                      <Text style={styles.articlePrice}>{formatAmount(a.prix)} {a.devise}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={{ color: "white" }}>FERMER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "white" },
  searchBar: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  searchIcon: { padding: 8 },
  input: { flex: 1, height: 40 },

  listItem: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  cardIcon: {
    width: 60, height: 60, borderRadius: 50,
    backgroundColor: "#f2f4f7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  image: { width: 60, height: 60, borderRadius: 50 },

  textContainer: { flex: 1 },
  text: { fontSize: 16, fontWeight: "bold" },
  dataText: { fontSize: 14 },
  dataTextGray: { fontSize: 12, color: "gray" },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
  },
  info: { fontSize: 14, marginVertical: 3, textAlign: "center" },

  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 15,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },

  articleCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 10,
  },
  articleImage: {
    width: 70,
    height: 70,
    marginRight: 10,
    borderRadius: 8,
  },
  articleTitle: { fontSize: 16, fontWeight: "bold" },
  articleDesc: { fontSize: 12, color: "gray" },
  articlePrice: { color: "#007AFF", fontWeight: "bold", marginTop: 4 },

  closeBtn: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "red",
    borderRadius: 10,
    alignItems: "center",
  },
});
