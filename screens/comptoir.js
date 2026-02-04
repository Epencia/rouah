import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { Ionicons,MaterialIcons } from '@expo/vector-icons';

const API_URL = 'https://rouah.net/api/comptoir.php';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Comptoir = () => {
  // === ÉTATS ===
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [login, setLogin] = useState('');
  const [mdp, setMdp] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // === SESSION UTILISATEUR ===
  const [user, setUser] = useState({
    utilisateur_id: null,
    login: '',
    nom_prenom: '',
    email: '',
    telephone: '',
    matricule: '',
    role: '',
    date_saisie: '',
    photo: '',
    type: '',
    etat: '',
    solde: 0,
  });

  // === DONNÉES ===
  const [articles, setArticles] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [clients, setClients] = useState([]);
  const [prestations, setPrestations] = useState([]);

  // === VENTE ===
  const [matriculeInput, setMatriculeInput] = useState('');
  const [selectedPrestation, setSelectedPrestation] = useState(null);
  const [article_id, setArticleId] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [prix_manuel, setPrixManuel] = useState('');
  const [temp_client, setTempClient] = useState(null);
  const [userCommandesCount, setUserCommandesCount] = useState(0);

  // === SCANNER ===
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [radarAngle, setRadarAngle] = useState(0);

  // === MODALS ===
  const [showProfilModal, setShowProfilModal] = useState(false);
  const [showCommandesModal, setShowCommandesModal] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [showPrestationsModal, setShowPrestationsModal] = useState(false);
  const [showPrestationsSelect, setShowPrestationsSelect] = useState(false);

  // === CONSOLE ===
  const [consoleLogs, setConsoleLogs] = useState([]);

  // === RÉFÉRENCES ===
  const scrollViewRef = useRef(null);
  const animationRef = useRef(null);
  const consoleScrollRef = useRef(null);

  // === INITIALISATION ===
  useEffect(() => {
    checkSavedSession();
    initConsole();
    
    // Animation du radar
    startRadarAnimation();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Animation radar
  const startRadarAnimation = () => {
    let angle = 0;
    const animate = () => {
      angle = (angle + 1) % 360;
      setRadarAngle(angle);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
  };

  const initConsole = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('fr-FR', { hour12: false });
    const initialLogs = [
      `${time} - Système Rouah Pro initialisé ✓`,
      `${time} - Session: ${user.nom_prenom || 'Non connecté'}`,
    ];
    setConsoleLogs(initialLogs);
  };

  const checkSavedSession = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('rouah_user');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsLoggedIn(true);
        loadDashboardData(userData);
      }
    } catch (e) {
      console.error('Erreur session:', e);
      logToConsole('Erreur chargement session: ' + e.message, 'error');
    }
  };

  // === FONCTION API GÉNÉRIQUE ===
  const apiRequest = async (data = {}) => {
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
      });

      //console.log('API Request:', API_URL);
      //console.log('Data:', data);

      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseText = await response.text();
      //console.log('API Response:', responseText);

      if (!responseText || responseText.trim() === '') {
        throw new Error('Réponse serveur vide');
      }

      try {
        const result = JSON.parse(responseText);
        //console.log('JSON parsed:', result);
        return result;
      } catch (jsonError) {
        //console.error('JSON parse error:', jsonError);
        console.error('Raw response:', responseText);
        throw new Error('Format de réponse invalide');
      }
    } catch (error) {
      //console.error('API Error:', error);
      throw error;
    }
  };

  // === CONNEXION ===
  const handleLogin = async () => {
    setIsSubmitting(true);
    setError('');
    setErrors({});

    if (!login.trim()) {
      setErrors({ login: 'Le champ Utilisateur est obligatoire' });
      setIsSubmitting(false);
      return;
    }
    if (!mdp.trim()) {
      setErrors({ mdp: 'Le champ Mot de passe est obligatoire' });
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await apiRequest({ 
        login: login.trim(),
        mdp: mdp.trim()
      });

      if (result.success) {
        setUser(result.user);
        setIsLoggedIn(true);
        await AsyncStorage.setItem('rouah_user', JSON.stringify(result.user));
        loadDashboardData(result.user);
        logToConsole(`Connecté: ${result.user.nom_prenom}`, 'success');
      } else {
        setError(result.error || 'Erreur de connexion');
        logToConsole(`Erreur: ${result.error}`, 'error');
      }
    } catch (err) {
      //console.error('Login error:', err);
      
      if (err.message.includes('Network request failed')) {
        setError('Erreur réseau. Vérifiez votre connexion internet.');
      } else if (err.message.includes('Réponse serveur vide')) {
        setError('Le serveur ne répond pas. Vérifiez que l\'API est active.');
      } else if (err.message.includes('Format de réponse invalide')) {
        setError('Le serveur a retourné une réponse invalide.');
      } else {
        setError('Erreur: ' + err.message);
      }
      
      logToConsole('Erreur connexion: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // === CHARGEMENT DES DONNÉES ===
  const loadDashboardData = async (currentUser) => {
    if (!currentUser || !currentUser.utilisateur_id) return;
    
    try {
      //console.log('Chargement des données pour utilisateur:', currentUser.utilisateur_id);
      
      // Charger les articles
      try {
        const articlesResult = await apiRequest({ action: 'get_articles' });
        if (articlesResult.success) {
          setArticles(articlesResult.articles || []);
          //console.log('Articles chargés:', articlesResult.articles?.length || 0);
        }
      } catch (articlesError) {
        //console.error('Erreur articles:', articlesError);
      }
      
      // Charger les commandes
      try {
        const commandesResult = await apiRequest({ action: 'get_commandes' });
        if (commandesResult.success) {
          setCommandes(commandesResult.commandes || []);
          //console.log('Commandes chargées:', commandesResult.commandes?.length || 0);
        }
      } catch (commandesError) {
        console.error('Erreur commandes:', commandesError);
      }
      
      // Charger les clients
      try {
        const clientsResult = await apiRequest({ action: 'get_clients' });
        if (clientsResult.success) {
          setClients(clientsResult.clients || []);
          //console.log('Clients chargés:', clientsResult.clients?.length || 0);
        }
      } catch (clientsError) {
        console.error('Erreur clients:', clientsError);
      }
      
      // Charger les prestations
      try {
        const prestationsResult = await apiRequest({ action: 'get_prestations' });
        if (prestationsResult.success) {
          setPrestations(prestationsResult.prestations || []);
          //console.log('Prestations chargées:', prestationsResult.prestations?.length || 0);
        }
      } catch (prestationsError) {
        console.error('Erreur prestations:', prestationsError);
      }
      
      logToConsole('Données chargées avec succès', 'success');
    } catch (error) {
      console.error('Erreur chargement données:', error);
      logToConsole('Erreur chargement données', 'error');
    }
  };

  // === DÉCONNEXION ===
  const handleLogout = async () => {
    try {
      await apiRequest({ deconnexion: '1' });
    } catch (e) {
      console.log('Déconnexion API ignorée:', e);
    }
    
    setUser({
      utilisateur_id: null,
      login: '',
      nom_prenom: '',
      email: '',
      telephone: '',
      matricule: '',
      role: '',
      date_saisie: '',
      photo: '',
      type: '',
      etat: '',
      solde: 0,
    });
    setIsLoggedIn(false);
    setTempClient(null);
    setArticles([]);
    setCommandes([]);
    setClients([]);
    setPrestations([]);
    
    await AsyncStorage.removeItem('rouah_user');
    logToConsole('Déconnexion réussie', 'info');
  };

  // === SCANNER QR ===
  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    
    if (!/^\d{6}$/.test(data)) {
      Alert.alert('Erreur', 'QR code invalide (6 chiffres requis)');
      return;
    }

    fetchClientProfile(data);
    setShowScanner(false);
  };

  const fetchClientProfile = async (matricule) => {
    try {
      const result = await apiRequest({
        action: 'get_client_profile',
        matricule,
      });

      if (result.success) {
        setTempClient(result.client);
        setMatriculeInput(matricule);
        
        if (result.client.utilisateur_id && user.utilisateur_id) {
          const userCommands = commandes.filter(cmd => 
            cmd.utilisateur_id == result.client.utilisateur_id
          );
          setUserCommandesCount(userCommands.length);
        }

        logToConsole(`Client trouvé: ${result.client.nom_prenom}`, 'success');
      } else {
        Alert.alert('Erreur', result.error);
        logToConsole(`Erreur client: ${result.error}`, 'error');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de récupérer le profil');
      logToConsole('Erreur API client', 'error');
    }
  };

  // === CRÉER COMMANDE ===
  const handleCommander = async () => {
    setMessage('');
    setError('');

    if (!/^\d{6}$/.test(matriculeInput)) {
      setError("Le matricule doit contenir exactement 6 chiffres.");
      return;
    }

    if (!article_id) {
      setError("Veuillez sélectionner une prestation.");
      return;
    }

    try {
      const result = await apiRequest({
        action: 'commander',
        matricule: matriculeInput,
        article_id,
        quantite: quantite || '1',
        prix_manuel: prix_manuel || '0',
      });

      if (result.success) {
        setMessage(result.message);
        
        if (temp_client) {
          setTempClient(temp_client);
        }

        const commandesResult = await apiRequest({ action: 'get_commandes' });
        if (commandesResult.success) {
          setCommandes(commandesResult.commandes);
        }

        logToConsole(`Commande créée: ${result.message}`, 'success');
        
        setArticleId('');
        setQuantite('1');
        setPrixManuel('');
        setSelectedPrestation(null);
      } else {
        setError(result.error);
        logToConsole(`Erreur commande: ${result.error}`, 'error');
      }
    } catch (err) {
      setError('Erreur serveur: ' + err.message);
      logToConsole('Erreur serveur commande: ' + err.message, 'error');
    }
  };

  // === STOP CLIENT ===
  const handleStopClient = async () => {
    try {
      await apiRequest({ action: 'stop_client' });
      setTempClient(null);
      setMatriculeInput('');
      logToConsole('Session client arrêtée', 'info');
    } catch (err) {
      logToConsole('Erreur stop client: ' + err.message, 'error');
    }
  };

  // === LOG CONSOLE ===
  const logToConsole = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    const logEntry = `[${time}] ${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${msg}`;
    setConsoleLogs(prev => [logEntry, ...prev.slice(0, 49)]);
    
    // Auto-scroll
    setTimeout(() => {
      if (consoleScrollRef.current) {
        consoleScrollRef.current.scrollTo({ x: 0, y: 0, animated: true });
      }
    }, 100);
  };

  // === CALCUL TOTAL ===
  const calculateTotal = () => {
    const article = articles.find(a => a.article_id == article_id);
    if (!article) return 0;
    
    const prix = prix_manuel ? parseFloat(prix_manuel) : parseFloat(article.prix);
    const qty = parseInt(quantite) || 1;
    
    return prix * qty;
  };

  // === COMPOSANT RADAR ===
  const RadarComponent = () => {
    const size = 250;
    const center = size / 2;
    const radius = center - 20;
    
    // Conversion de l'angle en radians
    const angleRad = (radarAngle * Math.PI) / 180;
    
    return (
      <View style={styles.radarContainer}>
        <Svg width={size} height={size}>
          {/* Cercle de fond */}
          <Circle cx={center} cy={center} r={radius} fill="rgba(10,26,47,0.9)" />
          
          {/* Cercles concentriques */}
          {[1, 2, 3, 4].map((i) => (
            <Circle
              key={i}
              cx={center}
              cy={center}
              r={(radius / 4) * i}
              stroke="rgba(0,255,157,0.2)"
              strokeWidth="1"
              fill="transparent"
            />
          ))}
          
          {/* Croix */}
          <Line
            x1={center}
            y1={center - radius}
            x2={center}
            y2={center + radius}
            stroke="rgba(0,255,157,0.3)"
            strokeWidth="1"
          />
          <Line
            x1={center - radius}
            y1={center}
            x2={center + radius}
            y2={center}
            stroke="rgba(0,255,157,0.3)"
            strokeWidth="1"
          />
          
          {/* Ligne radar */}
          <Line
            x1={center}
            y1={center}
            x2={center + Math.cos(angleRad) * radius}
            y2={center + Math.sin(angleRad) * radius}
            stroke="rgba(0,255,157,0.8)"
            strokeWidth="2"
          />
          
          {/* Arc de balayage */}
          <Path
            d={`
              M ${center} ${center}
              L ${center + Math.cos(angleRad - 0.3) * radius} ${center + Math.sin(angleRad - 0.3) * radius}
              A ${radius} ${radius} 0 0 1 ${center + Math.cos(angleRad + 0.3) * radius} ${center + Math.sin(angleRad + 0.3) * radius}
              Z
            `}
            fill="rgba(0,255,157,0.1)"
          />
          
          {/* Points de détection */}
          {[
            { x: 0.3, y: 0.4, type: 'normal' },
            { x: 0.6, y: 0.3, type: 'warning' },
            { x: 0.7, y: 0.6, type: 'normal' },
            { x: 0.4, y: 0.7, type: 'critical' },
            { x: 0.2, y: 0.5, type: 'normal' },
          ].map((point, index) => (
            <Circle
              key={index}
              cx={center + (point.x - 0.5) * size * 0.8}
              cy={center + (point.y - 0.5) * size * 0.8}
              r={7}
              fill={
                point.type === 'warning' ? '#ffa502' :
                point.type === 'critical' ? '#ff4757' : '#00ff9d'
              }
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="1"
            >
              <Svg.Animate
                attributeName="r"
                values="7;10;7"
                dur="3s"
                repeatCount="indefinite"
              />
            </Circle>
          ))}
        </Svg>
        
        <Text style={styles.radarText}>
          {temp_client ? 'Client scanné ✓' : 'Scanner QR Code'}
        </Text>
      </View>
    );
  };

  // === ÉCRAN DE CONNEXION ===
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.loginContainer}>
        <View style={styles.loginModal}>
          <View style={styles.loginContent}>
            <View style={styles.loginHeader}>
              <Text style={styles.loginTitle}>
                <Text style={{ color: '#00ffea' }}>⚡</Text> ACCÈS SÉCURISÉ
              </Text>
            </View>
            
            <View style={styles.loginBody}>
              <View style={styles.loginLogo}>
                <Text style={styles.loginLogoTitle}>Rouah Pro</Text>
                <Text style={styles.loginLogoSubtitle}>Système Professionnel de Vente</Text>
              </View>

              {error ? (
                <View style={styles.loginError}>
                  <Text style={{ color: '#ff3366' }}>⚠ {error}</Text>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Identifiant</Text>
                <TextInput
                  style={styles.formInput}
                  value={login}
                  onChangeText={setLogin}
                  placeholder="Votre identifiant"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
                {errors.login && <Text style={styles.errorText}>{errors.login}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mot de passe</Text>
                <TextInput
                  style={styles.formInput}
                  value={mdp}
                  onChangeText={setMdp}
                  placeholder="Votre mot de passe"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />
                {errors.mdp && <Text style={styles.errorText}>{errors.mdp}</Text>}
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.loginButtonText}>SE CONNECTER</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // === ÉCRAN PRINCIPAL ===
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logo}>
            <Text style={{ color: '#000', fontSize: 20 }}>⚡</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Rouah Pro</Text>
            <Text style={styles.headerSubtitle}>
              Connecté : {user.nom_prenom} | {new Date().toLocaleTimeString('fr-FR', { hour12: false })}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={{ color: '#ff3366' }}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.main} ref={scrollViewRef}>
        {/* PREMIÈRE COLONNE */}
        <View style={styles.column}>
          {/* SCANNER */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>
            Scanner QR Client
            </Text>
            
            {message ? (
              <View style={styles.messageSuccess}>
                <Text style={{ color: '#39ff14' }}>✓ {message}</Text>
              </View>
            ) : null}
            
            {error ? (
              <View style={styles.messageError}>
                <Text style={{ color: '#ff3366' }}>⚠ {error}</Text>
              </View>
            ) : null}

            {/* RADAR */}
            <RadarComponent />

            <View style={styles.scannerButtons}>
              <TouchableOpacity
                style={styles.scannerButton}
                onPress={() => {
                  setScanned(false);
                  setShowScanner(true);
                }}
              >
                <Text style={styles.scannerButtonText}>Scanner QR</Text>
              </TouchableOpacity>
              
              {temp_client && (
                <TouchableOpacity
                  style={[styles.scannerButton, { backgroundColor: '#ff3366' }]}
                  onPress={handleStopClient}
                >
                  <Text style={styles.scannerButtonText}>Stop Client</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* PROFIL CLIENT */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Profil Client</Text>
            
            {temp_client ? (
              <View style={styles.clientProfile}>
                <View style={styles.clientHeader}>
                  {temp_client.photo ? (
                    <Image
                      source={{ uri: `data:${temp_client.type || 'image/png'};base64,${temp_client.photo}` }}
                      style={styles.clientAvatar}
                    />
                  ) : (
                    <View style={styles.clientAvatar}>
                      <Text style={{ color: '#00ffea', fontSize: 24 }}>👤</Text>
                    </View>
                  )}
                  
                  <View>
                    <Text style={styles.clientName}>{temp_client.nom_prenom}</Text>
                    <Text style={styles.clientMatricule}>
                      Matricule: {temp_client.matricule || temp_client.numero_carte}
                    </Text>
                  </View>
                </View>

                <View style={styles.clientStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userCommandesCount}</Text>
                    <Text style={styles.statLabel}>Commandes</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{temp_client.telephone}</Text>
                    <Text style={styles.statLabel}>Téléphone</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{temp_client.role}</Text>
                    <Text style={styles.statLabel}>Rôle</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.noClient}>
                <Text style={{ color: '#94a3b8', fontSize: 60 }}>👤</Text>
                <Text style={{ color: '#94a3b8' }}>Aucun client scanné</Text>
              </View>
            )}
          </View>
        </View>

        {/* DEUXIÈME COLONNE */}
        <View style={styles.column}>
          {/* COMPTOIR DE VENTE */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Comptoir de Vente</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Matricule Client (6 chiffres)</Text>
              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.formInput2}
                  value={matriculeInput}
                  onChangeText={setMatriculeInput}
                  placeholder="123456"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => {
                    setScanned(false);
                    setShowScanner(true);
                  }}
                >
                  <Text style={{ color: '#00ffea',textAlign:"center" }}>QR</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Prestations</Text>
              <TouchableOpacity
                style={styles.prestationSelectButton}
                onPress={() => setShowPrestationsSelect(true)}
              >
                <Text style={selectedPrestation ? styles.prestationSelectText : styles.prestationSelectPlaceholder}>
                  {selectedPrestation || 'Sélectionner une prestation...'}
                </Text>
                <Text style={{ color: '#00ffea' }}>▼</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>Quantité</Text>
                <TextInput
                  style={styles.formInput}
                  value={quantite}
                  onChangeText={setQuantite}
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Prix manuel</Text>
                <TextInput
                  style={styles.formInput}
                  value={prix_manuel}
                  onChangeText={setPrixManuel}
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.totalContainer}>
              <Text style={styles.totalText}>
                Total: {calculateTotal().toLocaleString()} FCFA
              </Text>
            </View>

            <TouchableOpacity
              style={styles.validateButton}
              onPress={handleCommander}
              disabled={!matriculeInput || !article_id}
            >
              <Text style={styles.validateButtonText}>Valider la Vente</Text>
            </TouchableOpacity>
          </View>

          {/* CONSOLE */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Journal des Opérations</Text>
            <ScrollView 
              style={styles.console}
              ref={consoleScrollRef}
              showsVerticalScrollIndicator={true}
            >
              {consoleLogs.map((log, index) => (
                <Text key={index} style={styles.consoleText}>{log}</Text>
              ))}
            </ScrollView>
          </View>
        </View>

        {/* TROISIÈME COLONNE */}
        <View style={styles.column}>
          {/* PROFIL UTILISATEUR */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{user.nom_prenom}</Text>
            
            {user.photo ? (
              <Image
                source={{ uri: `data:${user.type || 'image/png'};base64,${user.photo}` }}
                style={styles.userAvatar}
              />
            ) : (
              <View style={styles.userAvatar}>
                <Text style={{ color: '#00ffea', fontSize: 40 }}>👤</Text>
              </View>
            )}
            
            <Text style={styles.userInfo}>Rôle: {user.role}</Text>
            <Text style={styles.userInfo}>Matricule: {user.matricule}</Text>
            <Text style={styles.userInfo}>Téléphone: {user.telephone}</Text>
          </View>

          {/* STATISTIQUES */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Statistiques</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statBig}>{commandes.length}</Text>
                <Text style={styles.statSmall}>Ventes Total</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statBig}>
                  {commandes.reduce((sum, cmd) => sum + parseFloat(cmd.montant_commande || 0), 0).toLocaleString()}
                </Text>
                <Text style={styles.statSmall}>CA (FCFA)</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statBig}>{articles.length}</Text>
                <Text style={styles.statSmall}>Prestations</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statBig}>{clients.length}</Text>
                <Text style={styles.statSmall}>Clients</Text>
              </View>
            </View>
          </View>

          {/* ACTIONS RAPIDES */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Panneau de Contrôle</Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowProfilModal(true)}
            >
              <Text style={styles.actionButtonText}>Mon Profil</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowPrestationsModal(true)}
            >
              <Text style={styles.actionButtonText}>Prestations</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowCommandesModal(true)}
            >
              <Text style={styles.actionButtonText}>Commandes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowClientsModal(true)}
            >
              <Text style={styles.actionButtonText}>Clients</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* MODAL SCANNER */}
      <Modal visible={showScanner} animationType="slide">
        <SafeAreaView style={styles.scannerModal}>
          <View style={styles.scannerHeader}>
            <Text style={styles.scannerTitle}>Scanner QR Code</Text>
            <TouchableOpacity onPress={() => setShowScanner(false)}>
              <Text style={{ color: '#00ffea', fontSize: 24 }}>×</Text>
            </TouchableOpacity>
          </View>
          
          <CameraView
            style={{ flex: 1 }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          />
          
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerFrame} />
          </View>
        </SafeAreaView>
      </Modal>

      {/* MODAL SELECTION PRESTATIONS */}
      <Modal visible={showPrestationsSelect} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une prestation</Text>
              <TouchableOpacity onPress={() => setShowPrestationsSelect(false)}>
                <Text style={{ color: '#00ffea', fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {articles.map((article, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.prestationSelectItem}
                  onPress={() => {
                    setSelectedPrestation(`${article.titre} - ${parseFloat(article.prix).toLocaleString()} FCFA`);
                    setArticleId(article.article_id.toString());
                    setShowPrestationsSelect(false);
                    setPrixManuel(parseFloat(article.prix).toLocaleString());
                  }}
                >
                  <View style={styles.prestationSelectInfo}>
                    <Text style={styles.prestationSelectName}>{article.titre}</Text>
                    <Text style={styles.prestationSelectPrice}>
                      {parseFloat(article.prix).toLocaleString()} FCFA
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              {articles.length === 0 && (
                <Text style={styles.noDataText}>Aucune prestation disponible</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL PROFIL */}
      <Modal visible={showProfilModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>PROFIL UTILISATEUR</Text>
              <TouchableOpacity onPress={() => setShowProfilModal(false)}>
                <Text style={{ color: '#00ffea', fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.profileContainer}>
                {user.photo ? (
                  <Image
                    source={{ uri: `data:${user.type || 'image/png'};base64,${user.photo}` }}
                    style={styles.profileImage}
                  />
                ) : (
                  <View style={styles.profileImage}>
                    <Text style={{ color: '#00ffea', fontSize: 60 }}>👤</Text>
                  </View>
                )}
                
                <Text style={styles.profileName}>{user.nom_prenom}</Text>
                <View style={styles.profileStatus}>
                  <Text style={{ color: '#39ff14' }}>● {user.etat || 'Actif'}</Text>
                </View>
              </View>
              
              <View style={styles.profileDetails}>
                <View style={styles.profileField}>
                  <Text style={styles.profileLabel}>Rôle:</Text>
                  <Text style={styles.profileValue}>{user.role}</Text>
                </View>
                
                <View style={styles.profileField}>
                  <Text style={styles.profileLabel}>Matricule:</Text>
                  <Text style={styles.profileValue}>{user.matricule}</Text>
                </View>
                
                <View style={styles.profileField}>
                  <Text style={styles.profileLabel}>Email:</Text>
                  <Text style={styles.profileValue}>{user.email}</Text>
                </View>
                
                <View style={styles.profileField}>
                  <Text style={styles.profileLabel}>Téléphone:</Text>
                  <Text style={styles.profileValue}>{user.telephone}</Text>
                </View>
                
                <View style={styles.profileField}>
                  <Text style={styles.profileLabel}>Date d'inscription:</Text>
                  <Text style={styles.profileValue}>{user.date_saisie}</Text>
                </View>
                
                <View style={styles.profileField}>
                  <Text style={styles.profileLabel}>Solde:</Text>
                  <Text style={[styles.profileValue, { color: '#39ff14' }]}>
                    {parseFloat(user.solde || 0).toLocaleString()} FCFA
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL COMMANDES */}
      <Modal visible={showCommandesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>COMMANDES ({commandes.length})</Text>
              <TouchableOpacity onPress={() => setShowCommandesModal(false)}>
                <Text style={{ color: '#00ffea', fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {commandes.map((commande, index) => (
                <View key={index} style={styles.commandeItem}>
                  <Text style={styles.commandeNumero}>N° {commande.numero_commande}</Text>
                  <Text style={styles.commandeDetail}>Client: {commande.client_nom || 'N/A'}</Text>
                  <Text style={styles.commandeDetail}>Prestation: {commande.article_titre || 'N/A'}</Text>
                  <Text style={styles.commandeDetail}>Montant: {parseFloat(commande.montant_commande || 0).toLocaleString()} FCFA</Text>
                  <Text style={styles.commandeDate}>{commande.date_commande} {commande.heure_commande}</Text>
                </View>
              ))}
              {commandes.length === 0 && (
                <Text style={styles.noDataText}>Aucune commande</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL CLIENTS */}
      <Modal visible={showClientsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CLIENTS ({clients.length})</Text>
              <TouchableOpacity onPress={() => setShowClientsModal(false)}>
                <Text style={{ color: '#00ffea', fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {clients.map((client, index) => (
                <View key={index} style={styles.clientModalItem}>
                  <View style={styles.clientModalAvatar}>
                    {client.photo ? (
                      <Image
                        source={{ uri: `data:${client.type || 'image/png'};base64,${client.photo}` }}
                        style={styles.clientModalImage}
                      />
                    ) : (
                      <Text style={{ color: '#00ffea', fontSize: 30 }}>👤</Text>
                    )}
                  </View>
                  <View style={styles.clientModalInfo}>
                    <Text style={styles.clientModalName}>{client.nom_prenom}</Text>
                    <Text style={styles.clientModalDetail}>Matricule: {client.matricule}</Text>
                    <Text style={styles.clientModalDetail}>Téléphone: {client.telephone}</Text>
                    <Text style={styles.clientModalDetail}>Commandes: {client.total_commandes || 0}</Text>
                    <Text style={styles.clientModalDetail}>Dépense totale: {parseFloat(client.total_depense || 0).toLocaleString()} FCFA</Text>
                  </View>
                </View>
              ))}
              {clients.length === 0 && (
                <Text style={styles.noDataText}>Aucun client</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL PRESTATIONS */}
      <Modal visible={showPrestationsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>PRESTATIONS ({prestations.length})</Text>
              <TouchableOpacity onPress={() => setShowPrestationsModal(false)}>
                <Text style={{ color: '#00ffea', fontSize: 24 }}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {prestations.map((prestation, index) => (
                <View key={index} style={styles.prestationModalItem}>
                  <Text style={styles.prestationModalTitle}>{prestation.titre}</Text>
                  <Text style={styles.prestationModalDetail}>Prix: {parseFloat(prestation.prix || 0).toLocaleString()} FCFA</Text>
                  <Text style={styles.prestationModalDetail}>Ventes: {prestation.nombre_ventes || 0}</Text>
                  <Text style={styles.prestationModalDetail}>Chiffre d'affaires: {parseFloat(prestation.chiffre_affaires || 0).toLocaleString()} FCFA</Text>
                  {prestation.description && (
                    <Text style={styles.prestationModalDescription}>{prestation.description}</Text>
                  )}
                </View>
              ))}
              {prestations.length === 0 && (
                <Text style={styles.noDataText}>Aucune prestation</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#010214',
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#010214',
  },
  loginModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(5,5,5,0.98)',
  },
  loginContent: {
    backgroundColor: '#0a1a2f',
    borderWidth: 2,
    borderColor: '#00f5ff',
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
  },
  loginHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,234,0.1)',
    backgroundColor: '#010214',
  },
  loginTitle: {
    color: '#00f5ff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  loginBody: {
    padding: 20,
  },
  loginLogo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  loginLogoTitle: {
    color: '#00f5ff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  loginLogoSubtitle: {
    color: '#00f5ff',
    fontSize: 14,
  },
  loginError: {
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderWidth: 1,
    borderColor: '#ff3366',
    padding: 10,
    marginBottom: 15,
    borderRadius: 4,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    color: '#00f5ff',
    fontSize: 14,
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#0a1a2f',
    borderWidth: 1,
    borderColor: '#00f5ff',
    color: '#e0f7fa',
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
  },
  errorText: {
    color: '#ff3366',
    fontSize: 12,
    marginTop: 5,
  },
  loginButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00f5ff',
    padding: 15,
    alignItems: 'center',
    borderRadius: 4,
    marginTop: 10,
  },
  loginButtonText: {
    color: '#00f5ff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Header
  header: {
    backgroundColor: 'rgba(10,26,47,0.8)',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,234,0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#00ffea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e0f7fa',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
  },
  logoutButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#ff3366',
    borderRadius: 4,
  },
  
  // Main layout
  main: {
    flex: 1,
    padding: 10,
  },
  column: {
    marginBottom: 15,
  },
  panel: {
    backgroundColor: '#0a1a2f',
    borderWidth: 1,
    borderColor: 'rgba(0,255,234,0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  
  // Radar
  radarContainer: {
    height: 280,
    backgroundColor: 'rgba(10,26,47,0.9)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,255,157,0.3)',
    overflow: 'hidden',
  },
  radarText: {
    color: '#00ffea',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
  },
  
  // Scanner buttons
  scannerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  scannerButton: {
    flex: 1,
    backgroundColor: 'rgba(0,255,234,0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ffea',
  },
  scannerButtonText: {
    color: '#00ffea',
    fontWeight: 'bold',
  },
  
  // Messages
  messageSuccess: {
    backgroundColor: 'rgba(0,255,76,0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#39ff14',
    padding: 10,
    marginBottom: 15,
    borderRadius: 6,
  },
  messageError: {
    backgroundColor: 'rgba(255,71,87,0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#ff3366',
    padding: 10,
    marginBottom: 15,
    borderRadius: 6,
  },
  
  // Client profile
  clientProfile: {
    backgroundColor: 'rgba(0,20,40,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,234,0.2)',
    borderRadius: 10,
    padding: 15,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  clientAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#00ffea',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientName: {
    color: '#00ffea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clientMatricule: {
    color: '#94a3b8',
    fontSize: 14,
  },
  clientStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,255,234,0.2)',
    flex: 1,
    marginHorizontal: 5,
  },
  statValue: {
    color: '#00ffea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
  },
  noClient: {
    alignItems: 'center',
    padding: 30,
  },
  
  // Form elements
  inputGroup: {
    flexDirection: 'row',
  },
  formInput2: {
  flex: 1,
  width: "80%",
  backgroundColor: '#0a1a2f',
    borderWidth: 1,
    borderColor: '#00f5ff',
    color: '#e0f7fa',
    padding: 12,
    borderRadius: 4,
    fontSize: 16,
},
  qrButton: {
    width: "20%",
    padding: 12,
    borderWidth: 1,
    borderColor: '#00ffea',
    borderRadius: 4,
    marginLeft: 10,
  },
  
  // Prestation select
  prestationSelectButton: {
    backgroundColor: '#0a1a2f',
    borderWidth: 1,
    borderColor: '#00f5ff',
    borderRadius: 4,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  prestationSelectText: {
    color: '#e0f7fa',
    fontSize: 16,
  },
  prestationSelectPlaceholder: {
    color: '#94a3b8',
    fontSize: 16,
  },
  
  row: {
    flexDirection: 'row',
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,255,234,0.2)',
    paddingTop: 15,
    marginTop: 15,
    alignItems: 'center',
  },
  totalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ffea',
  },
  validateButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00ffea',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  validateButtonText: {
    color: '#00ffea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Console
  console: {
    backgroundColor: '#000',
    borderRadius: 6,
    padding: 10,
    height: 200,
    borderWidth: 1,
    borderColor: 'rgba(0,255,234,0.3)',
  },
  consoleText: {
    color: '#00ff9d',
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  
  // User profile
  userAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#00ffea',
    alignSelf: 'center',
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,234,0.2)',
  },
  statBig: {
    color: '#00ffea',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statSmall: {
    color: '#94a3b8',
    fontSize: 12,
  },
  
  // Action buttons
  actionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,255,234,0.3)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#00ffea',
    fontSize: 16,
  },
  
  // Scanner modal
  scannerModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0a1a2f',
  },
  scannerTitle: {
    color: '#00ffea',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00ffea',
    borderRadius: 20,
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,5,5,0.95)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0a1a2f',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00ffea',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,255,234,0.2)',
    backgroundColor: 'rgba(0,20,40,0.3)',
  },
  modalTitle: {
    color: '#00ffea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 15,
  },
  
  // Profile modal
  profileContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#00ffea',
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    color: '#00ffea',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  profileStatus: {
    backgroundColor: 'rgba(57,255,20,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  profileDetails: {
    marginTop: 20,
  },
  profileField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  profileLabel: {
    color: '#94a3b8',
  },
  profileValue: {
    color: '#e0f7fa',
    fontWeight: 'bold',
  },
  
  // Commandes modal
  commandeItem: {
    backgroundColor: 'rgba(0,20,40,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,234,0.2)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  commandeNumero: {
    color: '#00ffea',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  commandeDetail: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 3,
  },
  commandeDate: {
    color: '#666',
    fontSize: 12,
    marginTop: 5,
  },
  
  // Prestation select modal
  prestationSelectItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  prestationSelectInfo: {
    flex: 1,
  },
  prestationSelectName: {
    color: '#00ffea',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  prestationSelectPrice: {
    color: '#39ff14',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Clients modal
  clientModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,20,40,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,234,0.2)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  clientModalAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,255,234,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#00ffea',
  },
  clientModalImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  clientModalInfo: {
    flex: 1,
  },
  clientModalName: {
    color: '#00ffea',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  clientModalDetail: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 2,
  },
  
  // Prestations modal
  prestationModalItem: {
    backgroundColor: 'rgba(0,20,40,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0,255,234,0.2)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  prestationModalTitle: {
    color: '#00ffea',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  prestationModalDetail: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 3,
  },
  prestationModalDescription: {
    color: '#666',
    fontSize: 13,
    marginTop: 5,
    fontStyle: 'italic',
  },
  
  // No data text
  noDataText: {
    color: '#94a3b8',
    textAlign: 'center',
    padding: 30,
    fontSize: 16,
  },
});

export default Comptoir;