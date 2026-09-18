// Parrainage.js — Écran Parrainage (React Native)
// Liste des filleuls + statistiques + partage (copier, WhatsApp, Email, SMS, natif, QR)

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

const API_URL = 'https://rouah.net/api/api-parrainage.php';

// ============================================================
// COULEURS
// ============================================================
const COLORS = {
  primary: '#075E54',
  primaryDark: '#064239',
  primaryLight: '#E8F5E9',
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

export default function Parrainage({ societeId, user, onBack }) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData]             = useState(null);
  const [showQR, setShowQR]         = useState(false);
  const [copied, setCopied]         = useState(false);

  // ============================================================
  // CHARGEMENT
  // ============================================================
  const load = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_parrainage',
          societe_id: societeId,
          utilisateur_id: user?.utilisateur_id,
        }),
      });
      const json = await res.json();
      if (json.success) setData(json.data);
      else Alert.alert('Erreur', json.message || 'Impossible de charger les parrainages');
    } catch (e) {
      Alert.alert('Erreur', 'Erreur réseau : ' + e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societeId, user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  // ============================================================
  // ACTIONS DE PARTAGE
  // ============================================================
  const handleCopy = async () => {
    if (!data?.lien_parrainage) return;
    await Clipboard.setStringAsync(data.lien_parrainage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = async () => {
    const url = `whatsapp://send?text=${encodeURIComponent(data.message_partage)}`;
    const fallback = `https://wa.me/?text=${encodeURIComponent(data.message_partage)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      await Linking.openURL(supported ? url : fallback);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp');
    }
  };

  const handleEmail = async () => {
    const subject = `Invitation à rejoindre ${data.societe.nom} sur Rouah`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(data.message_partage)}`;
    try { await Linking.openURL(url); }
    catch (e) { Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application email'); }
  };

  const handleSMS = async () => {
    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${separator}body=${encodeURIComponent(data.message_partage)}`;
    try { await Linking.openURL(url); }
    catch (e) { Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application SMS'); }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        title: 'Rejoignez-nous sur Rouah',
        message: data.message_partage,
        url: data.lien_parrainage,
      });
    } catch (e) {
      if (e.message !== 'User did not share') {
        console.warn('Erreur partage natif :', e.message);
      }
    }
  };

  // ============================================================
  // RENDU
  // ============================================================
  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement des parrainages...</Text>
      </View>
    );
  }

  const stats     = data?.stats    || { total: 0, ce_mois: 0, cette_annee: 0 };
  const filleuls  = data?.filleuls || [];
  const societe   = data?.societe  || {};

  return (
    <View style={styles.container}>

      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Mes parrainages</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >

        {/* ===== STATISTIQUES ===== */}
        <View style={styles.statsRow}>
          <StatCard icon="👥" value={stats.total}       label="Total filleuls" />
          <StatCard icon="📅" value={stats.ce_mois}     label="Ce mois" />
          <StatCard icon="🏆" value={stats.cette_annee} label="Cette année" />
        </View>

        {/* ===== CARTE PARTAGE ===== */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="share-social" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Invitez vos partenaires</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            Partagez ce lien : toute société qui s'inscrit via ce lien vous sera rattachée comme filleule.
          </Text>

          {/* Lien + bouton copier */}
          <View style={styles.linkRow}>
            <View style={styles.linkInput}>
              <Text style={styles.linkText} numberOfLines={1} ellipsizeMode="middle">
                {data?.lien_parrainage || ''}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.copyBtn, copied && styles.copyBtnDone]}
              onPress={handleCopy}
              activeOpacity={0.8}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy'} size={16} color="#fff" />
              <Text style={styles.copyBtnText}>{copied ? 'Copié !' : 'Copier'}</Text>
            </TouchableOpacity>
          </View>

          {/* Boutons de partage */}
          <View style={styles.shareGrid}>
            <ShareButton icon="logo-whatsapp"  label="WhatsApp"  color={COLORS.whatsapp} onPress={handleWhatsApp} />
            <ShareButton icon="mail"           label="Email"     color={COLORS.email}    onPress={handleEmail} />
            <ShareButton icon="chatbubbles"    label="SMS"       color={COLORS.sms}      onPress={handleSMS} />
            <ShareButton icon="share-social"   label="Partager"  color={COLORS.primary}  onPress={handleNativeShare} />
            <ShareButton
              icon={showQR ? 'close' : 'qr-code'}
              label={showQR ? 'Masquer QR' : 'QR Code'}
              color={COLORS.qr}
              onPress={() => setShowQR(v => !v)}
            />
          </View>

          {/* Zone QR */}
          {showQR && (
            <View style={styles.qrZone}>
              <View style={styles.qrWrapper}>
                <QRCode value={data?.lien_parrainage || ''} size={180} color={COLORS.primary} />
              </View>
              <Text style={styles.qrHint}>Scannez pour vous inscrire avec ce parrain</Text>
            </View>
          )}
        </View>

        {/* ===== LISTE DES FILLEULS ===== */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="people" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Sociétés filleules</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{stats.total}</Text>
            </View>
          </View>

          {filleuls.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="mail-open-outline" size={56} color="#d0d0d0" />
              <Text style={styles.emptyTitle}>Aucun parrainage pour le moment</Text>
              <Text style={styles.emptyText}>
                Partagez votre lien d'invitation ci-dessus.{'\n'}
                Les sociétés qui s'inscriront apparaîtront ici automatiquement.
              </Text>
            </View>
          ) : (
            filleuls.map((f) => (
              <FilleulItem key={f.parrainage_id} filleul={f} />
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
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
      <View style={[styles.badge, isActif ? styles.badgeActif : styles.badgeInactif]}>
        <Text style={[styles.badgeText, { color: isActif ? COLORS.success : COLORS.danger }]}>
          {statut}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  loadingText: { color: COLORS.primary, marginTop: 12, fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 46, paddingBottom: 14,
    backgroundColor: COLORS.primary,
  },
  backBtn: { marginRight: 12, padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  scrollContent: { padding: 14, paddingBottom: 40 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primary,
    padding: 16, borderRadius: 16, marginBottom: 12,
  },
  bannerIcon: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: {
    fontSize: 10, color: COLORS.muted, marginTop: 2,
    textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600',
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary, flex: 1 },
  cardSubtitle: { fontSize: 13, color: COLORS.muted, marginBottom: 14, lineHeight: 18 },

  linkRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  linkInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 11,
    backgroundColor: '#f8f9fa', justifyContent: 'center',
  },
  linkText: { fontSize: 12, color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },

  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, borderRadius: 11,
    backgroundColor: COLORS.primary, justifyContent: 'center',
  },
  copyBtnDone: { backgroundColor: COLORS.success },
  copyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, paddingHorizontal: 14,
    borderRadius: 11, borderWidth: 1,
    backgroundColor: '#fff', minWidth: 100,
  },
  shareBtnText: { fontSize: 13, fontWeight: '600' },

  qrZone: {
    marginTop: 16, padding: 16, borderRadius: 12,
    backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e0e0e0',
    borderStyle: 'dashed', alignItems: 'center',
  },
  qrWrapper: { padding: 8, backgroundColor: '#fff', borderRadius: 10 },
  qrHint: { marginTop: 10, fontSize: 12, color: COLORS.muted },

  countBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20,
  },
  countBadgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },

  filleulItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, marginTop: 8,
  },
  filleulAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filleulAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  filleulName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  filleulMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  filleulMetaText: { fontSize: 11, color: COLORS.muted, marginRight: 6 },

  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeActif: { backgroundColor: '#dcfce7' },
  badgeInactif: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  emptyState: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});