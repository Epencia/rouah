import React, { useEffect, useState, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Image
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';
import { GlobalCarte } from '../global/GlobalCarte';

export default function GeoAppareil({ navigation }) {
  const [user] = useContext(GlobalContext);
  const [carte] = useContext(GlobalCarte);

  const [region, setRegion] = useState({
    latitude: 7.6717026,
    longitude: -5.0162297,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const [activeTab, setActiveTab] = useState('appareils');

  const [dataAppareils, setDataAppareils] = useState([]);
  const [dataFamilles, setDataFamilles] = useState([]);
  const [searchAppareil, setSearchAppareil] = useState('');
  const [searchFamille, setSearchFamille] = useState('');
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Localiser appareils & familles' });
    if (user && user.length > 0) {
      getData();
    }
  }, [user]);

  const getData = async () => {
    try {
      const resAppareils = await fetch(`https://adores.cloud/api/liste-appareil.php?matricule=${user[0].matricule}`);
      const appareils = await resAppareils.json();
      setDataAppareils(appareils);

      const resFamilles = await fetch(`https://adores.cloud/api/liste-famille.php?matricule=${user[0].matricule}`);
      const familles = await resFamilles.json();
      setDataFamilles(familles);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les données.");
    }
  };

  const afficherLocalisation = async (id) => {
    try {
      const res = await fetch(`https://adores.cloud/api/geoip-recherche.php?matricule=${encodeURIComponent(id)}`);
      const data = await res.json();

      const parsedData = data.map(loc => ({
        ...loc,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        color: loc.couleur || 'red',
      }));

      setSearchedLocation(parsedData);
      if (parsedData.length > 0) {
        const { latitude, longitude } = parsedData[0];
        setRegion(prev => ({ ...prev, latitude, longitude }));
        setSelectedLocation(null); // reset selected marker on new search
      } else {
        setSelectedLocation(null);
      }
    } catch {
      Alert.alert('Message', 'Localisation non trouvée');
      setSearchedLocation(null);
      setSelectedLocation(null);
    }
  };

  const renderItem = (item) => (
    <TouchableOpacity
      onPress={() => activeTab === 'appareils'
        ? afficherLocalisation(item.code_appareil)
        : afficherLocalisation(item.matricule)}
      style={styles.experienceItem}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={[styles.cardIcon, { backgroundColor: "white" }]}>
          {activeTab === 'appareils' ? (
            <MaterialCommunityIcons color="blue" name="laptop" size={35} />
          ) : (
            item.photo64 ? (
              <Image
                source={{ uri:`data:${item.type};base64,${item.photo64}` }}
                style={styles.markerImage}
              />
            ) : (
              <Image
                source={require('../assets/user.jpg')}
                style={styles.markerImage}
              />
            )
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{activeTab === 'appareils' ? item.titre_appareil : item.nom_prenom}</Text>
          <Text style={styles.userCode}>{activeTab === 'appareils' ? item.reference_appareil : item.telephone}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Filtrer données en fonction de l'onglet actif pour éviter les erreurs
  const filterData = (data, keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    if (activeTab === 'appareils') {
      return data.filter(item =>
        (item.code_appareil?.toLowerCase() || '').includes(lowerKeyword) ||
        (item.titre_appareil?.toLowerCase() || '').includes(lowerKeyword) ||
        (item.reference_appareil?.toLowerCase() || '').includes(lowerKeyword)
      );
    } else {
      return data.filter(item =>
        (item.nom_prenom?.toLowerCase() || '').includes(lowerKeyword) ||
        (item.telephone?.toLowerCase() || '').includes(lowerKeyword)
      );
    }
  };

  // Reset search and selections when tab changes
  useEffect(() => {
    setSelectedLocation(null);
    setSearchedLocation(null);
    setSearchAppareil('');
    setSearchFamille('');
  }, [activeTab]);

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView style={styles.map} region={region}>
          {/* Tile OpenStreetMap */}
          <UrlTile
            urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />

          {searchedLocation?.map((loc, i) => (
            <Marker
              key={i.toString()}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              title={activeTab === 'appareils' ? loc.titre_appareil : loc.nom_prenom}
              pinColor={loc.color}
              onPress={() => setSelectedLocation(loc)}
            />
          ))}
        </MapView>
        {selectedLocation && (
          <Text style={styles.ipAddress}>
            Longitude: {selectedLocation.longitude} - Latitude: {selectedLocation.latitude}
          </Text>
        )}
      </View>

      {/* Onglets */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('appareils')}
          style={[styles.tab, activeTab === 'appareils' && styles.activeTab]}
        >
          <Text style={styles.tabText}>Appareils</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('familles')}
          style={[styles.tab, activeTab === 'familles' && styles.activeTab]}
        >
          <Text style={styles.tabText}>Familles</Text>
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      <TextInput
        style={styles.searchInput}
        placeholder={`Rechercher dans ${activeTab === 'appareils' ? 'appareils' : 'familles'}...`}
        value={activeTab === 'appareils' ? searchAppareil : searchFamille}
        onChangeText={(text) => activeTab === 'appareils' ? setSearchAppareil(text) : setSearchFamille(text)}
      />

      {/* Liste */}
      <FlatList
        data={activeTab === 'appareils' ? filterData(dataAppareils, searchAppareil) : filterData(dataFamilles, searchFamille)}
        keyExtractor={(item) => (
          (activeTab === 'appareils' ? item.code_appareil : item.matricule)?.toString() || Math.random().toString()
        )}
        renderItem={({ item }) => renderItem(item)}
        ListEmptyComponent={<Text style={styles.emptyList}>Aucun résultat</Text>}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  mapContainer: { height: '45%' },
  map: { ...StyleSheet.absoluteFillObject },
  ipAddress: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(255,255,255,0.8)', padding: 10, borderRadius: 5,
  },
  tabBar: {
    flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f1f1f1',
  },
  tab: {
    flex: 1, padding: 10, alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2, borderBottomColor: '#007BFF',
  },
  tabText: {
    fontSize: 16, fontWeight: 'bold',
  },
  searchInput: {
    backgroundColor: '#eee', padding: 10, margin: 10, borderRadius: 8,
  },
  experienceItem: {
    marginHorizontal: 10, marginVertical: 5, backgroundColor: 'white',
    borderRadius: 8, borderWidth: 1, borderColor: '#ccc', padding: 12,
  },
  cardIcon: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold' },
  userCode: { fontSize: 14, color: '#666' },
  emptyList: {
    textAlign: 'center', color: '#999', marginTop: 20,
  },
  markerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
