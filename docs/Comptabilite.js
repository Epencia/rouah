// Comptabilite.js
// Écran unique du module comptabilité Rouah — SYSCOHADA révisé
// 5 onglets : Écritures · Comptes · États · Fiscalité · Actifs

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, StyleSheet, Platform,
  StatusBar, RefreshControl, KeyboardAvoidingView, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// =====================================================================
// CONFIGURATION
// =====================================================================
const API_URL = 'https://rouah.net/api/api-comptabilite.php';

const C = {
  primary: '#075E54',
  primaryDark: '#054640',
  accent: '#25D366',
  accentLight: '#e8f9f0',
  cream: '#ECE5DD',
  text: '#171717',
  muted: '#6b7280',
  surface: '#ffffff',
  background: '#f3f4f6',
  border: '#e5e7eb',
  success: '#16a34a',
  successBg: '#dcfce7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  blue: '#2563eb',
  blueBg: '#dbeafe',
  purple: '#7c3aed',
  purpleBg: '#ede9fe',
};

// =====================================================================
// HELPERS
// =====================================================================
const f = (v) => Number(v || 0);

const formatFCFA = (v) => {
  const n = f(v);
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' F';
};

const formatDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR');
  } catch {
    return String(d);
  }
};

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

const ORIGINES = [
  { key: 'vente', label: 'Vente', icon: 'cart', color: C.success },
  { key: 'achat', label: 'Achat', icon: 'cube', color: C.warning },
  { key: 'paiement_client', label: 'Encaissement client', icon: 'cash', color: C.accent },
  { key: 'paiement_fournisseur', label: 'Paiement fournisseur', icon: 'card', color: C.blue },
  { key: 'depense', label: 'Dépense', icon: 'receipt', color: C.danger },
  { key: 'caisse', label: 'Caisse', icon: 'wallet', color: C.purple },
  { key: 'banque', label: 'Banque', icon: 'business', color: C.blue },
  { key: 'stock', label: 'Stock', icon: 'layers', color: C.warning },
  { key: 'manuel', label: 'Manuel', icon: 'create', color: C.muted },
  { key: 'autre', label: 'Autre', icon: 'ellipsis-horizontal', color: C.muted },
];

const getOrigineMeta = (key) => ORIGINES.find((o) => o.key === key) || { label: key || '—', icon: 'help-circle', color: C.muted };

// =====================================================================
// API CALL
// =====================================================================
async function apiCall(action, payload = {}) {
  try {
    const societe_id = payload.societe_id || await AsyncStorage.getItem('@rouah_societe_id');
    const utilisateurRaw = await AsyncStorage.getItem('@rouah_user');
    const utilisateur = utilisateurRaw ? JSON.parse(utilisateurRaw) : null;

    if (!societe_id) throw new Error('societe_id manquant');

    const body = {
      action,
      societe_id,
      utilisateur_id: utilisateur?.utilisateur_id || null,
      ...payload,
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Réponse serveur invalide');
    }
    if (!json.success) throw new Error(json.message || 'Erreur inconnue');
    return json.data;
  } catch (e) {
    throw new Error(e.message || 'Erreur réseau');
  }
}

// =====================================================================
// COMPOSANTS UTILITAIRES
// =====================================================================
const SectionTitle = ({ icon, title, subtitle, right }) => (
  <View style={styles.sectionTitle}>
    <View style={styles.sectionTitleLeft}>
      {icon ? <Ionicons name={icon} size={18} color={C.primary} style={{ marginRight: 8 }} /> : null}
      <View>
        <Text style={styles.sectionTitleText}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
    {right}
  </View>
);

const KPI = ({ label, value, icon, color = C.primary, bg }) => (
  <View style={[styles.kpiCard, bg ? { backgroundColor: bg } : null]}>
    <View style={styles.kpiHeader}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.kpiLabel, { color }]}>{label}</Text>
    </View>
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
  </View>
);

const Pill = ({ label, color = C.primary, bg }) => (
  <View style={[styles.pill, { backgroundColor: bg || (color + '18') }]}>
    <Text style={[styles.pillText, { color }]}>{label}</Text>
  </View>
);

const Empty = ({ icon = 'folder-open-outline', title, hint }) => (
  <View style={styles.emptyBox}>
    <Ionicons name={icon} size={44} color={C.muted} />
    <Text style={styles.emptyTitle}>{title}</Text>
    {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
  </View>
);

const Loading = ({ label = 'Chargement...' }) => (
  <View style={styles.loadingBox}>
    <ActivityIndicator size="large" color={C.primary} />
    <Text style={styles.loadingText}>{label}</Text>
  </View>
);

const Field = ({ label, children, required }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>
      {label}{required ? <Text style={{ color: C.danger }}> *</Text> : ''}
    </Text>
    {children}
  </View>
);

const TextField = ({ value, onChangeText, placeholder, keyboardType = 'default', multiline = false, editable = true, ...props }) => (
  <TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#9ca3af"
    keyboardType={keyboardType}
    multiline={multiline}
    editable={editable}
    style={[styles.textInput, multiline && { height: 90, textAlignVertical: 'top' }, !editable && { backgroundColor: '#f3f4f6' }]}
    {...props}
  />
);

const ChipsRow = ({ options, value, onChange, color = C.primary }) => (
  <View style={styles.chipsRow}>
    {options.map((o) => {
      const active = value === o.value;
      return (
        <TouchableOpacity
          key={String(o.value)}
          onPress={() => onChange(o.value)}
          style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}
          activeOpacity={0.8}
        >
          <Text style={[styles.chipText, active && { color: '#fff', fontWeight: '700' }]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const PrimaryButton = ({ label, icon = 'checkmark', onPress, disabled, color = C.primary }) => (
  <TouchableOpacity
    style={[styles.primaryBtn, { backgroundColor: color }, disabled && { opacity: 0.5 }]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.85}
  >
    {icon ? <Ionicons name={icon} size={18} color="#fff" style={{ marginRight: 6 }} /> : null}
    <Text style={styles.primaryBtnText}>{label}</Text>
  </TouchableOpacity>
);

const GhostButton = ({ label, icon = 'add', onPress, color = C.primary }) => (
  <TouchableOpacity style={[styles.ghostBtn, { borderColor: color }]} onPress={onPress} activeOpacity={0.8}>
    {icon ? <Ionicons name={icon} size={16} color={color} style={{ marginRight: 4 }} /> : null}
    <Text style={[styles.ghostBtnText, { color }]}>{label}</Text>
  </TouchableOpacity>
);

// =====================================================================
// MODAL GÉNÉRIQUE
// =====================================================================
const ModalShell = ({ visible, onClose, title, children, footer, height = '90%' }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} statusBarTranslucent>
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.modalOverlay}
    >
      <View style={[styles.modalContainer, { maxHeight: height }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.modalClose}>
            <Ionicons name="close" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{title}</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? <View style={styles.modalFooter}>{footer}</View> : null}
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

// =====================================================================
// SOUS-ONGLETS INTERNES
// =====================================================================
const SubTabs = ({ tabs, active, onChange }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.subTabsBar}
    contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
  >
    {tabs.map((t) => {
      const isActive = active === t.key;
      return (
        <TouchableOpacity
          key={t.key}
          style={[styles.subTab, isActive && styles.subTabActive]}
          onPress={() => onChange(t.key)}
          activeOpacity={0.85}
        >
          {t.icon ? (
            <Ionicons
              name={t.icon}
              size={14}
              color={isActive ? '#fff' : C.primary}
              style={{ marginRight: 6 }}
            />
          ) : null}
          <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>{t.label}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// =====================================================================
// ONGLET ÉCRITURES
// =====================================================================
function EcrituresTab({ societeId, utilisateurId, exerciceId }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ecritures, setEcritures] = useState([]);
  const [journaux, setJournaux] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    statut: '',
    journal_id: '',
    origine: '',
    search: '',
    date_debut: firstOfMonth(),
    date_fin: today(),
  });
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [autoModal, setAutoModal] = useState(false);
  const [manuelModal, setManuelModal] = useState(false);

  const load = useCallback(async () => {
    if (!societeId) return;
    try {
      const payload = {
        societe_id: societeId,
        exercice_id: exerciceId || undefined,
        statut: filters.statut || undefined,
        journal_id: filters.journal_id || undefined,
        origine: filters.origine || undefined,
        search: filters.search || undefined,
        date_debut: filters.date_debut || undefined,
        date_fin: filters.date_fin || undefined,
        limit: 100,
      };
      const [list, j, d] = await Promise.all([
        apiCall('get_ecritures', payload),
        apiCall('get_journaux', { societe_id: societeId }),
        apiCall('get_dashboard_comptable', { societe_id: societeId }),
      ]);
      setEcritures(list?.ecritures || []);
      setJournaux(j || []);
      setStats(d || null);
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setEcritures([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societeId, exerciceId, filters]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (ecr) => {
    setSelected(ecr);
    setDetail(null);
    try {
      const d = await apiCall('get_ecriture', { societe_id: societeId, id: ecr.id });
      setDetail(d);
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setSelected(null);
    }
  };

  const validate = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await apiCall('validate_ecriture', { societe_id: societeId, id: detail.id });
      Alert.alert('Succès', 'Écriture validée');
      setSelected(null);
      setDetail(null);
      load();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    if (!detail) return;
    Alert.alert(
      'Annuler l\'écriture',
      `Voulez-vous vraiment annuler ${detail.numero_piece} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await apiCall('cancel_ecriture', { societe_id: societeId, id: detail.id });
              Alert.alert('Succès', 'Écriture annulée');
              setSelected(null);
              setDetail(null);
              load();
            } catch (e) {
              Alert.alert('Erreur', e.message);
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    const meta = getOrigineMeta(item.origine);
    const isEq = Math.abs(f(item.total_debit) - f(item.total_credit)) < 0.01;
    const statutColor =
      item.statut === 'valide' ? C.success :
      item.statut === 'annule' ? C.danger : C.warning;
    const statutBg =
      item.statut === 'valide' ? C.successBg :
      item.statut === 'annule' ? C.dangerBg : C.warningBg;

    return (
      <TouchableOpacity style={styles.ecrCard} onPress={() => openDetail(item)} activeOpacity={0.85}>
        <View style={styles.ecrHeader}>
          <View style={[styles.ecrIconBox, { backgroundColor: meta.color + '18' }]}>
            <Ionicons name={meta.icon} size={16} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ecrNumero} numberOfLines={1}>{item.numero_piece}</Text>
            <Text style={styles.ecrLibelle} numberOfLines={2}>{item.libelle}</Text>
          </View>
          <View style={[styles.statutBadge, { backgroundColor: statutBg }]}>
            <Text style={[styles.statutBadgeText, { color: statutColor }]}>
              {item.statut.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.ecrFooter}>
          <Text style={styles.ecrDate}>{formatDate(item.date_ecriture)}</Text>
          <Text style={styles.ecrJournal}>{(item.journal_code || '—').toUpperCase()}</Text>
          <Text style={[styles.ecrMontant, { color: isEq ? C.success : C.danger }]}>
            {formatFCFA(item.total_debit)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <Loading label="Chargement des écritures..." />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        showsVerticalScrollIndicator={false}
      >
        {/* KPIs */}
        {stats && (
          <>
            <View style={styles.kpiRow}>
              <KPI label="Total" value={stats.nb_ecritures} icon="documents" color={C.primary} />
              <KPI label="Validées" value={stats.nb_validees} icon="checkmark-circle" color={C.success} bg={C.successBg} />
            </View>
            <View style={styles.kpiRow}>
              <KPI label="Brouillons" value={stats.nb_brouillons} icon="create" color={C.warning} bg={C.warningBg} />
              <KPI label="Annulées" value={stats.nb_annulees} icon="close-circle" color={C.danger} bg={C.dangerBg} />
            </View>
          </>
        )}

        {/* Filtres */}
        <SectionTitle icon="filter" title="Filtres" />
        <View style={styles.filtersCard}>
          <Field label="Période">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={filters.date_debut}
                onChangeText={(v) => setFilters((p) => ({ ...p, date_debut: v }))}
                placeholder="AAAA-MM-JJ"
                style={[styles.textInput, { flex: 1 }]}
              />
              <TextInput
                value={filters.date_fin}
                onChangeText={(v) => setFilters((p) => ({ ...p, date_fin: v }))}
                placeholder="AAAA-MM-JJ"
                style={[styles.textInput, { flex: 1 }]}
              />
            </View>
          </Field>
          <Field label="Statut">
            <ChipsRow
              options={[
                { value: '', label: 'Tous' },
                { value: 'brouillon', label: 'Brouillon' },
                { value: 'valide', label: 'Validée' },
                { value: 'annule', label: 'Annulée' },
              ]}
              value={filters.statut}
              onChange={(v) => setFilters((p) => ({ ...p, statut: v }))}
            />
          </Field>
          <Field label="Origine">
            <ChipsRow
              options={[{ value: '', label: 'Toutes' }, ...ORIGINES.map((o) => ({ value: o.key, label: o.label }))]}
              value={filters.origine}
              onChange={(v) => setFilters((p) => ({ ...p, origine: v }))}
              color={C.purple}
            />
          </Field>
          <Field label="Recherche">
            <TextField
              value={filters.search}
              onChangeText={(v) => setFilters((p) => ({ ...p, search: v }))}
              placeholder="N° pièce, libellé, référence..."
            />
          </Field>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <GhostButton label="Générer auto" icon="flash" onPress={() => setAutoModal(true)} color={C.accent} />
          <GhostButton label="Nouvelle écriture" icon="add" onPress={() => setManuelModal(true)} color={C.primary} />
        </View>

        {/* Liste */}
        <SectionTitle icon="documents" title={`Écritures (${ecritures.length})`} />
        {ecritures.length === 0 ? (
          <Empty title="Aucune écriture" hint="Ajustez les filtres ou créez une nouvelle écriture." />
        ) : (
          ecritures.map((e) => <View key={e.id}>{renderItem({ item: e })}</View>)
        )}
      </ScrollView>

      {/* Modal Détail */}
      <ModalShell
        visible={!!selected}
        onClose={() => { setSelected(null); setDetail(null); }}
        title="Détail écriture"
        footer={
          detail ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {detail.statut === 'brouillon' && (
                <PrimaryButton label="Valider" icon="checkmark-circle" onPress={validate} disabled={busy} />
              )}
              {detail.statut !== 'annule' && (
                <PrimaryButton label="Annuler" icon="close-circle" color={C.danger} onPress={cancel} disabled={busy} />
              )}
            </View>
          ) : null
        }
      >
        {!detail ? <Loading /> : (
          <>
            <View style={styles.detailHeader}>
              <Text style={styles.detailNumero}>{detail.numero_piece}</Text>
              <Pill
                label={detail.statut.toUpperCase()}
                color={
                  detail.statut === 'valide' ? C.success :
                  detail.statut === 'annule' ? C.danger : C.warning
                }
                bg={
                  detail.statut === 'valide' ? C.successBg :
                  detail.statut === 'annule' ? C.dangerBg : C.warningBg
                }
              />
            </View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Libellé</Text><Text style={styles.detailValue}>{detail.libelle}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Date</Text><Text style={styles.detailValue}>{formatDate(detail.date_ecriture)}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Journal</Text><Text style={styles.detailValue}>{(detail.journal_code || '—').toUpperCase()} — {detail.journal_libelle || ''}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Exercice</Text><Text style={styles.detailValue}>{detail.exercice_libelle || '—'}</Text></View>
            <View style={styles.detailRow}><Text style={styles.detailLabel}>Origine</Text><Text style={styles.detailValue}>{getOrigineMeta(detail.origine).label}</Text></View>
            {detail.reference_externe ? (
              <View style={styles.detailRow}><Text style={styles.detailLabel}>Réf. externe</Text><Text style={styles.detailValue}>{detail.reference_externe}</Text></View>
            ) : null}

            <SectionTitle icon="list" title="Lignes" />
            {detail.lignes?.map((l, i) => (
              <View key={i} style={styles.ligneRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ligneCompte}>{l.compte_numero} — {l.compte_libelle}</Text>
                  {l.libelle ? <Text style={styles.ligneLibelle}>{l.libelle}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {f(l.debit) > 0 ? <Text style={[styles.ligneDebit]}>{formatFCFA(l.debit)} D</Text> : null}
                  {f(l.credit) > 0 ? <Text style={[styles.ligneCredit]}>{formatFCFA(l.credit)} C</Text> : null}
                </View>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Débit</Text>
              <Text style={styles.totalValue}>{formatFCFA(detail.total_debit)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Crédit</Text>
              <Text style={styles.totalValue}>{formatFCFA(detail.total_credit)}</Text>
            </View>
            <View style={[
              styles.equilibreBadge,
              { backgroundColor: Math.abs(f(detail.total_debit) - f(detail.total_credit)) < 0.01 ? C.successBg : C.dangerBg },
            ]}>
              <Ionicons
                name={Math.abs(f(detail.total_debit) - f(detail.total_credit)) < 0.01 ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={Math.abs(f(detail.total_debit) - f(detail.total_credit)) < 0.01 ? C.success : C.danger}
              />
              <Text style={{
                color: Math.abs(f(detail.total_debit) - f(detail.total_credit)) < 0.01 ? C.success : C.danger,
                fontWeight: '800',
                marginLeft: 6,
              }}>
                {Math.abs(f(detail.total_debit) - f(detail.total_credit)) < 0.01 ? 'ÉQUILIBRÉE' : 'DÉSÉQUILIBRÉE'}
              </Text>
            </View>
          </>
        )}
      </ModalShell>

      {/* Modal Génération auto */}
      <AutoGenerateModal
        visible={autoModal}
        onClose={() => setAutoModal(false)}
        societeId={societeId}
        onDone={() => { setAutoModal(false); load(); }}
      />

      {/* Modal Nouvelle écriture manuelle */}
      <NouvelleEcritureModal
        visible={manuelModal}
        onClose={() => setManuelModal(false)}
        societeId={societeId}
        exerciceId={exerciceId}
        journaux={journaux}
        onDone={() => { setManuelModal(false); load(); }}
      />
    </View>
  );
}

// =====================================================================
// MODAL GÉNÉRATION AUTOMATIQUE
// =====================================================================
function AutoGenerateModal({ visible, onClose, societeId, onDone }) {
  const [documents, setDocuments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Récupérer documents valides SANS écriture générée
      const docs = await apiCall('get_documents_valides', { societe_id: societeId }).catch(() => null);
      const trs = await apiCall('get_transactions_valides', { societe_id: societeId }).catch(() => null);
      setDocuments(docs || []);
      setTransactions(trs || []);
    } catch (e) {
      setDocuments([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [societeId]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  const genDoc = async (doc, action) => {
    setBusy(true);
    try {
      await apiCall(action, { societe_id: societeId, document_id: doc.document_id });
      Alert.alert('Succès', 'Écriture générée');
      load();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  const genTr = async (tr, action) => {
    setBusy(true);
    try {
      await apiCall(action, { societe_id: societeId, transaction_id: tr.transaction_id });
      Alert.alert('Succès', 'Écriture générée');
      load();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="Génération automatique">
      {loading ? <Loading /> : (
        <>
          <SectionTitle icon="cart" title="Ventes à comptabiliser" />
          {documents.filter((d) => d.categorie === 'Vente').length === 0 ? (
            <Empty title="Aucune vente à comptabiliser" />
          ) : (
            documents.filter((d) => d.categorie === 'Vente').slice(0, 20).map((d) => (
              <View key={d.document_id} style={styles.autoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoTitre}>{d.numero}</Text>
                  <Text style={styles.autoSub}>{d.nom} — {formatDate(d.date)}</Text>
                </View>
                <Text style={styles.autoMontant}>{formatFCFA(d.montant_toutetaxe)}</Text>
                <TouchableOpacity
                  style={styles.autoBtn}
                  onPress={() => genDoc(d, 'generate_ecriture_vente')}
                  disabled={busy}
                >
                  <Ionicons name="flash" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))
          )}

          <SectionTitle icon="cube" title="Achats à comptabiliser" />
          {documents.filter((d) => d.categorie === 'Achat').length === 0 ? (
            <Empty title="Aucun achat à comptabiliser" />
          ) : (
            documents.filter((d) => d.categorie === 'Achat').slice(0, 20).map((d) => (
              <View key={d.document_id} style={styles.autoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoTitre}>{d.numero}</Text>
                  <Text style={styles.autoSub}>{d.nom} — {formatDate(d.date)}</Text>
                </View>
                <Text style={styles.autoMontant}>{formatFCFA(d.montant_toutetaxe)}</Text>
                <TouchableOpacity
                  style={[styles.autoBtn, { backgroundColor: C.warning }]}
                  onPress={() => genDoc(d, 'generate_ecriture_achat')}
                  disabled={busy}
                >
                  <Ionicons name="flash" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))
          )}

          <SectionTitle icon="cash" title="Transactions à comptabiliser" />
          {transactions.length === 0 ? (
            <Empty title="Aucune transaction à comptabiliser" />
          ) : (
            transactions.slice(0, 30).map((t) => {
              const isEntree = t.type === 'Entree';
              const isDepense = t.type === 'Sortie' && t.charge_id;
              const action = isEntree
                ? 'generate_ecriture_paiement_client'
                : isDepense
                ? 'generate_ecriture_depense'
                : 'generate_ecriture_paiement_fournisseur';
              return (
                <View key={t.transaction_id} style={styles.autoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.autoTitre}>{t.reference_reglement || t.numero_reglement || '—'}</Text>
                    <Text style={styles.autoSub}>{isEntree ? 'Encaissement' : isDepense ? 'Dépense' : 'Paiement'} — {formatDate(t.date)}</Text>
                  </View>
                  <Text style={styles.autoMontant}>{formatFCFA(t.montant_total)}</Text>
                  <TouchableOpacity
                    style={[styles.autoBtn, { backgroundColor: isEntree ? C.success : isDepense ? C.danger : C.blue }]}
                    onPress={() => genTr(t, action)}
                    disabled={busy}
                  >
                    <Ionicons name="flash" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </>
      )}
    </ModalShell>
  );
}

// =====================================================================
// MODAL NOUVELLE ÉCRITURE MANUELLE
// =====================================================================
function NouvelleEcritureModal({ visible, onClose, societeId, exerciceId, journaux, onDone }) {
  const [comptes, setComptes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    journal_id: '',
    date_ecriture: today(),
    libelle: '',
    reference_externe: '',
    lignes: [],
  });

  const loadComptes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('get_comptes', { societe_id: societeId, statut: 'actif' });
      setComptes(data || []);
    } catch {
      setComptes([]);
    } finally {
      setLoading(false);
    }
  }, [societeId]);

  useEffect(() => {
    if (visible) {
      setForm({
        journal_id: journaux[0]?.id || '',
        date_ecriture: today(),
        libelle: '',
        reference_externe: '',
        lignes: [],
      });
      loadComptes();
    }
  }, [visible, journaux, loadComptes]);

  const addLigne = () => {
    setForm((p) => ({
      ...p,
      lignes: [...p.lignes, { compte_id: '', libelle: '', debit: '', credit: '' }],
    }));
  };

  const updateLigne = (idx, key, value) => {
    setForm((p) => {
      const lignes = [...p.lignes];
      lignes[idx] = { ...lignes[idx], [key]: value };
      // Si on saisit un débit, on vide le crédit et inversement
      if (key === 'debit' && value) lignes[idx].credit = '';
      if (key === 'credit' && value) lignes[idx].debit = '';
      return { ...p, lignes };
    });
  };

  const removeLigne = (idx) => {
    setForm((p) => ({ ...p, lignes: p.lignes.filter((_, i) => i !== idx) }));
  };

  const totals = useMemo(() => {
    let d = 0, c = 0;
    form.lignes.forEach((l) => {
      d += parseFloat(l.debit) || 0;
      c += parseFloat(l.credit) || 0;
    });
    return { d, c, ok: Math.abs(d - c) < 0.01 && d > 0 };
  }, [form.lignes]);

  const save = async () => {
    if (!form.journal_id) return Alert.alert('Erreur', 'Sélectionnez un journal');
    if (!form.libelle.trim()) return Alert.alert('Erreur', 'Libellé obligatoire');
    if (form.lignes.length < 2) return Alert.alert('Erreur', 'Au moins 2 lignes requises');
    if (!totals.ok) return Alert.alert('Erreur', `Déséquilibré : D=${totals.d} / C=${totals.c}`);

    const lignes = form.lignes.map((l) => ({
      compte_id: l.compte_id,
      libelle: l.libelle || '',
      debit: parseFloat(l.debit) || 0,
      credit: parseFloat(l.credit) || 0,
    }));
    if (lignes.some((l) => !l.compte_id)) return Alert.alert('Erreur', 'Compte manquant sur une ligne');

    setBusy(true);
    try {
      await apiCall('create_ecriture', {
        societe_id: societeId,
        exercice_id: exerciceId,
        journal_id: form.journal_id,
        date_ecriture: form.date_ecriture,
        libelle: form.libelle,
        reference_externe: form.reference_externe || null,
        origine: 'manuel',
        lignes,
      });
      Alert.alert('Succès', 'Écriture créée');
      onDone();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Nouvelle écriture"
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <PrimaryButton label="Ajouter ligne" icon="add" onPress={addLigne} color={C.blue} disabled={busy} />
          <PrimaryButton label="Enregistrer" icon="save" onPress={save} disabled={busy} />
        </View>
      }
    >
      {loading ? <Loading /> : (
        <>
          <Field label="Journal" required>
            <ChipsRow
              options={journaux.map((j) => ({ value: j.id, label: `${j.code} — ${j.libelle}` }))}
              value={form.journal_id}
              onChange={(v) => setForm((p) => ({ ...p, journal_id: v }))}
            />
          </Field>
          <Field label="Date" required>
            <TextField value={form.date_ecriture} onChangeText={(v) => setForm((p) => ({ ...p, date_ecriture: v }))} placeholder="AAAA-MM-JJ" />
          </Field>
          <Field label="Libellé" required>
            <TextField value={form.libelle} onChangeText={(v) => setForm((p) => ({ ...p, libelle: v }))} placeholder="Ex: Achat fournitures" />
          </Field>
          <Field label="Référence externe">
            <TextField value={form.reference_externe} onChangeText={(v) => setForm((p) => ({ ...p, reference_externe: v }))} />
          </Field>

          <SectionTitle icon="list" title="Lignes" />

          {form.lignes.length === 0 ? (
            <Empty title="Aucune ligne" hint="Cliquez sur Ajouter ligne." />
          ) : (
            form.lignes.map((l, idx) => (
              <View key={idx} style={styles.ligneForm}>
                <View style={styles.ligneFormHeader}>
                  <Text style={styles.ligneFormTitre}>Ligne {idx + 1}</Text>
                  <TouchableOpacity onPress={() => removeLigne(idx)}>
                    <Ionicons name="trash-outline" size={18} color={C.danger} />
                  </TouchableOpacity>
                </View>

                <Field label="Compte">
                  <ChipsRow
                    options={comptes.slice(0, 40).map((c) => ({ value: c.id, label: `${c.numero} — ${c.libelle}` }))}
                    value={l.compte_id}
                    onChange={(v) => updateLigne(idx, 'compte_id', v)}
                    color={C.primary}
                  />
                  {comptes.length > 40 ? (
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                      Astuce : utilisez le filtre de l'onglet Comptes pour limiter la liste.
                    </Text>
                  ) : null}
                </Field>

                <Field label="Libellé">
                  <TextField value={l.libelle} onChangeText={(v) => updateLigne(idx, 'libelle', v)} placeholder="Libellé ligne" />
                </Field>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Field label="Débit">
                      <TextField
                        value={String(l.debit)}
                        onChangeText={(v) => updateLigne(idx, 'debit', v.replace(/[^0-9.]/g, ''))}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Crédit">
                      <TextField
                        value={String(l.credit)}
                        onChangeText={(v) => updateLigne(idx, 'credit', v.replace(/[^0-9.]/g, ''))}
                        keyboardType="numeric"
                        placeholder="0"
                      />
                    </Field>
                  </View>
                </View>
              </View>
            ))
          )}

          <View style={styles.totalFormBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Débit</Text>
              <Text style={styles.totalValue}>{formatFCFA(totals.d)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Crédit</Text>
              <Text style={styles.totalValue}>{formatFCFA(totals.c)}</Text>
            </View>
            <View style={[
              styles.equilibreBadge,
              { backgroundColor: totals.ok ? C.successBg : C.dangerBg, marginTop: 8 },
            ]}>
              <Ionicons name={totals.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={totals.ok ? C.success : C.danger} />
              <Text style={{ color: totals.ok ? C.success : C.danger, fontWeight: '800', marginLeft: 6 }}>
                {totals.ok ? 'ÉQUILIBRÉE' : 'DÉSÉQUILIBRÉE'}
              </Text>
            </View>
          </View>
        </>
      )}
    </ModalShell>
  );
}

// =====================================================================
// ONGLET COMPTES
// =====================================================================
function ComptesTab({ societeId, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [comptes, setComptes] = useState([]);
  const [filters, setFilters] = useState({ classe: '', search: '', statut: 'actif' });
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      const data = await apiCall('get_comptes', {
        societe_id: societeId,
        classe: filters.classe || undefined,
        statut: filters.statut || undefined,
        search: filters.search || undefined,
      });
      setComptes(data || []);
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setComptes([]);
    } finally {
      setLoading(false);
    }
  }, [societeId, filters]);

  useEffect(() => { load(); }, [load]);

  const initPlan = () => {
    Alert.alert(
      'Initialiser le plan comptable',
      'Ajouter les comptes SYSCOHADA standards ? Les comptes existants seront préservés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Initialiser',
          onPress: async () => {
            try {
              const r = await apiCall('initialiser_plan_comptable', { societe_id: societeId });
              Alert.alert('Succès', `${r.comptes_ajoutes} comptes ajoutés`);
              load();
              onChanged?.();
            } catch (e) {
              Alert.alert('Erreur', e.message);
            }
          },
        },
      ]
    );
  };

  const toggle = async (c) => {
    try {
      await apiCall('toggle_compte', { societe_id: societeId, id: c.id });
      load();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  if (loading) return <Loading label="Chargement des comptes..." />;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionTitle
          icon="list"
          title={`Plan comptable (${comptes.length})`}
          right={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <GhostButton label="Init" icon="cloud-download" onPress={initPlan} color={C.purple} />
              <GhostButton label="Ajouter" icon="add" onPress={() => setCreateOpen(true)} color={C.primary} />
            </View>
          }
        />

        <View style={styles.filtersCard}>
          <Field label="Classe">
            <ChipsRow
              options={[
                { value: '', label: 'Toutes' },
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3' },
                { value: '4', label: '4' },
                { value: '5', label: '5' },
                { value: '6', label: '6' },
                { value: '7', label: '7' },
              ]}
              value={filters.classe}
              onChange={(v) => setFilters((p) => ({ ...p, classe: v }))}
            />
          </Field>
          <Field label="Recherche">
            <TextField
              value={filters.search}
              onChangeText={(v) => setFilters((p) => ({ ...p, search: v }))}
              placeholder="Numéro ou libellé"
            />
          </Field>
          <Field label="Statut">
            <ChipsRow
              options={[
                { value: 'actif', label: 'Actifs' },
                { value: 'inactif', label: 'Inactifs' },
                { value: '', label: 'Tous' },
              ]}
              value={filters.statut}
              onChange={(v) => setFilters((p) => ({ ...p, statut: v }))}
            />
          </Field>
        </View>

        {comptes.length === 0 ? (
          <Empty title="Aucun compte" hint="Initialisez le plan comptable SYSCOHADA." />
        ) : (
          comptes.map((c) => (
            <TouchableOpacity key={c.id} style={styles.compteRow} onPress={() => setSelected(c)} activeOpacity={0.8}>
              <View style={{ flex: 1 }}>
                <Text style={styles.compteNumero}>{c.numero}</Text>
                <Text style={styles.compteLibelle}>{c.libelle}</Text>
              </View>
              <View style={[styles.classeBadge, { backgroundColor: C.primary + '18' }]}>
                <Text style={[styles.classeBadgeText, { color: C.primary }]}>Cl. {c.classe}</Text>
              </View>
              <TouchableOpacity onPress={() => toggle(c)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={c.statut === 'actif' ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={c.statut === 'actif' ? C.success : C.muted}
                />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <CompteEditModal
        visible={!!selected}
        compte={selected}
        onClose={() => setSelected(null)}
        societeId={societeId}
        onDone={() => { setSelected(null); load(); onChanged?.(); }}
      />

      <CompteCreateModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        societeId={societeId}
        onDone={() => { setCreateOpen(false); load(); onChanged?.(); }}
      />
    </View>
  );
}

function CompteCreateModal({ visible, onClose, societeId, onDone }) {
  const [form, setForm] = useState({ numero: '', libelle: '', classe: '4', type_compte: 'actif' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setForm({ numero: '', libelle: '', classe: '4', type_compte: 'actif' });
  }, [visible]);

  const save = async () => {
    if (!form.numero.trim() || !form.libelle.trim()) return Alert.alert('Erreur', 'Numéro et libellé obligatoires');
    setBusy(true);
    try {
      await apiCall('create_compte', {
        societe_id: societeId,
        numero: form.numero.trim(),
        libelle: form.libelle.trim(),
        classe: parseInt(form.classe),
        type_compte: form.type_compte,
      });
      Alert.alert('Succès', 'Compte créé');
      onDone();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Nouveau compte"
      footer={<PrimaryButton label="Créer" icon="save" onPress={save} disabled={busy} />}
    >
      <Field label="Numéro" required>
        <TextField value={form.numero} onChangeText={(v) => setForm((p) => ({ ...p, numero: v }))} placeholder="Ex: 411001" />
      </Field>
      <Field label="Libellé" required>
        <TextField value={form.libelle} onChangeText={(v) => setForm((p) => ({ ...p, libelle: v }))} />
      </Field>
      <Field label="Classe" required>
        <ChipsRow
          options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))}
          value={form.classe}
          onChange={(v) => setForm((p) => ({ ...p, classe: v }))}
        />
      </Field>
      <Field label="Type">
        <ChipsRow
          options={[
            { value: 'actif', label: 'Actif' },
            { value: 'passif', label: 'Passif' },
            { value: 'charge', label: 'Charge' },
            { value: 'produit', label: 'Produit' },
            { value: 'tresorerie', label: 'Trésorerie' },
            { value: 'tiers', label: 'Tiers' },
          ]}
          value={form.type_compte}
          onChange={(v) => setForm((p) => ({ ...p, type_compte: v }))}
        />
      </Field>
    </ModalShell>
  );
}

function CompteEditModal({ visible, compte, onClose, societeId, onDone }) {
  const [form, setForm] = useState({ libelle: '', statut: 'actif' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (compte) setForm({ libelle: compte.libelle, statut: compte.statut });
  }, [compte]);

  const save = async () => {
    setBusy(true);
    try {
      await apiCall('update_compte', { societe_id: societeId, id: compte.id, ...form });
      Alert.alert('Succès', 'Compte mis à jour');
      onDone();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!compte) return null;

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title={`Compte ${compte.numero}`}
      footer={<PrimaryButton label="Enregistrer" icon="save" onPress={save} disabled={busy} />}
    >
      <Field label="Libellé">
        <TextField value={form.libelle} onChangeText={(v) => setForm((p) => ({ ...p, libelle: v }))} />
      </Field>
      <Field label="Statut">
        <ChipsRow
          options={[
            { value: 'actif', label: 'Actif' },
            { value: 'inactif', label: 'Inactif' },
          ]}
          value={form.statut}
          onChange={(v) => setForm((p) => ({ ...p, statut: v }))}
        />
      </Field>
    </ModalShell>
  );
}

// =====================================================================
// ONGLET ÉTATS
// =====================================================================
function EtatsTab({ societeId }) {
  const [sub, setSub] = useState('grand_livre');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [comptes, setComptes] = useState([]);
  const [filters, setFilters] = useState({
    compte_id: '',
    date_debut: firstOfMonth(),
    date_fin: today(),
  });

  const load = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      let action = 'get_grand_livre';
      if (sub === 'balance') action = 'get_balance';
      else if (sub === 'bilan') action = 'get_bilan';
      else if (sub === 'resultat') action = 'get_compte_resultat';
      const d = await apiCall(action, {
        societe_id: societeId,
        compte_id: filters.compte_id || undefined,
        date_debut: filters.date_debut || undefined,
        date_fin: filters.date_fin || undefined,
      });
      setData(d);
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [societeId, sub, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const c = await apiCall('get_comptes', { societe_id: societeId, statut: 'actif' });
        setComptes(c || []);
      } catch {}
    })();
  }, [societeId]);

  return (
    <View style={{ flex: 1 }}>
      <SubTabs
        tabs={[
          { key: 'grand_livre', label: 'Grand livre', icon: 'book' },
          { key: 'balance', label: 'Balance', icon: 'stats-chart' },
          { key: 'bilan', label: 'Bilan', icon: 'albums' },
          { key: 'resultat', label: 'Résultat', icon: 'trending-up' },
        ]}
        active={sub}
        onChange={setSub}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.filtersCard}>
          <Field label="Période">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={filters.date_debut}
                onChangeText={(v) => setFilters((p) => ({ ...p, date_debut: v }))}
                placeholder="AAAA-MM-JJ"
                style={[styles.textInput, { flex: 1 }]}
              />
              <TextInput
                value={filters.date_fin}
                onChangeText={(v) => setFilters((p) => ({ ...p, date_fin: v }))}
                placeholder="AAAA-MM-JJ"
                style={[styles.textInput, { flex: 1 }]}
              />
            </View>
          </Field>

          {sub === 'grand_livre' && (
            <Field label="Compte">
              <ChipsRow
                options={[{ value: '', label: 'Tous' }, ...comptes.slice(0, 30).map((c) => ({ value: c.id, label: `${c.numero}` }))]}
                value={filters.compte_id}
                onChange={(v) => setFilters((p) => ({ ...p, compte_id: v }))}
              />
            </Field>
          )}

          <PrimaryButton label="Actualiser" icon="refresh" onPress={load} color={C.blue} />
        </View>

        {loading ? <Loading /> : !data ? (
          <Empty title="Aucune donnée" hint="Ajustez les filtres." />
        ) : sub === 'grand_livre' ? (
          <>
            <SectionTitle icon="book" title="Grand livre" />
            {data.length === 0 ? <Empty title="Aucun mouvement" /> : data.map((r, i) => (
              <View key={i} style={styles.glRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.glDate}>{formatDate(r.date_ecriture)} · {r.numero_piece} · {r.journal_code}</Text>
                  <Text style={styles.glCompte}>{r.compte_numero} — {r.compte_libelle}</Text>
                  <Text style={styles.glLibelle} numberOfLines={1}>{r.ligne_libelle || r.ecriture_libelle}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {f(r.debit) > 0 && <Text style={styles.glDebit}>{formatFCFA(r.debit)}</Text>}
                  {f(r.credit) > 0 && <Text style={styles.glCredit}>{formatFCFA(r.credit)}</Text>}
                </View>
              </View>
            ))}
          </>
        ) : sub === 'balance' ? (
          <>
            <SectionTitle icon="stats-chart" title="Balance générale" />
            {data.map((r, i) => (
              <View key={i} style={styles.balanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.balanceNumero}>{r.numero}</Text>
                  <Text style={styles.balanceLibelle}>{r.libelle}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.balanceDebit}>{formatFCFA(r.total_debit)}</Text>
                  <Text style={styles.balanceCredit}>{formatFCFA(r.total_credit)}</Text>
                  <Text style={styles.balanceSolde}>
                    {formatFCFA(r.solde_debiteur || r.solde_crediteur)}
                  </Text>
                </View>
              </View>
            ))}
          </>
        ) : sub === 'bilan' ? (
          <>
            <View style={styles.kpiRow}>
              <KPI label="Total Actif" value={formatFCFA(data.total_actif)} icon="trending-up" color={C.success} bg={C.successBg} />
              <KPI label="Total Passif" value={formatFCFA(data.total_passif)} icon="trending-down" color={C.blue} bg={C.blueBg} />
            </View>
            <SectionTitle icon="albums" title="Détail" />
            {data.detail?.map((r, i) => (
              <View key={i} style={styles.balanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.balanceNumero}>{r.numero}</Text>
                  <Text style={styles.balanceLibelle}>{r.libelle}</Text>
                </View>
                <Text style={[styles.balanceSolde, { color: r.solde >= 0 ? C.success : C.danger }]}>
                  {formatFCFA(r.solde)}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.kpiRow}>
              <KPI label="Charges" value={formatFCFA(data.total_charges)} icon="arrow-down" color={C.danger} bg={C.dangerBg} />
              <KPI label="Produits" value={formatFCFA(data.total_produits)} icon="arrow-up" color={C.success} bg={C.successBg} />
            </View>
            <View style={styles.kpiRow}>
              <KPI
                label="Résultat net"
                value={formatFCFA(data.resultat_net)}
                icon={data.resultat_net >= 0 ? 'trending-up' : 'trending-down'}
                color={data.resultat_net >= 0 ? C.success : C.danger}
                bg={data.resultat_net >= 0 ? C.successBg : C.dangerBg}
              />
            </View>
            <SectionTitle icon="list" title="Détail" />
            {data.detail?.map((r, i) => (
              <View key={i} style={styles.balanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.balanceNumero}>{r.numero}</Text>
                  <Text style={styles.balanceLibelle}>{r.libelle}</Text>
                </View>
                <Text style={[styles.balanceSolde, { color: r.solde >= 0 ? C.success : C.danger }]}>
                  {formatFCFA(r.solde)}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// =====================================================================
// ONGLET FISCALITÉ
// =====================================================================
function FiscaliteTab({ societeId }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ date_debut: firstOfMonth(), date_fin: today() });

  const load = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      const d = await apiCall('get_tva', {
        societe_id: societeId,
        date_debut: filters.date_debut,
        date_fin: filters.date_fin,
      });
      setData(d);
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [societeId, filters]);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.filtersCard}>
        <Field label="Période">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={filters.date_debut}
              onChangeText={(v) => setFilters((p) => ({ ...p, date_debut: v }))}
              placeholder="AAAA-MM-JJ"
              style={[styles.textInput, { flex: 1 }]}
            />
            <TextInput
              value={filters.date_fin}
              onChangeText={(v) => setFilters((p) => ({ ...p, date_fin: v }))}
              placeholder="AAAA-MM-JJ"
              style={[styles.textInput, { flex: 1 }]}
            />
          </View>
        </Field>
        <PrimaryButton label="Calculer" icon="calculator" onPress={load} color={C.blue} />
      </View>

      {loading ? <Loading /> : !data ? (
        <Empty title="Aucune donnée TVA" />
      ) : (
        <>
          <KPI label="TVA Collectée" value={formatFCFA(data.tva_collectee)} icon="arrow-up" color={C.success} bg={C.successBg} />
          <View style={{ height: 8 }} />
          <KPI label="TVA Récupérable" value={formatFCFA(data.tva_recuperable)} icon="arrow-down" color={C.blue} bg={C.blueBg} />
          <View style={{ height: 8 }} />
          <KPI label="TVA à décaisser" value={formatFCFA(data.tva_a_decaisser)} icon="cash" color={C.danger} bg={C.dangerBg} />
          <View style={{ height: 8 }} />
          <KPI label="Crédit TVA" value={formatFCFA(data.credit_tva)} icon="ribbon" color={C.purple} bg={C.purpleBg} />

          <View style={styles.alertBox}>
            <Ionicons name="information-circle" size={20} color={C.blue} />
            <Text style={styles.alertText}>
              TVA à décaisser = TVA collectée − TVA récupérable. Période : {formatDate(data.periode?.debut)} → {formatDate(data.periode?.fin)}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// =====================================================================
// ONGLET ACTIFS (Immobilisations + Amortissements + Lettrage)
// =====================================================================
function ActifsTab({ societeId }) {
  const [sub, setSub] = useState('immo');
  return (
    <View style={{ flex: 1 }}>
      <SubTabs
        tabs={[
          { key: 'immo', label: 'Immobilisations', icon: 'business' },
          { key: 'amort', label: 'Amortissements', icon: 'trending-down' },
          { key: 'lettrage', label: 'Lettrage', icon: 'link' },
        ]}
        active={sub}
        onChange={setSub}
      />
      {sub === 'immo' && <ImmobilisationsSection societeId={societeId} />}
      {sub === 'amort' && <AmortissementsSection societeId={societeId} />}
      {sub === 'lettrage' && <LettrageSection societeId={societeId} />}
    </View>
  );
}

function ImmobilisationsSection({ societeId }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      const [im, cp] = await Promise.all([
        apiCall('get_immobilisations', { societe_id: societeId }),
        apiCall('get_comptes', { societe_id: societeId, classe: 2, statut: 'actif' }),
      ]);
      setItems(im || []);
      setComptes(cp || []);
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [societeId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle
        icon="business"
        title={`Immobilisations (${items.length})`}
        right={<GhostButton label="Ajouter" icon="add" onPress={() => setCreateOpen(true)} color={C.primary} />}
      />

      {items.length === 0 ? (
        <Empty title="Aucune immobilisation" hint="Ajoutez vos immobilisations (matériel, véhicules...)." />
      ) : (
        items.map((i) => {
          const vnc = f(i.valeur_acquisition) - f(i.valeur_residuelle);
          return (
            <TouchableOpacity key={i.id} style={styles.immoCard} onPress={() => setSelected(i)} activeOpacity={0.85}>
              <View style={styles.immoHeader}>
                <View style={[styles.immoIcon, { backgroundColor: C.blue + '18' }]}>
                  <Ionicons name="business" size={18} color={C.blue} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.immoTitre} numberOfLines={1}>{i.libelle}</Text>
                  <Text style={styles.immoSub}>{i.compte_numero} — {i.compte_libelle}</Text>
                </View>
              </View>
              <View style={styles.immoStats}>
                <View>
                  <Text style={styles.immoLabel}>Valeur</Text>
                  <Text style={styles.immoValue}>{formatFCFA(i.valeur_acquisition)}</Text>
                </View>
                <View>
                  <Text style={styles.immoLabel}>Durée</Text>
                  <Text style={styles.immoValue}>{i.duree_amortissement} ans</Text>
                </View>
                <View>
                  <Text style={styles.immoLabel}>Base amortissable</Text>
                  <Text style={styles.immoValue}>{formatFCFA(vnc)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      <ImmoEditModal
        visible={!!selected}
        immo={selected}
        comptes={comptes}
        societeId={societeId}
        onClose={() => setSelected(null)}
        onDone={() => { setSelected(null); load(); }}
      />

      <ImmoCreateModal
        visible={createOpen}
        comptes={comptes}
        societeId={societeId}
        onClose={() => setCreateOpen(false)}
        onDone={() => { setCreateOpen(false); load(); }}
      />
    </ScrollView>
  );
}

function ImmoCreateModal({ visible, comptes, societeId, onClose, onDone }) {
  const [form, setForm] = useState({
    libelle: '', compte_id: '', reference: '',
    date_acquisition: today(), date_mise_service: today(),
    valeur_acquisition: '', valeur_residuelle: '0',
    duree_amortissement: '5', methode_amortissement: 'lineaire',
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) setForm({
      libelle: '', compte_id: '', reference: '',
      date_acquisition: today(), date_mise_service: today(),
      valeur_acquisition: '', valeur_residuelle: '0',
      duree_amortissement: '5', methode_amortissement: 'lineaire',
    });
  }, [visible]);

  const save = async () => {
    if (!form.libelle.trim() || !form.compte_id || !form.valeur_acquisition) {
      return Alert.alert('Erreur', 'Libellé, compte et valeur obligatoires');
    }
    setBusy(true);
    try {
      await apiCall('create_immobilisation', {
        societe_id: societeId,
        libelle: form.libelle,
        compte_id: form.compte_id,
        reference: form.reference,
        date_acquisition: form.date_acquisition,
        date_mise_service: form.date_mise_service,
        valeur_acquisition: parseFloat(form.valeur_acquisition) || 0,
        valeur_residuelle: parseFloat(form.valeur_residuelle) || 0,
        duree_amortissement: parseInt(form.duree_amortissement) || 1,
        methode_amortissement: form.methode_amortissement,
      });
      Alert.alert('Succès', 'Immobilisation créée');
      onDone();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell visible={visible} onClose={onClose} title="Nouvelle immobilisation" footer={<PrimaryButton label="Créer" icon="save" onPress={save} disabled={busy} />}>
      <Field label="Libellé" required>
        <TextField value={form.libelle} onChangeText={(v) => setForm((p) => ({ ...p, libelle: v }))} />
      </Field>
      <Field label="Compte (classe 2)" required>
        <ChipsRow
          options={comptes.map((c) => ({ value: c.id, label: `${c.numero} — ${c.libelle}` }))}
          value={form.compte_id}
          onChange={(v) => setForm((p) => ({ ...p, compte_id: v }))}
        />
      </Field>
      <Field label="Référence">
        <TextField value={form.reference} onChangeText={(v) => setForm((p) => ({ ...p, reference: v }))} />
      </Field>
      <Field label="Date d'acquisition" required>
        <TextField value={form.date_acquisition} onChangeText={(v) => setForm((p) => ({ ...p, date_acquisition: v }))} placeholder="AAAA-MM-JJ" />
      </Field>
      <Field label="Date de mise en service">
        <TextField value={form.date_mise_service} onChangeText={(v) => setForm((p) => ({ ...p, date_mise_service: v }))} placeholder="AAAA-MM-JJ" />
      </Field>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="Valeur acquisition" required>
            <TextField value={form.valeur_acquisition} onChangeText={(v) => setForm((p) => ({ ...p, valeur_acquisition: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" placeholder="0" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Valeur résiduelle">
            <TextField value={form.valeur_residuelle} onChangeText={(v) => setForm((p) => ({ ...p, valeur_residuelle: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" placeholder="0" />
          </Field>
        </View>
      </View>
      <Field label="Durée amortissement (années)" required>
        <TextField value={form.duree_amortissement} onChangeText={(v) => setForm((p) => ({ ...p, duree_amortissement: v.replace(/[^0-9]/g, '') }))} keyboardType="numeric" placeholder="5" />
      </Field>
      <Field label="Méthode">
        <ChipsRow
          options={[{ value: 'lineaire', label: 'Linéaire' }, { value: 'degressif', label: 'Dégressif' }]}
          value={form.methode_amortissement}
          onChange={(v) => setForm((p) => ({ ...p, methode_amortissement: v }))}
        />
      </Field>
    </ModalShell>
  );
}

function ImmoEditModal({ visible, immo, comptes, societeId, onClose, onDone }) {
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (immo) setForm({
      libelle: immo.libelle,
      reference: immo.reference || '',
      date_acquisition: immo.date_acquisition,
      date_mise_service: immo.date_mise_service || immo.date_acquisition,
      valeur_acquisition: String(immo.valeur_acquisition),
      valeur_residuelle: String(immo.valeur_residuelle),
      duree_amortissement: String(immo.duree_amortissement),
      statut: immo.statut,
    });
  }, [immo]);

  if (!immo || !form) return null;

  const save = async () => {
    setBusy(true);
    try {
      await apiCall('update_immobilisation', {
        societe_id: societeId,
        id: immo.id,
        libelle: form.libelle,
        reference: form.reference,
        date_acquisition: form.date_acquisition,
        date_mise_service: form.date_mise_service,
        valeur_acquisition: parseFloat(form.valeur_acquisition) || 0,
        valeur_residuelle: parseFloat(form.valeur_residuelle) || 0,
        duree_amortissement: parseInt(form.duree_amortissement) || 1,
        statut: form.statut,
      });
      Alert.alert('Succès', 'Immobilisation mise à jour');
      onDone();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  const calcAmort = async () => {
    setBusy(true);
    try {
      const r = await apiCall('calculate_amortissement', { societe_id: societeId, immobilisation_id: immo.id });
      Alert.alert('Succès', `Dotation : ${formatFCFA(r.dotation)}\nCumul : ${formatFCFA(r.cumul)}\nVNC : ${formatFCFA(r.valeur_nette)}`);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title={immo.libelle}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <PrimaryButton label="Amortir" icon="calculator" onPress={calcAmort} disabled={busy} color={C.purple} />
          <PrimaryButton label="Enregistrer" icon="save" onPress={save} disabled={busy} />
        </View>
      }
    >
      <Field label="Libellé"><TextField value={form.libelle} onChangeText={(v) => setForm((p) => ({ ...p, libelle: v }))} /></Field>
      <Field label="Référence"><TextField value={form.reference} onChangeText={(v) => setForm((p) => ({ ...p, reference: v }))} /></Field>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field label="Valeur acquisition"><TextField value={form.valeur_acquisition} onChangeText={(v) => setForm((p) => ({ ...p, valeur_acquisition: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" /></Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Valeur résiduelle"><TextField value={form.valeur_residuelle} onChangeText={(v) => setForm((p) => ({ ...p, valeur_residuelle: v.replace(/[^0-9.]/g, '') }))} keyboardType="numeric" /></Field>
        </View>
      </View>
      <Field label="Durée amortissement"><TextField value={form.duree_amortissement} onChangeText={(v) => setForm((p) => ({ ...p, duree_amortissement: v.replace(/[^0-9]/g, '') }))} keyboardType="numeric" /></Field>
      <Field label="Statut">
        <ChipsRow
          options={[{ value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Inactif' }]}
          value={form.statut}
          onChange={(v) => setForm((p) => ({ ...p, statut: v }))}
        />
      </Field>
    </ModalShell>
  );
}

function AmortissementsSection({ societeId }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      const d = await apiCall('get_amortissements', { societe_id: societeId });
      setItems(d || []);
    } catch (e) {
      Alert.alert('Erreur', e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [societeId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
      showsVerticalScrollIndicator={false}
    >
      <SectionTitle icon="trending-down" title={`Amortissements (${items.length})`} />
      {items.length === 0 ? (
        <Empty title="Aucun amortissement" hint="Calculez l'amortissement depuis une immobilisation." />
      ) : (
        items.map((a) => (
          <View key={a.id} style={styles.amortRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.amortTitre} numberOfLines={1}>{a.immo_libelle}</Text>
              <Text style={styles.amortSub}>{a.periode} — {formatDate(a.date)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.amortDot}>{formatFCFA(a.dotation)}</Text>
              <Text style={styles.amortCumul}>Cumul {formatFCFA(a.cumul_amortissement)}</Text>
              <Text style={styles.amortVNC}>VNC {formatFCFA(a.valeur_nette)}</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function LettrageSection({ societeId }) {
  const [comptes, setComptes] = useState([]);
  const [compteId, setCompteId] = useState('');
  const [lignes, setLignes] = useState([]);
  const [selected, setSelected] = useState([]);
  const [lettrages, setLettrages] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadComptes = useCallback(async () => {
    try {
      const c = await apiCall('get_comptes', { societe_id: societeId, classe: 4, statut: 'actif' });
      setComptes(c || []);
    } catch {}
  }, [societeId]);

  const loadLignes = useCallback(async () => {
    if (!societeId || !compteId) return;
    setLoading(true);
    try {
      const [ln, lt] = await Promise.all([
        apiCall('get_lignes_non_lettrees', { societe_id: societeId, compte_id: compteId }),
        apiCall('get_lettrages', { societe_id: societeId, compte_id: compteId }),
      ]);
      setLignes(ln || []);
      setLettrages(lt || []);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }, [societeId, compteId]);

  useEffect(() => { loadComptes(); }, [loadComptes]);
  useEffect(() => { loadLignes(); }, [loadLignes]);

  const toggle = (id) => {
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  const totalD = useMemo(() => {
    let d = 0, c = 0;
    lignes.forEach((l) => {
      if (selected.includes(l.id)) {
        d += f(l.debit);
        c += f(l.credit);
      }
    });
    return { d, c, ok: Math.abs(d - c) < 0.01 && d > 0 };
  }, [selected, lignes]);

  const lettrer = async () => {
    if (selected.length < 2) return Alert.alert('Erreur', 'Sélectionnez au moins 2 lignes');
    if (!totalD.ok) return Alert.alert('Erreur', 'Le lettrage doit être équilibré');
    try {
      const r = await apiCall('create_lettrage', { societe_id: societeId, compte_id: compteId, ligne_ids: selected });
      Alert.alert('Succès', `Lettrage ${r.code_lettrage} créé`);
      setSelected([]);
      loadLignes();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
      showsVerticalScrollIndicator={false}
    >
      <Field label="Compte tiers (classe 4)">
        <ChipsRow
          options={comptes.map((c) => ({ value: c.id, label: `${c.numero}` }))}
          value={compteId}
          onChange={setCompteId}
        />
      </Field>

      {compteId && (
        <>
          <SectionTitle
            icon="link"
            title={`Lignes non lettrées (${lignes.length})`}
            right={<GhostButton label="Lettrer" icon="link" onPress={lettrer} color={C.accent} />}
          />

          {loading ? <Loading /> : lignes.length === 0 ? (
            <Empty title="Aucune ligne à lettrer" />
          ) : (
            lignes.map((l) => {
              const isSel = selected.includes(l.id);
              return (
                <TouchableOpacity key={l.id} style={[styles.lettrageRow, isSel && { borderColor: C.accent, borderWidth: 2 }]} onPress={() => toggle(l.id)} activeOpacity={0.85}>
                  <Ionicons name={isSel ? 'checkbox' : 'square-outline'} size={20} color={isSel ? C.accent : C.muted} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.lettrageTitre}>{l.numero_piece} — {formatDate(l.date_ecriture)}</Text>
                    <Text style={styles.lettrageSub} numberOfLines={1}>{l.libelle}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {f(l.debit) > 0 && <Text style={styles.glDebit}>{formatFCFA(l.debit)} D</Text>}
                    {f(l.credit) > 0 && <Text style={styles.glCredit}>{formatFCFA(l.credit)} C</Text>}
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {selected.length > 0 && (
            <View style={styles.totalFormBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Débit sélectionné</Text>
                <Text style={styles.totalValue}>{formatFCFA(totalD.d)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Crédit sélectionné</Text>
                <Text style={styles.totalValue}>{formatFCFA(totalD.c)}</Text>
              </View>
              <View style={[styles.equilibreBadge, { backgroundColor: totalD.ok ? C.successBg : C.dangerBg, marginTop: 8 }]}>
                <Ionicons name={totalD.ok ? 'checkmark-circle' : 'alert-circle'} size={16} color={totalD.ok ? C.success : C.danger} />
                <Text style={{ color: totalD.ok ? C.success : C.danger, fontWeight: '800', marginLeft: 6 }}>
                  {totalD.ok ? 'PRÊT À LETTRER' : 'DÉSÉQUILIBRÉ'}
                </Text>
              </View>
            </View>
          )}

          <SectionTitle icon="bookmark" title={`Lettrages existants (${lettrages.length})`} />
          {lettrages.length === 0 ? (
            <Empty title="Aucun lettrage" />
          ) : (
            lettrages.map((l) => (
              <View key={l.id} style={styles.lettrageRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lettrageTitre}>Code {l.code_lettrage}</Text>
                  <Text style={styles.lettrageSub}>{l.numero_piece} — {formatDate(l.date_ecriture)}</Text>
                </View>
                <Text style={styles.lettrageMontant}>{formatFCFA(l.montant)}</Text>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

// =====================================================================
// ÉCRAN PRINCIPAL
// =====================================================================
export default function ComptabiliteScreen({ onBack, colors = {},embedded = false, }) {
  const [tab, setTab] = useState('ecritures');
  const [societeId, setSocieteId] = useState(null);
  const [utilisateurId, setUtilisateurId] = useState(null);
  const [exerciceId, setExerciceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapModal, setBootstrapModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const sid = await AsyncStorage.getItem('@rouah_societe_id');
        const uRaw = await AsyncStorage.getItem('@rouah_user');
        const u = uRaw ? JSON.parse(uRaw) : null;
        setSocieteId(sid);
        setUtilisateurId(u?.utilisateur_id || null);

        if (sid) {
          const ex = await apiCall('get_exercice_courant', { societe_id: sid }).catch(() => null);
          if (ex?.id) setExerciceId(ex.id);
          else setBootstrapModal(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const headerTitle = useMemo(() => ({
    ecritures: 'Écritures comptables',
    comptes: 'Plan comptable',
    etats: 'États financiers',
    fiscalite: 'Fiscalité & TVA',
    actifs: 'Immobilisations & Lettrage',
  }[tab] || 'Comptabilité'), [tab]);

  if (loading || !societeId) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <Loading label="Initialisation du module..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Comptabilité</Text>
          <Text style={styles.headerSub}>{headerTitle}</Text>
        </View>
        <View style={styles.headerIconBox}>
          <MaterialCommunityIcons name="calculator" size={22} color="#fff" />
        </View>
      </View>

      {/* Onglets principaux */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { key: 'ecritures', label: 'Écritures', icon: 'documents' },
            { key: 'comptes', label: 'Comptes', icon: 'list' },
            { key: 'etats', label: 'États', icon: 'stats-chart' },
            { key: 'fiscalite', label: 'Fiscalité', icon: 'receipt' },
            { key: 'actifs', label: 'Actifs', icon: 'business' },
          ].map((t) => {
            const isActive = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.85}
              >
                <Ionicons name={t.icon} size={16} color={isActive ? '#fff' : C.primary} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Contenu */}
      <View style={{ flex: 1 }}>
        {tab === 'ecritures' && <EcrituresTab societeId={societeId} utilisateurId={utilisateurId} exerciceId={exerciceId} />}
        {tab === 'comptes' && <ComptesTab societeId={societeId} />}
        {tab === 'etats' && <EtatsTab societeId={societeId} />}
        {tab === 'fiscalite' && <FiscaliteTab societeId={societeId} />}
        {tab === 'actifs' && <ActifsTab societeId={societeId} />}
      </View>

      {/* Bootstrap : création exercice + init plan */}
      <BootstrapModal
        visible={bootstrapModal}
        onClose={() => setBootstrapModal(false)}
        societeId={societeId}
        onDone={(exId) => { setExerciceId(exId); setBootstrapModal(false); }}
      />
    </SafeAreaView>
  );
}

function BootstrapModal({ visible, onClose, societeId, onDone }) {
  const [libelle, setLibelle] = useState(`Exercice ${new Date().getFullYear()}`);
  const [dateDebut, setDateDebut] = useState(`${new Date().getFullYear()}-01-01`);
  const [dateFin, setDateFin] = useState(`${new Date().getFullYear()}-12-31`);
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!libelle.trim()) return Alert.alert('Erreur', 'Libellé obligatoire');
    setBusy(true);
    try {
      const r = await apiCall('create_exercice', {
        societe_id: societeId,
        libelle: libelle.trim(),
        date_debut: dateDebut,
        date_fin: dateFin,
      });
      await apiCall('set_exercice_courant', { societe_id: societeId, id: r.id });
      await apiCall('initialiser_plan_comptable', { societe_id: societeId }).catch(() => null);
      Alert.alert('Succès', 'Exercice créé et plan comptable initialisé');
      onDone(r.id);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      visible={visible}
      onClose={onClose}
      title="Initialisation comptable"
      height="70%"
      footer={<PrimaryButton label="Créer et initialiser" icon="checkmark-circle" onPress={go} disabled={busy} />}
    >
      <Text style={{ fontSize: 14, color: C.muted, marginBottom: 16, lineHeight: 20 }}>
        Aucun exercice comptable n'existe. Créez le premier exercice pour démarrer.
      </Text>
      <Field label="Libellé" required>
        <TextField value={libelle} onChangeText={setLibelle} />
      </Field>
      <Field label="Date de début" required>
        <TextField value={dateDebut} onChangeText={setDateDebut} placeholder="AAAA-MM-JJ" />
      </Field>
      <Field label="Date de fin" required>
        <TextField value={dateFin} onChangeText={setDateFin} placeholder="AAAA-MM-JJ" />
      </Field>
      <View style={styles.alertBox}>
        <Ionicons name="information-circle" size={20} color={C.blue} />
        <Text style={styles.alertText}>
          Le plan comptable SYSCOHADA de base sera automatiquement créé (classes 1 à 7).
        </Text>
      </View>
    </ModalShell>
  );
}

// =====================================================================
// STYLES
// =====================================================================
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 12, gap: 8,
    backgroundColor: C.primary,
  },
  headerBtn: { padding: 6 },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
  headerIconBox: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Tabs principaux
  tabsContainer: { backgroundColor: C.primary, paddingBottom: 10 },
  tabsScroll: { paddingHorizontal: 12, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: C.primary },

  // Section
  sectionTitle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, marginBottom: 10,
  },
  sectionTitleLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionTitleText: { fontSize: 14, fontWeight: '800', color: C.text },
  sectionSubtitle: { fontSize: 11, color: C.muted, marginTop: 1 },

  // KPI
  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  kpiCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  kpiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  kpiLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  kpiValue: { fontSize: 18, fontWeight: '900' },

  // Pill
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  pillText: { fontSize: 10, fontWeight: '800' },

  // Empty / Loading
  emptyBox: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: C.muted, fontSize: 14, fontWeight: '700', marginTop: 10, textAlign: 'center' },
  emptyHint: { color: C.muted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: C.muted, marginTop: 12, fontSize: 13 },

  // Form
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 6 },
  textInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    backgroundColor: '#fff', color: C.text,
  },

  // Chips
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, backgroundColor: '#fff',
  },
  chipText: { fontSize: 12, fontWeight: '600', color: C.text },

  // Buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, flex: 1,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1.5, backgroundColor: '#fff',
  },
  ghostBtnText: { fontSize: 12, fontWeight: '700' },

  // Filters card
  filtersCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },

  // Actions row
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },

  // Écritures
  ecrCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  ecrHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  ecrIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ecrNumero: { fontSize: 13, fontWeight: '800', color: C.text },
  ecrLibelle: { fontSize: 12, color: C.muted, marginTop: 1 },
  statutBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statutBadgeText: { fontSize: 10, fontWeight: '800' },
  ecrFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  ecrDate: { fontSize: 11, color: C.muted },
  ecrJournal: { fontSize: 11, color: C.primary, fontWeight: '700' },
  ecrMontant: { marginLeft: 'auto', fontSize: 14, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', paddingTop: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '800', color: C.text },
  modalFooter: {
    padding: 12, borderTopWidth: 1, borderTopColor: C.border,
    backgroundColor: '#fff',
  },

  // Détail écriture
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  detailNumero: { fontSize: 18, fontWeight: '900', color: C.text },
  detailRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  detailLabel: { width: 120, fontSize: 12, color: C.muted, fontWeight: '600' },
  detailValue: { flex: 1, fontSize: 13, color: C.text, fontWeight: '600' },

  ligneRow: {
    flexDirection: 'row', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  ligneCompte: { fontSize: 13, fontWeight: '700', color: C.text },
  ligneLibelle: { fontSize: 11, color: C.muted, marginTop: 2 },
  ligneDebit: { color: C.danger, fontSize: 13, fontWeight: '800' },
  ligneCredit: { color: C.success, fontSize: 13, fontWeight: '800' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 13, fontWeight: '700', color: C.text },
  totalValue: { fontSize: 14, fontWeight: '900', color: C.text },
  equilibreBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: 10, marginTop: 8,
  },

  // Nouvelle écriture
  ligneForm: {
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  ligneFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ligneFormTitre: { fontSize: 12, fontWeight: '800', color: C.primary },
  totalFormBox: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#bbf7d0', marginTop: 12,
  },

  // Comptes
  compteRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, marginBottom: 6, gap: 10,
  },
  compteNumero: { fontSize: 13, fontWeight: '800', color: C.primary },
  compteLibelle: { fontSize: 12, color: C.text, marginTop: 1 },
  classeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  classeBadgeText: { fontSize: 10, fontWeight: '800' },

  // Grand livre / Balance / Bilan
  glRow: {
    flexDirection: 'row', padding: 12, backgroundColor: '#fff',
    borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 6, gap: 10,
  },
  glDate: { fontSize: 11, color: C.muted },
  glCompte: { fontSize: 13, fontWeight: '800', color: C.primary, marginTop: 2 },
  glLibelle: { fontSize: 11, color: C.text, marginTop: 2 },
  glDebit: { color: C.danger, fontWeight: '800', fontSize: 13 },
  glCredit: { color: C.success, fontWeight: '800', fontSize: 13 },

  balanceRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, marginBottom: 6, gap: 10,
  },
  balanceNumero: { fontSize: 13, fontWeight: '800', color: C.primary },
  balanceLibelle: { fontSize: 12, color: C.text, marginTop: 1 },
  balanceDebit: { fontSize: 11, color: C.danger, fontWeight: '700' },
  balanceCredit: { fontSize: 11, color: C.success, fontWeight: '700' },
  balanceSolde: { fontSize: 13, fontWeight: '900', color: C.text, marginTop: 2 },

  // Alert
  alertBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.blueBg, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.blue + '30', marginTop: 12,
  },
  alertText: { flex: 1, color: C.blue, fontSize: 12, lineHeight: 18 },

  // Auto génération
  autoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, marginBottom: 6,
  },
  autoTitre: { fontSize: 13, fontWeight: '800', color: C.text },
  autoSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  autoMontant: { fontSize: 13, fontWeight: '800', color: C.primary },
  autoBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.success, alignItems: 'center', justifyContent: 'center',
  },

  // Immobilisations
  immoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, marginBottom: 8,
  },
  immoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  immoIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  immoTitre: { fontSize: 13, fontWeight: '800', color: C.text },
  immoSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  immoStats: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  immoLabel: { fontSize: 10, color: C.muted, fontWeight: '600' },
  immoValue: { fontSize: 12, fontWeight: '800', color: C.text, marginTop: 2 },

  // Amortissements
  amortRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, marginBottom: 6, gap: 10,
  },
  amortTitre: { fontSize: 13, fontWeight: '800', color: C.text },
  amortSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  amortDot: { fontSize: 13, fontWeight: '900', color: C.purple },
  amortCumul: { fontSize: 10, color: C.muted, marginTop: 2 },
  amortVNC: { fontSize: 10, color: C.success, fontWeight: '700', marginTop: 2 },

  // Lettrage
  lettrageRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, marginBottom: 6,
  },
  lettrageTitre: { fontSize: 13, fontWeight: '800', color: C.text },
  lettrageSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  lettrageMontant: { fontSize: 13, fontWeight: '800', color: C.accent },

  // Sub tabs
  subTabsBar: {
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.border,
    paddingVertical: 10,
  },
  subTab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.primary, backgroundColor: '#fff',
  },
  subTabActive: { backgroundColor: C.primary },
  subTabText: { fontSize: 12, fontWeight: '700', color: C.primary },
  subTabTextActive: { color: '#fff' },
});