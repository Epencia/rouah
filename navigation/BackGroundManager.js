import React, { useEffect, useState } from 'react';
import { View, Button, Alert, Platform, Text, StyleSheet, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Erreur tâche localisation:', error);
    return;
  }
  if (data?.locations) {
    const { latitude, longitude } = data.locations[0].coords;
    console.log('Nouvelle position:', latitude, longitude);
    
    try {
      const matricule = await AsyncStorage.getItem('matricule');
      if (matricule) {
        await fetch(`https://rouah.net/api/position-background.php?latitude=${latitude}&longitude=${longitude}&matricule=${matricule}`);
      }
    } catch (err) {
      console.error('Erreur envoi position:', err);
    }
  }
});

const openAppSettings = async () => {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('app-settings:');
    } else {
      // Solution robuste pour Android
      await Linking.openSettings();
      
      // Alternative si openSettings ne fonctionne pas
      // await Linking.openURL('android.settings.APPLICATION_DETAILS_SETTINGS');
    }
  } catch (error) {
    console.error("Erreur ouverture paramètres:", error);
    Alert.alert(
      "Erreur", 
      "Ouvrez manuellement les paramètres de l'application",
      [
        {
          text: "OK",
          onPress: () => console.log("Erreur acceptée")
        }
      ]
    );
  }
};

export default function BackgroundManager() {
  const [locationStarted, setLocationStarted] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const checkPermissions = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Activez la localisation pour utiliser cette fonctionnalité',
          [
            { text: 'Plus tard', style: 'cancel' },
            { 
              text: 'Paramètres', 
              onPress: openAppSettings,
              style: 'destructive' 
            },
          ]
        );
        return false;
      }

      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          Alert.alert(
            'Permission arrière-plan',
            'Activez la localisation en arrière-plan pour un suivi continu',
            [
              { text: 'Annuler', style: 'cancel' },
              { 
                text: 'Paramètres', 
                onPress: openAppSettings,
                style: 'destructive'
              },
            ]
          );
          return false;
        }
      }

      setPermissionGranted(true);
      return true;
    } catch (error) {
      console.error("Erreur permissions:", error);
      return false;
    }
  };

  const startLocationTracking = async () => {
    const hasPermission = await checkPermissions();
    if (!hasPermission) return;

    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 50,
        timeInterval: 300000,
        foregroundService: {
          notificationTitle: "Suivi de position",
          notificationBody: "Actif en arrière-plan",
          notificationColor: "#FF0000"
        },
        showsBackgroundLocationIndicator: true,
      });
      setLocationStarted(true);
      Alert.alert("Suivi activé", "Votre position sera envoyée automatiquement");
    } catch (error) {
      console.error("Erreur démarrage suivi:", error);
      Alert.alert("Erreur", "Impossible de démarrer le suivi de position");
    }
  };

  const sendCurrentLocation = async () => {
    try {
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      const matricule = await AsyncStorage.getItem('matricule');
      
      if (matricule) {
        const response = await fetch(`https://rouah.net/api/position-background.php?latitude=${coords.latitude}&longitude=${coords.longitude}&matricule=${matricule}`);
        if (response.ok) {
          Alert.alert("Succès", "Position envoyée avec succès");
        } else {
          throw new Error("Échec de l'envoi");
        }
      } else {
        Alert.alert("Erreur", "Matricule non trouvé");
      }
    } catch (error) {
      console.error("Erreur envoi position:", error);
      Alert.alert("Erreur", "Échec de l'envoi de la position");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestion de Localisation</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title={locationStarted ? "Suivi Actif ✓" : "Démarrer le Suivi"}
          onPress={startLocationTracking}
          color={locationStarted ? "green" : "#007AFF"}
          disabled={!permissionGranted && locationStarted}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Envoyer Position Actuelle"
          onPress={sendCurrentLocation}
          color="#FF9500"
        />
      </View>

      {!permissionGranted && (
        <Text style={styles.warning}>
          ℹ️ Activez les permissions de localisation pour toutes les fonctionnalités
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333'
  },
  buttonContainer: {
    marginVertical: 15,
    borderRadius: 10,
    overflow: 'hidden'
  },
  warning: {
    color: 'orange',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    fontStyle: 'italic'
  },
});