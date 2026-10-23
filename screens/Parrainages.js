// Parrainage.js — Authentification Partenaire + Parrainage + Opérations + Carte ID
// Design carte premium : bordure dorée, monogramme R, QR = partenaire_id

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Share,
  Linking,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  StatusBar,
  Image,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH  = Math.min(SCREEN_WIDTH - 48, 340);
const CARD_HEIGHT = CARD_WIDTH * 1.6;

const API_URL = 'https://rouah.net/api/api-parrainage.php';
const STORAGE_KEY = '@rouah_parrainage_auth';

const COLORS = {
  primary: '#075E54',
  primaryDark: '#064239',
  primaryLight: '#E8F5E9',
  accent: '#25D366',
  background: '#f7f8fa',
  surface: '#ffffff',
  border: '#eef0f2',
  text: '#111b21',
  muted: '#667781',
  success: '#16a34a',
  danger: '#dc2626',
  whatsapp: '#25D366',
  email: '#EA4335',
  sms: '#2563EB',
  qr: '#7C3AED',
};

export default function Parrainage({ onBack }) {
  // ===== AUTH =====
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [partenaire, setPartenaire] = useState(null);
  const [token, setToken] = useState(null);

  // ===== DATA PARRAINAGE =====
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  // ===== ONGLET ACTIF =====
  const [activeTab, setActiveTab] = useState('societes');

  // ===== LOGIN FORM =====
  const [identifiant, setIdentifiant] = useState('');
  const [mdp, setMdp] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ===== ÉDITION PROFIL =====
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);

  // ===== OPÉRATIONS =====
  const [operations, setOperations] = useState([]);
  const [opLoading, setOpLoading] = useState(false);
  const [opSearch, setOpSearch] = useState('');
  const [opPage, setOpPage] = useState(1);
  const [opPagination, setOpPagination] = useState({ total: 0, total_pages: 1 });
  const [opStats, setOpStats] = useState({
    total: 0,
    total_entrees: 0,
    total_sorties: 0,
    succes: 0,
    en_attente: 0,
  });
  const searchTimeoutRef = useRef(null);

  // ===== CARTE ID =====
  const [cardFullscreenVisible, setCardFullscreenVisible] = useState(false);

  // ============================================================
  // CHARGEMENT AUTH LOCAL
  // ============================================================
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.partenaire?.partenaire_id && parsed?.token) {
            setPartenaire(parsed.partenaire);
            setToken(parsed.token);
            setIsAuthenticated(true);
            await loadParrainage(parsed.partenaire.partenaire_id, parsed.token);
            return;
          }
        }
      } catch (e) {
        console.warn('Erreur lecture storage', e);
      }
      setLoading(false);
    })();
  }, []);

  // ============================================================
  // LOGIN
  // ============================================================
  const handleLogin = async () => {
    if (!identifiant.trim() || !mdp.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner l’identifiant et le mot de passe');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          identifiant: identifiant.trim(),
          mdp: mdp.trim(),
        }),
      });
      const json = await res.json();

      if (json.success) {
        const { token: newToken, partenaire: p, ...rest } = json.data;
        setToken(newToken);
        setPartenaire(p);
        setData(rest);
        setIsAuthenticated(true);

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ token: newToken, partenaire: p })
        );
      } else {
        Alert.alert('Erreur', json.message || 'Connexion impossible');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Erreur réseau : ' + e.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // ============================================================
  // CHARGEMENT PARRAINAGE
  // ============================================================
  const loadParrainage = useCallback(async (partenaireId, authToken) => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          action: 'get_parrainage',
          partenaire_id: partenaireId,
          token: authToken,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data?.partenaire) {
          setPartenaire(json.data.partenaire);
        }
      } else {
        Alert.alert('Erreur', json.message || 'Impossible de charger les données');
        if (
          json.message?.includes('introuvable') ||
          json.message?.includes('inactif')
        ) {
          await handleLogout();
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Erreur réseau : ' + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = () => {
    if (!partenaire?.partenaire_id) return;
    setRefreshing(true);
    loadParrainage(partenaire.partenaire_id, token);
    loadOperations(opSearch, opPage);
  };

  // ============================================================
  // CHARGEMENT OPÉRATIONS
  // ============================================================
  const loadOperations = useCallback(
    async (searchTerm = '', page = 1) => {
      if (!partenaire?.partenaire_id) return;

      setOpLoading(true);
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get_operations',
            partenaire_id: partenaire.partenaire_id,
            search: searchTerm,
            page,
            per_page: 20,
          }),
        });
        const json = await res.json();

        if (json.success) {
          setOperations(json.data.operations || []);
          setOpPagination(json.data.pagination || { total: 0, total_pages: 1 });
          setOpStats(
            json.data.stats || {
              total: 0,
              total_entrees: 0,
              total_sorties: 0,
              succes: 0,
              en_attente: 0,
            }
          );
        } else {
          console.warn('[Opérations] Erreur API :', json.message);
        }
      } catch (e) {
        console.warn('[Opérations] Erreur réseau :', e.message);
      } finally {
        setOpLoading(false);
      }
    },
    [partenaire?.partenaire_id]
  );

  useEffect(() => {
    if (isAuthenticated && partenaire?.partenaire_id) {
      loadOperations(opSearch, opPage);
    }
  }, [isAuthenticated, partenaire?.partenaire_id, opPage, loadOperations]);

  const handleOpSearchChange = (text) => {
    setOpSearch(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setOpPage(1);
      loadOperations(text, 1);
    }, 500);
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = async () => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout', token }),
      });
    } catch (_) {}

    await AsyncStorage.removeItem(STORAGE_KEY);

    setIsAuthenticated(false);
    setPartenaire(null);
    setToken(null);
    setData(null);
    setIdentifiant('');
    setMdp('');
    setActiveTab('societes');

    setOperations([]);
    setOpSearch('');
    setOpPage(1);
    setOpPagination({ total: 0, total_pages: 1 });
    setOpStats({
      total: 0,
      total_entrees: 0,
      total_sorties: 0,
      succes: 0,
      en_attente: 0,
    });
  };

  // ============================================================
  // MODIFICATION PROFIL
  // ============================================================
  const openEditModal = () => {
    setNewLogin(partenaire?.login || '');
    setNewPassword('');
    setConfirmPassword('');
    setPhotoUri(partenaire?.photo || null);
    setEditModalVisible(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission refusée', 'Autorisez l’accès à la galerie.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const base64 = `data:image/jpeg;base64,${asset.base64}`;
      setPhotoUri(base64);

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_photo',
            partenaire_id: partenaire.partenaire_id,
            photo: base64,
          }),
        });
        const json = await res.json();
        if (json.success) {
          const updated = { ...partenaire, photo: json.data.photo };
          setPartenaire(updated);
          const stored = await AsyncStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.partenaire = updated;
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          }
          Alert.alert('Succès', 'Photo de profil mise à jour');
        } else {
          Alert.alert('Erreur', json.message || 'Impossible de mettre à jour la photo');
        }
      } catch (e) {
        Alert.alert('Erreur', 'Erreur réseau');
      }
    }
  };

  const handleUpdateCredentials = async () => {
    if (!newLogin.trim()) {
      Alert.alert('Erreur', 'Le login est obligatoire');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_credentials',
          partenaire_id: partenaire.partenaire_id,
          login: newLogin.trim(),
          mdp: newPassword || undefined,
          confirm_mdp: confirmPassword || undefined,
        }),
      });
      const json = await res.json();

      if (json.success) {
        const updated = { ...partenaire, login: newLogin.trim() };
        setPartenaire(updated);

        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.partenaire = updated;
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }

        Alert.alert('Succès', 'Identifiants mis à jour');
        setEditModalVisible(false);
      } else {
        Alert.alert('Erreur', json.message || 'Impossible de mettre à jour');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Erreur réseau');
    } finally {
      setIsUpdating(false);
    }
  };

  // ============================================================
  // PARTAGE
  // ============================================================
  const handleCopy = async () => {
    if (!data?.lien_parrainage) return;
    await Clipboard.setStringAsync(data.lien_parrainage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = async () => {
    const text = data?.message_partage || '';
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const fallback = `https://wa.me/?text=${encodeURIComponent(text)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      await Linking.openURL(supported ? url : fallback);
    } catch {
      Alert.alert('Erreur', 'Impossible d’ouvrir WhatsApp');
    }
  };

  const handleEmail = async () => {
    const subject = `Invitation à rejoindre Rouah`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      data?.message_partage || ''
    )}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erreur', 'Impossible d’ouvrir l’email');
    }
  };

  const handleSMS = async () => {
    const sep = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${sep}body=${encodeURIComponent(data?.message_partage || '')}`;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erreur', 'Impossible d’ouvrir les SMS');
    }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        title: 'Rejoignez-nous sur Rouah',
        message: data?.message_partage || '',
        url: data?.lien_parrainage,
      });
    } catch (e) {
      if (e.message !== 'User did not share') console.warn(e);
    }
  };

  // ============================================================
  // RENDU LOGIN
  // ============================================================
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View style={styles.loginHeader}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.loginBackBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#075E54" />
            </TouchableOpacity>
          )}
        </View>

        <KeyboardAvoidingView
          style={styles.loginContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.loginScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.loginIconWrapper}>
              <Ionicons name="people" size={42} color="#fff" />
            </View>

            <Text style={styles.loginTitle}>Espace Partenaire</Text>
            <Text style={styles.loginSubtitle}>
              Connectez-vous avec votre login, téléphone,{'\n'}
              email ou matricule pour accéder à vos parrainages
            </Text>

            <View style={styles.loginForm}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.loginInput}
                  placeholder="Login / Téléphone / Email / Matricule"
                  placeholderTextColor="#94a3b8"
                  value={identifiant}
                  onChangeText={setIdentifiant}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={[styles.loginInput, { flex: 1 }]}
                  placeholder="Mot de passe"
                  placeholderTextColor="#94a3b8"
                  value={mdp}
                  onChangeText={setMdp}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loginLoading && { opacity: 0.65 }]}
                onPress={handleLogin}
                disabled={loginLoading}
                activeOpacity={0.85}
              >
                {loginLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Se connecter</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.loginHint}>
              Vos identifiants sont ceux de votre compte partenaire Rouah
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ============================================================
  // RENDU CHARGEMENT
  // ============================================================
  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des parrainages...</Text>
      </View>
    );
  }

  const stats = data?.stats || { total: 0, ce_mois: 0, cette_annee: 0 };
  const filleuls = data?.filleuls || [];

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={openEditModal} style={styles.profileBtn}>
          {partenaire?.photo ? (
            <Image source={{ uri: partenaire.photo }} style={styles.profileAvatar} />
          ) : (
            <View style={styles.profileAvatarPlaceholder}>
              <Text style={styles.profileAvatarText}>
                {(partenaire?.nom_prenom || 'P').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.headerTitle}>Parrainages</Text>
          <Text style={styles.headerSub}>
            {partenaire?.nom_prenom || 'Partenaire'}
          </Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* STATS */}
        <View style={styles.statsRow}>
          <StatCard icon="👥" value={stats.total} label="Total filleuls" />
          <StatCard icon="📅" value={stats.ce_mois} label="Ce mois" />
          <StatCard icon="🏆" value={stats.cette_annee} label="Cette année" />
        </View>

        {/* PARTAGE */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="share-social" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Invitez vos partenaires</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Partagez ce lien : toute société qui s’inscrit via ce lien vous sera
            rattachée comme filleule.
          </Text>

          <View style={styles.linkRow}>
            <View style={styles.linkInput}>
              <Text
                style={styles.linkText}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {data?.lien_parrainage || ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.copyBtn, copied && styles.copyBtnDone]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy'}
                size={16}
                color="#fff"
              />
              <Text style={styles.copyBtnText}>
                {copied ? 'Copié !' : 'Copier'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shareGrid}>
            <ShareButton
              icon="logo-whatsapp"
              label="WhatsApp"
              color={COLORS.whatsapp}
              onPress={handleWhatsApp}
            />
            <ShareButton
              icon="mail"
              label="Email"
              color={COLORS.email}
              onPress={handleEmail}
            />
            <ShareButton
              icon="chatbubbles"
              label="SMS"
              color={COLORS.sms}
              onPress={handleSMS}
            />
            <ShareButton
              icon="share-social"
              label="Partager"
              color={COLORS.primary}
              onPress={handleNativeShare}
            />
            <ShareButton
              icon={showQR ? 'close' : 'qr-code'}
              label={showQR ? 'Masquer QR' : 'QR Code'}
              color={COLORS.qr}
              onPress={() => setShowQR((v) => !v)}
            />
            <ShareButton
              icon="card"
              label="Carte ID"
              color={COLORS.primary}
              onPress={() => setCardFullscreenVisible(true)}
            />
          </View>

          {showQR && (
            <View style={styles.qrZone}>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={data?.lien_parrainage || ''}
                  size={180}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.qrHint}>
                Scannez pour vous inscrire avec ce parrain
              </Text>
            </View>
          )}
        </View>

        {/* ONGLETS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'societes' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('societes')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'societes' ? 'people' : 'people-outline'}
              size={18}
              color={activeTab === 'societes' ? '#fff' : COLORS.primary}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'societes' && styles.tabBtnTextActive,
              ]}
            >
              Sociétés
            </Text>
            <View
              style={[
                styles.tabCount,
                activeTab === 'societes' && styles.tabCountActive,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  activeTab === 'societes' && styles.tabCountTextActive,
                ]}
              >
                {stats.total}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'operations' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('operations')}
            activeOpacity={0.8}
          >
            <Ionicons
              name={activeTab === 'operations' ? 'receipt' : 'receipt-outline'}
              size={18}
              color={activeTab === 'operations' ? '#fff' : COLORS.primary}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'operations' && styles.tabBtnTextActive,
              ]}
            >
              Opérations
            </Text>
            <View
              style={[
                styles.tabCount,
                activeTab === 'operations' && styles.tabCountActive,
              ]}
            >
              <Text
                style={[
                  styles.tabCountText,
                  activeTab === 'operations' && styles.tabCountTextActive,
                ]}
              >
                {opStats.total}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CONTENU DE L'ONGLET ACTIF */}
        {activeTab === 'societes' ? (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="people" size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Sociétés parrainées</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{stats.total}</Text>
              </View>
            </View>

            {filleuls.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="mail-open-outline" size={56} color="#d0d0d0" />
                <Text style={styles.emptyTitle}>
                  Aucun parrainage pour le moment
                </Text>
                <Text style={styles.emptyText}>
                  Partagez votre lien d’invitation ci-dessus.{'\n'}
                  Les sociétés qui s’inscriront apparaîtront ici automatiquement.
                </Text>
              </View>
            ) : (
              filleuls.map((f) => (
                <FilleulItem key={f.parrainage_id} filleul={f} />
              ))
            )}
          </View>
        ) : (
          <OperationsCard
            operations={operations}
            loading={opLoading}
            search={opSearch}
            onSearchChange={handleOpSearchChange}
            stats={opStats}
            pagination={opPagination}
            page={opPage}
            onPageChange={setOpPage}
          />
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ===== MODAL MODIFICATION PROFIL ===== */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', maxWidth: 400 }}
          >
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Modifier mon profil</Text>

              <TouchableOpacity
                onPress={pickImage}
                style={styles.photoContainer}
                activeOpacity={0.8}
              >
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera" size={32} color="#94a3b8" />
                    <Text style={styles.photoText}>Changer la photo</Text>
                  </View>
                )}
                <View style={styles.photoEditBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Login</Text>
              <TextInput
                style={styles.modalInput}
                value={newLogin}
                onChangeText={setNewLogin}
                autoCapitalize="none"
                placeholder="Nouveau login"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputLabel}>Nouveau mot de passe (optionnel)</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Laisser vide pour ne pas changer"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword((v) => !v)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeText}>
                    {showNewPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.modalInput, { flex: 1 }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirmer"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((v) => !v)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeText}>
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isUpdating && { opacity: 0.6 },
                  { marginTop: 20 },
                ]}
                onPress={handleUpdateCredentials}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginButtonText}>Enregistrer</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ===== MODAL CARTE ID PLEIN ÉCRAN ===== */}
      <Modal
        visible={cardFullscreenVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCardFullscreenVisible(false)}
      >
        <CarteVisiteFullscreen
          partenaire={partenaire}
          onClose={() => setCardFullscreenVisible(false)}
        />
      </Modal>
    </View>
  );
}

// ============================================================
// CARTE ID — Recto et verso identiques (QR partenaire_id)
// ============================================================
function CarteVisiteFullscreen({ partenaire, onClose }) {
  const [flipped, setFlipped]       = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const viewShotRef = useRef(null);

  const displayNom    = partenaire?.nom_prenom || 'Partenaire';
  const displaySigle  = partenaire?.matricule || '';
  const partenaireId  = partenaire?.partenaire_id || '';

  const flipCard = () => {
    Animated.spring(anim, {
      toValue: flipped ? 0 : 1,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setFlipped((v) => !v);
  };

  const frontInterpolate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });
  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle  = { transform: [{ rotateY: backInterpolate }] };

  // ═══ TÉLÉCHARGEMENT PNG ═══
  const saveAndShareImage = async (uri, side) => {
    try {
      const filename = `carte_${side}_${displayNom.replace(/\s/g, '_')}_${Date.now()}.png`;
      const sourceFile = new File(uri);
      const cacheDir = new Directory(Paths.cache);
      cacheDir.create({ idempotent: true });
      const destinationFile = new File(Paths.cache, filename);
      sourceFile.copy(destinationFile);
      await Sharing.shareAsync(destinationFile.uri, {
        mimeType: 'image/png',
        dialogTitle: `Carte ${side}`,
        UTI: 'public.png',
      });
      return true;
    } catch (error) {
      Alert.alert('Erreur', `Impossible de sauvegarder la carte : ${error.message}`);
      return false;
    }
  };

  const captureAndSave = async (side, shouldFlip = false) => {
    try {
      if (shouldFlip) {
        flipCard();
        await new Promise((r) => setTimeout(r, 500));
      }
      const uri = await viewShotRef.current.capture();
      return await saveAndShareImage(uri, side);
    } catch {
      return false;
    }
  };

  const printCard = async (side) => {
    try {
      setIsPrinting(true);
      let success = false;
      if (side === 'recto')      success = await captureAndSave('recto', flipped);
      else if (side === 'verso') success = await captureAndSave('verso', !flipped);
      setIsPrinting(false);
      if (!success) Alert.alert('Erreur', 'Impossible de sauvegarder la carte.');
    } catch {
      setIsPrinting(false);
      Alert.alert('Erreur', 'Impossible de sauvegarder la carte.');
    }
  };

  const printBothSides = async () => {
    try {
      setIsPrinting(true);
      const frontSuccess = await captureAndSave('recto', flipped);
      if (!frontSuccess) throw new Error('recto');
      await new Promise((r) => setTimeout(r, 1000));
      const backSuccess = await captureAndSave('verso', !flipped);
      if (!backSuccess) throw new Error('verso');
      setIsPrinting(false);
      Alert.alert('Cartes sauvegardées !', 'Le recto et le verso ont été sauvegardés.');
    } catch {
      setIsPrinting(false);
      Alert.alert('Erreur', 'Impossible de sauvegarder les cartes.');
    }
  };

  const showPrintOptions = () => {
    Alert.alert('Télécharger / Partager', 'Choisissez ce que vous souhaitez sauvegarder :', [
      { text: 'Carte (1 face)', onPress: () => printCard('carte') },
      { text: 'Recto + Verso',  onPress: printBothSides },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  // ═══════════════════════════════════════════════════════════
  //  Rendu d'une face (utilisé pour recto ET verso)
  // ═══════════════════════════════════════════════════════════
  const renderCardFace = () => (
    <>
      <View style={cardStyles.goldBorder} />

      {/* Header */}
      <View style={cardStyles.cardHeader}>
        <Text style={cardStyles.brandText}>ROUAH</Text>
        <View style={cardStyles.typePill}>
          <Text style={cardStyles.typePillText}>PARTENAIRE</Text>
        </View>
      </View>

      {/* Monogramme R */}
      <View style={cardStyles.monogramWrapper}>
        <View style={cardStyles.monogramCircle}>
          <View style={cardStyles.monogramInner}>
            <Text style={cardStyles.monogramText}>R</Text>
          </View>
        </View>
        <View style={cardStyles.monogramShine} />
      </View>

      {/* Nom + matricule */}
      <Text style={cardStyles.nameText} numberOfLines={1}>
        {displayNom}
      </Text>
      {!!displaySigle && (
        <Text style={cardStyles.matriculeText} numberOfLines={1}>
          {displaySigle}
        </Text>
      )}

      {/* Ligne dorée */}
      <View style={cardStyles.goldDivider}>
        <View style={cardStyles.goldDot} />
        <View style={cardStyles.goldLine} />
        <View style={cardStyles.goldDot} />
      </View>

      {/* QR code = partenaire_id */}
      <View style={cardStyles.qrWrapper}>
        <View style={cardStyles.qrCard}>
          <QRCode
            value={partenaireId || 'PARTENAIRE'}
            size={CARD_WIDTH * 0.42}
            color="#0B3D2E"
            backgroundColor="#FFFFFF"
          />
        </View>
      </View>

      {/* ID partenaire sous le QR */}
      <Text style={cardStyles.idText} numberOfLines={1}>
        {partenaireId}
      </Text>

      {/* Footer */}
      <View style={cardStyles.cardFooter}>
        <Text style={cardStyles.footerLabel}>EPENCIA</Text>
        <View style={cardStyles.footerBadge}>
          <Ionicons name="shield-checkmark" size={12} color="#FBBF24" />
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={cardStyles.safeContainer} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={cardStyles.header}>
        <TouchableOpacity onPress={onClose} style={cardStyles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={cardStyles.headerTitle}>Carte ID</Text>
        <View style={cardStyles.headerBtn} />
      </View>

      <ScrollView
        style={cardStyles.scrollView}
        contentContainerStyle={cardStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={cardStyles.container}>
          {/* ═══ CARTE ═══ */}
          <ViewShot
            ref={viewShotRef}
            options={{
              format: 'png',
              quality: 1,
              width: CARD_WIDTH * 2,
              height: CARD_HEIGHT * 2,
            }}
            style={cardStyles.cardWrapper}
          >
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={flipCard}
              style={cardStyles.cardWrapper}
            >
              {/* RECTO */}
              <Animated.View
                style={[
                  cardStyles.card,
                  cardStyles.cardFace,
                  frontAnimatedStyle,
                ]}
              >
                {renderCardFace()}
                <View style={cardStyles.flipHint}>
                  <Ionicons name="sync-outline" size={12} color="rgba(255,255,255,0.4)" />
                </View>
              </Animated.View>

              {/* VERSO — même contenu */}
              <Animated.View
                style={[
                  cardStyles.card,
                  cardStyles.cardFace,
                  cardStyles.cardBack,
                  backAnimatedStyle,
                ]}
              >
                {renderCardFace()}
                <View style={cardStyles.flipHint}>
                  <Ionicons name="sync-outline" size={12} color="rgba(255,255,255,0.4)" />
                </View>
              </Animated.View>
            </TouchableOpacity>
          </ViewShot>

          {/* ═══ ACTIONS ═══ */}
          <View style={cardStyles.actionsRow}>
            <TouchableOpacity
              style={[cardStyles.actionBtn, { borderColor: COLORS.primary, borderWidth: 1 }]}
              onPress={flipCard}
            >
              <Ionicons name="sync-outline" size={20} color={COLORS.primary} />
              <Text style={cardStyles.actionBtnText}>Retourner</Text>
            </TouchableOpacity>
          </View>

          {/* ═══ TÉLÉCHARGER ═══ */}
          <TouchableOpacity
            style={[cardStyles.printBtn, isPrinting && cardStyles.printBtnDisabled]}
            onPress={showPrintOptions}
            disabled={isPrinting}
          >
            <Ionicons name="download-outline" size={24} color="#fff" />
            <Text style={cardStyles.printBtnText}>
              {isPrinting ? 'Sauvegarde en cours...' : 'Télécharger / Partager'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================
function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ShareButton({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.shareBtn, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.shareBtnText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilleulItem({ filleul }) {
  const initiales = (filleul.filleul_nom || '?').charAt(0).toUpperCase();
  const dateFr = filleul.date_parrainage
    ? new Date(filleul.date_parrainage).toLocaleDateString('fr-FR')
    : '—';
  const statut = (filleul.filleul_statut || 'actif').toLowerCase();
  const isActif = statut === 'actif';

  return (
    <View style={styles.filleulItem}>
      <View style={styles.filleulAvatar}>
        <Text style={styles.filleulAvatarText}>{initiales}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.filleulName} numberOfLines={1}>
          {filleul.filleul_nom}
          {filleul.filleul_sigle ? ` · ${filleul.filleul_sigle}` : ''}
        </Text>
        <View style={styles.filleulMeta}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.muted} />
          <Text style={styles.filleulMetaText}>{dateFr}</Text>
          {!!filleul.filleul_email && (
            <>
              <Ionicons name="mail-outline" size={12} color={COLORS.muted} />
              <Text style={styles.filleulMetaText} numberOfLines={1}>
                {filleul.filleul_email}
              </Text>
            </>
          )}
        </View>
      </View>
      <View
        style={[styles.badge, isActif ? styles.badgeActif : styles.badgeInactif]}
      >
        <Text
          style={[
            styles.badgeText,
            { color: isActif ? COLORS.success : COLORS.danger },
          ]}
        >
          {statut}
        </Text>
      </View>
    </View>
  );
}

function OperationsCard({
  operations,
  loading,
  search,
  onSearchChange,
  stats,
  pagination,
  page,
  onPageChange,
}) {
  const formatMontant = (n) => Number(n || 0).toLocaleString('fr-FR') + ' F';

  const formatDate = (dateStr, heureStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      const day = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      const h = heureStr ? heureStr.substring(0, 5) : '';
      return h ? `${day} · ${h}` : day;
    } catch {
      return dateStr;
    }
  };

  const statutInfo = (statut) => {
    switch ((statut || '').toLowerCase()) {
      case 'succes': return { label: 'Payé', color: '#16a34a', bg: '#dcfce7' };
      case 'en attente': return { label: 'En attente', color: '#d97706', bg: '#fef3c7' };
      case 'echec': return { label: 'Échec', color: '#dc2626', bg: '#fee2e2' };
      default: return { label: statut || '—', color: '#64748b', bg: '#f1f5f9' };
    }
  };

  const typeIcon = (type) =>
    type === 'Entree' ? 'arrow-down-circle' : 'arrow-up-circle';
  const typeColor = (type) =>
    type === 'Entree' ? '#16a34a' : '#dc2626';

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Ionicons name="receipt" size={18} color={COLORS.primary} />
        <Text style={styles.cardTitle}>Opérations</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{stats.total}</Text>
        </View>
      </View>

      <Text style={styles.cardSubtitle}>
        Vos opérations et celles de vos sociétés filleules.
      </Text>

      <View style={styles.opStatsRow}>
        <View style={styles.opStatBox}>
          <Text style={[styles.opStatValue, { color: '#16a34a' }]}>
            {formatMontant(stats.total_entrees)}
          </Text>
          <Text style={styles.opStatLabel}>Entrées</Text>
        </View>
        <View style={styles.opStatBox}>
          <Text style={[styles.opStatValue, { color: '#dc2626' }]}>
            {formatMontant(stats.total_sorties)}
          </Text>
          <Text style={styles.opStatLabel}>Sorties</Text>
        </View>
        <View style={styles.opStatBox}>
          <Text style={[styles.opStatValue, { color: '#d97706' }]}>
            {stats.en_attente}
          </Text>
          <Text style={styles.opStatLabel}>En attente</Text>
        </View>
      </View>

      <View style={styles.opSearchWrapper}>
        <Ionicons name="search" size={18} color={COLORS.muted} />
        <TextInput
          style={styles.opSearchInput}
          placeholder="Rechercher une opération..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => onSearchChange('')} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={{ paddingVertical: 30, alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={{ marginTop: 8, color: COLORS.muted, fontSize: 13 }}>
            Chargement des opérations...
          </Text>
        </View>
      ) : operations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color="#d0d0d0" />
          <Text style={styles.emptyTitle}>
            {search ? 'Aucun résultat' : 'Aucune opération'}
          </Text>
          <Text style={styles.emptyText}>
            {search
              ? `Aucune opération ne correspond à "${search}"`
              : 'Les opérations de vos filleuls apparaîtront ici.'}
          </Text>
        </View>
      ) : (
        <>
          {operations.map((op) => {
            const st = statutInfo(op.statut);
            return (
              <View key={op.operation_id} style={styles.opItem}>
                <View
                  style={[
                    styles.opIconWrapper,
                    { backgroundColor: typeColor(op.type) + '15' },
                  ]}
                >
                  <Ionicons name={typeIcon(op.type)} size={20} color={typeColor(op.type)} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.opObjet} numberOfLines={1}>
                    {op.objet || '—'}
                  </Text>

                  <View style={styles.opMetaRow}>
                    <Text style={styles.opMetaText} numberOfLines={1}>
                      {formatDate(op.date, op.heure)}
                    </Text>
                    {!!op.societe_nom && (
                      <>
                        <Text style={styles.opMetaDot}>·</Text>
                        <Ionicons name="business" size={10} color={COLORS.muted} />
                        <Text
                          style={[styles.opMetaText, { flexShrink: 1 }]}
                          numberOfLines={1}
                        >
                          {op.societe_nom}
                        </Text>
                      </>
                    )}
                  </View>

                  {!!op.reference_reglement && (
                    <Text style={styles.opRef} numberOfLines={1}>
                      Réf : {op.reference_reglement}
                    </Text>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={[styles.opMontant, { color: typeColor(op.type) }]}>
                    {op.type === 'Entree' ? '+' : '−'} {formatMontant(op.montant)}
                  </Text>
                  <View style={[styles.opStatutBadge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.opStatutText, { color: st.color }]}>
                      {st.label}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {pagination.total_pages > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity
                style={[
                  styles.paginationBtn,
                  page <= 1 && styles.paginationBtnDisabled,
                ]}
                onPress={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={page <= 1 ? '#cbd5e1' : COLORS.primary}
                />
              </TouchableOpacity>

              <Text style={styles.paginationText}>
                Page {page} / {pagination.total_pages}
              </Text>

              <TouchableOpacity
                style={[
                  styles.paginationBtn,
                  page >= pagination.total_pages && styles.paginationBtnDisabled,
                ]}
                onPress={() => onPageChange(Math.min(pagination.total_pages, page + 1))}
                disabled={page >= pagination.total_pages}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={page >= pagination.total_pages ? '#cbd5e1' : COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ============================================================
// STYLES PARRAINAGE
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: { color: COLORS.primary, marginTop: 12, fontSize: 14 },

  // LOGIN
  loginHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  loginBackBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center',
  },
  loginContainer: { flex: 1 },
  loginScrollContent: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28, paddingBottom: 40,
  },
  loginIconWrapper: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#075E54',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#075E54', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
  },
  loginTitle: {
    fontSize: 26, fontWeight: '800', color: '#1a1a2e',
    marginBottom: 8, textAlign: 'center',
  },
  loginSubtitle: {
    fontSize: 14, color: '#6b7280', textAlign: 'center',
    lineHeight: 21, marginBottom: 32,
  },
  loginForm: { width: '100%' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
    marginBottom: 14, paddingHorizontal: 14,
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  loginInput: { flex: 1, paddingVertical: 15, fontSize: 15, color: '#1e293b' },
  eyeButton: { padding: 6 },
  eyeText: { fontSize: 18 },
  loginButton: {
    backgroundColor: '#075E54', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#075E54', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginHint: {
    marginTop: 28, fontSize: 12, color: '#94a3b8',
    textAlign: 'center', lineHeight: 18,
  },

  // HEADER PRINCIPAL
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 46, paddingBottom: 14,
    backgroundColor: COLORS.primary,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  logoutBtn: { padding: 6 },
  profileBtn: { marginRight: 4 },
  profileAvatar: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: '#fff',
  },
  profileAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  profileAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  scrollContent: { padding: 14, paddingBottom: 40 },

  // STATS & CARDS
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: {
    fontSize: 10, color: COLORS.muted, marginTop: 2,
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600',
  },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.primary, flex: 1,
  },
  cardSubtitle: {
    fontSize: 13, color: COLORS.muted, marginBottom: 14, lineHeight: 18,
  },

  linkRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  linkInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 11,
    backgroundColor: '#f8f9fa', justifyContent: 'center',
  },
  linkText: {
    fontSize: 12, color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, borderRadius: 11,
    backgroundColor: COLORS.primary, justifyContent: 'center',
  },
  copyBtnDone: { backgroundColor: COLORS.success },
  copyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 11, borderWidth: 1, backgroundColor: '#fff',
    minWidth: 100,
  },
  shareBtnText: { fontSize: 13, fontWeight: '600' },

  qrZone: {
    marginTop: 16, padding: 16, borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1, borderColor: '#e0e0e0', borderStyle: 'dashed',
    alignItems: 'center',
  },
  qrWrapper: { padding: 8, backgroundColor: '#fff', borderRadius: 10 },
  qrHint: { marginTop: 10, fontSize: 12, color: COLORS.muted },

  countBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  countBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  // ONGLETS
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 14, padding: 4, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, paddingHorizontal: 8,
    borderRadius: 10, backgroundColor: 'transparent',
  },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  tabBtnTextActive: { color: '#fff' },
  tabCount: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10,
    minWidth: 22, alignItems: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, fontWeight: '800', color: COLORS.primary },
  tabCountTextActive: { color: '#fff' },

  filleulItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, marginTop: 8,
  },
  filleulAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filleulAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  filleulName: {
    fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2,
  },
  filleulMeta: {
    flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap',
  },
  filleulMetaText: { fontSize: 11, color: COLORS.muted, marginRight: 6 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeActif: { backgroundColor: '#dcfce7' },
  badgeInactif: { backgroundColor: '#fee2e2' },
  badgeText: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
  },

  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: {
    fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 12,
  },
  emptyText: {
    fontSize: 13, color: COLORS.muted,
    textAlign: 'center', marginTop: 6, lineHeight: 18,
  },

  // OPÉRATIONS
  opStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  opStatBox: {
    flex: 1, backgroundColor: '#f8fafc', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 6,
    alignItems: 'center', borderWidth: 1, borderColor: '#eef0f2',
  },
  opStatValue: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  opStatLabel: {
    fontSize: 10, color: COLORS.muted, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },

  opSearchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f1f5f9', borderRadius: 11,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0',
  },
  opSearchInput: { flex: 1, fontSize: 14, color: COLORS.text, padding: 0 },

  opItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  opIconWrapper: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  opObjet: {
    fontSize: 13, fontWeight: '700', color: COLORS.text, flexShrink: 1,
  },
  opMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 2, flexWrap: 'nowrap',
  },
  opMetaText: { fontSize: 11, color: COLORS.muted },
  opMetaDot: { fontSize: 11, color: '#cbd5e1', marginHorizontal: 2 },
  opRef: {
    fontSize: 10, color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 2,
  },
  opMontant: { fontSize: 13, fontWeight: '800' },
  opStatutBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  opStatutText: {
    fontSize: 10, fontWeight: '700', textTransform: 'uppercase',
  },

  paginationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  paginationBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  paginationBtnDisabled: { opacity: 0.4 },
  paginationText: { fontSize: 12, fontWeight: '600', color: COLORS.muted },

  // MODAL PROFIL
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%',
  },
  modalTitle: {
    fontSize: 20, fontWeight: '700', color: '#1a1a2e',
    textAlign: 'center', marginBottom: 20,
  },
  photoContainer: {
    alignSelf: 'center', marginBottom: 20, position: 'relative',
  },
  photoPreview: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed',
  },
  photoText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  photoEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  inputLabel: {
    fontSize: 13, fontWeight: '600', color: '#475569',
    marginBottom: 6, marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#1e293b',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalCancel: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: '#64748b', fontWeight: '600' },
});

// ============================================================
// STYLES CARTE ID — Couleur unie vert foncé, recto = verso
// ============================================================
const cardStyles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#F3F4F6' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.primary,
  },
  headerBtn: { width: 32, padding: 4 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },

  scrollView: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { flexGrow: 1, paddingVertical: 20 },
  container: { alignItems: 'center', paddingVertical: 20 },

  // ═══ CARTE — couleur unie vert foncé ═══
  cardWrapper: {
    width: CARD_WIDTH, height: CARD_HEIGHT, marginBottom: 24,
  },
  card: {
    width: '100%', height: '100%',
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#0B3D2E',
    shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 12,
  },
  cardFace: {
    position: 'absolute', top: 0, left: 0,
    backfaceVisibility: 'hidden',
  },
  cardBack: {},

  // Bordure dorée
  goldBorder: {
    position: 'absolute', top: 10, left: 10, right: 10, bottom: 10,
    borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(251, 191, 36, 0.55)',
  },

  // Header
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingTop: 20,
  },
  brandText: {
    color: '#FBBF24', fontSize: 13, fontWeight: '900', letterSpacing: 3,
  },
  typePill: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  typePillText: {
    color: '#FBBF24', fontSize: 8, fontWeight: '800', letterSpacing: 1,
  },

  // Monogramme R
  monogramWrapper: {
    alignItems: 'center', marginTop: 14, position: 'relative',
  },
  monogramCircle: {
    width: 64, height: 64, borderRadius: 32, padding: 3,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1.5, borderColor: 'rgba(251, 191, 36, 0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  monogramInner: {
    width: '100%', height: '100%', borderRadius: 28,
    backgroundColor: '#0B3D2E',
    alignItems: 'center', justifyContent: 'center',
  },
  monogramText: {
    color: '#FBBF24', fontSize: 34, fontWeight: '900',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginTop: -2,
  },
  monogramShine: {
    position: 'absolute', top: 6, right: 40,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.6)',
  },

  // Nom + matricule
  nameText: {
    color: '#FFFFFF', fontSize: 20, fontWeight: '800',
    textAlign: 'center', marginTop: 10, paddingHorizontal: 20,
    letterSpacing: 0.5,
  },
  matriculeText: {
    color: 'rgba(251, 191, 36, 0.9)', fontSize: 11, fontWeight: '700',
    textAlign: 'center', marginTop: 4, letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Ligne dorée
  goldDivider: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 10, paddingHorizontal: 40,
  },
  goldLine: {
    flex: 1, height: 1, backgroundColor: 'rgba(251, 191, 36, 0.5)',
  },
  goldDot: {
    width: 4, height: 4, borderRadius: 2, backgroundColor: '#FBBF24',
  },

  // QR
  qrWrapper: {
    flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  qrCard: {
    backgroundColor: '#FFFFFF', padding: 10, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  idText: {
    color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '600',
    textAlign: 'center', marginTop: 8, letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 20,
  },

  // Footer
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 22, paddingBottom: 20, marginTop: 'auto',
  },
  footerLabel: {
    color: 'rgba(255,255,255,0.5)', fontSize: 8,
    fontWeight: '700', letterSpacing: 1.5,
  },
  footerBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)',
    alignItems: 'center', justifyContent: 'center',
  },

  flipHint: {
    position: 'absolute', bottom: 20, right: 22,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },

  // ═══ ACTIONS ═══
  actionsRow: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, width: '100%', maxWidth: 400,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, paddingHorizontal: 20,
    borderRadius: 12, backgroundColor: '#E8F5E9',
  },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.primary },

  printBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: COLORS.primary,
    paddingVertical: 14, paddingHorizontal: 30,
    borderRadius: 12, marginTop: 8, marginBottom: 20,
    width: '100%', maxWidth: 400,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  printBtnDisabled: { opacity: 0.6 },
  printBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});