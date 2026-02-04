import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper';
import { GlobalContext } from '../global/GlobalState'; // Assure-toi que ce chemin est bon

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 45) / 2;

export default function CatalogueChaine({ navigation, route }) {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal Détails
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Modal Commande
  const [commandeModalVisible, setCommandeModalVisible] = useState(false);
  const [selectedArticleForCommande, setSelectedArticleForCommande] = useState(null);
  const [quantite, setQuantite] = useState('1');
  const [montantCommande, setMontantCommande] = useState('');
  const [login, setLogin] = useState('');
  const [mdp, setMdp] = useState('');

  const { item } = route.params;
  const [user] = useContext(GlobalContext); // Utilisateur connecté

  // Formatage des montants
  const formatAmount = (value) => {
    if (!value) return '0';
    return parseFloat(value).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
  };

  // === FETCH ARTICLES ===
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://rouah.net/api/catalogue-chaine.php?utilisateur_id=${item.utilisateur_id}`
      );
      const result = await response.json();
      if (result.success) {
        setArticles(result.data);
        setFilteredArticles(result.data);
        setError(null);
      } else {
        setError(result.message || 'Erreur de chargement');
      }
    } catch (err) {
      setError('Serveur indisponible');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [item.utilisateur_id]);

  useEffect(() => {
    navigation.setOptions({ title: item.nom_prenom });
    fetchArticles();
  }, [fetchArticles, navigation]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSearchTerm('');
    fetchArticles();
  }, [fetchArticles]);

  // === FILTRE RECHERCHE ===
  useEffect(() => {
    const filtered = articles.filter(
      (art) =>
        art.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        art.nom_prenom?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredArticles(filtered);
  }, [searchTerm, articles]);

  // === CALCUL MONTANT TOTAL ===
  useEffect(() => {
    if (selectedArticleForCommande && quantite) {
      const prix = parseFloat(selectedArticleForCommande.prix) || 0;
      const qty = parseFloat(quantite) || 0;
      setMontantCommande((prix * qty).toString());
    }
  }, [quantite, selectedArticleForCommande]);

  // === MODAL DÉTAILS ===
  const openModal = (article) => {
    setSelectedArticle(article);
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setSelectedArticle(null);
  };

  // === MODAL COMMANDE ===
  const openCommandeModal = (article) => {
    setSelectedArticleForCommande(article);
    setQuantite('1');
    setMontantCommande(article.prix || '0');
    setLogin('');
    setMdp('');
    setCommandeModalVisible(true);
  };

  // === VALIDER COMMANDE ===
  const handleCommander = async () => {
    if (!quantite || parseInt(quantite) <= 0) {
      Alert.alert('Erreur', 'Quantité invalide');
      return;
    }
    if (!user?.matricule && (!login || !mdp)) {
      Alert.alert('Erreur', 'Veuillez vous connecter');
      return;
    }

    const commande = {
      numero_commande: `CMD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      article_id: selectedArticleForCommande.article_id,
      boutique_id: selectedArticleForCommande.utilisateur_id,
      utilisateur_id: user?.matricule || null,
      prix_vente: selectedArticleForCommande.prix,
      quantite_commande: quantite,
      montant_commande: montantCommande,
      date_commande: new Date().toISOString().split('T')[0],
      heure_commande: new Date().toTimeString().slice(0, 5),
      delai_validation: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      etat_commande: 'En attente',
      login: !user?.matricule ? login : null,
      mdp: !user?.matricule ? mdp : null,
    };

    try {
      const response = await fetch('https://rouah.net/api/commande-add.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commande),
      });
      const result = await response.json();

      if (result.success) {
        Alert.alert('Succès', 'Commande enregistrée !');
        setCommandeModalVisible(false);
      } else {
        Alert.alert('Erreur', result.message || 'Échec');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Connexion perdue');
    }
  };

    // Envoi de notification de commande
    const sendNotificationToUser = async (utilisateur_id, titre, description) => {
  
    try {
      const formData = new FormData();
  
      // Remplacer par l'utilisateur cible
  formData.append('utilisateur_id', utilisateur_id);
  formData.append('titre', titre);
  formData.append('description', description);
  
  
      const response = await fetch("https://rouah.net/api/validation-commande.php", {
        method: "POST",
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });
  
      const result = await response.json();
  
      if (result.status === "success") {
        Alert.alert("Message","✅ Notification envoyée avec succès !");
      } else {
        Alert.alert("❌","Erreur: " + result.message);
      }
  
    } catch (error) {
      Alert.alert("❌","Erreur côté client");
    }
  };

  // === RENDER ARTICLE ===
  const renderArticle = ({ item }) => {
    const albumImages = item.albums?.filter(m => m.type.startsWith('image/')) || [];
    const sliderImages = item.photo_base64
      ? [{ uri: `data:${item.type_photo || 'image/jpeg'};base64,${item.photo_base64}` }, ...albumImages]
      : albumImages;

    return (
      <View style={styles.articleContainer}>
        <View style={styles.imageContainer}>
          {sliderImages.length > 0 ? (
            <Swiper style={styles.sliderWrapper} showsButtons={sliderImages.length > 1} loop autoplay>
              {sliderImages.map((m, i) => (
                <View key={i} style={styles.swiperSlide}>
                  <Image source={{ uri: m.uri }} style={styles.articleImage} resizeMode="cover" />
                </View>
              ))}
            </Swiper>
          ) : (
            <Image source={require('../assets/logo.png')} style={styles.articleImage} resizeMode="cover" />
          )}
        </View>

        <Text style={styles.articleTitle} numberOfLines={2}>{item.titre}</Text>
        <Text style={styles.articlePrice}>
          {item.prix ? `${formatAmount(item.prix)} ${item.devise}` : 'Prix non spécifié'}
        </Text>

        <View style={styles.userContainer}>
          {item.user_photo_base64 ? (
            <Image
              source={{ uri: `data:${item.user_type || 'image/jpeg'};base64,${item.user_photo_base64}` }}
              style={styles.userImage}
            />
          ) : (
            <Image source={require('../assets/logo.png')} style={styles.userImage} />
          )}
          <Text numberOfLines={1} style={styles.userName}>{item.nom_prenom || 'Inconnu'}</Text>
        </View>

        {/* BOUTONS VERTICAUX */}
        <View style={styles.buttonColumn}>
          <TouchableOpacity style={styles.viewDetailsButton} onPress={() => openModal(item)}>
            <Text style={styles.viewDetailsButtonText}>Voir détails</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.commanderButton} onPress={() => openCommandeModal(item)}>
            <Text style={styles.commanderButtonText}>Commander</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // === MODAL DÉTAILS ===
  const renderModalContent = () => {
    if (!selectedArticle) return null;
    const albumImages = selectedArticle.albums?.filter(m => m.type.startsWith('image/')) || [];
    const sliderImages = selectedArticle.photo_base64
      ? [{ uri: `data:${selectedArticle.type_photo};base64,${selectedArticle.photo_base64}` }, ...albumImages]
      : albumImages;

    return (
      <View style={styles.modalContent}>
        <ScrollView contentContainerStyle={styles.modalScrollContainer}>
          {sliderImages.length > 0 ? (
            <Swiper style={styles.swiperContainer} showsButtons={sliderImages.length > 1} loop autoplay>
              {sliderImages.map((m, i) => (
                <View key={i} style={styles.swiperSlide}>
                  <Image source={{ uri: m.uri }} style={styles.modalImage} resizeMode="cover" />
                </View>
              ))}
            </Swiper>
          ) : (
            <Image source={require('../assets/logo.png')} style={styles.modalImage} />
          )}

          <Text style={styles.modalTitle}>{selectedArticle.titre}</Text>
          <Text style={styles.modalDescription}>{selectedArticle.description}</Text>
          <Text style={styles.modalPrice}>
            Prix : {formatAmount(selectedArticle.prix)} {selectedArticle.devise}
          </Text>
          <Text style={styles.modalOwner}>Vendeur : {selectedArticle.nom_prenom}</Text>

          <View style={styles.contactButtons}>
            <TouchableOpacity style={[styles.contactButton, styles.callButton]} onPress={() => Linking.openURL(`tel:${selectedArticle.telephone}`)}>
              <MaterialIcons name="call" size={20} color="#fff" />
              <Text style={styles.buttonText}>Appel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactButton, styles.smsButton]} onPress={() => Linking.openURL(`sms:${selectedArticle.telephone}`)}>
              <MaterialIcons name="sms" size={20} color="#fff" />
              <Text style={styles.buttonText}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactButton, styles.whatsappButton]} onPress={() => Linking.openURL(`https://wa.me/${selectedArticle.telephone}`)}>
              <MaterialCommunityIcons name="whatsapp" size={20} color="#fff" />
              <Text style={styles.buttonText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {selectedArticle.youtube_url && (
            <TouchableOpacity style={styles.modalYoutubeButton} onPress={() => Linking.openURL(selectedArticle.youtube_url)}>
              <MaterialCommunityIcons name="youtube" size={24} color="white" />
              <Text style={styles.modalYoutubeButtonText}>Voir la vidéo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
          <Text style={styles.closeButtonText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // === SKELETON & LOADING ===
  const SkeletonCard = () => (
    <View style={styles.articleContainer}>
      <View style={[styles.articleImage, { backgroundColor: '#e0e0e0' }]} />
      <View style={{ height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginVertical: 6 }} />
      <View style={{ height: 14, width: '60%', backgroundColor: '#e0e0e0', borderRadius: 4 }} />
    </View>
  );

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <FlatList
          data={[1, 2, 3, 4]}
          renderItem={() => <SkeletonCard />}
          keyExtractor={(_, i) => i.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setError(null); fetchArticles(); }}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // === RENDER PRINCIPAL ===
  return (
    <View style={styles.container}>
      {articles.length > 0 ? (
        <View style={styles.searchBar}>
          <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher un article..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#888"
          />
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Aucune donnée disponible</Text>
        </View>
      )}

      <FlatList
        data={filteredArticles}
        renderItem={renderArticle}
        keyExtractor={item => item.article_id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun article trouvé</Text>}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
      />

      {/* MODAL DÉTAILS */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalContainer}>{renderModalContent()}</View>
      </Modal>

      {/* MODAL COMMANDE */}
      <Modal animationType="slide" transparent visible={commandeModalVisible} onRequestClose={() => setCommandeModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.commandeModalContent}>
            <Text style={styles.commandeModalTitle}>Passer une commande</Text>

            <View style={styles.commandeRow}>
              <Text style={styles.commandeLabel}>Article :</Text>
              <Text style={styles.commandeValue}>{selectedArticleForCommande?.titre}</Text>
            </View>

            <View style={styles.commandeRow}>
              <Text style={styles.commandeLabel}>Prix unitaire :</Text>
              <Text style={styles.commandeValue}>
                {formatAmount(selectedArticleForCommande?.prix)} {selectedArticleForCommande?.devise}
              </Text>
            </View>

            <View style={styles.commandeRow}>
              <Text style={styles.commandeLabel}>Quantité :</Text>
              <TextInput
                style={styles.quantiteInput}
                keyboardType="numeric"
                value={quantite}
                onChangeText={t => setQuantite(t.replace(/[^0-9]/g, ''))}
              />
            </View>

            <View style={styles.commandeRow}>
              <Text style={styles.commandeLabel}>Montant total :</Text>
              <Text style={styles.montantTotal}>
                {formatAmount(montantCommande)} {selectedArticleForCommande?.devise}
              </Text>
            </View>

            {/* CHAMPS CONNEXION SI NON CONNECTÉ */}
            {!user?.matricule && (
              <>
                <View style={styles.commandeRow}>
                  <Text style={styles.commandeLabel}>Login :</Text>
                  <TextInput style={styles.loginInput} value={login} onChangeText={setLogin} placeholder="Nom utilisateur" />
                </View>
                <View style={styles.commandeRow}>
                  <Text style={styles.commandeLabel}>Mot de passe :</Text>
                  <TextInput style={styles.loginInput} value={mdp} onChangeText={setMdp} placeholder="••••••••" secureTextEntry />
                </View>
              </>
            )}

            <View style={styles.commandeActions}>
             <TouchableOpacity
  style={styles.validerBtn}
  onPress={() => {
    handleCommander();
    sendNotificationToUser(
      selectedArticleForCommande?.utilisateur_id,
      "Commande du client",
      `Le client souhaite commander l'article ${selectedArticleForCommande?.titre}`
    );
  }}>
                <Text style={styles.commandeBtnText}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.annulerBtn} onPress={() => setCommandeModalVisible(false)}>
                <Text style={styles.commandeBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// === STYLES COMPLETS ===
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  listContainer: { padding: 15, paddingTop: 0 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 15 },
  articleContainer: { width: ITEM_WIDTH, backgroundColor: 'white', borderRadius: 10, padding: 10, elevation: 3 },
  imageContainer: { position: 'relative' },
  articleImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 8 },
  articleTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5 },
  articlePrice: { fontSize: 14, fontWeight: 'bold', color: '#1E90FF', marginBottom: 5 },
  userContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  userImage: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  userName: { fontSize: 12, color: '#666', fontWeight: '500' },

  // BOUTONS VERTICAUX
  buttonColumn: { marginTop: 8 },
  viewDetailsButton: {
    backgroundColor: '#fa4447',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 6,
  },
  viewDetailsButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  commanderButton: {
    backgroundColor: '#1E90FF',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  commanderButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  // BARRE DE RECHERCHE
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 6, margin: 15, paddingHorizontal: 10, elevation: 5 },
  searchIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333', paddingVertical: 10 },

  // MESSAGES
  noDataContainer: { marginTop: 25, marginHorizontal: 15, backgroundColor: 'white', borderRadius: 6, paddingVertical: 15, elevation: 5 },
  noDataText: { color: '#888', textAlign: 'center', fontSize: 16 },
  errorText: { fontSize: 18, color: 'red', textAlign: 'center', padding: 20 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', padding: 20 },
  retryButton: { backgroundColor: '#1E90FF', padding: 15, borderRadius: 8, alignItems: 'center', width: width * 0.6, alignSelf: 'center' },
  retryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // MODAL DÉTAILS
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 10, width: width * 0.9, maxHeight: '80%', elevation: 5 },
  modalScrollContainer: { padding: 15 },
  modalImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalDescription: { fontSize: 14, color: '#666', marginBottom: 10, lineHeight: 20, textAlign: 'justify' },
  modalPrice: { fontSize: 16, fontWeight: 'bold', color: '#1E90FF', marginBottom: 10 },
  modalOwner: { fontSize: 14, color: '#666', marginBottom: 10 },
  contactButtons: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  contactButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8, marginHorizontal: 5 },
  callButton: { backgroundColor: '#2ecc71' },
  smsButton: { backgroundColor: '#3498db' },
  whatsappButton: { backgroundColor: '#25D366' },
  buttonText: { color: '#fff', marginLeft: 8, fontWeight: 'bold' },
  modalYoutubeButton: { flexDirection: 'row', backgroundColor: '#FF0000', padding: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  modalYoutubeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  closeButton: { backgroundColor: '#6c757d', padding: 15, borderRadius: 5, alignItems: 'center', margin: 15 },
  closeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // SWIPER
  swiperContainer: { height: 200, marginBottom: 15 },
  swiperSlide: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  swiperPagination: { bottom: 10 },
  swiperDot: { backgroundColor: 'rgba(0,0,0,0.2)', width: 8, height: 8, borderRadius: 4 },
  swiperActiveDot: { backgroundColor: '#1E90FF', width: 8, height: 8, borderRadius: 4 },
  sliderWrapper: { height: 150, marginBottom: 8 },

  // MODAL COMMANDE
  commandeModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: width * 0.85,
    elevation: 5,
  },
  commandeModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  commandeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  commandeLabel: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  commandeValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  quantiteInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
  },
  montantTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E90FF',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  loginInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
  },
  commandeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  validerBtn: {
    backgroundColor: '#2ecc71',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  annulerBtn: {
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  commandeBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});