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
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function Inscription({navigation}) {
  const [NomPrenom, setNomPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const ValidationInscription = () => {
    // Validation des champs vides
    if (!username || !telephone || !password || !NomPrenom) {
      setErrors({
        username: !username ? "Le champ Nom d'utilisateur est obligatoire" : "",
        password: !password ? 'Le champ Mot de passe est obligatoire' : '',
        NomPrenom: !NomPrenom ? 'Le champ Nom et Prénoms est obligatoire' : '',
        telephone: !telephone ? 'Le champ Téléphone est obligatoire' : '',
      });
      return;
    }

    // Validation format username
    if (!/^[a-zA-Z0-9]{4,}$/.test(username)) {
      setErrors({
        ...errors,
        username: "L'utilisateur doit contenir au moins 4 lettres et/ou chiffres"
      });
      return;
    }

    // Validation format mot de passe
    if (!/^\d{6}$/.test(password)) {
      setErrors({
        ...errors,
        password: "Le mot de passe doit contenir exactement 6 chiffres"
      });
      return;
    }

    // Validation format téléphone
    if (!/^\d{10}$/.test(telephone)) {
      setErrors({
        ...errors,
        telephone: "Le numéro de téléphone doit contenir 10 chiffres"
      });
      return;
    }

    setIsSubmitting(true);

    fetch('https://rouah.net/api/inscription.php', {
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        telephone: telephone,
        nom_prenom: NomPrenom,
        login: username,
        mdp: password,
      })
    })
      .then((response) => response.json())
      .then((responseJson) => {
        Alert.alert("Message", responseJson);
        if (responseJson.includes('succès')) {
          setUsername('');
          setPassword('');
          setTelephone('');
          setNomPrenom('');
          setErrors({});
        }
      })
      .catch((error) => {
        Alert.alert("Erreur", error.message);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>
            <Text style={styles.title}>Rouah</Text>

            <Image
              source={require('../assets/logo-original.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.message}>Espace d'inscription</Text>

            {/* Champ Nom & Prénoms */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: errors.NomPrenom ? 'red' : '#555' }]}>
                Nom & Prénoms
              </Text>
              <TextInput
                style={[styles.input, { borderColor: errors.NomPrenom ? 'red' : '#ccc' }]}
                value={NomPrenom}
                onChangeText={setNomPrenom}
                autoCapitalize="words"
                returnKeyType="next"
              />
              {errors.NomPrenom && <Text style={styles.errorText}>{errors.NomPrenom}</Text>}
            </View>

            {/* Champ Téléphone */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: errors.telephone ? 'red' : '#555' }]}>
                Téléphone
              </Text>
              <TextInput
                style={[styles.input, { borderColor: errors.telephone ? 'red' : '#ccc' }]}
                value={telephone}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, '').slice(0, 10);
                  setTelephone(numericText);
                  setErrors({...errors, telephone: ''});
                }}
                keyboardType="phone-pad"
                maxLength={10}
                returnKeyType="next"
              />
              {errors.telephone && <Text style={styles.errorText}>{errors.telephone}</Text>}
            </View>

            {/* Champ Utilisateur */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: errors.username ? 'red' : '#555' }]}>
                Utilisateur
              </Text>
              <TextInput
                style={[styles.input, { borderColor: errors.username ? 'red' : '#ccc' }]}
                value={username}
                onChangeText={(text) => {
                  setUsername(text.replace(/\s/g, ''));
                  setErrors({...errors, username: ''});
                }}
                autoCapitalize="none"
                returnKeyType="next"
              />
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
            </View>

            {/* Champ Mot de passe */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: errors.password ? 'red' : '#555' }]}>
                Mot de passe
              </Text>
              <TextInput
                style={[styles.input, { borderColor: errors.password ? 'red' : '#ccc' }]}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setPassword(numericText);
                  setErrors({...errors, password: ''});
                }}
                keyboardType="numeric"
                maxLength={6}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.mdpIconContainer}
                onPress={() => setShowPassword(!showPassword)}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#A5A5AE"
                />
              </TouchableOpacity>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            {isSubmitting && <ActivityIndicator size="large" color="#fa4447" />}

            <TouchableOpacity 
              style={styles.btn} 
              onPress={ValidationInscription}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>S'inscrire</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Connexion')}>
              <Text style={styles.link}>Se connecter ?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Bienvenue')}>
              <Text style={styles.link}>Retour</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
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
    color: '#403b3b',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 15,
    position: 'relative',
  },
  label: {
    position: 'absolute',
    left: 12,
    top: -8,
    backgroundColor: 'white',
    paddingHorizontal: 4,
    fontSize: 12,
    zIndex: 1,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    zIndex: 0,
  },
  errorText: {
    color: 'red',
    marginTop: 4,
    fontSize: 12,
  },
  btn: {
    width: '100%',
    padding: 14,
    backgroundColor: '#fa4447',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  link: {
    color: '#403b3b',
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  mdpIconContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
});