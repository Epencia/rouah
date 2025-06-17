import React, { useState, useEffect, useContext  } from 'react';
import {
  View,
  Text,
  Image,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ConnexionInternet } from '../global/network/internet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocalisation from './geolocalisation';
import WaveEmitter from './onde';
import { GlobalContext } from '../global/GlobalState';

const { width, height } = Dimensions.get('window');

export default function Bienvenue({ navigation }) {
  
  const isConnected = ConnexionInternet();
  const [matricule, setMatricule] = useState('');
  const [user] = useContext(GlobalContext);

  if (isConnected === null) return null;

  useEffect(() => {
  const checkConnection = async () => {
    const connectionStatus = await ConnexionInternet();
    setIsConnected(connectionStatus);
  };

  checkConnection();
  fetchMatricule();
  const interval = setInterval(checkConnection, 5000);

  return () => clearInterval(interval);
}, []);

 const fetchMatricule = async () => {
      const storedMatricule = await AsyncStorage.getItem('matricule');
      if (storedMatricule) {
        setMatricule(storedMatricule);
      }
    };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header - Toujours visible */}
        <View style={styles.header}>
          <View style={styles.headerLogo}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.avatarImg}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>Adorès Cloud</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.appButton2}
              onPress={() => navigation.navigate('Gemini')}
            >
              <MaterialCommunityIcons name="chat" size={24} color="#414d63" />
            </TouchableOpacity>
            <View style={{ marginRight: 2 }} />
            <TouchableOpacity
              style={styles.appButton2}
              onPress={() => navigation.navigate('BottomTabs')}
            >
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={24} color="#414d63" />
            </TouchableOpacity>
            <View style={{ marginRight: 2 }} />
            <TouchableOpacity
              style={styles.appButton2}
              onPress={() => navigation.navigate('Connexion')}
            >
              <MaterialCommunityIcons name="login" size={24} color="#414d63" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contenu principal */}
        <View style={styles.mainContent}>
          {isConnected === null ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0A84FF" />
              <Text style={styles.loadingText}>Vérification de la connexion...</Text>
            </View>
          ) : isConnected ? (

          <Geolocalisation />
            
          ) : (
            <View style={styles.offlineContainer}>
  <Image 
    source={require('../assets/images/map.jpg')} // Chemin vers votre image
    style={styles.backgroundImage}
    resizeMode="cover"
  />
  <View style={styles.overlay}>
    <View style={styles.statusBox}>
              <Text style={styles.offlineText}>Vous êtes hors ligne</Text>
    </View>
    <WaveEmitter color="#FF3B30" />
  </View>
</View>
          )}
        </View>

       {/* Footer - Toujours visible */}
       {!user && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Connexion')}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>CONNEXION ›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Inscription')}
            style={styles.nextButton}
          >
            <Text style={styles.nextText}>INSCRIPTION ›</Text>
          </TouchableOpacity>
        </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginLeft: 10
  },
  logoText: {
    color: '#414d63',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    color: '#555',
  },
  offlineContainer2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText2: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
   offlineContainer: {
    flex: 1,
    position: 'relative', // Important pour le positionnement absolu de l'image
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    //opacity: 0.7, // Ajustez l'opacité selon vos besoins
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', // Léger assombrissement pour mieux voir le texte
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 20,
    color: '#DC3545',
    fontWeight: 'bold',
    //textShadowColor: 'rgba(0, 0, 0, 0.75)',
    //textShadowOffset: {width: 1, height: 1},
    //textShadowRadius: 3,
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'gray'
  },
  headerButtons: {
    flexDirection: 'row',
  },
  appButton2: {
    padding: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 15,
    backgroundColor: 'transparent',
    zIndex: 10,
},
  skipButton: {
    padding: 14,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 5,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  nextButton: {
    padding: 14,
    backgroundColor: '#0A84FF',
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
    elevation: 5,
  },
  skipText: {
    color: '#333',
    fontWeight: 'bold',
  },
  nextText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statusBox: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 100,
    width: '80%',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});