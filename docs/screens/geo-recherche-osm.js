import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GeoRecherche() {
  const [searchTerm, setSearchTerm] = useState('');
  const [data, setData] = useState([]);
  const webviewRef = useRef(null);

  const getData = async () => {
    try {
      const response = await fetch('https://adores.cloud/api/geoip-user.php');
      const result = await response.json();
      setData(result);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données.');
      console.error(error);
    }
  };

  useEffect(() => {
    getData();
  }, []);

  // Filtrer les données selon searchTerm
  const filteredData = data.filter(item =>
    (item?.nom_prenom &&
      item.nom_prenom.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item?.telephone &&
      item.telephone.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Dès que filteredData change, on envoie les données à la WebView
  useEffect(() => {
    if (webviewRef.current) {
      // On envoie un message avec les données filtrées
      webviewRef.current.postMessage(JSON.stringify({ type: 'updateMarkers', data: filteredData }));
    }
  }, [filteredData]);

  // HTML avec Leaflet et script qui écoute les messages pour mettre à jour les marqueurs
  const htmlMap = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          html, body, #map { height: 100%; margin: 0; padding: 0; }
          .leaflet-popup-content-wrapper { text-align: center; }
        </style>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
      </head>
      <body>
        <div id="map"></div>
        <script>
          (function() {
            window.map = L.map('map').setView([7.6717026, -5.0162297], 7);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
            }).addTo(window.map);

            window.markers = [];

            // Fonction pour enlever tous les marqueurs
            function clearMarkers() {
              window.markers.forEach(m => window.map.removeLayer(m));
              window.markers = [];
            }

            // Fonction pour ajouter des marqueurs
            function addMarkers(data) {
              clearMarkers();
              data.forEach(person => {
                const lat = parseFloat(person.latitude);
                const lng = parseFloat(person.longitude);
                if (!isNaN(lat) && !isNaN(lng)) {
                  const marker = L.marker([lat, lng]).addTo(window.map);
                  window.markers.push(marker);
                  const photo = person.photo64 
                    ? '<img src="data:' + person.type + ';base64,' + person.photo64 + '" width="60" height="60" style="border-radius:30px;" />' 
                    : '';
                  const popupContent = \`
                    <div style="text-align:center;">
                      \${photo}<br/>
                      <strong>\${person.nom_prenom}</strong><br/>
                      <a href="tel:\${person.telephone}">📞 Appeler</a><br/>
                      <a href="sms:\${person.telephone}">💬 SMS</a><br/>
                      <a href="https://wa.me/\${person.telephone.replace(/[^0-9]/g, '')}">💚 WhatsApp</a>
                    </div>
                  \`;
                  marker.bindPopup(popupContent);
                }
              });
            }

            // Ecoute des messages venant de React Native
            document.addEventListener('message', function(event) {
              try {
                const message = JSON.parse(event.data);
                if (message.type === 'updateMarkers') {
                  addMarkers(message.data);
                }
              } catch(e) {
                // erreur de parsing JSON
                window.ReactNativeWebView.postMessage("Erreur parsing JSON: " + e.message);
              }
            });

            // Aussi pour la compatibilité Android (WebView change parfois)
            window.addEventListener('message', function(event) {
              try {
                const message = JSON.parse(event.data);
                if (message.type === 'updateMarkers') {
                  addMarkers(message.data);
                }
              } catch(e) {
                window.ReactNativeWebView.postMessage("Erreur parsing JSON: " + e.message);
              }
            });
          })();
        </script>
      </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.searchBar}>
        <Feather name="search" size={20} color="gray" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Rechercher nom ou téléphone..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: htmlMap }}
        javaScriptEnabled={true}
        style={styles.webview}
        onMessage={evt => console.log("Message from WebView:", evt.nativeEvent.data)}
        onError={syntheticEvent => {
          const { nativeEvent } = syntheticEvent;
          console.error("WebView error: ", nativeEvent);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f0f0' },
  webview: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'gray',
    paddingHorizontal: 8,
    margin: 10,
    height: 40,
    zIndex: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
});
