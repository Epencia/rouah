import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  RefreshControl,
  Animated,
  StatusBar,
  Modal,
  KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';
import YoutubePlayer from "react-native-youtube-iframe";
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import NetInfo from '@react-native-community/netinfo';

const { width } = Dimensions.get('window');

// Configuration de l'API - Un seul fichier API
const API_BASE_URL = 'https://rouah.net/api/';
const API_FILE = 'get-stage.php';

const Tab = createMaterialTopTabNavigator();

export default function Stages({ route, navigation }) {
  // Catégorie fixe pour les stages
  const categorie = 'Stages';

  // États de navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedNiveau, setSelectedNiveau] = useState(null);
  const [selectedCertificat, setSelectedCertificat] = useState(null);
  const [selectedCours, setSelectedCours] = useState(null);
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  
  // Sous-onglets
  const [activeSubTab, setActiveSubTab] = useState('cours');
  
  // États pour les données API
  const [niveaux, setNiveaux] = useState([]);
  const [certificats, setCertificats] = useState([]);
  const [coursList, setCoursList] = useState([]);
  const [stats, setStats] = useState({
    totalCours: 0,
    totalCertificats: 0
  });
  
  // États pour les registres
  const [registres, setRegistres] = useState([]);
  const [loadingRegistres, setLoadingRegistres] = useState(false);
  const [userRegistre, setUserRegistre] = useState(null);
  const [isCodeValidated, setIsCodeValidated] = useState(false);
  
  // États pour le modal de code
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeError, setCodeError] = useState(false);
  const [selectedCertificatForCode, setSelectedCertificatForCode] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    navigation.setOptions({ title: 'Stages' });
  }, []);

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

  useEffect(() => {
    loadInitialData();
  }, []);

  // Charger les registres quand on est sur l'onglet registres
  useEffect(() => {
    if (activeTab === 'programmes' && isCodeValidated) {
      fetchRegistres();
    }
  }, [activeTab, isCodeValidated]);

  // FONCTIONS API - Toutes via le même endpoint
  const apiRequest = async (action, params = {}, method = 'GET', body = null) => {
    let url = `${API_BASE_URL}${API_FILE}?action=${action}`;
    
    Object.keys(params).forEach(key => {
      url += `&${key}=${encodeURIComponent(params[key])}`;
    });
    
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    try {
      const response = await fetch(url, options);
      return await response.json();
    } catch (error) {
      console.error(`Erreur API ${action}:`, error);
      throw error;
    }
  };

  const loadInitialData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchNiveaux(),
        fetchStats(),
      ]);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setRefreshing(false);
    }
  };

  // Charger les niveaux
  const fetchNiveaux = async () => {
    try {
      const data = await apiRequest('getNiveaux', { categorie });
      if (data.success) {
        setNiveaux(data.data);
      }
    } catch (error) {
      console.error('Erreur niveaux:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await apiRequest('getStagesStats', { categorie });
      if (data.success) {
        setStats({
          totalCours: data.data.total_cours || 0,
          totalCertificats: data.data.total_certificats || 0
        });
      }
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  // Charger les registres
  const fetchRegistres = async () => {
    setLoadingRegistres(true);
    try {
      const data = await apiRequest('getRegistres', { categorie: 'Stage' });
      if (data.success) {
        setRegistres(data.data);
      }
    } catch (error) {
      console.error('Erreur chargement registres:', error);
    } finally {
      setLoadingRegistres(false);
    }
  };

  // Vérifier le matricule
  const verifyMatricule = async (code) => {
    try {
      const data = await apiRequest('verifyMatricule', {}, 'POST', { matricule: code });
      return data;
    } catch (error) {
      console.error('Erreur vérification matricule:', error);
      throw error;
    }
  };

  // Valider un thème (mettre à jour registres.memoire avec cours.code)
  const validateTheme = async (cours) => {
    if (!userRegistre) {
      Alert.alert('Erreur', 'Vous devez d\'abord vous connecter');
      return;
    }

    // Vérifier si l'utilisateur a déjà choisi un thème
    if (userRegistre.memoire_selectionne) {
      Alert.alert(
        'Thème déjà choisi',
        `Vous avez déjà sélectionné le thème : ${userRegistre.memoire_nom || 'Un thème'}. Voulez-vous le changer ?`,
        [
          { text: 'Non', style: 'cancel' },
          { 
            text: 'Changer', 
            onPress: () => confirmThemeChange(cours)
          }
        ]
      );
    } else {
      // Première sélection
      Alert.alert(
        'Valider le thème',
        `Voulez-vous valider le thème "${cours.titre}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Valider', 
            onPress: () => confirmThemeValidation(cours)
          }
        ]
      );
    }
  };

  const confirmThemeChange = (cours) => {
    Alert.alert(
      'Changer de thème',
      `Êtes-vous sûr de vouloir remplacer votre thème actuel par "${cours.titre}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: () => confirmThemeValidation(cours)
        }
      ]
    );
  };

  const confirmThemeValidation = async (cours) => {
    setLoading(true);
    
    try {
      const data = await apiRequest('validateTheme', {}, 'POST', {
        matricule: userRegistre.matricule,
        cours_code: cours.code,
        cours_titre: cours.titre
      });
      
      if (data.success) {
        // Mettre à jour userRegistre avec le nouveau thème
        setUserRegistre({
          ...userRegistre,
          memoire_selectionne: true,
          memoire_code: cours.code,
          memoire_nom: cours.titre
        });
        
        Alert.alert(
          'Succès',
          `Thème "${cours.titre}" validé avec succès !`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erreur', data.message || 'Impossible de valider le thème');
      }
    } catch (error) {
      console.error('Erreur validation thème:', error);
      Alert.alert('Erreur', 'Impossible de valider le thème');
    } finally {
      setLoading(false);
    }
  };

  // Charger les certificats d'un niveau
  const loadCertificatsForNiveau = async (niveauId) => {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Vérifiez votre connexion internet');
      return;
    }

    const niveauComplet = niveaux.find(n => n.id === niveauId);
    if (!niveauComplet) {
      Alert.alert('Erreur', 'Niveau non trouvé');
      return;
    }

    setSelectedNiveau(niveauComplet);
    setLoading(true);
    
    try {
      const data = await apiRequest('getStagesByNiveau', { niveau_id: niveauId });
      
      if (data.success) {
        setCertificats(data.data);
        
        setTimeout(() => {
          setActiveTab('certificats');
          setLoading(false);
        }, 100);
      } else {
        Alert.alert('Erreur', data.message || 'Impossible de charger les filières');
        setLoading(false);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion impossible au serveur');
      setLoading(false);
    }
  };

  // Parser les programmes
  const parseProgrammes = (description) => {
    if (!description) return [];
    const items = description.split(';')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    return items;
  };

  // Charger le contenu d'un certificat
  const loadContenuForCertificat = async (certificat) => {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Vérifiez votre connexion internet');
      return;
    }

    setSelectedCertificat(certificat);
    setLoading(true);

    try {
      const data = await apiRequest('getContenuStage', { certificat_id: certificat.id });

      if (data.success) {
        const cours = data.data.filter(item => item.type === 'Thème de stage');
        setCoursList(cours);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion impossible au serveur');
    } finally {
      setLoading(false);
    }
  };

  const registerView = async (coursId) => {
    try {
      await apiRequest('registerView', {}, 'POST', { cours_id: coursId });
    } catch (error) {
      console.error('Erreur enregistrement vue:', error);
    }
  };

  const handleBack = () => {
    if (activeTab === 'certificats') {
      setActiveTab('dashboard');
      setSelectedNiveau(null);
      setCertificats([]);
    } else if (activeTab === 'cours') {
      setActiveTab('certificats');
      setSelectedCertificat(null);
      setCoursList([]);
    } else if (activeTab === 'detail') {
      setActiveTab('cours');
      setSelectedCours(null);
    }
  };

  // Gestionnaire pour le clic sur une filière
  const handleCertificatPress = (certificat) => {
    setSelectedCertificatForCode(certificat);
    
    if (isCodeValidated && userRegistre) {
      Alert.alert(
        'Accès direct',
        `Bienvenue ${userRegistre.nom_prenom}, vous pouvez accéder à cette filière`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Accéder', 
            onPress: async () => {
              await loadContenuForCertificat(certificat);
              setActiveTab('cours');
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Accès requis',
        "Pour accéder à la filière, veuillez entrer votre code ou faire une demande de stage",
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Demande de stage', 
            onPress: () => {
              navigation.navigate('Demande de stage', {
                niveau: selectedNiveau,
                certificat: certificat
              });
            }
          },
          { 
            text: 'Entrer votre code', 
            onPress: () => {
              setShowCodeModal(true);
              setCodeInput('');
              setCodeError(false);
            }
          }
        ]
      );
    }
  };

  // Gestionnaire pour le clic sur un thème
  const handleThemePress = (cours) => {
    if (!isCodeValidated || !userRegistre) {
      setShowCodeModal(true);
      return;
    }

    Alert.alert(
      'Choisir ce thème',
      `Voulez-vous valider le thème "${cours.titre}" pour votre stage ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Valider', 
          onPress: () => validateTheme(cours)
        }
      ]
    );
  };

  // Soumettre le matricule
  const handleCodeSubmit = async () => {
    if (codeInput.length !== 6) return;
    
    setLoading(true);
    
    try {
      const data = await verifyMatricule(codeInput);
      
      if (data.success) {
        setUserRegistre(data.registre);
        setIsCodeValidated(true);
        
        setShowCodeModal(false);
        setCodeInput('');
        setCodeError(false);
        
        Alert.alert(
          'Succès',
          `Bienvenue ${data.registre.nom_prenom}`,
          [{ text: 'OK' }]
        );
        
        if (selectedCertificatForCode) {
          await loadContenuForCertificat(selectedCertificatForCode);
          setActiveTab('cours');
        }
      } else {
        setCodeError(true);
        setTimeout(() => {
          setCodeError(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Erreur vérification code:', error);
      Alert.alert('Erreur', 'Impossible de vérifier le code');
    } finally {
      setLoading(false);
    }
  };

  // Se déconnecter
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          onPress: () => {
            setIsCodeValidated(false);
            setUserRegistre(null);
            setActiveTab('dashboard');
          }
        }
      ]
    );
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  // ---------- COMPOSANTS ONGLETS ----------
  const VideoTab = () => {
    const [selectedVideoId, setSelectedVideoId] = useState(null);
    const [videoLoading, setVideoLoading] = useState(true);
    const [videosList, setVideosList] = useState([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [playerHeight, setPlayerHeight] = useState(250);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const playerReadyRef = useRef(false);
    const shouldPlayRef = useRef(false);

    useEffect(() => {
      if (selectedCours && selectedCours.url_video) {
        registerView(selectedCours.id);
        
        const videoIds = selectedCours.url_video
          .split(';')
          .filter(id => id && id.trim())
          .map(id => id.trim());
        
        if (videoIds.length > 0) {
          setVideosList(videoIds);
          setSelectedVideoId(videoIds[0]);
          setCurrentVideoIndex(0);
          setVideoLoading(true);
          setIsPlaying(false);
          playerReadyRef.current = false;
          shouldPlayRef.current = false;
        }
      }

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
          if (currentVideoIndex < videosList.length - 1) {
            setTimeout(() => {
              const nextIndex = currentVideoIndex + 1;
              loadVideo(videosList[nextIndex], nextIndex, true);
            }, 1000);
          } else {
            Alert.alert("Fin des vidéos", "Vous avez regardé toutes les vidéos de ce stage.");
          }
          break;
        default:
          setIsPlaying(false);
          break;
      }
    };

    const loadVideo = (videoId, index, autoPlay = false) => {
      setIsPlaying(false);
      
      if (videoId === selectedVideoId) {
        setIsPlaying(!isPlaying);
        return;
      }
      
      setSelectedVideoId(videoId);
      setCurrentVideoIndex(index);
      setVideoLoading(true);
      setIsPlaying(false);
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

    const handlePlayerReady = () => {
      setVideoLoading(false);
      playerReadyRef.current = true;
      
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
        <View style={[styles.videoPlayerContainer, { height: playerHeight }]}>
          {selectedVideoId && (
            <YoutubePlayer
              key={`youtube-player-${selectedVideoId}-${currentVideoIndex}`}
              height={playerHeight}
              width={Dimensions.get('window').width}
              play={isPlaying}
              videoId={selectedVideoId}
              onChangeState={onVideoStateChange}
              onReady={handlePlayerReady}
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

        <View style={styles.videoControls}>
          <TouchableOpacity
            style={[styles.videoControlButton, currentVideoIndex === 0 && styles.videoControlButtonDisabled]}
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
            style={[styles.videoControlButton, currentVideoIndex === videosList.length - 1 && styles.videoControlButtonDisabled]}
            onPress={handleNextVideo}
            disabled={currentVideoIndex === videosList.length - 1}
          >
            <Text style={styles.videoControlText}>Suivante</Text>
            <Icon name="skip-next" size={24} color={currentVideoIndex === videosList.length - 1 ? "#95a5a6" : "#FF0000"} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.videoListContainer}>
          <Text style={styles.videoListTitle}>Liste des vidéos ({videosList.length})</Text>
          
          {videosList.map((videoId, index) => (
            <TouchableOpacity
              key={`video-${index}-${videoId}`}
              style={[styles.videoListItem, index === currentVideoIndex && styles.videoListItemActive]}
              onPress={() => handlePlayVideo(index)}
              activeOpacity={0.7}
            >
              <View style={styles.videoListItemContent}>
                <TouchableOpacity onPress={() => handlePlayVideo(index)} style={styles.videoPlayButton}>
                  <Icon 
                    name={index === currentVideoIndex && isPlaying ? "pause-circle" : "play-circle"} 
                    size={28} 
                    color={index === currentVideoIndex ? "#FF0000" : "#3498db"} 
                  />
                </TouchableOpacity>
                
                <View style={styles.videoListDetails}>
                  <Text style={[styles.videoListTitleText, index === currentVideoIndex && styles.videoListTitleTextActive]}>
                    Vidéo {index + 1} - {selectedCours.titre}
                  </Text>
                  <Text style={styles.videoListDuration}>
                    {selectedCours.duree_formatee || 'Durée non spécifiée'}
                  </Text>
                </View>
                
                {index === currentVideoIndex && (
                  <View style={styles.playingIndicator}>
                    <Icon name={isPlaying ? "play-arrow" : "pause"} size={16} color="#FF0000" />
                    <Text style={styles.playingText}>{isPlaying ? 'En cours' : 'En pause'}</Text>
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

    if (!selectedCours?.url_pdf) {
      return (
        <View style={styles.tabContainer}>
          <Icon name="picture-as-pdf" size={60} color="#95a5a6" />
          <Text style={styles.noContent}>Aucun PDF disponible</Text>
        </View>
      );
    }

    return (
      <WebView 
        source={{ uri: selectedCours.url_pdf }} 
        style={{ flex: 1 }}
        onLoadStart={() => setPdfLoading(true)}
        onLoadEnd={() => setPdfLoading(false)}
        renderLoading={() => (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={selectedCertificat?.couleur || '#3498db'} />
          </View>
        )}
      />
    );
  };

  const DetailsTab = () => {
    if (!selectedCours) return null;

    return (
      <ScrollView style={styles.detailsContainer}>
        <Text style={styles.detailTitle}>{selectedCours.titre}</Text>
        <Text style={styles.detailDescription}>{selectedCours.description}</Text>
        
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Informations</Text>
          <View style={styles.infoRow}>
            <Icon name="person" size={18} color="#3498db" />
            <Text style={styles.infoLabel}>Enseignant:</Text>
            <Text style={styles.infoValue}>{selectedCours.enseignant}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="access-time" size={18} color="#3498db" />
            <Text style={styles.infoLabel}>Durée:</Text>
            <Text style={styles.infoValue}>{selectedCours.duree_formatee}</Text>
          </View>
          
          {/* Bouton de validation du thème */}
          {isCodeValidated && userRegistre && (
            <TouchableOpacity
              style={[
                styles.validateButton,
                userRegistre.memoire_selectionne && styles.validateButtonSelected
              ]}
              onPress={() => validateTheme(selectedCours)}
            >
              <Icon 
                name={userRegistre.memoire_selectionne ? "check-circle" : "check"} 
                size={20} 
                color="#FFF" 
              />
              <Text style={styles.validateButtonText}>
                {userRegistre.memoire_selectionne 
                  ? 'Changer ce thème' 
                  : 'Valider ce thème pour mon stage'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  };

  // ---------- ÉCRANS ----------
  
  // Écran d'accueil
  const renderDashboard = () => (
    <ScrollView 
      style={styles.dashboardScreen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadInitialData} colors={['#3498db']} />}
    >
      {isCodeValidated && userRegistre && (
        <View style={styles.userInfoBanner}>
          <View style={styles.userInfoContent}>
            <Icon name="account-circle" size={24} color="#FFF" />
            <Text style={styles.userInfoText}>
              {userRegistre.nom_prenom} - {userRegistre.matricule}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Icon name="logout" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {isCodeValidated && userRegistre && userRegistre.memoire_selectionne && (
        <View style={styles.themeInfoBanner}>
          <Icon name="check-circle" size={20} color="#27ae60" />
          <Text style={styles.themeInfoText}>
            Thème choisi : {userRegistre.memoire_nom || 'Thème sélectionné'}
          </Text>
        </View>
      )}

      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Aperçu général</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#3498db' }]}>
            <Icon name="library-books" size={28} color="#FFF" />
            <Text style={styles.statValue}>{formatNumber(stats.totalCours)}</Text>
            <Text style={styles.statLabel}>Thèmes de stage</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#2ecc71' }]}>
            <Icon name="verified" size={28} color="#FFF" />
            <Text style={styles.statValue}>{stats.totalCertificats}</Text>
            <Text style={styles.statLabel}>Filières</Text>
          </View>
        </View>
      </View>

      <View style={styles.niveauxSection}>
        <Text style={styles.sectionTitle}>Niveaux disponibles</Text>
        <Text style={styles.sectionSubtitle}>Sélectionnez un niveau pour voir les filières</Text>
        
        {niveaux.length > 0 ? (
          <View style={styles.niveauxGrid}>
            {niveaux.map((item) => (
              <TouchableOpacity 
                key={item.id}
                style={[styles.niveauCard, { backgroundColor: item.couleur_principale || '#3498db' }]}
                onPress={() => loadCertificatsForNiveau(item.id)}
              >
                <Icon name="school" size={32} color="#FFF" />
                <Text style={styles.niveauName}>{item.nom}</Text>
                <Text style={styles.niveauCode}>{item.code}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text>Aucun niveau disponible</Text>
        )}
      </View>

      <View style={styles.guideSection}>
        <Text style={styles.sectionTitle}>Comment obtenir un stage ?</Text>
        <View style={styles.guideSteps}>
          <View style={styles.guideStep}>
            <View style={[styles.stepNumber, { backgroundColor: '#3498db' }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Choisissez une filière</Text>
              <Text style={styles.stepDescription}>
                Sélectionnez la filière correspondant à votre niveau
              </Text>
            </View>
          </View>

          <View style={styles.guideStep}>
            <View style={[styles.stepNumber, { backgroundColor: '#2ecc71' }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Validez avec votre code</Text>
              <Text style={styles.stepDescription}>
                Utilisez votre matricule à 6 chiffres pour accéder aux contenus
              </Text>
            </View>
          </View>

          <View style={styles.guideStep}>
            <View style={[styles.stepNumber, { backgroundColor: '#f39c12' }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Choisissez un thème</Text>
              <Text style={styles.stepDescription}>
                Validez le thème de stage qui vous intéresse
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // Écran des certificats
  const renderCertificatsScreen = () => (
    <Animated.View style={[styles.contentScreen, { opacity: fadeAnim }]}>
      <View style={[styles.certificatHeader, { backgroundColor: selectedNiveau?.couleur_principale || '#3498db' }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Icon name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.certificatHeaderTitle}>{selectedNiveau?.nom || 'Filières'}</Text>
          <Text style={styles.certificatHeaderSubtitle}>Filières disponibles</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={selectedNiveau?.couleur_principale || '#3498db'} />
        </View>
      ) : certificats.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="verified" size={60} color="#bdc3c7" />
          <Text style={styles.emptyStateTitle}>Aucune filière</Text>
          <Text style={styles.emptyStateSubtitle}>pour ce niveau</Text>
        </View>
      ) : (
        <FlatList
          data={certificats}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.certificatList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.certificatCard, { borderLeftColor: item.couleur || '#3498db' }]}
              onPress={() => handleCertificatPress(item)}
            >
              <View style={[styles.certificatIconContainer, { backgroundColor: (item.couleur || '#3498db') + '20' }]}>
                <Icon name="verified" size={32} color={item.couleur || '#3498db'} />
              </View>
              <Text style={[styles.certificatName, { color: '#000' }]} numberOfLines={2}>
                {item.titre}
              </Text>
              <Text style={[styles.certificatCount, { color: item.couleur || '#3498db' }]}>
                {item.cours_count || 0} thème(s)
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </Animated.View>
  );

  // Écran des cours
  const renderCoursScreen = () => {
    if (!selectedCertificat) return null;

    const programmes = parseProgrammes(selectedCertificat.description);
    const programmesCount = programmes.length;

    const renderCoursContent = () => {
      if (loading) {
        return (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={{ marginTop: 12, color: '#555', fontSize: 15 }}>
              {activeSubTab === 'programmes' ? 'Chargement du programme...' : 'Chargement...'}
            </Text>
          </View>
        );
      }

      if (activeSubTab === 'programmes') {
        if (programmesCount === 0) {
          return (
            <View style={styles.emptyState}>
              <Icon name="menu-book" size={64} color="#bdc3c7" />
              <Text style={styles.emptyStateTitle}>Aucun programme disponible</Text>
              <Text style={{ marginTop: 8, color: '#777', textAlign: 'center', paddingHorizontal: 40 }}>
                Le programme pour ce stage n'est pas encore disponible
              </Text>
            </View>
          );
        }

        return (
          <ScrollView style={styles.programmesContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.programmesContent}>
            <View style={styles.programmesCard}>
              {programmes.map((item, index) => (
                <View key={index} style={styles.programmeItem}>
                  <View style={styles.programmeNumberContainer}>
                    <View style={[styles.programmeNumber, { backgroundColor: (selectedCertificat?.couleur || '#3498db') + '20' }]}>
                      <Text style={[styles.programmeNumberText, { color: selectedCertificat?.couleur || '#3498db' }]}>
                        {index + 1}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.programmeContent}>
                    <Text style={styles.programmeText}>{item}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        );
      }

      if (coursList.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Icon name="book" size={64} color="#bdc3c7" />
            <Text style={styles.emptyStateTitle}>Aucun thème disponible</Text>
          </View>
        );
      }

      return (
        <FlatList
          data={coursList}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = userRegistre && userRegistre.memoire_code === item.code;
            
            return (
              <TouchableOpacity
                style={[styles.coursCard, isSelected && styles.coursCardSelected]}
                activeOpacity={0.88}
                onPress={() => {
                  setSelectedCours(item);
                  setActiveTab('detail');
                }}
              >
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Icon name="check-circle" size={20} color="#27ae60" />
                    <Text style={styles.selectedBadgeText}>Thème choisi</Text>
                  </View>
                )}
                
                <Text style={styles.coursTitle} numberOfLines={2}>{item.titre}</Text>
                <Text style={styles.coursDescription} numberOfLines={3}>
                  {item.description || 'Aucune description disponible'}
                </Text>
                
                <View style={styles.coursFooter}>
                  <View style={styles.coursInfo}>
                    <Icon name="person" size={16} color={item.couleur || '#3498db'} />
                    <Text style={[styles.coursInfoText, { color: item.couleur || '#3498db' }]}>
                      {item.enseignant || '—'}
                    </Text>
                  </View>
                  <View style={styles.coursInfo}>
                    <Icon name="access-time" size={16} color={item.couleur || '#3498db'} />
                    <Text style={[styles.coursInfoText, { color: item.couleur || '#3498db' }]}>
                      {item.duree_formatee || '—'}
                    </Text>
                  </View>
                </View>

                {isCodeValidated && userRegistre && (
                  <TouchableOpacity
                    style={[
                      styles.themeActionButton,
                      isSelected && styles.themeActionButtonSelected
                    ]}
                    onPress={() => handleThemePress(item)}
                  >
                    <Icon 
                      name={isSelected ? "check-circle" : "check"} 
                      size={18} 
                      color="#FFF" 
                    />
                    <Text style={styles.themeActionButtonText}>
                      {isSelected ? 'Changer ce thème' : 'Choisir ce thème'}
                    </Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      );
    };

    return (
      <Animated.View style={[styles.contentScreen, { opacity: fadeAnim }]}>
        <View style={[styles.coursHeader, { backgroundColor: selectedCertificat?.couleur || '#3498db' }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.coursHeaderTitle} numberOfLines={1}>{selectedCertificat.titre}</Text>
            <Text style={styles.coursHeaderSubtitle}>
              {coursList.length} contenu{coursList.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.subTabsContainer}>
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'cours' && styles.subTabActive]}
            onPress={() => setActiveSubTab('cours')}
          >
            <Icon name="school" size={20} color={activeSubTab === 'cours' ? '#3498db' : '#95a5a6'} />
            <Text style={[styles.subTabText, activeSubTab === 'cours' && styles.subTabTextActive]}>
              Thèmes ({coursList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'programmes' && styles.subTabActive]}
            onPress={() => setActiveSubTab('programmes')}
          >
            <Icon name="menu-book" size={20} color={activeSubTab === 'programmes' ? '#3498db' : '#95a5a6'} />
            <Text style={[styles.subTabText, activeSubTab === 'programmes' && styles.subTabTextActive]}>
              Tâches ({programmesCount})
            </Text>
          </TouchableOpacity>
        </View>

        {renderCoursContent()}
      </Animated.View>
    );
  };

  // Écran détail du cours
  const renderDetailScreen = () => {
    if (!selectedCours) return null;

    const tabsToShow = [];
    if (selectedCours.url_video) tabsToShow.push('Vidéo');
    if (selectedCours.url_pdf) tabsToShow.push('PDF');
    tabsToShow.push('Détails');

    return (
      <View style={styles.container}>
        <View style={[styles.detailHeader, { backgroundColor: selectedCertificat?.couleur || '#3498db' }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.detailHeaderTitle} numberOfLines={1}>{selectedCours.titre}</Text>
          </View>
        </View>
        
        <Tab.Navigator
          screenOptions={{
            tabBarLabelStyle: styles.tabLabel,
            tabBarIndicatorStyle: [styles.tabIndicator, { backgroundColor: '#FFF' }],
            tabBarStyle: [styles.tabBar, { backgroundColor: selectedCertificat?.couleur || '#3498db' }],
            tabBarActiveTintColor: '#FFF',
            tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
          }}
        >
          {tabsToShow.map(tabName => {
            let Component;
            switch(tabName) {
              case 'Vidéo': Component = VideoTab; break;
              case 'PDF': Component = PdfTab; break;
              default: Component = DetailsTab;
            }
            return <Tab.Screen key={tabName} name={tabName} component={Component} />;
          })}
        </Tab.Navigator>
      </View>
    );
  };

  // Écran des registres
  const renderRegistresScreen = () => {
    if (!isCodeValidated) {
      return (
        <View style={styles.accessDeniedContainer}>
          <Icon name="lock" size={80} color="#bdc3c7" />
          <Text style={styles.accessDeniedTitle}>Accès restreint</Text>
          <Text style={styles.accessDeniedText}>
            Veuillez entrer votre code d'accès pour voir les registres
          </Text>
          <TouchableOpacity style={styles.accessDeniedButton} onPress={() => setShowCodeModal(true)}>
            <Text style={styles.accessDeniedButtonText}>Entrer mon code</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={[styles.registresHeader, { backgroundColor: '#2c3e50' }]}>
          <Text style={styles.registresHeaderTitle}>📋 Registres des stages</Text>
          <Text style={styles.registresHeaderSubtitle}>
            {registres.length} inscription{registres.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {loadingRegistres ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2c3e50" />
            <Text style={styles.loadingText}>Chargement des registres...</Text>
          </View>
        ) : registres.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="assignment" size={64} color="#bdc3c7" />
            <Text style={styles.emptyStateTitle}>Aucun registre disponible</Text>
          </View>
        ) : (
          <FlatList
            data={registres}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.registresList}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isCurrentUser = userRegistre && userRegistre.matricule === item.matricule;
              
              return (
                <View style={[styles.registreCard, isCurrentUser && styles.registreCardCurrentUser]}>
                  <View style={styles.registreHeader}>
                    <View style={styles.registreHeaderLeft}>
                      <Text style={[styles.registreMatricule, isCurrentUser && styles.registreMatriculeCurrentUser]}>
                        {item.matricule}
                      </Text>
                      <View style={[styles.registreCategoryBadge, { 
                        backgroundColor: item.categorie === 'Stage' ? '#3498db' : 
                                       item.categorie === 'Formation' ? '#2ecc71' : '#f39c12'
                      }]}>
                        <Text style={styles.registreCategoryText}>{item.categorie}</Text>
                      </View>
                      {isCurrentUser && (
                        <View style={styles.currentUserBadge}>
                          <Text style={styles.currentUserBadgeText}>Vous</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.registreCode} numberOfLines={1}>#{item.code}</Text>
                  </View>

                  <Text style={[styles.registreNom, isCurrentUser && styles.registreNomCurrentUser]}>
                    {item.nom_prenom}
                  </Text>
                  
                  <View style={styles.registreDetails}>
                    <View style={styles.registreRow}>
                      <View style={styles.registreInfo}>
                        <Icon name="flag" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{item.nationalite}</Text>
                      </View>
                      <View style={styles.registreInfo}>
                        <Icon name={item.sexe === 'Masculin' ? 'male' : 'female'} size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{item.sexe}</Text>
                      </View>
                    </View>

                    <View style={styles.registreRow}>
                      <View style={styles.registreInfo}>
                        <Icon name="cake" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{formatDate(item.date_naissance)}</Text>
                      </View>
                      <View style={styles.registreInfo}>
                        <Icon name="place" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{item.lieu_naissance}</Text>
                      </View>
                    </View>

                    <View style={styles.registreRow}>
                      <View style={styles.registreInfo}>
                        <Icon name="phone" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{item.telephone}</Text>
                      </View>
                      <View style={styles.registreInfo}>
                        <Icon name="email" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText} numberOfLines={1}>{item.email}</Text>
                      </View>
                    </View>

                    <View style={styles.registreRow}>
                      <View style={styles.registreInfo}>
                        <Icon name="school" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{item.diplome}</Text>
                      </View>
                      <View style={styles.registreInfo}>
                        <Icon name="work" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{item.specialite}</Text>
                      </View>
                    </View>

                    <View style={styles.registreRow}>
                      <View style={styles.registreInfo}>
                        <Icon name="event" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{formatDate(item.date_debut)}</Text>
                      </View>
                      <View style={styles.registreInfo}>
                        <Icon name="event-available" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{formatDate(item.date_fin)}</Text>
                      </View>
                    </View>

                    <View style={styles.registreFullRow}>
                      <Icon name="timer" size={14} color="#7f8c8d" />
                      <Text style={styles.registreInfoText}>Durée: {item.duree}</Text>
                    </View>

                    <View style={styles.registreFullRow}>
                      <Icon name="person-outline" size={14} color="#7f8c8d" />
                      <Text style={styles.registreInfoText}>Encadreur: {item.encadreur}</Text>
                    </View>

                    {item.signataire && (
                      <View style={styles.registreFullRow}>
                        <Icon name="edit" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>Signataire: {item.signataire}</Text>
                      </View>
                    )}

                    <View style={styles.registreRow}>
                      <View style={styles.registreInfo}>
                        <Icon name="business" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{item.organisme}</Text>
                      </View>
                      <View style={styles.registreInfo}>
                        <Icon name="assignment-turned-in" size={14} color="#7f8c8d" />
                        <Text style={styles.registreInfoText}>{formatDate(item.date_delivrance)}</Text>
                      </View>
                    </View>

                    {/* Affichage du thème choisi si présent */}
                    {item.memoire && (
                      <View style={styles.registreFullRow}>
                        <Icon name="bookmark" size={14} color="#27ae60" />
                        <Text style={[styles.registreInfoText, { color: '#27ae60', fontWeight: '500' }]}>
                          Thème: {item.memoire}
                        </Text>
                      </View>
                    )}

                    <View style={styles.registreFooter}>
                      <View style={[styles.registreStatusBadge, { 
                        backgroundColor: item.etat === 'actif' ? '#27ae60' :
                                       item.etat === 'en cours' ? '#f39c12' :
                                       item.etat === 'en attente' ? '#e67e22' : '#95a5a6'
                      }]}>
                        <Text style={styles.registreStatusText}>{item.etat}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>
    );
  };

  // Modal de code
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
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
                
                <View style={styles.modalBody}>
                  <View style={styles.modalIconContainer}>
                    <Icon name="lock" size={50} color="#3498db" />
                  </View>
                  
                  <Text style={styles.modalText}>Entrez votre matricule à 6 chiffres</Text>
                  
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
                        <Text style={styles.modalCodeDigitText}>{codeInput[index] || ''}</Text>
                      </View>
                    ))}
                  </View>
                  
                  {codeError && (
                    <View style={styles.errorContainer}>
                      <Icon name="error" size={20} color="#e74c3c" />
                      <Text style={styles.errorText}>Matricule invalide. Veuillez réessayer.</Text>
                    </View>
                  )}
                  
                  {!isConnected && (
                    <View style={styles.offlineContainer}>
                      <Icon name="wifi-off" size={20} color="#f39c12" />
                      <Text style={styles.offlineText}>Vous êtes hors ligne</Text>
                    </View>
                  )}
                  
                  <View style={styles.modalKeypad}>
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
                        {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Icon name="check" size={24} color="#2ecc71" />}
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

  // Navigation principale
  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.mainNavigation}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'dashboard' && styles.navItemActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Icon name="dashboard" size={24} color={activeTab === 'dashboard' ? '#3498db' : '#95a5a6'} />
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navTextActive]}>Accueil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'certificats' && styles.navItemActive, !selectedNiveau && styles.navItemDisabled]}
          onPress={() => selectedNiveau ? setActiveTab('certificats') : Alert.alert('Sélection requise', 'Veuillez d\'abord sélectionner un niveau')}
          disabled={!selectedNiveau}
        >
          <Icon name="verified" size={24} color={activeTab === 'certificats' && selectedNiveau ? '#3498db' : !selectedNiveau ? '#ccc' : '#95a5a6'} />
          <Text style={[styles.navText, activeTab === 'certificats' && selectedNiveau && styles.navTextActive, !selectedNiveau && styles.navTextDisabled]}>Filières</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'cours' && styles.navItemActive, (!selectedCertificat || !isCodeValidated) && styles.navItemDisabled]}
          onPress={() => {
            if (!isCodeValidated) setShowCodeModal(true);
            else if (selectedCertificat) setActiveTab('cours');
            else Alert.alert('Sélection requise', 'Veuillez d\'abord sélectionner une filière');
          }}
          disabled={!selectedCertificat && !isCodeValidated}
        >
          <Icon name="library-books" size={24} color={activeTab === 'cours' && selectedCertificat && isCodeValidated ? '#3498db' : !isCodeValidated ? '#ccc' : '#95a5a6'} />
          <Text style={[styles.navText, activeTab === 'cours' && selectedCertificat && isCodeValidated && styles.navTextActive, !isCodeValidated && styles.navTextDisabled]}>Thèmes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'programmes' && styles.navItemActive, !isCodeValidated && styles.navItemDisabled]}
          onPress={() => isCodeValidated ? setActiveTab('programmes') : setShowCodeModal(true)}
          disabled={!isCodeValidated}
        >
          <Icon name="assignment" size={24} color={activeTab === 'programmes' && isCodeValidated ? '#3498db' : !isCodeValidated ? '#ccc' : '#95a5a6'} />
          <Text style={[styles.navText, activeTab === 'programmes' && isCodeValidated && styles.navTextActive, !isCodeValidated && styles.navTextDisabled]}>Registres</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'certificats' && renderCertificatsScreen()}
      {activeTab === 'cours' && renderCoursScreen()}
      {activeTab === 'detail' && renderDetailScreen()}
      {activeTab === 'programmes' && renderRegistresScreen()}
      
      {renderCodeModal()}
    </SafeAreaView>
  );
}

// Styles (garder tous les styles existants et ajouter les nouveaux)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  
  mainNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    height: 60,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navItemActive: { borderBottomWidth: 2, borderBottomColor: '#3498db' },
  navItemDisabled: { opacity: 0.5 },
  navText: { fontSize: 11, color: '#95a5a6', marginTop: 4 },
  navTextActive: { color: '#3498db', fontWeight: 'bold' },
  navTextDisabled: { color: '#ccc' },

  userInfoBanner: {
    backgroundColor: '#27ae60',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  userInfoContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userInfoText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginLeft: 10 },
  logoutButton: { padding: 5 },

  themeInfoBanner: {
    backgroundColor: '#ebf5ff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  themeInfoText: { 
    color: '#27ae60', 
    fontSize: 13, 
    fontWeight: '500', 
    marginLeft: 8,
    flex: 1 
  },

  accessDeniedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  accessDeniedTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginTop: 20, marginBottom: 10 },
  accessDeniedText: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 30 },
  accessDeniedButton: { backgroundColor: '#3498db', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12, elevation: 3 },
  accessDeniedButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  registreCardCurrentUser: { borderLeftWidth: 4, borderLeftColor: '#27ae60', backgroundColor: '#f0f9f0' },
  registreMatriculeCurrentUser: { color: '#27ae60' },
  registreNomCurrentUser: { color: '#27ae60' },
  currentUserBadge: { backgroundColor: '#27ae60', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  currentUserBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  contentScreen: { flex: 1, backgroundColor: '#FFF' },

  certificatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    height: Platform.OS === 'ios' ? 100 : 80,
  },
  coursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    height: Platform.OS === 'ios' ? 100 : 80,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    height: Platform.OS === 'ios' ? 100 : 80,
  },
  registresHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    backgroundColor: '#2c3e50',
  },
  registresHeaderTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginBottom: 5, marginTop:-16 },
  registresHeaderSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  backButton: { padding: 5, width: 40 },
  headerCenter: { flex: 1, marginHorizontal: 10 },
  certificatHeaderTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFF' },
  certificatHeaderSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  coursHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
  coursHeaderSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  detailHeaderTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },

  niveauxSection: { padding: 20, backgroundColor: '#F8F9FA', marginTop: 10 },
  niveauxGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  niveauCard: {
    width: (width - 50) / 2,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    minHeight: 120,
  },
  niveauName: { fontSize: 14, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginTop: 10, marginBottom: 5 },
  niveauCode: { fontSize: 11, color: 'rgba(255,255,255,0.9)' },

  certificatCard: {
    width: (width - 50) / 2,
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    borderLeftWidth: 4,
    elevation: 3,
    alignItems: 'center',
    marginBottom: 15,
    minHeight: 150,
  },
  certificatIconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  certificatName: { fontSize: 14, fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: 8 },
  certificatCount: { fontSize: 12, fontWeight: '600', color: '#3498db' },

  gridRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  certificatList: { paddingTop: 15, paddingBottom: 30, paddingHorizontal: 15, flexGrow: 1 },

  dashboardScreen: { flex: 1, backgroundColor: '#FFF' },

  statsSection: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  sectionSubtitle: { fontSize: 14, color: '#7f8c8d', marginBottom: 15 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 15 },
  statCard: { width: '48%', borderRadius: 15, padding: 20, marginBottom: 10, alignItems: 'center', elevation: 3 },
  statValue: { fontSize: 22, fontWeight: 'bold', color: '#FFF', marginVertical: 8 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.9)' },

  subTabsContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0', height: 50 },
  subTab: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: '#3498db' },
  subTabText: { fontSize: 13, color: '#95a5a6', marginLeft: 6 },
  subTabTextActive: { color: '#3498db', fontWeight: 'bold' },

  coursCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    padding: 20, 
    marginBottom: 15, 
    elevation: 2,
    position: 'relative',
  },
  coursCardSelected: {
    borderWidth: 2,
    borderColor: '#27ae60',
    backgroundColor: '#f0f9f0',
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  selectedBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  coursTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 8, paddingRight: 80 },
  coursDescription: { fontSize: 13, color: '#5d6d7e', marginBottom: 15 },
  coursFooter: { flexDirection: 'row' },
  coursInfo: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  coursInfoText: { fontSize: 12, fontWeight: '500', marginLeft: 5 },

  themeActionButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginTop: 15,
  },
  themeActionButtonSelected: {
    backgroundColor: '#27ae60',
  },
  themeActionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },

  validateButton: {
    backgroundColor: '#3498db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
  },
  validateButtonSelected: {
    backgroundColor: '#27ae60',
  },
  validateButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyStateTitle: { fontSize: 18, color: '#7f8c8d', marginTop: 15 },
  emptyStateSubtitle: { fontSize: 14, color: '#95a5a6', marginTop: 5 },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#7f8c8d', marginTop: 10 },

  tabContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  noContent: { fontSize: 14, color: '#7f8c8d', marginTop: 15 },

  videoPlayerContainer: { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  videoLoaderOverlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', width: '100%', zIndex: 10 },
  playButtonOverlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', width: '100%', zIndex: 5 },
  playButton: { backgroundColor: 'rgba(255,0,0,0.7)', width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  videoLoadingText: { color: '#FFF', marginTop: 10, fontSize: 14 },

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
  videoControlButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8F9FA' },
  videoControlButtonDisabled: { backgroundColor: '#F0F0F0' },
  videoControlText: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginHorizontal: 5 },
  videoCenterControls: { alignItems: 'center' },
  playPauseButton: { padding: 10, backgroundColor: '#F8F9FA', borderRadius: 30, marginBottom: 5 },
  videoCounter: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },

  videoListContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  videoListTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF' },
  videoListItem: { backgroundColor: '#FFF', marginHorizontal: 10, marginVertical: 5, borderRadius: 10, padding: 15, elevation: 1 },
  videoListItemActive: { backgroundColor: '#EBF5FB', borderWidth: 1, borderColor: '#3498db' },
  videoListItemContent: { flexDirection: 'row', alignItems: 'center' },
  videoPlayButton: { marginRight: 10 },
  videoListDetails: { flex: 1 },
  videoListTitleText: { fontSize: 14, fontWeight: '600', color: '#2c3e50', marginBottom: 4 },
  videoListTitleTextActive: { color: '#3498db' },
  videoListDuration: { fontSize: 12, color: '#95a5a6' },
  playingIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDEDEC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  playingText: { fontSize: 12, color: '#e74c3c', fontWeight: '600', marginLeft: 4 },

  tabBar: { elevation: 0, height: 50 },
  tabLabel: { fontSize: 12, fontWeight: 'bold', textTransform: 'none' },
  tabIndicator: { height: 3 },

  detailsContainer: { flex: 1, padding: 16 },
  detailTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  detailDescription: { fontSize: 14, color: '#34495e', lineHeight: 22, marginBottom: 15 },
  detailsSection: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, elevation: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoLabel: { fontSize: 14, color: '#7f8c8d', fontWeight: 'bold', marginLeft: 10, width: 100 },
  infoValue: { fontSize: 14, color: '#2c3e50', flex: 1 },

  guideSection: { paddingHorizontal: 20, paddingVertical: 25, backgroundColor: '#F8F9FA', marginTop: 10, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  guideSteps: { marginTop: 15 },
  guideStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  stepNumber: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  stepNumberText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 16, fontWeight: '600', color: '#2c3e50', marginBottom: 4 },
  stepDescription: { fontSize: 14, color: '#7f8c8d', lineHeight: 20 },

  programmesContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  programmesContent: { padding: 20, paddingBottom: 30 },
  programmesCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, elevation: 4, marginBottom: 20 },
  programmeItem: { flexDirection: 'row', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 15 },
  programmeNumberContainer: { marginRight: 15 },
  programmeNumber: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  programmeNumberText: { fontSize: 16, fontWeight: 'bold' },
  programmeContent: { flex: 1 },
  programmeText: { fontSize: 16, color: '#2c3e50', lineHeight: 24, marginBottom: 8 },

  registresList: { padding: 16 },
  registreCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  registreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  registreHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  registreMatricule: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginRight: 10 },
  registreCategoryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  registreCategoryText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  registreCode: { fontSize: 12, color: '#95a5a6', maxWidth: 80 },
  registreNom: { fontSize: 18, fontWeight: '600', color: '#2c3e50', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 8 },
  registreDetails: { gap: 8 },
  registreRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  registreFullRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  registreInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  registreInfoText: { fontSize: 13, color: '#34495e', marginLeft: 6, flex: 1 },
  registreFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  registreAppreciation: { fontSize: 13, color: '#7f8c8d', fontStyle: 'italic', marginBottom: 8 },
  registreStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  registreStatusText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },

  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalBackdrop: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  modalContentWrapper: { width: width * 0.9, maxWidth: 400 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', backgroundColor: '#f8f9fa' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  modalCloseButton: { padding: 4 },
  modalBody: { padding: 24 },
  modalIconContainer: { alignItems: 'center', marginBottom: 20 },
  modalText: { fontSize: 14, color: '#7f8c8d', textAlign: 'center', marginBottom: 20 },
  codeDisplay: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 10 },
  modalCodeDigit: { width: 40, height: 50, borderWidth: 2, borderColor: '#e0e0e0', borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  modalCodeDigitFilled: { borderColor: '#3498db', backgroundColor: '#ebf5ff' },
  modalCodeDigitError: { borderColor: '#e74c3c', backgroundColor: '#fdedec' },
  modalCodeDigitText: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  errorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdedec', padding: 10, borderRadius: 8, marginBottom: 20 },
  errorText: { color: '#e74c3c', fontSize: 14, marginLeft: 8 },
  offlineContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef5e7', padding: 10, borderRadius: 8, marginBottom: 20 },
  offlineText: { color: '#f39c12', fontSize: 14, marginLeft: 8 },
  modalKeypad: { marginTop: 20 },
  modalKeypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  modalKeypadKey: { flex: 1, height: 60, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 12, marginHorizontal: 5, borderWidth: 1, borderColor: '#e0e0e0' },
  modalKeypadKeyText: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  modalDeleteKey: { backgroundColor: '#fdedec', borderColor: '#e74c3c' },
  modalSubmitKey: { backgroundColor: '#ebf5ff', borderColor: '#2ecc71' },
  modalSubmitKeyDisabled: { opacity: 0.5, backgroundColor: '#f8f9fa', borderColor: '#e0e0e0' },
});