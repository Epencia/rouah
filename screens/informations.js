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
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import YoutubePlayer from 'react-native-youtube-iframe';
import HTML from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons, Feather } from '@expo/vector-icons';

const SkeletonCard = () => (
  <View style={styles.listItem}>
    <View style={{ height: 200, backgroundColor: '#eee', borderRadius: 8 }} />
    <View style={{ height: 20, backgroundColor: '#ddd', marginVertical: 10, borderRadius: 4 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ height: 20, width: 150, backgroundColor: '#ddd', borderRadius: 4 }} />
    </View>
    <View style={{ height: 100, backgroundColor: '#eee', marginTop: 10, borderRadius: 4 }} />
  </View>
);

export default function Informations({ navigation }) {
  const { width: windowWidth } = useWindowDimensions();
  const ignoredDomTags = ['o:p', 'v:shape', 'v:shapetype', 'u1:p', 'font', 'color'];
  // State variables
  const [isLoading, setIsLoading] = useState(false);
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
    }
  };
  // Set navigation title and fetch data on mount
  useEffect(() => {
    navigation.setOptions({ title: 'Informations' });
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
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <SkeletonCard />}
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
    <SafeAreaView style={styles.container}>
      {data.length > 0 ? (
        <View style={styles.searchBar}>
          <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher..."
            onChangeText={(text) => setSearchTerm(text)}
            value={searchTerm}
          />
        </View>
      ) : (
        <View
          style={{
            marginTop: 25,
            marginRight: 15,
            marginLeft: 15,
            elevation: 5,
            backgroundColor: 'white',
            borderRadius: 6,
            marginBottom: 5,
          }}
        >
          <Text
            style={{
              marginTop: 10,
              marginRight: 15,
              marginLeft: 15,
              marginBottom: 15,
              color: '#888',
              textAlign: 'center',
            }}
          >
            Aucune donnée disponible
          </Text>
        </View>
      )}
      <FlatList
        data={searchTerm ? searchItems() : data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            {item.video && item.video.trim() !== '' ? (
              <YoutubePlayer
                height={200}
                videoId={item.video}
                onChangeState={onStateChange}
              />
            ) : null}
            <Text style={styles.NomPrenom}>{item.question}</Text>
            <TouchableOpacity onPress={() => toggleDescription(item.id)}>
              <View style={styles.toggleButton}>
                <Ionicons
                  name={descriptionVisible[item.id] ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#000"
                />
                {descriptionVisible[item.id] ? (
                  <Text style={styles.toggleButtonText}>Masquer la réponse</Text>
                ) : (
                  <Text style={styles.toggleButtonText}>Afficher la réponse</Text>
                )}
              </View>
            </TouchableOpacity>
            {descriptionVisible[item.id] && (
              <HTML source={{ html: item.reponse }} contentWidth={windowWidth} ignoredDomTags={ignoredDomTags} />
            )}
          </View>
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
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
  listItem: {
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
  },
  NomPrenom: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginVertical: 10,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  toggleButtonText: {
    fontSize: 14,
    marginLeft: 5,
    color: '#000',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -20,
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'gray',
  },
  searchIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: 40,
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