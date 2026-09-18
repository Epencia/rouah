import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AccueilScreen, { ClientDetail, FournisseurDetail } from './screens/Accueil';
import ArticlesScreen from './screens/Articles';
import VenteScreen from './screens/Vente';
import CaissesScreen from './screens/Caisses';
import ParametresScreen from './screens/Parametres';
import { Header } from './screens/Header';
import InscriptionModal from './screens/Inscription';
import VersionGate from './screens/Versions';

const { width, height } = Dimensions.get('window');

// ============ CONSTANTES API ============
const API_URL = 'https://rouah.net/api/api-connexion.php';
const PARAM_API_URL = 'https://rouah.net/api/api-parametre.php';

// ============ CLÉS POUR ASYNCSTORAGE ============
const STORAGE_KEYS = {
  USER: '@rouah_user',
  SOCIETE_ID: '@rouah_societe_id',
  BOUTIQUE_ID: '@rouah_boutique_id',
  TOKEN: '@rouah_token',
};

const TAB_TO_MODULE = {
  accueil: 'Accueil',
  articles: 'Articles',
  vente: 'Comptoir',
  caisses: 'Caisses',
  parametres: 'Parametres',
};

// Retourne true si l'onglet est autorisé
const isTabAllowed = (tabKey, permissions) => {
  if (!permissions?.length) return true;                    // aucune permission → tout OK
  const module = TAB_TO_MODULE[tabKey];
  const perm = permissions.find(p => p.module === module);  // cherche la règle
  return perm ? perm.action === 'Oui' : true;               // pas de règle → OK
};

// ============ COMPOSANT LOGIN MODAL ============
const LoginModal = ({ visible, onClose, onLoginSuccess, onRegisterPress, onForgotPress }) => {
  const [login, setLogin] = useState('');
  const [mdp, setMdp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!login.trim() || !mdp.trim()) {
      setError('Remplis le login et le mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), mdp }),
      });
      
      const data = await response.json();

      if (data.success) {
        // Sauvegarder les données de session
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
        
        // 👇 NOUVEAU : sauvegarder la session serveur
        if (data.session_id) {
          await AsyncStorage.setItem('@rouah_session_id', data.session_id);
          console.log('💾 session_id sauvegardé:', data.session_id);
        } else {
          console.warn('⚠️ Pas de session_id dans la réponse API');
        }
        if (data.session_token) {
          await AsyncStorage.setItem('@rouah_session_token', data.session_token);
        }
        
        const lien = (data.liens && data.liens[0]) || null;
        const sid = lien?.societe_id || data.user?.societe_id || null;
        const bid = lien?.boutique_id || null;
        
        if (sid) await AsyncStorage.setItem(STORAGE_KEYS.SOCIETE_ID, sid);
        if (bid) await AsyncStorage.setItem(STORAGE_KEYS.BOUTIQUE_ID, bid);

        onLoginSuccess({ 
          ...data.user, 
          token: data.token, 
          liens: data.liens || [],
          permissions: data.permissions || [],
        });
        setLogin('');
        setMdp('');
        setError('');
        onClose();
      } else {
        setError(data.error || 'Erreur de connexion inconnue');
      }
    } catch (e) {
      setError('Erreur réseau: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔐 Connexion</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.logoContainer}>
              <View style={[styles.logoCircle, { backgroundColor: '#075E54' }]}>
                <Text style={styles.logoText}>R</Text>
              </View>
              <Text style={[styles.logoTitle, { color: '#075E54' }]}>Rouah</Text>
              <Text style={styles.logoSubtitle}>Gestion Commerciale</Text>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Utilisateur</Text>
                <View style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}>
                  <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Login ou Email ou Téléphone"
                    placeholderTextColor="#999"
                    value={login}
                    onChangeText={(text) => {
                      setLogin(text);
                      setError('');
                    }}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mot de passe</Text>
                <View style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#999"
                    value={mdp}
                    onChangeText={(text) => {
                      setMdp(text);
                      setError('');
                    }}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Se connecter</Text>
                )}
              </TouchableOpacity>

              <View style={styles.linksContainer}>
                <TouchableOpacity style={styles.forgotBtn} onPress={onForgotPress}>
    <Text style={[styles.forgotBtnText, { color: '#075E54' }]}>Mot de passe oublié ?</Text>
  </TouchableOpacity>

                <Text style={styles.registerText}>
                  Pas encore de compte ?{' '}
                  <Text 
                    style={[styles.registerLink, { color: '#075E54' }]} 
                    onPress={onRegisterPress}
                  >
                    Créer un compte
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.footerText}>
              <Text style={styles.footerTextContent}>© 2026 Rouah - Tous droits réservés</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============ COMPOSANT MODAL MOT DE PASSE OUBLIÉ ============
const ForgotPasswordModal = ({ visible, onClose, onLoginPress }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    setSuccess(false);

    // Validation
    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email');
      return;
    }

    // Validation simple du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Format d\'email invalide');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://rouah.net/api/api-acces.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setEmail('');
        // Fermer automatiquement après 3 secondes
        setTimeout(() => {
          onClose();
          setSuccess(false);
          // Optionnel : revenir à l'écran de connexion
          onLoginPress?.();
        }, 3000);
      } else {
        setError(data.message || 'Une erreur est survenue');
      }
    } catch (e) {
      setError('Erreur réseau: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: '#fff' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🔑 Mot de passe oublié</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={styles.forgotIconContainer}>
              <Ionicons name="mail-outline" size={50} color="#075E54" />
            </View>

            <Text style={styles.forgotTitle}>
              Récupération de vos accès
            </Text>
            <Text style={styles.forgotSubtitle}>
              Saisissez l'adresse email associée à votre compte.
              Nous vous enverrons vos identifiants de connexion.
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {success ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
                <Text style={styles.successText}>
                  Un email contenant vos accès a été envoyé !
                </Text>
                <Text style={styles.successSubText}>
                  Redirection vers la connexion...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Adresse email</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}>
                    <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="exemple@email.com"
                      placeholderTextColor="#999"
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        setError('');
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!loading}
                      returnKeyType="send"
                      onSubmitEditing={handleSend}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
                  onPress={handleSend}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginBtnText}>Envoyer</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.backToLoginBtn} onPress={onClose}>
              <Text style={styles.backToLoginText}>⬅️ Retour à la connexion</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============ COMPOSANT ONBOARDING ============
const OnboardingScreen = ({ onGetStarted, onRegister }) => {
  const features = [
    { icon: '📊', title: 'Tableau de bord', description: 'Visualisez vos indicateurs clés en temps réel' },
    { icon: '📦', title: 'Gestion des stocks', description: 'Suivez vos articles et alertes de stock' },
    { icon: '💰', title: 'Ventes & Caisses', description: 'Gérez vos ventes et vos caisses facilement' },
    { icon: '📈', title: 'Rapports détaillés', description: 'Analysez vos performances avec des rapports complets' },
  ];

  return (
    <ScrollView 
      style={styles.onboardingContainer}
      contentContainerStyle={styles.onboardingContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.onboardingHeader}>
        <View style={styles.onboardingLogo}>
          <Text style={styles.onboardingLogoText}>R</Text>
        </View>
        <Text style={styles.onboardingTitle}>Bienvenue sur Rouah</Text>
        <Text style={styles.onboardingSubtitle}>
          La solution complète de gestion commerciale
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.featureIconContainer}>
              <Text style={styles.featureIcon}>{feature.icon}</Text>
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.getStartedBtn} onPress={onRegister}>
        <Text style={styles.getStartedBtnText}>Commencer</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.onboardingFooter}>
        <Text style={styles.onboardingFooterText}>
          Déjà un compte ?{' '}
          <Text style={styles.onboardingFooterLink} onPress={onGetStarted}>
            Se connecter
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
};

// ============ APP PRINCIPAL ============

export default function App() {
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [activeTab, setActiveTab] = useState('accueil');
  const [loginVisible, setLoginVisible] = useState(false);
  const [inscriptionVisible, setInscriptionVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [societeId, setSocieteId] = useState(null);
  const [activeBoutiqueId, setActiveBoutiqueId] = useState(null);
  const [loadingBoutiques, setLoadingBoutiques] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [versionOk, setVersionOk] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false); 
  const [permissions, setPermissions] = useState([]);

  const bottomTabs = [
    { key: 'accueil', label: 'Accueil', icon: 'home', iconActive: 'home', requiresAuth: false },
    { key: 'articles', label: 'Articles', icon: 'cube', iconActive: 'cube', requiresAuth: true },
    { key: 'vente', label: 'Comptoir', icon: 'cart', iconActive: 'cart', requiresAuth: true },
    { key: 'caisses', label: 'Caisses', icon: 'cash', iconActive: 'cash', requiresAuth: true },
    { key: 'parametres', label: 'Paramètres', icon: 'settings', iconActive: 'settings', requiresAuth: true },
  ];

  // ============ CHARGEMENT DE LA SESSION ============
  const loadSession = async () => {
    try {
      // Récupérer les données stockées
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const sid = await AsyncStorage.getItem(STORAGE_KEYS.SOCIETE_ID);
      const bid = await AsyncStorage.getItem(STORAGE_KEYS.BOUTIQUE_ID);

      const perms = await AsyncStorage.getItem('@rouah_permissions');
if (perms) setPermissions(JSON.parse(perms));

      if (userData && token) {
        const user = JSON.parse(userData);
        setUser(user);
        if (sid) setSocieteId(sid);
        if (bid) setActiveBoutiqueId(bid);
        
        console.log('✅ Session chargée pour:', user.nom_prenom);
      }
    } catch (e) {
      console.warn('Erreur chargement session:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ============ CHARGER LES BOUTIQUES ============
  const loadBoutiques = async () => {
    if (!societeId) return;
    setLoadingBoutiques(true);
    try {
      const res = await fetch(PARAM_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          societe_id: societeId,
          action: 'list_boutiques',
        }),
      });
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        if (!activeBoutiqueId) {
          setActiveBoutiqueId(json.data[0].boutique_id);
          await AsyncStorage.setItem(STORAGE_KEYS.BOUTIQUE_ID, json.data[0].boutique_id);
          console.log('✅ Boutique par défaut sélectionnée:', json.data[0].nom);
        } else {
          const exists = json.data.some(b => b.boutique_id === activeBoutiqueId);
          if (!exists) {
            setActiveBoutiqueId(json.data[0].boutique_id);
            await AsyncStorage.setItem(STORAGE_KEYS.BOUTIQUE_ID, json.data[0].boutique_id);
            console.log('🔄 Boutique réaffectée à:', json.data[0].nom);
          }
        }
        return json.data;
      }
      return [];
    } catch (e) {
      console.warn('Erreur chargement boutiques:', e.message);
      return [];
    } finally {
      setLoadingBoutiques(false);
    }
  };

  // ============ CALLBACK POUR CHANGEMENT DE BOUTIQUE ============
  const handleBoutiqueChange = async (newBoutiqueId) => {
    console.log('🔄 Changement de boutique depuis Paramètres:', newBoutiqueId);
    setActiveBoutiqueId(newBoutiqueId);
    await AsyncStorage.setItem(STORAGE_KEYS.BOUTIQUE_ID, newBoutiqueId);
  };

  // ============ CHARGEMENT INITIAL ============
  useEffect(() => {
    loadSession();
  }, []);

  // Charger les boutiques quand societeId change
  useEffect(() => {
    if (societeId) {
      loadBoutiques();
    }
  }, [societeId]);

  // ============ GESTION DE LA CONNEXION ============
  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    const lien = (userData.liens && userData.liens[0]) || null;
    const sid = lien?.societe_id || userData.societe_id || null;
    const bid = lien?.boutique_id || null;
    
    setSocieteId(sid);
    setActiveBoutiqueId(bid);
    setPermissions(userData.permissions || []);
await AsyncStorage.setItem('@rouah_permissions', JSON.stringify(userData.permissions || []));
    
    // Sauvegarder dans AsyncStorage
    if (sid) await AsyncStorage.setItem(STORAGE_KEYS.SOCIETE_ID, sid);
    if (bid) await AsyncStorage.setItem(STORAGE_KEYS.BOUTIQUE_ID, bid);
    
    
    if (!bid && sid) {
      setTimeout(() => loadBoutiques(), 500);
    }
  };

 // ============ GESTION DE LA DÉCONNEXION ============
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
            try {
              // ============================================================
              // 1. RÉCUPÉRER LES IDENTIFIANTS DE SESSION
              // ============================================================
              const sessionId = await AsyncStorage.getItem('@rouah_session_id');
              const sessionToken = await AsyncStorage.getItem('@rouah_session_token');
              const userId = user?.utilisateur_id || null;

              // ============================================================
              // 2. APPEL API DE DÉCONNEXION (libère la place côté serveur)
              // ============================================================
              if (sessionId) {
                try {
                  const response = await fetch(
                    'https://rouah.net/api/api-deconnexion.php',
                    {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        session_id: sessionId,
                        session_token: sessionToken,
                        user_id: userId,
                      }),
                    }
                  );

                  const data = await response.json();
                   console.log(data);

                  if (data.success) {
                    console.log('✅ Déconnexion serveur réussie');
                  } else {
                    console.warn('⚠️ Déconnexion serveur:', data.message || data.error);
                  }
                } catch (apiError) {
                  // On ne bloque pas la déconnexion locale si l'API échoue
                  console.warn('⚠️ API déconnexion injoignable:', apiError.message);
                }
              }

              // ============================================================
              // 3. NETTOYAGE DU STOCKAGE LOCAL (toujours exécuté)
              // ============================================================
              await AsyncStorage.multiRemove([
                STORAGE_KEYS.USER,
                STORAGE_KEYS.TOKEN,
                STORAGE_KEYS.SOCIETE_ID,
                STORAGE_KEYS.BOUTIQUE_ID,
                '@rouah_session_id',
                '@rouah_session_token',
                '@rouah_permissions',
              ]);

              // ============================================================
              // 4. RÉINITIALISATION DE L'ÉTAT REACT
              // ============================================================
              setUser(null);
              setSocieteId(null);
              setActiveBoutiqueId(null);
              setSelectedClient(null);
              setSelectedFournisseur(null);
              setActiveTab('accueil');
              setPermissions([]);

            } catch (e) {
              console.error('❌ Erreur déconnexion:', e.message);
              // En cas d'erreur critique, on force quand même le nettoyage local
              await AsyncStorage.clear();
              setUser(null);
              setSocieteId(null);
              setActiveBoutiqueId(null);
              setActiveTab('accueil');
            }
          }
        }
      ]
    );
  };
  // ============ GESTION DES TABS ============
  const handleTabPress = (tab) => {
    if (tab.requiresAuth && !user) {
      Alert.alert(
        'Connexion requise',
        'Veuillez vous connecter pour accéder à ce module.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => setLoginVisible(true) }
        ]
      );
      return;
    }
    setActiveTab(tab.key);
  };

 const handleUserUpdated = useCallback((updated) => {
  setUser(prev => {
    const newUser = { ...prev, ...updated };
    AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser)).catch(() => {});
    return newUser;
  });
}, []);

  // ============ AFFICHAGE DU CHARGEMENT ============
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Chargement de la session...</Text>
      </View>
    );
  }

  // ============ DÉTAILS CLIENT / FOURNISSEUR ============
  if (selectedClient) {
    return <ClientDetail client={selectedClient} onBack={() => setSelectedClient(null)} user={user} societeId={societeId} boutiqueId={activeBoutiqueId} />;
  }

  if (selectedFournisseur) {
    return <FournisseurDetail fournisseur={selectedFournisseur} onBack={() => setSelectedFournisseur(null)} user={user} societeId={societeId} boutiqueId={activeBoutiqueId} />;
  }

  // ============ RENDU DES ÉCRANS ============
  const renderScreen = () => {
    if (!user && activeTab === 'accueil') {
      return (
        <OnboardingScreen 
          onGetStarted={() => setLoginVisible(true)} 
          onRegister={() => setInscriptionVisible(true)} 
        />
      );
    }

    switch(activeTab) {
      case 'accueil':
        return <AccueilScreen 
                   onSelectClient={setSelectedClient} 
                   onSelectFournisseur={setSelectedFournisseur} 
                   user={user} 
                   societeId={societeId}
                   boutiqueId={activeBoutiqueId}
               />;
      case 'articles':
        return user ? (
          <ArticlesScreen 
            user={user} 
            societeId={societeId} 
            boutiqueId={activeBoutiqueId} 
            onChanged={() => {
              loadBoutiques();
            }}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Connectez-vous pour accéder aux articles</Text>
          </View>
        );
      case 'vente':
        return user ? (
          <VenteScreen 
            user={user} 
            societeId={societeId} 
            boutiqueId={activeBoutiqueId} 
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Connectez-vous pour accéder à la vente</Text>
          </View>
        );
      case 'caisses':
        return user ? (
          <CaissesScreen 
            user={user} 
            societeId={societeId} 
            boutiqueId={activeBoutiqueId} 
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Connectez-vous pour accéder aux caisses</Text>
          </View>
        );
      case 'parametres':
        return user ? (
          <ParametresScreen 
            user={user} 
            onLogout={handleLogout} 
            societeId={societeId} 
            activeBoutiqueId={activeBoutiqueId}
            setActiveBoutiqueId={handleBoutiqueChange}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Connectez-vous pour accéder aux paramètres</Text>
          </View>
        );
      default:
        return null;
    }
  };

  // ============ RENDU PRINCIPAL ============
  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <StatusBar backgroundColor="#075E54" barStyle="light-content" />
      <Header 
        title="Rouah" 
        user={user}
        onLoginPress={() => setLoginVisible(true)}
        onLogoutPress={handleLogout}
        societeId={societeId}
        boutiqueId={activeBoutiqueId}
        onDashboardClose={() => {}}
        onUserUpdated={handleUserUpdated} 
      />
      <View style={styles.content}>
        {loadingBoutiques ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#075E54" />
            <Text style={styles.loadingText}>Chargement des boutiques...</Text>
          </View>
        ) : (
          renderScreen()
        )}
      </View>
      <View style={styles.bottomTabBar}>
        {bottomTabs.map((tab) => {
  const isActive = activeTab === tab.key;
  const isAuthDisabled = tab.requiresAuth && !user;
  const isPermDenied = user && !isTabAllowed(tab.key, permissions);
  const isDisabled = isAuthDisabled || isPermDenied;

  return (
    <TouchableOpacity
      key={tab.key}
      style={[styles.bottomTab, isActive && styles.bottomTabActive]}
      onPress={() => {
        if (isAuthDisabled) {
          Alert.alert('Connexion requise', 'Veuillez vous connecter.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Se connecter', onPress: () => setLoginVisible(true) },
          ]);
        } else if (isPermDenied) {
          Alert.alert('Accès refusé', 'Vous n\'avez pas accès à ce module.');
        } else {
          setActiveTab(tab.key);
        }
      }}
    >
      <Ionicons
        name={isActive ? tab.iconActive : tab.icon}
        size={24}
        color={isDisabled ? '#ccc' : (isActive ? '#075E54' : '#999')}
      />
      <Text style={[
        styles.bottomTabText,
        isActive && styles.bottomTabTextActive,
        isDisabled && styles.bottomTabTextDisabled,
      ]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
})}
      </View>

      <LoginModal
        visible={loginVisible}
        onClose={() => setLoginVisible(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegisterPress={() => {
          setLoginVisible(false);
          setInscriptionVisible(true);
        }}
        onForgotPress={() => { // 👈 NOUVEAU
          setLoginVisible(false);
          setForgotVisible(true);
        }}
      />

      <InscriptionModal
        visible={inscriptionVisible}
        onClose={() => setInscriptionVisible(false)}
        onLoginPress={() => {
          setInscriptionVisible(false);
          setLoginVisible(true);
        }}
        onRegisterSuccess={() => {}}
      />

      {/* MOT DE PASSE OUBLIE */}
      <ForgotPasswordModal
        visible={forgotVisible}
        onClose={() => setForgotVisible(false)}
        onLoginPress={() => {
          setForgotVisible(false);
          setLoginVisible(true);
        }}
      />

       <VersionGate
      onReady={() => setVersionOk(true)}
      onBlocked={() => setVersionOk(false)}
    />

    </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ECE5DD' },
  content: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    color: '#075E54',
    marginTop: 12,
    fontSize: 16,
  },
  
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },

  bottomTabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
    paddingBottom: 45,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  bottomTabActive: {
    borderTopWidth: 2,
    borderTopColor: '#075E54',
    paddingTop: 2,
  },
  bottomTabDisabled: {
    opacity: 0.5,
  },
  bottomTabText: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  bottomTabTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },
  bottomTabTextDisabled: {
    color: '#ccc',
  },

  // ===== ONBOARDING =====
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  onboardingContent: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  onboardingHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  onboardingLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  onboardingLogoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  onboardingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#075E54',
    textAlign: 'center',
  },
  onboardingSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },

  featuresContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  featureDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#075E54',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    gap: 8,
  },
  getStartedBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  onboardingFooter: {
    marginTop: 16,
  },
  onboardingFooterText: {
    fontSize: 14,
    color: '#666',
  },
  onboardingFooterLink: {
    color: '#075E54',
    fontWeight: '600',
  },

  // ===== MODAL LOGIN =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#075E54',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 30,
  },

  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoSubtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },

  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
  },

  formContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#171717',
    paddingVertical: 12,
  },
  eyeBtn: {
    padding: 4,
  },

  loginBtn: {
    backgroundColor: '#075E54',
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  linksContainer: {
    alignItems: 'center',
    marginTop: 14,
  },
  forgotBtn: {
    marginBottom: 8,
  },
  forgotBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  registerText: {
    fontSize: 13,
    color: '#8a8a8e',
  },
  registerLink: {
    fontWeight: '600',
  },

  footerText: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerTextContent: {
    fontSize: 12,
    color: '#999',
  },
  // ===== FORGOT PASSWORD =====
forgotIconContainer: {
  alignItems: 'center',
  marginBottom: 16,
  marginTop: 8,
},
forgotTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#1a1a2e',
  textAlign: 'center',
  marginBottom: 8,
},
forgotSubtitle: {
  fontSize: 14,
  color: '#6b7280',
  textAlign: 'center',
  marginBottom: 20,
  lineHeight: 20,
},
successBox: {
  padding: 16,
  borderRadius: 12,
  backgroundColor: '#dcfce7',
  borderWidth: 1,
  borderColor: '#bbf7d0',
  alignItems: 'center',
  marginBottom: 16,
},
successText: {
  fontSize: 15,
  fontWeight: '600',
  color: '#16a34a',
  marginTop: 4,
  textAlign: 'center',
},
successSubText: {
  fontSize: 13,
  color: '#16a34a',
  marginTop: 4,
},
backToLoginBtn: {
  marginTop: 16,
  padding: 8,
  alignItems: 'center',
},
backToLoginText: {
  fontSize: 14,
  color: '#075E54',
  fontWeight: '500',
},
});