import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalContext } from '../global/GlobalState';
import CountryPicker from 'react-native-country-picker-modal';

export default function Inscription({ navigation }) {
  const [NomPrenom, setNomPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [user, setUser] = useContext(GlobalContext);
  const [countryCode, setCountryCode] = useState('CI'); // Côte d'Ivoire ISO code
  const [countryCallingCode, setCountryCallingCode] = useState('+225'); // Côte d'Ivoire calling code
  const [countryPickerVisible, setCountryPickerVisible] = useState(false);

  const registerForPushNotificationsAsync = async () => {
    try {
      if (!Device.isDevice) {
        //console.log('Échec : appareil non physique (émulateur détecté)');
        Alert.alert('Avertissement', 'Les notifications push ne sont pas disponibles sur un émulateur. Veuillez tester sur un appareil physique.');
        return null;
      }
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        Alert.alert('Avertissement', 'Les notifications push sont désactivées. Activez-les dans les paramètres de votre appareil pour recevoir des notifications.');
        return null;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '8b74f350-58f4-4c6c-b308-738040a6846d',
      });
      const token = tokenData.data;
      return token;
    } catch (error) {
      Alert.alert('Erreur', `Impossible de récupérer le token de notification : ${error.message}`);
      return null;
    }
  };

  const ValidationInscription = async () => {
    if (!username || !telephone || !password || !NomPrenom) {
      setErrors({
        username: !username ? "Le champ Nom d'utilisateur est obligatoire" : "",
        password: !password ? 'Le champ Mot de passe est obligatoire' : '',
        NomPrenom: !NomPrenom ? 'Le champ Nom et Prénoms est obligatoire' : '',
        telephone: !telephone ? 'Le champ Téléphone est obligatoire' : '',
      });
      return;
    }
    if (!/^[a-zA-Z0-9]{4,}$/.test(username)) {
      setErrors({
        ...errors,
        username: "L'utilisateur doit contenir au moins 4 lettres et/ou chiffres"
      });
      return;
    }
    if (!/^\d{6}$/.test(password)) {
      setErrors({
        ...errors,
        password: "Le mot de passe doit contenir exactement 6 chiffres"
      });
      return;
    }

      if (!/^[a-zA-Z0-9]{6,}$/.test(telephone)) {
      setErrors({
        ...errors,
        telephone: "Le numéro de téléphone doit contenir au moins 6 chiffres"
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const push_token = await registerForPushNotificationsAsync();
      const response = await fetch('https://rouah.net/api/inscription.php', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          telephone: `${countryCallingCode}${telephone}`,
          nom_prenom: NomPrenom,
          login: username,
          mdp: password,
          push_token: push_token || ''
        })
      });
      let responseJson;
      try {
        responseJson = await response.json();
      } catch (jsonError) {
        Alert.alert('Erreur', 'Réponse invalide du serveur. Veuillez réessayer.');
        return;
      }
      Alert.alert('Message', responseJson.message || JSON.stringify(responseJson));
      if (responseJson.success) {
        const matricule = responseJson.matricule;
        if (matricule) {
          await AsyncStorage.setItem('matricule', matricule.toString());
        }
        const newUser = {
          login: username,
          telephone: `${countryCallingCode}${telephone}`,
          nom_prenom: NomPrenom,
          matricule: matricule || '',
          push_token: push_token || '',
        };
        setUser(newUser);
        navigation.navigate('BottomTabs');
        setUsername('');
        setPassword('');
        setTelephone('');
        setNomPrenom('');
        setErrors({});
        Alert.alert('Succès', 'Inscription réussie ! Vous êtes maintenant connecté.');
      } else {
        Alert.alert('Erreur', responseJson.message || 'L\'inscription a échoué. Veuillez réessayer.');
      }
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de l\'inscription.');
    } finally {
      setIsSubmitting(false);
    }
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
            {/* Champ Téléphone avec sélecteur de pays */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: errors.telephone ? 'red' : '#555' }]}>
                Téléphone
              </Text>
              <View style={styles.phoneInputContainer}>
                <TouchableOpacity
                  style={styles.countryPickerButton}
                  onPress={() => setCountryPickerVisible(true)}
                >
                  <CountryPicker
                    withFlag
                    withCallingCode
                    withFilter
                    withModal
                    countryCode={countryCode}
                    onSelect={(country) => {
                      setCountryCode(country.cca2);
                      setCountryCallingCode(`+${country.callingCode[0]}`);
                      setCountryPickerVisible(false);
                    }}
                    visible={countryPickerVisible}
                    onClose={() => setCountryPickerVisible(false)}
                    containerButtonStyle={styles.countryPicker}
                    translation="fra" // Set language to French
                    filterProps={{
                      placeholder: 'Rechercher un pays...', // French placeholder for search
                    }}
                    theme={{
                      backgroundColor: '#fff',
                      primaryColor: '#fa4447',
                      primaryColorVariant: '#ccc',
                      onBackgroundTextColor: '#555',
                    }}
                  />
                  <Text style={styles.countryCodeText}>{countryCallingCode}</Text>
                </TouchableOpacity>
                <TextInput
                  style={[styles.phoneInput, { borderColor: errors.telephone ? 'red' : '#ccc' }]}
                  value={telephone}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '');
                    setTelephone(numericText);
                    setErrors({ ...errors, telephone: '' });
                  }}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
              </View>
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
                  setErrors({ ...errors, username: '' });
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
                  setErrors({ ...errors, password: '' });
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginRight: 10,
  },
  countryPicker: {
    padding: 0,
  },
  countryCodeText: {
    fontSize: 16,
    color: '#555',
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
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
    fontWeight: 'bold',
  },
  mdpIconContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
});