import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  Linking,
  SafeAreaView,StatusBar
} from 'react-native';

export default function Inscription({navigation}) {
  const [NomPrenom, setNomPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const message = ''; // Remplace par un message d'erreur ou de succès si besoin

  const handleLogin = () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    // Traitement de connexion (à connecter avec API si besoin)
    Alert.alert('Connexion', `Utilisateur: ${username}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <View style={styles.inner}>
        <Text style={styles.title}>Adorès Cloud</Text>

        <Image
          source={require('../assets/logo.png')} // Remplace par ton chemin réel
          style={styles.logo}
        />

        <Text style={styles.message}>{message || "Espace d'inscription"}</Text>

        
        <TextInput
          style={styles.input}
          placeholder="Nom & prénoms"
          value={NomPrenom}
          onChangeText={setNomPrenom}
          autoCapitalize="none"
        />


        
        <TextInput
          style={styles.input}
          placeholder="Téléphone"
          value={telephone}
          onChangeText={setTelephone}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Utilisateur"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin}>
          <Text style={styles.buttonText}>S'inscrire</Text>
        </TouchableOpacity>


        <TouchableOpacity onPress={() => navigation.navigate('Connexion')}>
          <Text style={styles.link}>Se connecter ?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Bienvenue')}>
          <Text style={styles.link}>Retour</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  inner: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  logo: {
    width: 150,
    height: 125,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  message: {
    marginBottom: 20,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    width: '100%',
    padding: 14,
    backgroundColor: '#3C64B1', // Couleur Hostinger / personnalisée
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  btn: {
    width: '100%',
    padding: 14,
    backgroundColor: '#0A84FF',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  link: {
    color: '#3C64B1',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight:'bold'
  },
});