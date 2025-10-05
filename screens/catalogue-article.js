import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, Linking, Dimensions, RefreshControl, TextInput, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const ITEM_WIDTH = (width - 45) / 2; // Two columns with padding

export default function CatalogueArticle({ navigation }) {
  const [articles, setArticles] = useState([]);
  const [filteredArticles, setFilteredArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Fetch articles from API
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://rouah.net/api/catalogue-article.php');
      const result = await response.json();
      if (result.success) {
        setArticles(result.data);
        setFilteredArticles(result.data); // Initialize filtered articles
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
  }, []);

  // Load articles on mount
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setSearchTerm(''); // Reset search term on refresh
    fetchArticles();
  }, [fetchArticles]);

  // Filter articles based on search term
  useEffect(() => {
    const filtered = articles.filter(
      (item) =>
        item.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredArticles(filtered);
  }, [searchTerm, articles]);

  // Handle opening the modal
  const openModal = (article) => {
    setSelectedArticle(article);
    setModalVisible(true);
  };

  // Handle closing the modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedArticle(null);
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
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => openModal(item)}
        >
          <Text style={styles.viewDetailsButtonText}>Voir détails</Text>
        </TouchableOpacity>
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
          <Text style={styles.modalOwner}>
            Vendeur : {selectedArticle.nom_prenom || 'Inconnu'}
          </Text>
          <Text style={styles.modalPhone}>
            Téléphone : {selectedArticle.telephone || 'Non spécifié'}
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

  // ✅ Skeleton Loader
  const SkeletonCard = () => (
    <View style={styles.articleContainer}>
      <View style={[styles.articleImage, { backgroundColor: '#e0e0e0' }]} />
      <View style={{ height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginVertical: 6 }} />
      <View style={{ height: 14, width: '60%', backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 6 }} />
      <View style={{ height: 12, width: '40%', backgroundColor: '#e0e0e0', borderRadius: 4 }} />
      <View style={[styles.viewDetailsButton, { backgroundColor: '#e0e0e0', marginTop: 10 }]} />
    </View>
  );

  if (isLoading && !isRefreshing) {
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  listContainer: { padding: 15, paddingTop: 0 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 15 },
  articleContainer: { width: ITEM_WIDTH, backgroundColor: 'white', borderRadius: 10, padding: 10, marginBottom: 15, elevation: 3 },
  imageContainer: { position: 'relative' },
  articleImage: { width: '100%', height: 150, borderRadius: 8, marginBottom: 8 },
  articleTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 5, lineHeight: 18 },
  articlePrice: { fontSize: 14, fontWeight: 'bold', color: '#1E90FF', marginBottom: 5 },
  articleQuantity: { fontSize: 12, color: '#666', marginBottom: 8 },
  viewDetailsButton: { backgroundColor: '#fa4447', paddingVertical: 8, borderRadius: 5, alignItems: 'center' },
  viewDetailsButtonText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  youtubeButton: { position: 'absolute', top: 10, right: 10, backgroundColor: '#FF0000', padding: 5, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 6, margin: 15, paddingHorizontal: 10, elevation: 5 },
  searchIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333', paddingVertical: 10 },
  noDataContainer: { marginTop: 25, marginHorizontal: 15, backgroundColor: 'white', borderRadius: 6, paddingVertical: 15, elevation: 5 },
  noDataText: { color: '#888', textAlign: 'center', fontSize: 16 },
  loadingText: { fontSize: 16, color: '#666', marginTop: 10 },
  errorText: { fontSize: 18, color: 'red', textAlign: 'center', padding: 20, marginBottom: 20 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', padding: 20 },
  retryButton: { backgroundColor: '#1E90FF', padding: 15, borderRadius: 8, alignItems: 'center', width: width * 0.6, alignSelf: 'center' },
  retryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: 'white', borderRadius: 10, width: width * 0.9, maxHeight: '80%', overflow: 'hidden', elevation: 5 },
  modalScrollContainer: { padding: 15 },
  modalImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  modalDescription: { fontSize: 14, color: '#666', marginBottom: 10, lineHeight: 20, textAlign:'justify' },
  modalPrice: { fontSize: 16, fontWeight: 'bold', color: '#1E90FF', marginBottom: 10 },
  modalQuantity: { fontSize: 14, color: '#666', marginBottom: 10 },
  modalOwner: { fontSize: 14, color: '#666', marginBottom: 10 },
  modalPhone: { fontSize: 14, color: '#666', marginBottom: 15 },
  modalYoutubeButton: { flexDirection: 'row', backgroundColor: '#FF0000', padding: 10, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  modalYoutubeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  closeButton: { backgroundColor: '#6c757d', padding: 15, borderRadius: 5, alignItems: 'center', margin: 15 },
  closeButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
