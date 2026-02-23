import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubePlayer from 'react-native-youtube-iframe';
import HTML from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';

// SkeletonCard amélioré avec animation
const SkeletonCard = () => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const SkeletonItem = ({ width, height, style = {} }) => (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#E0E0E0',
          borderRadius: 4,
          marginVertical: 4,
          opacity,
        },
        style,
      ]}
    />
  );

  return (
    <View style={styles.listItem}>
      {/* Skeleton pour la vidéo */}
      <SkeletonItem width="100%" height={200} style={{ borderRadius: 8 }} />
      
      {/* Skeleton pour le titre */}
      <SkeletonItem width="80%" height={24} style={{ marginVertical: 12 }} />
      
      {/* Skeleton pour le bouton toggle */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 8 }}>
        <SkeletonItem width={20} height={20} style={{ marginRight: 8 }} />
        <SkeletonItem width={150} height={20} />
      </View>
      
      {/* Skeleton pour la description (visible par défaut) */}
      <View style={{ marginTop: 10 }}>
        <SkeletonItem width="100%" height={16} />
        <SkeletonItem width="95%" height={16} />
        <SkeletonItem width="90%" height={16} />
        <SkeletonItem width="85%" height={16} />
      </View>
    </View>
  );
};

// Skeleton pour la barre de recherche
const SearchBarSkeleton = () => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[styles.searchBarSkeleton, { opacity }]}>
      <View style={styles.searchIconSkeleton} />
      <View style={styles.searchInputSkeleton} />
    </Animated.View>
  );
};

export default function Informations({ navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const ignoredDomTags = ['o:p', 'v:shape', 'v:shapetype', 'u1:p', 'font', 'color'];
  
  // State variables
  const [isLoading, setIsLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [descriptionVisible, setDescriptionVisible] = useState({});

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await getListeInformations();
    setRefreshing(false);
  };

  // YouTube player state change handler
  const onStateChange = useCallback((state) => {
    if (state === 'ended') {
      setPlaying(false);
      Alert.alert('La lecture de la vidéo est terminée !');
    }
  }, []);

  // Toggle description visibility
  const toggleDescription = (itemId) => {
    setDescriptionVisible((prevState) => ({
      ...prevState,
      [itemId]: !prevState[itemId],
    }));
  };

  // Fetch data
  const getListeInformations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://rouah.net/api/information.php', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }
      const newData = await response.json();
      setData(newData);
      setError(null);
    } catch (error) {
      setError(error);
    } finally {
      setIsLoading(false);
      setInitialLoading(false);
    }
  };

  // Set navigation title and fetch data on mount
  useEffect(() => {
    navigation.setOptions({ title: 'Guide pratique' });
    const delay = 60000; // 1 minute
    getListeInformations();
    const intervalId = setInterval(getListeInformations, delay);
    return () => clearInterval(intervalId);
  }, []);

  // Search functionality
  const searchItems = useMemo(() => {
    return () => {
      const filteredData = data.filter((item) =>
        item.question.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return filteredData;
    };
  }, [data, searchTerm]);

  // Loading state with skeleton
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <SearchBarSkeleton />
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <SkeletonCard />}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <MaterialCommunityIcons color="#266EF1" name="access-point-off" size={150} />
        <Text style={{ fontSize: 18, marginRight: 10, marginLeft: 10, marginBottom: 10 }}>
          Pas de connexion internet !
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={{ backgroundColor: '#0099cc', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5 }}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
            Réessayer
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {data.length > 0 ? (
        <View style={styles.searchBar}>
          <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher une question..."
            placeholderTextColor="#999"
            onChangeText={(text) => setSearchTerm(text)}
            value={searchTerm}
          />
          {searchTerm !== '' && (
            <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="information-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>
            Aucune donnée disponible
          </Text>
        </View>
      )}
      
      <FlatList
        data={searchTerm ? searchItems() : data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            {item.video && item.video.trim() !== '' && (
              <View style={styles.videoContainer}>
                <YoutubePlayer
                  height={200}
                  videoId={item.video}
                  onChangeState={onStateChange}
                />
              </View>
            )}
            
            <Text style={styles.NomPrenom}>{item.question}</Text>
            
            <TouchableOpacity onPress={() => toggleDescription(item.id)} style={styles.toggleButton}>
              <Ionicons
                name={descriptionVisible[item.id] ? 'chevron-up-circle' : 'chevron-down-circle'}
                size={24}
                color="#414d63"
              />
              <Text style={styles.toggleButtonText}>
                {descriptionVisible[item.id] ? 'Masquer la réponse' : 'Afficher la réponse'}
              </Text>
            </TouchableOpacity>
            
            {descriptionVisible[item.id] && (
              <View style={styles.htmlContainer}>
                <HTML 
                  source={{ html: item.reponse }} 
                  contentWidth={windowWidth} 
                  ignoredDomTags={ignoredDomTags}
                  tagsStyles={{
                    p: { marginVertical: 8, lineHeight: 20 },
                    strong: { fontWeight: 'bold' },
                    em: { fontStyle: 'italic' },
                  }}
                />
              </View>
            )}
          </View>
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !isLoading && searchTerm !== '' ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="file-search-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>
                Aucun résultat pour "{searchTerm}"
              </Text>
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>Voir toutes les questions</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
      
      {isLoading && !refreshing && (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color="#414d63" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  listItem: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  videoContainer: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  NomPrenom: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#414d63',
    marginVertical: 12,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#414d63',
    fontWeight: '500',
  },
  htmlContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBarSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 12,
  },
  searchIcon: {
    padding: 8,
  },
  searchIconSkeleton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  searchInputSkeleton: {
    flex: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  resetButton: {
    padding: 12,
  },
  resetButtonText: {
    color: '#414d63',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  Card: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
    padding: 10,
    marginBottom: 20,
    marginRight: 15,
    width: '100%',
  },
  Info: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  Categorie: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0099cc',
    marginRight: 20,
    marginBottom: 1,
    marginTop: 1,
  },
  Photo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#C0C0C0',
    marginRight: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'blue',
    borderRadius: 20,
  },
  iconText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: 'bold',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingTop: 2,
    paddingHorizontal: 16,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    backgroundColor: '#007BFF',
    borderColor: '#007BFF',
  },
  btnSecondaryText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: 'white',
  },
  sheetHeader: {
    paddingVertical: 24,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    color: '#bcbdd9',
    marginBottom: 10,
  },
  sheetText: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000000',
    marginTop: 12,
  },
  sheetBody: {
    padding: 24,
  },
  sheetBodyOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
    marginHorizontal: -16,
  },
  sheetBodyOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
    marginHorizontal: 16,
    paddingVertical: 28,
  },
  sheetBodyOptionText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    color: '#bcbdd9',
    textAlign: 'center',
  },
  delimiter: {
    height: '100%',
    width: 1,
    backgroundColor: '#ebebf5',
  },
  sheet: {
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
});