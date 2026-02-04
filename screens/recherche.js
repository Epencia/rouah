import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  Animated,
  Easing,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import Swiper from 'react-native-swiper';
import { Video } from 'expo-av';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = (width - 45) / 2;
const CARD_HEIGHT = (width * 9) / 16;

const Recherche = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [resultsCount, setResultsCount] = useState(0);
  
  // Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Cartes de catégories
  const categoryCards = [
    { 
      id: '1', 
      name: 'Publicités', 
      src: "Publicites", 
      icon: '📢', 
      color: '#1DB954', 
      notifications: '0' 
    },
    { 
      id: '2', 
      name: "Avis de recherche", 
      src: "Avis de recherche", 
      icon: '🔍', 
      color: '#FF0000', 
      notifications: '0' 
    },
    { 
      id: '4', 
      name: 'Catalogues', 
      src: "Chaines", 
      icon: '📚', 
      color: '#4285F4', 
      notifications: '0' 
    },
  ];

  // Animation pour l'apparition des résultats
  const animateResults = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Réinitialiser l'animation des résultats
  const resetResultsAnimation = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
  };

  // Fonction pour effectuer la recherche via l'API
  const performSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setResultsCount(0);
      resetResultsAnimation();
      return;
    }

    setIsLoading(true);
    resetResultsAnimation();
    
    try {
      const response = await fetch('https://rouah.net/api/recherche.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          search_term: query
        })
      });
      
      const result = await response.json();
      
      
      if (result.success) {
        setSearchResults(result.data || []);
        setResultsCount(result.data?.length || 0);
        setIsSearching(true);
        
        setTimeout(() => {
          animateResults();
        }, 100);
      } else {
        setSearchResults([]);
        setResultsCount(0);
      }
    } catch (error) {
      setSearchResults([]);
      setResultsCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchFocus = () => {
    if (searchQuery) {
      setIsSearching(true);
    }
  };

  const handleSearchBlur = () => {
    Keyboard.dismiss();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setResultsCount(0);
    resetResultsAnimation();
    Keyboard.dismiss();
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Formatage des montants
  const formatAmount = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
  };

  const navigateToDetails = (item) => {
    if (item.resultType === 'article') {
      navigation.navigate('Details d\'article', { 
        code: item.article_id || item.id,
        article: item 
      });
    } else {
      navigation.navigate('Details d\'annonce', { 
        code: item.code || item.id,
        annonce: item 
      });
    }
  };

  const navigateToCategory = (category) => {
    navigation.navigate(category.src);
  };

  // Fonction renderImage
  const renderImage = (source, style, isUser = false) => {
    if (!source) {
      return (
        <View style={[style, styles.placeholderImage]}>
          <MaterialCommunityIcons 
            name={isUser ? "account-circle" : "image"} 
            size={isUser ? 20 : 24} 
            color="#94A3B8" 
          />
        </View>
      );
    }

    return (
      <Image 
        source={{ uri: source }} 
        style={style}
      />
    );
  };

  // Fonction pour render les médias avec Swiper
  const renderMedias = (item) => {
    const medias = [];

    if (item.photo_principale) {
      medias.push({ 
        uri: item.photo_principale, 
        type: item.type_photo || 'image/jpeg',
        id: 'main-' + (item.id || '')
      });
    }

    if (item.albums && Array.isArray(item.albums)) {
      item.albums.forEach((album, index) => {
        medias.push({ 
          uri: album.image, 
          type: album.type || 'image/jpeg',
          id: album.id || `album-${index}-${item.id}`
        });
      });
    }

    if (medias.length === 0) {
      return (
        <View style={styles.imageContainer}>
          {renderImage(null, styles.articleImage)}
        </View>
      );
    }

    return (
      <View style={styles.swiperContainer}>
        <Swiper 
          autoplay={true} 
          autoplayTimeout={4} 
          showsPagination 
          dotStyle={styles.swiperDot}
          activeDotStyle={styles.swiperActiveDot}
          height={150}
        >
          {medias.map((media) => {
            const isVideo = media.type?.startsWith('video') || 
                           media.uri?.includes('youtube') || 
                           (item.youtube_url && media.uri === item.photo_principale);

            if (isVideo) {
              const videoUri = item.youtube_url || media.uri;
              return (
                <View key={media.id} style={styles.videoContainer}>
                  <Video
                    source={{ uri: videoUri }}
                    style={styles.articleImage}
                    resizeMode="cover"
                    useNativeControls
                    isLooping
                    shouldPlay={false}
                  />
                </View>
              );
            } else {
              return (
                <Image
                  key={media.id}
                  source={{ uri: media.uri }}
                  style={styles.articleImage}
                  resizeMode="cover"
                />
              );
            }
          })}
        </Swiper>
        
        {/* Badges en bas à droite de l'image */}
        <View style={styles.imageBadgesContainer}>
          {/* Catégorie pour les annonces */}
          {item.resultType === 'annonce' && item.categorie && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.categorie}</Text>
            </View>
          )}

          {/* Badge quantité pour les articles */}
          {item.resultType === 'article' && item.quantite && (
            <View style={styles.quantityBadge}>
              <Text style={styles.quantityText}>{item.quantite} dispo.</Text>
            </View>
          )}

          {/* Badge nombre de médias */}
          {medias.length > 1 && (
            <View style={styles.mediaCountBadge}>
              <MaterialCommunityIcons name="image-multiple" size={10} color="white" />
              <Text style={styles.mediaCountText}>{medias.length}</Text>
            </View>
          )}
        </View>

        {/* Badge type en haut à gauche */}
        <View style={[
          styles.typeBadge,
          item.resultType === 'article' ? styles.articleBadge : styles.annonceBadge
        ]}>
          <MaterialCommunityIcons 
            name={item.resultType === 'article' ? "package-variant" : "bullhorn"} 
            size={12} 
            color="white" 
          />
          <Text style={styles.typeBadgeText}>
            {item.resultType === 'article' ? 'Article' : 'Annonce'}
          </Text>
        </View>
      </View>
    );
  };

  // Render item pour les cartes de catégories
  const renderCategoryCard = (item) => {
    return (
      <TouchableOpacity 
        style={[styles.categoryCard, { backgroundColor: item.color }]}
        onPress={() => navigateToCategory(item)}
        activeOpacity={0.8}
      >
        <View style={styles.categoryCardContent}>
          <Text style={styles.categoryIcon}>{item.icon}</Text>
          <Text style={styles.categoryName}>{item.name}</Text>
          {item.notifications !== '0' && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{item.notifications}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getPriceDisplay = (item) => {
    if (item.resultType === 'article') {
      return item.prix ? `${formatAmount(item.prix)} ${item.devise || ''}` : 'Prix non spécifié';
    } else {
      if (item.montant) {
        return `${formatAmount(item.montant)}`;
      } else if (item.prix) {
        return `${formatAmount(item.prix)}`;
      } else {
        return 'Montant non spécifié';
      }
    }
  };

  const renderSearchResult = ({ item, index }) => {
    return (
      <Animated.View 
        style={[
          styles.articleContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.resultTouchable}
          activeOpacity={0.8}
          onPress={() => navigateToDetails(item)}
        >
          {/* Slider pour les médias avec badges */}
          {renderMedias(item)}

          {/* Contenu texte */}
          <View style={styles.textContainer}>
            <Text style={styles.articleTitle} numberOfLines={2}>
              {item.titre || 'Sans titre'}
            </Text>
            
            <Text style={styles.articlePrice}>
              {getPriceDisplay(item)}
            </Text>

            {item.description && (
              <Text style={styles.articleDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}

            {/* Utilisateur */}
            <View style={styles.userContainer}>
              {renderImage(item.user_photo, styles.userImage, true)}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {item.nom_prenom || 'Inconnu'}
                </Text>
                {item.resultType === 'annonce' && item.vues && (
                  <Text style={styles.viewsText}>
                    {item.vues} vues
                  </Text>
                )}
              </View>
            </View>

            {/* Badge de correspondance utilisateur */}
            {item.nom_prenom && 
            searchQuery.toLowerCase().includes(item.nom_prenom.toLowerCase()) && (
              <View style={styles.userMatchBadge}>
                <Feather name="check-circle" size={12} color="#065F46" />
                <Text style={styles.userMatchText}>
                  Publié par l'utilisateur recherché
                </Text>
              </View>
            )}
          </View>

          {/* Bouton Voir détails */}
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => navigateToDetails(item)}
          >
            <Text style={styles.viewDetailsButtonText}>Voir détails</Text>
            <Feather name="arrow-right" size={14} color="white" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Skeleton Loader
  const SkeletonCard = () => (
    <View style={styles.articleContainer}>
      <View style={[styles.articleImage, { backgroundColor: '#e0e0e0' }]} />
      <View style={{ height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, marginVertical: 6 }} />
      <View style={{ height: 14, width: '60%', backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 6 }} />
      <View style={{ height: 12, width: '40%', backgroundColor: '#e0e0e0', borderRadius: 4 }} />
      <View style={[styles.viewDetailsButton, { backgroundColor: '#e0e0e0', marginTop: 10 }]} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Barre de recherche fixe en haut */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Feather name="search" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des articles ou annonces..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Feather name="x" size={18} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Résultats */}
      <View style={styles.resultsContainer}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <FlatList
              data={[1, 2, 3, 4]}
              renderItem={() => <SkeletonCard />}
              keyExtractor={(item, index) => `skeleton-${index}`}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapper}
              contentContainerStyle={styles.listContainer}
            />
          </View>
        ) : isSearching ? (
          searchResults.length > 0 ? (
            <View style={styles.resultsContent}>
              {/* En-tête avec nombre de résultats */}
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {resultsCount} résultat{resultsCount > 1 ? 's' : ''} trouvé{resultsCount > 1 ? 's' : ''}
                </Text>
              </View>
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item, index) => 
                  `${item.resultType}-${item.id || item.article_id || item.code}-${index}`
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.resultsList}
                keyboardShouldPersistTaps="handled"
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
              />
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <View style={styles.noResultsContainer}>
                <MaterialCommunityIcons name="magnify" size={64} color="#94A3B8" />
                <Text style={styles.noResultsText}>
                  Aucun résultat trouvé pour
                </Text>
                <Text style={styles.noResultsQuery}>"{searchQuery}"</Text>
                <Text style={styles.noResultsHint}>
                  Essayez d'autres termes ou vérifiez l'orthographe
                </Text>
              </View>
            </View>
          )
        ) : (
          <ScrollView style={styles.initialState} showsVerticalScrollIndicator={false}>
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeIcon}>
                <Feather name="search" size={36} color="white" />
              </View>
              <Text style={styles.initialStateTitle}>
                Recherche d'articles et annonces
              </Text>

              <Text style={styles.initialStateText}>
                Trouvez ce que vous cherchez par titre, description, catégorie ou nom du vendeur
              </Text>

              {/* Cartes de catégories */}
              <View style={styles.categoriesSection}>
                <Text style={styles.sectionTitle}>Découvrez</Text>
                <View style={styles.categoriesContainer}>
                  {categoryCards.map((item) => (
                    <View key={item.id} style={styles.categoryCardWrapper}>
                      {renderCategoryCard(item)}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  resultsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
    paddingTop: 0,
  },
  resultsList: {
    padding: 15,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  articleContainer: {
    width: ITEM_WIDTH,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  resultTouchable: {
    flex: 1,
  },
  swiperContainer: {
    position: 'relative',
    height: 150,
  },
  videoContainer: {
    flex: 1,
  },
  articleImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  imageBadgesContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '500',
  },
  quantityBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  quantityText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '500',
  },
  mediaCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  mediaCountText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '500',
    marginLeft: 2,
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    zIndex: 2,
  },
  articleBadge: {
    backgroundColor: '#1E90FF',
  },
  annonceBadge: {
    backgroundColor: '#fa4447',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  swiperDot: {
    width: 6,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  swiperActiveDot: {
    width: 6,
    height: 6,
    backgroundColor: 'white',
  },
  textContainer: {
    padding: 12,
    flex: 1,
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    lineHeight: 18,
  },
  articlePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E90FF',
    marginBottom: 6,
  },
  articleDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
    marginBottom: 8,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  viewsText: {
    fontSize: 10,
    color: '#888',
    fontStyle: 'italic',
  },
  userMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  userMatchText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: '600',
    marginLeft: 4,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa4447',
    paddingVertical: 10,
  },
  viewDetailsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  noResultsText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
    marginTop: 16,
  },
  noResultsQuery: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  noResultsHint: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  initialState: {
    flex: 1,
  },
  welcomeContainer: {
    alignItems: 'center',
    padding: 20,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fa4447',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#fa4447',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  initialStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
  },
  initialStateText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    fontWeight: '500',
  },
  // Styles pour les cartes de catégories
  categoriesSection: {
    marginBottom: 30,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  categoryCardWrapper: {
    width: (width - 60) / 3,
    marginBottom: 15,
  },
  categoryCard: {
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    height: 100,
    justifyContent: 'center',
  },
  categoryCardContent: {
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default Recherche;