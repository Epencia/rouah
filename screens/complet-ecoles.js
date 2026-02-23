import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Dimensions,
  Platform,
  Alert,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Animated,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';
import YoutubePlayer from "react-native-youtube-iframe";
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Configuration de l'API
const API_BASE_URL = 'https://rouah.net/api/';

// Configuration des couleurs par défaut
const DEFAULT_COLORS = {
  '6ème': { primary: '#3498db', secondary: '#2980b9', light: '#EBF5FB' },
  '5ème': { primary: '#2ecc71', secondary: '#27ae60', light: '#EAFAF1' },
  '4ème': { primary: '#e74c3c', secondary: '#c0392b', light: '#FDEDEC' },
  '3ème': { primary: '#f39c12', secondary: '#d35400', light: '#FEF9E7' },
  '2nde': { primary: '#9b59b6', secondary: '#8e44ad', light: '#F4ECF7' },
  '1ère': { primary: '#1abc9c', secondary: '#16a085', light: '#E8F8F5' },
  'Tle': { primary: '#34495e', secondary: '#2c3e50', light: '#EBEDEF' }
};

const Tab = createMaterialTopTabNavigator();

export default function Ecoles({ route, navigation }) {

  const { categorie } = route?.params || {};


  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMatiere, setSelectedMatiere] = useState(null);
  const [selectedCours, setSelectedCours] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [abonnementActif, setAbonnementActif] = useState(null);
  const [codeError, setCodeError] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [playing, setPlaying] = useState(false);


  const [activeSubTab, setActiveSubTab] = useState('cours');
  const [matieresLoaded, setMatieresLoaded] = useState(false);

  
  // États pour les données API
  const [matieres, setMatieres] = useState([]);
  const [coursList, setCoursList] = useState([]);
  const [exercicesList, setExercicesList] = useState([]);
  const [stats, setStats] = useState({
    totalCours: 0,
    totalMatieres: 0,
    totalEnseignants: 0,
    totalEleves: 0
  });
  const [niveaux, setNiveaux] = useState([]);
  const [recentCours, setRecentCours] = useState([]);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(()=>{
     navigation.setOptions({title: categorie});
},[])

  useEffect(() => {
  if (activeTab === 'certificats') {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }
}, [activeTab]);

  // Vérifier la connexion réseau
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    
    return () => unsubscribe();
    
  }, []);

  // Charger les matières si nécessaire
  useEffect(() => {
    if (abonnementActif && !matieresLoaded) {
      loadMatieresForNiveau(abonnementActif.niveau);
    }
  }, [abonnementActif, matieresLoaded]);

  // Charger l'abonnement sauvegardé
  useEffect(() => {
    loadSavedSubscription();
    loadInitialData();
  }, []);

  const loadSavedSubscription = async () => {
    try {
      const savedSubscription = await AsyncStorage.getItem('abonnement_actif');
      if (savedSubscription) {
        const subscription = JSON.parse(savedSubscription);
        setAbonnementActif(subscription);
        setActiveTab('matieres');
        loadMatieresForNiveau(subscription.niveau);
      }
    } catch (error) {
      console.error('Erreur chargement abonnement:', error);
    }
  };

  const saveSubscription = async (subscription) => {
    try {
      await AsyncStorage.setItem('abonnement_actif', JSON.stringify(subscription));
    } catch (error) {
      console.error('Erreur sauvegarde abonnement:', error);
    }
  };

  const clearSubscription = async () => {
    try {
      await AsyncStorage.removeItem('abonnement_actif');
    } catch (error) {
      console.error('Erreur suppression abonnement:', error);
    }
  };

  // Ajoutez cette fonction dans le composant principal, avant renderCoursScreen
const parseProgrammes = (description) => {
  if (!description) return [];
  
  // Séparer par points-virgules et filtrer les éléments vides
  const items = description.split(';')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  return items;
};

  const loadInitialData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchStats(),
        fetchNiveaux(),
        fetchRecentCours()
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données');
      console.error('Erreur chargement initial:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}get-stats.php?categorie=${encodeURIComponent(categorie)}`);
      const data = await response.json();
      if (data.success) {
        setStats({
          totalCours: data.data.total_cours,
          totalMatieres: data.data.total_matieres,
          totalEnseignants: data.data.total_enseignants,
          totalEleves: data.data.total_eleves
        });
      }
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const fetchNiveaux = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}get-niveaux.php?categorie=${encodeURIComponent(categorie)}`);
      const data = await response.json();
      if (data.success) {
        setNiveaux(data.data);
      }
    } catch (error) {
      console.error('Erreur niveaux:', error);
    }
  };

  const fetchRecentCours = async () => {
    if (!abonnementActif) return;
    
    try {
      const response = await fetch(
        `${API_BASE_URL}get-cours.php?niveau=${encodeURIComponent(abonnementActif.niveau)}`
      );
      const data = await response.json();
      if (data.success) {
        setRecentCours(data.data.slice(0, 3));
      }
    } catch (error) {
      console.error('Erreur cours récents:', error);
    }
  };



 const activateSubscription = async (code) => {
  if (!isConnected) {
    Alert.alert('Hors ligne', 'Vérifiez votre connexion internet');
    return false;
  }

  setLoading(true);

  try {
    const response = await fetch(`${API_BASE_URL}verify-subscription.php`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    // ────────────────────────────────────────────────
    // CAS 1 : Abonnement déjà utilisé / déjà connecté
    // ────────────────────────────────────────────────
    if (data.already_connected) {
      Alert.alert(
        'Déjà connecté',
        'Vous êtes déjà connecté sur cet abonnement.\n\nVeuillez vous déconnecter sur l\'autre appareil avant de continuer.',
        [{ text: 'OK', style: 'default' }]
      );
      setCodeError(true);
      
      // Petite animation d'erreur (secousse légère)
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.6, duration: 80, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1,   duration: 80, useNativeDriver: true }),
      ]).start();

      return false;
    }

    // ────────────────────────────────────────────────
    // CAS 2 : Erreur normale (code invalide, expiré, etc.)
    // ────────────────────────────────────────────────
    if (!data.success) {
      setCodeError(true);
      
      Alert.alert(
        'Erreur',
        data.message || 'Code d\'abonnement invalide ou expiré',
        [{ text: 'OK', style: 'default' }]
      );

      // Animation d'erreur
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.5, duration: 100, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1,   duration: 100, useNativeDriver: true }),
      ]).start();

      return false;
    }

    // ────────────────────────────────────────────────
    // CAS 3 : Succès → activation normale
    // ────────────────────────────────────────────────
    const subscription = {
      code: data.data.code,
      niveau: data.data.niveau,
      date_expiration: data.data.date_expiration,
      couleur_principale: data.data.couleur_principale,
      couleur_secondaire: data.data.couleur_secondaire,
      // Optionnel : on peut aussi stocker l'état si besoin
      etat: data.data.etat,
    };

    setAbonnementActif(subscription);
    await saveSubscription(subscription);
    setCodeError(false);
    setShowCodeModal(false);
    setCodeInput('');

    // Animation de succès
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    setActiveTab('matieres');
    loadMatieresForNiveau(subscription.niveau);

    // Enregistrer l'activation (log, stats, etc.)
    await registerSubscriptionActivation(code);

    Alert.alert(
      'Succès',
      'Abonnement activé avec succès !',
      [{ text: 'OK', style: 'default' }]
    );

    return true;

  } catch (error) {
    console.error('Erreur activation abonnement:', error);
    Alert.alert(
      'Erreur réseau',
      'Impossible de vérifier l\'abonnement. Vérifiez votre connexion.'
    );
    return false;
  } finally {
    setLoading(false);
  }
};

  const registerSubscriptionActivation = async (code) => {
    try {
      await fetch(`${API_BASE_URL}register-activation.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, type: 'activation' })
      });
    } catch (error) {
      console.error('Erreur enregistrement activation:', error);
    }
  };

  const loadMatieresForNiveau = async (niveau) => {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Vérifiez votre connexion internet');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}get-matieres.php?niveau=${encodeURIComponent(niveau)}`
      );
      const data = await response.json();
      
      if (data.success) {
        setMatieres(data.data);
        setMatieresLoaded(true);
      } else {
        Alert.alert('Erreur', 'Impossible de charger les matières');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion impossible au serveur');
      console.error('Erreur matières:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCoursForMatiere = async (matiere) => {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Vérifiez votre connexion internet');
      return;
    }

    setSelectedMatiere(matiere);
    setLoading(true);
    setActiveTab('cours');
    
    try {
      const response = await fetch(
        `${API_BASE_URL}get-cours.php?matiere_id=${matiere.id}`
      );
      const data = await response.json();
      
      if (data.success) {
        // Filtrer les cours - avec une valeur par défaut si 'type' n'existe pas
        const cours = data.data.filter(item => {
          const itemType = item.type || 'Cours';
          return itemType === 'Cours';
        });
        const exercices = data.data.filter(item => {
          const itemType = item.type || 'Exercices';
          return itemType === 'Exercices';
        });
        
        setCoursList(cours);
        setExercicesList(exercices);
      } else {
        Alert.alert('Erreur', 'Impossible de charger les cours');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion impossible au serveur');
      console.error('Erreur cours:', error);
    } finally {
      setLoading(false);
    }
  };

  const registerView = async (coursId) => {
    try {
      await fetch(`${API_BASE_URL}register-view.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cours_id: coursId })
      });
    } catch (error) {
      console.error('Erreur enregistrement vue:', error);
    }
  };

  const handleCodeSubmit = async () => {
    if (!codeInput || codeInput.length !== 6) {
      setCodeError(true);
      return;
    }

    await activateSubscription(codeInput);
  };


  const handleSelectNiveau = (niveau) => {
    if (abonnementActif && abonnementActif.niveau === niveau.nom) {
      setActiveTab('matieres');
      loadMatieresForNiveau(niveau.nom);
    } else {
      Alert.alert(
        'Accès requis',
        `Pour accéder au niveau ${niveau.nom}, veuillez entrer votre code d'abonnement ou faire une souscription`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Entrer votre code', onPress: () => setShowCodeModal(true) },
          { text: 'Faire une souscription', onPress: () => navigation.navigate('Abonnement', { niveau: niveau,niveaux: [niveau],preselectNiveau: niveau.code}) },
        ]
      );
    }
  };

  const handleBack = () => {
    if (activeTab === 'matieres') {
      setActiveTab('dashboard');
    } else if (activeTab === 'cours') {
      setActiveTab('matieres');
      setSelectedMatiere(null);
    } else if (activeTab === 'detail') {
      setActiveTab('cours');
      setSelectedCours(null);
    }
  };

 const handleLogout = async () => {
  Alert.alert(
    'Déconnexion',
    'Voulez-vous vraiment vous déconnecter ?',
    [
      { text: 'Annuler', style: 'cancel' },
      { 
        text: 'Déconnexion', 
        style: 'destructive',
        onPress: async () => {
          if (!abonnementActif?.code) {
            // Pas d'abonnement actif → juste nettoyer localement
            await clearSubscription();
            setAbonnementActif(null);
            setActiveTab('dashboard');
            setMatieres([]);
            setMatieresLoaded(false);
            setCoursList([]);
            setExercicesList([]);
            setSelectedMatiere(null);
            setSelectedCours(null);
            return;
          }

          try {
            setLoading(true);

            const response = await fetch(`${API_BASE_URL}logout-subscription.php`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code: abonnementActif.code }),
            });

            const data = await response.json();

            if (data.success) {
              // Succès : on peut nettoyer localement
              await clearSubscription();
              setAbonnementActif(null);
              setActiveTab('dashboard');
              setMatieres([]);
              setMatieresLoaded(false);
              setCoursList([]);
              setExercicesList([]);
              setSelectedMatiere(null);
              setSelectedCours(null);

              Alert.alert('Déconnexion réussie', 'Vous avez été déconnecté avec succès.');
            } else {
              Alert.alert(
                'Erreur',
                data.message || 'Impossible de déconnecter l\'abonnement. Veuillez réessayer.'
              );
            }
          } catch (error) {
            console.error('Erreur déconnexion API:', error);
            Alert.alert(
              'Erreur réseau',
              'Impossible de contacter le serveur. La déconnexion locale a été effectuée.'
            );
            // On nettoie quand même localement pour ne pas bloquer l'utilisateur
            await clearSubscription();
            setAbonnementActif(null);
            setActiveTab('dashboard');
          } finally {
            setLoading(false);
          }
        }
      }
    ]
  );
};

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const getNiveauColor = (niveauNom) => {
    return DEFAULT_COLORS[niveauNom] || { primary: '#3498db', secondary: '#2980b9', light: '#EBF5FB' };
  };

const onStateChange = (state) => {
  if (state === "ended") {
    setPlaying(false);
    Alert.alert("Vidéo terminée", "Vous pouvez passer à la vidéo suivante.");
  } else if (state === "playing") {
    setPlaying(true);
  } else if (state === "paused") {
    setPlaying(false);
  }
};
  // Composants d'onglets pour le détail du cours
const VideoTab = () => {
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videosList, setVideosList] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [playerHeight, setPlayerHeight] = useState(250);
  const [isPlaying, setIsPlaying] = useState(false); // État local pour chaque vidéo
  
  // Référence pour éviter les re-renders inutiles
  const playerReadyRef = useRef(false);
  const shouldPlayRef = useRef(false);

  useEffect(() => {
    if (selectedCours && selectedCours.url_video) {
      registerView(selectedCours.id);
      
      // Extraire les IDs de vidéos YouTube de la chaîne
      const videoIds = selectedCours.url_video
        .split(';')
        .filter(id => id && id.trim())
        .map(id => id.trim());
      
      if (videoIds.length > 0) {
        setVideosList(videoIds);
        setSelectedVideoId(videoIds[0]);
        setCurrentVideoIndex(0);
        setVideoLoading(true);
        setIsPlaying(false); // Réinitialiser l'état de lecture
        playerReadyRef.current = false;
        shouldPlayRef.current = false;
      }
    }

    // Ajuster la hauteur selon l'orientation de l'appareil
    const updateHeight = () => {
      const { width } = Dimensions.get('window');
      const calculatedHeight = Math.min(width * 9/16, 300);
      setPlayerHeight(calculatedHeight);
    };

    updateHeight();
    const subscription = Dimensions.addEventListener('change', updateHeight);
    
    return () => {
      subscription?.remove();
    };
  }, [selectedCours]);



// Et vérifier au chargement de l'app
useEffect(() => {
  
    //loadSavedSubscription();
    //loadInitialData();
}, []);



  // Gestionnaire d'état pour la vidéo
  const onVideoStateChange = (state) => {
  
    
    switch (state) {
      case 'playing':
        setIsPlaying(true);
        break;
      case 'paused':
        setIsPlaying(false);
        break;
      case 'ended':
        setIsPlaying(false);
        // Auto-avancer à la vidéo suivante si disponible
        if (currentVideoIndex < videosList.length - 1) {
          setTimeout(() => {
            const nextIndex = currentVideoIndex + 1;
            loadVideo(videosList[nextIndex], nextIndex, true);
          }, 1000);
        } else {
          Alert.alert("Fin des vidéos", "Vous avez regardé toutes les vidéos de ce cours.");
        }
        break;
      case 'buffering':
        //console.log('Buffering...');
        break;
      case 'unstarted':
        setIsPlaying(false);
        break;
    }
  };

  // Fonction pour charger une nouvelle vidéo
  const loadVideo = (videoId, index, autoPlay = false) => {
    // Arrêter la lecture actuelle
    setIsPlaying(false);
    
    if (videoId === selectedVideoId) {
      // Même vidéo, juste basculer la lecture
      setIsPlaying(!isPlaying);
      return;
    }
    
    setSelectedVideoId(videoId);
    setCurrentVideoIndex(index);
    setVideoLoading(true);
    setIsPlaying(false); // Toujours démarrer en pause
    playerReadyRef.current = false;
    shouldPlayRef.current = autoPlay;
  };

  const handleNextVideo = () => {
    if (currentVideoIndex < videosList.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      loadVideo(videosList[nextIndex], nextIndex, true);
    }
  };

  const handlePreviousVideo = () => {
    if (currentVideoIndex > 0) {
      const prevIndex = currentVideoIndex - 1;
      loadVideo(videosList[prevIndex], prevIndex, true);
    }
  };

  const handlePlayVideo = (index) => {
    if (index >= 0 && index < videosList.length) {
      loadVideo(videosList[index], index, true);
    }
  };

  // Gestionnaire onReady optimisé
  const handlePlayerReady = () => {
   
    setVideoLoading(false);
    playerReadyRef.current = true;
    
    // Si la vidéo doit jouer automatiquement
    if (shouldPlayRef.current) {
      setTimeout(() => {
        setIsPlaying(true);
      }, 300);
    }
  };

  if (!selectedCours || !selectedCours.url_video || videosList.length === 0) {
    return (
      <View style={styles.tabContainer}>
        <Icon name="videocam-off" size={60} color="#95a5a6" />
        <Text style={styles.noContent}>Aucune vidéo disponible</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Vidéo principale */}
      <View style={[styles.videoPlayerContainer, { height: playerHeight }]}>
        {selectedVideoId && (
          <YoutubePlayer
            key={`youtube-player-${selectedVideoId}-${currentVideoIndex}`} // Clé unique pour forcer le re-render
            height={playerHeight}
            width={Dimensions.get('window').width}
            play={isPlaying}
            videoId={selectedVideoId}
            onChangeState={onVideoStateChange}
            onReady={handlePlayerReady}
            onError={(error) => {
              console.error("Erreur vidéo YouTube:", error);
              setVideoLoading(false);
              playerReadyRef.current = false;
              Alert.alert(
                "Erreur", 
                "Impossible de charger la vidéo. Vérifiez votre connexion internet."
              );
            }}
            initialPlayerParams={{
              controls: 1,
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              playsinline: 1,
            }}
            webViewProps={{
              androidLayerType: 'hardware',
              allowsFullscreenVideo: true,
              mediaPlaybackRequiresUserAction: Platform.OS === 'ios',
              allowsInlineMediaPlayback: true,
            }}
          />
        )}
        
        {videoLoading && (
          <View style={[styles.videoLoaderOverlay, { height: playerHeight }]}>
            <ActivityIndicator size="large" color="#FF0000" />
            <Text style={styles.videoLoadingText}>Chargement de la vidéo...</Text>
          </View>
        )}
        
        {/* Bouton de lecture si la vidéo est chargée mais pas en cours de lecture */}
        {!videoLoading && !isPlaying && (
          <TouchableOpacity 
            style={[styles.playButtonOverlay, { height: playerHeight }]}
            onPress={() => setIsPlaying(true)}
            activeOpacity={0.7}
          >
            <View style={styles.playButton}>
              <Icon name="play-arrow" size={50} color="#FFF" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Contrôles de navigation vidéo */}
      <View style={styles.videoControls}>
        <TouchableOpacity
          style={[
            styles.videoControlButton,
            currentVideoIndex === 0 && styles.videoControlButtonDisabled
          ]}
          onPress={handlePreviousVideo}
          disabled={currentVideoIndex === 0}
        >
          <Icon name="skip-previous" size={24} color={currentVideoIndex === 0 ? "#95a5a6" : "#FF0000"} />
          <Text style={styles.videoControlText}>Précédente</Text>
        </TouchableOpacity>
        
        <View style={styles.videoCenterControls}>
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={() => setIsPlaying(!isPlaying)}
            disabled={!playerReadyRef.current}
          >
            <Icon 
              name={isPlaying ? "pause" : "play-arrow"} 
              size={28} 
              color={playerReadyRef.current ? "#FF0000" : "#95a5a6"} 
            />
          </TouchableOpacity>
          
          <Text style={styles.videoCounter}>
            Vidéo {currentVideoIndex + 1} / {videosList.length}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.videoControlButton,
            currentVideoIndex === videosList.length - 1 && styles.videoControlButtonDisabled
          ]}
          onPress={handleNextVideo}
          disabled={currentVideoIndex === videosList.length - 1}
        >
          <Text style={styles.videoControlText}>Suivante</Text>
          <Icon name="skip-next" size={24} color={currentVideoIndex === videosList.length - 1 ? "#95a5a6" : "#FF0000"} />
        </TouchableOpacity>
      </View>

      {/* Liste des vidéos disponibles */}
      <ScrollView style={styles.videoListContainer}>
        <Text style={styles.videoListTitle}>Liste des vidéos ({videosList.length})</Text>
        
        {videosList.map((videoId, index) => (
          <TouchableOpacity
            key={`video-${index}-${videoId}`}
            style={[
              styles.videoListItem,
              index === currentVideoIndex && styles.videoListItemActive
            ]}
            onPress={() => handlePlayVideo(index)}
            activeOpacity={0.7}
          >
            <View style={styles.videoListItemContent}>
              <TouchableOpacity
                onPress={() => handlePlayVideo(index)}
                style={styles.videoPlayButton}
              >
                <Icon 
                  name={index === currentVideoIndex && isPlaying ? "pause-circle" : "play-circle"} 
                  size={28} 
                  color={index === currentVideoIndex ? "#FF0000" : "#3498db"} 
                />
              </TouchableOpacity>
              
              <View style={styles.videoListDetails}>
                <Text style={[
                  styles.videoListTitleText,
                  index === currentVideoIndex && styles.videoListTitleTextActive
                ]}>
                  Vidéo {index + 1} - {selectedCours.titre}
                </Text>
                <Text style={styles.videoListDuration}>
                  {selectedCours.duree || 'Durée non spécifiée'}
                </Text>
              </View>
              
              {index === currentVideoIndex && (
                <View style={styles.playingIndicator}>
                  <Icon name={isPlaying ? "play-arrow" : "pause"} size={16} color="#FF0000" />
                  <Text style={styles.playingText}>
                    {isPlaying ? 'En cours' : 'En pause'}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
  const PdfTab = () => {
    const [pdfLoading, setPdfLoading] = useState(true);

    if (!selectedCours || !selectedCours.url_pdf) {
      return (
        <View style={styles.tabContainer}>
          <Icon name="picture-as-pdf" size={60} color="#95a5a6" />
          <Text style={styles.noContent}>Aucun PDF disponible</Text>
        </View>
      );
    }

    const pdfUrl = selectedCours.url_pdf;

    return (
      <View style={{ flex: 1 }}>
        <WebView
          source={{ uri: pdfUrl }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onLoadStart={() => setPdfLoading(true)}
          onLoadEnd={() => setPdfLoading(false)}
          renderLoading={() => (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={selectedCours.couleur} />
              <Text style={styles.loadingText}>Chargement du PDF...</Text>
            </View>
          )}
        />
        {pdfLoading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={selectedCours.couleur} />
            <Text style={styles.loadingText}>Chargement du PDF...</Text>
          </View>
        )}
      </View>
    );
  };

  const ExercicesTab = () => {
    if (!exercicesList || exercicesList.length === 0) {
      return (
        <View style={styles.tabContainer}>
          <Icon name="assignment" size={60} color="#95a5a6" />
          <Text style={styles.noContent}>Aucun exercice disponible pour ce cours</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.exercicesContainer}>
        <View style={styles.exercicesHeader}>
          <Icon name="assignment" size={30} color="#2c3e50" />
          <Text style={styles.exercicesTitle}>Exercices</Text>
          <View style={styles.exercicesCountBadge}>
            <Text style={styles.exercicesCountText}>{exercicesList.length}</Text>
          </View>
        </View>
        
        <Text style={styles.exercicesSubtitle}>
          {selectedCours?.titre} - {exercicesList.length} exercice(s)
        </Text>
        
        {exercicesList.map((exercice, index) => {
          const exerciceType = exercice.type || 'Exercices';
          
          return (
            <TouchableOpacity 
              key={exercice.id} 
              style={styles.exerciceCard}
              onPress={() => {
                setSelectedCours(exercice);
              }}
            >
              <View style={styles.exerciceHeader}>
                <View style={styles.exerciceNumber}>
                  <Text style={styles.exerciceNumberText}>Ex {index + 1}</Text>
                </View>
                <View style={styles.exerciceTypeBadge}>
                  <Icon name="assignment" size={16} color="#FFF" />
                  <Text style={styles.exerciceTypeText}>{exerciceType}</Text>
                </View>
              </View>
              
              <Text style={styles.exerciceTitle}>{exercice.titre}</Text>
              <Text style={styles.exerciceDescription} numberOfLines={3}>
                {exercice.description}
              </Text>
              
              <View style={styles.exerciceFooter}>
                <View style={styles.exerciceInfo}>
                  <Icon name="access-time" size={14} color="#7f8c8d" />
                  <Text style={styles.exerciceInfoText}>
                    {exercice.duree_formatee || exercice.duree_minutes + ' min'}
                  </Text>
                </View>
                
                <View style={styles.exerciceInfo}>
                  <Icon name="school" size={14} color="#7f8c8d" />
                  <Text style={styles.exerciceInfoText}>{exercice.enseignant}</Text>
                </View>
                
                <View style={[styles.difficultyBadge, 
                  { backgroundColor: 
                    exercice.difficulte === 'avancé' ? '#e74c3c' : 
                    exercice.difficulte === 'intermédiaire' ? '#f39c12' : '#2ecc71'
                  }
                ]}>
                  <Text style={styles.difficultyText}>{exercice.difficulte}</Text>
                </View>
              </View>
              
              <View style={styles.exerciceResources}>
                {exercice.url_pdf && (
                  <TouchableOpacity
                    style={[styles.resourceButton, { backgroundColor: '#3498db' }]}
                    onPress={() => Linking.openURL(exercice.url_pdf)}
                  >
                    <Icon name="picture-as-pdf" size={18} color="#FFF" />
                    <Text style={styles.resourceButtonText}>PDF</Text>
                  </TouchableOpacity>
                )}
                
                {exercice.url_video && (
                  <TouchableOpacity
                    style={[styles.resourceButton, { backgroundColor: '#e74c3c' }]}
                    onPress={() => {
                      setSelectedCours(exercice);
                    }}
                  >
                    <Icon name="play-circle" size={18} color="#FFF" />
                    <Text style={styles.resourceButtonText}>Vidéo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  const DetailsTab = () => {
    if (!selectedCours) return null;

    const niveauColor = abonnementActif?.couleur_principale || 
                       getNiveauColor(abonnementActif?.niveau).primary;
    const coursType = selectedCours.type || 'Cours';

    return (
      <ScrollView style={styles.detailsContainer2}>
        <View style={styles.detailsHeader2}>
          <View style={styles.courseCodeContainer2}>
            <Text style={styles.detailTitle2}>{selectedCours.titre}</Text>
          </View>
  
          <Text style={styles.detailDescription2}>{selectedCours.description}</Text>
          
          <View style={styles.statsRow2}>
            <View style={styles.statItem2}>
              <Icon name="visibility" size={16} color={niveauColor} />
              <Text style={styles.statText2}>{formatNumber(selectedCours.vues)} vues</Text>
            </View>
            <View style={styles.statItem2}>
              <Icon name="download" size={16} color={niveauColor} />
              <Text style={styles.statText2}>{formatNumber(selectedCours.telechargements)} téléchargements</Text>
            </View>
            <View style={styles.statItem2}>
              <Icon name="assignment" size={16} color={niveauColor} />
              <Text style={styles.statText2}>{coursType}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.detailsSection2}>
          <Text style={[styles.sectionTitle2, { color: niveauColor }]}>Informations générales</Text>
          <View style={styles.infoRow2}>
            <Icon name="school" size={20} color={niveauColor} />
            <Text style={styles.infoLabel2}>Matière:</Text>
            <Text style={styles.infoValue2}>{selectedCours.matiere}</Text>
          </View>
          <View style={styles.infoRow2}>
            <Icon name="grade" size={20} color={niveauColor} />
            <Text style={styles.infoLabel2}>Niveau:</Text>
            <Text style={styles.infoValue2}>{selectedCours.niveau}</Text>
          </View>
          <View style={styles.infoRow2}>
            <Icon name="person" size={20} color={niveauColor} />
            <Text style={styles.infoLabel2}>Enseignant:</Text>
            <Text style={styles.infoValue2}>{selectedCours.enseignant || 'Non spécifié'}</Text>
          </View>
          <View style={styles.infoRow2}>
            <Icon name="access-time" size={20} color={niveauColor} />
            <Text style={styles.infoLabel2}>Durée:</Text>
            <Text style={styles.infoValue2}>{selectedCours.duree || 'Non spécifiée'}</Text>
          </View>
          <View style={styles.infoRow2}>
            <Icon name="date-range" size={20} color={niveauColor} />
            <Text style={styles.infoLabel2}>Date:</Text>
            <Text style={styles.infoValue2}>{selectedCours.date}</Text>
          </View>
          {selectedCours.mots_cles && (
            <View style={styles.infoRow2}>
              <Icon name="tag" size={20} color={niveauColor} />
              <Text style={styles.infoLabel2}>Mots-clés:</Text>
              <Text style={styles.infoValue2}>{selectedCours.mots_cles}</Text>
            </View>
          )}
        </View>

        {selectedCours.contenu_text && (
          <View style={styles.detailsSection2}>
            <Text style={[styles.sectionTitle2, { color: niveauColor }]}>Contenu</Text>
            <Text style={styles.contenuText2}>{selectedCours.contenu_text}</Text>
          </View>
        )}

        <View style={styles.detailsSection2}>
          <Text style={[styles.sectionTitle2, { color: niveauColor }]}>Ressources externes</Text>
          {selectedCours.url_video && (
            <TouchableOpacity
              style={styles.linkButton2}
              onPress={() => Linking.openURL(selectedCours.url_video)}
            >
              <Icon name="play-circle" size={24} color="#FFF" />
              <Text style={styles.linkButtonText2}>Découvrir les vidéos</Text>
            </TouchableOpacity>
          )}
          {selectedCours.url_pdf && (
            <TouchableOpacity
              style={[styles.linkButton2, styles.pdfButton2]}
              onPress={() => Linking.openURL(selectedCours.url_pdf)}
            >
              <Icon name="description" size={24} color="#FFF" />
              <Text style={styles.linkButtonText2}>Découvrir les PDF</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  // Modal de saisie de code
const renderCodeModal = () => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={showCodeModal}
    onRequestClose={() => {
      setShowCodeModal(false);
      setCodeInput('');
      setCodeError(false);
    }}
  >
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.modalContainer}
    >
      <TouchableOpacity 
        style={styles.modalBackdrop}
        activeOpacity={1}
        onPress={() => {
          setShowCodeModal(false);
          setCodeInput('');
          setCodeError(false);
        }}
      >
        <View style={styles.modalContentWrapper}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Code d'accès</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setShowCodeModal(false);
                    setCodeInput('');
                    setCodeError(false);
                  }}
                  style={styles.modalCloseButton}
                >
                  <Icon name="close" size={24} color="#2c3e50" />
                </TouchableOpacity>
              </View>
              
              {/* Body */}
              <View style={styles.modalBody}>
                <View style={styles.modalIconContainer}>
                  <Icon name="lock" size={50} color="#3498db" />
                </View>
                
                <Text style={styles.modalText}>
                  Entrez votre code d'abonnement à 6 chiffres
                </Text>
                
                {/* Affichage du code */}
                <View style={styles.codeDisplay}>
                  {[0,1,2,3,4,5].map((index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.modalCodeDigit,
                        codeInput[index] && styles.modalCodeDigitFilled,
                        codeError && styles.modalCodeDigitError
                      ]}
                    >
                      <Text style={styles.modalCodeDigitText}>
                        {codeInput[index] || ''}
                      </Text>
                    </View>
                  ))}
                </View>
                
                {/* Messages d'erreur/hors ligne */}
                {codeError && (
                  <View style={styles.errorContainer}>
                    <Icon name="error" size={20} color="#e74c3c" />
                    <Text style={styles.errorText}>Code invalide. Veuillez réessayer.</Text>
                  </View>
                )}
                
                {!isConnected && (
                  <View style={styles.offlineContainer}>
                    <Icon name="wifi-off" size={20} color="#f39c12" />
                    <Text style={styles.offlineText}>Vous êtes hors ligne</Text>
                  </View>
                )}
                
                {/* Clavier numérique */}
                <View style={styles.modalKeypad}>
                  {/* Première ligne */}
                  <View style={styles.modalKeypadRow}>
                    {[1,2,3].map(num => (
                      <TouchableOpacity 
                        key={num}
                        style={styles.modalKeypadKey}
                        onPress={() => setCodeInput(prev => prev.length < 6 ? prev + num : prev)}
                        disabled={codeInput.length >= 6}
                      >
                        <Text style={styles.modalKeypadKeyText}>{num}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Deuxième ligne */}
                  <View style={styles.modalKeypadRow}>
                    {[4,5,6].map(num => (
                      <TouchableOpacity 
                        key={num}
                        style={styles.modalKeypadKey}
                        onPress={() => setCodeInput(prev => prev.length < 6 ? prev + num : prev)}
                        disabled={codeInput.length >= 6}
                      >
                        <Text style={styles.modalKeypadKeyText}>{num}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Troisième ligne */}
                  <View style={styles.modalKeypadRow}>
                    {[7,8,9].map(num => (
                      <TouchableOpacity 
                        key={num}
                        style={styles.modalKeypadKey}
                        onPress={() => setCodeInput(prev => prev.length < 6 ? prev + num : prev)}
                        disabled={codeInput.length >= 6}
                      >
                        <Text style={styles.modalKeypadKeyText}>{num}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Quatrième ligne */}
                  <View style={styles.modalKeypadRow}>
                    <TouchableOpacity 
                      style={[styles.modalKeypadKey, styles.modalDeleteKey]}
                      onPress={() => setCodeInput(prev => prev.slice(0, -1))}
                      disabled={codeInput.length === 0}
                    >
                      <Icon name="backspace" size={24} color="#e74c3c" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.modalKeypadKey}
                      onPress={() => setCodeInput(prev => prev.length < 6 ? prev + '0' : prev)}
                      disabled={codeInput.length >= 6}
                    >
                      <Text style={styles.modalKeypadKeyText}>0</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.modalKeypadKey, 
                        styles.modalSubmitKey,
                        codeInput.length !== 6 && styles.modalSubmitKeyDisabled
                      ]}
                      onPress={handleCodeSubmit}
                      disabled={codeInput.length !== 6 || loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Icon name="check" size={24} color="#2ecc71" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  </Modal>
);



  // Écran du tableau de bord
  const renderDashboard = () => (
    <ScrollView 
      style={styles.dashboardScreen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={loadInitialData}
          colors={['#3498db']}
          tintColor="#3498db"
        />
      }
    >


      {/* Statistiques */}
      <View style={styles.statsSection}>
        
         <View style={styles.headerContent}>
<Text style={styles.sectionTitle}>Aperçu général</Text>
          {abonnementActif ? (
            <TouchableOpacity 
              style={[
                styles.subscriptionBadge, 
                { backgroundColor: abonnementActif.couleur_principale || '#3498db' }
              ]}
              onPress={() => Alert.alert(
                'Votre abonnement',
                `Niveau: ${abonnementActif.niveau}\nCode: ${abonnementActif.code}\nExpire le: ${abonnementActif.date_expiration}`,
                [
                  { text: 'OK', style: 'default' },
                  { 
                    text: 'Changer de code', 
                    onPress: () => setShowCodeModal(true) 
                  },
                  { 
                    text: 'Déconnexion', 
                    style: 'destructive',
                    onPress: handleLogout
                  }
                ]
              )}
            >
              <Icon name="verified" size={20} color="#FFF" />
              <Text style={styles.subscriptionText}>{abonnementActif.nom}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={() => setShowCodeModal(true)}
            >
              <Icon name="lock" size={20} color="#FFF" />
              <Text style={styles.subscribeText}>Accéder au cours</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#3498db' }]}>
            <Icon name="library-books" size={28} color="#FFF" />
            <Text style={styles.statValue}>{formatNumber(stats.totalCours)}</Text>
            <Text style={styles.statLabel}>Cours</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#2ecc71' }]}>
            <Icon name="subject" size={28} color="#FFF" />
            <Text style={styles.statValue}>{stats.totalMatieres}</Text>
            <Text style={styles.statLabel}>Matières</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#9b59b6' }]}>
            <Icon name="school" size={28} color="#FFF" />
            <Text style={styles.statValue}>{formatNumber(stats.totalEnseignants)}</Text>
            <Text style={styles.statLabel}>Enseignants</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#1abc9c' }]}>
            <Icon name="people" size={28} color="#FFF" />
            <Text style={styles.statValue}>{formatNumber(stats.totalEleves)}</Text>
            <Text style={styles.statLabel}>Élèves</Text>
          </View>
        </View>
      </View>

    {/* Niveaux disponibles */}
<View style={styles.quickNavSection}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Niveaux disponibles</Text>
  </View>
  
  <Text style={styles.sectionSubtitle}>
    {abonnementActif 
      ? `Vous avez accès au niveau ${abonnementActif.niveau}`
      : niveaux.length === 0 
        ? 'Aucun niveau disponible pour cette catégorie'
        : 'Obtenez un code pour débloquer un niveau'}
  </Text>
  
  {niveaux.length > 0 ? (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickNavScroll}>
      {niveaux.map((niveau, index) => {
        const isActive = abonnementActif && abonnementActif.niveau === niveau.nom;
        const niveauColor = niveau.couleur_principale || 
                           getNiveauColor(niveau.nom).primary;
        return (
          <TouchableOpacity 
            key={niveau.id}
            style={[
              styles.quickNavItem,
              { backgroundColor: niveauColor },
              isActive && styles.levelCardActive
            ]}
            onPress={() => handleSelectNiveau(niveau)}
          >
            <View style={styles.levelHeader2}>
              <Icon name="school" size={28} color="#FFF" />
              {isActive && (
                <View style={styles.activeBadge}>
                  <Icon name="check-circle" size={14} color="#FFF" />
                </View>
              )}
            </View>
            <Text style={styles.quickNavText}>{niveau.code}</Text>
            <Text style={styles.quickNavCount}>{niveau.cours_count} cours</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  ) : (
    <View style={styles.noLevelsContainer}>
      <Icon name="school" size={50} color="#bdc3c7" />
      <Text style={styles.noLevelsText}>
        Aucun niveau disponible pour cette catégorie
      </Text>
      <Text style={styles.noLevelsSubtext}>
        Les niveaux seront bientôt ajoutés
      </Text>
    </View>
  )}
</View>

      {/* Guide d'utilisation */}
   
        <View style={styles.guideSection}>
          <Text style={styles.sectionTitle}>Comment accéder aux cours ?</Text>
          <View style={styles.guideSteps}>
            <View style={styles.guideStep}>
              <View style={[styles.stepNumber, { backgroundColor: '#3498db' }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Obtenez un code</Text>
                <Text style={styles.stepDescription}>Remplissez le formulaire pour obtenir votre code d'accès</Text>
              </View>
            </View>
            <View style={styles.guideStep}>
              <View style={[styles.stepNumber, { backgroundColor: '#2ecc71' }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Activez votre code</Text>
                <Text style={styles.stepDescription}>Utilisez le code reçu pour activer votre abonnement</Text>
              </View>
            </View>
            <View style={styles.guideStep}>
              <View style={[styles.stepNumber, { backgroundColor: '#f39c12' }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Accédez aux cours</Text>
                <Text style={styles.stepDescription}>Explorez toutes les matières et ressources du niveau</Text>
              </View>
            </View>
          </View>
        </View>
      
    </ScrollView>
  );

  // Écran des matières
  const renderMatieresScreen = () => {
    if (!abonnementActif) return null;

    const niveauColor = abonnementActif.couleur_principale || 
                       getNiveauColor(abonnementActif.niveau).primary;

    return (
      <Animated.View 
        style={[
          styles.contentScreen,
          { opacity: fadeAnim }
        ]}
      >
        <View style={[styles.matiereHeader, { backgroundColor: niveauColor }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
          >
            <Icon name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.matiereHeaderTitle}>Matières - {abonnementActif.niveau}</Text>
            <Text style={styles.matiereHeaderSubtitle}>Sélectionnez une matière pour voir les cours</Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Icon name="logout" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={niveauColor} />
            <Text style={styles.loadingText}>Chargement des matières...</Text>
          </View>
        ) : matieres.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="library-books" size={60} color="#bdc3c7" />
            <Text style={styles.emptyStateTitle}>Aucune matière disponible</Text>
            <Text style={styles.emptyStateText}>
              Les matières pour ce niveau seront bientôt disponibles
            </Text>
          </View>
        ) : (
          <FlatList
            data={matieres}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.matiereList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[
                  styles.matiereCard,
                  { borderLeftColor: item.couleur }
                ]}
                onPress={() => loadCoursForMatiere(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.matiereIconContainer, { 
                  backgroundColor: item.couleur + '20' 
                }]}>
                  <Icon name={item.icon} size={32} color={item.couleur} />
                </View>
                <Text style={styles.matiereName} numberOfLines={2}>{item.matiere}</Text>
                <View style={styles.matiereStats}>
                  <Icon name="library-books" size={14} color={item.couleur} />
                  <Text style={[styles.matiereCount, { color: item.couleur }]}>
                    {item.count} cours
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </Animated.View>
    );
  };

  // Écran des cours avec onglets Cours/Exercices
  const renderCoursScreen = () => {
    if (!selectedMatiere || !abonnementActif) return null;

    const niveauColor = abonnementActif.couleur_principale || 
                       getNiveauColor(abonnementActif.niveau).primary;

  // Déclarez programmes ici pour pouvoir l'utiliser dans le JSX
  const programmes = parseProgrammes(selectedMatiere.description);
  const programmesCount = programmes.length;

   const renderCoursContent = () => {
  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={niveauColor} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Contenu pour l'onglet Programmes
  if (activeSubTab === 'programmes') {
    const programmes = parseProgrammes(selectedMatiere.description);
    
    if (programmes.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Icon name="menu-book" size={60} color="#bdc3c7" />
          <Text style={styles.emptyStateTitle}>Aucun programme disponible</Text>
          <Text style={styles.emptyStateText}>
            Les programmes pour cette matière seront bientôt disponibles
          </Text>
        </View>
      );
    }

    return (
      <ScrollView 
        style={styles.programmesContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.programmesContent}
      >


        <View style={styles.programmesCard}>

          {programmes.map((item, index) => {
            // Essayer de détecter si l'item commence par un numéro (ex: "1.", "Chapitre 1:", etc.)
            const hasNumber = /^\d+\.|^[IiVX]+\.|^Chapitre \d+|^Partie \d+/i.test(item);
            
            return (
              <View key={index} style={styles.programmeItem}>
                <View style={styles.programmeNumberContainer}>
                  <View style={[styles.programmeNumber, { backgroundColor: niveauColor + '20' }]}>
                    <Text style={[styles.programmeNumberText, { color: niveauColor }]}>
                      {hasNumber ? '' : index + 1}
                    </Text>
                  </View>
                </View>
                <View style={styles.programmeContent}>
                  <Text style={styles.programmeText}>{item}</Text>
                  
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.programmesFooter}>
          <Icon name="info-outline" size={16} color="#95a5a6" />
          <Text style={styles.programmesFooterText}>
            Programme officiel - {abonnementActif?.niveau}
          </Text>
        </View>
      </ScrollView>
    );
  }

  // Reste du code pour Cours et Exercices (inchangé)
  const dataToRender = activeSubTab === 'cours' ? coursList : exercicesList;
  const emptyText = activeSubTab === 'cours' 
    ? 'Aucun cours disponible' 
    : 'Aucun exercice disponible';
  const emptyIcon = activeSubTab === 'cours' ? 'book' : 'assignment';

  if (dataToRender.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Icon name={emptyIcon} size={60} color="#bdc3c7" />
        <Text style={styles.emptyStateTitle}>{emptyText}</Text>
        <Text style={styles.emptyStateText}>
          Le contenu pour cette matière sera bientôt disponible
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={dataToRender}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.coursList}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => {
        const itemType = item.type || (activeSubTab === 'cours' ? 'Cours' : 'Exercices');
        
        return (
          <TouchableOpacity 
            style={styles.coursCard}
            onPress={() => {
              setSelectedCours(item);
              setActiveTab('detail');
            }}
            activeOpacity={0.7}
          >
            <View style={styles.coursHeaderCard}>
              <View style={[styles.coursType, { backgroundColor: item.couleur }]}>
                <Icon name={itemType === 'Exercices' ? 'assignment' : 'school'} size={14} color="#FFF" />
                <Text style={styles.coursTypeText}>{item.code} - {itemType}</Text>
              </View>
  
            </View>
            
            <Text style={styles.coursTitle}>{item.titre}</Text>
            <Text style={styles.coursDescription} numberOfLines={3}>
              {item.description}
            </Text>
            
            <View style={styles.coursFooter}>
              <View style={styles.coursInfo}>
                <Icon name="person" size={16} color={item.couleur} />
                <Text style={[styles.coursInfoText, { color: item.couleur }]}>
                  {item.enseignant}
                </Text>
              </View>
              <View style={styles.coursInfo}>
                <Icon name="access-time" size={16} color={item.couleur} />
                <Text style={[styles.coursInfoText, { color: item.couleur }]}>
                  {item.duree_formatee || item.duree_minutes + ' min'}
                </Text>
              </View>
            </View>
            
            <View style={styles.coursResources}>
              {item.url_video && (
                <View style={[styles.resourceBadge, { backgroundColor: item.couleur + '20' }]}>
                  <Icon name="videocam" size={14} color={item.couleur} />
                  <Text style={[styles.resourceText, { color: item.couleur }]}>Vidéo</Text>
                </View>
              )}
              {item.url_pdf && (
                <View style={[styles.resourceBadge, { backgroundColor: item.couleur + '20' }]}>
                  <Icon name="picture-as-pdf" size={14} color={item.couleur} />
                  <Text style={[styles.resourceText, { color: item.couleur }]}>PDF</Text>
                </View>
              )}
              
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
};

    return (
      <Animated.View style={[styles.contentScreen, { opacity: fadeAnim }]}>
        <View style={[styles.coursHeader, { backgroundColor: niveauColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.coursHeaderTitle}>{selectedMatiere.matiere}</Text>
            <Text style={styles.coursHeaderSubtitle}>
              {abonnementActif.niveau} • {coursList.length + exercicesList.length} contenus disponibles
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

{/* Sous-onglets Cours/Exercices/Programmes */}
<View style={styles.subTabsContainer}>
  <TouchableOpacity
    style={[
      styles.subTab,
      activeSubTab === 'cours' && [styles.subTabActive, { borderBottomColor: niveauColor }]
    ]}
    onPress={() => setActiveSubTab('cours')}
  >
    <Icon 
      name="school" 
      size={20} 
      color={activeSubTab === 'cours' ? niveauColor : '#95a5a6'} 
    />
    <Text style={[
      styles.subTabText,
      activeSubTab === 'cours' && [styles.subTabTextActive, { color: niveauColor }]
    ]}>
      Cours ({coursList.length})
    </Text>
  </TouchableOpacity>
  
  <TouchableOpacity
    style={[
      styles.subTab,
      activeSubTab === 'exercices' && [styles.subTabActive, { borderBottomColor: niveauColor }]
    ]}
    onPress={() => setActiveSubTab('exercices')}
  >
    <Icon 
      name="assignment" 
      size={20} 
      color={activeSubTab === 'exercices' ? niveauColor : '#95a5a6'} 
    />
    <Text style={[
      styles.subTabText,
      activeSubTab === 'exercices' && [styles.subTabTextActive, { color: niveauColor }]
    ]}>
      Exercices ({exercicesList.length})
    </Text>
  </TouchableOpacity>

  {/* Nouvel onglet Programmes */}
  <TouchableOpacity
    style={[
      styles.subTab,
      activeSubTab === 'programmes' && [styles.subTabActive, { borderBottomColor: niveauColor }]
    ]}
    onPress={() => setActiveSubTab('programmes')}
  >
    <Icon 
      name="menu-book" 
      size={20} 
      color={activeSubTab === 'programmes' ? niveauColor : '#95a5a6'} 
    />
    <Text style={[
      styles.subTabText,
      activeSubTab === 'programmes' && [styles.subTabTextActive, { color: niveauColor }]
    ]}>
      Programmes ({programmesCount})
    </Text>
  </TouchableOpacity>
</View>

        {renderCoursContent()}
      </Animated.View>
    );
  };

  // Écran détail du cours
  const renderDetailScreen = () => {
    if (!selectedCours || !abonnementActif) return null;

    const niveauColor = abonnementActif.couleur_principale || 
                       getNiveauColor(abonnementActif.niveau).primary;
    const coursType = selectedCours.type || 'Cours';

    // Déterminer quels onglets afficher selon le type de contenu
    const tabsToShow = [];
    if (selectedCours.url_video) tabsToShow.push('Vidéo');
    if (selectedCours.url_pdf) tabsToShow.push('PDF');
    if (coursType === 'Exercices') tabsToShow.push('Exercices');
    tabsToShow.push('Détails');

    return (
      <View style={styles.container}>
        <View style={[styles.detailHeader, { backgroundColor: niveauColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.detailHeaderTitle} numberOfLines={1}>
              {selectedCours.titre}
            </Text>
            <Text style={styles.detailHeaderSubtitle}>
              {coursType} • {selectedCours.matiere} • {abonnementActif.niveau}
            </Text>
          </View>
          <TouchableOpacity onPress={handleBack}>
            <Icon name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
        
        <Tab.Navigator
          screenOptions={{
            tabBarLabelStyle: styles.tabLabel,
            tabBarIndicatorStyle: [styles.tabIndicator, { backgroundColor: '#FFF' }],
            tabBarStyle: [styles.tabBar, { backgroundColor: niveauColor }],
            tabBarActiveTintColor: '#FFF',
            tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
          }}
        >
          {tabsToShow.map(tabName => {
            let Component;
            switch(tabName) {
              case 'Vidéo':
                Component = VideoTab;
                break;
              case 'PDF':
                Component = PdfTab;
                break;
              case 'Exercices':
                Component = ExercicesTab;
                break;
              case 'Détails':
                Component = DetailsTab;
                break;
              default:
                Component = DetailsTab;
            }
            
            return (
              <Tab.Screen 
                key={tabName} 
                name={tabName} 
                component={Component}
              />
            );
          })}
        </Tab.Navigator>
      </View>
    );
  };

  // Rendu principal
  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>

{/* Navigation principale */}
<View style={styles.mainNavigation}>
  <TouchableOpacity
    style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
    onPress={() => setActiveTab('dashboard')}
  >
    <Icon 
      name="dashboard" 
      size={24} 
      color={activeTab === 'dashboard' ? '#3498db' : '#95a5a6'} 
    />
    <Text style={[
      styles.navText,
      activeTab === 'dashboard' && styles.navTextActive
    ]}>Accueil</Text>
  </TouchableOpacity>

  {/* Toujours afficher l'onglet Matières, mais grisé si non abonné */}
  <TouchableOpacity
    style={[
      styles.navItem, 
      activeTab === 'matieres' && styles.navItemActive,
      !abonnementActif && styles.navItemDisabled
    ]}
    onPress={() => {
      if (abonnementActif) {
        setActiveTab('matieres');
      } else {
        Alert.alert(
          'Accès requis',
          'Veuillez d\'abord activer un abonnement pour accéder aux matières',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Activer un abonnement', onPress: () => setShowCodeModal(true) }
          ]
        );
      }
    }}
    disabled={!abonnementActif && activeTab !== 'matieres'}
  >
    <Icon 
      name="subject" 
      size={24} 
      color={
        activeTab === 'matieres' 
          ? '#3498db' 
          : !abonnementActif 
            ? '#ccc' 
            : '#95a5a6'
      } 
    />
    <Text style={[
      styles.navText,
      activeTab === 'matieres' && styles.navTextActive,
      !abonnementActif && styles.navTextDisabled
    ]}>Matières</Text>
  </TouchableOpacity>

  {/* Toujours afficher l'onglet Cours, mais grisé si non abonné ou aucune matière sélectionnée */}
  <TouchableOpacity
    style={[
      styles.navItem, 
      activeTab === 'cours' && styles.navItemActive,
      (!abonnementActif || !selectedMatiere) && styles.navItemDisabled
    ]}
    onPress={() => {
      if (abonnementActif && selectedMatiere) {
        setActiveTab('cours');
      } else if (!abonnementActif) {
        Alert.alert(
          'Accès requis',
          'Veuillez d\'abord activer un abonnement pour accéder aux cours',
          [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Activer un abonnement', onPress: () => setShowCodeModal(true) }
          ]
        );
      } else {
        Alert.alert(
          'Sélection requise',
          'Veuillez d\'abord sélectionner une matière',
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Voir les matières', 
              onPress: () => setActiveTab('matieres') 
            }
          ]
        );
      }
    }}
    disabled={(!abonnementActif || !selectedMatiere) && activeTab !== 'cours'}
  >
    <Icon 
      name="library-books" 
      size={24} 
      color={
        activeTab === 'cours' && selectedMatiere
          ? '#3498db' 
          : (!abonnementActif || !selectedMatiere)
            ? '#ccc' 
            : '#95a5a6'
      } 
    />
    <Text style={[
      styles.navText,
      activeTab === 'cours' && selectedMatiere && styles.navTextActive,
      (!abonnementActif || !selectedMatiere) && styles.navTextDisabled
    ]}>Cours</Text>
  </TouchableOpacity>
</View>

      {/* Écrans de contenu */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'matieres' && renderMatieresScreen()}
      {activeTab === 'cours' && renderCoursScreen()}
      {activeTab === 'detail' && renderDetailScreen()}

      {/* Modal de saisie de code */}
      {renderCodeModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Navigation principale
  mainNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    zIndex: 1000,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
  },
  navItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  navItemDisabled: {
    opacity: 0.5,
  },
  navText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  navTextDisabled: {
    color: '#ccc',
  },
  // Dashboard
  dashboardScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  dashboardHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#F8F9FA',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  subscriptionText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  subscribeButton2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  subscribeText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 6,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f39c12',
    padding: 8,
    borderRadius: 10,
    marginTop: 5,
  },
  offlineBannerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Sections
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 25,
  },
  levelsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F8F9FA',
    marginTop: 10,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  recentSection: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: '#FFFFFF',
  },
  guideSection: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: '#F8F9FA',
    marginTop: 10,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  // Statistiques
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  statCard: {
    width: '48%',
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  // Scroll horizontal des niveaux
  levelsScroll: {
    marginTop: 10,
  },
  levelsScrollContent: {
    paddingRight: 20,
  },
  levelCard: {
    width: 180,
    height: 180,
    borderRadius: 20,
    marginRight: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  levelCardActive: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    transform: [{ scale: 1.02 }],
  },
  levelCardContent: {
    flex: 1,
    padding: 20,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  levelHeader2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
   noLevelsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  
  noLevelsText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  
  noLevelsSubtext: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  activeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 4,
    borderRadius: 10,
  },
  levelName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  levelStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    marginLeft: 6,
  },
  // Cours récents
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  recentBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  recentBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  recentDetails: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  recentMeta: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  recentStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentStatText: {
    fontSize: 11,
    color: '#95a5a6',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginTop: 15,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Guide d'utilisation
  guideSteps: {
    marginTop: 15,
  },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepNumberText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  // Remplacer ou ajouter ces styles dans l'objet styles

// Modal de code - Styles corrigés
modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContentWrapper: {
    width: width * 0.9,
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 24,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  codeDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  modalCodeDigit: {
    width: 40,
    height: 50,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  modalCodeDigitFilled: {
    borderColor: '#3498db',
    backgroundColor: '#ebf5ff',
  },
  modalCodeDigitError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdedec',
  },
  modalCodeDigitText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fdedec',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 14,
    marginLeft: 8,
  },
  offlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef5e7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  offlineText: {
    color: '#f39c12',
    fontSize: 14,
    marginLeft: 8,
  },
  modalKeypad: {
    marginTop: 20,
  },
  modalKeypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalKeypadKey: {
    flex: 1,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalKeypadKeyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalDeleteKey: {
    backgroundColor: '#fdedec',
    borderColor: '#e74c3c',
  },
  modalSubmitKey: {
    backgroundColor: '#ebf5ff',
    borderColor: '#2ecc71',
  },
  modalSubmitKeyDisabled: {
    opacity: 0.5,
    backgroundColor: '#f8f9fa',
    borderColor: '#e0e0e0',
  },
    // Styles pour le formulaire d'obtention de code
  prixContainer: {
    marginBottom: 20,
  },
  prixInfoCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  prixTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  prixDetails: {
    alignItems: 'center',
    marginBottom: 10,
  },
  prixOriginal: {
    fontSize: 16,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
    marginBottom: 5,
  },
  prixReduit: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  prixNormal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  reductionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  reductionText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  prixDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  codePromoContainer: {
    marginBottom: 20,
  },
  codePromoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  codePromoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  codePromoInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
    marginRight: 10,
  },
  codePromoInputFull: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 18,
    color: '#2c3e50',
    marginBottom: 20,
  },
  verifierButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
  },
  verifierButtonFull: {
    backgroundColor: '#3498db',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  verifierButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
  },
  verifierButtonTextFull: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  codePromoValid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAFAF1',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  codePromoValidText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  codePromoInvalid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  codePromoInvalidText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  codePromoResultValid: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#EAFAF1',
    borderRadius: 15,
    marginTop: 10,
  },
  codePromoResultInvalid: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FDEDEC',
    borderRadius: 15,
    marginTop: 10,
  },
  codePromoResultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  codePromoResultText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  codePromoResultPrix: {
    fontSize: 14,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
  },
  codePromoResultPrixReduit: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 5,
  },
  formContainer: {
    width: '100%',
    marginBottom: 30,
  },
  formRow: {
    marginBottom: 20,
    position: 'relative',
  },
  formIcon: {
    position: 'absolute',
    left: 12,
    top: 15,
    zIndex: 1,
  },
  formInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 45,
    paddingVertical: 15,
    fontSize: 16,
    color: '#2c3e50',
  },
  formSelectContainer: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 45,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  formSelectText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  formPlaceholder: {
    color: '#95a5a6',
  },
  niveauOptions: {
    maxHeight: 150,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 5,
    display: 'none',
  },
  niveauOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  niveauOptionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  typeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typeButtonActive: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#f39c12',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  submitButtonDisabled: {
    backgroundColor: '#f1c40f',
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  formInfo: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Styles des écrans de contenu
  contentScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  matiereHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  matiereHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  matiereHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  coursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  coursHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  coursHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  backButton: {
    padding: 5,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 15,
  },
  // Sous-onglets Cours/Exercices
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  subTabActive: {
    borderBottomWidth: 2,
  },
  subTabText: {
    fontSize: 14,
    color: '#95a5a6',
    marginLeft: 6,
    fontWeight: '500',
  },
  subTabTextActive: {
    fontWeight: 'bold',
  },
  // Matières
  matiereList: {
    padding: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  matiereCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderLeftWidth: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 180,
    marginBottom: 15,
  },
  matiereIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    alignSelf: 'center',
  },
  matiereName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
    height: 44,
  },
  matiereStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  matiereCount: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Cours
  coursList: {
    padding: 20,
  },
  coursCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  coursHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  coursType: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  coursTypeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginLeft: 5,
  },
  coursDate: {
    fontSize: 13,
    color: '#95a5a6',
    fontWeight: '500',
  },
  coursTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    lineHeight: 26,
  },
  coursDescription: {
    fontSize: 15,
    color: '#5d6d7e',
    lineHeight: 22,
    marginBottom: 20,
  },
  coursFooter: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  coursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  coursInfoText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  coursResources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  resourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
    marginBottom: 5,
  },
  resourceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  difficultyText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  // Détail du cours
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  detailHeaderSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  tabBar: {
    elevation: 0,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'none',
  },
  tabIndicator: {
    height: 3,
  },
  // Styles pour les vidéos YouTube
  videoPlayerContainer: {
  backgroundColor: '#000',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
},
videoLoaderOverlay: {
  position: 'absolute',
  backgroundColor: 'rgba(0,0,0,0.7)',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  zIndex: 10,
},
playButtonOverlay: {
  position: 'absolute',
  backgroundColor: 'rgba(0,0,0,0.3)',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  zIndex: 5,
},
playButton: {
  backgroundColor: 'rgba(255,0,0,0.7)',
  width: 80,
  height: 80,
  borderRadius: 40,
  justifyContent: 'center',
  alignItems: 'center',
},
videoCenterControls: {
  alignItems: 'center',
},
playPauseButton: {
  padding: 10,
  backgroundColor: '#F8F9FA',
  borderRadius: 30,
  marginBottom: 5,
},
  videoLoadingText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 14,
  },
  videoControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  videoControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  videoControlButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  videoControlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginHorizontal: 5,
  },
  videoCounter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  videoListContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  videoListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
  },
  videoListItem: {
    backgroundColor: '#FFF',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  videoListItemActive: {
    backgroundColor: '#EBF5FB',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  videoListItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoListDetails: {
    flex: 1,
    marginLeft: 15,
  },
  videoListTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  videoListTitleTextActive: {
    color: '#3498db',
  },
  videoListDuration: {
    fontSize: 12,
    color: '#95a5a6',
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  playingText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '600',
    marginLeft: 4,
  },
  // Exercices
  exercicesContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  exercicesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  exercicesTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 15,
  },
  exercicesCountBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: 10,
  },
  exercicesCountText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
  },
  exercicesSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
  },
  exerciceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 10,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  exerciceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  exerciceNumber: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
  },
  exerciceNumberText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  exerciceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  exerciceTypeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  exerciceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  exerciceDescription: {
    fontSize: 14,
    color: '#5d6d7e',
    lineHeight: 20,
    marginBottom: 15,
  },
  exerciceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  exerciceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciceInfoText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  exerciceResources: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  resourceButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    marginLeft: 5,
  },
  // WebView
  webview: {
    flex: 1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 15,
  },
  tabContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#F8F9FA',
  },
  noContent: {
    fontSize: 18,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 15,
    fontWeight: '600',
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  detailsHeader: {
    padding: 25,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    marginBottom: 10,
  },
  courseHeader: {
    marginBottom: 10,
  },
  courseCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 15,
  },
  courseCode: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginLeft: 5,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    lineHeight: 32,
  },
  detailDescription: {
    fontSize: 16,
    color: '#5d6d7e',
    lineHeight: 24,
    marginBottom: 25,
  },
  contentText: {
    fontSize: 14,
    color: '#5d6d7e',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 10,
  },
  statText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    padding: 25,
    marginTop: 10,
    marginHorizontal: 10,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  actionButton: {
    width: '30%',
    minWidth: 100,
    padding: 15,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  // externes
    detailsContainer2: {
    flex: 1,
    padding: 16,
  },
  detailsHeader2: {
    marginBottom: 24,
  },
  detailTitle2: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  detailDescription2: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 24,
  },
  detailsSection2: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionTitle2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 16,
  },
  infoRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel2: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: 'bold',
    marginLeft: 10,
    width: 100,
  },
  infoValue2: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  linkButton2: {
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfButton2: {
    backgroundColor: '#27ae60',
  },
  linkButtonText2: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    marginLeft: 8,
  },
    courseCodeContainer2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  courseCode2: {
    fontSize: 14,
    color: '#7f8c8d',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  difficulteBadge2: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficulteText2: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: 'bold',
  },
  statsRow2: {
    flexDirection: 'row',
    marginTop: 10,
  },
  statItem2: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statText2: {
    fontSize: 15,
    color: '#7f8c8d',
    marginLeft: 5,
  },
  contenuText2: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
  },
  // picker
  picker: {
  flex: 1,
  color: '#2c3e50',
  fontSize: 16,
  paddingLeft: 10,
  paddingRight: 30,
  height: 50,
},
formSelectContainer: {
  backgroundColor: '#F8F9FA',
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 10,
  paddingHorizontal: 15,
  paddingVertical: 0,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  overflow: 'hidden',
},
// navigation rapide
 quickNavSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFF',
    marginTop: -15,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  quickNavScroll: {
    marginTop: 10,
  },
  quickNavItem: {
    width: 120,
    borderRadius: 15,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  quickNavText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  quickNavCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  recentSection: {
    backgroundColor: '#FFF',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  // Ajoutez ces styles à la fin de l'objet styles, avant la fermeture
programmesContainer: {
  flex: 1,
  backgroundColor: '#F8F9FA',
},
programmesContent: {
  padding: 20,
  paddingBottom: 30,
},
programmesHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 20,
},
programmesHeaderTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  marginLeft: 10,
},
programmesCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 20,
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  marginBottom: 20,
},
programmesBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  paddingHorizontal: 15,
  paddingVertical: 8,
  borderRadius: 20,
  marginBottom: 20,
},
programmesBadgeText: {
  fontSize: 14,
  color: '#FFF',
  fontWeight: '600',
  marginLeft: 8,
},
programmeItem: {
  flexDirection: 'row',
  marginBottom: 20,
  borderBottomWidth: 1,
  borderBottomColor: '#F0F0F0',
  paddingBottom: 15,
},
programmeNumberContainer: {
  marginRight: 15,
},
programmeNumber: {
  width: 36,
  height: 36,
  borderRadius: 18,
  justifyContent: 'center',
  alignItems: 'center',
},
programmeNumberText: {
  fontSize: 16,
  fontWeight: 'bold',
},
programmeContent: {
  flex: 1,
},
programmeText: {
  fontSize: 16,
  color: '#2c3e50',
  lineHeight: 24,
  marginBottom: 8,
},
programmeIndex: {
  alignSelf: 'flex-start',
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderRadius: 12,
  marginTop: 5,
},
programmeIndexText: {
  fontSize: 11,
  color: '#FFF',
  fontWeight: '600',
},
programmesFooter: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 10,
},
programmesFooterText: {
  fontSize: 12,
  color: '#95a5a6',
  marginLeft: 5,
  fontStyle: 'italic',
},
// Modal overlay et success modal
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
successModalContent: {
  backgroundColor: '#FFF',
  borderRadius: 25,
  padding: 25,
  width: '100%',
  maxWidth: 400,
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
},
successIconContainer: {
  alignItems: 'center',
  marginBottom: 20,
},
successModalTitle: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#2c3e50',
  textAlign: 'center',
  marginBottom: 20,
},
successDetailsContainer: {
  backgroundColor: '#F8F9FA',
  borderRadius: 15,
  padding: 15,
  marginBottom: 20,
},
successDetailRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 8,
},
successDetailLabel: {
  fontSize: 14,
  color: '#7f8c8d',
  fontWeight: '600',
  marginLeft: 10,
  width: 90,
},
successDetailValue: {
  fontSize: 14,
  color: '#2c3e50',
  fontWeight: 'bold',
  flex: 1,
},
successMessageContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FEF9E7',
  borderRadius: 10,
  padding: 15,
  marginBottom: 20,
},
successMessageText: {
  fontSize: 14,
  color: '#f39c12',
  marginLeft: 10,
  flex: 1,
  lineHeight: 20,
},
successButtonContainer: {
  marginBottom: 15,
},
successButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 15,
  borderRadius: 12,
  marginVertical: 5,
},
successButtonPrimary: {
  backgroundColor: '#f39c12',
  elevation: 3,
  shadowColor: '#f39c12',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
successButtonSecondary: {
  backgroundColor: '#e74c3c',
  elevation: 3,
  shadowColor: '#e74c3c',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
successButtonText: {
  color: '#FFF',
  fontSize: 16,
  fontWeight: 'bold',
  marginLeft: 8,
},
successNote: {
  fontSize: 12,
  color: '#95a5a6',
  textAlign: 'center',
  fontStyle: 'italic',
  marginTop: 10,
},
});