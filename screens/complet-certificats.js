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
  Animated,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { WebView } from 'react-native-webview';
import YoutubePlayer from "react-native-youtube-iframe";
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Configuration de l'API
const API_BASE_URL = 'https://rouah.net/api/';
const API_FILE = 'get-certificat.php';
const API_EVALUATION = 'evaluation.php';
const API_REGISTRE = 'get-registre.php';

const Tab = createMaterialTopTabNavigator();

export default function Certificats({ route, navigation }) {
  // Catégorie fixe pour les certifications
  const categorie = 'Certifications';

  // États de navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedNiveau, setSelectedNiveau] = useState(null);
  const [selectedCertificat, setSelectedCertificat] = useState(null);
  const [selectedCours, setSelectedCours] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  
  // Sous-onglets pour Cours/Évaluations
  const [activeSubTab, setActiveSubTab] = useState('cours');
  const [showQuizDirect, setShowQuizDirect] = useState(false);
  
  // États pour les données API
  const [niveaux, setNiveaux] = useState([]);
  const [certificats, setCertificats] = useState([]);
  const [coursList, setCoursList] = useState([]);
  const [evaluationsList, setEvaluationsList] = useState([]);
  const [stats, setStats] = useState({
    totalCours: 0,
    totalCertificats: 0,
    totalEnseignants: 0,
    totalEvaluations: 0
  });
  const [recentCours, setRecentCours] = useState([]);
  
  // États pour l'évaluation
  const [questions, setQuestions] = useState([]);
  const [reponses, setReponses] = useState({});
  const [resultat, setResultat] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Nouveaux états pour la gestion du registre
  const [showCertificateButton, setShowCertificateButton] = useState(false);
  const [existingRegistre, setExistingRegistre] = useState(null);
  const [quizScore, setQuizScore] = useState(null);
  const [abonnementData, setAbonnementData] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    navigation.setOptions({ title: 'Certifications' });
    
    // Récupérer les données d'abonnement des paramètres de route
    if (route.params?.abonnementData) {
      setAbonnementData(route.params.abonnementData);
    }
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

  // Fonction pour vérifier l'existence du registre
  const checkRegistreExistence = async () => {
    if (!selectedCertificat || !abonnementData) return;

    try {
      const response = await fetch(`${API_BASE_URL}${API_REGISTRE}?action=checkRegistre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: abonnementData.code,
          certificat_nom: selectedCertificat.titre,
          niveau_nom: selectedNiveau?.nom || ''
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.exists) {
          setExistingRegistre(data.data);
          setShowCertificateButton(true);
        } else {
          setExistingRegistre(null);
          setShowCertificateButton(false);
        }
      }
    } catch (error) {
      console.error('Erreur vérification registre:', error);
    }
  };

  // Fonction pour créer un nouveau registre
  const createRegistre = async () => {
    if (!abonnementData || !selectedCertificat || !selectedNiveau) {
      Alert.alert('Erreur', 'Données manquantes');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}${API_REGISTRE}?action=createRegistre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: abonnementData.code,
          nom_prenom: abonnementData.nom_prenom,
          telephone: abonnementData.telephone,
          email: abonnementData.email,
          certificat_nom: selectedCertificat.titre,
          certificat_id: selectedCertificat.id,
          niveau_nom: selectedNiveau.nom,
          niveau_id: selectedNiveau.id
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        Alert.alert(
          'Succès',
          'Votre certificat a été enregistré avec succès. Matricule: ' + data.matricule,
          [
            { 
              text: 'Voir mon certificat', 
              onPress: () => {
                const newRegistre = {
                  code: abonnementData.code,
                  matricule: data.matricule,
                  nom_prenom: abonnementData.nom_prenom,
                  telephone: abonnementData.telephone,
                  email: abonnementData.email,
                  specialite: selectedCertificat.titre,
                  domaine: selectedNiveau.nom,
                  date_delivrance: new Date().toISOString(),
                  date_fin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                  etat: 'actif'
                };
                
                navigation.navigate('DiplomeInfo', {
                  registreData: newRegistre,
                  certificat: selectedCertificat,
                  niveau: selectedNiveau
                });
              }
            }
          ]
        );
        
        // Re-vérifier l'existence
        await checkRegistreExistence();
      } else {
        Alert.alert('Erreur', data.message || 'Impossible de créer le certificat');
      }
    } catch (error) {
      console.error('Erreur création registre:', error);
      Alert.alert('Erreur', 'Connexion impossible au serveur');
    } finally {
      setLoading(false);
    }
  };

  // FONCTIONS API
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

  // Charger les niveaux (catégorie Certifications)
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
      const data = await apiRequest('getCertificatsStats', { categorie });
      if (data.success) {
        setStats({
          totalCours: data.data.total_cours || 0,
          totalCertificats: data.data.total_certificats || 0,
          totalEnseignants: data.data.total_enseignants || 0,
          totalEvaluations: data.data.total_evaluations || 0
        });
      }
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  // Charger les certificats d'un niveau sélectionné
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
      const data = await apiRequest('getCertificatsByNiveau', { niveau_id: niveauId });
      
      if (data.success) {
        setCertificats(data.data);
        
        setTimeout(() => {
          setActiveTab('certificats');
          setLoading(false);
        }, 100);
      } else {
        Alert.alert('Erreur', data.message || 'Impossible de charger les certificats');
        setLoading(false);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion impossible au serveur');
      setLoading(false);
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

  // Charger le contenu d'un certificat (cours + évaluations)
  const loadContenuForCertificat = async (certificat) => {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Vérifiez votre connexion internet');
      return;
    }

    setSelectedCertificat(certificat);
    setLoading(true);
    setActiveTab('cours');
    setShowQuizDirect(false); // reset au cas où

    try {
      const data = await apiRequest('getContenuCertificat', { certificat_id: certificat.id });

      if (data.success) {
        const cours = data.data.filter(item => item.type === 'Cours');
        const evaluations = data.data.filter(item =>
          ['Exercices', 'Corrigés'].includes(item.type)
        );

        setCoursList(cours);
        setEvaluationsList(evaluations);

        // ─── CHARGEMENT AUTOMATIQUE DU PREMIER QUIZ ──────────────────────
        if (evaluations.length > 0) {
          const premierQuiz = evaluations[0];
          setSelectedEvaluation(premierQuiz);

          try {
            const response = await fetch(`${API_BASE_URL}${API_EVALUATION}?matiere_id=${certificat.id}`);
            const questionsData = await response.json();

            setQuestions(questionsData || []);
            setReponses({});
            setResultat(null);
            setShowResults(false);
            // On ne met PAS showQuizDirect ici → on laisse l'onglet gérer l'affichage
          } catch (err) {
            console.error("Erreur chargement questions auto :", err);
          }
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Connexion impossible au serveur');
    } finally {
      setLoading(false);
    }
  };

  // Fonctions pour l'évaluation
  const loadEvaluation = async (evaluation) => {
    setSelectedEvaluation(evaluation);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}${API_EVALUATION}?matiere_id=${selectedCertificat.id}`);
      const data = await response.json();
      setQuestions(data);
      setReponses({});
      setResultat(null);
      setShowResults(false);
      setActiveTab('evaluationDetail');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les questions');
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluationAndShow = async (evaluation) => {
    setSelectedEvaluation(evaluation);
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}${API_EVALUATION}?matiere_id=${selectedCertificat.id}`);
      const data = await response.json();
      
      setQuestions(data);
      setReponses({});
      setResultat(null);
      setShowResults(false);
      
      setActiveTab('cours'); 
      setShowQuizDirect(true);
      
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le quiz');
    } finally {
      setLoading(false);
    }
  };

  const choisirReponse = (questionId, choixIndex) => {
    setReponses({
      ...reponses,
      [questionId]: choixIndex
    });
  };

  const envoyerQuiz = () => {
    if (Object.keys(reponses).length < questions.length) {
      Alert.alert(
        "Attention",
        `Vous avez répondu à ${Object.keys(reponses).length} question(s) sur ${questions.length}. Voulez-vous vraiment valider ?`,
        [
          { text: "Annuler", style: "cancel" },
          { text: "Valider", onPress: submitQuiz }
        ]
      );
    } else {
      submitQuiz();
    }
  };

  // Modifier submitQuiz pour vérifier le score
  const submitQuiz = async () => {
    setSubmitting(true);
    
    let tableauReponses = Object.keys(reponses).map(id => ({
      id: parseInt(id),
      reponse: reponses[id].toString()
    }));

    try {
      const response = await fetch(`${API_BASE_URL}${API_EVALUATION}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reponses: tableauReponses })
      });
      
      const data = await response.json();
      setResultat(data);
      
      // Calculer le pourcentage
      const percentage = data.total > 0 ? (data.score / data.total) * 100 : 0;
      setQuizScore(percentage);
      
      // Si score >= 50%, vérifier et afficher le bouton
      if (percentage >= 50) {
        // Récupérer les données d'abonnement (à adapter selon votre logique)
        if (route.params?.abonnementData) {
          setAbonnementData(route.params.abonnementData);
          await checkRegistreExistence();
        } else {
          // Si pas de données d'abonnement, demander à l'utilisateur
          Alert.alert(
            'Félicitations !',
            'Vous avez réussi le quiz avec ' + percentage.toFixed(1) + '% !\n\nPour obtenir votre certificat, veuillez fournir vos informations.',
            [
              { text: 'Plus tard', style: 'cancel' },
              { 
                text: 'Obtenir mon certificat', 
                onPress: () => {
                  // Naviguer vers un écran de saisie des informations
                  navigation.navigate('DiplomeInfo', {
                    certificat: selectedCertificat,
                    niveau: selectedNiveau,
                    score: percentage
                  });
                }
              }
            ]
          );
        }
      }
      
      setSubmitting(false);
      setShowResults(true);
      
      Alert.alert(
        "Quiz terminé !",
        `Votre score : ${data.score} / ${data.total} (${percentage.toFixed(1)}%)`,
        [
          { 
            text: "Voir le détail", 
            onPress: () => setShowResults(true) 
          }
        ]
      );
    } catch (error) {
      console.error('Erreur soumission quiz:', error);
      Alert.alert('Erreur', "Impossible d'envoyer le quiz");
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setReponses({});
    setResultat(null);
    setShowResults(false);
  };

  const getProgressPercentage = () => {
    return questions.length > 0 ? (Object.keys(reponses).length / questions.length) * 100 : 0;
  };

  const getScoreColor = (score, total) => {
    const percentage = total > 0 ? (score / total) * 100 : 0;
    if (percentage >= 80) return '#27ae60';
    if (percentage >= 60) return '#f39c12';
    if (percentage >= 40) return '#e67e22';
    return '#e74c3c';
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
      setEvaluationsList([]);
    } else if (activeTab === 'detail') {
      setActiveTab('cours');
      setSelectedCours(null);
    } else if (activeTab === 'evaluationDetail') {
      setActiveTab('cours');
      setSelectedEvaluation(null);
      setQuestions([]);
      setReponses({});
      setResultat(null);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // ---------- COMPOSANTS ONGLETS ----------
  const VideoTab = () => {
    const [selectedVideoId, setSelectedVideoId] = useState(null);
    const [videoLoading, setVideoLoading] = useState(true);
    const [videosList, setVideosList] = useState([]);
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [playerHeight, setPlayerHeight] = useState(250);
    const [isPlaying, setIsPlaying] = useState(false);
    
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
          setIsPlaying(false);
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
          // Buffering...
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

    // Gestionnaire onReady
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
              key={`youtube-player-${selectedVideoId}-${currentVideoIndex}`}
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
                    {selectedCours.duree_formatee || 'Durée non spécifiée'}
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
        </View>
      </ScrollView>
    );
  };

  // Fonction pour afficher le bouton de certificat
  const renderCertificateButton = () => {
    if (!showCertificateButton || !quizScore || quizScore < 50) return null;
    
    return (
      <View style={styles.certificateButtonContainer}>
        <TouchableOpacity
          style={styles.certificateButton}
          onPress={() => {
            if (existingRegistre) {
              // Si le registre existe déjà, aller directement à l'écran
              navigation.navigate('DiplomeInfo', {
                registreData: existingRegistre,
                certificat: selectedCertificat,
                niveau: selectedNiveau
              });
            } else {
              // Sinon, créer un nouveau registre
              createRegistre();
            }
          }}
        >
          <Icon name="verified" size={24} color="#FFF" />
          <Text style={styles.certificateButtonText}>
            {existingRegistre ? 'Voir mon certificat' : 'Obtenir mon certificat'}
          </Text>
        </TouchableOpacity>
        
        {existingRegistre && (
          <Text style={styles.certificateInfo}>
            Certificat déjà obtenu le {new Date(existingRegistre.date_delivrance).toLocaleDateString('fr-FR')}
          </Text>
        )}
      </View>
    );
  };

  // ---------- COMPOSANT D'ÉVALUATION ----------
  const EvaluationComponent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des questions...</Text>
        </View>
      );
    }

    if (showResults && resultat) {
      const percentage = resultat.total > 0 ? (resultat.score / resultat.total) * 100 : 0;
      const scoreColor = getScoreColor(resultat.score, resultat.total);
      
      let appreciation = "";
      if (percentage >= 80) appreciation = "Excellent !";
      else if (percentage >= 60) appreciation = "Très bien !";
      else if (percentage >= 40) appreciation = "Passable";
      else appreciation = "Peut mieux faire";

      return (
        <ScrollView contentContainerStyle={styles.resultContainer}>
          <LinearGradient
            colors={[scoreColor, scoreColor + 'dd']}
            style={styles.resultHeader}
          >
            <Text style={styles.resultEmoji}>
              {percentage >= 80 ? '🏆' : percentage >= 60 ? '🎉' : percentage >= 40 ? '📚' : '💪'}
            </Text>
            <Text style={styles.resultTitle}>{appreciation}</Text>
          </LinearGradient>

          <View style={styles.scoreCard}>
            <View style={styles.scoreCircle}>
              <Text style={[styles.scoreNumber, { color: scoreColor }]}>
                {resultat.score}
              </Text>
              <Text style={styles.scoreSeparator}>/</Text>
              <Text style={styles.scoreTotal}>{resultat.total}</Text>
            </View>
            
            <View style={styles.percentageContainer}>
              <Text style={[styles.percentageText, { color: scoreColor }]}>
                {percentage.toFixed(1)}%
              </Text>
              <Text style={styles.percentageLabel}>de réussite</Text>
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{questions.length}</Text>
                <Text style={styles.statLabel}>Questions</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Object.keys(reponses).length}</Text>
                <Text style={styles.statLabel}>Répondues</Text>
              </View>
            </View>
          </View>

          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Récapitulatif</Text>
            <Text style={styles.messageText}>
              Vous avez obtenu {resultat.score} point{resultat.score > 1 ? 's' : ''} sur {resultat.total}.
            </Text>
            <Text style={styles.messageSubtext}>
              {percentage >= 60 
                ? "Félicitations ! Continuez sur cette lancée." 
                : "Ne vous découragez pas, la pratique est la clé du succès !"}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.retryButton]}
              onPress={resetQuiz}
            >
              <Text style={styles.actionButtonText}>⟳ Refaire le quiz</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.backButton]}
              onPress={() => setShowResults(false)}
            >
              <Text style={styles.actionButtonText}>← Voir les questions</Text>
            </TouchableOpacity>
          </View>
          
          {renderCertificateButton()}
        </ScrollView>
      );
    }

    return (
      <View style={styles.evaluationContainer}>
        {/* Header */}
        <View style={styles.evaluationHeader}>
          <View style={styles.evaluationHeaderTop}>
            <Text style={styles.evaluationHeaderTitle}>📋 {selectedEvaluation?.titre || 'Évaluation'}</Text>
            <View style={styles.evaluationScoreBadge}>
              <Text style={styles.evaluationScoreBadgeText}>
                {Object.keys(reponses).length}/{questions.length}
              </Text>
            </View>
          </View>
          
          {/* Barre de progression */}
          <View style={styles.evaluationProgressContainer}>
            <View style={styles.evaluationProgressBar}>
              <View 
                style={[
                  styles.evaluationProgressFill, 
                  { width: `${getProgressPercentage()}%` }
                ]} 
              />
            </View>
            <Text style={styles.evaluationProgressText}>
              {Object.keys(reponses).length} question{Object.keys(reponses).length > 1 ? 's' : ''} répondue{Object.keys(reponses).length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Questions */}
        <ScrollView 
          contentContainerStyle={styles.evaluationQuestionsContainer}
          showsVerticalScrollIndicator={false}
        >
          {questions.map((q, index) => {
            const isAnswered = reponses[q.id];
            
            return (
              <View 
                key={q.id} 
                style={[
                  styles.evaluationCard,
                  isAnswered && styles.evaluationCardAnswered
                ]}
              >
                {/* En-tête de la question */}
                <View style={styles.evaluationCardHeader}>
                  <View style={styles.evaluationQuestionNumber}>
                    <Text style={styles.evaluationQuestionNumberText}>
                      Q{index + 1}
                    </Text>
                  </View>
                  <View style={styles.evaluationPointsBadge}>
                    <Text style={styles.evaluationPointsBadgeText}>{q.points || 1} pt{q.points > 1 ? 's' : ''}</Text>
                  </View>
                  {isAnswered && (
                    <View style={styles.evaluationAnsweredBadge}>
                      <Text style={styles.evaluationAnsweredBadgeText}>✓ Répondu</Text>
                    </View>
                  )}
                </View>

                {/* Texte de la question */}
                <Text style={styles.evaluationQuestion}>
                  {q.question}
                </Text>

                {/* Options de réponse */}
                <View style={styles.evaluationOptionsContainer}>
                  {q.proposition && q.proposition.split(";").map((item, idx) => {
                    const choixIndex = idx + 1;
                    const isSelected = reponses[q.id] === choixIndex;
                    const lettre = String.fromCharCode(65 + idx);
                    
                    if (!item || item.trim() === '') {
                      return null;
                    }
                    
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.evaluationOption,
                          isSelected && styles.evaluationOptionSelected
                        ]}
                        onPress={() => choisirReponse(q.id, choixIndex)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.evaluationOptionLeft}>
                          <View style={[
                            styles.evaluationOptionLetter,
                            isSelected && styles.evaluationOptionLetterSelected
                          ]}>
                            <Text style={[
                              styles.evaluationOptionLetterText,
                              isSelected && styles.evaluationOptionLetterTextSelected
                            ]}>
                              {lettre}
                            </Text>
                          </View>
                        </View>

                        <Text style={[
                          styles.evaluationOptionText,
                          isSelected && styles.evaluationOptionTextSelected
                        ]}>
                          {item.trim()}
                        </Text>

                        {isSelected && (
                          <View style={styles.evaluationCheckIcon}>
                            <Text style={styles.evaluationCheckIconText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Indicateur de réponse */}
                {isAnswered && (
                  <View style={styles.evaluationAnsweredIndicator}>
                    <Text style={styles.evaluationAnsweredIndicatorText}>
                      Réponse sélectionnée : {String.fromCharCode(64 + reponses[q.id])}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Footer avec bouton de validation */}
        <View style={styles.evaluationFooter}>
          <TouchableOpacity
            style={[
              styles.evaluationSubmitButton,
              (submitting || Object.keys(reponses).length === 0) && styles.evaluationSubmitButtonDisabled
            ]}
            onPress={envoyerQuiz}
            disabled={submitting || Object.keys(reponses).length === 0}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.evaluationSubmitButtonText}>
                  Valider le Quiz
                </Text>
                <Text style={styles.evaluationSubmitButtonSubtext}>
                  {questions.length - Object.keys(reponses).length} question
                  {questions.length - Object.keys(reponses).length > 1 ? 's' : ''} restante
                  {questions.length - Object.keys(reponses).length > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ---------- ÉCRANS ----------
  
  // Écran d'accueil - Affiche les niveaux
  const renderDashboard = () => (
    <ScrollView 
      style={styles.dashboardScreen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadInitialData} colors={['#3498db']} />}
    >
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Aperçu général</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#3498db' }]}>
            <Icon name="library-books" size={28} color="#FFF" />
            <Text style={styles.statValue}>{formatNumber(stats.totalCours)}</Text>
            <Text style={styles.statLabel}>Cours</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#2ecc71' }]}>
            <Icon name="verified" size={28} color="#FFF" />
            <Text style={styles.statValue}>{stats.totalCertificats}</Text>
            <Text style={styles.statLabel}>Certificats</Text>
          </View>
        </View>
      </View>

      <View style={styles.niveauxSection}>
        <Text style={styles.sectionTitle}>Niveaux disponibles</Text>
        <Text style={styles.sectionSubtitle}>Sélectionnez un niveau pour voir les certificats</Text>
        
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

      {/* Guide d'utilisation */}
      <View style={styles.guideSection}>
        <Text style={styles.sectionTitle}>Comment obtenir un certificat ?</Text>
        <View style={styles.guideSteps}>
          <View style={styles.guideStep}>
            <View style={[styles.stepNumber, { backgroundColor: '#3498db' }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Choisissez un certificat</Text>
              <Text style={styles.stepDescription}>
                Sélectionnez le certificat correspondant au niveau ou à la spécialité souhaitée
              </Text>
            </View>
          </View>

          <View style={styles.guideStep}>
            <View style={[styles.stepNumber, { backgroundColor: '#2ecc71' }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Validez les cours requis</Text>
              <Text style={styles.stepDescription}>
                Suivez et complétez tous les cours nécessaires pour débloquer le certificat
              </Text>
            </View>
          </View>

          <View style={styles.guideStep}>
            <View style={[styles.stepNumber, { backgroundColor: '#f39c12' }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Téléchargez votre certificat</Text>
              <Text style={styles.stepDescription}>
                Une fois les conditions remplies, générez et récupérez votre certificat officiel
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // Écran des certificats d'un niveau
  const renderCertificatsScreen = () => {
    return (
      <Animated.View style={[styles.contentScreen, { opacity: fadeAnim }]}>
        <View style={[styles.certificatHeader, { backgroundColor: selectedNiveau?.couleur_principale || '#3498db' }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.certificatHeaderTitle}>{selectedNiveau?.nom || 'Certificats'}</Text>
            <Text style={styles.certificatHeaderSubtitle}>
              Certificats disponibles
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={selectedNiveau?.couleur_principale || '#3498db'} />
          </View>
        ) : certificats.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="verified" size={60} color="#bdc3c7" />
            <Text style={styles.emptyStateTitle}>Aucun certificat</Text>
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
            renderItem={({ item }) => {
              return (
                <TouchableOpacity 
                  style={[
                    styles.certificatCard, 
                    { 
                      borderLeftColor: item.couleur || '#3498db',
                    }
                  ]}
                  onPress={() => {
                    loadContenuForCertificat(item);
                  }}
                >
                  <View style={[styles.certificatIconContainer, { 
                    backgroundColor: (item.couleur || '#3498db') + '20',
                  }]}>
                    <Icon name="verified" size={32} color={item.couleur || '#3498db'} />
                  </View>
                  <Text style={[styles.certificatName, { color: '#000' }]} numberOfLines={2}>
                    {item.titre}
                  </Text>
                  <Text style={[styles.certificatCount, { color: item.couleur || '#3498db' }]}>
                    {item.cours_count || 0} cours
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </Animated.View>
    );
  };

  // Écran des cours d'un certificat
  const renderCoursScreen = () => {
    if (!selectedCertificat) return null;

    // Ajoutez cette ligne pour récupérer les programmes
    const programmes = parseProgrammes(selectedCertificat.description);
    const programmesCount = programmes.length;

    // ────────────────────────────────────────────────────────────────
    // Contenu principal selon l'onglet actif
    // ────────────────────────────────────────────────────────────────
    const renderCoursContent = () => {
      // Chargement en cours
      if (loading) {
        return (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#3498db" />
            <Text style={{ marginTop: 12, color: '#555', fontSize: 15 }}>
              {activeSubTab === 'evaluations' ? 'Chargement du quiz...' : 
               activeSubTab === 'programmes' ? 'Chargement du programme...' : 'Chargement...'}
            </Text>
          </View>
        );
      }

      // ─── Onglet Programmes ─────────────────────────────────────
      if (activeSubTab === 'programmes') {
        if (programmesCount === 0) {
          return (
            <View style={styles.emptyState}>
              <Icon name="menu-book" size={64} color="#bdc3c7" />
              <Text style={styles.emptyStateTitle}>Aucun programme disponible</Text>
              <Text style={{ marginTop: 8, color: '#777', textAlign: 'center', paddingHorizontal: 40 }}>
                Le programme pour ce certificat n'est pas encore disponible
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
                // Essayer de détecter si l'item commence par un numéro
                const hasNumber = /^\d+\.|^[IiVX]+\.|^Chapitre \d+|^Partie \d+/i.test(item);
                
                return (
                  <View key={index} style={styles.programmeItem}>
                    <View style={styles.programmeNumberContainer}>
                      <View style={[styles.programmeNumber, { backgroundColor: (selectedCertificat?.couleur || '#3498db') + '20' }]}>
                        <Text style={[styles.programmeNumberText, { color: selectedCertificat?.couleur || '#3498db' }]}>
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
                Programme officiel - Certificat {selectedCertificat.titre}
              </Text>
            </View>
          </ScrollView>
        );
      }

      // ─── Onglet Évaluations ─────────────────────────────────────
      if (activeSubTab === 'evaluations') {
        if (evaluationsList.length === 0) {
          return (
            <View style={styles.emptyState}>
              <Icon name="assignment" size={64} color="#bdc3c7" />
              <Text style={styles.emptyStateTitle}>Aucune évaluation disponible</Text>
            </View>
          );
        }

        if (questions.length === 0) {
          return (
            <View style={styles.emptyState}>
              <Icon name="help" size={64} color="#bdc3c7" />
              <Text style={styles.emptyStateTitle}>Aucune question chargée</Text>
              <Text style={{ marginTop: 8, color: '#777', textAlign: 'center', paddingHorizontal: 40 }}>
                Le quiz n'a pas pu être chargé
              </Text>
            </View>
          );
        }

        return <EvaluationComponent />;
      }

      // ─── Onglet Cours → liste classique ───────────────────────────────
      if (coursList.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Icon name="book" size={64} color="#bdc3c7" />
            <Text style={styles.emptyStateTitle}>Aucun cours disponible</Text>
          </View>
        );
      }

      return (
        <FlatList
          data={coursList}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.coursCard}
              activeOpacity={0.88}
              onPress={() => {
                setSelectedCours(item);
                setActiveTab('detail');
              }}
            >
              <View style={styles.coursHeaderCard}>
                <View style={[styles.coursType, { backgroundColor: item.couleur || '#3498db' }]}>
                  <Icon name="school" size={14} color="#FFF" />
                  <Text style={styles.coursTypeText}>{item.type || 'Cours'}</Text>
                </View>
                <Text style={styles.coursDate}>{item.date_formatee || '—'}</Text>
              </View>

              <Text style={styles.coursTitle} numberOfLines={2}>
                {item.titre}
              </Text>

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
            </TouchableOpacity>
          )}
        />
      );
    };

    return (
      <Animated.View style={[styles.contentScreen, { opacity: fadeAnim }]}>
        {/* Header du certificat */}
        <View style={[styles.coursHeader, { backgroundColor: selectedCertificat?.couleur || '#3498db' }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.coursHeaderTitle} numberOfLines={1}>
              {selectedCertificat.titre}
            </Text>
            <Text style={styles.coursHeaderSubtitle}>
              {coursList.length + evaluationsList.length} contenu{coursList.length + evaluationsList.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Sous-onglets - AJOUT DE PROGRAMMES */}
        <View style={styles.subTabsContainer}>
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'cours' && styles.subTabActive]}
            onPress={() => setActiveSubTab('cours')}
          >
            <Icon name="school" size={20} color={activeSubTab === 'cours' ? '#3498db' : '#95a5a6'} />
            <Text style={[styles.subTabText, activeSubTab === 'cours' && styles.subTabTextActive]}>
              Cours ({coursList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'evaluations' && styles.subTabActive]}
            onPress={() => setActiveSubTab('evaluations')}
          >
            <Icon name="assignment" size={20} color={activeSubTab === 'evaluations' ? '#3498db' : '#95a5a6'} />
            <Text style={[styles.subTabText, activeSubTab === 'evaluations' && styles.subTabTextActive]}>
              Évaluations ({evaluationsList.length})
            </Text>
          </TouchableOpacity>

          {/* NOUVEL ONGLET PROGRAMMES */}
          <TouchableOpacity
            style={[styles.subTab, activeSubTab === 'programmes' && styles.subTabActive]}
            onPress={() => setActiveSubTab('programmes')}
          >
            <Icon name="menu-book" size={20} color={activeSubTab === 'programmes' ? '#3498db' : '#95a5a6'} />
            <Text style={[styles.subTabText, activeSubTab === 'programmes' && styles.subTabTextActive]}>
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
            <Text style={styles.detailHeaderTitle} numberOfLines={1}>
              {selectedCours.titre}
            </Text>
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
              case 'Détails': Component = DetailsTab; break;
              default: Component = DetailsTab;
            }
            return <Tab.Screen key={tabName} name={tabName} component={Component} />;
          })}
        </Tab.Navigator>
      </View>
    );
  };

  // Écran détail de l'évaluation
  const renderEvaluationDetailScreen = () => {
    return (
      <View style={styles.container}>
        <View style={[styles.evaluationDetailHeader, { backgroundColor: selectedCertificat?.couleur || '#3498db' }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Icon name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.detailHeaderTitle} numberOfLines={1}>
              {selectedEvaluation?.titre || 'Évaluation'}
            </Text>
          </View>
        </View>
        
        <EvaluationComponent />
      </View>
    );
  };

  // Navigation principale avec états grisés
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
          style={[
            styles.navItem, 
            activeTab === 'certificats' && styles.navItemActive,
            !selectedNiveau && styles.navItemDisabled
          ]}
          onPress={() => {
            if (selectedNiveau) {
              setActiveTab('certificats');
            } else {
              Alert.alert('Sélection requise', 'Veuillez d\'abord sélectionner un niveau');
            }
          }}
          disabled={!selectedNiveau}
        >
          <Icon 
            name="verified" 
            size={24} 
            color={activeTab === 'certificats' && selectedNiveau ? '#3498db' : !selectedNiveau ? '#ccc' : '#95a5a6'} 
          />
          <Text style={[
            styles.navText, 
            activeTab === 'certificats' && selectedNiveau && styles.navTextActive,
            !selectedNiveau && styles.navTextDisabled
          ]}>Certificats</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem, 
            activeTab === 'cours' && styles.navItemActive,
            !selectedCertificat && styles.navItemDisabled
          ]}
          onPress={() => {
            if (selectedCertificat) {
              setActiveTab('cours');
            } else {
              Alert.alert('Sélection requise', 'Veuillez d\'abord sélectionner un certificat');
            }
          }}
          disabled={!selectedCertificat}
        >
          <Icon 
            name="library-books" 
            size={24} 
            color={activeTab === 'cours' && selectedCertificat ? '#3498db' : !selectedCertificat ? '#ccc' : '#95a5a6'} 
          />
          <Text style={[
            styles.navText, 
            activeTab === 'cours' && selectedCertificat && styles.navTextActive,
            !selectedCertificat && styles.navTextDisabled
          ]}>Cours</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navItem, 
            activeTab === 'evaluations' && styles.navItemActive,
            !selectedCertificat && styles.navItemDisabled
          ]}
          onPress={() => {
            if (selectedCertificat) {
              setActiveSubTab('evaluations');
              setActiveTab('cours');
            } else {
              Alert.alert('Sélection requise', 'Veuillez d\'abord sélectionner un certificat');
            }
          }}
          disabled={!selectedCertificat}
        >
          <Icon 
            name="assignment" 
            size={24} 
            color={activeTab === 'evaluations' && selectedCertificat ? '#3498db' : !selectedCertificat ? '#ccc' : '#95a5a6'} 
          />
          <Text style={[
            styles.navText, 
            activeTab === 'evaluations' && selectedCertificat && styles.navTextActive,
            !selectedCertificat && styles.navTextDisabled
          ]}>Évaluations</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'certificats' && renderCertificatsScreen()}
      {activeTab === 'cours' && renderCoursScreen()}
      {activeTab === 'detail' && renderDetailScreen()}
      {activeTab === 'evaluationDetail' && renderEvaluationDetailScreen()}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F5F5' 
  },
  
  // Navigation
  mainNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    height: 60,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  navItemDisabled: {
    opacity: 0.5,
  },
  navText: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 4,
  },
  navTextActive: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  navTextDisabled: {
    color: '#ccc',
  },

  // Content Screen
  contentScreen: {
    flex: 1,
    backgroundColor: '#FFF',
  },

  // Headers
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
  evaluationDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    height: Platform.OS === 'ios' ? 100 : 80,
  },
  backButton: {
    padding: 5,
    width: 40,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 10,
  },
  certificatHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  certificatHeaderSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  coursHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  coursHeaderSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  detailHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },

  // Niveaux section
  niveauxSection: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    marginTop: 10,
  },
  niveauxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  niveauCard: {
    width: (width - 50) / 2,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    minHeight: 120,
  },
  niveauName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  niveauCode: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },

  // Certificat cards
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
  certificatIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  certificatName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  certificatCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3498db',
  },
  
  // Grid
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  certificatList: {
    paddingTop: 15,
    paddingBottom: 30,
    paddingHorizontal: 15,
    flexGrow: 1
  },

  // Dashboard
  dashboardScreen: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  dashboardHeader: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  resetButton: {
    padding: 5,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f39c12',
    padding: 8,
    borderRadius: 10,
    marginTop: 10,
  },
  offlineBannerText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Sections
  statsSection: {
    padding: 20,
  },
  recentSection: {
    padding: 20,
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
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },

  // Stats
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
  },

  // Recent items
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
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
  },
  recentMeta: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },

  // Sub tabs
  subTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    height: 50,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  subTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  subTabText: {
    fontSize: 13,
    color: '#95a5a6',
    marginLeft: 6,
  },
  subTabTextActive: {
    color: '#3498db',
    fontWeight: 'bold',
  },

  // Cours list
  coursList: {
    padding: 15,
  },
  coursCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
  },
  coursHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  coursType: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  coursTypeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  coursDate: {
    fontSize: 11,
    color: '#95a5a6',
  },
  coursTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  coursDescription: {
    fontSize: 13,
    color: '#5d6d7e',
    marginBottom: 15,
  },
  coursFooter: {
    flexDirection: 'row',
  },
  coursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  coursInfoText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 5,
  },
  evaluationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 15,
    alignSelf: 'flex-start',
  },
  evaluationBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },

  // Empty states
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginTop: 15,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 5,
  },

  // Loader
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 10,
  },

  // Tab container
  tabContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  noContent: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 15,
  },

  // Video styles
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
  videoCenterControls: {
    alignItems: 'center',
  },
  playPauseButton: {
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 30,
    marginBottom: 5,
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
  videoPlayButton: {
    marginRight: 10,
  },
  videoListDetails: {
    flex: 1,
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

  // Tab bar
  tabBar: {
    elevation: 0,
    height: 50,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'none',
  },
  tabIndicator: {
    height: 3,
  },

  // Details
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  detailDescription: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 22,
    marginBottom: 15,
  },
  detailsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: 'bold',
    marginLeft: 10,
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },

  // Styles pour l'évaluation
  evaluationContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  evaluationHeader: {
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  evaluationHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  evaluationHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a2634',
  },
  evaluationScoreBadge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 25,
  },
  evaluationScoreBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  evaluationProgressContainer: {
    marginBottom: 5,
  },
  evaluationProgressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  evaluationProgressFill: {
    height: '100%',
    backgroundColor: '#27ae60',
    borderRadius: 4,
  },
  evaluationProgressText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6c757d',
    fontWeight: '500',
  },
  evaluationQuestionsContainer: {
    padding: 16,
  },
  evaluationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  evaluationCardAnswered: {
    backgroundColor: '#f8f9fa',
    borderColor: '#dee2e6',
  },
  evaluationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  evaluationQuestionNumber: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  evaluationQuestionNumberText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#495057',
  },
  evaluationPointsBadge: {
    backgroundColor: '#f39c12',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  evaluationPointsBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  evaluationAnsweredBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  evaluationAnsweredBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  evaluationQuestion: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a2634',
    marginBottom: 20,
    lineHeight: 24,
  },
  evaluationOptionsContainer: {
    marginBottom: 10,
  },
  evaluationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  evaluationOptionSelected: {
    backgroundColor: '#ebf5ff',
    borderColor: '#3498db',
  },
  evaluationOptionLeft: {
    marginRight: 12,
  },
  evaluationOptionLetter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#dee2e6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evaluationOptionLetterSelected: {
    backgroundColor: '#3498db',
  },
  evaluationOptionLetterText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
  },
  evaluationOptionLetterTextSelected: {
    color: '#fff',
  },
  evaluationOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
  },
  evaluationOptionTextSelected: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  evaluationCheckIcon: {
    marginLeft: 10,
  },
  evaluationCheckIconText: {
    color: '#27ae60',
    fontSize: 18,
    fontWeight: 'bold',
  },
  evaluationAnsweredIndicator: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  evaluationAnsweredIndicatorText: {
    fontSize: 13,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  evaluationFooter: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  evaluationSubmitButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  evaluationSubmitButtonDisabled: {
    backgroundColor: '#bdc3c7',
    elevation: 0,
    shadowOpacity: 0,
  },
  evaluationSubmitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  evaluationSubmitButtonSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
  },

  // Styles pour les résultats
  resultContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  resultHeader: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 15,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    marginHorizontal: 20,
    marginTop: -30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  scoreNumber: {
    fontSize: 52,
    fontWeight: 'bold',
  },
  scoreSeparator: {
    fontSize: 32,
    color: '#95a5a6',
    marginHorizontal: 5,
  },
  scoreTotal: {
    fontSize: 32,
    color: '#95a5a6',
    fontWeight: '500',
  },
  percentageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  percentageText: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  percentageLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  statItem: {
    alignItems: 'center',
  },

  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#e9ecef',
  },
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  messageText: {
    fontSize: 15,
    color: '#34495e',
    lineHeight: 22,
    marginBottom: 8,
  },
  messageSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 25,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  retryButton: {
    backgroundColor: '#f39c12',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // guide
  guideSection: {
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: '#F8F9FA',
    marginTop: 10,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
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
  // Programmes
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
  // Certificat
  certificateButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    marginTop: 20,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
  },
  certificateButton: {
    flexDirection: 'row',
    backgroundColor: '#27ae60',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  certificateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  certificateInfo: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 10,
    fontStyle: 'italic',
  },
});