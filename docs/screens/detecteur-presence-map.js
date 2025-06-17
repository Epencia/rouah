import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Button, Animated, Dimensions, Easing, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Définition des Constantes Globales ---

// Coordonnées GPS du lieu de travail (à remplacer par les vraies coordonnées de votre bureau)
const WORK_LOCATION = {
  latitude: 7.6717097, // Latitude de Bouaké, Côte d'Ivoire (exemple)
  longitude: -5.0168504, // Longitude de Bouaké, Côte d'Ivoire (exemple)
};

// Rayon de détection en mètres autour du lieu de travail
const DETECTION_RADIUS_METERS = 10;

// Dimensions de la fenêtre pour les calculs d'animation
const { width, height } = Dimensions.get('window');

// --- Fonctions Utilitaires ---

/**
 * Affiche une boîte de dialogue d'alerte simple.
 * @param {string} title Titre de l'alerte.
 * @param {string} message Message de l'alerte.
 */
const messageBox = (title, message) => {
  Alert.alert(title, message);
};

/**
 * Calcule la distance géodésique entre deux points GPS en mètres (formule de Haversine).
 * @param {number} lat1 Latitude du premier point.
 * @param {number} lon1 Longitude du premier point.
 * @param {number} lat2 Latitude du second point.
 * @param {number} lon2 Longitude du second point.
 * @returns {number} La distance entre les deux points en mètres.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Rayon moyen de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180; // Latitude du point 1 en radians
  const φ2 = (lat2 * Math.PI) / 180; // Latitude du point 2 en radians
  const Δφ = ((lat2 - lat1) * Math.PI) / 180; // Différence de latitude en radians
  const Δλ = ((lon2 - lon1) * Math.PI) / 180; // Différence de longitude en radians

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance résultante en mètres
};

// --- Composant WaveEmitter (Animation d'ondes radar) ---
const WaveEmitter = ({
  color = '#007bff', // Couleur des ondes (hex)
  initialRadius = 20, // Rayon de départ de chaque onde (pixels)
  maxRadius = Math.min(width, height) * 0.3, // Rayon maximal de l'onde (pixels)
  duration = 2000, // Durée d'une animation d'onde (ms)
  numberOfWaves = 4, // Nombre d'ondes affichées simultanément
  borderWidth = 3, // Épaisseur du contour de l'onde
  fillOpacity = 0.05, // Opacité de remplissage de l'onde
  isActive = true, // Si true, l'animation est en cours; sinon, elle est statique
  style // Permet de passer des styles supplémentaires au conteneur principal de l'émetteur
}) => {
  // `animatedValues` stocke un Animated.Value pour chaque onde
  const animatedValues = useRef(Array.from({ length: numberOfWaves }, () => new Animated.Value(0))).current;
  // `loopAnimation` stocke l'instance de l'animation en boucle
  const loopAnimation = useRef(null);

  useEffect(() => {
    // Fonction helper pour créer une animation de fading/scaling pour une seule onde
    const createAnimation = (animatedValue, delay) => {
      animatedValue.setValue(0); // Réinitialise la valeur animée au début
      return Animated.timing(animatedValue, {
        toValue: 1, // Anime de 0 à 1
        duration: duration, // Durée de l'animation de l'onde
        easing: Easing.out(Easing.ease), // Effet d'accélération/décélération
        delay: delay, // Délai avant le début de cette onde spécifique
        useNativeDriver: true, // Utilise le pilote natif pour de meilleures performances (GPU)
      });
    };

    if (isActive) {
      // Si l'animation est active, configure et démarre l'animation en boucle
      const animations = animatedValues.map((val, index) =>
        createAnimation(val, (duration / numberOfWaves) * index)
      );
      // Anime toutes les ondes en parallèle et répète la séquence
      loopAnimation.current = Animated.loop(Animated.parallel(animations));
      loopAnimation.current.start();
    } else {
      // Si l'animation n'est pas active, l'arrête et réinitialise les valeurs animées
      if (loopAnimation.current) {
        loopAnimation.current.stop();
      }
      animatedValues.forEach(val => val.setValue(0)); // Ramène les ondes à leur état initial (invisible)
    }

    // Fonction de nettoyage : s'exécute quand le composant est démonté ou quand `isActive` change
    return () => {
      if (loopAnimation.current) {
        loopAnimation.current.stop(); // Arrête l'animation en cours
      }
      animatedValues.forEach(val => val.stopAnimation()); // Arrête toutes les animations individuelles
    };
  }, [duration, numberOfWaves, isActive]); // Re-déclenche l'effet si ces props changent

  // Calcule le diamètre initial de base pour tous les cercles d'onde
  const baseCircleDiameter = initialRadius * 2;

  return (
    // Le style `style` passé en prop est appliqué ici au conteneur principal de l'émetteur
    <View style={[styles.waveContainer, style]}>
      {/* Rend chaque onde animée */}
      {animatedValues.map((animatedValue, index) => {
        // Interpolation pour agrandir l'onde de `initialRadius` à `maxRadius`
        const scale = animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, maxRadius / initialRadius],
        });

        // Interpolation pour faire disparaître l'onde progressivement
        const opacity = animatedValue.interpolate({
          inputRange: [0, 0.7, 1], // Disparaît plus rapidement vers la fin
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp', // Empêche les valeurs d'aller au-delà de 0 ou 1
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.waveCircle,
              {
                width: baseCircleDiameter,
                height: baseCircleDiameter,
                borderRadius: baseCircleDiameter / 2, // Pour un cercle parfait
                opacity: opacity,
                transform: [{ scale: scale }], // Applique l'animation de mise à l'échelle
                borderColor: color, // Couleur du contour de l'onde
                borderWidth: borderWidth, // Épaisseur du contour
                // Couleur de remplissage de l'onde avec l'opacité spécifiée
                backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${fillOpacity})`,
              },
            ]}
          />
        );
      })}
      {/* Point central des ondes (représente la source de l'émission) */}
      <View style={[styles.centerDot, { backgroundColor: color }]} />
    </View>
  );
};

// --- Composant Principal de l'Application ---
export default function App() {
  // États pour gérer l'état de l'application
  const [currentLocation, setCurrentLocation] = useState(null); // Position GPS actuelle de l'employé
  const [hasArrived, setHasArrived] = useState(false); // Indique si l'employé est arrivé au travail
  const [statusMessage, setStatusMessage] = useState("En attente de la position..."); // Message d'état affiché
  const [distanceToWork, setDistanceToWork] = useState(null); // Distance au lieu de travail
  // Nouvel état pour contrôler la visibilité du bloc d'informations détaillées
  const [showInfoDetails, setShowInfoDetails] = useState(false);

  // Effet de bord pour gérer les permissions de localisation et le suivi en temps réel
  useEffect(() => {
    let locationSubscription; // Variable pour stocker l'abonnement au suivi de localisation

    const startLocationTracking = async () => {
      // 1. Demander la permission d'accéder à la localisation en premier plan
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        messageBox(
          "Permission refusée",
          "L'accès à la localisation est nécessaire pour vérifier l'arrivée au travail."
        );
        setStatusMessage("Permission de localisation refusée.");
        return; // Arrête la fonction si la permission n'est pas accordée
      }

      // 2. Observer la position de l'utilisateur en temps réel
      // watchPositionAsync fournit des mises à jour continues de la position
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation, // Précision maximale pour la navigation
          timeInterval: 5000, // Mettre à jour la position toutes les 5 secondes
          distanceInterval: 1, // Ou si la position change d'au moins 1 mètre
        },
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude }); // Met à jour la position actuelle

          // Calculer la distance de l'employé au lieu de travail
          const distance = calculateDistance(
            latitude,
            longitude,
            WORK_LOCATION.latitude,
            WORK_LOCATION.longitude
          );
          setDistanceToWork(distance.toFixed(2)); // Met à jour et formate la distance

          // Vérifier si l'employé est dans la zone de détection
          const isWithinRadius = distance <= DETECTION_RADIUS_METERS;

          if (isWithinRadius && !hasArrived) {
            // L'employé vient d'arriver : met à jour l'état et affiche une alerte
            setHasArrived(true);
            setStatusMessage("Arrivé au travail ! 🎉");
            messageBox("Arrivée", "Vous êtes bien arrivé à votre lieu de travail.");
          } else if (!isWithinRadius && hasArrived) {
            // L'employé a quitté le lieu de travail : met à jour l'état et affiche une alerte
            setHasArrived(false);
            setStatusMessage("Hors du lieu de travail.");
            messageBox("Départ", "Vous avez quitté votre lieu de travail.");
          } else if (isWithinRadius && hasArrived) {
            // L'employé est toujours au travail
            setStatusMessage("Toujours au travail.");
          } else {
            // L'employé est toujours hors du lieu de travail
            setStatusMessage("Hors du lieu de travail.");
          }
        },
        (error) => {
          // Gérer les erreurs de géolocalisation
          console.error("Erreur de géolocalisation:", error);
          setStatusMessage("Erreur de géolocalisation: " + error.message);
        }
      );
    };

    // Lance le suivi de la localisation au montage du composant
    startLocationTracking();

    // Fonction de nettoyage : s'exécute au démontage du composant pour arrêter le suivi GPS
    return () => {
      if (locationSubscription) {
        locationSubscription.remove(); // Désabonne du suivi de localisation
      }
    };
  }, [hasArrived]); // L'effet se re-déclenche si `hasArrived` change (pour gérer les transitions d'état)

  // --- Rendu de l'Interface Utilisateur ---
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 1. Carte en arrière-plan */}
      {currentLocation ? (
        <MapView
          style={styles.fullBackgroundMap} // La carte prend tout l'arrière-plan
          // Région initiale centrée sur le lieu de travail ou la position actuelle
          initialRegion={{
            latitude: WORK_LOCATION.latitude,
            longitude: WORK_LOCATION.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          // La région de la carte suit dynamiquement la position actuelle de l'utilisateur
          region={{
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            latitudeDelta: 0.002, // Zoom serré pour le détail autour de l'utilisateur
            longitudeDelta: 0.002,
          }}
          showsUserLocation={true} // Affiche un point bleu pour la position de l'utilisateur
          followsUserLocation={true} // La carte se recentre automatiquement sur l'utilisateur
        >
          {/* Marqueur pour le lieu de travail */}
          <Marker
            coordinate={WORK_LOCATION}
            title="Lieu de travail"
            pinColor={hasArrived ? "green" : "red"} // Le marqueur change de couleur selon l'arrivée
          />
          {/* Cercle pour visualiser le rayon de détection autour du lieu de travail */}
          <Circle
            center={WORK_LOCATION}
            radius={DETECTION_RADIUS_METERS}
            strokeWidth={2}
            strokeColor={hasArrived ? 'rgba(40, 167, 69, 0.7)' : 'rgba(0, 123, 255, 0.7)'}
            fillColor={hasArrived ? 'rgba(40, 167, 69, 0.2)' : 'rgba(0, 123, 255, 0.1)'}
          />
        </MapView>
      ) : (
        // Message de chargement affiché sur le fond si la position n'est pas encore disponible
        <Text style={styles.fullBackgroundLoadingText}>Chargement de la carte et de la position...</Text>
      )}

      {/* 2. Ondes radar superposées à la carte */}
      <WaveEmitter
        style={styles.wavesOverlay} // Style pour positionner les ondes par-dessus la carte
        color={hasArrived ? '#28A745' : '#007bff'} // Couleur des ondes (vert si arrivé, bleu sinon)
        isActive={!hasArrived} // Active l'animation seulement si l'employé n'est pas encore arrivé
        initialRadius={10}
        maxRadius={Math.min(width, height) * 0.3}
        duration={2000}
        numberOfWaves={4}
        borderWidth={3}
        fillOpacity={0.05}
      />

      {/* 3. Contenu principal (titre, infos, statut) par-dessus les ondes et la carte */}
      <View style={styles.overlayContent}>
        {/* Titre en haut, toujours visible */}
        {/* Boîte d'état en haut, sous le titre, toujours visible */}
        <View style={[styles.statusBox, hasArrived ? styles.statusArrived : styles.statusNotArrived]}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>

        {/* Espace flexible pour pousser le contenu du bas */}
        <View style={{ flex: 1 }} />

        {/* Bloc d'informations détaillées, affiché/masqué */}
        {showInfoDetails && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Lieu de travail : {WORK_LOCATION.latitude.toFixed(4)}, {WORK_LOCATION.longitude.toFixed(4)}</Text>
            <Text style={styles.infoText}>Rayon de détection : {DETECTION_RADIUS_METERS} mètres</Text>
            <Text style={styles.infoText}>
              Votre position actuelle :
              {currentLocation ?
                ` ${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` :
                " Non disponible"
              }
            </Text>
            {distanceToWork && (
              <Text style={styles.infoText}>Distance au travail : {distanceToWork} mètres</Text>
            )}
          </View>
        )}
      </View>

      {/* Boutons flottants (toujours visibles) */}
      <TouchableOpacity
        style={styles.floatingButtonLeft}
        onPress={() => {
          // Logique de rafraîchissement de la position
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation })
            .then(position => {
              const { latitude, longitude } = position.coords;
              setCurrentLocation({ latitude, longitude });
              const distance = calculateDistance(latitude, longitude, WORK_LOCATION.latitude, WORK_LOCATION.longitude);
              setDistanceToWork(distance.toFixed(2));
              const isWithinRadius = distance <= DETECTION_RADIUS_METERS;
              if (isWithinRadius && !hasArrived) {
                setHasArrived(true);
                setStatusMessage("Arrivé au travail ! 🎉");
                messageBox("Arrivée", "Vous êtes bien arrivé à votre lieu de travail.");
              } else if (!isWithinRadius && hasArrived) {
                setHasArrived(false);
                setStatusMessage("Hors du lieu de travail.");
                messageBox("Départ", "Vous avez quitté votre lieu de travail.");
              } else if (isWithinRadius && hasArrived) {
                setStatusMessage("Toujours au travail.");
              } else {
                setStatusMessage("Hors du lieu de travail.");
              }
            })
            .catch(error => {
              console.error("Erreur de rafraîchissement:", error);
              messageBox("Erreur", "Impossible de rafraîchir la position.");
            });
        }}
      >
        <Feather name="refresh-cw" size={24} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.floatingButtonRight}
        onPress={() => setShowInfoDetails(!showInfoDetails)} // Bascule la visibilité des détails
      >
        <Feather name="info" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- Styles de l'Interface Utilisateur ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Pas de couleur de fond ici, car la carte couvrira tout
  },
  waveContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveCircle: {
    position: 'absolute',
  },
  centerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    zIndex: 1,
  },
  fullBackgroundMap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  fullBackgroundLoadingText: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    backgroundColor: '#F0F2F5',
    textAlign: 'center',
    fontSize: 18,
    color: '#555',
    paddingTop: height / 2 - 50,
  },
  wavesOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlayContent: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    paddingTop: 20, // Ajusté pour le SafeAreaView
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingBottom: 20, // Pour laisser de la place aux boutons flottants
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10, // Ajouté pour séparer du statut
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 65,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
    marginBottom:3
  },
  statusBox: {
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 15,
    marginBottom: 20, // Laisser un espace pour le flex:1
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    marginTop: 10, // Espacement par rapport au titre
  },
  statusArrived: {
    backgroundColor: '#28A745', // Vert pour l'arrivée
  },
  statusNotArrived: {
    backgroundColor: '#DC3545', // Rouge pour le non-arrivée
  },
  statusText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  floatingButtonLeft: {
    position: 'absolute',
    bottom: 30, // Distance du bas de l'écran
    left: 20, // Distance du côté gauche
    backgroundColor: '#007bff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 3, // Assure que les boutons sont au-dessus de tout le reste
  },
  floatingButtonRight: {
    position: 'absolute',
    bottom: 30, // Distance du bas de l'écran
    right: 20, // Distance du côté droit
    backgroundColor: '#007bff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 3, // Assure que les boutons sont au-dessus de tout le reste
  },
});
