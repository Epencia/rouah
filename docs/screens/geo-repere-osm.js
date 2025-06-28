import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Image
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlobalContext } from '../global/GlobalState';
import { GlobalCarte } from '../global/GlobalCarte';

export default function GeoRepere({ navigation }) {
  const [user] = useContext(GlobalContext);
  const [carte] = useContext(GlobalCarte);

  const [activeTab, setActiveTab] = useState('appareils');

  const [dataAppareils, setDataAppareils] = useState([]);
  const [dataFamilles, setDataFamilles] = useState([]);

  const [searchAppareil, setSearchAppareil] = useState('');
  const [searchFamille, setSearchFamille] = useState('');

  const [selectedLocation, setSelectedLocation] = useState(null);

  const webviewRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Localiser appareils & familles' });
    if (user && user.length > 0) {
      getData();
    }
  }, [user]);

  const getData = async () => {
    try {
      const resAppareils = await fetch(`https://adores.cloud/api/liste-appareil.php?matricule=${user.matricule}`);
      const appareils = await resAppareils.json();
      setDataAppareils(appareils);

      const resFamilles = await fetch(`https://adores.cloud/api/liste-famille.php?matricule=${user.matricule}`);
      const familles = await resFamilles.json();
      setDataFamilles(familles);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les données.");
    }
  };

  // Lors du clic sur un item, on cherche la localisation puis on envoie à la WebView
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

      if (parsedData.length > 0) {
        setSelectedLocation(parsedData[0]);

        // Envoyer la localisation à la WebView (script injecté)
        webviewRef.current.postMessage(JSON.stringify({
          type: 'setMarkers',
          markers: parsedData,
          center: { lat: parsedData[0].latitude, lng: parsedData[0].longitude }
        }));
      } else {
        Alert.alert('Message', 'Localisation non trouvée');
        setSelectedLocation(null);
        webviewRef.current.postMessage(JSON.stringify({ type: 'clearMarkers' }));
      }
    } catch {
      Alert.alert('Message', 'Localisation non trouvée');
      setSelectedLocation(null);
      webviewRef.current.postMessage(JSON.stringify({ type: 'clearMarkers' }));
    }
  };

  // Filtrer données en fonction de l'onglet actif pour éviter erreurs
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

  useEffect(() => {
    // Reset recherche et sélection au changement d'onglet
    setSelectedLocation(null);
    setSearchAppareil('');
    setSearchFamille('');
    webviewRef.current?.postMessage(JSON.stringify({ type: 'clearMarkers' }));
  }, [activeTab]);

  // HTML de la carte Leaflet à injecter dans la WebView
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Carte OSM</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
      <script>
        var map = L.map('map').setView([7.6717, -5.0162], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
        }).addTo(map);

        var markers = [];

        function clearMarkers() {
          markers.forEach(m => map.removeLayer(m));
          markers = [];
        }

        function addMarkers(markerData) {
          clearMarkers();
          markerData.forEach(loc => {
            const marker = L.marker([loc.latitude, loc.longitude], {
  title: loc.titre_appareil || loc.nom_prenom
}).addTo(map);


            marker.on('click', function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', data: loc }));
            });

            markers.push(marker);
          });
        }

        // Ecouter les messages venant de React Native
        document.addEventListener('message', function(event) {
          var msg = JSON.parse(event.data);
          if (msg.type === 'setMarkers') {
            addMarkers(msg.markers);
            if(msg.center) {
              map.setView([msg.center.lat, msg.center.lng], 12);
            }
          } else if(msg.type === 'clearMarkers') {
            clearMarkers();
          }
        });

        // For iOS
        window.addEventListener('message', function(event) {
          var msg = JSON.parse(event.data);
          if (msg.type === 'setMarkers') {
            addMarkers(msg.markers);
            if(msg.center) {
              map.setView([msg.center.lat, msg.center.lng], 12);
            }
          } else if(msg.type === 'clearMarkers') {
            clearMarkers();
          }
        });
      </script>
    </body>
    </html>
  `;

  // Reception des messages venant de la WebView (clic sur marker)
  const onMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'markerClick') {
        setSelectedLocation(msg.data);
      }
    } catch (e) {
      console.warn('Erreur message WebView', e);
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: leafletHTML }}
          onMessage={onMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          style={{ flex: 1 }}
        />
        {selectedLocation && (
          <View style={styles.locationInfo}>
            <Text>Nom: {activeTab === 'appareils' ? selectedLocation.titre_appareil : selectedLocation.nom_prenom}</Text>
            <Text>Longitude: {selectedLocation.longitude.toFixed(6)} - Latitude: {selectedLocation.latitude.toFixed(6)}</Text>
          </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  mapContainer: { height: '45%', borderBottomWidth: 1, borderColor: '#ccc' },
  locationInfo: {
    position: 'absolute', bottom: 10, left: 10, right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 8,
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
  markerImage: { width: 40, height: 40, borderRadius: 20 },
  emptyList: { textAlign: 'center', marginTop: 20, color: '#999' },
});
