// Formations.js — Responsive, mode jour, couleurs Rouah
// Vidéos YouTube lues dans l'app (iframe) — pas de redirection
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Dimensions,
  RefreshControl,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import YoutubePlayer from 'react-native-youtube-iframe';
import CertificatModal from './Certificats';

// ═══════════════════════════════════════════════════════════
//  DIMENSIONS DE RÉFÉRENCE (iPhone 11 = 375 x 812)
// ═══════════════════════════════════════════════════════════
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Helpers responsive
const wp = (percent) => (SCREEN_W * percent) / 100;
const hp = (percent) => (SCREEN_H * percent) / 100;

const fs = (size) => {
  const scale = SCREEN_W / BASE_WIDTH;
  const bounded = Math.min(Math.max(scale, 0.85), 1.35);
  return Math.round(size * bounded);
};

// ═══════════════════════════════════════════════════════════
//  COULEURS ROUAH (WhatsApp) — MODE JOUR
// ═══════════════════════════════════════════════════════════
const ROUAH = {
  primary: '#075E54',
  secondary: '#128C7E',
  accent: '#25D366',
  bg: '#ECE5DD',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F7FA',
  text: '#111B21',
  textMuted: '#667781',
  border: '#E9EDEF',
  danger: '#E53935',
  shadow: '#000',
};

// ═══════════════════════════════════════════════════════════
//  API
// ═══════════════════════════════════════════════════════════
const API_URL = 'https://rouah.net/api/api-formation.php';
const PAIEMENT_URL = 'https://rouah.net/paiement/initial';

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
function buildImageSource(item) {
  if (!item) return null;
  if (item.photo_url && /^https?:\/\//.test(item.photo_url)) {
    return { uri: item.photo_url };
  }
  if (item.photo) {
    if (typeof item.photo === 'string' && /^https?:\/\//.test(item.photo)) {
      return { uri: item.photo };
    }
    const mime = item.type_photo || 'image/jpeg';
    return { uri: `data:${mime};base64,${item.photo}` };
  }
  return null;
}

function formatPrix(prix) {
  return Number(prix || 0).toLocaleString('fr-FR');
}

function formatDuree(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h${m > 0 ? m + 'min' : ''}`;
  return `${m} min`;
}

function toArray(x) {
  return Array.isArray(x) ? x : [];
}

function normalize(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ═══════════════════════════════════════════════════════════
//  FETCH ROBUSTE
// ═══════════════════════════════════════════════════════════
async function fetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
  }
  const text = await res.text();
  if (!text || text.trim() === '') {
    throw new Error(`Réponse vide du serveur (HTTP ${res.status})`);
  }
  const trimmed = text.trim();
  if (trimmed.startsWith('<')) {
    throw new Error(`Le serveur a renvoyé du HTML au lieu de JSON (HTTP ${res.status}).`);
  }
  let json;
  try {
    json = JSON.parse(trimmed);
  } catch (e) {
    throw new Error(`Réponse JSON invalide (HTTP ${res.status}).`);
  }
  if (!res.ok && !json.message) {
    throw new Error(`Erreur HTTP ${res.status}`);
  }
  return json;
}

// ═══════════════════════════════════════════════════════════
//  APPELS API
// ═══════════════════════════════════════════════════════════
async function apiList(utilisateurId) {
  const url = `${API_URL}?action=list${
    utilisateurId ? `&utilisateur_id=${encodeURIComponent(utilisateurId)}` : ''
  }`;
  const json = await fetchJson(url);
  if (!json.success) throw new Error(json.message || 'Erreur API');
  return toArray(json.data);
}

async function apiGet(id, utilisateurId) {
  const url = `${API_URL}?action=get&id=${encodeURIComponent(id)}${
    utilisateurId ? `&utilisateur_id=${encodeURIComponent(utilisateurId)}` : ''
  }`;
  const json = await fetchJson(url);
  if (!json.success) throw new Error(json.message || 'Erreur API');
  const data = json.data || {};
  data.videos = toArray(data.videos);
  data.videos_count = data.videos.length;
  return data;
}

async function apiCreerPaiement(payload) {
  const json = await fetchJson(`${API_URL}?action=creer_paiement`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'creer_paiement', ...payload }),
  });
  if (!json.success) throw new Error(json.message || 'Erreur API');
  return json.data || {};
}

// ═══════════════════════════════════════════════════════════
//  ÉCRAN PRINCIPAL
// ═══════════════════════════════════════════════════════════
const FormationsScreen = ({ visible, onClose, societeId, user, onRequireLogin }) => {
  const { width: winW } = useWindowDimensions();
  const numColumns = winW >= 900 ? 3 : winW >= 600 ? 2 : 1;
  const cardWidth =
    numColumns === 1
      ? winW - wp(6)
      : (winW - wp(4) * (numColumns + 1)) / numColumns;

  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [activeCategorie, setActiveCategorie] = useState('Toutes');
  const [showMine, setShowMine] = useState(false);

  // ─── Chargement ───
  const chargerFormations = async (isRefresh = false) => {
  if (isRefresh) setRefreshing(true);
  else setLoading(true);
  setError('');
  try {
    // ⭐ On passe l'utilisateur_id
    const data = await apiList(user?.utilisateur_id);
    setFormations(toArray(data));
  } catch (e) {
    setError(e.message || 'Erreur de chargement');
    setFormations([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  useEffect(() => {
  if (visible === false) return;
  chargerFormations();
}, [visible, user?.utilisateur_id]);

  const categories = useMemo(() => {
    const set = new Set();
    toArray(formations).forEach((f) => {
      if (f.categorie) set.add(f.categorie);
    });
    return ['Toutes', ...Array.from(set).sort()];
  }, [formations]);

  const formationsFiltrees = useMemo(() => {
    let list = toArray(formations);
    if (showMine) {
      if (!user?.utilisateur_id) return [];
      list = list.filter((f) => f.acces === true);
    }
    if (activeCategorie !== 'Toutes') {
      list = list.filter((f) => f.categorie === activeCategorie);
    }
    const q = normalize(searchText).trim();
    if (q) {
      list = list.filter((f) => {
        const haystack = normalize(
          `${f.nom || ''} ${f.categorie || ''} ${f.diplome || ''} ${f.description || ''}`
        );
        return haystack.includes(q);
      });
    }
    return list;
  }, [formations, searchText, activeCategorie, showMine, user?.utilisateur_id]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ROUAH.primary} />

      {/* ═══ HEADER ═══ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.headerIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={fs(24)} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerLogo}>
          <Text style={styles.headerLogoText} numberOfLines={1}>
            École des Champions
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() => chargerFormations(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh" size={fs(22)} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ═══ RECHERCHE ═══ */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={fs(20)} color={ROUAH.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une formation..."
            placeholderTextColor={ROUAH.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              style={styles.searchClear}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={fs(18)} color={ROUAH.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ═══ CHIPS CATÉGORIES ═══ */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          <TouchableOpacity
            style={[styles.chip, showMine && styles.chipActive]}
            onPress={() => {
              if (!user?.utilisateur_id) {
                Alert.alert(
                  'Connexion requise',
                  'Connectez-vous pour voir vos formations.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Se connecter', onPress: () => onRequireLogin?.({}) },
                  ]
                );
                return;
              }
              setShowMine(true);
              setActiveCategorie('Toutes');
            }}
          >
            <Ionicons
              name="person-circle-outline"
              size={fs(14)}
              color={showMine ? '#fff' : ROUAH.text}
            />
            <Text style={[styles.chipText, showMine && styles.chipTextActive]}>
              Mes formations
            </Text>
          </TouchableOpacity>
          <View style={styles.chipDivider} />
          {categories.map((cat) => {
            const isActive = !showMine && activeCategorie === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => {
                  setShowMine(false);
                  setActiveCategorie(cat);
                }}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ═══ CONTENU ═══ */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => chargerFormations(true)}
            tintColor={ROUAH.primary}
            colors={[ROUAH.primary]}
          />
        }
      >
        {loading && !refreshing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={ROUAH.primary} size="large" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        )}

        {!!error && !loading && (
          <View style={styles.errorBox}>
            <Ionicons name="warning-outline" size={fs(18)} color={ROUAH.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => chargerFormations()}
            >
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && formationsFiltrees.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name="school-outline"
              size={fs(50)}
              color={ROUAH.textMuted}
            />
            <Text style={styles.emptyText}>
              {searchText
                ? 'Aucun résultat pour cette recherche'
                : showMine
                ? "Vous n'avez encore aucune formation"
                : 'Aucune formation dans cette catégorie'}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.gridContainer,
            { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
          ]}
        >
          {!loading &&
            !error &&
            formationsFiltrees.map((f) => (
              <View
                key={f.formation_id}
                style={{
                  width: cardWidth,
                  marginHorizontal: numColumns === 1 ? wp(3) : wp(2),
                  marginBottom: hp(1.8),
                }}
              >
                <FormationCard
                  formation={f}
                  cardWidth={cardWidth}
                  onPress={() => setSelected(f)}
                />
              </View>
            ))}
        </View>
      </ScrollView>

      {/* ═══ MODAL DÉTAILS ═══ */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <FormationDetailModal
            formation={selected}
            onClose={() => setSelected(null)}
            user={user}
            onRequireLogin={onRequireLogin}
          />
        )}
      </Modal>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
//  CARTE FORMATION
// ═══════════════════════════════════════════════════════════
const FormationCard = ({ formation, cardWidth, onPress }) => {
  const thumbnail = buildImageSource(formation);
  const videos = toArray(formation.videos);
  const dureeTotale =
    formation.duree_totale ||
    videos.reduce((sum, v) => sum + (v.duree_minutes || 0), 0);

  const thumbHeight = (cardWidth * 9) / 16;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.thumbnailWrapper, { height: thumbHeight }]}>
        {thumbnail ? (
          <Image source={thumbnail} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <MaterialCommunityIcons
              name="school-outline"
              size={fs(48)}
              color="#fff"
            />
          </View>
        )}
        {dureeTotale > 0 && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{formatDuree(dureeTotale)}</Text>
          </View>
        )}
        <View style={styles.videoCountBadge}>
          <Ionicons name="play" size={fs(10)} color="#fff" />
          <Text style={styles.videoCountText}>
            {formation.videos_count || videos.length || 0} vidéos
          </Text>
        </View>
        {!!formation.categorie && (
          <View style={styles.categorieBadge}>
            <Text style={styles.categorieBadgeText}>{formation.categorie}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardAvatar}>
          <Ionicons name="school" size={fs(18)} color="#fff" />
        </View>
        <View style={styles.cardTexts}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {formation.nom || 'Formation'}
          </Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {formation.categorie || ''}
            {formation.diplome ? ` · ${formation.diplome}` : ''}
          </Text>
          <Text style={styles.cardPrice}>{formatPrix(formation.prix)} FCFA</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════════
//  MODAL DÉTAILS — avec certificat
// ═══════════════════════════════════════════════════════════
const FormationDetailModal = ({ formation, onClose, user, onRequireLogin }) => {
  const { width: winW, height: winH } = useWindowDimensions();
  const heroHeight = Math.min((winW * 9) / 16, winH * 0.4);

  const [fullFormation, setFullFormation] = useState({
    ...formation,
    videos: toArray(formation.videos),
  });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(null);

  // ⭐ State local pour le certificat
  const [certificatVisible, setCertificatVisible] = useState(null);

  const utilisateurId = user?.utilisateur_id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const data = await apiGet(formation.formation_id, utilisateurId);
        if (!cancelled) {
          setFullFormation({
            ...formation,
            ...data,
            videos: toArray(data.videos),
            videos_count: toArray(data.videos).length,
          });
        }
      } catch (e) {
        if (!cancelled) {
          setFullFormation({
            ...formation,
            videos: toArray(formation.videos),
          });
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formation.formation_id, utilisateurId]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const toggleSpeech = async () => {
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
      return;
    }
    const texte = `${fullFormation.nom || ''}. ${fullFormation.description || ''}`;
    if (!texte.trim()) {
      Alert.alert('Info', 'Aucune description à lire.');
      return;
    }
    setSpeaking(true);
    Speech.speak(texte, {
      language: 'fr-FR',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const handlePayer = () => {
    if (!utilisateurId) {
      Alert.alert(
        'Connexion requise',
        'Vous devez être connecté pour payer cette formation.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Se connecter',
            onPress: () => {
              onClose();
              onRequireLogin?.({
                pendingAction: {
                  type: 'payer_formation',
                  formation: fullFormation,
                },
              });
            },
          },
        ]
      );
      return;
    }
    Alert.alert(
      'Confirmation',
      `Payer "${fullFormation.nom}" pour ${formatPrix(fullFormation.prix)} FCFA ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Payer',
          onPress: async () => {
            setPaying(true);
            try {
              const data = await apiCreerPaiement({
                utilisateur_id: utilisateurId,
                formation_id: fullFormation.formation_id,
                montant: fullFormation.prix,
                societe_id: user?.societe_id,
              });
              const operationId = data.operation_id;
              if (!operationId) {
                throw new Error("L'API n'a pas retourné d'operation_id");
              }
              const url = `${PAIEMENT_URL}/${encodeURIComponent(operationId)}`;
              const supported = await Linking.canOpenURL(url);
              if (!supported) {
                throw new Error("Impossible d'ouvrir la page de paiement");
              }
              await Linking.openURL(url);
              onClose();
            } catch (e) {
              Alert.alert('Erreur', e.message || 'Échec du paiement');
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  // ⭐ Ouvre le certificat
  const handleOpenCertificat = () => {
    const f = fullFormation;
    setCertificatVisible({
      code_certificat:
        f.code_certificat ||
        `CERT-${new Date().getFullYear()}-${String(f.formation_id)
          .slice(-6)
          .toUpperCase()}`,
      formation_nom: f.nom,
      nom_prenom:
        user?.nom_prenom || user?.nom || user?.nom_complet || 'Apprenant',
      categorie: f.categorie,
      annee_obtention: f.annee_obtention || new Date().getFullYear(),
      date_delivrance: f.date_delivrance || new Date().toISOString(),
      diplome: f.diplome,
    });
  };

  const onPlayerStateChange = useCallback((state) => {
    if (state === 'ended') {
      // Optionnel
    }
  }, []);

  const f = fullFormation;
  const videos = toArray(f.videos);
  const dureeTotale =
    f.duree_totale || videos.reduce((s, v) => s + (v.duree_minutes || 0), 0);
  const imageSource = buildImageSource(f);

  const playerHeight = Math.min((winW * 9) / 16, winH * 0.55);

  return (
    <View style={styles.detailContainer}>
      <StatusBar barStyle="light-content" backgroundColor={ROUAH.primary} />

      <View style={styles.detailHeader}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.headerIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={fs(24)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.detailHeaderTitle} numberOfLines={1}>
          {f.nom || 'Détails'}
        </Text>
        <TouchableOpacity
          onPress={toggleSpeech}
          style={styles.headerIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={speaking ? 'volume-mute' : 'volume-high'}
            size={fs(22)}
            color={speaking ? ROUAH.accent : '#fff'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.detailScroll}
        contentContainerStyle={{ paddingBottom: hp(15) }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={[styles.heroWrapper, { height: heroHeight }]}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <MaterialCommunityIcons name="school" size={fs(70)} color="#fff" />
            </View>
          )}
          <View style={styles.heroOverlay}>
            <View
              style={[
                styles.heroPlayBtn,
                {
                  width: fs(70),
                  height: fs(70),
                  borderRadius: fs(35),
                },
              ]}
            >
              <Ionicons name="play" size={fs(32)} color="#fff" />
            </View>
          </View>
          {dureeTotale > 0 && (
            <View style={styles.heroDurationBadge}>
              <Text style={styles.heroDurationText}>{formatDuree(dureeTotale)}</Text>
            </View>
          )}
        </View>

        {/* CORPS */}
        <View style={styles.detailBody}>
          <Text style={styles.detailTitle}>{f.nom || ''}</Text>

          <View style={styles.detailBadgesRow}>
            {!!f.categorie && (
              <View style={styles.badgePrimary}>
                <Text style={styles.badgePrimaryText}>{f.categorie}</Text>
              </View>
            )}
            {!!f.diplome && (
              <View style={styles.badgeSecondary}>
                <Text style={styles.badgeSecondaryText}>{f.diplome}</Text>
              </View>
            )}
            <View style={styles.badgeSecondary}>
              <Ionicons name="play-circle" size={fs(12)} color={ROUAH.secondary} />
              <Text style={styles.badgeSecondaryText}>
                {f.videos_count || videos.length} vidéos
              </Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{formatPrix(f.prix)} FCFA</Text>
            {f.acces ? (
              <View style={styles.accesBadge}>
                <Ionicons name="checkmark-circle" size={fs(16)} color={ROUAH.accent} />
                <Text style={styles.accesText}>Accès activé</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.buyButton}
                onPress={handlePayer}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cart" size={fs(16)} color="#fff" />
                    <Text style={styles.buyButtonText}>Acheter</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* ⭐ Bouton certificat si accès activé */}
          {f.acces && (
            <TouchableOpacity
  style={styles.certificatBtn}
  onPress={() => {
    setCertificatVisible({
      // ⭐ On passe uniquement ce qui est nécessaire pour l'API
      code_certificat: f.code_certificat || null,
      certificat_id: f.certificat_id || null,
      formation_id: f.formation_id,
      utilisateur_id: user?.utilisateur_id,
    });
  }}
  activeOpacity={0.85}
>
              <Ionicons name="ribbon" size={fs(20)} color="#fff" />
              <Text style={styles.certificatBtnText}>Voir mon certificat</Text>
              <Ionicons name="chevron-forward" size={fs(18)} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.ttsRow} onPress={toggleSpeech}>
            <Ionicons
              name={speaking ? 'pause-circle' : 'play-circle'}
              size={fs(22)}
              color={ROUAH.secondary}
            />
            <Text style={styles.ttsText}>
              {speaking ? 'Arrêter la lecture' : 'Écouter la description'}
            </Text>
          </TouchableOpacity>

          {!!f.description && (
            <View style={styles.descBox}>
              <Text
                style={styles.descText}
                numberOfLines={expanded ? undefined : 3}
              >
                {f.description}
              </Text>
              <TouchableOpacity onPress={() => setExpanded(!expanded)}>
                <Text style={styles.descToggle}>
                  {expanded ? 'Voir moins' : 'Voir plus'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {videos.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Programme</Text>
                <Text style={styles.sectionCount}>{videos.length} vidéos</Text>
              </View>
              {videos.map((v, idx) => (
                <TouchableOpacity
                  key={v.video_id || idx}
                  style={styles.videoItem}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!f.acces) {
                      Alert.alert(
                        'Accès verrouillé',
                        'Achetez la formation pour accéder à cette vidéo.'
                      );
                      return;
                    }
                    if (!v.youtube_id) {
                      Alert.alert('Info', 'Vidéo indisponible');
                      return;
                    }
                    setPlayingVideo({
                      youtube_id: v.youtube_id,
                      titre: v.titre || 'Vidéo',
                    });
                  }}
                >
                  <View style={styles.videoIndex}>
                    <Text style={styles.videoIndexText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.videoThumb}>
                    {v.youtube_id ? (
                      <Image
                        source={{
                          uri: `https://img.youtube.com/vi/${v.youtube_id}/mqdefault.jpg`,
                        }}
                        style={styles.videoThumbImg}
                      />
                    ) : (
                      <View style={styles.videoThumbImg} />
                    )}
                    <View style={styles.videoPlayOverlay}>
                      <Ionicons name="play" size={fs(14)} color="#fff" />
                    </View>
                  </View>
                  <View style={styles.videoInfos}>
                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {v.titre || 'Vidéo'}
                    </Text>
                    <Text style={styles.videoMeta}>
                      {formatDuree(v.duree_minutes)}
                    </Text>
                  </View>
                  {!f.acces && (
                    <Ionicons
                      name="lock-closed"
                      size={fs(16)}
                      color={ROUAH.textMuted}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          {loadingDetail && (
            <ActivityIndicator
              color={ROUAH.primary}
              style={{ marginTop: hp(2) }}
            />
          )}
        </View>
      </ScrollView>

      {!f.acces && (
        <View style={styles.floatingBar}>
          <TouchableOpacity
            style={[
              styles.floatingBtn,
              { backgroundColor: utilisateurId ? ROUAH.accent : '#9ca3af' },
            ]}
            onPress={handlePayer}
            disabled={paying}
          >
            {paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={utilisateurId ? 'cart' : 'log-in'}
                  size={fs(20)}
                  color="#fff"
                />
                <Text style={styles.floatingBtnText}>
                  {utilisateurId
                    ? `Payer ${formatPrix(f.prix)} FCFA`
                    : 'Se connecter pour payer'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ═══ PLAYER YOUTUBE ═══ */}
      <Modal
        visible={!!playingVideo}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setPlayingVideo(null)}
        supportedOrientations={['portrait', 'landscape']}
      >
        {playingVideo && (
          <View style={styles.playerContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <View style={styles.playerHeader}>
              <TouchableOpacity
                onPress={() => setPlayingVideo(null)}
                style={styles.headerIcon}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={fs(24)} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.playerTitle} numberOfLines={1}>
                {playingVideo.titre}
              </Text>
              <View style={{ width: fs(40) }} />
            </View>
            <View style={styles.playerBody}>
              <YoutubePlayer
                height={playerHeight}
                width={winW}
                play={true}
                videoId={playingVideo.youtube_id}
                onChangeState={onPlayerStateChange}
                webViewProps={{
                  allowsFullscreenVideo: true,
                  mediaPlaybackRequiresUserAction: false,
                  androidLayerType: 'hardware',
                }}
                initialPlayerParams={{
                  rel: false,
                  modestbranding: true,
                  controls: true,
                  preventFullScreen: false,
                  iv_load_policy: 3,
                }}
              />
            </View>
          </View>
        )}
      </Modal>

      {/* ═══ MODAL CERTIFICAT ═══ */}
      <Modal
        visible={!!certificatVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCertificatVisible(null)}
      >
        {certificatVisible && (
          <CertificatModal
            certificat={certificatVisible}
            onClose={() => setCertificatVisible(null)}
          />
        )}
      </Modal>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ROUAH.bg },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROUAH.primary,
    paddingHorizontal: wp(3),
    paddingTop: Platform.OS === 'ios' ? hp(5.5) : hp(4),
    paddingBottom: hp(1.2),
  },
  headerIcon: { padding: wp(1.5) },
  headerLogo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(2.5),
    gap: wp(1.5),
  },
  headerLogoText: {
    color: '#fff',
    fontSize: fs(17),
    fontWeight: '800',
    flexShrink: 1,
  },

  // ─── Recherche ───
  searchBarWrapper: {
    backgroundColor: ROUAH.primary,
    paddingHorizontal: wp(3),
    paddingBottom: hp(1.2),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: fs(24),
    paddingHorizontal: wp(3.5),
    paddingVertical: Platform.OS === 'ios' ? hp(1.2) : hp(0.7),
    gap: wp(2),
  },
  searchInput: {
    flex: 1,
    fontSize: fs(14),
    color: ROUAH.text,
    paddingVertical: hp(0.5),
  },
  searchClear: { padding: wp(0.5) },

  // ─── Chips catégories ───
  tabsContainer: {
    backgroundColor: ROUAH.primary,
    paddingBottom: hp(1.2),
  },
  tabsScroll: {
    paddingHorizontal: wp(3),
    gap: wp(2),
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.9),
    borderRadius: fs(18),
    gap: wp(1),
  },
  chipActive: { backgroundColor: ROUAH.accent },
  chipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fs(12),
    fontWeight: '700',
  },
  chipTextActive: { color: '#fff' },
  chipDivider: {
    width: 1,
    height: hp(3),
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: wp(1),
  },

  // ─── Contenu ───
  scrollView: { flex: 1, backgroundColor: ROUAH.bg },
  scrollContent: {
    paddingTop: hp(1.5),
    paddingBottom: hp(4),
  },
  gridContainer: {
    paddingHorizontal: 0,
  },
  loadingBox: { alignItems: 'center', marginTop: hp(6), gap: hp(1.5) },
  loadingText: { color: ROUAH.textMuted, fontSize: fs(13) },
  errorBox: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: wp(4),
    margin: wp(4),
    borderRadius: fs(10),
    gap: hp(1),
  },
  errorText: {
    color: ROUAH.danger,
    fontSize: fs(13),
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: hp(1),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: ROUAH.primary,
    borderRadius: fs(20),
  },
  retryText: { color: '#fff', fontWeight: '700', fontSize: fs(12) },
  emptyBox: { alignItems: 'center', marginTop: hp(8), gap: hp(1.5) },
  emptyText: {
    color: ROUAH.textMuted,
    fontSize: fs(14),
    textAlign: 'center',
    paddingHorizontal: wp(6),
  },

  // ─── Carte ───
  card: {
    backgroundColor: ROUAH.surface,
    borderRadius: fs(14),
    overflow: 'hidden',
    shadowColor: ROUAH.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  thumbnailWrapper: {
    width: '100%',
    backgroundColor: ROUAH.primary,
    position: 'relative',
  },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ROUAH.primary,
  },
  durationBadge: {
    position: 'absolute',
    bottom: hp(0.8),
    right: wp(2),
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.3),
    borderRadius: fs(4),
  },
  durationText: { color: '#fff', fontSize: fs(11), fontWeight: '700' },
  videoCountBadge: {
    position: 'absolute',
    top: hp(0.8),
    left: wp(2),
    backgroundColor: ROUAH.secondary,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: fs(10),
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  videoCountText: { color: '#fff', fontSize: fs(10), fontWeight: '700' },
  categorieBadge: {
    position: 'absolute',
    top: hp(0.8),
    right: wp(2),
    backgroundColor: ROUAH.accent,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: fs(10),
  },
  categorieBadgeText: { color: '#fff', fontSize: fs(10), fontWeight: '700' },
  cardInfo: {
    flexDirection: 'row',
    padding: wp(3),
    gap: wp(3),
    alignItems: 'flex-start',
  },
  cardAvatar: {
    width: fs(36),
    height: fs(36),
    borderRadius: fs(18),
    backgroundColor: ROUAH.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTexts: { flex: 1, minWidth: 0 },
  cardTitle: {
    color: ROUAH.text,
    fontSize: fs(14),
    fontWeight: '700',
    lineHeight: fs(19),
    marginBottom: hp(0.4),
  },
  cardMeta: {
    color: ROUAH.textMuted,
    fontSize: fs(12),
    marginBottom: hp(0.4),
  },
  cardPrice: {
    color: ROUAH.primary,
    fontSize: fs(14),
    fontWeight: '800',
  },

  // ─── Détail ───
  detailContainer: { flex: 1, backgroundColor: ROUAH.bg },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROUAH.primary,
    paddingHorizontal: wp(3),
    paddingTop: Platform.OS === 'ios' ? hp(5.5) : hp(4),
    paddingBottom: hp(1.2),
  },
  detailHeaderTitle: {
    flex: 1,
    color: '#fff',
    fontSize: fs(16),
    fontWeight: '700',
    marginLeft: wp(2.5),
  },
  detailScroll: { flex: 1 },
  heroWrapper: { position: 'relative', width: '100%' },
  heroImage: { width: '100%', height: '100%' },
  heroPlaceholder: {
    backgroundColor: ROUAH.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  heroPlayBtn: {
    backgroundColor: 'rgba(7,94,84,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDurationBadge: {
    position: 'absolute',
    bottom: hp(1.2),
    right: wp(3),
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.4),
    borderRadius: fs(4),
  },
  heroDurationText: { color: '#fff', fontSize: fs(12), fontWeight: '700' },
  detailBody: { padding: wp(4) },
  detailTitle: {
    color: ROUAH.text,
    fontSize: fs(18),
    fontWeight: '800',
    marginBottom: hp(1.5),
    lineHeight: fs(24),
  },
  detailBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(1.5),
    marginBottom: hp(1.8),
  },
  badgePrimary: {
    backgroundColor: ROUAH.primary,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: fs(12),
  },
  badgePrimaryText: { color: '#fff', fontSize: fs(11), fontWeight: '700' },
  badgeSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F3F1',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: fs(12),
    gap: wp(1),
  },
  badgeSecondaryText: {
    color: ROUAH.primary,
    fontSize: fs(11),
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.8),
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ROUAH.border,
    marginBottom: hp(1.8),
    flexWrap: 'wrap',
    gap: wp(2),
  },
  priceText: {
    color: ROUAH.primary,
    fontSize: fs(22),
    fontWeight: '900',
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROUAH.accent,
    paddingHorizontal: wp(5),
    paddingVertical: hp(1.2),
    borderRadius: fs(20),
    gap: wp(1.5),
  },
  buyButtonText: { color: '#fff', fontWeight: '800', fontSize: fs(13) },
  accesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: fs(20),
    gap: wp(1.5),
  },
  accesText: { color: '#166534', fontWeight: '800', fontSize: fs(12) },

  // ⭐ Bouton certificat
  certificatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ROUAH.primary,
    paddingVertical: hp(1.6),
    borderRadius: fs(12),
    gap: wp(2),
    marginBottom: hp(1.8),
    shadowColor: ROUAH.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    paddingHorizontal:20
  },
  certificatBtnText: {
    color: '#fff',
    fontSize: fs(15),
    fontWeight: '800',
    flex: 1,
  },

  ttsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingVertical: hp(1.5),
    marginBottom: hp(1.5),
  },
  ttsText: { color: ROUAH.primary, fontSize: fs(14), fontWeight: '700' },
  descBox: {
    backgroundColor: ROUAH.surface,
    padding: wp(3.5),
    borderRadius: fs(12),
    marginBottom: hp(2.5),
    borderWidth: 1,
    borderColor: ROUAH.border,
  },
  descText: {
    color: '#374151',
    fontSize: fs(13),
    lineHeight: fs(20),
  },
  descToggle: {
    color: ROUAH.primary,
    fontSize: fs(12),
    fontWeight: '700',
    marginTop: hp(1),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  sectionTitle: { color: ROUAH.text, fontSize: fs(15), fontWeight: '800' },
  sectionCount: { color: ROUAH.textMuted, fontSize: fs(12) },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROUAH.surface,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: fs(10),
    marginBottom: hp(1),
    gap: wp(3),
    borderWidth: 1,
    borderColor: ROUAH.border,
  },
  videoIndex: { width: fs(22), alignItems: 'center' },
  videoIndexText: {
    color: ROUAH.textMuted,
    fontSize: fs(13),
    fontWeight: '700',
  },
  videoThumb: {
    width: fs(90),
    height: fs(55),
    borderRadius: fs(6),
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: ROUAH.surfaceAlt,
  },
  videoThumbImg: { width: '100%', height: '100%' },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  videoInfos: { flex: 1, minWidth: 0 },
  videoTitle: {
    color: ROUAH.text,
    fontSize: fs(13),
    fontWeight: '600',
    marginBottom: hp(0.3),
  },
  videoMeta: { color: ROUAH.textMuted, fontSize: fs(11) },
  floatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: wp(3.5),
    backgroundColor: ROUAH.surface,
    borderTopWidth: 1,
    borderTopColor: ROUAH.border,
    shadowColor: ROUAH.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  floatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.8),
    borderRadius: fs(12),
    gap: wp(2),
    marginBottom:20
  },
  floatingBtnText: { color: '#fff', fontWeight: '800', fontSize: fs(15) },

  // ─── Player YouTube ───
  playerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: wp(3),
    paddingTop: Platform.OS === 'ios' ? hp(5.5) : hp(4),
    paddingBottom: hp(1.2),
  },
  playerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: fs(15),
    fontWeight: '700',
    marginLeft: wp(2),
    textAlign: 'center',
  },
  playerBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});

export default FormationsScreen;