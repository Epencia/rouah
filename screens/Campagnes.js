// Campagnes.js — Fil TikTok + création + dictée + paiement Wave
// API : https://rouah.net/api/api-campagne.php
// Paiement : https://rouah.net/paiement/initial/{operation_id}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Animated,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

// Dictée vocale (optionnelle)
let ExpoSpeechRecognitionModule = null;
let useSpeechRecognitionEvent = null;
try {
  const speechRec = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = speechRec.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = speechRec.useSpeechRecognitionEvent;
} catch (_) {}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const API_URL = 'https://rouah.net/api/api-campagne.php';

const COLORS = {
  primary: '#075E54',
  primaryDark: '#054C44',
  secondary: '#25D366',
  accent: '#128C7E',
  background: '#000000',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.88)',
  whatsapp: '#25D366',
  sms: '#25D366',
  call: '#075E54',
  danger: '#ef4444',
  surface: '#ffffff',
  muted: '#64748b',
  border: '#e2e8f0',
  inputBg: '#f1f5f9',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.95)',
};

const TYPES_CAMPAGNE = ['Promotion', 'Nouveaute', 'Offre', 'Actualite', 'Formation'];

// ============================================================
// HOOK VISIBILITÉ
// ============================================================
function useViewableItems(setActiveIndex) {
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
    minimumViewTime: 150,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  return { viewabilityConfig, onViewableItemsChanged };
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
export default function Campagnes({ onBack, societeId, user }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [containerHeight, setContainerHeight] = useState(SCREEN_H);

  // ===== MODAL FORMULAIRE =====
  const [createVisible, setCreateVisible] = useState(false);
  const [formTitre, setFormTitre] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTelephone, setFormTelephone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formType, setFormType] = useState('Promotion');
  const [formPhotoUri, setFormPhotoUri] = useState(null);
  const [formPhotoBase64, setFormPhotoBase64] = useState(null);
  const [listeningField, setListeningField] = useState(null);

  // ===== MODAL APERÇU =====
  const [previewVisible, setPreviewVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  // ===== ⭐ PAIEMENT =====
  const [pendingCampagneId, setPendingCampagneId] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const { viewabilityConfig, onViewableItemsChanged } =
    useViewableItems(setActiveIndex);
  const flatListRef = useRef(null);
  const viewedIds = useRef(new Set());

  const isLoggedIn = !!(user?.utilisateur_id || user?.id || societeId);

  // ============================================================
  // DICTÉE VOCALE
  // ============================================================
  if (useSpeechRecognitionEvent) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('result', (event) => {
      const transcript = event.results?.[0]?.transcript || '';
      if (!transcript || !listeningField) return;
      if (listeningField === 'titre') {
        setFormTitre((prev) => (prev ? `${prev} ${transcript}` : transcript).trim());
      } else if (listeningField === 'description') {
        setFormDescription((prev) =>
          (prev ? `${prev} ${transcript}` : transcript).trim()
        );
      }
    });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('end', () => setListeningField(null));
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSpeechRecognitionEvent('error', () => {
      setListeningField(null);
      Alert.alert('Erreur', 'Impossible d’utiliser le micro');
    });
  }

  const startDictation = async (field) => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Dictée indisponible',
        'Installez expo-speech-recognition :\nnpx expo install expo-speech-recognition'
      );
      return;
    }
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        Alert.alert('Permission', 'Autorisez l’accès au microphone');
        return;
      }
      setListeningField(field);
      ExpoSpeechRecognitionModule.start({
        lang: 'fr-FR',
        interimResults: false,
        continuous: false,
      });
    } catch (e) {
      setListeningField(null);
      Alert.alert('Erreur', 'Dictée non disponible sur cet appareil');
    }
  };

  const stopDictation = () => {
    try {
      ExpoSpeechRecognitionModule?.stop();
    } catch (_) {}
    setListeningField(null);
  };

  // ============================================================
  // API
  // ============================================================
  const loadCampagnes = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_campagnes',
            societe_id: societeId || undefined,
          }),
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setItems(json.data);
        } else {
          Alert.alert('Erreur', json.message || 'Impossible de charger les actualités');
          setItems([]);
        }
      } catch (e) {
        Alert.alert('Erreur réseau', e.message || 'Connexion impossible');
        setItems([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [societeId]
  );

  useEffect(() => {
    loadCampagnes();
  }, [loadCampagnes]);

  const incrementVue = useCallback(async (id) => {
    if (!id || viewedIds.current.has(id)) return;
    viewedIds.current.add(id);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'increment_vue', campagne_id: id }),
      });
    } catch (_) {}
  }, []);

  // ============================================================
  // VOIX
  // ============================================================
  const speakItem = useCallback((item) => {
    if (!item) return;
    Speech.stop();
    const texte = `${item.titre || ''}. ${item.description || ''}`;
    setIsSpeaking(true);
    Speech.speak(texte, {
      language: 'fr-FR',
      rate: 0.95,
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const current = items[activeIndex];
    if (!current) return;
    incrementVue(current.id);
    if (!autoSpeak) return;
    const t = setTimeout(() => speakItem(current), 300);
    return () => {
      clearTimeout(t);
      Speech.stop();
      setIsSpeaking(false);
    };
  }, [activeIndex, autoSpeak, items, speakItem, incrementVue]);

  useEffect(() => () => Speech.stop(), []);

  // ============================================================
  // ACTIONS APPEL / SMS / WHATSAPP
  // ============================================================
  const handleCall = (telephone) => {
    if (!telephone) return Alert.alert('Info', 'Aucun numéro disponible');
    Linking.openURL(`tel:${telephone}`).catch(() =>
      Alert.alert('Erreur', 'Impossible de lancer l’appel')
    );
  };

  const handleSMS = (telephone, titre) => {
    if (!telephone) return Alert.alert('Info', 'Aucun numéro disponible');
    const sep = Platform.OS === 'ios' ? '&' : '?';
    const body = encodeURIComponent(`Bonjour, je suis intéressé(e) par : ${titre}`);
    Linking.openURL(`sms:${telephone}${sep}body=${body}`).catch(() =>
      Alert.alert('Erreur', 'Impossible d’ouvrir les SMS')
    );
  };

  const handleWhatsApp = (telephone, titre) => {
    if (!telephone) return Alert.alert('Info', 'Aucun numéro disponible');
    const phone = String(telephone).replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Bonjour, je suis intéressé(e) par : ${titre}`);
    const appUrl = `whatsapp://send?phone=${phone}&text=${text}`;
    const webUrl = `https://wa.me/${phone}?text=${text}`;
    Linking.canOpenURL(appUrl)
      .then((ok) => Linking.openURL(ok ? appUrl : webUrl))
      .catch(() => Linking.openURL(webUrl));
  };

  // ============================================================
  // ⭐ VÉRIFICATION DU PAIEMENT
  // ============================================================
  const checkPendingPayment = useCallback(async () => {
    if (!pendingCampagneId) return;

    setCheckingPayment(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verifier_campagne',
          campagne_id: pendingCampagneId,
        }),
      });
      const json = await res.json();

      if (json.success) {
        const { paye, statut_operation } = json.data;

        if (paye) {
          Alert.alert(
            '✅ Paiement confirmé',
            'Votre campagne est maintenant publiée !',
            [{ text: 'OK' }]
          );
          setPendingCampagneId(null);
          await loadCampagnes(true);
        } else if (statut_operation === 'en attente') {
          Alert.alert(
            '⏳ Paiement en attente',
            'Le paiement n\'a pas encore été confirmé par Wave. Réessayez dans quelques instants.',
            [
              { text: 'Plus tard', style: 'cancel' },
              { text: 'Revérifier', onPress: () => checkPendingPayment() },
            ]
          );
        } else {
          Alert.alert(
            'Paiement échoué',
            'Le paiement n\'a pas abouti. Vous pouvez réessayer.',
            [{ text: 'OK' }]
          );
          setPendingCampagneId(null);
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de vérifier le paiement.');
    } finally {
      setCheckingPayment(false);
    }
  }, [pendingCampagneId, loadCampagnes]);

  // ⭐ Détecter le retour via deep-link
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (!pendingCampagneId) return;
      if (url && (url.startsWith('rouah://') || url.includes('rouah.net'))) {
        setTimeout(() => checkPendingPayment(), 1000);
      }
    });
    return () => subscription.remove();
  }, [pendingCampagneId, checkPendingPayment]);

  // ⭐ Détecter le retour via AppState
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pendingCampagneId) {
        setTimeout(() => checkPendingPayment(), 1500);
      }
    });
    return () => sub.remove();
  }, [pendingCampagneId, checkPendingPayment]);

  // ============================================================
  // CRÉATION
  // ============================================================
  const openCreateModal = () => {
    if (!isLoggedIn) {
      Alert.alert('Connexion requise', 'Vous devez être connecté pour créer une campagne.');
      return;
    }
    setFormTitre('');
    setFormDescription('');
    setFormTelephone(user?.telephone || '');
    setFormWhatsapp(user?.telephone || '');
    setFormType('Promotion');
    setFormPhotoUri(null);
    setFormPhotoBase64(null);
    setListeningField(null);
    setPreviewVisible(false);
    setCreateVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Autorisez l’accès à la galerie.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setFormPhotoUri(asset.uri);
      setFormPhotoBase64(
        asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null
      );
    }
  };

  // Étape 1 : ouvrir l'aperçu
  const openPreview = () => {
    if (!formTitre.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }
    stopDictation();
    setPreviewVisible(true);
  };

  // ⭐ Étape 2 : créer + rediriger vers Wave
  const handleConfirmPublish = async () => {
    setCreating(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_campagne',
          titre: formTitre.trim(),
          description: formDescription.trim(),
          telephone: formTelephone.trim() || undefined,
          whatsapp: formWhatsapp.trim() || formTelephone.trim() || undefined,
          type_campagne: formType,
          photo: formPhotoBase64 || undefined,
          utilisateur_id: user?.utilisateur_id || user?.id || undefined,
          societe_id: societeId || undefined,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        Alert.alert('Erreur', json.message || 'Création impossible');
        return;
      }

      const { campagne, url_paiement, montant } = json.data;

      // Fermer les modales
      setPreviewVisible(false);
      setCreateVisible(false);

      // Mémoriser la campagne en attente
      setPendingCampagneId(campagne.campagne_id);

      // Demander confirmation → redirection Wave
      Alert.alert(
        'Paiement requis',
        `Votre campagne est prête.\n\nMontant : ${Number(montant).toLocaleString('fr-FR')} FCFA\n\nVous allez être redirigé vers la page de paiement sécurisée Wave.`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Payer maintenant',
            onPress: async () => {
              try {
                const supported = await Linking.canOpenURL(url_paiement);
                if (supported) {
                  await Linking.openURL(url_paiement);
                } else {
                  Alert.alert('Erreur', 'Impossible d\'ouvrir la page de paiement.');
                }
              } catch (e) {
                Alert.alert('Erreur', 'Impossible d\'ouvrir la page de paiement.');
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Erreur réseau', e.message || 'Connexion impossible');
    } finally {
      setCreating(false);
    }
  };

  // ============================================================
  // RENDU SLIDE
  // ============================================================
  const renderItem = ({ item, index }) => {
    const isActive = index === activeIndex;
    const slideH = containerHeight > 0 ? containerHeight : SCREEN_H;

    return (
      <View style={[styles.slide, { height: slideH }]}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={[styles.image, { height: slideH }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.noImage, { height: slideH }]}>
            <Ionicons name="image-outline" size={64} color="#444" />
          </View>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.55)', 'transparent']}
          style={styles.gradientTop}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.75)']}
          style={styles.gradientBottom}
          pointerEvents="none"
        />

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={openCreateModal}
            activeOpacity={0.85}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>R</Text>
            </View>
            <View style={styles.avatarPlus}>
              <Ionicons name="add" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          <SideAction
            icon="call"
            label="Appel"
            color={COLORS.call}
            onPress={() => handleCall(item.telephone)}
          />
          <SideAction
            icon="chatbubble-ellipses"
            label="SMS"
            color={COLORS.sms}
            onPress={() => handleSMS(item.telephone, item.titre)}
          />
          <SideAction
            icon="logo-whatsapp"
            label="WhatsApp"
            color={COLORS.whatsapp}
            onPress={() =>
              handleWhatsApp(item.whatsapp || item.telephone, item.titre)
            }
          />
          <SideAction
            icon={isSpeaking && isActive ? 'volume-high' : 'volume-mute'}
            label={isSpeaking && isActive ? 'Stop' : 'Écouter'}
            color={isSpeaking && isActive ? COLORS.danger : COLORS.primary}
            onPress={() => {
              if (isSpeaking && isActive) stopSpeaking();
              else speakItem(item);
            }}
          />
        </View>

        <View style={styles.bottomLeft}>
          <View style={styles.userRow}>
            <Text style={styles.username}>@rouah</Text>
            <View style={styles.followBadge}>
              <Text style={styles.followText}>
                {item.type_campagne || 'Officiel'}
              </Text>
            </View>
          </View>
          <Text style={styles.titre} numberOfLines={2}>
            {item.titre}
          </Text>
          <Text style={styles.description} numberOfLines={3}>
            {item.description}
          </Text>
          <View style={styles.musicRow}>
            <Ionicons name="musical-notes" size={13} color="#fff" />
            <Text style={styles.musicText} numberOfLines={1}>
              Rouah · Actualité
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ============================================================
  // ÉCRAN
  // ============================================================
  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) setContainerHeight(h);
      }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      <SafeAreaView style={styles.header} edges={['top']}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <Text style={styles.headerTitle}>Pour vous</Text>
        <TouchableOpacity
          onPress={() => {
            const next = !autoSpeak;
            setAutoSpeak(next);
            if (!next) stopSpeaking();
          }}
          style={styles.headerBtn}
        >
          <Ionicons
            name={autoSpeak ? 'volume-high' : 'volume-mute'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </SafeAreaView>

      {!loading && items.length > 1 && (
        <View style={styles.progressBar}>
          {items.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                i === activeIndex && styles.progressSegmentActive,
              ]}
            />
          ))}
        </View>
      )}

      {/* ⭐ Bandeau paiement en attente */}
      {pendingCampagneId && (
        <View style={styles.pendingBanner}>
          <Ionicons name="time" size={18} color="#fff" />
          <Text style={styles.pendingBannerText}>
            Campagne en attente de paiement
          </Text>
          <TouchableOpacity
            onPress={checkPendingPayment}
            disabled={checkingPayment}
            style={styles.pendingBannerBtn}
          >
            {checkingPayment ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.pendingBannerBtnText}>Revérifier</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
          <Text style={styles.loaderText}>Chargement...</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.loader}>
          <Ionicons name="newspaper-outline" size={48} color="#666" />
          <Text style={styles.loaderText}>Aucune actualité pour le moment</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadCampagnes(true)}
          >
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
          {isLoggedIn && (
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: COLORS.secondary, marginTop: 10 }]}
              onPress={openCreateModal}
            >
              <Text style={styles.retryText}>Créer une campagne</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          pagingEnabled
          snapToInterval={containerHeight || SCREEN_H}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          getItemLayout={(_, index) => ({
            length: containerHeight || SCREEN_H,
            offset: (containerHeight || SCREEN_H) * index,
            index,
          })}
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          onRefresh={() => loadCampagnes(true)}
          refreshing={refreshing}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL FORMULAIRE */}
      {/* ============================================================ */}
      <Modal
        visible={createVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          stopDictation();
          setCreateVisible(false);
        }}
      >
        <SafeAreaView style={styles.createContainer} edges={['top', 'bottom']}>
          <View style={styles.createHeader}>
            <TouchableOpacity
              onPress={() => {
                stopDictation();
                setCreateVisible(false);
              }}
              style={styles.createCloseBtn}
            >
              <Ionicons name="close" size={24} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.createTitle}>Nouvelle campagne</Text>
            <View style={{ width: 40 }} />
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.createScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={styles.photoPicker}
                onPress={pickImage}
                activeOpacity={0.85}
              >
                {formPhotoUri ? (
                  <Image source={{ uri: formPhotoUri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={36} color="#94a3b8" />
                    <Text style={styles.photoHint}>Ajouter une image</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* TITRE — micro dans l'input */}
              <Text style={styles.label}>Titre *</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputInline}
                  value={formTitre}
                  onChangeText={setFormTitre}
                  placeholder="Ex : Promotion spéciale"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  style={[
                    styles.micInline,
                    listeningField === 'titre' && styles.micInlineActive,
                  ]}
                  onPress={() =>
                    listeningField === 'titre'
                      ? stopDictation()
                      : startDictation('titre')
                  }
                >
                  <Ionicons
                    name={listeningField === 'titre' ? 'stop' : 'mic'}
                    size={18}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              {/* DESCRIPTION — micro dans l'input */}
              <Text style={styles.label}>Description</Text>
              <View style={[styles.inputWrap, styles.inputWrapMultiline]}>
                <TextInput
                  style={[styles.inputInline, styles.inputMultiline]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Décrivez votre campagne..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.micInline,
                    styles.micInlineBottom,
                    listeningField === 'description' && styles.micInlineActive,
                  ]}
                  onPress={() =>
                    listeningField === 'description'
                      ? stopDictation()
                      : startDictation('description')
                  }
                >
                  <Ionicons
                    name={listeningField === 'description' ? 'stop' : 'mic'}
                    size={18}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {TYPES_CAMPAGNE.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, formType === t && styles.typeChipActive]}
                    onPress={() => setFormType(t)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        formType === t && styles.typeChipTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Téléphone (Appel / SMS)</Text>
              <TextInput
                style={styles.inputFull}
                value={formTelephone}
                onChangeText={setFormTelephone}
                placeholder="+225..."
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>WhatsApp</Text>
              <TextInput
                style={styles.inputFull}
                value={formWhatsapp}
                onChangeText={setFormWhatsapp}
                placeholder="+225..."
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={styles.createSubmit}
                onPress={openPreview}
                activeOpacity={0.85}
              >
                <Ionicons name="eye-outline" size={20} color="#fff" />
                <Text style={styles.createSubmitText}>  Voir l’aperçu</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL APERÇU */}
      {/* ============================================================ */}
      <Modal
        visible={previewVisible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (!creating) setPreviewVisible(false);
        }}
      >
        <View style={styles.previewContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#000" />

          {formPhotoUri || formPhotoBase64 ? (
            <Image
              source={{ uri: formPhotoUri || formPhotoBase64 }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.previewImage, styles.noImage]}>
              <Ionicons name="image-outline" size={64} color="#444" />
            </View>
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={styles.gradientTop}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradientBottom}
            pointerEvents="none"
          />

          <SafeAreaView style={styles.previewBanner} edges={['top']}>
            <View style={styles.previewBannerPill}>
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={styles.previewBannerText}>APERÇU</Text>
            </View>
          </SafeAreaView>

          <View style={styles.previewContent}>
            <View style={styles.userRow}>
              <Text style={styles.username}>@rouah</Text>
              <View style={styles.followBadge}>
                <Text style={styles.followText}>{formType}</Text>
              </View>
            </View>
            <Text style={styles.titre} numberOfLines={2}>
              {formTitre}
            </Text>
            {!!formDescription && (
              <Text style={styles.description} numberOfLines={4}>
                {formDescription}
              </Text>
            )}
            {(formTelephone || formWhatsapp) && (
              <Text style={[styles.description, { marginTop: 4 }]}>
                📞 {formTelephone || formWhatsapp}
              </Text>
            )}
          </View>

          <SafeAreaView style={styles.previewActions} edges={['bottom']}>
            <TouchableOpacity
              style={styles.previewBtnSecondary}
              onPress={() => setPreviewVisible(false)}
              disabled={creating}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.previewBtnSecondaryText}>Modifier</Text>
            </TouchableOpacity>

            {/* ⭐ Bouton "Payer et publier" */}
            <TouchableOpacity
              style={[styles.previewBtnPrimary, creating && { opacity: 0.65 }]}
              onPress={handleConfirmPublish}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.previewBtnPrimaryText}>  Payer et publier</Text>
                </>
              )}
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// SIDE ACTION
// ============================================================
function SideAction({ icon, label, color, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.85, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.sideAction, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={0.9}
        style={[styles.sideBtn, { backgroundColor: color }]}
      >
        <Ionicons name={icon} size={22} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.sideLabel}>{label}</Text>
    </Animated.View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 6,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff', fontSize: 17, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  progressBar: {
    position: 'absolute', top: Platform.OS === 'ios' ? 54 : 36,
    left: 12, right: 12, zIndex: 25, flexDirection: 'row', gap: 4,
  },
  progressSegment: {
    flex: 1, height: 2.5, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  progressSegmentActive: { backgroundColor: COLORS.secondary },

  // ⭐ Bandeau paiement en attente
  pendingBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 90 : 70,
    left: 12,
    right: 12,
    zIndex: 40,
    backgroundColor: COLORS.warningBg,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  pendingBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  pendingBannerBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pendingBannerBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  slide: { width: SCREEN_W, backgroundColor: '#000', overflow: 'hidden' },
  image: { position: 'absolute', top: 0, left: 0, width: SCREEN_W },
  noImage: {
    position: 'absolute', top: 0, left: 0, width: SCREEN_W,
    backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
  },
  gradientTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  gradientBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 320 },

  rightActions: {
    position: 'absolute', right: 10, bottom: 140,
    alignItems: 'center', gap: 18, zIndex: 10,
  },
  avatarWrap: { alignItems: 'center', marginBottom: 6 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary,
    borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  avatarPlus: {
    position: 'absolute', bottom: -6, width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#000',
  },
  sideAction: { alignItems: 'center' },
  sideBtn: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 5, elevation: 6,
  },
  sideLabel: {
    color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },

  bottomLeft: {
    position: 'absolute', left: 14, right: 80,
    bottom: Platform.OS === 'ios' ? 36 : 28, zIndex: 10,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  username: {
    color: '#fff', fontSize: 15, fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3,
  },
  followBadge: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4,
  },
  followText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  titre: {
    color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 24, marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  description: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 10 },
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  musicText: { color: '#fff', fontSize: 12, fontWeight: '500', flex: 1 },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: '#aaa', fontSize: 14 },
  retryBtn: {
    marginTop: 8, paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: COLORS.primary, borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '700' },

  // ===== MODAL FORMULAIRE =====
  createContainer: { flex: 1, backgroundColor: COLORS.surface },
  createHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  createCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  createTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  createScroll: { padding: 20, paddingBottom: 40 },
  photoPicker: { alignSelf: 'center', marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  photoPreview: { width: SCREEN_W - 80, height: (SCREEN_W - 80) * 1.4, borderRadius: 16 },
  photoPlaceholder: {
    width: SCREEN_W - 80, height: (SCREEN_W - 80) * 0.6, borderRadius: 16,
    backgroundColor: COLORS.inputBg,
    borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoHint: { marginTop: 8, color: '#94a3b8', fontSize: 13 },
  label: {
    fontSize: 13, fontWeight: '600', color: '#475569',
    marginBottom: 6, marginTop: 12,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingRight: 6,
    paddingLeft: 4,
    minHeight: 48,
  },
  inputWrapMultiline: {
    alignItems: 'flex-start',
    paddingTop: 4,
    paddingBottom: 6,
  },
  inputInline: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1e293b',
  },
  inputMultiline: {
    minHeight: 90,
    paddingTop: 10,
  },
  micInline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micInlineBottom: {
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  micInlineActive: {
    backgroundColor: COLORS.danger,
  },

  inputFull: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },
  typeChipTextActive: { color: '#fff' },
  createSubmit: {
    marginTop: 28,
    backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
  },
  createSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ===== MODAL APERÇU =====
  previewContainer: { flex: 1, backgroundColor: '#000' },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: SCREEN_W,
    height: SCREEN_H,
  },
  previewBanner: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
    paddingHorizontal: 14, paddingTop: 8,
    alignItems: 'flex-start',
  },
  previewBannerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  previewBannerText: {
    color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1,
  },
  previewContent: {
    position: 'absolute',
    left: 16, right: 16, bottom: 120,
  },
  previewActions: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  previewBtnSecondary: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
  },
  previewBtnSecondaryText: {
    color: '#fff', fontWeight: '700', fontSize: 15,
  },
  previewBtnPrimary: {
    flex: 1.2, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14,
    backgroundColor: COLORS.secondary,
  },
  previewBtnPrimaryText: {
    color: '#fff', fontWeight: '800', fontSize: 15,
  },
});