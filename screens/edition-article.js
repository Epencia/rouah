import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Linking, Dimensions, RefreshControl, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 45) / 2;

export default function MonCatalogueArticle({ navigation }) {
  const [user] = useContext(GlobalContext);
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newArticle, setNewArticle] = useState({
    titre: '',
    description: '',
    prix: '',
    quantite: '',
    photo_base64: '',
    type_photo: 'jpeg',
    youtube_url: '',
    utilisateur_id: user?.matricule || '',
    etat: 'Actif',
  });

  // Demander la permission d'accéder à la galerie
  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'L\'application a besoin de l\'accès à la galerie pour sélectionner des images.');
      }
    })();
  }, []);

  const fetchArticles = useCallback(async () => {
    if (!user?.matricule) {
      setError('Utilisateur non connecté');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`https://rouah.net/api/mon-catalogue-article.php?matricule=${user.matricule}`);
      const result = await response.json();
      if (result.success) {
        setArticles(result.data);
        setFilteredArticles(result.data);
        setError(null);
      } else {
        setError(result.message || 'Erreur lors de la récupération des articles');
      }
    } catch (err) {
      setError('Erreur réseau ou serveur indisponible');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.matricule]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    const filtered = articles.filter(
      (item) =>
        item.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredArticles(filtered);
  }, [searchTerm, articles]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSearchTerm('');
    fetchArticles();
  }, [fetchArticles]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const { base64, uri } = result.assets[0];
        const type = uri.split('.').pop().toLowerCase();
        setNewArticle({
          ...newArticle,
          photo_base64: base64,
          type_photo: type === 'jpg' || type === 'jpeg' ? 'jpeg' : 'png',
        });
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const openModal = (article) => {
    setSelectedArticle(article);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedArticle(null);
  };

 const openAddModal = (article = null) => {
  if (article) {
    setIsEditMode(true);
    setSelectedArticle(article); // IMPORTANT : on définit selectedArticle
    setNewArticle({ ...article, utilisateur_id: user?.matricule || '' });
  } else {
    setIsEditMode(false);
    setSelectedArticle(null);
    setNewArticle({
      titre: '',
      description: '',
      prix: '',
      quantite: '',
      photo_base64: '',
      type_photo: 'jpeg',
      youtube_url: '',
      utilisateur_id: user?.matricule || '',
      etat: 'Actif',
    });
  }
  setAddModalVisible(true);
};


  const closeAddModal = () => {
    setAddModalVisible(false);
    setNewArticle({
      titre: '',
      description: '',
      prix: '',
      quantite: '',
      photo_base64: '',
      type_photo: 'jpeg',
      youtube_url: '',
      utilisateur_id: user?.matricule || '',
      etat: 'Actif',
    });
    setIsEditMode(false);
  };

// Fonction pour ajouter un article
const addArticle = async () => {
  if (!user?.matricule) {
    setError('Utilisateur non connecté');
    return;
  }

  try {
    const response = await fetch('https://rouah.net/api/articles-add.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newArticle, utilisateur_id: user.matricule }),
    });

    const result = await response.json();

    if (result.success) {
      await fetchArticles();
      closeAddModal();
    } else {
      Alert.alert('Erreur', result.message || 'Impossible d\'ajouter l\'article');
    }
  } catch (err) {
    Alert.alert('Erreur', 'Erreur réseau ou serveur indisponible');
  }
};

// Fonction pour mettre à jour un article
const updateArticle = async () => {
  if (!user?.matricule) {
    setError('Utilisateur non connecté');
    return;
  }

  if (!selectedArticle?.article_id) {
    Alert.alert('Erreur', 'Aucun article sélectionné pour la mise à jour');
    return;
  }

  try {
    const url = `https://rouah.net/api/articles-update.php?id=${selectedArticle.article_id}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newArticle, utilisateur_id: user.matricule }),
    });

    const result = await response.json();

    if (result.success) {
      await fetchArticles();
      closeAddModal();
    } else {
      Alert.alert('Erreur', result.message || 'Impossible de mettre à jour l\'article');
    }
  } catch (err) {
    Alert.alert('Erreur', 'Erreur réseau ou serveur indisponible');
  }
};

// Fonction principale déclenchée par le bouton Ajouter/Mettre à jour
const handleAddOrUpdateArticle = () => {
  if (isEditMode) {
    updateArticle();
  } else {
    addArticle();
  }
};



  const renderArticle = ({ item }) => {
    const youtubeId = item.youtube_url?.includes('youtube.com')
      ? item.youtube_url.split('v=')[1]?.split('&')[0]
      : item.youtube_url;

    return (
      <TouchableOpacity
        style={styles.articleContainer}
        activeOpacity={0.8}
        onPress={() => openModal(item)}
      >
        <View style={styles.imageContainer}>
          {item.photo_base64 ? (
            <Image
              source={{ uri: `data:image/${item.type_photo || 'jpeg'};base64,${item.photo_base64}` }}
              style={styles.articleImage}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require('../assets/logo.png')}
              style={styles.articleImage}
              resizeMode="cover"
            />
          )}
        </View>
        <Text style={styles.articleTitle} numberOfLines={2}>{item.titre}</Text>
        <Text style={styles.articlePrice}>
          {item.prix ? `${item.prix} f.cfa` : 'Prix non spécifié'}
        </Text>
        <Text style={styles.articleQuantity}>
          Stock : {item.quantite || 'N/A'}
        </Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => openModal(item)}
          >
            <Text style={styles.viewDetailsButtonText}>Voir détails</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openAddModal(item)}
          >
            <Text style={styles.editButtonText}>Modifier</Text>
          </TouchableOpacity>
        </View>
        {youtubeId && (
          <TouchableOpacity
            style={styles.youtubeButton}
            onPress={() => Linking.openURL(item.youtube_url)}
          >
            <MaterialCommunityIcons name="youtube" size={20} color="white" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderModalContent = () => {
    if (!selectedArticle) return null;
    const youtubeId = selectedArticle.youtube_url?.includes('youtube.com')
      ? selectedArticle.youtube_url.split('v=')[1]?.split('&')[0]
      : selectedArticle.youtube_url;

    return (
      <View style={styles.modalContent}>
        <ScrollView contentContainerStyle={styles.modalScrollContainer}>
          {selectedArticle.photo_base64 ? (
            <Image
              source={{ uri: `data:image/${selectedArticle.type_photo || 'jpeg'};base64,${selectedArticle.photo_base64}` }}
              style={styles.modalImage}
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require('../assets/logo.png')}
              style={styles.modalImage}
              resizeMode="cover"
            />
          )}
          <Text style={styles.modalTitle}>{selectedArticle.titre}</Text>
          <Text style={styles.modalDescription}>{selectedArticle.description}</Text>
          <Text style={styles.modalPrice}>
            Prix : {selectedArticle.prix ? `${selectedArticle.prix} f.cfa` : 'Non spécifié'}
          </Text>
          <Text style={styles.modalQuantity}>
            Stock : {selectedArticle.quantite || 'Non spécifié'}
          </Text>
          <Text style={styles.modalStatus}>
            Statut : {selectedArticle.etat || 'Non spécifié'}
          </Text>
          {youtubeId && (
            <TouchableOpacity
              style={styles.modalYoutubeButton}
              onPress={() => Linking.openURL(selectedArticle.youtube_url)}
            >
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

  const renderAddModalContent = () => {
    return (
      <View style={styles.modalContent}>
        <ScrollView contentContainerStyle={styles.modalScrollContainer}>
          <Text style={styles.modalTitle}>{isEditMode ? 'Modifier l\'article' : 'Ajouter un article'}</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
            <Text style={styles.imagePickerButtonText}>
              {newArticle.photo_base64 ? 'Changer l\'image' : 'Sélectionner une image'}
            </Text>
          </TouchableOpacity>
          {newArticle.photo_base64 && (
            <Image
              source={{ uri: `data:image/${newArticle.type_photo};base64,${newArticle.photo_base64}` }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Titre"
            value={newArticle.titre}
            onChangeText={(text) => setNewArticle({ ...newArticle, titre: text })}
          />
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Description"
            value={newArticle.description}
            onChangeText={(text) => setNewArticle({ ...newArticle, description: text })}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Prix"
            value={newArticle.prix}
            onChangeText={(text) => setNewArticle({ ...newArticle, prix: text })}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Quantité"
            value={newArticle.quantite}
            onChangeText={(text) => setNewArticle({ ...newArticle, quantite: text })}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="URL YouTube"
            value={newArticle.youtube_url}
            onChangeText={(text) => setNewArticle({ ...newArticle, youtube_url: text })}
          />
          <TextInput
            style={styles.input}
            placeholder="Statut (Actif/Inactif)"
            value={newArticle.etat}
            onChangeText={(text) => setNewArticle({ ...newArticle, etat: text })}
          />
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleAddOrUpdateArticle}
          >
            <Text style={styles.submitButtonText}>{isEditMode ? 'Mettre à jour' : 'Ajouter'}</Text>
          </TouchableOpacity>
        </ScrollView>
        <TouchableOpacity style={styles.closeButton} onPress={closeAddModal}>
          <Text style={styles.closeButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    );
  };

 if (isLoading && !isRefreshing) {
  // Crée un tableau de skeletons à afficher
  const skeletonData = Array.from({ length: 6 }); // 6 cartes skeleton

  const SkeletonCard = () => (
    <View style={styles.articleContainer}>
      <View style={[styles.articleImage, { backgroundColor: '#e0e0e0' }]} />
      <View style={{ height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginVertical: 6 }} />
      <View style={{ height: 14, width: '60%', backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 6 }} />
      <View style={{ height: 12, width: '40%', backgroundColor: '#e0e0e0', borderRadius: 4 }} />
      <View style={[styles.viewDetailsButton, { backgroundColor: '#e0e0e0', marginTop: 10 }]} />
      <View style={[styles.editButton, { backgroundColor: '#e0e0e0', marginTop: 5 }]} />
    </View>
  );

  return (
    <FlatList
      data={skeletonData}
      renderItem={() => <SkeletonCard />}
      keyExtractor={(item, index) => index.toString()}
      numColumns={2}
      columnWrapperStyle={styles.columnWrapper}
      contentContainerStyle={styles.listContainer}
    />
  );
}


  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError(null);
            fetchArticles();
          }}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

 

  return (
    <View style={styles.container}>
      {articles.length > 0 ? (
        <View style={styles.searchBar}>
          <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher un article..."
            onChangeText={setSearchTerm}
            value={searchTerm}
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
        keyExtractor={(item) => item.article_id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          articles.length > 0 ? (
            <Text style={styles.emptyText}>Aucun article trouvé pour "{searchTerm}"</Text>
          ) : (
            <Text style={styles.emptyText}>Aucun article disponible</Text>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#1E90FF']}
            tintColor="#1E90FF"
          />
        }
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: ITEM_WIDTH + 15,
          offset: (ITEM_WIDTH + 15) * Math.floor(index / 2),
          index,
        })}
      />
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          {renderModalContent()}
        </View>
      </Modal>
      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={closeAddModal}
      >
        <View style={styles.modalContainer}>
          {renderAddModalContent()}
        </View>
      </Modal>

      <TouchableOpacity
                style={styles.floatingButtonRight}
                onPress={() => openAddModal()}
              >
                <Feather name="plus" size={24} color="white" />
              </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 15,
    paddingTop: 0,
    paddingBottom: 30,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  articleContainer: {
    width: ITEM_WIDTH,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
  },
  articleImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
    lineHeight: 18,
  },
  articlePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 5,
  },
  articleQuantity: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  articleStatus: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  viewDetailsButton: {
    backgroundColor: '#fa4447',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
    marginBottom: 5,
  },
  viewDetailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    width: '100%',
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  youtubeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF0000',
    padding: 5,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 6,
    margin: 15,
    paddingHorizontal: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 10,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerButton: {
    backgroundColor: '#1E90FF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  noDataContainer: {
    marginTop: 25,
    marginHorizontal: 15,
    backgroundColor: 'white',
    borderRadius: 6,
    paddingVertical: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  noDataText: {
    color: '#888',
    textAlign: 'center',
    fontSize: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
    padding: 20,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  retryButton: {
    backgroundColor: '#fa4447',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: width * 0.6,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: width * 0.9,
    maxHeight: '80%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalScrollContainer: {
    padding: 15,
  },
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    lineHeight: 20,
    textAlign:'justify'
  },
  modalContentText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 10,
  },
  modalQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  modalStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  modalYoutubeButton: {
    flexDirection: 'row',
    backgroundColor: '#FF0000',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  modalYoutubeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  closeButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    margin: 15,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 15,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#fa4447',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 15,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
   floatingButtonRight: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#fa4447',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});