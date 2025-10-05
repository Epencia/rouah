import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlatList,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = (width * 9) / 16;

// ---------------- SkeletonCard ----------------
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.header, { padding: 10 }]}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#ccc', marginRight: 10 }} />
        <View style={{ flex: 1 }}>
          <View style={{ width: '50%', height: 10, backgroundColor: '#e0e0e0', marginBottom: 5 }} />
          <View style={{ width: '30%', height: 10, backgroundColor: '#e0e0e0' }} />
        </View>
      </View>
      <View style={{ padding: 10 }}>
        <View style={{ width: '80%', height: 15, backgroundColor: '#e0e0e0', marginBottom: 5 }} />
        <View style={{ width: '100%', height: CARD_HEIGHT, backgroundColor: '#ccc' }} />
      </View>
    </View>
  );
}

// ---------------- AnnonceItem ----------------
function AnnonceItem({ item, navigation }) {
  const imageOpacity = useRef(new Animated.Value(0)).current;

  const onLoad = () => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.card}>
      {/* Header: photo + nom + date */}
      <View style={styles.header}>
        <Image
          source={item.user_photo ? { uri: item.user_photo } : require('../assets/logo.png')}
          style={styles.userPhoto}
        />
        <View>
          <Text style={styles.userName}>{item.nom_prenom || 'Utilisateur'}</Text>
          <Text style={styles.date}>{item.date} {item.heure}</Text>
        </View>
      </View>

      {/* Contenu */}
      <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
        {item.titre ? <Text style={styles.titre}>{item.titre}</Text> : null}
        {item.description ? <Text style={styles.description}>{item.description}</Text> : null}

        {item.photo ? (
          <Animated.Image
            source={{ uri: item.photo }}
            style={[styles.image, { opacity: imageOpacity }]}
            resizeMode="cover"
            onLoad={onLoad}
          />
        ) : null}

        <View style={styles.footer}>
          {item.categorie ? <Text style={styles.categorie}>{item.categorie}</Text> : null}
          {item.prix ? <Text style={styles.prix}>{item.vues} vues</Text> : null}
        </View>
      </View>
    </View>
  );
}

// ---------------- Feed Component ----------------
export default function Feed({ navigation }) {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [error, setError] = useState('');

  const limit = 2;

  const loadData = useCallback((reset = false) => {
    if (!hasMore && !reset) return;

    const currentPage = reset ? 1 : page;
    if (currentPage === 1) setLoading(true);
    else setLoadingMore(true);

    fetch(`https://rouah.net/annonces.php?page=${currentPage}&limit=${limit}`)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          const newData = reset ? json.data : [...data, ...json.data];
          setData(newData);
          setFilteredData(newData);
          setPage(reset ? 2 : page + 1);
          setHasMore(json.data.length >= limit);
          setError('');
        } else {
          setError('Erreur de chargement des annonces.');
        }
      })
      .catch(() => setError('Impossible de se connecter au serveur.'))
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      });
  }, [page, hasMore, data]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    loadData(true);
  };

  const handleRefresh = () => {
    setError('');
    onRefresh();
  };

  const handleSearch = (text) => {
    setSearchText(text);
    if (!text.trim()) {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item =>
        (item.titre && item.titre.toLowerCase().includes(text.toLowerCase())) ||
        (item.categorie && item.categorie.toLowerCase().includes(text.toLowerCase())) ||
        (item.nom_prenom && item.nom_prenom.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredData(filtered);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#fa4447" />;
  };

  // Affichage erreur
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

  if (loading && page === 1) {
    return (
      <FlatList
        data={[...Array(2).keys()]}
        keyExtractor={(_, index) => `skeleton-${index}`}
        renderItem={() => <SkeletonCard />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Barre de recherche */}
      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher une annonce..."
        value={searchText}
        onChangeText={handleSearch}
      />

      <FlatList
        data={filteredData}
        keyExtractor={item => item.code}
        renderItem={({ item }) => <AnnonceItem item={item} navigation={navigation} />}
        onEndReached={() => loadData()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginVertical: 8,
    marginHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  userPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#ccc',
  },
  userName: { fontWeight: '700', fontSize: 14 },
  date: { fontSize: 12, color: '#888' },
  titre: { fontSize: 16, fontWeight: '600', marginBottom: 5 },
  description: { fontSize: 14, marginBottom: 10, color: '#555' },
  image: { width: '100%', height: CARD_HEIGHT, backgroundColor: '#eee', borderRadius: 8 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  categorie: { fontSize: 12, color: '#888' },
  prix: { fontSize: 12, fontWeight: '700' },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    margin: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#fa4447',
    textAlign: 'center',
    marginVertical: 20,
  },
  retryButton: {
    backgroundColor: '#fa4447',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
