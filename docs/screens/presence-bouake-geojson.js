import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Alert } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';
import * as Location from 'expo-location';

// Dimensions de l'écran
const { width, height } = Dimensions.get('window');

// Coordonnées GeoJSON de la commune de Bouaké (fermées pour former un polygone)
const communeCoordinates = [
  { longitude: -5.083845236629628, latitude: 7.674870746255067 },
  { longitude: -5.0698098155943435, latitude: 7.644880837907621 },
  { longitude: -5.049882725630027, latitude: 7.658166152334346 },
  { longitude: -5.040264203172853, latitude: 7.645193720059737 },
  { longitude: -5.030297437218877, latitude: 7.646903114375576 },
  { longitude: -5.026517546878495, latitude: 7.640093044178798 },
  { longitude: -5.013115741001997, latitude: 7.643161244435063 },
  { longitude: -5.011398137725109, latitude: 7.648274634837563 },
  { longitude: -4.996597861448265, latitude: 7.649275410434186 },
  { longitude: -4.997628782672592, latitude: 7.668694420092109 },
  { longitude: -4.969337807098384, latitude: 7.684685599451257 },
  { longitude: -4.98729930374401, latitude: 7.690835402224664 },
  { longitude: -4.973137676524033, latitude: 7.702761300046632 },
  { longitude: -4.962480272462585, latitude: 7.711968875012403 },
  { longitude: -4.966663623981873, latitude: 7.73921067430787 },
  { longitude: -4.987661587805519, latitude: 7.738851493175602 },
  { longitude: -5.0120462099638985, latitude: 7.745010160343043 },
  { longitude: -5.021344366654944, latitude: 7.736811873368765 },
  { longitude: -5.032699843522892, latitude: 7.739168099062098 },
  { longitude: -5.039574584760288, latitude: 7.7633222433952795 },
  { longitude: -5.057439953325542, latitude: 7.753767893455219 },
  { longitude: -5.067041744537335, latitude: 7.736062526857054 },
  { longitude: -5.075625318185416, latitude: 7.734703358463491 },
  { longitude: -5.073902008663197, latitude: 7.720415165330252 },
  { longitude: -5.084541843095508, latitude: 7.704770345464539 },
  { longitude: -5.098583101692441, latitude: 7.691515605404987 },
  { longitude: -5.117173888658073, latitude: 7.6870748957510955 },
  { longitude: -5.119969132387126, latitude: 7.672765141840657 },
  { longitude: -5.100700062984458, latitude: 7.671084477822063 },
  { longitude: -5.0828277876123025, latitude: 7.674160929319669 },
  { longitude: -5.083845236629628, latitude: 7.674870746255067 }, // Ferme le polygone
];

// Calculer le centroïde et les limites de la commune
const latitudes = communeCoordinates.map(coord => coord.latitude);
const longitudes = communeCoordinates.map(coord => coord.longitude);
const minLat = Math.min(...latitudes);
const maxLat = Math.max(...latitudes);
const minLon = Math.min(...longitudes);
const maxLon = Math.max(...longitudes);
const centerLat = (minLat + maxLat) / 2;
const centerLon = (minLon + maxLon) / 2;

// Ajouter une marge de 1 km (environ 0.009 degrés) autour des contours
const KM_TO_DEGREES = 1 / 111; // 1 km ≈ 0.009 degrés
const margin = 0.009; // 1 km de marge
const bouakeRegion = {
  latitude: centerLat, // Centroïde : ~7.6860
  longitude: centerLon, // Centroïde : ~-5.0265
  latitudeDelta: (maxLat - minLat) + 2 * margin, // Étendue + 1 km de chaque côté
  longitudeDelta: (maxLon - minLon) + 2 * margin,
};

// Fonction pour vérifier si un point est à l'intérieur d'un polygone (ray-casting)
const isPointInPolygon = (point, polygon) => {
  const { latitude: y, longitude: x } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude;
    const yi = polygon[i].latitude;
    const xj = polygon[j].longitude;
    const yj = polygon[j].latitude;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const App = () => {
  // États pour la géolocalisation
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isInBouake, setIsInBouake] = useState(false);
  const [statusMessage, setStatusMessage] = useState("En attente de la position...");
  const [errorMsg, setErrorMsg] = useState(null);

  // Animation pour la boîte d'informations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation de la boîte
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Configurer la géolocalisation
    let locationSubscription;
    const startLocationTracking = async () => {
      // Demander les permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission de localisation refusée');
        setStatusMessage('Permission de localisation refusée');
        Alert.alert('Permission refusée', 'L’accès à la localisation est nécessaire.');
        return;
      }

      // Suivre la position
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Mise à jour toutes les 5 secondes
          distanceInterval: 10, // Mise à jour tous les 10 mètres
        },
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });

          // Vérifier si l’utilisateur est dans Bouaké
          const isInside = isPointInPolygon({ latitude, longitude }, communeCoordinates);
          if (isInside && !isInBouake) {
            setIsInBouake(true);
            setStatusMessage('Vous êtes à Bouaké ! 🎉');
            Alert.alert('Bienvenue', 'Vous êtes à Bouaké !');
          } else if (!isInside && isInBouake) {
            setIsInBouake(false);
            setStatusMessage('Vous êtes en dehors de Bouaké.');
            Alert.alert('Sortie', 'Vous avez quitté Bouaké.');
          } else if (isInside) {
            setStatusMessage('Vous êtes à Bouaké !');
          } else {
            setStatusMessage('Vous êtes en dehors de Bouaké.');
          }
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          setErrorMsg('Erreur de géolocalisation');
          setStatusMessage('Erreur de géolocalisation');
        }
      );
    };

    startLocationTracking();

    // Nettoyage
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [isInBouake, fadeAnim]);

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Carte en fond */}
      <MapView
        style={styles.map}
        initialRegion={bouakeRegion}
        region={bouakeRegion}
        showsUserLocation={true} // Afficher la position de l’utilisateur
      >
        {/* Marqueur au centre de Bouaké */}
        <Marker
          coordinate={{ latitude: centerLat, longitude: centerLon }}
          title="Centre de Bouaké"
          description="Commune de Bouaké"
          pinColor="blue"
        />
        {/* Polygone pour les contours de la commune */}
        <Polygon
          coordinates={communeCoordinates}
          fillColor="rgba(255, 0, 0, 0.3)" // Fond rouge semi-transparent
          strokeColor="rgba(255, 0, 0, 0.8)" // Contour rouge
          strokeWidth={2}
        />
      </MapView>

      {/* Boîte d'informations animée en bas */}
      <Animated.View style={[styles.infoBox, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Bouaké, Côte d'Ivoire</Text>
        <Text style={styles.infoText}>Centre : {centerLat.toFixed(4)}, {centerLon.toFixed(4)}</Text>
        <Text style={styles.infoText}>Commune : Contours en rouge</Text>
        <Text style={styles.infoText}>Zoom : 1 km autour des contours</Text>
        {/* Boîte de statut */}
        <View style={[styles.statusBox, isInBouake ? styles.statusIn : styles.statusOut]}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  infoBox: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 6,
    textAlign: 'center',
  },
  statusBox: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  statusIn: {
    backgroundColor: '#28A745', // Vert pour "à Bouaké"
  },
  statusOut: {
    backgroundColor: '#DC3545', // Rouge pour "en dehors"
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  errorText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: '#555',
    marginTop: '50%',
  },
});

export default App;