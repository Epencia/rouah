import React , {useEffect, useState, useContext  } from 'react';
import {View,Text,TextInput,TouchableOpacity,Image,StyleSheet,Alert,Linking,StatusBar, ActivityIndicator
} from 'react-native';
import { GlobalContext } from '../global/GlobalState';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginUser({navigation}) {

  // variables
  const [login, setLogin] = useState('');
  const [mdp, setMdp] = useState('');

  const [user, setUser] = useContext(GlobalContext);
  //const [user, setUser] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false); // Add a state to track form submission
  const [errors, setErrors] = useState({}); // Add a state to hold the error messages

  const [visible, setVisible] = useState(false);
  const [showmdp, setShowmdp] = useState(false);
  const hideDialog = () => setVisible(false);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    if (navigation && user) {
      navigation.navigate('BottomTabs');
    }
  }, [user]);

  const handleLogin = async () => {

    if (!login || !mdp) {
      setErrors({
        // Update error state with appropriate error messages
        login: !login ? 'Le champ Utilisateur est obligatoire' : '',
        mdp: !mdp ? 'Le champ Mot de passe est obligatoire' : '',
      });
      return;
    }

    setIsSubmitting(true); // Set submitting state to true while sending the data

    try {
      // Effectuer une validation du login et mot de passe ici
      const response = await fetch('https://adores.cloud/api/connexion.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: login,
          mdp: mdp,
        }),
      });
      const data = await response.json();

       if (data[0].login) {
        // stockage
        if (data[0].matricule) {
      await AsyncStorage.setItem('matricule', data[0].matricule);
    }
              // Rediriger ou stocker token
              setUser(data[0]);
              navigation.navigate("Accueil");
            } else {
              Alert.alert('Erreur', data || 'Identifiants incorrects');
            }

    } catch (error) {
      Alert.alert(error);
    };

  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <View style={styles.inner}>
        <Text style={styles.title}>Adorès Cloud</Text>

        <Image
          source={require('../assets/logo.png')} // Remplace par ton chemin réel
          style={styles.logo}
        />

        <Text style={styles.message}>Espace de connexion</Text>

        <TextInput
          style={[styles.input, { borderColor: errors.login ? 'red' : '#ccc' }]}
          placeholder="Utilisateur"
          errorText={errors.login}
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          />
        {errors.login ? (
              <Text style={{ color: 'red', marginTop: -10, marginBottom: 15 }}>{errors.login}</Text>
            ) : null}

       <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { borderColor: errors.mdp ? 'red' : '#ccc' }]}
          placeholder="Mot de passe"
          errorText={errors.mdp}
          secureTextEntry={!showmdp}
          value={mdp}
          onChangeText={setMdp}
        />
        <TouchableOpacity
                style={styles.mdpIconContainer}
                onPress={() => setShowmdp(!showmdp)}
              >
                <MaterialIcons
                  name={showmdp ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#A5A5AE"
                />
              </TouchableOpacity>
        </View>
        {errors.mdp ? (
              <Text style={{ color: 'red', marginTop: -10, marginBottom: 15 }}>{errors.mdp}</Text>
            ) : null}

        {isSubmitting && (
              <ActivityIndicator size="large" color="blue" />
            )}

        <TouchableOpacity style={styles.btn} onPress={handleLogin}>
          <Text style={styles.buttonText}>Se connecter</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text style={styles.link}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Inscription')}>
          <Text style={styles.link}>Créer un compte ?</Text>
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
  mdpIconContainer: {
    position: 'absolute',
    top: 10,
    right: -12,
    zIndex: 1,
    height:50,
    width : 48,
  },
   inputContainer: {
    width:"100%",
  },
});