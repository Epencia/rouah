import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginPass from './login-pass';
import LoginUser from './login-user';
import {GlobalContext} from '../global/GlobalState';

export default function Connexion({ navigation }) {
  const [hasMatricule, setHasMatricule] = useState(null);
  const [user] = useContext(GlobalContext);

  useEffect(() => {
    // Vérifier la présence du matricule dans AsyncStorage
    const checkMatricule = async () => {
      try {
        const matricule = await AsyncStorage.getItem('matricule');
        if (matricule) {
          // Matricule trouvé : définir l'état pour afficher LoginPass
          setHasMatricule(true);
        } else {
          // Aucun matricule : définir l'état pour afficher LoginUser
          setHasMatricule(false);
        }
      } catch (error) {
        // Gestion des erreurs (par exemple, problème d'accès à AsyncStorage)
        console.error('Erreur lors de la vérification du matricule:', error);
        // Rediriger vers "Login user" par défaut
        setHasMatricule(false);
      }
    };

    checkMatricule();
  }, [navigation]);

  // Afficher un écran par défaut si la vérification n'est pas terminée
  if (hasMatricule === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Veuillez patienter...</Text>
      </View>
    );
  }

  // Rendre LoginPass si matricule existe, sinon LoginUser
  return user?.matricule ? <LoginPass navigation={navigation} /> : <LoginUser navigation={navigation} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
});