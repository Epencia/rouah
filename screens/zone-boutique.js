import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator, Image } from 'react-native';
import Slider from '@react-native-community/slider';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function ZoneBoutique({ navigation }) {
  const [location, setLocation] = useState(null);
  const [boutiques, setBoutiques] = useState([]);
  const [range, setRange] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [allBoutiques, setAllBoutiques] = useState([]);

  // Récupérer tous les boutiques depuis l'API
  useEffect(() => {
    const fetchAllBoutiques = async () => {
      try {
        const response = await fetch('https://rouah.net/api/zone-boutique.php');
        const data = await response.json();
        setAllBoutiques(data);
      } catch (err) {
        console.error("Erreur lors de la récupération des boutiques:", err);
        setError("Impossible de charger les boutiques");
      }
    };
    fetchAllBoutiques();
  }, []);

  // Demander la permission de localisation
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission de localisation refusée');
        return;
      }
      try {
        let location = await Location.getCurrentPositionAsync({});
        setLocation(location.coords);
        const html = generateMapHTML(
          location.coords.latitude,
          location.coords.longitude,
          [],
          range
        );
        setHtmlContent(html);
        setMapLoaded(true);
      } catch (err) {
        console.error("Erreur de localisation:", err);
        setError("Impossible d'obtenir votre position");
        // Position par défaut si la géolocalisation échoue
        setLocation({ latitude: 7.6731, longitude: -5.0301 });
        const html = generateMapHTML(
          7.6731,
          -5.0301,
          [],
          range
        );
        setHtmlContent(html);
        setMapLoaded(true);
      }
    })();
  }, []);

  // Générer le HTML pour la carte OSM
  const generateMapHTML = (userLat, userLng, boutiquesData, radius) => {
    const boutiquesMarkers = boutiquesData.map(boutique => `
      const marker${boutique.code_boutique} = L.marker([${boutique.latitude_boutique}, ${boutique.longitude_boutique}], {
        icon: L.divIcon({
          className: 'boutique-marker',
          html: \`
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
            ">
              ${boutique.photo64 ?
                `<img src="data:${boutique.type};base64,${boutique.photo64}"
                  style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 2px solid white;
                    background: white;
                    object-fit: cover;
                  "/>` :
                `<img src="https://via.placeholder.com/32"
                  style="
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: 2px solid white;
                    background: white;
                    object-fit: cover;
                  "/>`
              }
              <div style="
                background: white;
                color: #1E90FF;
                padding: 2px 6px;
                border-radius: 12px;
                margin-top: 4px;
                font-size: 10px;
                font-weight: bold;
                white-space: nowrap;
              ">${boutique.nom_boutique}</div>
            </div>
          \`,
          iconSize: [40, 50]
        })
      }).addTo(map);
     
      marker${boutique.code_boutique}.bindPopup(\`
        <div style="min-width: 200px">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            ${boutique.photo64 ?
              `<img src="data:${boutique.type};base64,${boutique.photo64}"
                style="width: 40px; height: 40px; border-radius: 50%; margin-right: 8px;"/>` :
              `<img src="https://via.placeholder.com/40"
                style="width: 40px; height: 40px; border-radius: 50%; margin-right: 8px;"/>`
            }
            <div>
              <h3 style="margin: 0; color: #1E90FF;">${boutique.nom_boutique}</h3>
              <p style="margin: 0; font-size: 12px; color: #666;">${boutique.titre_categorie || 'Boutique'}</p>
            </div>
          </div>
          <p style="margin: 4px 0; font-size: 13px;">
            <b>Adresse:</b> ${boutique.adresse_boutique || 'Non renseignée'}
          </p>
          <p style="margin: 4px 0; font-size: 13px;">
            <b>Téléphone:</b> ${boutique.telephone_societe || 'Non renseigné'}
          </p>
          <button onclick="window.ReactNativeWebView.postMessage('${boutique.code_boutique}')"
            style="
              background: #1E90FF;
              color: white;
              border: none;
              padding: 8px 12px;
              border-radius: 4px;
              margin-top: 8px;
              width: 100%;
              cursor: pointer;
            ">
            Voir détails
          </button>
        </div>
      \`);
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Carte Boutiques</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
            #map { height: 100%; width: 100%; }
            .leaflet-popup-content { margin: 12px 15px !important; }
            .leaflet-popup-content-wrapper { border-radius: 8px !important; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const map = L.map('map', {
              zoomControl: true,
              dragging: true,
              touchZoom: true
            }).setView([${userLat}, ${userLng}], 13);
           
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; OpenStreetMap'
            }).addTo(map);
            L.circle([${userLat}, ${userLng}], {
              color: '#1E90FF',
              fillColor: '#1E90FF',
              fillOpacity: 0.1,
              radius: ${radius * 1000}
            }).addTo(map);
            L.marker([${userLat}, ${userLng}], {
              icon: L.divIcon({
                className: 'user-marker',
                html: '<div style="background-color: #1E90FF; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; color: white; font-weight: bold;">U</div>'
              })
            }).addTo(map).bindPopup("<b>Votre position</b>");
            ${boutiquesMarkers}
          </script>
        </body>
      </html>
    `;
  };

  // Récupérer les boutiques dans le rayon
  const fetchBoutiquesInRange = async () => {
    if (!location || !allBoutiques.length) return;
    setIsLoading(true);
   
    try {
      const filteredBoutiques = allBoutiques.filter(boutique => {
        // Vérifier que les coordonnées sont valides
        if (!boutique.latitude_boutique || !boutique.longitude_boutique) return false;
       
        return calculateDistance(
          location.latitude,
          location.longitude,
          parseFloat(boutique.latitude_boutique),
          parseFloat(boutique.longitude_boutique)
        ) <= range;
      });
      setBoutiques(filteredBoutiques);
      const html = generateMapHTML(
        location.latitude,
        location.longitude,
        filteredBoutiques,
        range
      );
      setHtmlContent(html);
    } catch (err) {
      console.error("Erreur lors du filtrage des boutiques:", err);
      setError("Erreur lors de la recherche des boutiques");
    } finally {
      setIsLoading(false);
    }
  };

  // Calcul simplifié de distance entre 2 points (formule haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    if (message) {
      navigation.navigate('Prestations', { item: message });
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            setError(null);
            setMapLoaded(false);
          }}
        >
          <Text style={styles.buttonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!mapLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>Chargement de la carte...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <WebView
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          mixedContentMode="always"
          onMessage={handleWebViewMessage}
          onError={(syntheticEvent) => {
            console.warn('WebView error:', syntheticEvent.nativeEvent);
            setError("Erreur lors du chargement de la carte");
          }}
        />
      </View>
      <View style={styles.controlsContainer}>
        <Text style={styles.rangeText}>Rayon: {range} km</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={50}
          step={1}
          value={range}
          onValueChange={setRange}
          minimumTrackTintColor="#1E90FF"
          maximumTrackTintColor="#d3d3d3"
          thumbTintColor="#1E90FF"
        />
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={fetchBoutiquesInRange}
          disabled={isLoading || !allBoutiques.length}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {allBoutiques.length ? 'Rechercher boutiques' : 'Chargement des boutiques...'}
            </Text>
          )}
        </TouchableOpacity>
        {boutiques.length > 0 && (
          <Text style={styles.resultsText}>
            {boutiques.length} boutique(s) trouvée(s) dans un rayon de {range} km
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  mapContainer: {
    height: height * 0.55,
    width: '100%',
  },
  webview: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  rangeText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '500',
    color: '#333',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#fa4447',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  buttonDisabled: {
    backgroundColor: '#a0a0a0',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsText: {
    marginTop: 15,
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
    marginBottom: 20,
  },
  image: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
  },
});