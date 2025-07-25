import React, { useState, useEffect } from 'react';
import { View, Button, Text, StyleSheet, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { 
  startEmergencyService, 
  stopEmergencyService,
  checkEmergencyPermissions,
  testEmergencyAlert
} from './EmergencyDetectionService';

export default function EmergencyDetectionScreen() {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Vérifier l'état initial du service
    const checkServiceStatus = async () => {
      const active = await AsyncStorage.getItem('emergencyServiceActive');
      setIsActive(active === 'true');
    };
    
    checkServiceStatus();
  }, []);

  const toggleService = async () => {
    setIsLoading(true);
    
    try {
      if (isActive) {
        const success = await stopEmergencyService();
        if (success) {
          setIsActive(false);
          Alert.alert('Service désactivé', 'La protection est maintenant inactive');
        }
      } else {
        const hasPermission = await checkEmergencyPermissions();
        
        if (!hasPermission) {
          Alert.alert(
            'Permissions requises',
            'Pour activer la protection, veuillez autoriser les permissions de localisation et capteurs',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Paramètres', onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }
        
        const success = await startEmergencyService();
        if (success) {
          setIsActive(true);
          Alert.alert('Service activé', 'La protection est maintenant active');
        } else {
          Alert.alert('Erreur', 'Échec du démarrage du service');
        }
      }
    } catch (error) {
      console.error('Service error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'opération');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmergencyAlert = async () => {
    try {
      // Vérifier les permissions de localisation
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'La localisation est nécessaire pour tester l\'alerte. Veuillez activer la localisation.',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Paramètres', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Vérifier la présence du matricule
      const matricule = await AsyncStorage.getItem('matricule');
      if (!matricule) {
        Alert.alert(
          'Erreur',
          'Matricule non configuré. Veuillez vous connecter pour configurer votre matricule.'
        );
        return;
      }

      // Appeler la fonction de test
      const success = await testEmergencyAlert();
      if (success) {
        Alert.alert('Test réussi', 'L\'alerte test a été envoyée avec succès');
      } else {
        Alert.alert('Erreur', 'Échec de l\'envoi de l\'alerte test. Vérifiez votre connexion ou les paramètres.');
      }
    } catch (error) {
      console.error('Test Alert Error:', error);
      Alert.alert('Erreur', `Échec de l'envoi de l'alerte test : ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Protection d'Urgence</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Statut:</Text>
        <Text style={[styles.statusValue, { color: isActive ? '#4CAF50' : '#F44336' }]}>
          {isActive ? 'ACTIF' : 'INACTIF'}
        </Text>
      </View>

      <Button
        title={isActive ? 'DÉSACTIVER LA PROTECTION' : 'ACTIVER LA PROTECTION'}
        onPress={toggleService}
        disabled={isLoading}
        color={isActive ? '#F44336' : '#4CAF50'}
        style={styles.mainButton}
      />

      {isLoading && (
        <Text style={styles.loadingText}>Traitement en cours...</Text>
      )}

      <View style={styles.spacer} />

      <Button
        title="TESTER L'ALERTE"
        onPress={handleTestEmergencyAlert}
        color="#FF9800"
        style={styles.testButton}
      />

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          La protection reste active même lorsque l'application est fermée.
        </Text>
        <Text style={styles.infoText}>
          En cas de détection d'urgence, votre position sera automatiquement envoyée.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FAFAFA'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#212121'
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30
  },
  statusLabel: {
    fontSize: 18,
    marginRight: 10,
    color: '#616161'
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  mainButton: {
    marginTop: 20,
    paddingVertical: 15
  },
  testButton: {
    marginTop: 10
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 10,
    color: '#757575',
    fontSize: 14
  },
  spacer: {
    height: 20
  },
  infoBox: {
    marginTop: 40,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  infoText: {
    color: '#1565C0',
    marginBottom: 5,
    fontSize: 14
  }
});