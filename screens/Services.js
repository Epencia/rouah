// Services.js — Toutes les formules payantes sont mensuelles
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// ═══════════════════════════════════════════════════════════
//  PALETTE ROUAH
// ═══════════════════════════════════════════════════════════
const ROUAH = {
  primary:     '#075E54',
  primarySoft: '#0A7A6C',
  accent:      '#25D366',
  accentSoft:  '#DCF8C6',
  bg:          '#F0F2F5',
  surface:     '#FFFFFF',
  text:        '#111B21',
  textSoft:    '#3B4A54',
  muted:       '#667781',
  border:      '#E9EDEF',
  danger:      '#EF4444',
  warning:     '#F59E0B',
};

// Couleurs par forfait
const FORFAIT_COLORS = {
  abo_standard:   { main: '#4A90E2', light: '#E8F0FE' },
  abo_business:   { main: '#7C3AED', light: '#F3E8FF', populaire: true },
  abo_entreprise: { main: '#075E54', light: '#E0F0EC' },
};

// ═══════════════════════════════════════════════════════════
//  API
// ═══════════════════════════════════════════════════════════
const API_URL = 'https://rouah.net/api/api-services.php';

const DUREES_RAPIDES = [1, 2, 3, 6, 12];
const DUREE_MIN = 1;
const DUREE_MAX = 36;

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════
function parseList(desc) {
  if (!desc) return [];
  return desc.split(/[|;\n]/).map((s) => s.trim()).filter(Boolean);
}

function enrichService(service) {
  const visualMap = {
    abo_standard:   { icone: 'cube-outline', populaire: false },
    abo_business:   { icone: 'rocket-outline', populaire: true  },
    abo_entreprise: { icone: 'domain', populaire: false },
  };
  const visual = visualMap[service.code] || {};
  const colors = FORFAIT_COLORS[service.code] || {
    main: ROUAH.primary,
    light: ROUAH.accentSoft,
  };
  return {
    ...service,
    ...visual,
    couleur: colors.main,
    couleurLight: colors.light,
    avantages: parseList(service.description),
  };
}

// ─── APPELS API ────────────────────────────────────────────
async function apiAbonnementSociete(societeId) {
  const url = societeId
    ? `${API_URL}?action=abonnement_societe&societe_id=${encodeURIComponent(societeId)}`
    : `${API_URL}?action=abonnement_societe`;

  const res = await fetch(url);
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Erreur API');
  return json.data;
}

async function apiCommander(payload) {
  const res = await fetch(`${API_URL}?action=commander`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'commander', ...payload }),
  });

  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Erreur API');
  return json;
}

// ═══════════════════════════════════════════════════════════
//  ÉCRAN PRINCIPAL
// ═══════════════════════════════════════════════════════════
const ServicesScreen = ({
  visible,
  onClose,
  colors = {},
  user,
  societeId: propSocieteId,
  onOpenWebView,
}) => {
  const [forfaits, setForfaits]     = useState([]);
  const [aboActuel, setAboActuel]   = useState(null);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [dureesParForfait, setDureesParForfait] = useState({});
  const [dureeInputs, setDureeInputs] = useState({});

  const societeId = propSocieteId || user?.societe_id || user?.societeId;

  // ─── Chargement des forfaits ───
  useEffect(() => {
    if (visible === false) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');

      if (!societeId) {
        setError('Vous devez être connecté pour voir les abonnements.');
        setLoading(false);
        return;
      }

      try {
        const data = await apiAbonnementSociete(societeId);
        if (cancelled) return;

        const enriched = (data.forfaits || []).map(enrichService);

        const actif = enriched.find((f) => f.est_actif);
        const reco  = enriched.find((f) => f.populaire && !f.est_actif);
        const libre = enriched.find((f) => !f.est_actif);

        setForfaits(enriched);
        setAboActuel(data.abonnement_actuel || null);
        setSelected((actif || reco || libre)?.id ?? null);

        const dureesInit = {};
        const inputsInit = {};
        enriched.forEach((f) => {
          dureesInit[f.id] = 1;
          inputsInit[f.id] = '1';
        });
        setDureesParForfait(dureesInit);
        setDureeInputs(inputsInit);
      } catch (e) {
        if (cancelled) return;
        console.warn('❌ API abonnement indisponible :', e.message);
        setError(e.message || 'Impossible de charger les abonnements');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [visible, societeId]);

  // ─── Gestion de la saisie de durée ───
  const handleDureeChange = (forfaitId, v) => {
    const cleaned = v.replace(/[^0-9]/g, '');
    setDureeInputs((prev) => ({ ...prev, [forfaitId]: cleaned }));

    const n = parseInt(cleaned, 10);
    if (!isNaN(n) && n >= DUREE_MIN && n <= DUREE_MAX) {
      setDureesParForfait((prev) => ({ ...prev, [forfaitId]: n }));
    }
  };

  const handleDureeBlur = (forfaitId) => {
    let n = parseInt(dureeInputs[forfaitId], 10);
    if (isNaN(n) || n < DUREE_MIN) n = DUREE_MIN;
    else if (n > DUREE_MAX) n = DUREE_MAX;
    setDureesParForfait((prev) => ({ ...prev, [forfaitId]: n }));
    setDureeInputs((prev) => ({ ...prev, [forfaitId]: String(n) }));
  };

  // ─── Souscription ───
  const souscrire = (forfait) => {
    if (forfait.est_grisable || forfait.est_actif) {
      Alert.alert(
        'Déjà actif',
        `Le forfait "${forfait.nom}" est déjà votre abonnement en cours.`
      );
      return;
    }

    const isStandard = forfait.code === 'abo_standard';
    const dureeSelectionnee = dureesParForfait[forfait.id] || 1;

    // ⭐ Standard → souscription immédiate (gratuit)
    if (isStandard) {
      Alert.alert(
        'Confirmation',
        `Activer le forfait gratuit "${forfait.nom}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Activer',
            onPress: async () => {
              setSubmitting(true);
              try {
                await apiCommander({
                  service_id:     forfait.id,
                  utilisateur_id: user?.utilisateur_id,
                  nom_prenom:     user?.nom || 'Client',
                  telephone:      user?.telephone || '+22500000000',
                  email:          user?.email,
                  societe_id:     societeId,
                });
                Alert.alert('✅ Succès', 'Forfait Standard activé.');
                onClose && onClose();
              } catch (e) {
                Alert.alert('Erreur', e.message);
              } finally {
                setSubmitting(false);
              }
            },
          },
        ]
      );
      return;
    }

    // ⭐ Business OU Entreprise → paiement mensuel AVEC durée
    if (dureeSelectionnee < DUREE_MIN || dureeSelectionnee > DUREE_MAX) {
      Alert.alert(
        'Durée invalide',
        `Veuillez saisir une durée entre ${DUREE_MIN} et ${DUREE_MAX} mois.`
      );
      return;
    }

    const totalMontant = Number(forfait.prix) * dureeSelectionnee;

    Alert.alert(
      'Paiement',
      `Vous allez être redirigé vers la page de paiement.\n\n` +
        `Forfait : ${forfait.nom}\n` +
        `Durée : ${dureeSelectionnee} mois\n` +
        `Total : ${totalMontant.toLocaleString('fr-FR')} FCFA`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: async () => {
            setSubmitting(true);
            try {
              const response = await apiCommander({
                service_id:     forfait.id,
                utilisateur_id: user?.utilisateur_id,
                nom_prenom:     user?.nom || 'Client',
                telephone:      user?.telephone || '+22500000000',
                email:          user?.email,
                societe_id:     societeId,
                duree_mois:     dureeSelectionnee,
              });

              const urlPaiement = response?.redirect || response?.data?.url_paiement;

              if (!urlPaiement) {
                Alert.alert('Erreur', "L'API n'a pas renvoyé d'URL de paiement.");
                return;
              }

              if (onOpenWebView) {
                onOpenWebView(urlPaiement, `Paiement — ${forfait.nom}`);
                onClose && onClose();
              } else {
                Linking.openURL(urlPaiement).catch(() =>
                  Alert.alert('Erreur', "Impossible d'ouvrir la page.")
                );
              }
            } catch (e) {
              Alert.alert('Erreur', e.message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // ─── Rendu ───
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={ROUAH.primary}
        translucent={false}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.HeaderLeft}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Abonnements</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Loading */}
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={ROUAH.primary} size="large" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        )}

        {/* Erreur */}
        {!!error && !loading && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={ROUAH.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Bandeau abonnement actuel */}
        {!loading && aboActuel && (
          <View style={styles.currentAboBanner}>
            <View style={styles.currentAboIcon}>
              <Ionicons name="checkmark-circle" size={18} color={ROUAH.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentAboLabel}>ABONNEMENT ACTUEL</Text>
              <Text style={styles.currentAboValue}>{aboActuel.service_nom}</Text>
              {aboActuel.date_fin && (
                <Text style={styles.currentAboDate}>
                  Expire le {aboActuel.date_fin}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Intro */}
        {!loading && forfaits.length > 0 && (
          <View style={styles.introBox}>
            <Text style={styles.introTitle}>Choisissez votre forfait</Text>
            <Text style={styles.introSubtitle}>
              Sélectionnez la durée puis le plan adapté à votre activité
            </Text>
          </View>
        )}

        {/* Liste des forfaits */}
        {!loading &&
          forfaits.map((forfait) => {
            const isSelected = selected === forfait.id;
            const isGratuit  = Number(forfait.prix) === 0;
            const isDisabled = forfait.est_grisable || forfait.est_actif;
            const dureeSelectionnee = dureesParForfait[forfait.id] || 1;
            const dureeInput = dureeInputs[forfait.id] || '1';
            const totalMontant = Number(forfait.prix) * dureeSelectionnee;

            // ⭐ Sélecteur de durée : pour TOUS les forfaits payants (non gratuits)
            const showDuree = !isGratuit && !isDisabled;

            return (
              <View
                key={forfait.id}
                style={[
                  styles.forfaitCard,
                  isSelected && {
                    borderColor: forfait.couleur,
                    borderWidth: 2,
                    shadowOpacity: 0.1,
                    shadowRadius: 12,
                    elevation: 4,
                  },
                  isDisabled && styles.forfaitCardDisabled,
                ]}
              >
                {/* Badge Populaire */}
                {forfait.populaire && !isDisabled && (
                  <View style={[styles.popularBadge, { backgroundColor: forfait.couleur }]}>
                    <Text style={styles.popularBadgeText}>⭐ RECOMMANDÉ</Text>
                  </View>
                )}

                {/* Badge Actif */}
                {isDisabled && (
                  <View style={[styles.activeBadge, { backgroundColor: ROUAH.accent }]}>
                    <Text style={styles.activeBadgeText}>✓ ACTIF</Text>
                  </View>
                )}

                {/* Contenu cliquable */}
                <TouchableOpacity
                  onPress={() => !isDisabled && setSelected(forfait.id)}
                  disabled={isDisabled}
                  activeOpacity={0.9}
                >
                  {/* En-tête */}
                  <View style={styles.forfaitHeader}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: forfait.couleurLight },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={forfait.icone || 'cube-outline'}
                        size={28}
                        color={forfait.couleur}
                      />
                    </View>
                    <View style={styles.forfaitInfo}>
                      <Text style={styles.forfaitNom}>{forfait.nom}</Text>
                      <Text style={styles.forfaitDesc}>{forfait.description}</Text>
                    </View>
                  </View>

                  {/* PRIX */}
                  <View style={styles.priceContainer}>
                    {isGratuit ? (
                      <Text style={[styles.priceText, { color: forfait.couleur }]}>
                        GRATUIT
                      </Text>
                    ) : (
                      <View style={styles.priceRow}>
                        <Text style={[styles.priceAmount, { color: forfait.couleur }]}>
                          {Number(forfait.prix).toLocaleString('fr-FR')}
                        </Text>
                        <Text style={styles.priceCurrency}>FCFA</Text>
                        <Text style={styles.pricePeriod}>/mois</Text>
                      </View>
                    )}
                  </View>

                  {/* Sélecteur de durée — Business ET Entreprise */}
                  {showDuree && (
                    <View style={styles.dureeSection}>
                      <View style={styles.dureeLabelRow}>
                        <Ionicons name="time-outline" size={16} color={forfait.couleur} />
                        <Text style={styles.dureeLabel}>
                          Durée de l'abonnement
                        </Text>
                      </View>

                      <View style={styles.dureeInputContainer}>
                        <TextInput
                          style={[styles.dureeInput, { borderColor: forfait.couleur }]}
                          value={dureeInput}
                          onChangeText={(v) => handleDureeChange(forfait.id, v)}
                          onBlur={() => handleDureeBlur(forfait.id)}
                          keyboardType="number-pad"
                          returnKeyType="done"
                          placeholder="1"
                          placeholderTextColor={ROUAH.muted}
                          maxLength={2}
                          selectTextOnFocus
                        />
                        <Text style={styles.dureeSuffix}>mois</Text>
                      </View>

                      <View style={styles.dureeChips}>
                        {DUREES_RAPIDES.map((d) => (
                          <TouchableOpacity
                            key={d}
                            style={[
                              styles.dureeChip,
                              dureeSelectionnee === d && {
                                backgroundColor: forfait.couleur,
                                borderColor: forfait.couleur,
                              },
                            ]}
                            onPress={() => {
                              setDureesParForfait((prev) => ({
                                ...prev,
                                [forfait.id]: d,
                              }));
                              setDureeInputs((prev) => ({
                                ...prev,
                                [forfait.id]: String(d),
                              }));
                            }}
                          >
                            <Text
                              style={[
                                styles.dureeChipText,
                                dureeSelectionnee === d &&
                                  styles.dureeChipTextActive,
                              ]}
                            >
                              {d} mois
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {isSelected && (
                        <View style={styles.totalBox}>
                          <Text style={styles.totalLabel}>
                            {dureeSelectionnee} ×{' '}
                            {Number(forfait.prix).toLocaleString('fr-FR')} F
                          </Text>
                          <Text style={[styles.totalValue, { color: forfait.couleur }]}>
                            {totalMontant.toLocaleString('fr-FR')} FCFA
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>

                {/* Fonctionnalités */}
                <View style={styles.featuresContainer}>
                  {(forfait.fonctionnalites || forfait.avantages || []).map(
                    (f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <View
                          style={[
                            styles.checkIcon,
                            { backgroundColor: forfait.couleurLight },
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={forfait.couleur}
                          />
                        </View>
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    )
                  )}
                </View>

                {/* Bouton d'action */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: isDisabled
                        ? ROUAH.muted
                        : isSelected
                        ? forfait.couleur
                        : ROUAH.surface,
                    },
                    !isDisabled &&
                      !isSelected && {
                        borderColor: forfait.couleur,
                        borderWidth: 2,
                      },
                  ]}
                  onPress={() => souscrire(forfait)}
                  disabled={submitting || isDisabled}
                  activeOpacity={0.8}
                >
                  {submitting && isSelected ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      style={[
                        styles.actionBtnText,
                        {
                          color:
                            isDisabled || isSelected ? '#fff' : forfait.couleur,
                        },
                      ]}
                    >
                      {isDisabled
                        ? 'Déjà actif'
                        : isGratuit
                        ? 'Commencer gratuitement'
                        : isSelected
                        ? `Souscrire ${dureeSelectionnee} mois`
                        : 'Choisir ce forfait'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

        {/* Aucun forfait */}
        {!loading && !error && forfaits.length === 0 && (
          <View style={styles.emptyBox}>
            <MaterialCommunityIcons
              name="package-variant"
              size={64}
              color={ROUAH.muted}
            />
            <Text style={styles.emptyText}>Aucun forfait disponible</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ROUAH.bg,
  },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',backgroundColor:'#075E54'
  },
  HeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { padding: 4 },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  loadingBox: {
    padding: 60,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: ROUAH.muted,
    fontSize: 14,
    fontWeight: '500',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: ROUAH.danger,
  },
  errorBannerText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },

  currentAboBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ROUAH.accentSoft,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: ROUAH.accent,
  },
  currentAboIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentAboLabel: {
    fontSize: 10,
    color: ROUAH.primary,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  currentAboValue: {
    fontSize: 15,
    color: ROUAH.primary,
    fontWeight: '700',
  },
  currentAboDate: {
    fontSize: 11,
    color: ROUAH.primarySoft,
    marginTop: 2,
  },

  introBox: {
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: ROUAH.text,
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 14,
    color: ROUAH.muted,
    lineHeight: 20,
  },

  forfaitCard: {
    backgroundColor: ROUAH.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ROUAH.border,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  forfaitCardDisabled: {
    opacity: 0.6,
  },

  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  popularBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  activeBadge: {
    position: 'absolute',
    top: -8,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  forfaitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forfaitInfo: {
    flex: 1,
  },
  forfaitNom: {
    fontSize: 18,
    fontWeight: '700',
    color: ROUAH.text,
    marginBottom: 4,
  },
  forfaitDesc: {
    fontSize: 13,
    color: ROUAH.muted,
    lineHeight: 18,
  },

  priceContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: ROUAH.border,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  priceCurrency: {
    fontSize: 16,
    color: ROUAH.muted,
    marginLeft: 4,
    fontWeight: '600',
  },
  pricePeriod: {
    fontSize: 14,
    color: ROUAH.muted,
    marginLeft: 4,
  },

  dureeSection: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: ROUAH.bg,
    borderRadius: 12,
  },
  dureeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dureeLabel: {
    fontSize: 13,
    color: ROUAH.textSoft,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dureeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dureeInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '700',
    color: ROUAH.text,
    textAlign: 'center',
  },
  dureeSuffix: {
    fontSize: 15,
    color: ROUAH.muted,
    fontWeight: '600',
  },
  dureeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dureeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: ROUAH.border,
  },
  dureeChipText: {
    fontSize: 13,
    color: ROUAH.textSoft,
    fontWeight: '600',
  },
  dureeChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  totalBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ROUAH.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: ROUAH.muted,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
  },

  featuresContainer: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    color: ROUAH.textSoft,
    lineHeight: 18,
  },

  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  emptyBox: {
    padding: 60,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    color: ROUAH.muted,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default ServicesScreen;