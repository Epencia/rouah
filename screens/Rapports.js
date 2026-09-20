// Rapports.js - Version avec onglets Clients et Fournisseurs

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar, Alert, Linking,TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const API_URL = 'https://rouah.net/api/api-rapport.php';
const API_PDF_URL = 'https://rouah.net/api/api-rapport-pdf.php';

const DEFAULT_COLORS = {
  primary: '#075E54',
  surface: '#ffffff',
  border: '#e5e7eb',
  text: '#111827',
  muted: '#6b7280',
  background: '#f3f4f6',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#f59e0b',
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function formatDateDisplay(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
}

export default function RapportsScreen({ societeId, boutiqueId, colors: colorsProp, onBack, isModal = false }) {
  
  const colors = { ...DEFAULT_COLORS, ...(colorsProp || {}) };
  const [tab, setTab] = useState('resume');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [searchText, setSearchText] = useState('');

  const [dateDebut, setDateDebut] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateFin, setDateFin] = useState(() => new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('debut');

  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      const actions = {
        resume: 'rapport_resume',
        ventes: 'rapport_ventes',
        achats: 'rapport_achats',
        stocks: 'rapport_stocks',
        finances: 'rapport_finances',
        rentabilite: 'rapport_rentabilite',
        clients: 'rapport_clients',
        fournisseurs: 'rapport_fournisseurs',
      };
      
      const strDebut = formatDate(dateDebut);
      const strFin = formatDate(dateFin);

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actions[tab],
          societe_id: societeId,
          boutique_id: boutiqueId || undefined,
          date_debut: strDebut,
          date_fin: strFin,
        }),
      });
      const json = await res.json();
      if (json.success) setData(json.data);
      else setData(null);
    } catch (e) {
      console.warn(e.message);
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societeId, boutiqueId, tab, dateDebut, dateFin]);

  useEffect(() => {
    if (societeId) load();
  }, [societeId, load]);

  // Reset la recherche quand on change d'onglet
  useEffect(() => {
    setSearchText('');
  }, [tab]);

  const onDateChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (pickerTarget === 'debut') {
        setDateDebut(selectedDate);
        if (selectedDate > dateFin) setDateFin(selectedDate);
      } else {
        setDateFin(selectedDate);
        if (selectedDate < dateDebut) setDateDebut(selectedDate);
      }
    }
  };

  const openPicker = (target) => {
    setPickerTarget(target);
    setShowPicker(true);
  };

  // ===== TÉLÉCHARGEMENT PDF =====
  const downloadPDF = async () => {
    try {
      setDownloading(true);
      
      const strDebut = formatDate(dateDebut);
      const strFin = formatDate(dateFin);
      
      const params = [
        `societe_id=${encodeURIComponent(societeId)}`,
        `date_debut=${encodeURIComponent(strDebut)}`,
        `date_fin=${encodeURIComponent(strFin)}`,
        `type_rapport=complet`,
      ];
      if (boutiqueId) {
        params.push(`boutique_id=${encodeURIComponent(boutiqueId)}`);
      }
      const url = `${API_PDF_URL}?${params.join('&')}`;
      
      console.log('URL PDF:', url);
      
      const filename = `rapport_${strDebut}_${strFin}.pdf`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      try {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (info.exists) {
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }
      } catch (e) {
        console.log('Pas d\'ancien fichier à supprimer');
      }
      
      const downloadResult = await FileSystem.downloadAsync(url, fileUri, {
        headers: {
          'Accept': 'application/pdf,text/html,*/*',
          'User-Agent': Platform.OS === 'android'
            ? 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Referer': 'https://rouah.net/',
          'Origin': 'https://rouah.net',
        },
      });
      
      console.log('Status HTTP:', downloadResult.status);
      
      if (downloadResult.status !== 200) {
        throw new Error(`Erreur HTTP ${downloadResult.status}`);
      }
      
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      console.log('Taille PDF:', fileInfo.size, 'bytes');
      
      if (!fileInfo.exists || fileInfo.size < 1000) {
        const content = await FileSystem.readAsStringAsync(downloadResult.uri);
        console.error('Contenu reçu:', content.substring(0, 500));
        throw new Error('Le fichier PDF est vide ou invalide');
      }
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Rapport commercial',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'PDF téléchargé',
          `Le rapport a été enregistré :\n${downloadResult.uri}`,
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
      Alert.alert(
        'Erreur de téléchargement',
        `Impossible de générer le PDF.\n\n${error.message}`,
        [{ text: 'OK' }]
      );
    } finally {
      setDownloading(false);
    }
  };

  const formatMoney = (v) => Number(v || 0).toLocaleString('fr-FR') + ' F';
  const formatNumber = (v) => Number(v || 0).toLocaleString('fr-FR');

  const Card = ({ title, value, color = colors.text, subtitle }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={{ color: colors.muted, fontSize: 10 }}>{title}</Text>
      <Text style={{ color, fontSize: 15, fontWeight: '800', marginTop: 4 }}>{value}</Text>
      {subtitle ? <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
  );

  const tabs = [
    { key: 'resume', label: 'Résumé' },
    { key: 'clients', label: 'Clients' },
    { key: 'fournisseurs', label: 'Fournisseurs' },
    { key: 'ventes', label: 'Ventes' },
    { key: 'achats', label: 'Achats' },
    { key: 'stocks', label: 'Stocks' },
    { key: 'finances', label: 'Finances' },
    { key: 'rentabilite', label: 'Marge' },
  ];

  // ============ FILTRAGE DES ACTEURS ============
  const getFilteredActeurs = () => {
    const list = tab === 'clients' ? (data?.clients || []) : (data?.fournisseurs || []);
    if (!searchText.trim()) return list;
    const q = searchText.toLowerCase();
    return list.filter((a) =>
      (a.nom_prenom || '').toLowerCase().includes(q) ||
      (a.telephone || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q)
    );
  };

  if (loading && !data) {
    return (
      <View style={[styles.safeContainer, { backgroundColor: '#f3f4f6' }]}>
        <View style={[styles.loadingContainer, { backgroundColor: '#f3f4f6' }]}>
          <ActivityIndicator size="large" color={colors.primary || '#075E54'} />
          <Text style={{ color: colors.muted || '#999', marginTop: 12, fontSize: 14 }}>Chargement des rapports...</Text>
        </View>
      </View>
    );
  }

  // ============ RENDU SPÉCIFIQUE : ACTEURS (Clients/Fournisseurs) ============
  const renderActeursContent = () => {
    const isClient = tab === 'clients';
    const stats = data?.stats || {};
    const acteurs = getFilteredActeurs();
    
    return (
      <>
        {/* 4 cartes statistiques : Payés et Impayés */}
        <Text style={[styles.section, { color: colors.text, marginTop: 4 }]}>
          {isClient ? '💰 Statistiques Clients' : '💳 Statistiques Fournisseurs'}
        </Text>
        
        <View style={styles.row}>
          <View style={[styles.statCard, { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={[styles.statCardLabel, { color: '#166534' }]}>Payés</Text>
            </View>
            <Text style={[styles.statCardValue, { color: '#15803d' }]}>
              {formatNumber(stats.nb_payes || 0)}
            </Text>
            <Text style={[styles.statCardSub, { color: '#166534' }]}>
              {isClient ? 'clients' : 'fournisseurs'}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={[styles.statCardLabel, { color: '#991b1b' }]}>Impayés</Text>
            </View>
            <Text style={[styles.statCardValue, { color: '#b91c1c' }]}>
              {formatNumber(stats.nb_impayes || 0)}
            </Text>
            <Text style={[styles.statCardSub, { color: '#991b1b' }]}>
              {isClient ? 'clients' : 'fournisseurs'}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.statCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="cash" size={18} color="#16a34a" />
              <Text style={[styles.statCardLabel, { color: '#166534' }]}>Montant payé</Text>
            </View>
            <Text style={[styles.statCardValue, { color: '#15803d', fontSize: 13 }]}>
              {formatMoney(stats.montant_payes || 0)}
            </Text>
            <Text style={[styles.statCardSub, { color: '#166534' }]}>
              Total TTC
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <View style={styles.statCardHeader}>
              <Ionicons name="warning" size={18} color="#dc2626" />
              <Text style={[styles.statCardLabel, { color: '#991b1b' }]}>Reste à payer</Text>
            </View>
            <Text style={[styles.statCardValue, { color: '#b91c1c', fontSize: 13 }]}>
              {formatMoney(stats.montant_impayes || 0)}
            </Text>
            <Text style={[styles.statCardSub, { color: '#991b1b' }]}>
              Total impayé
            </Text>
          </View>
        </View>

        {/* Barre de recherche */}
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder={`Rechercher un ${isClient ? 'client' : 'fournisseur'}...`}
            placeholderTextColor={colors.muted}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Liste des acteurs */}
        <Text style={[styles.section, { color: colors.text }]}>
          {isClient ? '👥 Liste des clients' : '🏢 Liste des fournisseurs'} ({acteurs.length})
        </Text>

        {acteurs.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="folder-open-outline" size={40} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 8, textAlign: 'center' }}>
              {searchText 
                ? 'Aucun résultat pour cette recherche'
                : `Aucun ${isClient ? 'client' : 'fournisseur'} sur cette période`}
            </Text>
          </View>
        ) : (
          acteurs.map((acteur, index) => {
            const isPaid = acteur.statut === 'Payé';
            const hasDocs = (acteur.nb_documents || 0) > 0;
            
            return (
              <View 
                key={acteur.acteur_id || index} 
                style={[styles.acteurCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {/* Header : nom + statut */}
                <View style={styles.acteurHeader}>
                  <View style={[styles.acteurAvatar, { backgroundColor: isClient ? '#075E54' : '#E74C3C' }]}>
                    <Text style={styles.acteurAvatarText}>
                      {(acteur.nom_prenom || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.acteurName, { color: colors.text }]} numberOfLines={1}>
                      {acteur.nom_prenom || 'Sans nom'}
                    </Text>
                    {acteur.telephone ? (
                      <Text style={[styles.acteurSub, { color: colors.muted }]} numberOfLines={1}>
                        {acteur.telephone}
                      </Text>
                    ) : null}
                  </View>
                  {/* Badge statut */}
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: !hasDocs ? '#f3f4f6' : (isPaid ? '#dcfce7' : '#fee2e2') }
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      { color: !hasDocs ? '#6b7280' : (isPaid ? '#16a34a' : '#dc2626') }
                    ]}>
                      {!hasDocs ? '-' : (isPaid ? '✓ Payé' : '⚠ Impayé')}
                    </Text>
                  </View>
                </View>

                {/* Stats : Documents, Montants */}
                <View style={styles.acteurStatsRow}>
                  <View style={styles.acteurStatItem}>
                    <Text style={[styles.acteurStatLabel, { color: colors.muted }]}>Docs</Text>
                    <Text style={[styles.acteurStatValue, { color: colors.text }]}>
                      {formatNumber(acteur.nb_documents || 0)}
                    </Text>
                  </View>
                  <View style={styles.acteurStatItem}>
                    <Text style={[styles.acteurStatLabel, { color: colors.muted }]}>Validés</Text>
                    <Text style={[styles.acteurStatValue, { color: '#2563eb' }]}>
                      {formatNumber(acteur.nb_valides || 0)}
                    </Text>
                  </View>
                  <View style={styles.acteurStatItem}>
                    <Text style={[styles.acteurStatLabel, { color: colors.muted }]}>Total TTC</Text>
                    <Text style={[styles.acteurStatValue, { color: colors.text, fontSize: 12 }]} numberOfLines={1}>
                      {formatMoney(acteur.total_ttc || 0)}
                    </Text>
                  </View>
                </View>

                {/* Ligne Montants : Avance + Reste */}
                <View style={styles.acteurMontantsRow}>
                  <View style={styles.acteurMontantItem}>
                    <Text style={[styles.acteurMontantLabel, { color: colors.muted }]}>Avance</Text>
                    <Text style={[styles.acteurMontantValue, { color: '#16a34a' }]} numberOfLines={1}>
                      {formatMoney(acteur.total_avance || 0)}
                    </Text>
                  </View>
                  <View style={[styles.acteurMontantDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.acteurMontantItem}>
                    <Text style={[styles.acteurMontantLabel, { color: colors.muted }]}>Reste</Text>
                    <Text 
                      style={[
                        styles.acteurMontantValue, 
                        { color: (parseFloat(acteur.total_reste) || 0) > 0 ? '#dc2626' : '#16a34a' }
                      ]} 
                      numberOfLines={1}
                    >
                      {formatMoney(acteur.total_reste || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </>
    );
  };

  return (
    <View style={[styles.safeContainer, { backgroundColor: '#f3f4f6' }]}>

      {/* Header du Rapport */}
      <View style={[styles.rapportHeader, { backgroundColor: colors.primary || '#075E54' }]}>
        <View style={styles.rapportHeaderLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.rapportHeaderTitle}>Rapports</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={load} style={styles.refreshBtn}>
            <Ionicons name="refresh-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={downloadPDF} 
            style={styles.downloadBtn}
            disabled={downloading}
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="download-outline" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ===== ONGLETS ===== */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabItem,
                tab === t.key && styles.tabItemActive
              ]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[
                styles.tabText,
                { color: tab === t.key ? (colors.primary || '#075E54') : colors.muted }
              ]}>
                {t.label}
              </Text>
              {tab === t.key && (
                <View style={[styles.tabIndicator, { backgroundColor: colors.primary || '#075E54' }]} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sélecteur de Période */}
      <View style={[styles.periodContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity style={[styles.dateButton, { backgroundColor: 'rgba(7, 94, 84, 0.1)' }]} onPress={() => openPicker('debut')}>
          <Text style={[styles.dateLabel, { color: colors.muted }]}>Du</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{formatDateDisplay(dateDebut)}</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 12 }}>au</Text>
        <TouchableOpacity style={[styles.dateButton, { backgroundColor: 'rgba(7, 94, 84, 0.1)' }]} onPress={() => openPicker('fin')}>
          <Text style={[styles.dateLabel, { color: colors.muted }]}>Au</Text>
          <Text style={[styles.dateValue, { color: colors.text }]}>{formatDateDisplay(dateFin)}</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={pickerTarget === 'debut' ? dateDebut : dateFin}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setShowPicker(false)}>
          <Text style={{ color: colors.primary || '#075E54', fontWeight: 'bold' }}>Terminé</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary || '#075E54'} style={{ marginTop: 20 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          showsVerticalScrollIndicator={false}
        >
          {/* 📅 ONGLET RÉSUMÉ */}
          {tab === 'resume' && data && (
            <>
              <Text style={[styles.section, { color: colors.text }]}>📊 Activité Commerciale</Text>
              <View style={styles.row}>
                <Card title="Chiffre d'affaires" value={formatMoney(data.ventes?.ca)} color="#16a34a" />
                <Card title="Factures émises" value={formatNumber(data.ventes?.nb_factures)} color="#2563eb" />
              </View>
              <View style={styles.row}>
                <Card title="Nb. Ventes" value={formatNumber(data.ventes?.nb_ventes)} />
                <Card title="Articles vendus" value={formatNumber(data.qte_vendue)} subtitle="unités" />
              </View>

              <Text style={[styles.section, { color: colors.text }]}>🛒 Achats & Dépenses</Text>
              <View style={styles.row}>
                <Card title="Nb. Achats" value={formatNumber(data.achats?.nb_achats)} />
                <Card title="Total Dépensé" value={formatMoney(data.achats?.total_depenses)} color="#dc2626" />
              </View>

              <Text style={[styles.section, { color: colors.text }]}>💰 Trésorerie & Encaissements</Text>
              <View style={styles.row}>
                <Card title="Total Encaissé" value={formatMoney(data.transactions?.total_encaisse)} color="#16a34a" />
                <Card title="Créances clients" value={formatMoney(data.creances)} color="#f59e0b" subtitle="Reste à percevoir" />
              </View>
              <View style={styles.row}>
                <Card title="Tx. Encaissement" value={formatNumber(data.transactions?.nb_tx_entree)} color="#16a34a" />
                <Card title="Tx. Décaissement" value={formatNumber(data.transactions?.nb_tx_sortie)} color="#dc2626" />
              </View>

              <Text style={[styles.section, { color: colors.text }]}>📦 État des Lieux (Actuel)</Text>
              <View style={styles.row}>
                <Card title="Articles en stock" value={formatNumber(data.stock?.nb_articles_stock)} />
                <Card title="Qté Stock totale" value={formatNumber(data.stock?.qte_stock)} color="#7c3aed" />
              </View>

              <Text style={[styles.section, { color: colors.text }]}>🏦 Situation de Caisse</Text>
              <View style={styles.row}>
                <Card title="Solde Ouverture" value={formatMoney(data.caisse?.solde_ouverture)} />
                <Card title="Solde Théorique" value={formatMoney(data.caisse?.solde_theorique)} color="#2563eb" />
              </View>
              <View style={styles.row}>
                <Card title="Solde Réel" value={formatMoney(data.caisse?.solde_reel)} color={data.caisse?.ecart === 0 ? "#16a34a" : "#f59e0b"} />
                <Card 
                  title="Écart de Caisse" 
                  value={formatMoney(data.caisse?.ecart)} 
                  color={data.caisse?.ecart === 0 ? "#16a34a" : (data.caisse?.ecart > 0 ? "#f59e0b" : "#dc2626")} 
                  subtitle={data.caisse?.ecart === 0 ? "RAS" : (data.caisse?.ecart > 0 ? "Excédent" : "Manquant")}
                />
              </View>
            </>
          )}

          {/* ONGLET VENTES */}
          {tab === 'ventes' && data && (
            <>
              <View style={styles.row}>
                <Card title="Chiffre d'affaires" value={formatMoney(data.resume?.ca_total)} color="#16a34a" />
                <Card title="Nb factures" value={data.resume?.nb_factures || 0} color="#2563eb" />
              </View>
              <View style={styles.row}>
                <Card title="CA HT" value={formatMoney(data.resume?.ca_ht)} />
                <Card title="Créances" value={formatMoney(data.resume?.total_creances)} color="#dc2626" />
              </View>
              <Text style={[styles.section, { color: colors.text }]}>Top articles vendus</Text>
              {(data.top_articles || []).slice(0, 8).map((a, i) => (
                <View key={i} style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={{ color: colors.text, flex: 1, fontSize: 12 }} numberOfLines={1}>{a.nom}</Text>
                  <Text style={{ color: colors.muted, fontSize: 11 }}>{a.qte_vendue} pcs</Text>
                  <Text style={{ fontWeight: '700', color: '#16a34a', marginLeft: 10, fontSize: 12 }}>{formatMoney(a.ca)}</Text>
                </View>
              ))}
            </>
          )}

          {/* ONGLET ACHATS */}
          {tab === 'achats' && data && (
            <>
              <View style={styles.row}>
                <Card title="Total achats" value={formatMoney(data.resume?.total_achats)} color="#f59e0b" />
                <Card title="Nb documents" value={data.resume?.nb_documents || 0} />
                <Card title="Dettes" value={formatMoney(data.resume?.total_dettes)} color="#dc2626" />
              </View>
            </>
          )}

          {/* ONGLET STOCKS */}
          {tab === 'stocks' && data && (
            <>
              <View style={styles.row}>
                <Card title="Articles en stock" value={data.resume?.nb_articles || 0} />
                <Card title="Qté totale" value={formatNumber(data.resume?.qte_totale)} />
              </View>
              <View style={styles.row}>
                <Card title="Valeur achat" value={formatMoney(data.resume?.valeur_achat)} />
                <Card title="Valeur vente" value={formatMoney(data.resume?.valeur_vente)} color="#16a34a" />
              </View>
              <View style={[styles.alertBox, { backgroundColor: data.nb_alertes > 0 ? '#fef2f2' : '#f0fdf4', borderColor: data.nb_alertes > 0 ? '#fecaca' : '#bbf7d0' }]}>
                <Text style={{ fontWeight: '700', color: data.nb_alertes > 0 ? '#dc2626' : '#16a34a' }}>
                  {data.nb_alertes > 0 ? `⚠ ${data.nb_alertes} alerte(s) stock` : '✓ Aucune alerte'}
                </Text>
              </View>
            </>
          )}

          {/* ONGLET FINANCES */}
          {tab === 'finances' && data && (
            <>
              <View style={styles.row}>
                <Card title="Encaissements" value={formatMoney(data.total_entrees)} color="#16a34a" />
                <Card title="Décaissements" value={formatMoney(data.total_sorties)} color="#dc2626" />
              </View>
              <View style={styles.row}>
                <Card title="Solde net période" value={formatMoney(data.solde_net)} color={data.solde_net >= 0 ? '#16a34a' : '#dc2626'} />
                <Card title="Solde caisses" value={formatMoney(data.solde_caisses)} color="#7c3aed" />
              </View>
              <Card title="Créances clients" value={formatMoney(data.creances)} color="#dc2626" />
            </>
          )}

          {/* ONGLET RENTABILITÉ */}
          {tab === 'rentabilite' && data && (
            <>
              <View style={styles.row}>
                <Card title="Chiffre d'affaires" value={formatMoney(data.ca)} color="#16a34a" />
                <Card title="Coût des ventes" value={formatMoney(data.cout_ventes)} color="#f59e0b" />
              </View>
              <View style={styles.row}>
                <Card title="Marge brute" value={formatMoney(data.marge_brute)} color={data.marge_brute >= 0 ? '#16a34a' : '#dc2626'} />
                <Card title="Taux de marge" value={`${data.taux_marge} %`} color="#7c3aed" />
              </View>
            </>
          )}

          {/* ONGLETS CLIENTS & FOURNISSEURS */}
          {(tab === 'clients' || tab === 'fournisseurs') && data && renderActeursContent()}

          {!data && !loading && (
            <Text style={{ textAlign: 'center', color: colors.muted, marginTop: 40, fontSize: 14 }}>
              Aucune donnée pour cette période
            </Text>
          )}

          <View style={{ paddingVertical: 4, alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontSize: 9 }}>
              Période : {formatDateDisplay(dateDebut)} → {formatDateDisplay(dateFin)}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ================== STYLES ==================
const styles = StyleSheet.create({
  safeContainer: { 
    flex: 1,
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },

  rapportHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#075E54'
  },
  rapportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rapportHeaderTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },

  tabsContainer: {
    borderBottomWidth: 1,
    paddingVertical: 0,
  },
  tabsScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-around',
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 70,
    position: 'relative',
  },
  tabItemActive: {},
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    borderRadius: 3,
  },

  periodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  dateLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  pickerDoneButton: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  row: { 
    flexDirection: 'row', 
    gap: 8, 
    marginBottom: 8 
  },
  card: { 
    flex: 1, 
    borderRadius: 12, 
    borderWidth: 1, 
    padding: 10 
  },
  section: { 
    fontSize: 14, 
    fontWeight: '700', 
    marginTop: 12, 
    marginBottom: 8 
  },
  listItem: {
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 8,
    borderWidth: 1, 
    padding: 10, 
    marginBottom: 6,
  },
  alertBox: {
    borderRadius: 10, 
    padding: 10, 
    alignItems: 'center', 
    marginTop: 6,
    borderWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  downloadBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },

  // ===== CARTES STATISTIQUES (Payés/Impayés) =====
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statCardLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  statCardSub: {
    fontSize: 10,
    marginTop: 2,
  },

  // ===== BARRE DE RECHERCHE =====
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },

  // ===== CARTES ACTEURS =====
  acteurCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  acteurHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  acteurAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acteurAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  acteurName: {
    fontSize: 14,
    fontWeight: '700',
  },
  acteurSub: {
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Stats ligne : Docs / Validés / Total TTC
  acteurStatsRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  acteurStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  acteurStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  acteurStatValue: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Montants : Avance + Reste
  acteurMontantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  acteurMontantItem: {
    flex: 1,
  },
  acteurMontantLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  acteurMontantValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  acteurMontantDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 10,
  },

  // Boîte vide
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});