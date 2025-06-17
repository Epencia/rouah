import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Button } from 'react-native';
import * as Location from 'expo-location';
import { Alert } from 'react-native'; // Gardons Alert pour des notifications simples comme demandé

// --- Définition des constantes ---

// Coordonnées GPS du lieu de travail (à remplacer par les vraies coordonnées de votre bureau)
const WORK_LOCATION = {
  latitude: 7.6717097, // Exemple: Latitude de Paris
  longitude: -5.0168504, // Exemple: Longitude de Paris
};

// Rayon de détection en mètres (ici, 10 mètres)
const DETECTION_RADIUS_METERS = 100;

// --- Fonctions utilitaires ---

/**
 * Boîte de dialogue simple pour les messages à l'utilisateur.
 * Remplace l'utilisation directe de Alert.alert.
 */
const messageBox = (title, message) => {
  Alert.alert(title, message);
};

/**
 * Calcule la distance entre deux points GPS en utilisant la formule de Haversine.
 * @param {number} lat1 Latitude du premier point.
 * @param {number} lon1 Longitude du premier point.
 * @param {number} lat2 Latitude du second point.
 * @param {number} lon2 Longitude du second point.
 * @returns {number} La distance en mètres.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (lat1 * Math.PI) / 180; // latitude en radians
  const φ2 = (lat2 * Math.PI) / 180; // latitude en radians
  const Δφ = ((lat2 - lat1) * Math.PI) / 180; // différence de latitude en radians
  const Δλ = ((lon2 - lon1) * Math.PI) / 180; // différence de longitude en radians

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance en mètres
};

// --- Composant principal de l'application ---

export default function App() {
  // État pour stocker la position actuelle de l'employé
  const [currentLocation, setCurrentLocation] = useState(null);
  // État pour savoir si l'employé est arrivé au travail
  const [hasArrived, setHasArrived] = useState(false);
  // État pour le message d'état affiché à l'utilisateur
  const [statusMessage, setStatusMessage] = useState("En attente de la position...");
  // État pour la distance au lieu de travail
  const [distanceToWork, setDistanceToWork] = useState(null);

  // Effet de bord pour gérer les permissions et la surveillance de la position
  useEffect(() => {
    let locationSubscription; // Variable pour stocker l'abonnement à la localisation

    const startLocationTracking = async () => {
      // 1. Demander la permission d'accéder à la localisation en premier plan
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        messageBox(
          "Permission refusée",
          "L'accès à la localisation est nécessaire pour vérifier l'arrivée au travail."
        );
        setStatusMessage("Permission de localisation refusée.");
        return;
      }

      // 2. Observer la position de l'utilisateur en temps réel
      // On utilise watchPositionAsync pour les mises à jour continues.
      // interval: 5000 (5 secondes) - pour les mises à jour fréquentes
      // distanceInterval: 1 (1 mètre) - pour déclencher une mise à jour dès un petit déplacement
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation, // La meilleure précision disponible
          timeInterval: 5000, // Mettre à jour toutes les 5 secondes
          distanceInterval: 1, // Ou si la position change de 1 mètre
        },
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });

          // Calculer la distance au lieu de travail
          const distance = calculateDistance(
            latitude,
            longitude,
            WORK_LOCATION.latitude,
            WORK_LOCATION.longitude
          );
          setDistanceToWork(distance.toFixed(2)); // Afficher la distance avec 2 décimales

          // Vérifier si l'employé est dans la zone de détection
          const isWithinRadius = distance <= DETECTION_RADIUS_METERS;

          if (isWithinRadius && !hasArrived) {
            // L'employé vient d'arriver au travail
            setHasArrived(true);
            setStatusMessage("Arrivé au travail ! 🎉");
            messageBox("Arrivée", "Vous êtes bien arrivé à votre lieu de travail.");
          } else if (!isWithinRadius && hasArrived) {
            // L'employé était au travail et en est maintenant sorti
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

    // Lancer le suivi de la localisation au montage du composant
    startLocationTracking();

    // Fonction de nettoyage: arrêter la surveillance de la position lorsque le composant est démonté
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [hasArrived]); // Dépendance à hasArrived pour déclencher les messages d'arrivée/départ une seule fois par transition

  // --- Rendu de l'interface utilisateur ---

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Détecteur d'Arrivée au Travail</Text>
      
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

      <View style={[styles.statusBox, hasArrived ? styles.statusArrived : styles.statusNotArrived]}>
        <Text style={styles.statusText}>{statusMessage}</Text>
      </View>

      {/* Bouton pour tester (optionnel, pour re-déclencher la logique si nécessaire) */}
      <Button 
        title="Rafraîchir la position" 
        onPress={() => {
          // Forcer une mise à jour (utile pour le débogage si watchPositionAsync est lent)
          // Dans une vraie application, le watchPositionAsync gère cela automatiquement.
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation })
            .then(position => {
              const { latitude, longitude } = position.coords;
              setCurrentLocation({ latitude, longitude });
              // Recalculer la distance et l'état
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
        color="#007AFF"
      />
    </View>
  );
}

// --- Styles de l'interface utilisateur ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#F0F2F5', // Fond clair
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 30,
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
  },
  statusBox: {
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginBottom: 40,
    width: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
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
    color: '#FFFFFF', // Texte blanc
  },
});
