import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator,
  Alert, RefreshControl, StatusBar, Modal, Dimensions, ScrollView, Linking, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { WebView } from 'react-native-webview';

// Import conditionnel — évite le crash dans Expo Go
let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = () => {};

try {
  const speechRecognition = require("expo-speech-recognition");
  ExpoSpeechRecognitionModule = speechRecognition.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechRecognition.useSpeechRecognitionEvent;
} catch (e) {
  console.warn("🎤 Reconnaissance vocale non disponible (Expo Go ou module manquant)");
}

const API_URL = 'https://cyberic.xyz/api/ia-base.php';
const GESTIONNAIRE_API_URL = 'https://cyberic.xyz/api/ia-gestionnaire.php';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 60;

// ================================================================
// 🧮 MOTEUR D'ANALYSE AUTOMATIQUE (pour Indicateurs)
// ================================================================
function analyserDonnees(results) {
  if (!results || results.length === 0) {
    return { hasData: false, message: "Aucune donnée à analyser." };
  }

  const keys = Object.keys(results[0]);
  const numericColumns = keys.filter(k => {
    const firstVal = results[0][k];
    return !isNaN(parseFloat(firstVal)) && isFinite(firstVal);
  });

  if (numericColumns.length === 0) {
    return { hasData: true, message: "Données non numériques détectées." };
  }

  const stats = {};
  const insights = [];
  const recommendations = [];

  numericColumns.forEach(col => {
    const values = results.map(r => parseFloat(r[col]) || 0);
    const n = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const moyenne = sum / n;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((acc, v) => acc + Math.pow(v - moyenne, 2), 0) / n;
    const ecartType = Math.sqrt(variance);
    const cv = moyenne !== 0 ? (ecartType / Math.abs(moyenne)) * 100 : 0;

    let tendance = 'stable';
    let variation = 0;
    if (n >= 3 && values[0] !== 0) {
      variation = ((values[n - 1] - values[0]) / Math.abs(values[0])) * 100;
      if (variation > 10) tendance = 'hausse';
      else if (variation < -10) tendance = 'baisse';
    }

    stats[col] = { moyenne, min, max, ecartType, cv, tendance, variation, count: n, sum };

    if (tendance === 'hausse') {
      insights.push(`📈 **${col}** : Croissance de +${variation.toFixed(1)}%`);
      if (variation > 50) recommendations.push(`Croissance rapide de ${col}. Vérifier la soutenabilité.`);
    } else if (tendance === 'baisse') {
      insights.push(`📉 **${col}** : Baisse de ${variation.toFixed(1)}%`);
      recommendations.push(`Investiguer les causes de la baisse de ${col}.`);
    }

    if (cv > 30) {
      insights.push(`⚠️ **${col}** : Forte dispersion (CV=${cv.toFixed(1)}%)`);
      recommendations.push(`Segmenter l'analyse de ${col} par sous-catégories.`);
    } else if (cv < 10) {
      insights.push(`✅ **${col}** : Données homogènes (CV=${cv.toFixed(1)}%)`);
    }

    if (max > 0 && min > 0 && max / min > 10) {
      insights.push(`🔍 **${col}** : Écart important (×${(max / min).toFixed(1)})`);
    }
  });

  const synthese = `${results.length} résultats. ` +
    numericColumns.slice(0, 2).map(col => {
      const s = stats[col];
      return `${col} : moyenne ${s.moyenne.toFixed(1)}, tendance ${s.tendance}`;
    }).join('. ');

  return {
    hasData: true,
    stats,
    insights: insights.slice(0, 6),
    recommendations: recommendations.slice(0, 4),
    synthese,
    numericColumns,
    totalResults: results.length
  };
}

export default function App() {
  // ===== ÉTATS GLOBAUX =====
  const [gestionnaireModalVisible, setGestionnaireModalVisible] = useState(false);
  const [surveillanceModalVisible, setSurveillanceModalVisible] = useState(false);
  const [indicateursModalVisible, setIndicateursModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('bases');

  // ===== ÉTATS UTILISATEUR =====
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [loginInput, setLoginInput] = useState('');
  const [mdpInput, setMdpInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const resetEmailRef = useRef(null);

  const [editCredentialsModalVisible, setEditCredentialsModalVisible] = useState(false);
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ===== ÉTATS BASES & CHAT =====
  const [bases, setBases] = useState([]);
  const [selectedBase, setSelectedBase] = useState(null);
  const [isLoadingBases, setIsLoadingBases] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  const [indicators, setIndicators] = useState([]);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveIndicatorModalVisible, setSaveIndicatorModalVisible] = useState(false);
  const [isSavingIndicator, setIsSavingIndicator] = useState(false);
  const [newIndicatorName, setNewIndicatorName] = useState('');
  const [newIndicatorDesc, setNewIndicatorDesc] = useState('');
  const [newIndicatorSql, setNewIndicatorSql] = useState('');

  const [alertThresholds, setAlertThresholds] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [thresholdModalVisible, setThresholdModalVisible] = useState(false);
  const [currentThresholdIndicator, setCurrentThresholdIndicator] = useState(null);
  const [tempMin, setTempMin] = useState('');
  const [tempMax, setTempMax] = useState('');

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [recognizing, setRecognizing] = useState(false);

  // ================================================================
  // FONCTIONS VOIX
  // ================================================================
  const speak = (text) => {
    if (!text || !autoSpeak) return;
    const cleanText = text.replace(/[*#_`]/g, '').substring(0, 4000);
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(cleanText, {
      language: 'fr-FR',
      rate: 1.0,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const stopSpeaking = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  useSpeechRecognitionEvent("start", () => {
    setRecognizing(true);
    console.log("🎤 Reconnaissance démarrée");
  });

  useSpeechRecognitionEvent("end", () => {
    setRecognizing(false);
    console.log("🎤 Reconnaissance terminée");
  });

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript || "";
    setInputText(text);
    console.log("📝 Texte reconnu:", text);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.log("❌ Erreur reconnaissance:", event.error, event.message);
    setRecognizing(false);
    Alert.alert("Erreur", "Erreur de reconnaissance vocale: " + (event.message || event.error));
  });

  const toggleVoiceRecognition = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        "Non disponible",
        "La reconnaissance vocale nécessite l'application installée et non la simulation."
      );
      return;
    }
    if (isSpeaking) stopSpeaking();
    if (recognizing) {
      try {
        await ExpoSpeechRecognitionModule.stop();
        setRecognizing(false);
        console.log("🎤 Arrêt de l'écoute");
      } catch (e) {
        console.error("Erreur arrêt:", e);
      }
      return;
    }
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert("Permission refusée", "Vous devez autoriser l'accès au microphone.");
        return;
      }
      await ExpoSpeechRecognitionModule.start({
        lang: "fr-FR",
        interimResults: true,
        continuous: false,
      });
      console.log("🎤 En écoute...");
    } catch (error) {
      console.error("❌ Erreur démarrage voix:", error);
      Alert.alert("Erreur", "Impossible de démarrer la reconnaissance vocale.");
      setRecognizing(false);
    }
  };

  // ================================================================
  // MODIFICATION DES ACCÈS
  // ================================================================
  const openEditCredentialsModal = () => {
    if (isSpeaking) stopSpeaking();
    setNewLogin(user?.login || '');
    setNewPassword('');
    setConfirmPassword('');
    setEditCredentialsModalVisible(true);
  };

  const handleUpdateCredentials = async () => {
    const login = newLogin.trim();
    const password = newPassword.trim();
    const confirm = confirmPassword.trim();

    if (!login) {
      Alert.alert('Erreur', 'Le login est obligatoire.');
      return;
    }

    if (password && password !== confirm) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setIsUpdatingCredentials(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_credentials',
          user_id: user.id,
          login: login,
          password: password || undefined
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setUser({ ...user, login: login });
        Alert.alert('Succès', 'Vos accès ont été modifiés avec succès.');
        setEditCredentialsModalVisible(false);
        speak('Vos accès ont été modifiés.');
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de modifier les accès.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  const addMonitoringMessage = (content, isAlert = false) => {
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: content,
      isAlert: isAlert 
    }]);
  };

  // ================================================================
  // RENDER MESSAGE
  // ================================================================
  const renderMessage = ({ item, index }) => {
    if (item.role === 'user') {
      return (
        <View style={styles.userRow}>
          <View style={styles.userBubble}>
            <Text style={styles.userText} selectable>{item.content}</Text>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(index, item.content)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.editButtonText}>✏️ Modifier</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return <AiMessage 
      item={item} 
      onSaveIndicator={(sql) => { setNewIndicatorSql(sql); setSaveIndicatorModalVisible(true); }}
      onSpeak={speak}
    />;
  };

  // ================================================================
  // EFFETS
  // ================================================================
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 120);
    }
  }, [messages, isLoading]);

  useEffect(() => {
    loadThresholds();
    loadAlerts();
  }, []);

  const loadThresholds = async () => {
    try {
      const saved = await AsyncStorage.getItem('eric_thresholds');
      if (saved) setAlertThresholds(JSON.parse(saved));
    } catch (e) { console.error('Erreur chargement seuils', e); }
  };

  const loadAlerts = async () => {
    try {
      const saved = await AsyncStorage.getItem('eric_alerts');
      if (saved) setAlerts(JSON.parse(saved));
    } catch (e) { console.error('Erreur chargement alertes', e); }
  };

  const saveThresholds = async (thresholds) => {
    try {
      await AsyncStorage.setItem('eric_thresholds', JSON.stringify(thresholds));
    } catch (e) { console.error('Erreur sauvegarde seuils', e); }
  };

  const saveAlertsData = async (alertsData) => {
    try {
      await AsyncStorage.setItem('eric_alerts', JSON.stringify(alertsData));
    } catch (e) { console.error('Erreur sauvegarde alertes', e); }
  };

  const showToast = (title, message, type = 'info') => {
    Alert.alert(title, message);
  };

  const checkAlerts = (data, indicatorName, indicatorId) => {
    const threshold = alertThresholds[indicatorId];
    if (!threshold) return;
    const firstValue = data[0] ? Object.values(data[0])[0] : null;
    if (firstValue !== null && !isNaN(parseFloat(firstValue))) {
      const value = parseFloat(firstValue);
      if (threshold.min !== undefined && value < threshold.min) {
        showToast(`🔴 Alerte ${indicatorName}`, `Valeur ${value} inférieure au seuil min ${threshold.min}`, 'error');
        addAlert(indicatorName, value, 'min', threshold.min);
      }
      if (threshold.max !== undefined && value > threshold.max) {
        showToast(`🔴 Alerte ${indicatorName}`, `Valeur ${value} supérieure au seuil max ${threshold.max}`, 'error');
        addAlert(indicatorName, value, 'max', threshold.max);
      }
    }
  };

  const addAlert = async (indicatorName, value, type, threshold) => {
    const newAlert = {
      id: Date.now().toString(),
      indicator: indicatorName,
      value: value,
      type: type,
      threshold: threshold,
      time: new Date().toLocaleString()
    };
    const updatedAlerts = [newAlert, ...alerts];
    setAlerts(updatedAlerts);
    await saveAlertsData(updatedAlerts);
  };

  const removeAlert = async (index) => {
    const updatedAlerts = alerts.filter((_, i) => i !== index);
    setAlerts(updatedAlerts);
    await saveAlertsData(updatedAlerts);
  };

  const openThresholdModal = (indicatorId, indicatorName) => {
    if (isSpeaking) stopSpeaking();
    setCurrentThresholdIndicator({ id: indicatorId, name: indicatorName });
    const current = alertThresholds[indicatorId] || {};
    setTempMin(current.min !== undefined ? String(current.min) : '');
    setTempMax(current.max !== undefined ? String(current.max) : '');
    setThresholdModalVisible(true);
  };

  const saveThreshold = async () => {
    const min = tempMin !== '' ? parseFloat(tempMin) : undefined;
    const max = tempMax !== '' ? parseFloat(tempMax) : undefined;
    const newThresholds = { ...alertThresholds };
    if (min === undefined && max === undefined) {
      delete newThresholds[currentThresholdIndicator.id];
    } else {
      newThresholds[currentThresholdIndicator.id] = { min, max };
    }
    setAlertThresholds(newThresholds);
    await saveThresholds(newThresholds);
    setThresholdModalVisible(false);
    showToast('Succès', `Seuils mis à jour pour "${currentThresholdIndicator.name}"`, 'success');
  };

  // ================================================================
  // AUTHENTIFICATION
  // ================================================================
  const handleLogin = async () => {
    if (!loginInput.trim() || !mdpInput.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir le login et le mot de passe.');
      return;
    }
    setIsLoggingIn(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', login: loginInput.trim(), mdp: mdpInput.trim() })
      });
      const data = await res.json();
      if (data.error) Alert.alert('Erreur de connexion', data.error);
      else if (data.success && data.user) {
        setUser(data.user);
        setIsLoggedIn(true);
        setLoginInput(''); setMdpInput('');
        fetchBases(data.user.id);
        speak(`Bienvenue ${data.user.nom}`);
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de se connecter au serveur.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const openForgotModal = () => {
    if (isSpeaking) stopSpeaking();
    setResetEmail(''); setResetSuccess(false); setResetMessage('');
    setForgotModalVisible(true);
    setTimeout(() => resetEmailRef.current?.focus(), 300);
  };

  const closeForgotModal = () => {
    setForgotModalVisible(false); setResetEmail(''); setResetSuccess(false); setResetMessage('');
  };

  const handleResetPassword = async () => {
    const email = resetEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Erreur', 'Veuillez saisir une adresse email valide.');
      return;
    }
    setIsResetting(true); setResetMessage('');
    try {
      const res = await fetch('https://cyberic.xyz/api/retrouve-acces.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.error) { setResetSuccess(false); setResetMessage(data.error); }
      else { setResetSuccess(true); setResetMessage(data.message || 'Vos accès ont été envoyés.'); }
    } catch (e) {
      setResetSuccess(false); setResetMessage('Erreur de connexion au serveur.');
    } finally { setIsResetting(false); }
  };

  const fetchBases = useCallback(async (userId, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setIsLoadingBases(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_bases', user_id: userId })
      });
      const data = await res.json();
      if (data.error) Alert.alert('Erreur', data.error);
      else setBases(data.bases || []);
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de charger les bases.');
    } finally {
      setIsLoadingBases(false); setRefreshing(false);
    }
  }, []);

  const selectBase = async (base) => {
    if (isSpeaking) stopSpeaking();
    setSelectedBase(base);
    setMessages([]); setEditingIndex(null); setInputText(''); setSearchQuery('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_indicateurs', user_id: user.id, base_id: base.base_id })
      });
      const data = await res.json();
      if (data.success) setIndicators(data.indicateurs || []);
    } catch (e) {
      console.error('Erreur chargement indicateurs', e);
    }
    speak(`Base sélectionnée: ${base.nom_base}`);
  };

  const handleLogout = () => {
    stopSpeaking();
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion', style: 'destructive',
        onPress: () => {
          setIsLoggedIn(false); setUser(null); setBases([]); setSelectedBase(null);
          setMessages([]); setLoginInput(''); setMdpInput(''); setEditingIndex(null);
          setIndicators([]);
        }
      }
    ]);
  };

  // ================================================================
  // CHAT
  // ================================================================
  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading || !selectedBase || !user) return;
    if (isSpeaking) stopSpeaking();
    let newMessages = [...messages];
    if (editingIndex !== null) {
      newMessages = newMessages.slice(0, editingIndex);
      newMessages.push({ role: 'user', content: text });
      setEditingIndex(null);
    } else {
      newMessages.push({ role: 'user', content: text });
    }
    setMessages(newMessages);
    setInputText(''); setIsLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ask_ia', user_id: user.id, base_id: selectedBase.base_id, question: text })
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', error: data.error, sql: data.sql || null }]);
        speak("Désolé, " + data.error);
      } else if (data.success) {
        const MAX_ROWS = 500;
        const allResults = Array.isArray(data.results) ? data.results : [];
        const safeResults = allResults.slice(0, MAX_ROWS);
        setMessages(prev => {
          const next = [...prev, {
            role: 'assistant',
            results: safeResults,
            sql: data.sql,
            count: data.count || allResults.length,
            truncated: allResults.length > MAX_ROWS,
          }];
          return next.length > 40 ? next.slice(-40) : next;
        });
        if (safeResults.length > 0) {
          let textToSpeak = `J'ai trouvé ${data.count || data.results.length} résultats.`;
          if (data.results.length === 1) {
            const r = data.results[0];
            const firstKey = Object.keys(r)[0];
            const firstValue = r[firstKey];
            textToSpeak = `Résultat: ${firstKey} ${firstValue}. `;
            const secondKey = Object.keys(r)[1];
            if (secondKey) textToSpeak += `${secondKey}: ${r[secondKey]}. `;
          }
          speak(textToSpeak);
        } else {
          speak("Aucun résultat trouvé pour votre recherche.");
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', error: 'Erreur de connexion au serveur.' }]);
      speak("Erreur de connexion au serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecuteIndicator = async (indicateur) => {
    if (isSpeaking) stopSpeaking();
    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: `📊 Exécution : ${indicateur.nom}` }]);
    setIsSidebarVisible(false);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute_indicateur', user_id: user.id, indicateur_id: indicateur.indicateur_id })
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', error: data.error, sql: indicateur.requete_sql }]);
        speak("Erreur lors de l'exécution de l'indicateur.");
      } else if (data.success) {
        if (data.results && data.results.length > 0) {
          checkAlerts(data.results, indicateur.nom, indicateur.indicateur_id);
        }
        setMessages(prev => [...prev, {
          role: 'assistant', results: (Array.isArray(data.results) ? data.results.slice(0, 500) : []), sql: data.sql || indicateur.requete_sql,
          count: data.count || 0, isIndicator: true, nom: data.nom, indicatorId: indicateur.indicateur_id
        }]);
        if (data.results && data.results.length > 0) {
          speak(`Indicateur ${indicateur.nom}: ${data.count || data.results.length} résultats trouvés.`);
        } else {
          speak(`Indicateur ${indicateur.nom} exécuté, aucun résultat.`);
        }
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', error: 'Erreur de connexion au serveur.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveIndicator = async () => {
    if (!newIndicatorName.trim() || !newIndicatorSql.trim()) {
      Alert.alert('Erreur', 'Le nom et la requête SQL sont obligatoires.');
      return;
    }
    setIsSavingIndicator(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_indicateur', user_id: user.id, base_id: selectedBase.base_id,
          nom: newIndicatorName.trim(), description: newIndicatorDesc.trim(), requete_sql: newIndicatorSql.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Indicateur sauvegardé avec succès.');
        speak(`Indicateur ${newIndicatorName} sauvegardé.`);
        setSaveIndicatorModalVisible(false);
        setNewIndicatorName(''); setNewIndicatorDesc(''); setNewIndicatorSql('');
        const resInd = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_indicateurs', user_id: user.id, base_id: selectedBase.base_id })
        });
        const dataInd = await resInd.json();
        if (dataInd.success) setIndicators(dataInd.indicateurs || []);
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de sauvegarder.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de sauvegarder l\'indicateur.');
    } finally {
      setIsSavingIndicator(false);
    }
  };

  const handleDeleteIndicator = (indicateur) => {
    if (isSpeaking) stopSpeaking();
    Alert.alert(
      'Supprimer l\'indicateur',
      `Voulez-vous vraiment supprimer "${indicateur.nom}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_indicateur', user_id: user.id, indicateur_id: indicateur.indicateur_id })
              });
              const data = await res.json();
              if (data.success) {
                setIndicators(prev => prev.filter(ind => ind.indicateur_id !== indicateur.indicateur_id));
                Alert.alert('Succès', 'Indicateur supprimé.');
              } else {
                Alert.alert('Erreur', data.error || 'Impossible de supprimer.');
              }
            } catch (e) {
              Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
            }
          }
        }
      ]
    );
  };

  const handleEdit = (index, content) => {
    if (isSpeaking) stopSpeaking();
    setInputText(content); setEditingIndex(index);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const cancelEdit = () => { setInputText(''); setEditingIndex(null); };

  // ================================================================
  // MODALS
  // ================================================================
  const renderForgotModal = () => (
    <Modal visible={forgotModalVisible} transparent animationType="fade" onRequestClose={closeForgotModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>🔑</Text></View>
            <Text style={styles.modalTitle}>Mot de passe oublié</Text>
            <Text style={styles.modalSubtitle}>Saisissez votre adresse email pour recevoir vos accès</Text>
          </View>
          {resetSuccess ? (
            <View style={styles.resetSuccessBox}>
              <Text style={styles.resetSuccessIcon}>✅</Text>
              <Text style={styles.resetSuccessText}>{resetMessage}</Text>
              <Text style={styles.resetSuccessHint}>Vérifiez votre boîte de réception et vos spams.</Text>
            </View>
          ) : (
            <View style={styles.modalBody}>
              <View style={styles.resetInputWrapper}>
                <Text style={styles.resetInputIcon}>📧</Text>
                <TextInput ref={resetEmailRef} style={styles.resetInput} placeholder="votre@email.com" placeholderTextColor="#94a3b8"
                  value={resetEmail} onChangeText={setResetEmail} keyboardType="email-address" autoCapitalize="none"
                  returnKeyType="send" onSubmitEditing={handleResetPassword} />
              </View>
              {resetMessage ? <View style={styles.resetErrorBox}><Text style={styles.resetErrorText}>⚠️ {resetMessage}</Text></View> : null}
              <TouchableOpacity style={[styles.resetButton, isResetting && { opacity: 0.6 }]} onPress={handleResetPassword} disabled={isResetting}>
                {isResetting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.resetButtonText}>Envoyer mes accès</Text>}
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={styles.modalCloseButton} onPress={closeForgotModal}>
            <Text style={styles.modalCloseText}>{resetSuccess ? 'Fermer' : 'Annuler'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderEditCredentialsModal = () => (
    <Modal visible={editCredentialsModalVisible} transparent animationType="fade" onRequestClose={() => setEditCredentialsModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxWidth: 400 }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>🔐</Text></View>
            <Text style={styles.modalTitle}>Modifier mes accès</Text>
            <Text style={styles.modalSubtitle}>Modifiez votre login et/ou mot de passe</Text>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.resetInputWrapper}>
              <Text style={styles.resetInputIcon}>👤</Text>
              <TextInput style={styles.resetInput} placeholder="Nouveau login *" placeholderTextColor="#94a3b8" value={newLogin} onChangeText={setNewLogin} autoCapitalize="none" />
            </View>
            <View style={styles.resetInputWrapper}>
              <Text style={styles.resetInputIcon}>🔒</Text>
              <TextInput style={[styles.resetInput, { flex: 1 }]} placeholder="Nouveau mot de passe" placeholderTextColor="#94a3b8" value={newPassword} onChangeText={setNewPassword} secureTextEntry={!showNewPassword} />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeButton}><Text style={styles.eyeText}>{showNewPassword ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <View style={styles.resetInputWrapper}>
              <Text style={styles.resetInputIcon}>✓</Text>
              <TextInput style={[styles.resetInput, { flex: 1 }]} placeholder="Confirmer le mot de passe" placeholderTextColor="#94a3b8" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirmPassword} />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}><Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <Text style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16, textAlign: 'center' }}>
              Laissez le mot de passe vide pour le conserver inchangé.
            </Text>
            <TouchableOpacity style={[styles.resetButton, isUpdatingCredentials && { opacity: 0.6 }]} onPress={handleUpdateCredentials} disabled={isUpdatingCredentials}>
              {isUpdatingCredentials ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.resetButtonText}>💾 Mettre à jour</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditCredentialsModalVisible(false)}>
            <Text style={styles.modalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSaveIndicatorModal = () => (
    <Modal visible={saveIndicatorModalVisible} transparent animationType="fade" onRequestClose={() => setSaveIndicatorModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}><Text style={styles.modalIcon}>💾</Text></View>
            <Text style={styles.modalTitle}>Sauvegarder l'indicateur</Text>
            <Text style={styles.modalSubtitle}>Donnez un nom et une description à cette requête</Text>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.resetInputWrapper}>
              <Text style={styles.resetInputIcon}>📝</Text>
              <TextInput style={styles.resetInput} placeholder="Nom de l'indicateur *" placeholderTextColor="#94a3b8" value={newIndicatorName} onChangeText={setNewIndicatorName} autoCapitalize="none" />
            </View>
            <View style={[styles.resetInputWrapper, { alignItems: 'flex-start', paddingVertical: 10 }]}>
              <Text style={{ fontSize: 14, marginRight: 10 }}>📄</Text>
              <TextInput style={[styles.resetInput, { minHeight: 70, textAlignVertical: 'top' }]} placeholder="Description (optionnel)" placeholderTextColor="#94a3b8" value={newIndicatorDesc} onChangeText={setNewIndicatorDesc} multiline numberOfLines={3} />
            </View>
            <View style={styles.sqlPreviewBox}>
              <Text style={styles.sqlPreviewLabel}>Requête SQL :</Text>
              <ScrollView style={{ maxHeight: 100 }} nestedScrollEnabled>
                <Text style={styles.sqlPreviewText} selectable>{newIndicatorSql}</Text>
              </ScrollView>
            </View>
            <TouchableOpacity style={[styles.resetButton, { marginTop: 16 }, isSavingIndicator && { opacity: 0.6 }]} onPress={handleSaveIndicator} disabled={isSavingIndicator}>
              {isSavingIndicator ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.resetButtonText}>💾 Sauvegarder</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSaveIndicatorModalVisible(false)}>
            <Text style={styles.modalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderThresholdModal = () => (
    <Modal visible={thresholdModalVisible} transparent animationType="fade" onRequestClose={() => setThresholdModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalIconWrapper}>
              <Text style={styles.modalIcon}>🔔</Text>
            </View>
            <Text style={styles.modalTitle}>Configurer une alerte</Text>
            <Text style={styles.modalSubtitle}>{currentThresholdIndicator?.name}</Text>
          </View>
          <View style={styles.modalBody}>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={[styles.resetInputWrapper, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.resetInputIcon}>📉</Text>
                <TextInput style={styles.resetInput} placeholder="Seuil Min" keyboardType="numeric" value={tempMin} onChangeText={setTempMin} />
              </View>
              <View style={[styles.resetInputWrapper, { flex: 1, marginBottom: 0 }]}>
                <Text style={styles.resetInputIcon}>📈</Text>
                <TextInput style={styles.resetInput} placeholder="Seuil Max" keyboardType="numeric" value={tempMax} onChangeText={setTempMax} />
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 16 }}>
              Laissez un champ vide pour ignorer ce seuil.
            </Text>
            <TouchableOpacity style={[styles.resetButton, { marginTop: 8 }]} onPress={saveThreshold}>
              <Text style={styles.resetButtonText}>💾 Sauvegarder les seuils</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setThresholdModalVisible(false)}>
            <Text style={styles.modalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderAlertModal = () => (
    <Modal visible={alertModalVisible} transparent animationType="fade" onRequestClose={() => setAlertModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { maxWidth: 420 }]}>
          <View style={[styles.modalHeader, { backgroundColor: '#fef3c7', borderRadius: 20 }]}>
            <Text style={styles.modalTitle}>🔔 Alertes indicateurs</Text>
          </View>
          <View style={styles.modalBody}>
            {alerts.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#64748b', paddingVertical: 20 }}>✅ Aucune alerte active</Text>
            ) : (
              alerts.map((alert, idx) => (
                <View key={idx} style={styles.alertItem}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.alertIndicatorName}>📊 {alert.indicator}</Text>
                    <TouchableOpacity onPress={() => removeAlert(idx)}>
                      <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.alertIndicatorValue}>{alert.value}</Text>
                  <Text style={styles.alertIndicatorThreshold}>
                    Seuil {alert.type === 'min' ? 'minimum' : 'maximum'} : {alert.threshold} • {alert.time}
                  </Text>
                </View>
              ))
            )}
          </View>
          <TouchableOpacity style={styles.modalCloseButton} onPress={() => setAlertModalVisible(false)}>
            <Text style={styles.modalCloseText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderSidebar = () => (
    <Modal visible={isSidebarVisible} transparent animationType="slide" onRequestClose={() => setIsSidebarVisible(false)}>
      <View style={styles.sidebarOverlay}>
        <View style={styles.sidebarContainer}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>📊 Indicateurs</Text>
            <TouchableOpacity onPress={() => setIsSidebarVisible(false)}><Text style={styles.sidebarClose}>✕</Text></TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Rechercher..." value={searchQuery} onChangeText={setSearchQuery} />
          </View>
          <FlatList
            data={indicators.filter(ind => ind.nom.toLowerCase().includes(searchQuery.toLowerCase()) || (ind.description && ind.description.toLowerCase().includes(searchQuery.toLowerCase())))}
            keyExtractor={(item) => item.indicateur_id.toString()}
            renderItem={({ item }) => (
              <View style={styles.indicatorItem}>
                <TouchableOpacity style={styles.indicatorContent} onPress={() => handleExecuteIndicator(item)} activeOpacity={0.7}>
                  <Text style={styles.indicatorName} numberOfLines={1}>📊 {item.nom}</Text>
                  <Text style={styles.indicatorDesc} numberOfLines={2}>{item.description || 'Aucune description'}</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity style={[styles.deleteIndicatorButton, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]} onPress={() => openThresholdModal(item.indicateur_id, item.nom)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={{ fontSize: 16 }}>🔔</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteIndicatorButton} onPress={() => handleDeleteIndicator(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Text style={styles.deleteIndicatorIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptySidebarText}>Aucun indicateur trouvé.</Text>}
          />
        </View>
      </View>
    </Modal>
  );

  // ================================================================
  // RENDU : ÉCRAN DE CONNEXION
  // ================================================================
  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <KeyboardAvoidingView style={styles.loginContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.loginIconWrapper}>
            <Text style={styles.loginIconText}>E</Text>
          </View>
          <Text style={styles.loginTitle}>Eric IA</Text>
          <Text style={styles.loginSubtitle}>Connectez-vous pour accéder à vos bases de données</Text>
          <View style={styles.loginForm}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput style={styles.loginInput} placeholder="Utilisateur" placeholderTextColor="#94a3b8" value={loginInput} onChangeText={setLoginInput} autoCapitalize="none" returnKeyType="next" />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput style={[styles.loginInput, { flex: 1 }]} placeholder="Mot de passe" placeholderTextColor="#94a3b8" value={mdpInput} onChangeText={setMdpInput} secureTextEntry={!showPassword} returnKeyType="done" onSubmitEditing={handleLogin} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}><Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.loginButton, isLoggingIn && { opacity: 0.6 }]} onPress={handleLogin} disabled={isLoggingIn}>
              {isLoggingIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Se connecter</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.forgotButton} onPress={openForgotModal}><Text style={styles.forgotButtonText}>Mot de passe oublié ?</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        {renderForgotModal()}
      </SafeAreaView>
    );
  }

  // ================================================================
  // RENDU : LISTE DES BASES
  // ================================================================
  if (!selectedBase) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>Eric</Text>
            <Text style={styles.headerUser}>👤 {user?.nom}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { if(isSpeaking) { stopSpeaking(); } else { setAutoSpeak(!autoSpeak); if(!autoSpeak) speak("Voix activée"); } }} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: autoSpeak ? '#ede9fe' : '#f1f5f9' }]}>
              <Text style={styles.logoutTextSmall}>{autoSpeak ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setGestionnaireModalVisible(true)} 
              style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#fef3c7' }]}
            >
              <Text style={styles.logoutTextSmall}>🗄️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#fef2f2' }]}>
              <Text style={styles.logoutText}>🔓</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {activeTab === 'bases' && (
            <View style={styles.basesContainer}>
              <Text style={styles.basesTitle}>📂 Bases de données</Text>
              <Text style={styles.basesSubtitle}>{bases.length} base(s) active(s) • Sélectionnez pour interroger</Text>
              {isLoadingBases ? (
                <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#6c63ff" /><Text style={styles.loadingText}>Chargement...</Text></View>
              ) : bases.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>🗄️</Text>
                  <Text style={styles.noBasesText}>Aucune base de données active associée à votre compte.</Text>
                  <TouchableOpacity style={styles.refreshButton} onPress={() => fetchBases(user.id, true)}><Text style={styles.refreshButtonText}>🔄 Actualiser</Text></TouchableOpacity>
                </View>
              ) : (
                <FlatList data={bases} keyExtractor={(item) => item.acces_id || item.base_id} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBases(user.id, true)} colors={['#6c63ff']} />}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.baseCard} onPress={() => selectBase(item)} activeOpacity={0.7}>
                      <View style={styles.baseCardHeader}>
                        <View style={styles.baseIconWrapper}><Text style={styles.baseIconText}>🗄️</Text></View>
                        <View style={styles.baseInfo}>
                          <Text style={styles.baseName} numberOfLines={1}>{item.nom_base}</Text>
                          <Text style={styles.baseHost} numberOfLines={1}>🌐 {item.hote}</Text>
                        </View>
                        <View style={styles.baseStatusBadge}><Text style={styles.baseStatusText}>● {item.statut}</Text></View>
                      </View>
                      <View style={styles.baseTablesSection}>
                        {item.all_tables ? (
                          <><Text style={styles.baseTablesLabel}>📋 Accès complet</Text><Text style={styles.baseTablesAll}>🌐 Toutes les tables de la base sont autorisées</Text></>
                        ) : (
                          <><Text style={styles.baseTablesLabel}>📋 {item.tables_list?.length || 0} table(s) autorisée(s)</Text><Text style={styles.baseTables} numberOfLines={2}>{item.tables_list?.join(', ') || 'Aucune table configurée'}</Text></>
                        )}
                      </View>
                      <View style={styles.baseCardFooter}><Text style={styles.baseAction}>Interroger cette base →</Text></View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'bases' && styles.tabItemActive]}
            onPress={() => setActiveTab('bases')}
          >
            <Text style={[styles.tabIcon, activeTab === 'bases' && styles.tabIconActive]}>🗄️</Text>
            <Text style={[styles.tabLabel, activeTab === 'bases' && styles.tabLabelActive]}>Bases</Text>
          </TouchableOpacity>
        </View>

        <GestionnaireModal 
          user={user}
          visible={gestionnaireModalVisible}
          onClose={() => setGestionnaireModalVisible(false)}
        />
      </SafeAreaView>
    );
  }

  // ================================================================
  // RENDU : CHAT
  // ================================================================
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelectedBase(null); setMessages([]); setIndicators([]); }} style={styles.backButton}>
            <Text style={styles.backText}>← Bases</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { if(isSpeaking) { stopSpeaking(); } else { setAutoSpeak(!autoSpeak); if(!autoSpeak) speak("Voix activée"); } }} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: autoSpeak ? '#ede9fe' : '#f1f5f9' }]}>
              <Text style={styles.logoutTextSmall}>{autoSpeak ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
            {isSpeaking && (
              <TouchableOpacity onPress={stopSpeaking} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#fef2f2' }]}>
                <Text style={styles.logoutTextSmall}>⏹</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={() => setAlertModalVisible(true)} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#fef3c7' }]}>
              <Text style={styles.logoutTextSmall}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setIsSidebarVisible(true)} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#f0f9ff' }]}>
              <Text style={styles.logoutTextSmall}>📊</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSurveillanceModalVisible(true)} style={[styles.logoutButtonSmall, { marginRight: 4, backgroundColor: '#f0f9ff' }]}>
              <Text style={styles.logoutTextSmall}>🗄️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openEditCredentialsModal} style={styles.logoutButtonSmall}>
              <Text style={styles.logoutTextSmall}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView style={styles.chatArea} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 10}>
          <FlatList ref={flatListRef} data={messages} keyExtractor={(_, i) => i.toString()} renderItem={renderMessage} contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            windowSize={7}
            initialNumToRender={8}
            updateCellsBatchingPeriod={50}
            ListEmptyComponent={
              <View style={styles.welcome}>
                <View style={styles.welcomeIcon}><Text style={styles.welcomeIconText}>E</Text></View>
                <Text style={styles.welcomeTitle}>Bonjour, je suis Eric</Text>
                <Text style={styles.welcomeText}>Votre assistant IA connecté à votre base de données.{'\n'}Base : {selectedBase.nom_base}</Text>
                <View style={styles.welcomeTables}>
                  <Text style={styles.welcomeTablesTitle}>Tables disponibles :</Text>
                  {selectedBase.all_tables ? (
                    <Text style={styles.welcomeTablesList}>🌐 Toutes les tables de la base "{selectedBase.nom_base}"</Text>
                  ) : (
                    <Text style={styles.welcomeTablesList}>{selectedBase.tables_list?.join(', ')}</Text>
                  )}
                </View>
              </View>
            }
          />
          {isLoading && (
            <View style={styles.loadingRow}>
              <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
              <ActivityIndicator color="#6c63ff" size="small" />
              <Text style={styles.loadingText}>Eric traite votre demande...</Text>
            </View>
          )}
          {isSpeaking && (
            <View style={styles.speakingRow}>
              <Text style={styles.speakingText}>🔊 Eric parle...</Text>
              <TouchableOpacity onPress={stopSpeaking}><Text style={styles.stopText}>Arrêter</Text></TouchableOpacity>
            </View>
          )}
          <View style={styles.inputArea}>
            {editingIndex !== null && (
              <View style={styles.editingBanner}>
                <Text style={styles.editingText}>✏️ Modification de la question</Text>
                <TouchableOpacity onPress={cancelEdit}><Text style={styles.cancelEditText}>✕ Annuler</Text></TouchableOpacity>
              </View>
            )}
            <View style={styles.inputBar}>
              <TextInput ref={inputRef} style={styles.input} placeholder="Posez votre question..." placeholderTextColor="#94a3b8" value={inputText} onChangeText={setInputText} multiline maxLength={1000} />
              <TouchableOpacity onPress={toggleVoiceRecognition} style={[styles.voiceButton, recognizing && styles.voiceButtonActive]}>
                <Text style={[styles.voiceButtonText, recognizing && { color: '#fff' }]}>{recognizing ? '🎙️' : '🎤'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sendButton, inputText.trim() && !isLoading ? styles.sendButtonActive : null]} onPress={handleSend} disabled={!inputText.trim() || isLoading}>
                <Text style={[styles.sendButtonText, inputText.trim() && !isLoading ? { color: '#fff' } : null]}>{editingIndex !== null ? '✓' : '➤'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.disclaimer}>🔒 Eric peut faire des erreurs. Vérifiez les informations importantes.</Text>
          </View>
        </KeyboardAvoidingView>
      </>

      {renderSidebar()}
      {renderSaveIndicatorModal()}
      {renderAlertModal()}
      {renderThresholdModal()}
      {renderEditCredentialsModal()}
      
      <SurveillanceModal
        visible={surveillanceModalVisible}
        onClose={() => setSurveillanceModalVisible(false)}
        user={user}
        selectedBase={selectedBase}
        onSpeak={speak}
        onAddMessage={addMonitoringMessage}
      />
    </SafeAreaView>
  );
}

// ================================================================
// COMPOSANT : MESSAGE IA (AVEC WEBVIEWS INTÉGRÉES)
// ================================================================
const AiMessage = React.memo(({ item, onSaveIndicator, onSpeak }) => {
  const [showSql, setShowSql] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);
  useEffect(() => { setDisplayLimit(10); }, [item?.sql, item?.count]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);

  const normalizeUrl = (raw) => {
    if (!raw) return '';
    let url = String(raw).trim();
    url = url.replace(/^["']|["']$/g, '');
    if (!/^https?:\/\//i.test(url)) return url;

    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').map(seg => {
        if (!seg) return '';
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch (e) {
          return encodeURIComponent(seg);
        }
      });
      u.pathname = parts.join('/');
      return u.toString();
    } catch (e) {
      try {
        const m = url.match(/^(https?:\/\/)([^/?#]+)(.*)$/i);
        if (!m) return encodeURI(url);
        const origin = m[1] + m[2];
        let rest = m[3] || '';
        let path = rest;
        let query = '';
        let hash = '';
        const hashIdx = path.indexOf('#');
        if (hashIdx >= 0) {
          hash = path.slice(hashIdx);
          path = path.slice(0, hashIdx);
        }
        const queryIdx = path.indexOf('?');
        if (queryIdx >= 0) {
          query = path.slice(queryIdx);
          path = path.slice(0, queryIdx);
        }
        const encodedPath = path.split('/').map(seg => {
          if (!seg) return '';
          try {
            return encodeURIComponent(decodeURIComponent(seg));
          } catch (err) {
            return encodeURIComponent(seg);
          }
        }).join('/');
        return origin + encodedPath + query + hash;
      } catch (err2) {
        return encodeURI(url);
      }
    }
  };

  const isValidUrl = (url) => {
    if (!url) return false;
    const trimmed = String(url).trim();
    if (!(trimmed.startsWith('http://') || trimmed.startsWith('https://'))) return false;
    try {
      new URL(trimmed);
      return true;
    } catch (e) {
      try {
        new URL(normalizeUrl(trimmed));
        return true;
      } catch (e2) {
        return /^https?:\/\/.+\..+/i.test(trimmed);
      }
    }
  };

  const getSafeUrl = (url) => {
    if (!url) return 'about:blank';
    const normalized = normalizeUrl(url);
    return normalized || 'about:blank';
  };

  const extractUrlsFromString = (str) => {
    if (!str) return [];
    const s = String(str).trim();
    if (/^https?:\/\//i.test(s) && !s.includes('\n')) {
      if (!/[,;|]/.test(s)) {
        return [s.replace(/[,;:!?)]+$/, '')];
      }
    }
    const urlRegex = /(https?:\/\/[^\s,;|"'<>]+)/gi;
    const matches = s.match(urlRegex) || [];
    return matches
      .map(u => u.replace(/[,;:!?)]+$/, '').replace(/\.$/, ''))
      .filter(u => u.length > 10);
  };

  const detectMediaType = (url) => {
    const full = String(url).toLowerCase().trim();

    const docMatch = full.match(/\.(pdf|docx?|xlsx?|pptx?|txt|csv|json|xml|zip|rar|7z|odt|ods|odp|rtf)(?:[?#&/]|$)/i);
    if (docMatch) {
      return { kind: 'document', ext: docMatch[1].toLowerCase() };
    }
    const docEnd = full.match(/\.(pdf|docx?|xlsx?|pptx?|txt|csv|json|xml|zip|rar|7z)\/?\s*$/i);
    if (docEnd) {
      return { kind: 'document', ext: docEnd[1].toLowerCase() };
    }
    if (/drive\.google\.com\/file|docs\.google\.com\/(document|spreadsheets|presentation)|dropbox\.com\/s\/|onedrive\.|sharepoint\./i.test(full)) {
      return { kind: 'document', ext: 'pdf' };
    }

    const imgMatch = full.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(?:[?#&/]|$)/i);
    if (imgMatch) return { kind: 'image', ext: imgMatch[1].toLowerCase() };

    const vidMatch = full.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp)(?:[?#&/]|$)/i);
    if (vidMatch) return { kind: 'video', ext: vidMatch[1].toLowerCase() };

    if (/\.(html?|php|aspx?)(?:[?#&/]|$)/i.test(full)) {
      return { kind: 'page', ext: 'html' };
    }

    return { kind: null, ext: null };
  };

  const extractMedia = (results) => {
    if (!results || results.length === 0) return { images: [], videos: [], documents: [], pages: [], coordinates: [] };
    const scanRows = results.length > 200 ? results.slice(0, 200) : results;

    const images = [];
    const videos = [];
    const documents = [];
    const pages = [];
    const coordinates = [];
    const seen = new Set();

    const youtubePattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i;

    scanRows.forEach((row, rowIdx) => {
      let lat = null, lon = null;
      Object.entries(row).forEach(([key, value]) => {
        if (!value && value !== 0) return;
        const keyLower = key.toLowerCase();
        const strValue = String(value);

        if ((keyLower.includes('latitude') || keyLower === 'lat' || keyLower.endsWith('_lat')) && !isNaN(parseFloat(strValue))) {
          lat = parseFloat(strValue);
        }
        if ((keyLower.includes('longitude') || keyLower === 'lon' || keyLower === 'lng' || keyLower.endsWith('_lon') || keyLower.endsWith('_lng')) && !isNaN(parseFloat(strValue))) {
          lon = parseFloat(strValue);
        }
      });
      if (lat !== null && lon !== null && !isNaN(lat) && !isNaN(lon)) {
        coordinates.push({
          lat, lon,
          name: row.nom || row.name || row.titre || row.title || `Point ${coordinates.length + 1}`,
          rowIndex: rowIdx, raw: row
        });
      }

      Object.entries(row).forEach(([key, value]) => {
        if (!value) return;
        const strValue = String(value);
        let urls = extractUrlsFromString(strValue);
        const dataImage = strValue.match(/^data:image\/[a-zA-Z]+;base64,/);
        const dataVideo = strValue.match(/^data:video\/[a-zA-Z]+;base64,/);
        const dataApp = strValue.match(/^data:application\/[a-zA-Z]+;base64,/);

        if (dataImage) {
          images.push({ uri: strValue.trim(), name: row.nom || row.name || `Image ${images.length + 1}`, key, rowIndex: rowIdx });
          return;
        }
        if (dataVideo) {
          videos.push({ uri: strValue.trim(), name: row.nom || row.name || `Vidéo ${videos.length + 1}`, key, rowIndex: rowIdx, isYouTube: false });
          return;
        }
        if (dataApp) {
          documents.push({ uri: strValue.trim(), name: row.nom || row.name || `Document ${documents.length + 1}`, key, rowIndex: rowIdx, type: 'fichier' });
          return;
        }

        if (urls.length === 0 && /^https?:\/\//i.test(strValue.trim())) {
          urls = [strValue.trim().replace(/[,;:!?)]+$/, '')];
        }

        if (urls.length === 0) {
          const trimmedVal = strValue.trim();
          if (/\.(pdf|docx?|xlsx?|pptx?|txt|csv|json|xml|zip|rar|7z)(\?.*)?$/i.test(trimmedVal)) {
            urls = [trimmedVal];
          }
        }

        const directDocLinks = String(strValue).match(/https?:\/\/[^\s,;|"'<>]+\.(?:pdf|docx?|xlsx?|pptx?|txt|csv|json|xml|zip|rar|7z)(?:[?#][^\s,;|"'<>]*)?/gi);
        if (directDocLinks) {
          directDocLinks.forEach(u => {
            if (!urls.includes(u)) urls.push(u);
          });
        }

        urls.forEach(url => {
          let trimmed = String(url).trim().replace(/[,;:!?)]+$/, '');
          if (!trimmed) return;
          if (!isValidUrl(trimmed) && !trimmed.startsWith('data:') && !trimmed.startsWith('/')) return;
          if (seen.has(trimmed)) return;
          seen.add(trimmed);

          if (youtubePattern.test(trimmed)) {
            videos.push({ uri: trimmed, name: row.nom || row.name || `Vidéo ${videos.length + 1}`, key, rowIndex: rowIdx, isYouTube: true });
            return;
          }

          const detected = detectMediaType(trimmed);

          if (detected.kind === 'image') {
            images.push({ uri: trimmed, name: row.nom || row.name || `Image ${images.length + 1}`, key, rowIndex: rowIdx });
            return;
          }
          if (detected.kind === 'video') {
            videos.push({ uri: trimmed, name: row.nom || row.name || `Vidéo ${videos.length + 1}`, key, rowIndex: rowIdx, isYouTube: false });
            return;
          }
          if (detected.kind === 'document') {
            documents.push({ uri: trimmed, name: row.nom || row.name || `Document ${documents.length + 1}`, key, rowIndex: rowIdx, type: detected.ext || 'fichier' });
            return;
          }
          if (detected.kind === 'page' || isValidUrl(trimmed)) {
            pages.push({ uri: trimmed, name: row.nom || row.name || `Page ${pages.length + 1}`, key, rowIndex: rowIdx });
          }
        });
      });
    });

    return { images, videos, documents, pages, coordinates };
  };

  const getChartData = (results) => {
    if (!results || results.length === 0) return null;
    const keys = Object.keys(results[0]);
    if (keys.length < 2) return null;
    let labelKey = null;
    let valueKey = null;
    const datePatterns = ['annee', 'year', 'date', 'mois', 'month', 'jour', 'day', 'trimestre', 'quarter'];
    const numericPatterns = ['nombre', 'count', 'total', 'sum', 'quantite', 'quantity', 'montant', 'amount', 'prix', 'price', 'valeur', 'value'];

    for (const key of keys) {
      const keyLower = key.toLowerCase();
      const val = results[0][key];
      const isNumeric = !isNaN(parseFloat(val)) && isFinite(val);
      const isDateLike = datePatterns.some(pattern => keyLower.includes(pattern));
      const isNumericLike = numericPatterns.some(pattern => keyLower.includes(pattern));
      if (isDateLike && !labelKey) {
        labelKey = key;
      } else if (isNumeric && isNumericLike && !valueKey) {
        valueKey = key;
      } else if (isNumeric && !valueKey && !labelKey) {
        valueKey = key;
      } else if (!isNumeric && !labelKey) {
        labelKey = key;
      }
    }
    if (!labelKey) {
      labelKey = keys.find(k => isNaN(parseFloat(results[0][k]))) || keys[0];
    }
    if (!valueKey) {
      valueKey = keys.find(k => !isNaN(parseFloat(results[0][k]))) || keys[1];
    }
    if (!valueKey || !labelKey) return null;
    if (isNaN(parseFloat(results[0][valueKey]))) return null;
    const chartRows = results.length > 80 ? results.slice(0, 80) : results;
    const isLikelyRawData = keys.length > 2;
    const colors = ['#6c63ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];
    return {
      labelKey,
      valueKey,
      isLikelyRawData,
      data: chartRows.map((row, index) => {
        const numVal = parseFloat(row[valueKey]) || 0;
        const strLabel = String(row[labelKey] || 'N/A').substring(0, 20);
        return {
          value: numVal, label: strLabel, x: strLabel,
          frontColor: colors[index % colors.length],
          color: colors[index % colors.length],
          text: strLabel
        };
      })
    };
  };

  const media = extractMedia(item.results);
  const chartData = item.results ? getChartData(item.results) : null;
  const hasCoordinates = media.coordinates && media.coordinates.length > 0;
  const canRenderChart = !!chartData && item.results && item.results.length > 0 && !chartData.isLikelyRawData && !hasCoordinates;

  const renderChart = (isExpanded = false) => {
    if (!chartData) return null;
    const width = isExpanded ? SCREEN_WIDTH - 60 : CHART_WIDTH;
    const height = isExpanded ? 400 : 220;

    if (viewMode === 'bar') {
      return <BarChart data={chartData.data} width={width} height={height} barWidth={isExpanded ? 30 : 24} spacing={isExpanded ? 30 : 24} roundedTop roundedBottom hideRules={false} rulesLength={width - 60} yAxisLabelWidth={isExpanded ? 60 : 45} yAxisTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]} xAxisLabelTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]} color="#6c63ff" noOfSections={5} showValuesAsTopLabel topLabelTextStyle={{ fontSize: isExpanded ? 12 : 11, color: '#64748b', fontWeight: 'bold' }} />;
    }
    if (viewMode === 'line') {
      return <LineChart data={chartData.data} width={width} height={height} color="#6c63ff" thickness={isExpanded ? 4 : 3} hideDataPoints={false} dataPointsColor="#fff" dataPointsRadius={isExpanded ? 6 : 5} spacing={isExpanded ? 30 : 24} hideRules={false} rulesLength={width - 60} yAxisLabelWidth={isExpanded ? 60 : 45} yAxisTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]} xAxisLabelTextStyle={[styles.chartAxisText, isExpanded && { fontSize: 12 }]} areaChart startFillColor="rgba(108, 99, 255, 0.2)" endFillColor="rgba(108, 99, 255, 0.0)" noOfSections={5} isAnimated />;
    }
    if (viewMode === 'pie') {
      return (
        <View style={{ alignItems: 'center' }}>
          <PieChart data={chartData.data} donut innerRadius={isExpanded ? 60 : 40} radius={isExpanded ? 140 : 90} showText textColor="#ffffff" textSize={isExpanded ? 14 : 12} showTextBackground textBackgroundColor="#000000" textBackgroundRadius={isExpanded ? 26 : 22} centerLabelComponent={() => (<View style={styles.pieCenterLabel}><Text style={[styles.pieCenterText, isExpanded && { fontSize: 14 }]}>Total</Text><Text style={[styles.pieCenterValue, isExpanded && { fontSize: 22 }]}>{chartData.data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}</Text></View>)} />
          <View style={[styles.pieLegend, isExpanded && { marginTop: 24 }]}>
            {chartData.data.map((item, idx) => (<View key={idx} style={[styles.legendItem, isExpanded && { width: '33%' }]}><View style={[styles.legendColor, { backgroundColor: item.color }]} /><Text style={[styles.legendText, isExpanded && { fontSize: 13 }]} numberOfLines={1}>{item.text}: {item.value}</Text></View>))}
          </View>
        </View>
      );
    }
    return null;
  };

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return url;
    let id = null;
    const m1 = url.match(/[?&]v=([^&]+)/);
    const m2 = url.match(/youtu\.be\/([^?&]+)/);
    const m3 = url.match(/youtube\.com\/embed\/([^?&]+)/);
    if (m1) id = m1[1];
    else if (m2) id = m2[1];
    else if (m3) id = m3[1];
    if (id) return `https://www.youtube.com/embed/${id}?playsinline=1&rel=0`;
    return url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/');
  };

  const renderMapContent = () => {
    if (!media.coordinates || media.coordinates.length === 0) {
      return <View style={styles.noMediaBox}><Text style={styles.noMediaText}>Aucun point de localisation trouvé</Text></View>;
    }

    const points = media.coordinates;
    const centerLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
    const centerLon = points.reduce((s, p) => s + p.lon, 0) / points.length;
    const markersHtml = points.map((p) =>
      `L.marker([${p.lat}, ${p.lon}]).addTo(map).bindPopup(${JSON.stringify(String(p.name))});`
    ).join('\n');

    const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map').setView([${centerLat}, ${centerLon}], ${points.length === 1 ? 14 : 10});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    ${markersHtml}
    ${points.length > 1 ? `var group = new L.featureGroup([${points.map(p => `L.marker([${p.lat},${p.lon}])`).join(',')}]); map.fitBounds(group.getBounds().pad(0.2));` : ''}
  </script>
</body>
</html>`;

    return (
      <View style={{ flex: 1 }}>
        <View style={{ height: 320, borderRadius: 12, overflow: 'hidden', marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <WebView
            originWhitelist={['*']}
            source={{ html: mapHtml }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color="#6c63ff" />
              </View>
            )}
          />
        </View>
        <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled showsVerticalScrollIndicator>
          {points.map((p, idx) => (
            <View key={idx} style={styles.mediaCard}>
              <Text style={styles.mediaCardTitle}>📍 {p.name}</Text>
              <Text style={styles.mediaCardSub}>Lat: {p.lat.toFixed(6)} • Lon: {p.lon.toFixed(6)}</Text>
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => {
                  setSelectedMedia({
                    ...p, type: 'map', name: p.name,
                    uri: `https://www.openstreetmap.org/export/embed.html?bbox=${p.lon - 0.01}%2C${p.lat - 0.01}%2C${p.lon + 0.01}%2C${p.lat + 0.01}&layer=mapnik&marker=${p.lat}%2C${p.lon}`
                  });
                  setMediaModalVisible(true);
                }}
              >
                <Text style={styles.mediaButtonText}>Agrandir la carte</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const openMediaInApp = (mediaItem, type) => {
    setSelectedMedia({ ...mediaItem, type });
    setMediaModalVisible(true);
  };

  const renderMediaContent = () => {
    if (viewMode === 'images') {
      if (media.images.length === 0) {
        return <View style={styles.noMediaBox}><Text style={styles.noMediaText}>Aucune image trouvée</Text></View>;
      }
      return (
        <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 450 }} nestedScrollEnabled>
          <View style={styles.mediaGrid}>
            {media.images.map((img, idx) => (
              <TouchableOpacity key={idx} style={styles.mediaGridItem} onPress={() => openMediaInApp(img, 'image')}>
                <Image source={{ uri: img.uri }} style={styles.mediaGridThumb} resizeMode="cover" onError={() => {}} />
                <Text style={styles.mediaGridLabel} numberOfLines={1}>{img.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      );
    }

    if (viewMode === 'videos') {
      if (media.videos.length === 0) {
        return <View style={styles.noMediaBox}><Text style={styles.noMediaText}>Aucune vidéo trouvée</Text></View>;
      }
      return (
        <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 500 }} nestedScrollEnabled>
          {media.videos.map((vid, idx) => (
            <View key={idx} style={styles.mediaCard}>
              <Text style={styles.mediaCardTitle}>🎬 {vid.name}</Text>
              <Text style={styles.mediaCardSub}>{vid.isYouTube ? 'YouTube' : 'Vidéo'}</Text>
              <View style={{ height: 200, borderRadius: 8, overflow: 'hidden', marginTop: 8, backgroundColor: '#0f172a' }}>
                <WebView
                  source={{ uri: vid.isYouTube ? getYouTubeEmbedUrl(vid.uri) : vid.uri }}
                  style={{ flex: 1 }}
                  javaScriptEnabled
                  domStorageEnabled
                  allowsFullscreenVideo
                  mediaPlaybackRequiresUserAction={false}
                  allowsInlineMediaPlayback
                  originWhitelist={['*']}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
                      <ActivityIndicator color="#6c63ff" />
                    </View>
                  )}
                />
              </View>
              <TouchableOpacity style={[styles.mediaButton, { marginTop: 8 }]} onPress={() => openMediaInApp(vid, 'video')}>
                <Text style={styles.mediaButtonText}>Plein écran</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      );
    }

    if (viewMode === 'documents') {
      if (media.documents.length === 0) {
        return <View style={styles.noMediaBox}><Text style={styles.noMediaText}>Aucun document trouvé</Text></View>;
      }
      return (
        <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 500 }} nestedScrollEnabled>
          {media.documents.map((doc, idx) => {
            let uri = String(doc.uri || '').trim();
            try { uri = encodeURI(decodeURI(uri)); } catch (e) { uri = encodeURI(uri); }
            const isPdf = /\.pdf/i.test(uri);
            const viewerUri = isPdf ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}` : uri;
            return (
              <View key={idx} style={styles.mediaCard}>
                <Text style={styles.mediaCardTitle}>📄 {doc.name}</Text>
                <View style={{ height: 300, borderRadius: 8, overflow: 'hidden', marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
                  <WebView
                    source={{ uri: viewerUri }}
                    style={{ flex: 1 }}
                    javaScriptEnabled
                    domStorageEnabled
                    originWhitelist={['*']}
                    startInLoadingState
                    renderLoading={() => (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator color="#6c63ff" />
                      </View>
                    )}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      );
    }

    if (viewMode === 'pages') {
      if (media.pages.length === 0) {
        return <View style={styles.noMediaBox}><Text style={styles.noMediaText}>Aucune page trouvée</Text></View>;
      }
      return (
        <ScrollView showsVerticalScrollIndicator style={{ maxHeight: 500 }} nestedScrollEnabled>
          {media.pages.map((page, idx) => {
            let uri = String(page.uri || '').trim();
            try { uri = encodeURI(decodeURI(uri)); } catch (e) { uri = encodeURI(uri); }
            return (
              <View key={idx} style={styles.mediaCard}>
                <Text style={styles.mediaCardTitle}>🌐 {page.name}</Text>
                <View style={{ height: 320, borderRadius: 8, overflow: 'hidden', marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
                  <WebView
                    source={{ uri }}
                    style={{ flex: 1 }}
                    javaScriptEnabled
                    domStorageEnabled
                    originWhitelist={['*']}
                    startInLoadingState
                    renderLoading={() => (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator color="#6c63ff" />
                      </View>
                    )}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      );
    }

    if (viewMode === 'map') {
      return renderMapContent();
    }

    return <View style={styles.noMediaBox}><Text style={styles.noMediaText}>Aucun contenu dans cet onglet</Text></View>;
  };

  let availableTabs = ['cards', 'table'];
  if (hasCoordinates) availableTabs.push('map');
  if (media.images.length > 0) availableTabs.push('images');
  if (media.videos.length > 0) availableTabs.push('videos');
  if (media.documents.length > 0) availableTabs.push('documents');
  if (media.pages.length > 0) availableTabs.push('pages');
  if (canRenderChart && !hasCoordinates) availableTabs.push('bar', 'line', 'pie');

  const tabLabels = {
    cards: '📋 Résultats',
    table: '📊 Tableau',
    map: `🗺️ Cartes${media.coordinates.length ? ` (${media.coordinates.length})` : ''}`,
    bar: '📶 Barres',
    line: '📈 Lignes',
    pie: '🥧 Camembert',
    images: `🖼 Images${media.images.length ? ` (${media.images.length})` : ''}`,
    videos: `🎬 Vidéos${media.videos.length ? ` (${media.videos.length})` : ''}`,
    documents: `📄 Documents${media.documents.length ? ` (${media.documents.length})` : ''}`,
    pages: `🌐 Pages${media.pages.length ? ` (${media.pages.length})` : ''}`
  };

  if (item.error) {
    return (
      <View style={styles.aiRow}>
        <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
        <View style={styles.aiContent}>
          <View style={styles.errorBox}><Text style={styles.errorText}>⚠️ {item.error}</Text></View>
          {item.sql && <View style={styles.sqlBlockError}><Text style={styles.sqlTextError} selectable>{item.sql}</Text></View>}
        </View>
      </View>
    );
  }

  if (item.content) {
    if (item.isAlert) {
      return (
        <View style={styles.aiRow}>
          <View style={[styles.aiIcon, { backgroundColor: '#ef4444' }]}><Text style={styles.aiIconText}>🚨</Text></View>
          <View style={[styles.aiContent, { backgroundColor: '#fef2f2', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' }]}>
            <Text style={{ fontSize: 14, color: '#b91c1c', lineHeight: 20 }} selectable>{item.content}</Text>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.aiRow}>
        <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
        <View style={[styles.aiContent, { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 }]}>
          <Text style={{ fontSize: 14, color: '#1e293b', lineHeight: 20 }} selectable>{item.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiRow}>
      <View style={styles.aiIcon}><Text style={styles.aiIconText}>E</Text></View>
      <View style={styles.aiContent}>
        {item.results && item.results.length > 0 ? (
          <View style={styles.resultsContainer}>
            <View style={styles.resultsHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {item.isIndicator && <Text style={{ marginRight: 6 }}>📊</Text>}
                <Text style={styles.resultsTitle} numberOfLines={1}>
                  {item.isIndicator ? `Indicateur : ${item.nom || 'Résultat'}` : '📊 Résultats'}
                </Text>
              </View>
              <View style={styles.resultsCountBadge}><Text style={styles.resultsCount}>{item.count || item.results.length} ligne(s)</Text></View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartTabsScroll}>
              <View style={styles.chartTabs}>
                {availableTabs.map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.chartTab, viewMode === mode && styles.chartTabActive]}
                    onPress={() => setViewMode(mode)}
                  >
                    <Text style={[styles.chartTabText, viewMode === mode && styles.chartTabTextActive]}>
                      {tabLabels[mode] || mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.resultsContent}>
              {viewMode === 'cards' && (
                <ScrollView showsVerticalScrollIndicator nestedScrollEnabled style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 16 }}>
                  {item.results.slice(0, displayLimit).map((row, idx) => (
                    <View key={idx} style={styles.resultCard}>
                      <View style={styles.resultCardHeader}>
                        <Text style={styles.resultCardIndex}>#{idx + 1}</Text>
                      </View>
                      {Object.entries(row).map(([key, value], i) => (
                        <View key={i} style={styles.resultRow}>
                          <Text style={styles.resultLabel} numberOfLines={1}>{key}</Text>
                          <Text style={styles.resultValue} selectable>{value === null || value === undefined ? 'NULL' : String(value)}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                  {displayLimit < item.results.length && (
                    <TouchableOpacity onPress={() => setDisplayLimit(displayLimit + 50)} style={styles.seeMoreButton}>
                      <Text style={styles.seeMoreText}>Voir plus ({item.results.length - displayLimit} lignes restantes)</Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}

              {viewMode === 'table' && item.results.length > 0 && (
                <ScrollView style={styles.tableWrapper} showsVerticalScrollIndicator nestedScrollEnabled>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    <View style={{ minWidth: '100%' }}>
                      <View style={styles.tableHeader}>
                        <View style={[styles.tableCell, styles.tableCellHeader, { width: 40 }]}>
                          <Text style={styles.tableHeaderText}>#</Text>
                        </View>
                        {Object.keys(item.results[0]).map((key, idx) => (
                          <View key={idx} style={[styles.tableCell, styles.tableCellHeader, { minWidth: 120 }]}>
                            <Text style={styles.tableHeaderText} numberOfLines={1}>{key}</Text>
                          </View>
                        ))}
                      </View>

                      {item.results.slice(0, displayLimit).map((row, rowIndex) => (
                        <View key={rowIndex} style={[styles.tableRow, rowIndex % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                          <View style={[styles.tableCell, { width: 40, justifyContent: 'center' }]}>
                            <Text style={styles.tableCellText}>{rowIndex + 1}</Text>
                          </View>
                          {Object.values(row).map((value, colIndex) => (
                            <View key={colIndex} style={[styles.tableCell, { minWidth: 120, justifyContent: 'center' }]}>
                              <Text style={styles.tableCellText} numberOfLines={2}>
                                {value === null || value === undefined ? 'NULL' : String(value)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ))}

                      {displayLimit < item.results.length && (
                        <TouchableOpacity onPress={() => setDisplayLimit(displayLimit + 50)} style={styles.seeMoreButton}>
                          <Text style={styles.seeMoreText}>Voir plus ({item.results.length - displayLimit} lignes restantes)</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>
                </ScrollView>
              )}

              {canRenderChart && (viewMode === 'bar' || viewMode === 'line' || viewMode === 'pie') && (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setIsChartExpanded(true)} style={styles.chartContainer}>
                  {renderChart(false)}
                  <View style={styles.zoomHint}><Text style={styles.zoomHintText}>🔍 Cliquer pour agrandir</Text></View>
                </TouchableOpacity>
              )}

              {(viewMode === 'images' || viewMode === 'videos' || viewMode === 'documents' || viewMode === 'pages' || viewMode === 'map') && renderMediaContent()}
            </View>
          </View>
        ) : (
          <View style={styles.noResultBox}><Text style={styles.aiText}>✅ Requête exécutée avec succès, mais aucun résultat trouvé.</Text></View>
        )}

        {item.sql && (
          <View style={styles.sqlActions}>
            <TouchableOpacity style={styles.sqlToggle} onPress={() => setShowSql(!showSql)}>
              <Text style={styles.sqlToggleText}>🔎 {showSql ? 'Masquer le SQL' : 'Voir le SQL généré'}</Text>
            </TouchableOpacity>
            {!item.isIndicator && (
              <TouchableOpacity style={styles.saveIndicatorButton} onPress={() => onSaveIndicator(item.sql)}>
                <Text style={styles.saveIndicatorButtonText}>💾 Sauvegarder</Text>
              </TouchableOpacity>
            )}
            {showSql && <View style={styles.sqlBlock}><Text style={styles.sqlText} selectable>{item.sql}</Text></View>}
          </View>
        )}
      </View>

      <Modal visible={mediaModalVisible} transparent animationType="fade" onRequestClose={() => setMediaModalVisible(false)}>
        <View style={styles.mediaModalOverlay}>
          <TouchableOpacity style={styles.mediaModalClose} onPress={() => setMediaModalVisible(false)}>
            <Text style={styles.mediaModalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedMedia && (
            <View style={[styles.mediaModalContent, { flex: 1, width: '100%', maxHeight: '90%' }]}>
              <Text style={styles.mediaModalTitle} numberOfLines={2}>{selectedMedia.name}</Text>
              {selectedMedia.type === 'image' && selectedMedia.uri ? (
                <Image source={{ uri: selectedMedia.uri }} style={[styles.mediaModalImage, { flex: 1, height: undefined }]} resizeMode="contain" />
              ) : selectedMedia.type === 'video' && selectedMedia.uri ? (
                <View style={{ flex: 1, width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#000' }}>
                  <WebView
                    source={{ uri: selectedMedia.isYouTube ? getYouTubeEmbedUrl(selectedMedia.uri) : selectedMedia.uri }}
                    style={{ flex: 1 }}
                    javaScriptEnabled
                    domStorageEnabled
                    allowsFullscreenVideo
                    mediaPlaybackRequiresUserAction={false}
                    allowsInlineMediaPlayback
                    originWhitelist={['*']}
                  />
                </View>
              ) : selectedMedia.uri ? (
                <View style={{ flex: 1, width: '100%', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff' }}>
                  <WebView
                    source={{ uri: getSafeUrl(selectedMedia.uri) }}
                    style={{ flex: 1 }}
                    javaScriptEnabled
                    domStorageEnabled
                    originWhitelist={['*']}
                    mixedContentMode="always"
                    startInLoadingState
                    scalesPageToFit
                    renderLoading={() => (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator color="#6c63ff" size="large" />
                      </View>
                    )}
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>
      </Modal>

      <Modal visible={isChartExpanded} transparent animationType="fade" onRequestClose={() => setIsChartExpanded(false)}>
        <View style={styles.expandedChartOverlay}>
          <View style={styles.expandedChartContainer}>
            <View style={styles.expandedChartHeader}>
              <Text style={styles.expandedChartTitle}>
                {viewMode === 'bar' ? '📶 Graphique en Barres' :
                 viewMode === 'line' ? '📈 Graphique en Lignes' :
                 viewMode === 'pie' ? '🥧 Graphique en Camembert' : '📊 Graphique'}
              </Text>
              <TouchableOpacity onPress={() => setIsChartExpanded(false)} style={styles.closeExpandedButton}>
                <Text style={styles.closeExpandedText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.expandedChartScroll} showsVerticalScrollIndicator>
              {renderChart(true)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
});

// ================================================================
// COMPOSANT INTÉGRÉ : GESTIONNAIRE DE BASES
// ================================================================
function GestionnaireModal({ user, onClose, visible }) {
  const [bases, setBases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBase, setSelectedBase] = useState(null);
  
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [baseToDelete, setBaseToDelete] = useState(null);
  
  const [formData, setFormData] = useState({
    base_id: '', hote: '', nom_base: '', utilisateur: '', mot_passe: '',
    bridge_url: '', bridge_token: '', mode_connexion: 'direct',
    api_key: '', url: '', tables: '', statut: 'actif'
  });
  
  const [editFormData, setEditFormData] = useState({
    base_id: '', hote: '', nom_base: '', utilisateur: '', mot_passe: '',
    bridge_url: '', bridge_token: '', mode_connexion: 'direct',
    api_key: '', url: '', tables: '', statut: 'actif'
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');
  const [filterStatut, setFilterStatut] = useState('all');
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);

  const speak = (text) => {
    if (!text || !autoSpeak) return;
    const cleanText = text.replace(/[*#_`]/g, '').substring(0, 4000);
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(cleanText, {
      language: 'fr-FR', rate: 1.0, pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const stopSpeaking = () => { Speech.stop(); setIsSpeaking(false); };

  useEffect(() => { if (visible) loadBases(); }, [visible]);

  const loadBases = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(GESTIONNAIRE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_bases', user_id: user.id })
      });
      const data = await res.json();
      if (data.success) setBases(data.bases || []);
      else Alert.alert('Erreur', data.error || 'Impossible de charger les bases');
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddBase = async () => {
    if (!formData.base_id.trim()) { Alert.alert('Erreur', 'L\'ID de la base est obligatoire.'); return; }
    if (!formData.nom_base.trim()) { Alert.alert('Erreur', 'Le nom de la base est obligatoire.'); return; }
    if (!formData.api_key.trim()) { Alert.alert('Erreur', 'La clé API est obligatoire.'); return; }
    
    if (formData.mode_connexion === 'direct') {
      if (!formData.hote.trim() || !formData.utilisateur.trim()) {
        Alert.alert('Erreur', 'Hôte et utilisateur sont obligatoires en mode direct.'); return;
      }
    } else {
      if (!formData.bridge_url.trim() || !formData.bridge_token.trim()) {
        Alert.alert('Erreur', 'URL et token du bridge sont obligatoires en mode bridge.'); return;
      }
    }

    setIsLoading(true);
    try {
      const payload = {
        action: 'add_base', user_id: user.id,
        base_id: formData.base_id.trim(), nom_base: formData.nom_base.trim(),
        hote: formData.mode_connexion === 'direct' ? formData.hote.trim() : '',
        utilisateur: formData.mode_connexion === 'direct' ? formData.utilisateur.trim() : '',
        mot_passe: formData.mode_connexion === 'direct' ? formData.mot_passe.trim() : '',
        bridge_url: formData.mode_connexion === 'bridge' ? formData.bridge_url.trim() : '',
        bridge_token: formData.mode_connexion === 'bridge' ? formData.bridge_token.trim() : '',
        mode_connexion: formData.mode_connexion,
        api_key: formData.api_key.trim(), url: formData.url.trim(),
        tables: formData.tables.trim(), statut: formData.statut
      };
      
      const res = await fetch(GESTIONNAIRE_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Base créée avec succès.');
        speak(`Base ${formData.nom_base} créée avec succès.`);
        setAddModalVisible(false);
        resetForm();
        loadBases();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de créer la base.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally { setIsLoading(false); }
  };

  const handleEditBase = async () => {
    if (!editFormData.base_id.trim()) { Alert.alert('Erreur', 'L\'ID de la base est obligatoire.'); return; }
    if (!editFormData.nom_base.trim()) { Alert.alert('Erreur', 'Le nom de la base est obligatoire.'); return; }
    if (!editFormData.api_key.trim()) { Alert.alert('Erreur', 'La clé API est obligatoire.'); return; }

    setIsLoading(true);
    try {
      const payload = {
        action: 'edit_base', user_id: user.id,
        original_base_id: selectedBase?.base_id,
        base_id: editFormData.base_id.trim(), nom_base: editFormData.nom_base.trim(),
        hote: editFormData.mode_connexion === 'direct' ? editFormData.hote.trim() : '',
        utilisateur: editFormData.mode_connexion === 'direct' ? editFormData.utilisateur.trim() : '',
        mot_passe: editFormData.mode_connexion === 'direct' ? editFormData.mot_passe.trim() : '',
        bridge_url: editFormData.mode_connexion === 'bridge' ? editFormData.bridge_url.trim() : '',
        bridge_token: editFormData.mode_connexion === 'bridge' ? editFormData.bridge_token.trim() : '',
        mode_connexion: editFormData.mode_connexion,
        api_key: editFormData.api_key.trim(), url: editFormData.url.trim(),
        tables: editFormData.tables.trim(), statut: editFormData.statut
      };
      
      const res = await fetch(GESTIONNAIRE_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Base modifiée avec succès.');
        speak(`Base ${editFormData.nom_base} modifiée avec succès.`);
        setEditModalVisible(false);
        loadBases();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de modifier la base.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally { setIsLoading(false); }
  };

  const handleDeleteBase = async () => {
    if (!baseToDelete) return;
    setIsLoading(true);
    try {
      const res = await fetch(GESTIONNAIRE_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_base', user_id: user.id, base_id: baseToDelete })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Succès', 'Base supprimée avec succès.');
        speak('Base supprimée avec succès.');
        setDeleteModalVisible(false);
        setBaseToDelete(null);
        loadBases();
      } else {
        Alert.alert('Erreur', data.error || 'Impossible de supprimer la base.');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', 'Impossible de communiquer avec le serveur.');
    } finally { setIsLoading(false); }
  };

  const resetForm = () => {
    setFormData({
      base_id: '', hote: '', nom_base: '', utilisateur: '', mot_passe: '',
      bridge_url: '', bridge_token: '', mode_connexion: 'direct',
      api_key: '', url: '', tables: '', statut: 'actif'
    });
  };

  const openEditModal = (base) => {
    setSelectedBase(base);
    const isBridge = base.bridge_url && base.bridge_url !== '';
    setEditFormData({
      base_id: base.base_id, hote: base.hote || '', nom_base: base.nom_base || '',
      utilisateur: base.utilisateur || '', mot_passe: '',
      bridge_url: base.bridge_url || '', bridge_token: base.bridge_token || '',
      mode_connexion: isBridge ? 'bridge' : 'direct',
      api_key: base.api_key || '', url: base.url || '',
      tables: base.tables || '', statut: base.statut || 'actif'
    });
    setEditModalVisible(true);
  };

  const openDeleteModal = (baseId) => {
    setBaseToDelete(baseId);
    setDeleteModalVisible(true);
  };

  const renderAddModal = () => (
    <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => { setAddModalVisible(false); resetForm(); }}>
      <KeyboardAvoidingView style={styles.gestionModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.gestionModalScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.gestionModalContainer}>
            <View style={styles.gestionModalHeader}>
              <View style={styles.gestionModalIconWrapper}><Text style={styles.gestionModalIcon}>➕</Text></View>
              <Text style={styles.gestionModalTitle}>Ajouter une base</Text>
              <Text style={styles.gestionModalSubtitle}>Créez une nouvelle base de données</Text>
            </View>
            
            <View style={styles.gestionModalBody}>
              <View style={styles.gestionModeSelector}>
                <TouchableOpacity 
                  style={[styles.gestionModeButton, formData.mode_connexion === 'direct' && styles.gestionModeButtonActive]}
                  onPress={() => setFormData({...formData, mode_connexion: 'direct'})}
                >
                  <Text style={[styles.gestionModeButtonText, formData.mode_connexion === 'direct' && styles.gestionModeButtonTextActive]}>🔌 Direct</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.gestionModeButton, formData.mode_connexion === 'bridge' && styles.gestionModeButtonActive]}
                  onPress={() => setFormData({...formData, mode_connexion: 'bridge'})}
                >
                  <Text style={[styles.gestionModeButtonText, formData.mode_connexion === 'bridge' && styles.gestionModeButtonTextActive]}>🔗 Bridge</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>🆔</Text>
                <TextInput style={styles.gestionModalInput} placeholder="ID de la base *" placeholderTextColor="#94a3b8" value={formData.base_id} onChangeText={(text) => setFormData({...formData, base_id: text})} autoCapitalize="none" />
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>📛</Text>
                <TextInput style={styles.gestionModalInput} placeholder="Nom de la base *" placeholderTextColor="#94a3b8" value={formData.nom_base} onChangeText={(text) => setFormData({...formData, nom_base: text})} />
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>🔑</Text>
                <TextInput style={styles.gestionModalInput} placeholder="Clé API *" placeholderTextColor="#94a3b8" value={formData.api_key} onChangeText={(text) => setFormData({...formData, api_key: text})} autoCapitalize="none" />
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>🔗</Text>
                <TextInput style={styles.gestionModalInput} placeholder="URL (optionnel)" placeholderTextColor="#94a3b8" value={formData.url} onChangeText={(text) => setFormData({...formData, url: text})} autoCapitalize="none" />
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>📋</Text>
                <TextInput style={[styles.gestionModalInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Tables autorisées (séparées par des virgules, optionnel)" placeholderTextColor="#94a3b8" value={formData.tables} onChangeText={(text) => setFormData({...formData, tables: text})} multiline numberOfLines={3} />
              </View>

              <View style={styles.gestionStatusSelector}>
                <Text style={styles.gestionStatusLabel}>Statut :</Text>
                <TouchableOpacity 
                  style={[styles.gestionStatusButton, formData.statut === 'actif' && styles.gestionStatusButtonActive]}
                  onPress={() => setFormData({...formData, statut: 'actif'})}
                >
                  <Text style={[styles.gestionStatusButtonText, formData.statut === 'actif' && styles.gestionStatusButtonTextActive]}>🟢 Actif</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.gestionStatusButton, formData.statut === 'inactif' && styles.gestionStatusButtonActive]}
                  onPress={() => setFormData({...formData, statut: 'inactif'})}
                >
                  <Text style={[styles.gestionStatusButtonText, formData.statut === 'inactif' && styles.gestionStatusButtonTextActive]}>🔴 Inactif</Text>
                </TouchableOpacity>
              </View>

              {formData.mode_connexion === 'direct' ? (
                <>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>🌐</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="Hôte *" placeholderTextColor="#94a3b8" value={formData.hote} onChangeText={(text) => setFormData({...formData, hote: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>👤</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="Utilisateur *" placeholderTextColor="#94a3b8" value={formData.utilisateur} onChangeText={(text) => setFormData({...formData, utilisateur: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>🔒</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="Mot de passe" placeholderTextColor="#94a3b8" value={formData.mot_passe} onChangeText={(text) => setFormData({...formData, mot_passe: text})} secureTextEntry />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>🔗</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="URL du Bridge *" placeholderTextColor="#94a3b8" value={formData.bridge_url} onChangeText={(text) => setFormData({...formData, bridge_url: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>🔑</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="Token du Bridge *" placeholderTextColor="#94a3b8" value={formData.bridge_token} onChangeText={(text) => setFormData({...formData, bridge_token: text})} autoCapitalize="none" />
                  </View>
                </>
              )}

              <TouchableOpacity style={[styles.gestionSubmitButton, isLoading && { opacity: 0.6 }]} onPress={handleAddBase} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.gestionSubmitButtonText}>✅ Créer la base</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.gestionModalCloseButton} onPress={() => { setAddModalVisible(false); resetForm(); }}>
              <Text style={styles.gestionModalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
      <KeyboardAvoidingView style={styles.gestionModalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={styles.gestionModalScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.gestionModalContainer}>
            <View style={styles.gestionModalHeader}>
              <View style={styles.gestionModalIconWrapper}><Text style={styles.gestionModalIcon}>✏️</Text></View>
              <Text style={styles.gestionModalTitle}>Modifier la base</Text>
              <Text style={styles.gestionModalSubtitle}>Mettez à jour les informations</Text>
            </View>
            
            <View style={styles.gestionModalBody}>
              <View style={styles.gestionModeSelector}>
                <TouchableOpacity 
                  style={[styles.gestionModeButton, editFormData.mode_connexion === 'direct' && styles.gestionModeButtonActive]}
                  onPress={() => setEditFormData({...editFormData, mode_connexion: 'direct'})}
                >
                  <Text style={[styles.gestionModeButtonText, editFormData.mode_connexion === 'direct' && styles.gestionModeButtonTextActive]}>🔌 Direct</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.gestionModeButton, editFormData.mode_connexion === 'bridge' && styles.gestionModeButtonActive]}
                  onPress={() => setEditFormData({...editFormData, mode_connexion: 'bridge'})}
                >
                  <Text style={[styles.gestionModeButtonText, editFormData.mode_connexion === 'bridge' && styles.gestionModeButtonTextActive]}>🔗 Bridge</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>🆔</Text>
                <TextInput style={styles.gestionModalInput} placeholder="ID de la base *" placeholderTextColor="#94a3b8" value={editFormData.base_id} onChangeText={(text) => setEditFormData({...editFormData, base_id: text})} autoCapitalize="none" />
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>📛</Text>
                <TextInput style={styles.gestionModalInput} placeholder="Nom de la base *" placeholderTextColor="#94a3b8" value={editFormData.nom_base} onChangeText={(text) => setEditFormData({...editFormData, nom_base: text})} />
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>🔑</Text>
                <TextInput style={styles.gestionModalInput} placeholder="Clé API *" placeholderTextColor="#94a3b8" value={editFormData.api_key} onChangeText={(text) => setEditFormData({...editFormData, api_key: text})} autoCapitalize="none" />
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>🔗</Text>
                <TextInput style={styles.gestionModalInput} placeholder="URL (optionnel)" placeholderTextColor="#94a3b8" value={editFormData.url} onChangeText={(text) => setEditFormData({...editFormData, url: text})} autoCapitalize="none" />
              </View>

              <View style={styles.gestionInputWrapper}>
                <Text style={styles.gestionInputIcon}>📋</Text>
                <TextInput style={[styles.gestionModalInput, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Tables autorisées (séparées par des virgules, optionnel)" placeholderTextColor="#94a3b8" value={editFormData.tables} onChangeText={(text) => setEditFormData({...editFormData, tables: text})} multiline numberOfLines={3} />
              </View>

              <View style={styles.gestionStatusSelector}>
                <Text style={styles.gestionStatusLabel}>Statut :</Text>
                <TouchableOpacity 
                  style={[styles.gestionStatusButton, editFormData.statut === 'actif' && styles.gestionStatusButtonActive]}
                  onPress={() => setEditFormData({...editFormData, statut: 'actif'})}
                >
                  <Text style={[styles.gestionStatusButtonText, editFormData.statut === 'actif' && styles.gestionStatusButtonTextActive]}>🟢 Actif</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.gestionStatusButton, editFormData.statut === 'inactif' && styles.gestionStatusButtonActive]}
                  onPress={() => setEditFormData({...editFormData, statut: 'inactif'})}
                >
                  <Text style={[styles.gestionStatusButtonText, editFormData.statut === 'inactif' && styles.gestionStatusButtonTextActive]}>🔴 Inactif</Text>
                </TouchableOpacity>
              </View>

              {editFormData.mode_connexion === 'direct' ? (
                <>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>🌐</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="Hôte *" placeholderTextColor="#94a3b8" value={editFormData.hote} onChangeText={(text) => setEditFormData({...editFormData, hote: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>👤</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="Utilisateur *" placeholderTextColor="#94a3b8" value={editFormData.utilisateur} onChangeText={(text) => setEditFormData({...editFormData, utilisateur: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>🔒</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="Mot de passe (laisser vide pour ne pas changer)" placeholderTextColor="#94a3b8" value={editFormData.mot_passe} onChangeText={(text) => setEditFormData({...editFormData, mot_passe: text})} secureTextEntry />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>🔗</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="URL du Bridge *" placeholderTextColor="#94a3b8" value={editFormData.bridge_url} onChangeText={(text) => setEditFormData({...editFormData, bridge_url: text})} autoCapitalize="none" />
                  </View>
                  <View style={styles.gestionInputWrapper}>
                    <Text style={styles.gestionInputIcon}>🔑</Text>
                    <TextInput style={styles.gestionModalInput} placeholder="Token du Bridge *" placeholderTextColor="#94a3b8" value={editFormData.bridge_token} onChangeText={(text) => setEditFormData({...editFormData, bridge_token: text})} autoCapitalize="none" />
                  </View>
                </>
              )}

              <TouchableOpacity style={[styles.gestionSubmitButton, isLoading && { opacity: 0.6 }]} onPress={handleEditBase} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.gestionSubmitButtonText}>💾 Mettre à jour</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.gestionModalCloseButton} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.gestionModalCloseText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderDeleteModal = () => (
    <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
      <View style={styles.gestionModalOverlay}>
        <View style={[styles.gestionModalContainer, { maxWidth: 380 }]}>
          <View style={styles.gestionModalHeader}>
            <View style={[styles.gestionModalIconWrapper, { backgroundColor: '#fef2f2' }]}>
              <Text style={styles.gestionModalIcon}>🗑️</Text>
            </View>
            <Text style={[styles.gestionModalTitle, { color: '#b91c1c' }]}>Confirmer la suppression</Text>
            <Text style={styles.gestionModalSubtitle}>Voulez-vous vraiment supprimer cette base ?</Text>
          </View>
          <View style={styles.gestionModalBody}>
            <Text style={{ textAlign: 'center', fontSize: 14, color: '#64748b', marginBottom: 16 }}>
              Toutes les données associées seront supprimées.
            </Text>
            <TouchableOpacity style={[styles.gestionSubmitButton, { backgroundColor: '#ef4444' }]} onPress={handleDeleteBase}>
              <Text style={styles.gestionSubmitButtonText}>🗑️ Supprimer définitivement</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.gestionModalCloseButton} onPress={() => setDeleteModalVisible(false)}>
            <Text style={styles.gestionModalCloseText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.gestionMainContainer} edges={["top", "bottom"]}>
        <View style={styles.gestionHeader}>
          <TouchableOpacity onPress={onClose} style={styles.gestionCloseButton}>
            <Text style={styles.gestionCloseButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.gestionHeaderTitle}>🗄️ Gestionnaire de bases</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => { if(isSpeaking) { stopSpeaking(); } else { setAutoSpeak(!autoSpeak); } }} 
              style={[styles.gestionHeaderActionButton, { marginRight: 8, backgroundColor: autoSpeak ? '#ede9fe' : '#f1f5f9' }]}
            >
              <Text style={styles.gestionHeaderActionText}>{autoSpeak ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={loadBases} style={[styles.gestionHeaderActionButton, { backgroundColor: '#f0f9ff' }]}>
              <Text style={styles.gestionHeaderActionText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.gestionContent}>
          <View style={styles.gestionToolbar}>
            <TouchableOpacity style={styles.gestionAddButton} onPress={() => { setAddModalVisible(true); resetForm(); }}>
              <Text style={styles.gestionAddButtonText}>➕ Nouvelle base</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gestionFiltersContainer}>
            <View style={styles.gestionSearchWrapper}>
              <Text style={styles.gestionSearchIcon}>🔍</Text>
              <TextInput 
                style={styles.gestionSearchInput} 
                placeholder="Rechercher une base..." 
                placeholderTextColor="#94a3b8"
                value={searchQuery} 
                onChangeText={setSearchQuery} 
              />
            </View>
            <View style={styles.gestionFilterButtons}>
              <TouchableOpacity 
                style={[styles.gestionFilterButton, filterMode === 'all' && styles.gestionFilterButtonActive]}
                onPress={() => setFilterMode('all')}
              >
                <Text style={[styles.gestionFilterButtonText, filterMode === 'all' && styles.gestionFilterButtonTextActive]}>Tous</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.gestionFilterButton, filterMode === 'direct' && styles.gestionFilterButtonActive]}
                onPress={() => setFilterMode('direct')}
              >
                <Text style={[styles.gestionFilterButtonText, filterMode === 'direct' && styles.gestionFilterButtonTextActive]}>🔌</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.gestionFilterButton, filterMode === 'bridge' && styles.gestionFilterButtonActive]}
                onPress={() => setFilterMode('bridge')}
              >
                <Text style={[styles.gestionFilterButtonText, filterMode === 'bridge' && styles.gestionFilterButtonTextActive]}>🔗</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.gestionFilterButtons, { marginTop: 8 }]}>
              <TouchableOpacity 
                style={[styles.gestionFilterButton, filterStatut === 'all' && styles.gestionFilterButtonActive]}
                onPress={() => setFilterStatut('all')}
              >
                <Text style={[styles.gestionFilterButtonText, filterStatut === 'all' && styles.gestionFilterButtonTextActive]}>📊 Tous</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.gestionFilterButton, filterStatut === 'actif' && styles.gestionFilterButtonActive]}
                onPress={() => setFilterStatut('actif')}
              >
                <Text style={[styles.gestionFilterButtonText, filterStatut === 'actif' && styles.gestionFilterButtonTextActive]}>🟢 Actifs</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.gestionFilterButton, filterStatut === 'inactif' && styles.gestionFilterButtonActive]}
                onPress={() => setFilterStatut('inactif')}
              >
                <Text style={[styles.gestionFilterButtonText, filterStatut === 'inactif' && styles.gestionFilterButtonTextActive]}>🔴 Inactifs</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.gestionBasesList}>
            <Text style={styles.gestionSectionTitle}>📋 Bases ({bases.length})</Text>
            {isLoading ? (
              <View style={styles.gestionLoadingCenter}><ActivityIndicator size="large" color="#6c63ff" /></View>
            ) : bases.length === 0 ? (
              <View style={styles.gestionEmptyState}>
                <Text style={styles.gestionEmptyIcon}>🗄️</Text>
                <Text style={styles.gestionEmptyText}>Aucune base de données</Text>
                <TouchableOpacity style={styles.gestionEmptyButton} onPress={() => { setAddModalVisible(true); resetForm(); }}>
                  <Text style={styles.gestionEmptyButtonText}>➕ Créer une base</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={bases.filter(b => {
                  const matchSearch = b.nom_base.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                     b.base_id.toLowerCase().includes(searchQuery.toLowerCase());
                  const isBridge = b.bridge_url && b.bridge_url !== '';
                  const matchMode = filterMode === 'all' || 
                                   (filterMode === 'direct' && !isBridge) || 
                                   (filterMode === 'bridge' && isBridge);
                  const matchStatut = filterStatut === 'all' || b.statut === filterStatut;
                  return matchSearch && matchMode && matchStatut;
                })}
                keyExtractor={(item) => item.base_id}
                renderItem={({ item }) => {
                  const isBridge = item.bridge_url && item.bridge_url !== '';
                  const isActif = item.statut === 'actif';
                  return (
                    <View style={[styles.gestionBaseCard, !isActif && styles.gestionBaseCardInactif]}>
                      <View style={styles.gestionBaseCardHeader}>
                        <View style={styles.gestionBaseIconWrapper}>
                          <Text style={styles.gestionBaseIcon}>🗄️</Text>
                        </View>
                        <View style={styles.gestionBaseInfo}>
                          <Text style={styles.gestionBaseName} numberOfLines={1}>{item.nom_base}</Text>
                          <Text style={styles.gestionBaseId}>🆔 {item.base_id}</Text>
                        </View>
                        <View style={[styles.gestionModeBadge, { backgroundColor: isBridge ? '#ede9fe' : '#dcfce7' }]}>
                          <Text style={[styles.gestionModeBadgeText, { color: isBridge ? '#7c3aed' : '#16a34a' }]}>
                            {isBridge ? '🔗 Bridge' : '🔌 Direct'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.gestionBaseDetails}>
                        <View style={styles.gestionBaseDetailRow}>
                          <Text style={styles.gestionBaseDetailLabel}>🔑 API Key:</Text>
                          <Text style={styles.gestionBaseDetailValue} numberOfLines={1}>{item.api_key || 'Non défini'}</Text>
                        </View>
                        {item.url && (
                          <View style={styles.gestionBaseDetailRow}>
                            <Text style={styles.gestionBaseDetailLabel}>🔗 URL:</Text>
                            <Text style={styles.gestionBaseDetailValue} numberOfLines={1}>{item.url}</Text>
                          </View>
                        )}
                        {item.tables && (
                          <View style={styles.gestionBaseDetailRow}>
                            <Text style={styles.gestionBaseDetailLabel}>📋 Tables:</Text>
                            <Text style={styles.gestionBaseDetailValue} numberOfLines={2}>{item.tables}</Text>
                          </View>
                        )}
                        <View style={styles.gestionBaseDetailRow}>
                          <Text style={styles.gestionBaseDetailLabel}>📊 Statut:</Text>
                          <Text style={[styles.gestionBaseDetailValue, { color: isActif ? '#22c55e' : '#ef4444', fontWeight: '600' }]}>
                            {isActif ? '🟢 Actif' : '🔴 Inactif'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.gestionBaseActions}>
                        <TouchableOpacity 
                          style={[styles.gestionActionButton, { backgroundColor: '#f0f9ff' }]}
                          onPress={() => openEditModal(item)}
                        >
                          <Text style={styles.gestionActionButtonText}>✏️</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.gestionActionButton, { backgroundColor: '#fef2f2' }]}
                          onPress={() => openDeleteModal(item.base_id)}
                        >
                          <Text style={styles.gestionActionButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBases(); }} colors={['#6c63ff']} />
                }
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </View>

        {renderAddModal()}
        {renderEditModal()}
        {renderDeleteModal()}
      </SafeAreaView>
    </Modal>
  );
}

// ================================================================
// COMPOSANT INTÉGRÉ : SURVEILLANCE
// ================================================================
function SurveillanceModal({ visible, onClose, user, selectedBase, onSpeak, onAddMessage }) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringInterval, setMonitoringInterval] = useState(null);
  const [monitoringStatus, setMonitoringStatus] = useState('arrêté');
  const [dbStats, setDbStats] = useState({
    connections: 0, tables: [], totalColumns: 0, totalRows: 0, totalSize: '0 Mo', alerts: []
  });
  const [monitoringData, setMonitoringData] = useState([]);

  const speak = (text) => { if (onSpeak && text) onSpeak(text); };
  const addChatMessage = (content, isAlert = false) => { if (onAddMessage) onAddMessage(content, isAlert); };

  const startMonitoring = async () => {
    if (!selectedBase || !user) {
      Alert.alert('Erreur', 'Aucune base sélectionnée.');
      return;
    }
    setMonitoringStatus('en cours');
    setIsMonitoring(true);
    await fetchDatabaseStats();
    const interval = setInterval(async () => { await fetchDatabaseStats(); }, 30000);
    setMonitoringInterval(interval);
    speak(`Surveillance de la base ${selectedBase.nom_base} activée`);
    addChatMessage(`🟢 Surveillance de la base ${selectedBase.nom_base} activée`);
  };

  const stopMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      setMonitoringInterval(null);
    }
    setIsMonitoring(false);
    setMonitoringStatus('arrêté');
    speak('Surveillance arrêtée');
    addChatMessage('⏹ Surveillance arrêtée');
  };

  const fetchDatabaseStats = async () => {
    if (!selectedBase || !user) return;
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'monitoring', user_id: user.id, base_id: selectedBase.base_id,
          monitoring_action: 'stats'
        })
      });
      const data = await res.json();
      
      if (data.success) {
        const newStats = {
          connections: data.connections || 0,
          tables: data.tables || [],
          totalColumns: data.total_columns || 0,
          totalRows: data.total_rows || 0,
          totalSize: data.total_size || '0 Mo',
          alerts: data.alerts || []
        };
        setDbStats(newStats);
        setMonitoringData(prev => [newStats, ...prev].slice(0, 50));
        
        if (newStats.alerts && newStats.alerts.length > 0) {
          newStats.alerts.forEach(alert => {
            const alertMessage = `🚨 ${alert.table}: ${alert.message}`;
            addChatMessage(alertMessage, true);
            speak(`Alerte ${alert.table}: ${alert.message}`);
          });
        }
        
        const statusMessage = `📊 Statistiques de ${selectedBase.nom_base}: ${newStats.tables.length} tables, ${newStats.totalRows} enregistrements, taille ${newStats.totalSize}`;
        addChatMessage(statusMessage);
      } else {
        setMonitoringStatus('erreur');
        console.error('Erreur monitoring:', data.error);
      }
    } catch (e) {
      setMonitoringStatus('erreur');
      console.error('Erreur fetch monitoring:', e);
    }
  };

  useEffect(() => {
    return () => { if (monitoringInterval) clearInterval(monitoringInterval); };
  }, [monitoringInterval]);

  useEffect(() => {
    if (!visible && isMonitoring) stopMonitoring();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.survContainer} edges={["top", "bottom"]}>
        <View style={styles.survHeader}>
          <Text style={styles.survHeaderTitle}>🗄️ Surveillance</Text>
          <TouchableOpacity onPress={onClose} style={styles.survCloseButton}>
            <Text style={styles.survCloseText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.survContent}>
          <View style={styles.survMonitoringHeader}>
            <Text style={styles.survMonitoringTitle}>🗄️ Surveillance des bases</Text>
            <Text style={styles.survMonitoringSubtitle}>
              {selectedBase?.nom_base || 'Aucune base'} • {isMonitoring ? 'Surveillance active' : 'Surveillance arrêtée'}
            </Text>
            <Text style={[styles.survMonitoringStatus, { color: isMonitoring ? '#22c55e' : '#ef4444' }]}>
              {isMonitoring ? '🟢 En cours' : '⏸ Arrêtée'}
            </Text>
          </View>

          <View style={styles.survControls}>
            <TouchableOpacity 
              style={[styles.survButton, isMonitoring ? styles.survButtonStop : styles.survButtonStart]}
              onPress={() => { if (isMonitoring) stopMonitoring(); else startMonitoring(); }}
            >
              <Text style={styles.survButtonText}>{isMonitoring ? '⏹ Arrêter' : '▶️ Démarrer'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.survButton, { backgroundColor: '#6c63ff' }]} onPress={fetchDatabaseStats}>
              <Text style={styles.survButtonText}>🔄 Rafraîchir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.survStatsGrid}>
            <View style={styles.survStatCard}>
              <Text style={styles.survStatLabel}>🔌 Connexions</Text>
              <Text style={styles.survStatValue}>{dbStats.connections}</Text>
            </View>
            <View style={styles.survStatCard}>
              <Text style={styles.survStatLabel}>📋 Tables</Text>
              <Text style={styles.survStatValue}>{dbStats.tables.length}</Text>
            </View>
            <View style={styles.survStatCard}>
              <Text style={styles.survStatLabel}>📝 Colonnes</Text>
              <Text style={styles.survStatValue}>{dbStats.totalColumns}</Text>
            </View>
            <View style={styles.survStatCard}>
              <Text style={styles.survStatLabel}>📊 Enregistrements</Text>
              <Text style={styles.survStatValue}>{dbStats.totalRows.toLocaleString()}</Text>
            </View>
            <View style={[styles.survStatCard, { width: '100%' }]}>
              <Text style={styles.survStatLabel}>💾 Taille totale</Text>
              <Text style={[styles.survStatValue, dbStats.totalSize && parseFloat(dbStats.totalSize) > 100 ? { color: '#ef4444' } : null]}>
                {dbStats.totalSize}
                {dbStats.totalSize && parseFloat(dbStats.totalSize) > 100 && ' ⚠️'}
              </Text>
            </View>
          </View>

          {dbStats.alerts && dbStats.alerts.length > 0 && (
            <View style={styles.survAlerts}>
              <Text style={styles.survAlertsTitle}>🚨 Alertes taille (&gt;100 Mo)</Text>
              {dbStats.alerts.map((alert, idx) => (
                <View key={idx} style={[styles.survAlertItem, { borderLeftColor: '#ef4444' }]}>
                  <Text style={styles.survAlertText}>📊 {alert.table}: {alert.message}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.survTables}>
            <Text style={styles.survTablesTitle}>📋 Détail des tables</Text>
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator>
              {dbStats.tables.map((table, idx) => (
                <View key={idx} style={styles.survTableItem}>
                  <View style={styles.survTableHeader}>
                    <Text style={styles.survTableName}>📊 {table.name}</Text>
                    <Text style={styles.survTableRows}>{table.rows?.toLocaleString() || 0} lignes</Text>
                  </View>
                  <View style={styles.survTableDetails}>
                    <Text style={styles.survTableDetail}>Colonnes: {table.columns || 0}</Text>
                    <Text style={[styles.survTableDetail, table.size && parseFloat(table.size) > 100 ? { color: '#ef4444', fontWeight: 'bold' } : null]}>
                      Taille: {table.size || '0 Mo'}
                      {table.size && parseFloat(table.size) > 100 && ' ⚠️'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.survFooter}>
            <Text style={styles.survFooterText}>
              {isMonitoring ? '🟢 Surveillance active - Mise à jour toutes les 30s' : '⏸ Surveillance en pause'}
            </Text>
            <Text style={[styles.survFooterText, { fontSize: 11, color: '#64748b', marginTop: 4 }]}>
              Dernière mise à jour: {new Date().toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ================================================================
// STYLES
// ================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  loginIconWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loginIconText: { color: '#fff', fontSize: 46, fontWeight: 'bold' },
  loginTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a2e', marginBottom: 8 },
  loginSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  loginForm: { width: '100%' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14, paddingHorizontal: 14 },
  inputIcon: { fontSize: 18, marginRight: 10 },
  loginInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: '#1e293b' },
  eyeButton: { padding: 6 },
  eyeText: { fontSize: 18 },
  loginButton: { backgroundColor: '#6c63ff', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  forgotButton: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  forgotButtonText: { fontSize: 14, color: '#6c63ff', fontWeight: '600' },
  loginFooter: { marginTop: 24, fontSize: 12, color: '#6c63ff', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalContainer: { backgroundColor: '#ffffff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 10 },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalIconWrapper: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  modalIcon: { fontSize: 26 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  modalBody: { width: '100%' },
  resetInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 14, marginBottom: 14 },
  resetInputIcon: { fontSize: 18, marginRight: 10 },
  resetInput: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1e293b' },
  resetErrorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 14 },
  resetErrorText: { fontSize: 13, color: '#b91c1c', lineHeight: 18 },
  resetButton: { backgroundColor: '#6c63ff', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  resetButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  resetSuccessBox: { alignItems: 'center', paddingVertical: 10 },
  resetSuccessIcon: { fontSize: 40, marginBottom: 12 },
  resetSuccessText: { fontSize: 15, color: '#166534', textAlign: 'center', lineHeight: 22, fontWeight: '600', marginBottom: 8 },
  resetSuccessHint: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 17 },
  modalCloseButton: { marginTop: 20, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  modalCloseText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#ffffff' },
  headerLeft: { flex: 1 },
  headerUser: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  brand: { fontSize: 12, fontWeight: '800', color: '#6c63ff' },
  backButton: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#f1f5f9', borderRadius: 8 },
  backText: { fontSize: 13, color: '#6c63ff', fontWeight: '600' },
  logoutButton: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fef2f2', borderRadius: 8 },
  logoutText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  logoutButtonSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  logoutTextSmall: { fontSize: 16 },
  basesContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  basesTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  basesSubtitle: { fontSize: 12, color: '#6b7280', marginBottom: 16 },
  noBasesText: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginTop: 12, lineHeight: 22 },
  loadingCenter: { alignItems: 'center', marginTop: 60 },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  refreshButton: { marginTop: 16, backgroundColor: '#f1f5f9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  refreshButtonText: { fontSize: 14, color: '#6c63ff', fontWeight: '600' },
  baseCard: { backgroundColor: '#f8fafc', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  baseCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  baseIconWrapper: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  baseIconText: { fontSize: 20 },
  baseInfo: { flex: 1 },
  baseName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  baseHost: { fontSize: 12, color: '#64748b', marginTop: 2 },
  baseStatusBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  baseStatusText: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  baseTablesSection: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' },
  baseTablesLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  baseTables: { fontSize: 12, color: '#6c63ff', fontStyle: 'italic', lineHeight: 18 },
  baseTablesAll: { fontSize: 12, color: '#16a34a', fontWeight: '600', fontStyle: 'italic' },
  baseCardFooter: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', alignItems: 'flex-end' },
  baseAction: { fontSize: 13, color: '#6c63ff', fontWeight: '700' },
  chatArea: { flex: 1, backgroundColor: '#ffffff' },
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 20, flexGrow: 1 },
  welcome: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  welcomeIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  welcomeIconText: { color: 'white', fontSize: 26, fontWeight: 'bold' },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', marginBottom: 8, textAlign: 'center' },
  welcomeText: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  welcomeTables: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, width: '100%', borderWidth: 1, borderColor: '#e5e7eb' },
  welcomeTablesTitle: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  welcomeTablesList: { fontSize: 12, color: '#6c63ff', lineHeight: 18 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 },
  userBubble: { backgroundColor: '#f0f4f9', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, borderBottomRightRadius: 6, maxWidth: '88%' },
  userText: { fontSize: 15, color: '#1a1a2e', lineHeight: 21 },
  editButton: { marginTop: 8, alignSelf: 'flex-end' },
  editButtonText: { fontSize: 12, color: '#6c63ff', fontWeight: '600' },
  aiRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
  aiIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6c63ff', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 },
  aiIconText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
  aiContent: { flex: 1, maxWidth: '88%' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 12 },
  errorText: { color: '#b91c1c', fontSize: 14, lineHeight: 20 },
  sqlBlockError: { backgroundColor: '#1e293b', borderRadius: 8, padding: 10, marginTop: 8 },
  sqlTextError: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, color: '#fca5a5', lineHeight: 16 },
  noResultBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 12, padding: 12 },
  aiText: { fontSize: 14, color: '#166534', lineHeight: 20 },
  resultsContainer: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden', backgroundColor: '#ffffff' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  resultsTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  resultsCountBadge: { backgroundColor: '#ede9fe', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  resultsCount: { fontSize: 11, color: '#6c63ff', fontWeight: '600' },
  resultCard: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resultCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resultCardIndex: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  resultRow: { flexDirection: 'row', marginBottom: 5, alignItems: 'flex-start' },
  resultLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', width: 100, marginRight: 8 },
  resultValue: { fontSize: 13, color: '#1e293b', flex: 1, flexWrap: 'wrap' },
  resultsFooter: { padding: 10, backgroundColor: '#f8fafc', alignItems: 'center' },
  resultsFooterText: { fontSize: 11, color: '#64748b' },
  sqlToggle: { marginTop: 10, paddingVertical: 6 },
  sqlToggleText: { color: '#6c63ff', fontSize: 13, fontWeight: '600' },
  sqlBlock: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, marginTop: 6 },
  sqlText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12, color: '#a5f3fc', lineHeight: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, marginHorizontal: 14, marginBottom: 8, backgroundColor: '#f8fafc', borderRadius: 12 },
  loadingText: { marginLeft: 10, color: '#64748b', fontSize: 13 },
  speakingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 16, marginHorizontal: 14, marginBottom: 8, backgroundColor: '#ede9fe', borderRadius: 12 },
  speakingText: { color: '#6c63ff', fontSize: 13, fontWeight: '600' },
  stopText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  inputArea: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 12 : 18, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#ffffff' },
  editingBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f0f4ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 8 },
  editingText: { fontSize: 13, color: '#6c63ff', fontWeight: '600' },
  cancelEditText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  inputBar: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 24, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'flex-end' },
  input: { flex: 1, fontSize: 15, color: '#1e293b', maxHeight: 110, minHeight: 40, paddingVertical: 10, paddingRight: 8, lineHeight: 21 },
  voiceButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginLeft: 4, marginBottom: 2 },
  voiceButtonActive: { backgroundColor: '#ef4444' },
  voiceButtonText: { fontSize: 18 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center', marginLeft: 4, marginBottom: 2 },
  sendButtonActive: { backgroundColor: '#6c63ff' },
  sendButtonText: { color: '#94a3b8', fontSize: 18, fontWeight: 'bold' },
  disclaimer: { textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 8 },
  sidebarOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-start' },
  sidebarContainer: { width: '85%', maxWidth: 320, height: '100%', backgroundColor: '#ffffff', borderTopRightRadius: 20, borderBottomRightRadius: 20, paddingTop: 50, paddingHorizontal: 16 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  sidebarTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e' },
  sidebarClose: { fontSize: 22, color: '#64748b', padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  indicatorItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  indicatorContent: { flex: 1, paddingRight: 8 },
  indicatorName: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  indicatorDesc: { fontSize: 12, color: '#64748b', marginBottom: 6, lineHeight: 16 },
  deleteIndicatorButton: { padding: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca', marginLeft: 4 },
  deleteIndicatorIcon: { fontSize: 16 },
  emptySidebarText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, marginTop: 40 },
  sqlActions: { marginTop: 10 },
  saveIndicatorButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginTop: 8, alignSelf: 'flex-start' },
  saveIndicatorButtonText: { fontSize: 13, color: '#166534', fontWeight: '600' },
  sqlPreviewBox: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, marginTop: 4 },
  sqlPreviewLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  sqlPreviewText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, color: '#a5f3fc', lineHeight: 16 },
  alertItem: { padding: 12, borderRadius: 10, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#ef4444', backgroundColor: '#fef2f2' },
  alertIndicatorName: { fontWeight: '600', color: '#1e293b' },
  alertIndicatorValue: { fontSize: 18, fontWeight: '700', color: '#ef4444' },
  alertIndicatorThreshold: { fontSize: 12, color: '#64748b' },
  chartTabsScroll: { marginHorizontal: 14, marginTop: 12, marginBottom: 8 },
  chartTabs: { flexDirection: 'row', backgroundColor: '#f1f5f9', padding: 4, borderRadius: 8, gap: 4 },
  chartTab: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderRadius: 6, minWidth: 70 },
  chartTabActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  chartTabText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  chartTabTextActive: { color: '#6c63ff' },
  chartContainer: { padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 220 },
  chartAxisText: { fontSize: 10, color: '#94a3b8' },
  pieCenterLabel: { justifyContent: 'center', alignItems: 'center' },
  pieCenterText: { fontSize: 12, color: '#64748b' },
  pieCenterValue: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  pieLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, paddingHorizontal: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 8 },
  legendColor: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendText: { fontSize: 12, color: '#475569', flex: 1 },
  zoomHint: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f1f5f9', borderRadius: 20, alignSelf: 'center' },
  zoomHintText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  expandedChartOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  expandedChartContainer: { backgroundColor: '#ffffff', borderRadius: 20, width: '100%', maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  expandedChartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#f8fafc' },
  expandedChartTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', flex: 1 },
  closeExpandedButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  closeExpandedText: { fontSize: 18, color: '#ef4444', fontWeight: 'bold' },
  expandedChartScroll: { padding: 20, alignItems: 'center', paddingBottom: 40 },

  tableWrapper: { maxHeight: 350, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#6c63ff', borderRadius: 8, marginBottom: 4, paddingVertical: 4 },
  tableRow: { flexDirection: 'row', borderRadius: 4, paddingVertical: 2, minHeight: 36 },
  tableRowEven: { backgroundColor: '#f8fafc' },
  tableRowOdd: { backgroundColor: '#ffffff' },
  tableCell: { paddingHorizontal: 8, paddingVertical: 6, borderRightWidth: 0.5, borderRightColor: '#e5e7eb' },
  tableCellHeader: { borderRightColor: 'rgba(255,255,255,0.2)' },
  tableHeaderText: { fontSize: 12, fontWeight: '700', color: '#ffffff', textAlign: 'left' },
  tableCellText: { fontSize: 12, color: '#1e293b' },
  resultsContent: { flex: 1, minHeight: 200, maxHeight: 500 },
  seeMoreButton: { padding: 12, alignItems: 'center', backgroundColor: '#f0f9ff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  seeMoreText: { color: '#6c63ff', fontSize: 13, fontWeight: '600' },

  mediaCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  mediaCardTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  mediaCardSub: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  mediaButton: { backgroundColor: '#6c63ff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  mediaButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, justifyContent: 'space-between' },
  mediaGridItem: { width: '48%', marginBottom: 12, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e5e7eb' },
  mediaGridThumb: { width: '100%', height: 120 },
  mediaGridLabel: { fontSize: 12, color: '#475569', padding: 8, fontWeight: '500' },
  noMediaBox: { padding: 40, alignItems: 'center' },
  noMediaText: { fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  mediaModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mediaModalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  mediaModalCloseText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  mediaModalContent: { width: '100%', maxHeight: '80%', alignItems: 'center' },
  mediaModalTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  mediaModalImage: { width: '100%', height: 400, borderRadius: 8 },

  tabBar: { height: Platform.OS === 'ios' ? 62 : 56, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#eef1f5' },
  tabItem: { flex: 1, minHeight: 54, marginHorizontal: 4, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'transparent', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive: { backgroundColor: 'transparent', borderBottomColor: '#6c63ff' },
  tabIcon: { fontSize: 16, opacity: 0.55 },
  tabIconActive: { opacity: 1 },
  tabLabel: { color: '#8a94a6', fontSize: 12, fontWeight: '600' },
  tabLabelActive: { color: '#202938', fontWeight: '800' },

  // ===== STYLES GESTIONNAIRE =====
  gestionMainContainer: { flex: 1, backgroundColor: '#ffffff' },
  gestionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  gestionHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', flex: 1, marginLeft: 12 },
  gestionCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  gestionCloseButtonText: { fontSize: 18, color: '#ef4444', fontWeight: 'bold' },
  gestionHeaderActionButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  gestionHeaderActionText: { fontSize: 18 },
  gestionContent: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  gestionToolbar: { marginBottom: 12 },
  gestionAddButton: { backgroundColor: '#6c63ff', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  gestionAddButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  gestionFiltersContainer: { marginBottom: 12 },
  gestionSearchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  gestionSearchIcon: { fontSize: 16, marginRight: 8, color: '#94a3b8' },
  gestionSearchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1e293b' },
  gestionFilterButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  gestionFilterButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f1f5f9' },
  gestionFilterButtonActive: { backgroundColor: '#6c63ff' },
  gestionFilterButtonText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  gestionFilterButtonTextActive: { color: '#ffffff' },
  gestionSectionTitle: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  gestionBasesList: { flex: 1 },
  gestionBaseCard: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  gestionBaseCardInactif: { opacity: 0.6, borderColor: '#fecaca' },
  gestionBaseCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  gestionBaseIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  gestionBaseIcon: { fontSize: 20 },
  gestionBaseInfo: { flex: 1 },
  gestionBaseName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  gestionBaseId: { fontSize: 11, color: '#94a3b8' },
  gestionModeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  gestionModeBadgeText: { fontSize: 10, fontWeight: '600' },
  gestionBaseDetails: { marginLeft: 52, marginBottom: 8 },
  gestionBaseDetailRow: { flexDirection: 'row', marginBottom: 2, flexWrap: 'wrap' },
  gestionBaseDetailLabel: { fontSize: 11, color: '#94a3b8', width: 80 },
  gestionBaseDetailValue: { fontSize: 11, color: '#1e293b', flex: 1 },
  gestionBaseActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 4 },
  gestionActionButton: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  gestionActionButtonText: { fontSize: 14 },
  gestionLoadingCenter: { padding: 40, justifyContent: 'center', alignItems: 'center' },
  gestionEmptyState: { padding: 40, alignItems: 'center' },
  gestionEmptyIcon: { fontSize: 48, marginBottom: 12 },
  gestionEmptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  gestionEmptyButton: { backgroundColor: '#6c63ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  gestionEmptyButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  gestionModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  gestionModalScroll: { width: '100%', maxHeight: '90%' },
  gestionModalContainer: { backgroundColor: '#ffffff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 420 },
  gestionModalHeader: { alignItems: 'center', marginBottom: 20 },
  gestionModalIconWrapper: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ede9fe', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  gestionModalIcon: { fontSize: 26 },
  gestionModalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', textAlign: 'center' },
  gestionModalSubtitle: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4 },
  gestionModalBody: { width: '100%' },
  gestionModeSelector: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  gestionModeButton: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center' },
  gestionModeButtonActive: { backgroundColor: '#6c63ff' },
  gestionModeButtonText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  gestionModeButtonTextActive: { color: '#ffffff' },
  gestionStatusSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  gestionStatusLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginRight: 8 },
  gestionStatusButton: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f1f5f9' },
  gestionStatusButtonActive: { backgroundColor: '#6c63ff' },
  gestionStatusButtonText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  gestionStatusButtonTextActive: { color: '#ffffff' },
  gestionInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, marginBottom: 10 },
  gestionInputIcon: { fontSize: 16, marginRight: 10, color: '#94a3b8' },
  gestionModalInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1e293b' },
  gestionSubmitButton: { backgroundColor: '#6c63ff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  gestionSubmitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  gestionModalCloseButton: { marginTop: 16, paddingVertical: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  gestionModalCloseText: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  // ===== STYLES SURVEILLANCE =====
  survContainer: { flex: 1, backgroundColor: '#0a0a1a' },
  survHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0a0a1a' },
  survHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  survCloseButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  survCloseText: { fontSize: 18, color: '#ef4444', fontWeight: 'bold' },
  survContent: { flex: 1, padding: 16 },
  survMonitoringHeader: { marginBottom: 20 },
  survMonitoringTitle: { fontSize: 22, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  survMonitoringSubtitle: { fontSize: 14, color: '#94a3b8' },
  survMonitoringStatus: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  survControls: { flexDirection: 'row', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  survButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', minWidth: 120, flex: 1 },
  survButtonStart: { backgroundColor: '#22c55e' },
  survButtonStop: { backgroundColor: '#ef4444' },
  survButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  survStatsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  survStatCard: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  survStatLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  survStatValue: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  survAlerts: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, marginBottom: 16 },
  survAlertsTitle: { fontSize: 16, fontWeight: '600', color: '#ef4444', marginBottom: 10 },
  survAlertItem: { paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 6, marginBottom: 6 },
  survAlertText: { fontSize: 13, color: '#e2e8f0' },
  survTables: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, flex: 1 },
  survTablesTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 10 },
  survTableItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  survTableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  survTableName: { fontSize: 13, color: '#e2e8f0', fontWeight: '500' },
  survTableRows: { fontSize: 12, color: '#94a3b8' },
  survTableDetails: { flexDirection: 'row', gap: 16, marginTop: 4 },
  survTableDetail: { fontSize: 11, color: '#64748b' },
  survFooter: { paddingVertical: 12 },
  survFooterText: { color: '#94a3b8', fontSize: 13, textAlign: 'center' },
});