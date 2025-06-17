import {
  SafeAreaView,
  StyleSheet,
  View,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import HTML from 'react-native-render-html';
import { MaterialCommunityIcons, Feather, Ionicons } from '@expo/vector-icons';

export default function Videos({ navigation, route }) {

  const item = route?.params?.item;

  const { width: windowWidth } = useWindowDimensions();
  const ignoredDomTags = ['o:p', 'v:shape', 'v:shapetype', 'u1:p', 'font', 'color'];

  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [descriptionVisible, setDescriptionVisible] = useState({});

  const toggleDescription = (videoId) => {
    setDescriptionVisible((prev) => ({
      ...prev,
      [videoId]: !prev[videoId],
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await getListeVideos();
    setRefreshing(false);
  };

  const getListeVideos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://adores.cloud/api/liste-video.php?code=${item.id_formation}`
      );
      const newData = await response.json();
      setData(newData);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getListeVideos2 = async () => {
    try {
      const response = await fetch(
        `https://adores.cloud/api/liste-video.php?code=${item.id_formation}`,
        {
          headers: { 'Cache-Control': 'no-cache' },
        }
      );
      const newData = await response.json();
      setData(newData);
    } catch (err) {
      setError(err);
    }
  };

  const searchItems = useMemo(() => {
    return () =>
      data.filter((item) =>
        item.titre_video.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [data, searchTerm]);

  useEffect(() => {
   
    if (navigation && item?.titre_formation) {
    navigation.setOptions({ title: item.titre_formation });
  }
    getListeVideos();
    const intervalId = setInterval(getListeVideos2, 60000); // Refresh every 1 minute
    return () => clearInterval(intervalId);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5500dc" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons color="#266EF1" name="access-point-off" size={150} />
        <Text style={styles.errorText}>Pas de connexion internet !</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderVideo = (videoId) => {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    return (
      <WebView
        style={{ height: 200, width: '100%' }}
        source={{ uri: embedUrl }}
        javaScriptEnabled
        domStorageEnabled
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {data.length > 0 ? (
        <View style={styles.searchBar}>
          <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher..."
            onChangeText={setSearchTerm}
            value={searchTerm}
          />
        </View>
      ) : (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>Aucune donnée disponible</Text>
        </View>
      )}

      <FlatList
        data={searchTerm ? searchItems() : data}
        keyExtractor={(item) => item.id_video}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            {renderVideo(item.code_video)}

            <Text style={styles.title}>{item.titre_video}</Text>

            <TouchableOpacity onPress={() => toggleDescription(item.id_video)}>
              <View style={styles.toggleButton}>
                <Ionicons
                  name={descriptionVisible[item.id_video] ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#000"
                />
                <Text style={styles.toggleButtonText}>
                  {descriptionVisible[item.id_video]
                    ? 'Masquer la description'
                    : 'Afficher la description'}
                </Text>
              </View>
            </TouchableOpacity>

            {descriptionVisible[item.id_video] && (
              <HTML
                source={{ html: item.details_video }}
                contentWidth={windowWidth}
                ignoredDomTags={ignoredDomTags}
              />
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    margin: 10,
  },
  retryButton: {
    backgroundColor: '#0099cc',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  listItem: {
    marginBottom: 15,
    padding: 10,
    borderRadius: 8,
    borderColor: '#ccc',
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginVertical: 5,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  toggleButtonText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#007BFF',
  },
  noData: {
    marginTop: 25,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 6,
    elevation: 5,
    marginBottom: 5,
  },
  noDataText: {
    color: '#888',
    textAlign: 'center',
  },
});
