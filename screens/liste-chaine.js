import React, { useEffect, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

const screenWidth = Dimensions.get('window').width;

const SkeletonCard = () => (
  <View style={styles.scrollableListItem}>
    <View style={[styles.imageThumbnail, styles.skeletonImage]} />
    <View style={styles.skeletonText} />
  </View>
);

export default function Chaines({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
    setRefreshing(false);
  };

  useEffect(() => {
    navigation.setOptions({ title: 'Catalogues' });
    const delay = 10000; // 10 seconds
    fetchData();
    const intervalId = setInterval(fetchData2, delay);
    return () => clearInterval(intervalId);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://rouah.net/api/liste-chaine.php', {
        headers: {
          // 'Cache-Control': 'no-cache',
        },
      });
      const newData = await response.json();
      setData(newData);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setError(error);
    }
  };

  const fetchData2 = async () => {
    try {
      const response = await fetch('https://rouah.net/api/liste-chaine.php', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const newData = await response.json();
      setData(newData);
    } catch (error) {
      setError(error);
    }
  };

  const searchItems = useMemo(() => {
    return () => {
      const filteredData = data.filter((item) =>
        item.nom_prenom.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return filteredData;
    };
  }, [data, searchTerm]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.searchBar}>
          <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Rechercher..."
            editable={false}
            value=""
          />
        </View>
        <FlatList
          data={Array(9).fill({})} // Show 9 skeleton cards
          keyExtractor={(_, index) => index.toString()}
          renderItem={() => <SkeletonCard />}
          numColumns={3}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'white',
        }}
      >
        <MaterialCommunityIcons
          color="#fa4447"
          name="access-point-off"
          size={150}
        />
        <Text
          style={{
            fontSize: 18,
            marginRight: 10,
            marginLeft: 10,
            marginBottom: 10,
          }}
        >
          Pas de connexion internet !
        </Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={{
            backgroundColor: '#fa4447',
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 5,
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: 16,
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            Réessayer
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        keyExtractor={(item, index) => item.utilisateur_id || index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.scrollableListItem}
            onPress={() => navigation.navigate('Produits', { item })}
          >
            {item.user_photo ? (
              <Image
                style={styles.imageThumbnail}
                source={{ uri: `data:${item.user_type};base64,${item.user_photo}` }}
              />
            ) : (
              <Image
                style={styles.imageThumbnail}
                source={require('../assets/logo.png')}
              />
            )}
            <Text style={styles.DoctorCategorie} llipsizeMode="tail" numberOfLines={2}>{item.nom_prenom}</Text>
          </TouchableOpacity>
        )}
        numColumns={3}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  imageThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#C0C0C0',
  },
  skeletonImage: {
    backgroundColor: '#E0E0E0',
  },
  skeletonText: {
    width: 80,
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginTop: 5,
  },
  DoctorCategorie: {
    fontSize: 12,
    paddingHorizontal: 15,
    padding: 5,
    color: '#414d63',
    textAlign: 'center',
    width: 100,
    fontWeight: 'bold',
  },
  scrollableListItem: {
    flexDirection: 'column',
    paddingVertical: 15,
    backgroundColor: 'white',
    marginRight: 10,
    marginBottom: 10,
    alignItems: 'center',
    width: screenWidth / 3.4,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
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
});