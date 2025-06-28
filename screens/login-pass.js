import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Alert, 
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlobalContext } from '../global/GlobalState';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

export default function LoginPass({ navigation }) {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pinContainerRef = useRef(null);
  const [user, setUser] = useContext(GlobalContext);

  const shakeAnimation = {
    0: { translateX: 0 },
    0.2: { translateX: -10 },
    0.4: { translateX: 10 },
    0.6: { translateX: -10 },
    0.8: { translateX: 10 },
    1: { translateX: 0 },
  };

  useEffect(() => {
    const checkUser = async () => {
      if (!user || (typeof user === 'object' && Object.keys(user).length === 0)) {
        const matricule = await AsyncStorage.getItem('matricule');
        if (!matricule) {
          navigation.reset({ index: 0, routes: [{ name: 'Connexion' }] });
        }
      }
    };
    checkUser();
  }, [user]);

  useEffect(() => {
    if (pin.every(digit => digit !== '') && !isSubmitting) {
      validatePin();
    }
  }, [pin]);

  const validatePin = async () => {
    setIsSubmitting(true);
    const enteredPin = pin.join('');

    try {
      const matricule = await AsyncStorage.getItem('matricule');
      if (!matricule) {
        throw new Error('Matricule non trouvé. Veuillez vous connecter.');
      }

      const response = await fetch('https://adores.cloud/api/connexion.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: matricule, mdp: enteredPin }),
      });
      const data = await response.json();

      if (data[0]?.login) {
        await AsyncStorage.setItem('matricule', data[0].matricule);
        setUser(data[0]);
        Alert.alert('Succès', 'Connexion réussie !');
        resetPin();
        navigation.navigate('BottomTabs');
      } else {
        throw new Error(data.message || 'Mot de passe incorrect.');
      }
    } catch (error) {
      setIsError(true);
      pinContainerRef.current?.animate(shakeAnimation, 500);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue. Veuillez réessayer.', [
        { text: 'OK', onPress: resetPin },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetPin = () => {
    setPin(['', '', '', '', '', '']);
    setActiveIndex(0);
    setIsError(false);
  };
  
  const handleKeyPress = (key) => {
    if (isSubmitting) return;

    if (key === 'delete') {
      if (activeIndex > 0 || pin[0] !== '') {
        const newPin = [...pin];
        const indexToClear = activeIndex > 0 && pin[activeIndex] === '' ? activeIndex - 1 : activeIndex;
        newPin[indexToClear] = '';
        setPin(newPin);
        setActiveIndex(indexToClear);
        setIsError(false);
      }
    } else if (/[0-9]/.test(key) && activeIndex < 6) {
      const newPin = [...pin];
      newPin[activeIndex] = key;
      setPin(newPin);
      if (activeIndex < 5) {
        setActiveIndex(activeIndex + 1);
      }
      setIsError(false);
    }
  };
  
  const renderKeyboard = () => {
    const keys = ['1','2','3','4','5','6','7','8','9','?', '0','delete'];
    return (
      <View style={styles.keyboard}>
        {keys.map((key, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.key,
              key === '' && styles.emptyKey,
              key === 'delete' && styles.deleteKey,
              isSubmitting && styles.disabledKey,
            ]}
            onPress={() => key !== '' && handleKeyPress(key)}
            disabled={key === '' || isSubmitting}
            activeOpacity={0.7}
          >
            {key === 'delete' ? (
              <Text style={styles.deleteText}>⌫</Text>
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <KeyboardAvoidingView 
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Entrez votre mot de passe</Text>
          <Text style={styles.subtitle}>Saisissez votre code à 6 chiffres</Text>

          <Animatable.View ref={pinContainerRef} style={styles.pinRow}>
            {pin.map((digit, index) => (
              <View
                key={index}
                style={[
                  styles.charBox,
                  index === activeIndex && styles.activeCharBox,
                  digit !== '' && styles.filledCharBox,
                  isError && styles.errorCharBox,
                ]}
              >
                <Text style={styles.charText}>{digit}</Text>
              </View>
            ))}
          </Animatable.View>

          {isSubmitting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Validation en cours...</Text>
            </View>
          )}

          {renderKeyboard()}
        </View>

        <TouchableOpacity 
          style={styles.forgotCodeContainer}
          onPress={() => navigation.navigate('Bienvenue')}
        >
          <Text style={styles.forgotCode}>Accueil</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  flexContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: height * 0.001,
  },
  logo: {
    width: isSmallDevice ? 150 : 160,
    height: isSmallDevice ? 125 : 135,
    marginBottom: height * 0.02,
    //borderWidth:1,
    borderRadius:isSmallDevice ? 65 : 70,
  },
  title: {
    fontSize: isSmallDevice ? 20 : 22,
    fontWeight: '600',
    color: '#034455',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: isSmallDevice ? 14 : 16,
    color: '#034455',
    textAlign: 'center',
    marginBottom: height * 0.03,
  },
  pinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: height * 0.04,
  },
  charBox: {
    width: isSmallDevice ? 40 : 45,
    height: isSmallDevice ? 50 : 55,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#034455',
  },
  activeCharBox: {
    borderColor: '#034455',
    borderWidth: 2,
  },
  filledCharBox: {
    backgroundColor: '#E9F2F6',
  },
  errorCharBox: {
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  charText: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: '600',
    color: '#034455',
  },
  keyboard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: width * 0.05,
    marginTop: height * 0.02,
  },
  key: {
    width: isSmallDevice ? 55 : 65,
    height: isSmallDevice ? 55 : 65,
    borderRadius: isSmallDevice ? 27.5 : 32,
    justifyContent: 'center',
    alignItems: 'center',
    margin: isSmallDevice ? 6 : 8,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    borderWidth: 1,
    borderColor: '#034455',
  },
  emptyKey: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  deleteKey: {
    backgroundColor: '#FEE2E2',
  },
  disabledKey: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  keyText: {
    fontSize: isSmallDevice ? 20 : 22,
    fontWeight: '600',
    color: '#034455',
  },
  deleteText: {
    fontSize: isSmallDevice ? 20 : 22,
    fontWeight: '600',
    color: '#EF4444',
  },
  loadingOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 10,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '500',
    color: '#034455',
  },
  forgotCodeContainer: {
    alignSelf: 'center',
    paddingBottom: height * 0.03,
  },
  forgotCode: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: '500',
    color: '#034455',
    textAlign: 'center',
  },
});