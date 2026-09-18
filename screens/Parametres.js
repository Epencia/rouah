// Parametres.js - Version avec Modal Albums (Promotions) + Permissions utilisateur

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  Linking,
  Image,StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============ IMPORTS ============
import { QRCodeScanner } from './QRCode';
import RapportsCredits from './RapportsCredits';
import AlbumsScreen from './Albums';
import CarteVisite from './CarteVisite';
import CatalogueScreen from './Catalogue';
import RapportsScreen from './Rapports';
import Parrainage from './Parrainages';
import { offlineFetch } from '../services/offlineApi';

// ============ CONSTANTES API ============
const API_URL = 'https://rouah.net/api/api-parametre.php';
const QR_API_URL = 'https://rouah.net/api/api-qr.php';

const ROLES = ['Superviseur', 'Administrateur', 'Caisse', 'Comptable'];
const CAISSE_TYPES = ['caisse', 'banque', 'mobile money', 'autres'];
const ADRESSE_TYPES = ['facturation', 'livraison'];

// 👇 Modules pour les permissions
const MODULES_PERMS = [
  { key: 'Accueil',    label: 'Accueil',     icon: 'home-outline' },
  { key: 'Articles',   label: 'Articles',    icon: 'cube-outline' },
  { key: 'Comptoir',   label: 'Comptoir',    icon: 'cart-outline' },
  { key: 'Caisses',    label: 'Caisses',     icon: 'cash-outline' },
  { key: 'Parametres', label: 'Paramètres',  icon: 'settings-outline' },
];

export default function ParametresScreen({ 
  societeId, 
  user, 
  onLogout,
  activeBoutiqueId: propActiveBoutiqueId,
  setActiveBoutiqueId: propSetActiveBoutiqueId
}) {
  // ==================== ÉTATS ====================
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedDevise, setSelectedDevise] = useState('XOF');
  
  // Données
  const [societe, setSociete] = useState(null);
  const [boutiques, setBoutiques] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [devises, setDevises] = useState([]);
  const [caisses, setCaisses] = useState([]);
  const [charges, setCharges] = useState([]);
  
  // QR Code
  const [qrScannerVisible, setQrScannerVisible] = useState(false);
  const [qrSessions, setQrSessions] = useState([]);
  const [qrLoading, setQrLoading] = useState(false);
  
  // Modal QR Code
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [currentQrUrl, setCurrentQrUrl] = useState('');

  // Rapports crédits
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Albums / Promotions
  const [showAlbumsModal, setShowAlbumsModal] = useState(false);

  // Carte de visite
  const [showCarteModal, setShowCarteModal] = useState(false);

  // Catalogue
  const [showCatalogueModal, setShowCatalogueModal] = useState(false);

  // Rapports
  const [showRapportModal, setShowRapportModal] = useState(false);

  // Parrainage
  const [showParrainageModal, setShowParrainageModal] = useState(false);
  
  // State local pour la boutique active
  const [localActiveBoutiqueId, setLocalActiveBoutiqueId] = useState(propActiveBoutiqueId || null);
  
  // État pour contrôler l'ouverture/fermeture des sections
  const [sectionsOpen, setSectionsOpen] = useState({
    boutiques: false,
    utilisateurs: false,
    taxes: false,
    devises: false,
    caisses: false,
    charges: false,
    appareils: false,
  });
  
  // Formulaires
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formEntity, setFormEntity] = useState('');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // 👇 Permissions dans le formulaire utilisateur
  const [userPerms, setUserPerms] = useState({});
  const [loadingPerms, setLoadingPerms] = useState(false);

  // ==================== APPELS API ====================
  const apiCall = async (urlOrBody, maybeBody) => {
    let url = API_URL;
    let body = {};

    if (typeof urlOrBody === 'object' && urlOrBody !== null) {
      body = urlOrBody;
    } else if (typeof urlOrBody === 'string') {
      url = urlOrBody;
      body = maybeBody || {};
    }

    const json = await offlineFetch(url, {
      societe_id: societeId,
      boutique_id: localActiveBoutiqueId || undefined,
      utilisateur_id: user?.utilisateur_id,
      ...body,
    });

    if (!json.success) throw new Error(json.message || 'Erreur API');
    return json;
  };

  const qrApiCall = async (body = {}) => {
    const json = await offlineFetch(QR_API_URL, {
      societe_id: societeId,
      utilisateur_id: user?.utilisateur_id,
      ...body,
    });

    if (!json.success) throw new Error(json.message || 'Erreur API QR');
    return json;
  };

  // ==================== CHARGEMENT DES DONNÉES ====================
  const loadAllData = useCallback(async () => {
    if (!societeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [s, b, u, t, d, c, ch] = await Promise.all([
        apiCall({ action: 'get_societe' }),
        apiCall({ action: 'list_boutiques' }),
        apiCall({ action: 'list_utilisateurs' }),
        apiCall({ action: 'list_taxes' }),
        apiCall({ action: 'list_devises' }),
        apiCall({ action: 'list_caisses' }),
        apiCall({ action: 'list_charges' }),
      ]);
      
      if (s.success) setSociete(s.data);
      
      if (b.success) {
        const boutiquesData = b.data || [];
        setBoutiques(boutiquesData);
        
        if (boutiquesData.length > 0) {
          if (propActiveBoutiqueId && boutiquesData.some(b => b.boutique_id === propActiveBoutiqueId)) {
            setLocalActiveBoutiqueId(propActiveBoutiqueId);
          } else if (boutiquesData.length > 0) {
            const firstBoutiqueId = boutiquesData[0].boutique_id;
            setLocalActiveBoutiqueId(firstBoutiqueId);
            if (propSetActiveBoutiqueId) {
              propSetActiveBoutiqueId(firstBoutiqueId);
            }
          }
        }
      }
      
      if (u.success) setUtilisateurs(u.data || []);
      if (t.success) setTaxes(t.data || []);
      if (d.success) {
        setDevises(d.data || []);
        if (d.data?.length > 0) {
          const defaultDevise = d.data.find(dv => dv.devise_id === 'XOF') || d.data[0];
          setSelectedDevise(defaultDevise.devise_id);
        }
      }
      if (c.success) setCaisses(c.data || []);
      if (ch.success) setCharges(ch.data || []);
      
      await loadQrSessions();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }, [societeId, propActiveBoutiqueId, propSetActiveBoutiqueId]);

  // ==================== CHARGEMENT DES SESSIONS QR ====================
  const loadQrSessions = useCallback(async () => {
    if (!societeId || !user?.utilisateur_id) {
      setQrSessions([]);
      return;
    }
    setQrLoading(true);
    try {
      const url = `${QR_API_URL}?action=list_sessions&user_id=${user.utilisateur_id}`;
      const res = await fetch(url);
      
      const text = await res.text();
      
      let json;
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.warn('Erreur de parsing JSON:', parseError.message);
        console.warn('Réponse reçue:', text.substring(0, 200));
        setQrSessions([]);
        setQrLoading(false);
        return;
      }
      
      if (json.success) {
        setQrSessions(json.data || []);
      } else {
        console.warn('Erreur chargement sessions:', json.message);
        setQrSessions([]);
      }
    } catch (e) {
      console.warn('Erreur chargement sessions QR:', e.message);
      setQrSessions([]);
    } finally {
      setQrLoading(false);
    }
  }, [societeId, user]);

  useEffect(() => {
    loadAllData();
  }, [societeId, loadAllData]);

  // ==================== GESTION QR CODE ====================
  const handleQRScan = async (result) => {
    try {
      await AsyncStorage.setItem('qr_session', JSON.stringify(result));
      await loadQrSessions();
      Alert.alert('Succès', 'Appareil connecté avec succès !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sauvegarder la session');
    }
  };

  const disconnectDevice = async (sessionId) => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous déconnecter cet appareil ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              const json = await qrApiCall({
                action: 'logout',
                session_id: sessionId,
              });
              if (json.success) {
                Alert.alert('Succès', 'Appareil déconnecté');
                await loadQrSessions();
              } else {
                Alert.alert('Erreur', json.message || 'Échec de la déconnexion');
              }
            } catch (e) {
              Alert.alert('Erreur', e.message);
            }
          }
        }
      ]
    );
  };

  const generateQRCode = async () => {
    if (!societeId || !user?.utilisateur_id) {
      Alert.alert('Erreur', 'Veuillez vous connecter d\'abord');
      return;
    }
    try {
      const json = await qrApiCall({
        action: 'create_session',
        user_id: user.utilisateur_id,
      });
      if (json.success) {
        const qrUrl = `https://rouah.net/qr-login.php?session=${json.session_id}`;
        setCurrentQrUrl(qrUrl);
        setQrModalVisible(true);
        await loadQrSessions();
      } else {
        Alert.alert('Erreur', json.message || 'Impossible de générer le QR Code');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  // ==================== CHANGEMENT DE BOUTIQUE ====================
  const handleBoutiqueChange = (boutiqueId) => {
    setLocalActiveBoutiqueId(boutiqueId);
    if (propSetActiveBoutiqueId) {
      propSetActiveBoutiqueId(boutiqueId);
    }
    loadAllData();
  };

  // ==================== PERMISSIONS UTILISATEUR ====================
  const loadUserPermissions = async (utilisateurId) => {
    setLoadingPerms(true);
    try {
      const json = await apiCall({
        action: 'get_utilisateur_permissions',
        utilisateur_id: utilisateurId,
      });

      // Construire un objet { module: bool }
      // - Si aucune permission en base → tout à true
      // - Sinon → true seulement si action === 'Oui'
      const permsMap = {};
      if (!json.data || json.data.length === 0) {
        MODULES_PERMS.forEach((m) => { permsMap[m.key] = true; });
      } else {
        MODULES_PERMS.forEach((m) => { permsMap[m.key] = false; });
        json.data.forEach((p) => {
          if (p.statut === 'actif' && p.action === 'Oui') {
            permsMap[p.module] = true;
          }
        });
      }
      setUserPerms(permsMap);
    } catch (e) {
      console.warn('Erreur chargement permissions:', e.message);
      const init = {};
      MODULES_PERMS.forEach((m) => { init[m.key] = true; });
      setUserPerms(init);
    } finally {
      setLoadingPerms(false);
    }
  };

  const togglePermission = (moduleKey) => {
    setUserPerms((prev) => ({ ...prev, [moduleKey]: !prev[moduleKey] }));
  };

  const saveUserPermissions = async (utilisateurId) => {
    const permissions = MODULES_PERMS.map((m) => ({
      module: m.key,
      action: userPerms[m.key] === false ? 'Non' : 'Oui',
    }));

    await apiCall({
      action: 'save_utilisateur_permissions',
      utilisateur_id: utilisateurId,
      permissions,
    });
  };

  // ==================== FORMULAIRE ====================
  const openCreate = (entity) => {
    setFormEntity(entity);
    setFormMode('create');
    const defaults = {
      boutique: { nom: '', type: 'boutique', telephone: '', email: '', ville: '', adresse: '' },
      utilisateur: { nom_prenom: '', login: '', mdp: '', telephone: '', email: '', role: 'Caisse', boutique_id: '' },
      taxe: { nom: '', taux: '18', type: 'tva' },
      devise: { devise_id: '', nom: '' },
      caisse: { nom: '', type: 'caisse', boutique_id: '' },
      charge: { nom: '' },
    };
    setForm(defaults[entity] || {});

    // 👇 Reset permissions pour un nouvel utilisateur (tout coché)
    if (entity === 'utilisateur') {
      const init = {};
      MODULES_PERMS.forEach((m) => { init[m.key] = true; });
      setUserPerms(init);
    } else {
      setUserPerms({});
    }

    setShowForm(true);
  };

  const openEdit = async (entity, item) => {
    setFormEntity(entity);
    setFormMode('edit');
    setForm({ ...item });
    setShowForm(true);

    // 👇 Charger les permissions si c'est un utilisateur
    if (entity === 'utilisateur' && item?.utilisateur_id) {
      await loadUserPermissions(item.utilisateur_id);
    } else {
      setUserPerms({});
    }
  };

  const confirmDelete = (entity, id, label) => {
    Alert.alert('Supprimer', `Supprimer « ${label} » ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          const actions = {
            boutique: 'delete_boutique',
            utilisateur: 'delete_utilisateur',
            taxe: 'delete_taxe',
            devise: 'delete_devise',
            caisse: 'delete_caisse',
            charge: 'delete_charge',
          };
          const idKeys = {
            boutique: 'boutique_id',
            utilisateur: 'utilisateur_id',
            taxe: 'taxe_id',
            devise: 'devise_id',
            caisse: 'caisse_id',
            charge: 'charge_id',
          };
          try {
            const json = await apiCall({ action: actions[entity], [idKeys[entity]]: id });
            Alert.alert('Succès', json.message || 'Supprimé');
            loadAllData();
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        },
      },
    ]);
  };

  const saveForm = async () => {
    setSaving(true);
    try {
      let action = '';
      let payload = { ...form };

      if (formEntity === 'entreprise') {
        action = 'update_societe';
        delete payload.societe_id;
        delete payload.date_creation;
        delete payload.photo;
        delete payload.type_photo;
        delete payload.statut;
        
        const hasField = Object.keys(payload).some(key => payload[key] !== undefined && payload[key] !== null && payload[key] !== '');
        if (!hasField) {
          Alert.alert('Erreur', 'Aucun champ à mettre à jour');
          setSaving(false);
          return;
        }
      } else if (formEntity === 'boutique') {
        if (!form.nom?.trim()) {
          Alert.alert('Erreur', 'Nom obligatoire');
          setSaving(false);
          return;
        }
        action = formMode === 'create' ? 'create_boutique' : 'update_boutique';
      } else if (formEntity === 'utilisateur') {
        if (!form.nom_prenom?.trim() || (formMode === 'create' && !form.login?.trim())) {
          Alert.alert('Erreur', 'Nom et login obligatoires');
          setSaving(false);
          return;
        }
        action = formMode === 'create' ? 'create_utilisateur' : 'update_utilisateur';
      } else if (formEntity === 'taxe') {
        if (!form.nom?.trim()) {
          Alert.alert('Erreur', 'Nom obligatoire');
          setSaving(false);
          return;
        }
        payload.taux = parseFloat(form.taux) || 0;
        action = formMode === 'create' ? 'create_taxe' : 'update_taxe';
      } else if (formEntity === 'devise') {
        if (!form.devise_id?.trim() || !form.nom?.trim()) {
          Alert.alert('Erreur', 'Code et nom obligatoires');
          setSaving(false);
          return;
        }
        action = formMode === 'create' ? 'create_devise' : 'update_devise';
      } else if (formEntity === 'caisse') {
        if (!form.nom?.trim()) {
          Alert.alert('Erreur', 'Nom obligatoire');
          setSaving(false);
          return;
        }
        action = formMode === 'create' ? 'create_caisse' : 'update_caisse';
      } else if (formEntity === 'charge') {
        if (!form.nom?.trim()) {
          Alert.alert('Erreur', 'Nom de la charge obligatoire');
          setSaving(false);
          return;
        }
        action = formMode === 'create' ? 'create_charge' : 'update_charge';
      }

      const json = await apiCall({ action, ...payload });
      Alert.alert('Succès', json.message || (formMode === 'create' ? 'Créé' : 'Mis à jour'));

      // 👇 Enregistrer les permissions si c'est un utilisateur
      if (formEntity === 'utilisateur') {
        const userId = formMode === 'create'
          ? json.utilisateur_id
          : form.utilisateur_id;
        if (userId) {
          try {
            await saveUserPermissions(userId);
          } catch (permErr) {
            console.warn('Permissions non enregistrées:', permErr.message);
          }
        }
      }

      setShowForm(false);
      loadAllData();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const setF = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  // ==================== TOGGLE SECTION ====================
  const toggleSection = (section) => {
    setSectionsOpen(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // ==================== RENDU DES SECTIONS ====================
  const renderSectionHeader = (title, sectionKey, iconName, onAdd) => (
    <TouchableOpacity 
      style={styles.sectionHeader} 
      onPress={() => toggleSection(sectionKey)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderLeft}>
        <Ionicons name={iconName} size={22} color="#075E54" />
        <Text style={styles.settingsSection}>{title}</Text>
        <View style={styles.sectionCount}>
          <Text style={styles.sectionCountText}>
            {sectionKey === 'boutiques' ? boutiques.length :
             sectionKey === 'utilisateurs' ? utilisateurs.length :
             sectionKey === 'taxes' ? taxes.length :
             sectionKey === 'devises' ? devises.length :
             sectionKey === 'caisses' ? caisses.length :
             sectionKey === 'charges' ? charges.length :
             sectionKey === 'appareils' ? qrSessions.length : 0}
          </Text>
        </View>
      </View>
      <View style={styles.sectionHeaderRight}>
        {onAdd && (
          <TouchableOpacity onPress={onAdd} style={styles.addBtn}>
            <Ionicons name="add-circle-outline" size={24} color="#075E54" />
          </TouchableOpacity>
        )}
        <Ionicons 
          name={sectionsOpen[sectionKey] ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#999" 
        />
      </View>
    </TouchableOpacity>
  );

  // ==================== RENDU PRINCIPAL ====================
  if (loading) {
    return (
      <View style={[styles.screenContent, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screenContent}>
      <ScrollView contentContainerStyle={styles.settingsContainer}>
        {/* ===== ENTREPRISE ===== */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="business-outline" size={22} color="#075E54" />
            <Text style={styles.settingsSection}>Entreprise</Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              setFormEntity('entreprise');
              setFormMode('edit');
              setForm({ ...societe });
              setShowForm(true);
            }}
          >
            <Ionicons name="create-outline" size={20} color="#075E54" />
          </TouchableOpacity>
        </View>
        {societe ? (
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom</Text>
              <Text style={styles.infoValue}>{societe.nom || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sigle</Text>
              <Text style={styles.infoValue}>{societe.sigle || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Téléphone</Text>
              <Text style={styles.infoValue}>{societe.telephone || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{societe.email || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Adresse</Text>
              <Text style={styles.infoValue}>{societe.adresse || '—'}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Aucune entreprise</Text>
        )}

        {/* ===== APPAREILS CONNECTÉS ===== */}
        {renderSectionHeader(
          'Appareils connectés', 
          'appareils', 
          'phone-portrait-outline',
          () => generateQRCode()
        )}
        {sectionsOpen.appareils && (
          <>
            {qrLoading ? (
              <ActivityIndicator size="small" color="#075E54" style={{ marginVertical: 12 }} />
            ) : qrSessions.length > 0 ? (
              qrSessions.map((session) => (
                <View key={session.qr_session_id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.deviceInfo}>
                      <Ionicons 
                        name={session.status === 'connected' ? 'checkmark-circle' : 'time-outline'} 
                        size={20} 
                        color={session.status === 'connected' ? '#25D366' : '#F59E0B'} 
                      />
                      <Text style={styles.itemTitle}>
                        {session.device_info || 'Appareil mobile'}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: session.status === 'connected' ? '#E8F5E9' : '#fef3c7' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText, 
                        { color: session.status === 'connected' ? '#075E54' : '#d97706' }
                      ]}>
                        {session.status === 'connected' ? 'Connecté' : 'En attente'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemSub}>
                    Connecté le: {session.connected_at ? new Date(session.connected_at).toLocaleString('fr-FR') : '—'}
                  </Text>
                  <Text style={styles.itemSub}>IP: {session.ip_address || '—'}</Text>
                  {session.status === 'connected' && (
                    <View style={styles.itemActions}>
                      <TouchableOpacity 
                        onPress={() => disconnectDevice(session.qr_session_id)}
                        style={styles.disconnectBtn}
                      >
                        <Ionicons name="log-out-outline" size={16} color="#DC3545" />
                        <Text style={styles.actionDelete}>Déconnecter</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyDeviceContainer}>
                <Ionicons name="phone-portrait-outline" size={48} color="#ccc" />
                <Text style={styles.emptyDeviceText}>
                  Aucun appareil connecté
                </Text>
                <TouchableOpacity 
                  style={styles.connectButton}
                  onPress={generateQRCode}
                >
                  <Ionicons name="qr-code-outline" size={20} color="#fff" />
                  <Text style={styles.connectButtonText}>Connecter un appareil</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* ===== BOUTIQUES ===== */}
        {renderSectionHeader('Boutiques', 'boutiques', 'storefront-outline', () => openCreate('boutique'))}
        {sectionsOpen.boutiques && (
          <>
            {boutiques.map((b) => {
              const isActive = localActiveBoutiqueId === b.boutique_id;
              return (
                <View key={b.boutique_id} style={[styles.itemCard, isActive && styles.itemCardActive]}>
                  <TouchableOpacity 
                    onPress={() => handleBoutiqueChange(b.boutique_id)}
                    style={styles.itemContent}
                    disabled={isActive}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>{b.nom}</Text>
                      {isActive && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemSub}>{b.type} · {b.ville || '—'}</Text>
                    <Text style={styles.itemSub}>{b.telephone || ''}</Text>
                  </TouchableOpacity>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openEdit('boutique', b)}>
                      <Text style={styles.actionEdit}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete('boutique', b.boutique_id, b.nom)}>
                      <Text style={styles.actionDelete}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {boutiques.length === 0 && <Text style={styles.emptyText}>Aucune boutique</Text>}
          </>
        )}

        {/* ===== UTILISATEURS ===== */}
        {renderSectionHeader('Utilisateurs', 'utilisateurs', 'people-outline', () => openCreate('utilisateur'))}
        {sectionsOpen.utilisateurs && (
          <>
            {utilisateurs.map((u) => (
              <View key={u.utilisateur_id} style={styles.itemCard}>
                <View style={styles.userItem}>
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>{u.nom_prenom?.charAt(0) || '?'}</Text>
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={styles.userNom}>{u.nom_prenom}</Text>
                      <Text style={styles.userEmail}>{u.email || ''}</Text>
                      <Text style={styles.userRole}>{u.role || '—'}</Text>
                    </View>
                  </View>
                  <View style={styles.userStatus}>
                    <Switch
                      value={u.statut === 'actif'}
                      onValueChange={() => {}}
                      trackColor={{ false: '#767577', true: '#25D366' }}
                    />
                  </View>
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => openEdit('utilisateur', u)}>
                    <Text style={styles.actionEdit}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete('utilisateur', u.utilisateur_id, u.nom_prenom)}>
                    <Text style={styles.actionDelete}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {utilisateurs.length === 0 && <Text style={styles.emptyText}>Aucun utilisateur</Text>}
          </>
        )}

        {/* ===== TAXES ===== */}
        {renderSectionHeader('Taxes', 'taxes', 'pricetags-outline', () => openCreate('taxe'))}
        {sectionsOpen.taxes && (
          <>
            {taxes.map((t) => (
              <View key={t.taxe_id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{t.nom}</Text>
                  <Text style={styles.itemPrice}>{t.taux}%</Text>
                </View>
                <Text style={styles.itemSub}>{t.type}</Text>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => openEdit('taxe', t)}>
                    <Text style={styles.actionEdit}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete('taxe', t.taxe_id, t.nom)}>
                    <Text style={styles.actionDelete}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {taxes.length === 0 && <Text style={styles.emptyText}>Aucune taxe</Text>}
          </>
        )}

        {/* ===== DEVISES ===== */}
        {renderSectionHeader('Devises', 'devises', 'cash-outline', () => openCreate('devise'))}
        {sectionsOpen.devises && (
          <>
            {devises.map((devise) => {
              const isActive = selectedDevise === devise.devise_id;
              return (
                <View key={devise.devise_id} style={[styles.itemCard, isActive && styles.itemCardActive]}>
                  <TouchableOpacity
                    onPress={() => setSelectedDevise(devise.devise_id)}
                    style={styles.itemContent}
                    disabled={isActive}
                  >
                    <View style={styles.itemHeader}>
                      <Text style={styles.itemTitle}>{devise.devise_id} - {devise.nom}</Text>
                      {isActive && (
                        <View style={styles.activeBadge}>
                          <Text style={styles.activeBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemSub}>Code: {devise.devise_id}</Text>
                  </TouchableOpacity>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => openEdit('devise', devise)}>
                      <Text style={styles.actionEdit}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete('devise', devise.devise_id, devise.nom)}>
                      <Text style={styles.actionDelete}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {devises.length === 0 && <Text style={styles.emptyText}>Aucune devise</Text>}
          </>
        )}

        {/* ===== CAISSES ===== */}
        {renderSectionHeader('Caisses', 'caisses', 'wallet-outline', () => openCreate('caisse'))}
        {sectionsOpen.caisses && (
          <>
            {caisses.map((c) => (
              <View key={c.caisse_id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{c.nom}</Text>
                  <Text style={[styles.itemPrice, { color: '#25D366' }]}>{c.solde || 0} F</Text>
                </View>
                <Text style={styles.itemSub}>{c.type} · {c.boutique_nom || '—'}</Text>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => openEdit('caisse', c)}>
                    <Text style={styles.actionEdit}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    if (c.nb_transactions > 0) {
                      Alert.alert('Impossible de supprimer', `Cette caisse a ${c.nb_transactions} transaction(s) liée(s).`);
                    } else {
                      confirmDelete('caisse', c.caisse_id, c.nom);
                    }
                  }}>
                    <Text style={[styles.actionDelete, c.nb_transactions > 0 && { color: '#999' }]}>
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {caisses.length === 0 && <Text style={styles.emptyText}>Aucune caisse</Text>}
          </>
        )}

        {/* ===== CHARGES ===== */}
        {renderSectionHeader('Charges', 'charges', 'receipt-outline', () => openCreate('charge'))}
        {sectionsOpen.charges && (
          <>
            {charges.map((c) => (
              <View key={c.charge_id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{c.nom}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: c.statut === 'actif' ? '#E8F5E9' : '#f5f5f5' }]}>
                    <Text style={[styles.statusBadgeText, { color: c.statut === 'actif' ? '#075E54' : '#999' }]}>
                      {c.statut || 'actif'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.itemSub}>ID: {c.charge_id}</Text>
                <View style={styles.itemActions}>
                  <TouchableOpacity onPress={() => openEdit('charge', c)}>
                    <Text style={styles.actionEdit}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDelete('charge', c.charge_id, c.nom)}>
                    <Text style={styles.actionDelete}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {charges.length === 0 && <Text style={styles.emptyText}>Aucune charge</Text>}
          </>
        )}

        {/* ===== PARAMÈTRES GÉNÉRAUX ===== */}
        <Text style={[styles.settingsSection, { marginTop: 20 }]}>Paramètres généraux</Text>

        {/* ===== PROMOTIONS / ALBUMS ===== */}
        <TouchableOpacity style={styles.settingsItem} onPress={() => setShowAlbumsModal(true)}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="images-outline" size={24} color="#075E54" />
            <Text style={styles.settingsText}>Albums</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* ===== CATALOGUES ===== */}
        <TouchableOpacity style={styles.settingsItem} onPress={() => setShowCatalogueModal(true)}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="layers-outline" size={24} color="#075E54" />
            <Text style={styles.settingsText}>Catalogue</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* ===== CARTE DE VISITE ===== */}
        <TouchableOpacity style={styles.settingsItem} onPress={() => setShowCarteModal(true)}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="business-outline" size={24} color="#075E54" />
            <Text style={styles.settingsText}>Carte de visite</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {/* ===== PARRAINAGES ===== */}
        <TouchableOpacity style={styles.settingsItem} onPress={() => setShowParrainageModal(true)}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="person-add-outline" size={24} color="#075E54" />
            <Text style={styles.settingsText}>Parrainages</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

         {/* ===== RAPPORTS ===== */}
        <TouchableOpacity style={styles.settingsItem} onPress={() => setShowRapportModal(true)}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="bar-chart-outline" size={24} color="#075E54" />
            <Text style={styles.settingsText}>Rapports</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

         {/* ===== RAPPORTS DE CREDITS ===== */}
        <TouchableOpacity style={styles.settingsItem} onPress={() => setShowCreditModal(true)}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="document-text-outline" size={24} color="#075E54" />
            <Text style={styles.settingsText}>Rapports de crédits</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

         {/* ===== SCANNER QR CODE ===== */}
        <TouchableOpacity style={styles.settingsItem} onPress={() => setQrScannerVisible(true)}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="scan-outline" size={24} color="#075E54" />
            <Text style={styles.settingsText}>Scanner QR Code</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingsItem, styles.settingsItemLogout]} onPress={onLogout}>
          <View style={styles.settingsItemLeft}>
            <Ionicons name="log-out-outline" size={24} color="#DC3545" />
            <Text style={[styles.settingsText, { color: '#DC3545' }]}>Déconnexion</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#DC3545" />
        </TouchableOpacity>
      </ScrollView>

      {/* ===== MODAL SCANNER QR ===== */}
      <QRCodeScanner
        visible={qrScannerVisible}
        onClose={() => setQrScannerVisible(false)}
        onSuccess={handleQRScan}
        userId={user?.utilisateur_id}
      />

      {/* ===== MODAL AFFICHAGE QR CODE ===== */}
      <Modal 
        visible={qrModalVisible} 
        animationType="fade" 
        transparent={true}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrModalTitle}>Scanner ce QR Code</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.qrModalSubtitle}>
              Ouvrez l'application mobile et scannez ce code pour connecter l'appareil.
            </Text>

            <View style={styles.qrCodeContainer}>
              <Image 
                source={{ 
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentQrUrl)}` 
                }}
                style={styles.qrCodeImage}
                resizeMode="contain"
              />
            </View>

            <TouchableOpacity 
              style={styles.qrCloseButton}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.qrCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

       {/* ===== MODAL PARRAINAGE ===== */}
      <Modal 
        visible={showParrainageModal} 
        animationType="slide" 
        statusBarTranslucent={true}
  navigationBarTranslucent={true}
        onRequestClose={() => setShowParrainageModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#f5f7fb' }}>
          <Parrainage
            societeId={societeId}
             user={user}
            onBack={() => setShowParrainageModal(false)}
            isModal={true}
          />
        </View>
      </Modal>

       {/* ===== MODAL RAPPORTS ===== */}
      <Modal 
        visible={showRapportModal} 
        animationType="slide" 
        statusBarTranslucent={true}
  navigationBarTranslucent={true}
        onRequestClose={() => setShowRapportModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#f5f7fb' }}>
          <RapportsScreen
            societeId={societeId}
             boutiqueId={localActiveBoutiqueId}
            onBack={() => setShowRapportModal(false)}
            isModal={true}
          />
        </View>
      </Modal>

      {/* ===== MODAL RAPPORT DE CRÉDIT ===== */}
      <Modal 
        visible={showCreditModal} 
        animationType="slide" 
        statusBarTranslucent={true}
  navigationBarTranslucent={true}
        onRequestClose={() => setShowCreditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#f5f7fb' }}>
          <RapportsCredits 
            societeId={societeId}
            onClose={() => setShowCreditModal(false)}
            user={user}
            isModal={true}
          />
        </View>
      </Modal>

      {/* ===== MODAL ALBUMS / PROMOTIONS ===== */}
      <Modal
        visible={showAlbumsModal}
        animationType="slide"
        statusBarTranslucent={true}
  navigationBarTranslucent={true}
        onRequestClose={() => setShowAlbumsModal(false)}
      >
        <View style={styles.albumsModalWrapper}>
          <View style={styles.albumsModalHeader}>
            <Text style={styles.albumsModalTitle}>Albums</Text>
            <TouchableOpacity onPress={() => setShowAlbumsModal(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <AlbumsScreen
              societeId={societeId}
              boutiqueId={localActiveBoutiqueId}
              user={user}
              onChanged={() => {}}
            />
          </View>
        </View>
      </Modal>

      {/* ===== MODAL CARTE DE VISITE ===== */}
      <Modal
        visible={showCarteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCarteModal(false)}
      >
        <View style={styles.albumsModalWrapper}>
          <View style={styles.albumsModalHeader}>
            <Text style={styles.albumsModalTitle}>Carte de visite</Text>
            <TouchableOpacity onPress={() => setShowCarteModal(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <CarteVisite
              societeNom={societe?.nom || 'Ma Société'}
              sigle={societe?.sigle || ''}
              catalogueUrl={`https://rouah.net/app/catalogue/${societe?.societe_id}`}
              onColorChange={(color) => console.log(color.id)}
            />
          </View>
        </View>
      </Modal>

      {/* ===== MODAL CATALOGUE ===== */}
      <Modal
        visible={showCatalogueModal}
        animationType="slide"
        statusBarTranslucent={true}
  navigationBarTranslucent={true}
        onRequestClose={() => setShowCatalogueModal(false)}
      >
        <View style={styles.albumsModalWrapper}>
          <View style={styles.albumsModalHeader}>
            <Text style={styles.albumsModalTitle}>Catalogue</Text>
            <TouchableOpacity onPress={() => setShowCatalogueModal(false)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <CatalogueScreen
              societeId={societeId}
              societeNom={societe?.nom || 'Ma Société'}
              boutiqueId={localActiveBoutiqueId}
              user={user}
              onChanged={() => {}}
            />
          </View>
        </View>
      </Modal>

      {/* ===== MODAL FORMULAIRE ===== */}
      <Modal visible={showForm} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {formMode === 'create' ? 'Ajouter' : 'Modifier'} {formEntity === 'entreprise' ? 'entreprise' : formEntity === 'boutique' ? 'boutique' : formEntity === 'utilisateur' ? 'utilisateur' : formEntity === 'taxe' ? 'taxe' : formEntity === 'devise' ? 'devise' : formEntity === 'charge' ? 'charge' : 'caisse'}
            </Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Entreprise */}
            {formEntity === 'entreprise' && (
              <>
                <Text style={styles.modalLabel}>Nom *</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={form.nom || ''} 
                  onChangeText={(v) => setF('nom', v)} 
                  placeholderTextColor="#999" 
                />
                
                <Text style={styles.modalLabel}>Sigle</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={form.sigle || ''} 
                  onChangeText={(v) => setF('sigle', v)} 
                  placeholderTextColor="#999" 
                />
                
                <Text style={styles.modalLabel}>Téléphone</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={form.telephone || ''} 
                  onChangeText={(v) => setF('telephone', v)} 
                  placeholderTextColor="#999" 
                  keyboardType="phone-pad"
                />
                
                <Text style={styles.modalLabel}>Email</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={form.email || ''} 
                  onChangeText={(v) => setF('email', v)} 
                  placeholderTextColor="#999" 
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                
                <Text style={styles.modalLabel}>Registre de commerce</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={form.registre_commerce || ''} 
                  onChangeText={(v) => setF('registre_commerce', v)} 
                  placeholderTextColor="#999" 
                />
                
                <Text style={styles.modalLabel}>Compte contribuable</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={form.compte_contribuable || ''} 
                  onChangeText={(v) => setF('compte_contribuable', v)} 
                  placeholderTextColor="#999" 
                />
                
                <Text style={styles.modalLabel}>Régime d'imposition</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={form.regime_imposition || ''} 
                  onChangeText={(v) => setF('regime_imposition', v)} 
                  placeholderTextColor="#999" 
                />
                
                <Text style={styles.modalLabel}>Centre d'impôt</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={form.centre_impot || ''} 
                  onChangeText={(v) => setF('centre_impot', v)} 
                  placeholderTextColor="#999" 
                />
                
                <Text style={styles.modalLabel}>Adresse</Text>
                <TextInput 
                  style={[styles.modalInput, styles.modalTextArea]} 
                  value={form.adresse || ''} 
                  onChangeText={(v) => setF('adresse', v)} 
                  placeholderTextColor="#999" 
                  multiline
                  numberOfLines={3}
                />
                
                <Text style={styles.modalLabel}>Propriétaire</Text>
                <TextInput 
                  style={styles.modalInput} 
                  value={form.proprietaire || ''} 
                  onChangeText={(v) => setF('proprietaire', v)} 
                  placeholderTextColor="#999" 
                />
              </>
            )}

            {/* Boutique */}
            {formEntity === 'boutique' && (
              <>
                <Text style={styles.modalLabel}>Nom *</Text>
                <TextInput style={styles.modalInput} value={form.nom || ''} onChangeText={(v) => setF('nom', v)} placeholderTextColor="#999" />
                <Text style={styles.modalLabel}>Type</Text>
                <View style={styles.chipsRow}>
                  {['boutique', 'entrepot', 'depot'].map((t) => (
                    <TouchableOpacity key={t} style={[styles.chip, form.type === t && styles.chipActive]} onPress={() => setF('type', t)}>
                      <Text style={[styles.chipText, form.type === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {['telephone', 'email', 'ville', 'adresse'].map((k) => (
                  <View key={k}>
                    <Text style={styles.modalLabel}>{k.toUpperCase()}</Text>
                    <TextInput style={styles.modalInput} value={String(form[k] ?? '')} onChangeText={(v) => setF(k, v)} placeholderTextColor="#999" />
                  </View>
                ))}
              </>
            )}

            {/* Utilisateur */}
            {formEntity === 'utilisateur' && (
              <>
                <Text style={styles.modalLabel}>Nom prénom *</Text>
                <TextInput style={styles.modalInput} value={form.nom_prenom || ''} onChangeText={(v) => setF('nom_prenom', v)} placeholderTextColor="#999" />
                {formMode === 'create' && (
                  <>
                    <Text style={styles.modalLabel}>Login *</Text>
                    <TextInput style={styles.modalInput} value={form.login || ''} onChangeText={(v) => setF('login', v)} autoCapitalize="none" placeholderTextColor="#999" />
                  </>
                )}
                <Text style={styles.modalLabel}>Mot de passe {formMode === 'edit' ? '(laisser vide = inchangé)' : '*'}</Text>
                <TextInput style={styles.modalInput} value={form.mdp || ''} onChangeText={(v) => setF('mdp', v)} secureTextEntry placeholderTextColor="#999" />
                <Text style={styles.modalLabel}>Rôle</Text>
                <View style={styles.chipsRow}>
                  {ROLES.map((r) => (
                    <TouchableOpacity key={r} style={[styles.chip, form.role === r && styles.chipActive]} onPress={() => setF('role', r)}>
                      <Text style={[styles.chipText, form.role === r && styles.chipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.modalLabel}>Boutique</Text>
                <View style={styles.chipsRow}>
                  <TouchableOpacity style={[styles.chip, !form.boutique_id && styles.chipActive]} onPress={() => setF('boutique_id', null)}>
                    <Text style={[styles.chipText, !form.boutique_id && styles.chipTextActive]}>Aucune</Text>
                  </TouchableOpacity>
                  {boutiques.map((b) => (
                    <TouchableOpacity key={b.boutique_id} style={[styles.chip, form.boutique_id === b.boutique_id && styles.chipActive]} onPress={() => setF('boutique_id', b.boutique_id)}>
                      <Text style={[styles.chipText, form.boutique_id === b.boutique_id && styles.chipTextActive]}>{b.nom}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {['telephone', 'email'].map((k) => (
                  <View key={k}>
                    <Text style={styles.modalLabel}>{k.toUpperCase()}</Text>
                    <TextInput style={styles.modalInput} value={String(form[k] ?? '')} onChangeText={(v) => setF(k, v)} placeholderTextColor="#999" />
                  </View>
                ))}

                {/* ===== PERMISSIONS ===== */}
                <Text style={[styles.modalLabel, { marginTop: 20, fontSize: 14 }]}>
                  Permissions par module
                </Text>
                <Text style={{ fontSize: 12, color: '#999', marginBottom: 10, lineHeight: 16 }}>
                  Cochez les modules auxquels l'utilisateur a accès. Si aucune case n'est cochée, tous les modules restent accessibles.
                </Text>

                {loadingPerms ? (
                  <ActivityIndicator color="#075E54" style={{ marginVertical: 12 }} />
                ) : (
                  MODULES_PERMS.map((m) => {
                    const isAllowed = userPerms[m.key] !== false;
                    return (
                      <TouchableOpacity
                        key={m.key}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isAllowed ? '#bbf7d0' : '#e0e0e0',
                          backgroundColor: isAllowed ? '#f0fdf4' : '#fafafa',
                          marginBottom: 8,
                        }}
                        onPress={() => togglePermission(m.key)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Ionicons
                            name={m.icon}
                            size={20}
                            color={isAllowed ? '#075E54' : '#999'}
                          />
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '600',
                              color: isAllowed ? '#075E54' : '#999',
                            }}
                          >
                            {m.label}
                          </Text>
                        </View>

                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            borderWidth: 2,
                            borderColor: isAllowed ? '#075E54' : '#ccc',
                            backgroundColor: isAllowed ? '#075E54' : '#fff',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isAllowed && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            )}

            {/* Taxe */}
            {formEntity === 'taxe' && (
              <>
                <Text style={styles.modalLabel}>Nom *</Text>
                <TextInput style={styles.modalInput} value={form.nom || ''} onChangeText={(v) => setF('nom', v)} placeholderTextColor="#999" />
                <Text style={styles.modalLabel}>Taux (%)</Text>
                <TextInput style={styles.modalInput} value={String(form.taux ?? '')} onChangeText={(v) => setF('taux', v)} keyboardType="numeric" placeholderTextColor="#999" />
                <Text style={styles.modalLabel}>Type</Text>
                <View style={styles.chipsRow}>
                  {['tva', 'remise', 'rabais', 'ristourne', 'frais'].map((t) => (
                    <TouchableOpacity key={t} style={[styles.chip, form.type === t && styles.chipActive]} onPress={() => setF('type', t)}>
                      <Text style={[styles.chipText, form.type === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Devise */}
            {formEntity === 'devise' && (
              <>
                <Text style={styles.modalLabel}>Code (ex: XOF) *</Text>
                <TextInput style={styles.modalInput} value={form.devise_id || ''} onChangeText={(v) => setF('devise_id', v.toUpperCase())} maxLength={5} editable={formMode === 'create'} placeholderTextColor="#999" />
                <Text style={styles.modalLabel}>Nom *</Text>
                <TextInput style={styles.modalInput} value={form.nom || ''} onChangeText={(v) => setF('nom', v)} placeholderTextColor="#999" />
              </>
            )}

            {/* Caisse */}
            {formEntity === 'caisse' && (
              <>
                <Text style={styles.modalLabel}>Nom *</Text>
                <TextInput style={styles.modalInput} value={form.nom || ''} onChangeText={(v) => setF('nom', v)} placeholderTextColor="#999" />
                <Text style={styles.modalLabel}>Type</Text>
                <View style={styles.chipsRow}>
                  {CAISSE_TYPES.map((t) => (
                    <TouchableOpacity key={t} style={[styles.chip, form.type === t && styles.chipActive]} onPress={() => setF('type', t)}>
                      <Text style={[styles.chipText, form.type === t && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.modalLabel}>Boutique</Text>
                <View style={styles.chipsRow}>
                  <TouchableOpacity style={[styles.chip, !form.boutique_id && styles.chipActive]} onPress={() => setF('boutique_id', null)}>
                    <Text style={[styles.chipText, !form.boutique_id && styles.chipTextActive]}>Aucune</Text>
                  </TouchableOpacity>
                  {boutiques.map((b) => (
                    <TouchableOpacity key={b.boutique_id} style={[styles.chip, form.boutique_id === b.boutique_id && styles.chipActive]} onPress={() => setF('boutique_id', b.boutique_id)}>
                      <Text style={[styles.chipText, form.boutique_id === b.boutique_id && styles.chipTextActive]}>{b.nom}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Charge */}
            {formEntity === 'charge' && (
              <>
                <Text style={styles.modalLabel}>Nom de la charge *</Text>
                <TextInput style={styles.modalInput} value={form.nom || ''} onChangeText={(v) => setF('nom', v)} placeholderTextColor="#999" />
                <Text style={styles.modalLabel}>Statut</Text>
                <View style={styles.chipsRow}>
                  {['actif', 'inactif'].map((s) => (
                    <TouchableOpacity key={s} style={[styles.chip, form.statut === s && styles.chipActive]} onPress={() => setF('statut', s)}>
                      <Text style={[styles.chipText, form.statut === s && styles.chipTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]} onPress={saveForm} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSaveBtnText}>{formMode === 'create' ? 'Créer' : 'Enregistrer'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  screenContent: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#075E54', marginTop: 12, fontSize: 16 },
  
  settingsContainer: { padding: 16, paddingBottom: 40 },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  sectionHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  sectionCount: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  sectionCountText: { fontSize: 10, fontWeight: '600', color: '#075E54' },
  addBtn: { marginRight: 10 },
  settingsSection: { fontSize: 16, fontWeight: 'bold', color: '#075E54', marginLeft: 10 },
  
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  infoLabel: { fontSize: 13, color: '#666' },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '500' },
  
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  itemCardActive: { borderColor: '#075E54', borderWidth: 2 },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#075E54' },
  itemSub: { fontSize: 12, color: '#999', marginTop: 2 },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionEdit: { color: '#075E54', fontWeight: '600', fontSize: 13 },
  actionDelete: { color: '#DC3545', fontWeight: '600', fontSize: 13 },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  
  activeBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  activeBadgeText: { color: '#075E54', fontSize: 10, fontWeight: '600' },
  
  userItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#075E54',
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  userDetails: { marginLeft: 10 },
  userNom: { fontSize: 14, fontWeight: '500', color: '#333' },
  userEmail: { fontSize: 11, color: '#666' },
  userRole: { fontSize: 10, color: '#999' },
  userStatus: { marginLeft: 12 },
  
  deviseContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  deviseItem: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#f0f0f0', marginRight: 6, marginBottom: 6,
    borderWidth: 1, borderColor: 'transparent',
  },
  deviseItemActive: { backgroundColor: '#E8F5E9', borderColor: '#075E54' },
  deviseText: { fontSize: 12, color: '#666' },
  deviseTextActive: { color: '#075E54', fontWeight: '600' },
  
  settingsItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  settingsItemLeft: { flexDirection: 'row', alignItems: 'center' },
  settingsText: { fontSize: 16, color: '#333', marginLeft: 12 },
  settingsItemLogout: { borderBottomWidth: 0, marginTop: 8 },
  
  emptyText: { textAlign: 'center', color: '#999', fontSize: 14, marginTop: 4, marginBottom: 8 },
  
  deviceInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disconnectBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyDeviceContainer: {
    alignItems: 'center', paddingVertical: 24, backgroundColor: '#f8f9fa',
    borderRadius: 12, marginBottom: 10,
  },
  emptyDeviceText: { color: '#999', fontSize: 14, marginTop: 8, marginBottom: 12 },
  connectButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#075E54',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, gap: 8,
  },
  connectButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  
  // Modal styles
  modalWrapper: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    backgroundColor:'#075E54'
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  modalBody: { padding: 20, paddingBottom: 30 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4, marginTop: 12 },
  modalInput: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: '#333', backgroundColor: '#fafafa',
  },
  modalTextArea: { minHeight: 80, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f0f0' },
  chipActive: { backgroundColor: '#075E54' },
  chipText: { fontSize: 12, color: '#666' },
  chipTextActive: { color: '#fff' },
  modalSaveBtn: {
    backgroundColor: '#075E54', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 20,
  },
  modalSaveBtnDisabled: { opacity: 0.7 },
  modalSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Styles Modal QR Code
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#075E54',
  },
  qrModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  qrCodeContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 16,
  },
  qrCodeImage: {
    width: 250,
    height: 250,
  },
  qrCloseButton: {
    backgroundColor: '#075E54',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  qrCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Styles Modal Albums / Promotions
  albumsModalWrapper: {
    flex: 1,
    backgroundColor: '#075E54',
  },
  albumsModalHeader: {
     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    backgroundColor:'#075E54'
  },
  albumsModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});