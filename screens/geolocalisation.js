import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, Alert, Image, ActivityIndicator
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlobalContext } from '../global/GlobalState';

export default function Geolocalisation({ navigation }) {
  const [user] = useContext(GlobalContext);
  const [dataFamilles, setDataFamilles] = useState([]);
  const [searchFamille, setSearchFamille] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const webviewRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Localiser un membre' });
    if (user?.matricule) {
      getData();
    }
  }, [user]);

  const getData = async () => {
    setLoading(true);
    try {
      const resFamilles = await fetch(
        `https://rouah.net/api/liste-famille.php?matricule=${user.matricule}`
      );
      const familles = await resFamilles.json();
      setDataFamilles(familles);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les données.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const afficherLocalisation = async (id) => {
    if (!id) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `https://rouah.net/api/recherche-geo.php?matricule=${encodeURIComponent(id)}`
      );
      const data = await res.json();

      if (!data || data.length === 0) {
        throw new Error('Aucune donnée de localisation');
      }

      const parsedData = data.map(loc => ({
        ...loc,
        latitude: parseFloat(loc.latitude),
        longitude: parseFloat(loc.longitude),
        color: loc.couleur || 'red',
      }));

      setSelectedLocation(parsedData[0]);

      webviewRef.current?.postMessage(JSON.stringify({
        type: 'setMarkers',
        markers: parsedData,
        center: { 
          lat: parsedData[0].latitude, 
          lng: parsedData[0].longitude 
        }
      }));
    } catch (error) {
      Alert.alert('Erreur', 'Localisation non trouvée');
      console.error(error);
      setSelectedLocation(null);
      webviewRef.current?.postMessage(JSON.stringify({ type: 'clearMarkers' }));
    } finally {
      setLoading(false);
    }
  };

  const filterData = (data, keyword) => {
    if (!keyword) return data;
    const lowerKeyword = keyword.toLowerCase();
    return data.filter(item =>
      (item.nom_prenom?.toLowerCase() || '').includes(lowerKeyword) ||
      (item.telephone?.toLowerCase() || '').includes(lowerKeyword)
    );
  };

  const onMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      console.log('Message from WebView:', msg);
      if (msg.type === 'markerClick') {
        setSelectedLocation(msg.data);
      }
    } catch (e) {
      console.warn('Erreur message WebView', e);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => afficherLocalisation(item.matricule)}
      style={styles.experienceItem}
      disabled={loading}
    >
      <View style={styles.itemContainer}>
        <View style={styles.cardIcon}>
          {item.photo64 ? (
            <Image
              source={{ uri: `data:${item.type};base64,${item.photo64}` }}
              style={styles.markerImage}
            />
          ) : (
            <Image
              source={require('../assets/user.jpg')}
              style={styles.markerImage}
              resizeMode="contain"
            />
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.nom_prenom}</Text>
          <Text style={styles.userCode}>{item.telephone}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredData = filterData(dataFamilles, searchFamille);

  const leafletHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Carte OSM</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; background-color: #f0f0f0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
  <script>
    // Initialisation avec coordonnées par défaut (Abidjan)
    var map = L.map('map', { zoomControl: true }).setView([5.3599, -4.0083], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      detectRetina: true
    }).addTo(map);

    var markers = [];
    var currentPopup = null;

    function clearMarkers() {
      markers.forEach(marker => {
        map.removeLayer(marker);
        if (currentPopup) {
          currentPopup.remove();
          currentPopup = null;
        }
      });
      markers = [];
    }

    function addMarkers(markerData) {
      clearMarkers();
      markerData.forEach(loc => {
        var marker = L.marker([loc.latitude, loc.longitude], {
          title: loc.nom_prenom || 'Localisation',
          riseOnHover: true
        }).addTo(map);
        
        var popupContent = \`<b>\${loc.nom_prenom || 'Localisation'}</b><br>
                            <small>Lat: \${loc.latitude.toFixed(6)}<br>
                            Lng: \${loc.longitude.toFixed(6)}</small>\`;
        
        marker.bindPopup(popupContent);
        
        marker.on('popupopen', function() {
          currentPopup = this.getPopup();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerClick',
            data: loc
          }));
        });

        markers.push(marker);
      });
      
      if (markerData.length > 0) {
        map.setView([markerData[0].latitude, markerData[0].longitude], 15);
      }
    }

    // Gestion des messages pour Android
    document.addEventListener('message', function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'setMarkers') {
          addMarkers(msg.markers);
        } else if (msg.type === 'clearMarkers') {
          clearMarkers();
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    });

    // Gestion des messages pour iOS
    window.addEventListener('message', function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'setMarkers') {
          addMarkers(msg.markers);
        } else if (msg.type === 'clearMarkers') {
          clearMarkers();
        }
      } catch (e) {
        console.error('Error processing message:', e);
      }
    });

    // Test initial
    setTimeout(function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapLoaded',
        message: 'Carte prête'
      }));
    }, 1000);
  </script>
</body>
</html>
`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          source={{ html: leafletHTML, baseUrl: '' }}
          mixedContentMode="always"
          onMessage={onMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          style={styles.webview}
          onLoadEnd={() => console.log('WebView loaded')}
          onError={(error) => console.error('WebView error:', error)}
          onHttpError={(error) => console.error('WebView HTTP error:', error)}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007BFF" />
            </View>
          )}
          startInLoadingState={true}
        />
        {selectedLocation && (
          <View style={styles.locationInfo}>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Nom: </Text>
              {selectedLocation.nom_prenom || 'Inconnu'}
            </Text>
            <Text style={styles.infoText}>
              <Text style={styles.infoLabel}>Coordonnées: </Text>
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tabBar}>
        <Text style={styles.tabText}>Liste des membres</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Rechercher un membre..."
        placeholderTextColor="#999"
        value={searchFamille}
        onChangeText={setSearchFamille}
      />

      {loading && !filteredData.length ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.matricule}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyList}>Aucun membre trouvé</Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'white' 
  },
  mapContainer: { 
    height: 350,  // Hauteur fixe pour la carte
    zIndex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  locationInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    marginVertical: 2,
    color: '#333',
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#007BFF',
  },
  tabBar: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    margin: 10,
    borderRadius: 8,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  experienceItem: {
    marginHorizontal: 10,
    marginVertical: 5,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  userCode: {
    fontSize: 14,
    color: '#666',
  },
  markerImage: {
    width: '100%',
    height: '100%',
  },
  emptyList: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  testButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#007BFF',
  },
});