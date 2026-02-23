import React, {useEffect, useState, useContext, useRef} from 'react';
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
  Animated,
  Modal
} from 'react-native';
import { GlobalContext } from '../global/GlobalState';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';

export default function Connexion({navigation}) {
  const [login, setLogin] = useState('');
  const [mdp, setMdp] = useState('');
  const [user, setUser] = useContext(GlobalContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [showmdp, setShowmdp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricModalVisible, setBiometricModalVisible] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState(null);
  const [biometricChecked, setBiometricChecked] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animations d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Vérifier la disponibilité de la biométrie
    checkBiometricAvailability();
    
    // Charger les identifiants sauvegardés
    loadSavedCredentials();

    if (navigation && user) {
      navigation.navigate('BottomTabs');
    }
  }, [user]);

  useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    // Recharger les credentials quand l'écran est focus
    loadSavedCredentials();
    checkBiometricAvailability();
  });

  return unsubscribe;
}, [navigation]);

  const checkBiometricAvailability = async () => {
    try {
      // Vérifier si l'appareil supporte la biométrie
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      
      if (!hasHardware) {
        console.log('Appareil ne supporte pas la biométrie');
        setBiometricAvailable(false);
        setBiometricChecked(true);
        return;
      }

      // Vérifier si des empreintes sont enregistrées
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!isEnrolled) {
        console.log('Aucune empreinte enregistrée');
        setBiometricAvailable(false);
        setBiometricChecked(true);
        return;
      }
      
      setBiometricAvailable(true);
    } catch (error) {
      console.log('Erreur vérification biométrie:', error);
      setBiometricAvailable(false);
    } finally {
      setBiometricChecked(true);
    }
  };

  const loadSavedCredentials = async () => {
  try {
    // Nettoyer d'abord les anciennes données
    setSavedCredentials(null);
    setBiometricEnabled(false);
    
    const saved = await AsyncStorage.getItem('userCredentials');
    console.log('Credentials chargés:', saved ? 'Oui' : 'Non');
    
    if (saved) {
      const credentials = JSON.parse(saved);
      setSavedCredentials(credentials);
      setLogin(credentials.login || '');
      setRememberMe(true);
      
      // Vérifier si la biométrie est activée pour cet utilisateur
      const bioEnabled = await AsyncStorage.getItem(`biometric_${credentials.login}`);
      console.log('Biométrie activée:', bioEnabled === 'true' ? 'Oui' : 'Non');
      
      if (bioEnabled === 'true') {
        setBiometricEnabled(true);
      }
    }
  } catch (error) {
    console.log('Erreur chargement credentials:', error);
  }
};

  const handleBiometricLogin = async () => {
    try {
      // Vérification plus robuste
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Biométrie non disponible',
          'Votre appareil ne supporte pas la biométrie ou aucune empreinte n\'est enregistrée.\n\nVeuillez utiliser votre mot de passe.',
          [{ text: 'OK' }]
        );
        return;
      }

      setBiometricModalVisible(true);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Connectez-vous avec votre empreinte',
        fallbackLabel: 'Utiliser le mot de passe',
        cancelLabel: 'Annuler',
        disableDeviceFallback: false,
        // Pour Android, on peut spécifier le titre
        ...Platform.select({
          android: {
            title: 'Authentification biométrique',
            subtitle: 'Utilisez votre empreinte pour vous connecter',
            description: 'Placez votre doigt sur le capteur'
          }
        })
      });

      setBiometricModalVisible(false);

      if (result.success) {
        if (savedCredentials) {
          // Connexion automatique
          setLogin(savedCredentials.login);
          setMdp(savedCredentials.mdp);
          setTimeout(() => handleLogin(true), 500);
        } else {
          Alert.alert('Erreur', 'Aucun identifiant sauvegardé trouvé');
        }
      } else if (result.error) {
        console.log('Erreur authentification:', result.error);
        // Ne pas afficher d'alerte pour l'annulation utilisateur
        if (result.error !== 'user_cancel') {
          Alert.alert('Échec', 'Authentification biométrique échouée');
        }
      }
    } catch (error) {
      setBiometricModalVisible(false);
      console.log('Erreur biométrie:', error);
      Alert.alert(
        'Erreur biométrique',
        'Une erreur est survenue. Veuillez utiliser votre mot de passe.'
      );
    }
  };

  const saveCredentials = async (login, mdp, enableBiometric = false) => {
    try {
      await AsyncStorage.setItem('userCredentials', JSON.stringify({ login, mdp }));
      if (enableBiometric) {
        await AsyncStorage.setItem(`biometric_${login}`, 'true');
      } else {
        await AsyncStorage.removeItem(`biometric_${login}`);
      }
    } catch (error) {
      console.log('Erreur sauvegarde credentials:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!login.trim()) {
      newErrors.login = 'Le nom d\'utilisateur est requis';
    } else if (login.length < 3) {
      newErrors.login = 'Le nom d\'utilisateur doit contenir au moins 3 caractères';
    }
    
    if (!mdp.trim()) {
      newErrors.mdp = 'Le mot de passe est requis';
    } else if (mdp.length < 4) {
      newErrors.mdp = 'Le mot de passe doit contenir au moins 4 caractères';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (skipValidation = false) => {
    if (!skipValidation && !validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('https://rouah.net/api/connexion.php', {
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

      if (data[0]?.login) {
        if (data[0].matricule) {
          await AsyncStorage.setItem('matricule', data[0].matricule);
        }
        
        // Sauvegarder les identifiants si "Se souvenir de moi" est activé
        if (rememberMe) {
          await saveCredentials(login, mdp, biometricEnabled);
        } else {
          await AsyncStorage.removeItem('userCredentials');
          await AsyncStorage.removeItem(`biometric_${login}`);
        }
        
        setUser(data[0]);
        
        Alert.alert(
          '✅ Succès',
          'Connexion réussie !',
          [{ text: 'OK', onPress: () => navigation.navigate("BottomTabs") }]
        );
      } else {
        Alert.alert('❌ Erreur', data.message || 'Identifiants incorrects');
      }
    } catch (error) {
      Alert.alert("❌ Erreur", "Impossible de se connecter au serveur");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom','left', 'right']}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            style={[
              styles.inner,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Image
              source={require('../assets/logo-original.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.message}>Espace de connexion</Text>

            {/* Champ Utilisateur */}
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <MaterialIcons name="person" size={16} color="#414d63" />
                <Text style={[styles.label, { color: errors.login ? '#e74c3c' : '#555' }]}>
                  Utilisateur
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input, 
                  { borderColor: errors.login ? '#e74c3c' : '#ccc' },
                  login ? styles.inputFilled : null
                ]}
                value={login}
                onChangeText={(text) => {
                  setLogin(text);
                  if (errors.login) setErrors({...errors, login: null});
                }}
                placeholder="Entrez votre nom d'utilisateur"
                placeholderTextColor="#999"
                autoCapitalize="none"
                returnKeyType="next"
                editable={!isSubmitting}
              />
              {login.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearIcon}
                  onPress={() => setLogin('')}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
              {errors.login && (
                <Text style={styles.errorText}>{errors.login}</Text>
              )}
            </View>

            {/* Champ Mot de passe */}
            <View style={styles.inputContainer}>
              <View style={styles.labelContainer}>
                <MaterialIcons name="lock" size={16} color="#414d63" />
                <Text style={[styles.label, { color: errors.mdp ? '#e74c3c' : '#555' }]}>
                  Mot de passe
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input, 
                  { borderColor: errors.mdp ? '#e74c3c' : '#ccc' },
                  mdp ? styles.inputFilled : null
                ]}
                secureTextEntry={!showmdp}
                value={mdp}
                onChangeText={(text) => {
                  setMdp(text);
                  if (errors.mdp) setErrors({...errors, mdp: null});
                }}
                placeholder="Entrez votre mot de passe"
                placeholderTextColor="#999"
                returnKeyType="done"
                editable={!isSubmitting}
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
              {errors.mdp && (
                <Text style={styles.errorText}>{errors.mdp}</Text>
              )}
            </View>

            {/* Options supplémentaires */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={styles.checkboxContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Se souvenir de moi</Text>
              </TouchableOpacity>

              {/* Afficher l'option biométrie seulement si disponible */}
              {biometricAvailable && savedCredentials && (
                <TouchableOpacity 
                  style={styles.biometricToggle}
                  onPress={() => setBiometricEnabled(!biometricEnabled)}
                >
                  <Ionicons 
                    name={biometricEnabled ? 'finger-print' : 'finger-print-outline'} 
                    size={24} 
                    color={biometricEnabled ? '#414d63' : '#999'} 
                  />
                  <Text style={[styles.biometricText, biometricEnabled && styles.biometricTextActive]}>
                    Biométrie
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {isSubmitting && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#414d63" />
                <Text style={styles.loadingText}>Connexion en cours...</Text>
              </View>
            )}

            {/* Bouton de connexion principale */}
            <TouchableOpacity 
              style={[styles.btn, isSubmitting && styles.btnDisabled]} 
              onPress={() => handleLogin()}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Se connecter</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" style={styles.btnIcon} />
            </TouchableOpacity>

            {/* Bouton de connexion biométrique - seulement si disponible et activé */}
            {biometricAvailable && savedCredentials && biometricEnabled && (
              <TouchableOpacity 
                style={styles.biometricBtn}
                onPress={handleBiometricLogin}
                disabled={isSubmitting}
              >
                <Ionicons name="finger-print" size={24} color="#414d63" />
                <Text style={styles.biometricBtnText}>Connexion avec empreinte</Text>
              </TouchableOpacity>
            )}

            {/* Message si biométrie non disponible mais identifiants sauvegardés */}
            {!biometricAvailable && savedCredentials && biometricChecked && (
              <View style={styles.biometricUnavailable}>
                <Ionicons name="information-circle-outline" size={16} color="#999" />
                <Text style={styles.biometricUnavailableText}>
                  Biométrie non disponible sur cet appareil
                </Text>
              </View>
            )}

            {/* Liens de navigation */}
            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={() => navigation.navigate('Retrouve mes acces')}>
                <Text style={styles.link}>Mot de passe oublié ?</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Bienvenue')}>
                <Text style={styles.link}>Retour à l'accueil</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.versionText}>Version 1.0.0</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de vérification biométrique */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={biometricModalVisible}
        onRequestClose={() => setBiometricModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="finger-print" size={60} color="#414d63" />
            <Text style={styles.modalTitle}>Vérification biométrique</Text>
            <Text style={styles.modalText}>
              Placez votre doigt sur le capteur d'empreintes
            </Text>
            <ActivityIndicator size="small" color="#414d63" style={styles.modalLoader} />
            <TouchableOpacity 
              style={styles.modalCancel}
              onPress={() => setBiometricModalVisible(false)}
            >
              <Text style={styles.modalCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  logo: {
    width: 120,
    height: 100,
    marginBottom: 20,
    borderRadius: 10,
  },
  message: {
    marginBottom: 30,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 5,
  },
  input: {
    width: '100%',
    padding: 14,
    paddingRight: 45,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
  },
  inputFilled: {
    backgroundColor: '#fff',
    borderColor: '#414d63',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 5,
  },
  mdpIconContainer: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  clearIcon: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 25,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#414d63',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#414d63',
  },
  checkboxLabel: {
    color: '#555',
    fontSize: 14,
  },
  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biometricText: {
    marginLeft: 5,
    color: '#999',
    fontSize: 14,
  },
  biometricTextActive: {
    color: '#414d63',
    fontWeight: '500',
  },
  biometricUnavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  biometricUnavailableText: {
    marginLeft: 5,
    color: '#999',
    fontSize: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  btn: {
    width: '100%',
    padding: 16,
    backgroundColor: '#414d63',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  btnDisabled: {
    backgroundColor: '#a0a0a0',
    shadowOpacity: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  btnIcon: {
    marginLeft: 8,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#414d63',
    backgroundColor: '#f0f3ff',
    width: '100%',
    marginBottom: 20,
  },
  biometricBtnText: {
    color: '#414d63',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  linksContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  link: {
    color: '#414d63',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  versionText: {
    color: '#999',
    fontSize: 11,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#414d63',
    marginTop: 15,
    marginBottom: 5,
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalLoader: {
    marginVertical: 15,
  },
  modalCancel: {
    marginTop: 10,
    padding: 10,
  },
  modalCancelText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '500',
  },
});