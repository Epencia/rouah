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

  const [visible, setVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const hideDialog = () => setVisible(false);

  const [isSubmitting, setIsSubmitting] = useState(false); // Add a state to track form submission
  const [errors, setErrors] = useState({}); // Add a state to hold the error messages


    const ValidationInscription = () => {

    if (!username || !telephone || !password || !NomPrenom) {
      setErrors({
        // Update error state with appropriate error messages
        username: !username ? "Le champ Nom d'utilisateur est obligatoire" : "",
        password: !password ? 'Le champ Mot de passe est obligatoire' : '',
        NomPrenom: !NomPrenom ? 'Le champ Nom et Prénoms est obligatoire' : '',
        telephone: !telephone ? 'Le champ Téléphone est obligatoire' : '',
      });
      return;
    }

// Vérifie que l'utilisateur a au moins 4 chiffres
if (!/^\d{6}$/.test(username)) {
  Alert.alert("Message", "L'utilisateur doit contenir au moins 6 lettres et chiffres.");
  return;
}

    // Vérifie que le mot de passe a exactement 6 chiffres
if (!/^\d{6}$/.test(password)) {
  Alert.alert("Message", "Le mot de passe doit contenir exactement 6 chiffres.");
  return;
}

// Vérifie que le numéro de téléphone a au moins 10 chiffres
if (!/^\d{10}$/.test(telephone)) {
  Alert.alert("Message", "Le numéro de téléphone doit contenir au moins 10 chiffres.");
  return;
}

    setIsSubmitting(true); // Set submitting state to true while sending the data

    fetch('https://adores.cloud/api/inscription.php', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        // We will pass our input data to the server
        telephone: telephone,
        nom_prenom: NomPrenom,
        login: username,
        mdp: password,
      })
    })
      .then((response) => response.json())
      .then((responseJson) => {
        Alert.alert("Message",responseJson);
        setUsername('');
        setPassword('');
        setTelephone('');
        setNomPrenom('');
        // Stop the ActivityIndicator
        setIsSubmitting(false);
      })
      .catch((error) => {
        Alert.alert("Erreur",error);
        setIsSubmitting(false); // Stop the ActivityIndicator on error
      });
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
          onChangeText={(text) => {
          const numericText = text.replace(/[^0-9]/g, '').slice(0, 10);
          setTelephone(numericText);
          }}
          autoCapitalize="none"
          keyboardType="numeric"
          maxLength={10}
        />

        <TextInput
          style={styles.input}
          placeholder="Utilisateur"
          value={username}
          onChangeText={(text) => setUsername(text.replace(/\s/g, ''))}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          secureTextEntry
          value={password}
          onChangeText={(text) => {
          const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
          setPassword(numericText);
          }}
          keyboardType="numeric"
          maxLength={6}
        />

        <TouchableOpacity style={styles.btn} onPress={ValidationInscription}>
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