import { StyleSheet, View, FlatList, Image, Text, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, RefreshControl, Linking } from 'react-native';
import React, { useEffect, useState, useContext, useCallback } from 'react';
import { MaterialCommunityIcons, Feather, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video } from 'expo-av';
import { GlobalContext } from '../global/GlobalState';

const { width } = Dimensions.get('window');
const ITEM_HEIGHT = 400; // Approximate height for getItemLayout

export default function Annonces({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [user] = useContext(GlobalContext);

  // Effect
   useEffect(()=>{
    //navigation.setOptions({title: 'Annonces'});
        // Exécuter la fonction avec cache
    const delay = 10000; // Définir le délai à 10 s
    getAnnonces(); 
    // Définir un intervalle pour exécuter la fonction sans cache toutes les 1 minute
    const intervalId = setInterval(getAnnonces2, delay);
    // Nettoyer l'intervalle lorsque le composant est démonté ou lorsque l'effet se réexécute
    return () => clearInterval(intervalId);
    },[])

  // Fetch annonces from API
  const getAnnonces = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://rouah.net/api/annonces.php', {
        //headers: { 'Cache-Control': 'no-cache' },
      });
      const newData = await response.json();
      if (newData.success !== false) {
        setData(newData);
        setFilteredData(newData);
        setError(null);
      } else {
        setError(newData.message || 'Erreur lors de la récupération des annonces');
      }
    } catch (error) {
      setError('Erreur réseau ou serveur indisponible');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

    const getAnnonces2 = useCallback(async () => {
    try {
      const response = await fetch('https://rouah.net/api/annonces.php', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      const newData = await response.json();
      if (newData.success !== false) {
        setData(newData);
        setFilteredData(newData);
        setError(null);
      } else {
        setError(newData.message || 'Erreur lors de la récupération des annonces');
      }
    } catch (error) {
      setError('Erreur réseau ou serveur indisponible');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setSearchTerm('');
    getAnnonces();
  }, [getAnnonces]);

  // Filter annonces based on search term
  const filterAnnonces = useCallback(() => {
    const filtered = data.filter(
      (item) =>
        item.titre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nom_prenom?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [data, searchTerm]);

  

  useEffect(() => {
    filterAnnonces();
  }, [searchTerm, filterAnnonces]);

  const toggleDescription = useCallback((id) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const formatDate = useCallback((dateString) => {
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
  }, []);

  const handleCall = useCallback((phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  }, []);

  const handleSMS = useCallback((phoneNumber) => {
    Linking.openURL(`sms:${phoneNumber}`);
  }, []);

  const handleWhatsApp = useCallback((phoneNumber) => {
    Linking.openURL(`https://wa.me/${phoneNumber}`);
  }, []);

  const renderAnnonce = ({ item }) => (
    <View style={styles.annonceCard}>
      <View style={styles.authorContainer}>
        <View style={styles.authorInfo}>
          {item.photo64 ? (
            <Image
              source={{ uri: `data:${item.type};base64,${item.photo64}` }}
              style={styles.authorImage}
              resizeMode="cover"
            />
          ) : (
            <Image source={require('../assets/user.jpg')} style={styles.authorImage} resizeMode="cover" />
          )}
          <View>
            <Text style={styles.authorName}>{item.nom_prenom || 'Inconnu'}</Text>
            <Text style={styles.sponsoredTag}>{item.categorie || 'Sponsorisé'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.annonceHeader}>
        <View style={styles.annonceTitleContainer}>
          <Text style={styles.annonceTitle}>{item.titre}</Text>
          <View style={styles.dateContainer}>
            <MaterialIcons name="access-time" size={12} color="#8E8E93" />
            <Text style={styles.annonceDate}>{formatDate(item.date + 'T' + item.heure)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => navigation.navigate('Details d\'annonce', { code: item.code })}
        >
          <MaterialCommunityIcons name="eye" size={18} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {item.photo64_annonce && item.type_annonce?.startsWith('video/') ? (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: `data:${item.type_annonce};base64,${item.photo64_annonce}` }}
            style={styles.annonceImage}
            resizeMode="cover"
            useNativeControls
            shouldPlay={false}
            onError={() => console.log('Erreur de chargement de la vidéo')}
          />
          <View style={styles.videoOverlay}>
            <MaterialIcons name="play-circle-outline" size={50} color="white" />
          </View>
        </View>
      ) : item.photo64_annonce && item.type_annonce?.startsWith('image/') ? (
        <Image
          source={{ uri: `data:${item.type_annonce};base64,${item.photo64_annonce}` }}
          style={styles.annonceImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.noImageContainer}>
          <MaterialIcons name="image" size={40} color="#E5E5EA" />
          <Text style={styles.noImageText}>Aucune image ou vidéo</Text>
        </View>
      )}

      <View style={styles.annonceContent}>
        <Text
          style={styles.annonceDescription}
          numberOfLines={expandedDescriptions[item.code] ? undefined : 2}
        >
          {item.description}
        </Text>
        {item.description?.length > 100 && (
          <TouchableOpacity onPress={() => toggleDescription(item.code)}>
            <Text style={styles.seeMoreText}>
              {expandedDescriptions[item.code] ? 'Voir moins' : 'Voir plus'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.annonceFooter}>
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="eye" size={16} color="#007AFF" />
          <Text style={styles.infoText}>{item.vues || 0} vues</Text>
        </View>
        <View style={styles.infoItem}>
          <MaterialIcons name="people" size={16} color="#007AFF" />
          <Text style={styles.infoText}>Audience : {item.quantite || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleCall(item.telephone)}>
          <MaterialIcons name="call" size={20} color="#34C759" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleSMS(item.telephone)}>
          <MaterialIcons name="message" size={20} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleWhatsApp(item.telephone)}>
          <MaterialCommunityIcons name="whatsapp" size={20} color="#25D366" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fa4447" />
        <Text style={styles.loadingText}>Chargement des annonces...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons color="#fa4447" name="access-point-off" size={150} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {data.length > 0 ? (
        <View style={styles.searchBar}>
          <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher..."
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
        data={filteredData}
        keyExtractor={(item) => item.code}
        renderItem={renderAnnonce}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          data.length > 0 ? (
            <Text style={styles.emptyText}>Aucun article trouvé pour "{searchTerm}"</Text>
          ) : (
            <Text style={styles.emptyText}>Aucune annonce disponible</Text>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#5500dc']}
            tintColor="#5500dc"
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={(data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
      />

      {user?.matricule && (
        <TouchableOpacity
          style={styles.floatingButtonRight}
          onPress={() => navigation.navigate('Mes annonces')}
        >
          <Feather name="copy" size={24} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 15,
    paddingTop: 0,
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
  annonceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  authorContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  sponsoredTag: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginTop: 2,
  },
  annonceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  annonceTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  annonceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  annonceDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  annonceImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  videoContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Semi-transparent overlay for better icon visibility
  },
  noImageContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  noImageText: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
  },
  annonceContent: {
    padding: 16,
  },
  annonceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'justify',
  },
  seeMoreText: {
    color: '#1E90FF',
    fontSize: 14,
    marginTop: 5,
    fontWeight: 'bold',
  },
  annonceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    height: 40,
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