import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FlatList,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = (width * 9) / 16;

// ---------------- SkeletonCard ----------------
function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={[styles.imageWrapper, { backgroundColor: '#ccc' }]} />
      <View style={styles.info}>
        <View style={[styles.skeletonTextShort, { backgroundColor: '#e0e0e0' }]} />
        <View style={[styles.skeletonTextLong, { backgroundColor: '#e0e0e0' }]} />
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
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Detail', { code: item.code, type: item.type })}
    >
      <View style={styles.imageWrapper}>
        {item.thumbnail ? (
          <Animated.Image
            source={{ uri: item.thumbnail }}
            style={[styles.image, { opacity: imageOpacity }]}
            resizeMode="cover"
            onLoad={onLoad}
          />
        ) : (
          <View style={[styles.image, styles.noImage]}>
            <Text style={styles.playText}>{item.type === 'video' ? '▶' : '•'}</Text>
          </View>
        )}
        {item.type === 'video' && item.thumbnail && (
          <View style={styles.playIcon}>
            <Text style={styles.playText}>▶</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.titre}>{item.titre}</Text>
        {item.date && item.heure && (
          <Text style={styles.date}>{item.date} {item.heure}</Text>
        )}
        <Text style={styles.categorie}>{item.categorie}</Text>
      </View>
    </TouchableOpacity>
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

  const limit = 10;

  const loadData = useCallback(
    (reset = false) => {
      if (!hasMore && !reset) return;

      const currentPage = reset ? 1 : page;
      if (currentPage === 1) setLoading(true);
      else setLoadingMore(true);

      fetch(`https://rouah.net/annonces.php?page=${currentPage}&limit=${limit}`)
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            if (reset) {
              setData(json.data);
              setFilteredData(json.data);
              setPage(2);
              setHasMore(json.data.length >= limit);
            } else {
              const newData = [...data, ...json.data];
              setData(newData);
              setFilteredData(newData);
              setPage(prev => prev + 1);
              if (json.data.length < limit) setHasMore(false);
            }
          }
        })
        .finally(() => {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        });
    },
    [page, hasMore, data]
  );

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    loadData(true);
  };

  // ---------------- Recherche ----------------
  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredData(data);
    } else {
      const filtered = data.filter(item =>
        item.titre.toLowerCase().includes(text.toLowerCase()) ||
        (item.categorie && item.categorie.toLowerCase().includes(text.toLowerCase()))
      );
      setFilteredData(filtered);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 20 }} size="large" color="#0000ff" />;
  };

  if (loading && page === 1) {
    return (
      <FlatList
        data={[...Array(5).keys()]}
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
        ListFooterComponent={renderFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

// ---------------- Styles ----------------
const styles = StyleSheet.create({
  card: {
    marginBottom: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  imageWrapper: {
    width: '100%',
    height: CARD_HEIGHT,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: { width: '100%', height: '100%' },
  noImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ccc',
  },
  playIcon: {
    position: 'absolute',
    top: '40%',
    left: '45%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 30,
    padding: 10,
  },
  playText: { fontSize: 30, color: '#fff', fontWeight: 'bold' },
  info: { padding: 10 },
  titre: { fontSize: 18, fontWeight: '700', marginBottom: 5 },
  date: { fontSize: 12, color: '#888', marginBottom: 3 },
  categorie: { fontSize: 14, color: '#555' },
  skeletonTextShort: { width: '50%', height: 15, borderRadius: 4, marginBottom: 5, overflow: 'hidden' },
  skeletonTextLong: { width: '80%', height: 15, borderRadius: 4, overflow: 'hidden' },
  fullWidth: { flex: 1 },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    margin: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
});
