import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://rouah.net/api/api-dashboard.php';
const SCREEN_W = Dimensions.get('window').width;

// ================== UTILITAIRES ==================

function money(v) {
  const n = Number(v || 0);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
  return n.toLocaleString('fr-FR');
}

function moneyFull(v) {
  return Number(v || 0).toLocaleString('fr-FR') + ' F';
}

function formatPercent(v) {
  const n = Number(v || 0);
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%';
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR');
}

function getDefaultDates(period) {
  const today = new Date();
  let firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  
  switch(period) {
    case 'jour':
      return { dateDebut: today, dateFin: today };
    case 'semaine':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { dateDebut: weekStart, dateFin: today };
    case 'mois':
      return { dateDebut: firstDay, dateFin: today };
    case 'annee':
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { dateDebut: yearStart, dateFin: today };
    default:
      return { dateDebut: firstDay, dateFin: today };
  }
}

// ================== COMPOSANTS DE GRAPHIQUES ==================

/** 📊 Graphique à barres pour l'évolution du CA */
function BarChartCA({ data, colors, height = 200 }) {
  const items = data || [];
  if (items.length === 0) {
    return <Text style={{ color: colors.muted, textAlign: 'center', padding: 20 }}>Aucune donnée</Text>;
  }

  const max = Math.max(
    ...items.map(d => Math.max(Number(d.ventes) || 0, Number(d.achats) || 0)),
    1
  );

  let displayData = items;
  if (items.length > 30) {
    const step = Math.ceil(items.length / 30);
    displayData = items.filter((_, i) => i % step === 0 || i === items.length - 1);
  }

  const barWidth = Math.min(18, (SCREEN_W - 40) / (displayData.length * 2.5 + 1));

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: colors.purple }} />
          <Text style={{ fontSize: 11, color: colors.muted }}>Ventes</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#f59e0b' }} />
          <Text style={{ fontSize: 11, color: colors.muted }}>Achats</Text>
        </View>
      </View>

      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4 }}>
        {displayData.map((d, i) => {
          const hv = Math.max(3, ((Number(d.ventes) || 0) / max) * (height - 20));
          const ha = Math.max(3, ((Number(d.achats) || 0) / max) * (height - 20));
          
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: height }}>
              <View style={{ flexDirection: 'row', gap: 2, alignItems: 'flex-end' }}>
                <View style={{ width: barWidth, height: hv, backgroundColor: colors.purple, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                <View style={{ width: barWidth, height: ha, backgroundColor: '#f59e0b', borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 8, color: colors.muted, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                {d.label || ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** 📊 Graphique Multibar */
function MultiBarChart({ data, colors, height = 200 }) {
  const items = data || [];
  if (items.length === 0) {
    return <Text style={{ color: colors.muted, textAlign: 'center', padding: 20 }}>Aucune donnée</Text>;
  }

  const max = Math.max(
    ...items.map(d => Math.max(Number(d.ventes) || 0, Number(d.achats) || 0, Number(d.depenses) || 0)),
    1
  );

  let displayData = items;
  if (items.length > 30) {
    const step = Math.ceil(items.length / 30);
    displayData = items.filter((_, i) => i % step === 0 || i === items.length - 1);
  }

  const barWidth = Math.min(16, (SCREEN_W - 40) / (displayData.length * 3.5 + 1));

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#16a34a' }} />
          <Text style={{ fontSize: 11, color: colors.muted }}>Ventes</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#f59e0b' }} />
          <Text style={{ fontSize: 11, color: colors.muted }}>Achats</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#ef4444' }} />
          <Text style={{ fontSize: 11, color: colors.muted }}>Dépenses</Text>
        </View>
      </View>

      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 4 }}>
        {displayData.map((d, i) => {
          const hv = Math.max(3, ((Number(d.ventes) || 0) / max) * (height - 20));
          const ha = Math.max(3, ((Number(d.achats) || 0) / max) * (height - 20));
          const hd = Math.max(3, ((Number(d.depenses) || 0) / max) * (height - 20));
          
          return (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: height }}>
              <View style={{ flexDirection: 'row', gap: 2, alignItems: 'flex-end' }}>
                <View style={{ width: barWidth, height: hv, backgroundColor: '#16a34a', borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
                <View style={{ width: barWidth, height: ha, backgroundColor: '#f59e0b', borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
                <View style={{ width: barWidth, height: hd, backgroundColor: '#ef4444', borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
              </View>
              <Text style={{ fontSize: 7, color: colors.muted, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>
                {d.label || ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** 📊 Barres horizontales */
function HBarChart({ data, labelKey, valueKey, color, colors, maxBars = 10, format = moneyFull }) {
  const items = (data || []).slice(0, maxBars);
  const max = Math.max(...items.map((d) => Number(d[valueKey]) || 0), 1);

  if (items.length === 0) {
    return <Text style={{ color: colors.muted, textAlign: 'center', padding: 16 }}>Aucune donnée</Text>;
  }

  return (
    <View style={{ gap: 6 }}>
      {items.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const pct = Math.max((val / max) * 100, 3);
        return (
          <View key={i}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                {d[labelKey]}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginLeft: 8 }}>{format(val)}</Text>
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color || colors.purple }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** 🍩 Donut Chart */
function DonutChart({ data, colors }) {
  const items = data || [];
  const total = items.reduce((sum, d) => sum + (d.value || 0), 0);

  if (total === 0) {
    return <Text style={{ color: colors.muted, textAlign: 'center', padding: 16 }}>Aucune donnée</Text>;
  }

  const palette = ['#16a34a', '#f59e0b', '#ef4444', '#3b82f6', '#7c3aed', '#06b6d4', '#ec4899'];

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={styles.donutContainer}>
        {items.map((d, i) => {
          const pct = ((d.value || 0) / total) * 100;
          const angle = (pct / 100) * 360;
          const startAngle = items.slice(0, i).reduce((sum, item) => sum + ((item.value || 0) / total) * 360, 0);
          
          const start = startAngle - 90;
          const end = start + angle;
          const x1 = 50 + 40 * Math.cos(start * Math.PI / 180);
          const y1 = 50 + 40 * Math.sin(start * Math.PI / 180);
          const x2 = 50 + 40 * Math.cos(end * Math.PI / 180);
          const y2 = 50 + 40 * Math.sin(end * Math.PI / 180);
          
          return (
            <View
              key={i}
              style={[
                styles.donutSegment,
                {
                  backgroundColor: palette[i % palette.length],
                }
              ]}
            />
          );
        })}
        <View style={styles.donutCenter}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{items.length}</Text>
          <Text style={{ fontSize: 9, color: colors.muted, textAlign: 'center' }}>catégories</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 12 }}>
        {items.map((d, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: palette[i % palette.length] }} />
            <Text style={{ fontSize: 12, color: colors.text }}>{d.label}</Text>
            <Text style={{ fontSize: 11, color: colors.muted }}>({d.value})</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** 📊 Carte KPI */
function KpiCard({ label, value, variation, color, colors, subtitle, icon }) {
  const isPositive = Number(variation || 0) >= 0;
  return (
    <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.muted, fontSize: 10 }}>{label}</Text>
        {icon && <Text style={{ fontSize: 14 }}>{icon}</Text>}
      </View>
      <Text style={{ color: color || colors.text, fontWeight: '800', fontSize: 16, marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
      {variation !== undefined && variation !== null && (
        <Text style={{ 
          color: isPositive ? '#16a34a' : '#ef4444', 
          fontSize: 11, 
          fontWeight: '600',
          marginTop: 2
        }}>
          {isPositive ? '↑' : '↓'} {Math.abs(Number(variation)).toFixed(1)}%
        </Text>
      )}
      {subtitle && (
        <Text style={{ color: colors.muted, fontSize: 9, marginTop: 2 }}>{subtitle}</Text>
      )}
    </View>
  );
}

// ================== COMPOSANT PRINCIPAL ==================

export default function DashboardScreen({ societeId, boutiqueId, colors, onBack }) {
  // 📅 Période
  const [selectedPeriod, setSelectedPeriod] = useState('mois');
  const [isCustomPeriod, setIsCustomPeriod] = useState(false);
  
  // 📅 Dates
  const defaultDates = getDefaultDates('mois');
  const [dateDebut, setDateDebut] = useState(defaultDates.dateDebut);
  const [dateFin, setDateFin] = useState(defaultDates.dateFin);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('debut');

  // Onglets
  const [activeTab, setActiveTab] = useState('ventes');

  // États de chargement
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Données du tableau de bord
  const [dashboardData, setDashboardData] = useState({
    ca_jour: 0,
    nb_ventes_jour: 0,
    solde_caisses: 0,
    nb_alertes_stock: 0,
    creances: 0,
    nb_articles: 0,
    nb_clients: 0,
    nb_fournisseurs: 0,
  });

  // Données graphiques
  const [kpis, setKpis] = useState(null);
  const [caEvolution, setCaEvolution] = useState([]);
  const [multibarData, setMultibarData] = useState([]);
  const [topProduits, setTopProduits] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [modesPaiement, setModesPaiement] = useState([]);
  const [etatStock, setEtatStock] = useState([]);
  const [valeurStock, setValeurStock] = useState(0);
  const [performanceBoutiques, setPerformanceBoutiques] = useState([]);
  const [synthese, setSynthese] = useState(null);
  const [comparaison, setComparaison] = useState(null);

  // ================== GESTION DES PÉRIODES ==================

  const periods = [
    { key: 'jour', label: 'Jour' },
    { key: 'semaine', label: 'Semaine' },
    { key: 'mois', label: 'Mois' },
    { key: 'annee', label: 'Année' },
    { key: 'custom', label: 'Perso' },
  ];

  const selectPeriod = (periodKey) => {
    setSelectedPeriod(periodKey);
    setIsCustomPeriod(periodKey === 'custom');
    
    if (periodKey !== 'custom') {
      const dates = getDefaultDates(periodKey);
      setDateDebut(dates.dateDebut);
      setDateFin(dates.dateFin);
    }
  };

  // ================== APPEL API ==================

  const apiCall = async (body) => {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          societe_id: societeId,
          boutique_id: boutiqueId || undefined,
          date_debut: formatDate(dateDebut),
          date_fin: formatDate(dateFin),
          ...body,
        }),
      });
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error('Erreur parsing JSON:', text);
        throw new Error('Réponse serveur invalide');
      }
    } catch (e) {
      console.error('Erreur API:', e);
      throw e;
    }
  };

  const loadAll = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      // Chargement du dashboard
      const dashRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_dashboard',
          societe_id: societeId,
          boutique_id: boutiqueId || undefined,
        }),
      });
      const dashJson = await dashRes.json();
      if (dashJson.success) {
        setDashboardData(dashJson.data);
      }

      // Chargement des données graphiques
      const [k, evo, multi, top, clients, modes, stock, perf, syn, comp] = await Promise.all([
        apiCall({ action: 'kpis' }),
        apiCall({ action: 'ca_evolution' }),
        apiCall({ action: 'multibar' }),
        apiCall({ action: 'top_articles', limit: 10 }),
        apiCall({ action: 'top_clients', limit: 10 }),
        apiCall({ action: 'modes_paiement' }),
        apiCall({ action: 'etat_stock' }),
        apiCall({ action: 'performance_boutiques' }),
        apiCall({ action: 'synthese' }),
        apiCall({ action: 'comparaison_periode' }),
      ]);

      setKpis(k.data);
      setCaEvolution(evo.data || []);
      setMultibarData(multi.data || []);
      setTopProduits(top.data || []);
      setTopClients(clients.data || []);
      setModesPaiement(modes.data || []);
      setEtatStock(stock.data || []);
      setValeurStock(stock.valeur || 0);
      setPerformanceBoutiques(perf.data || []);
      setSynthese(syn.data);
      setComparaison(comp.data);

    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societeId, boutiqueId, dateDebut, dateFin]);

  useEffect(() => {
    if (societeId) {
      setLoading(true);
      loadAll();
    }
  }, [societeId, loadAll]);

  // ================== GESTION DES DATES ==================

  const onDateChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (pickerTarget === 'debut') {
        setDateDebut(selectedDate);
        if (selectedDate > dateFin) {
          setDateFin(selectedDate);
        }
      } else {
        setDateFin(selectedDate);
        if (selectedDate < dateDebut) {
          setDateDebut(selectedDate);
        }
      }
      setSelectedPeriod('custom');
      setIsCustomPeriod(true);
    }
  };

  const openPicker = (target) => {
    setPickerTarget(target);
    setShowPicker(true);
  };

  // ================== RENDU ==================

  const tabs = [
    { key: 'ventes', label: '📈 Ventes' },
    { key: 'stock', label: '📦 Stock' },
    { key: 'finance', label: '💰 Finance' },
    { key: 'performance', label: '🏪 Performance' },
  ];

  const Card = ({ title, value, color = colors.purple, subtitle }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.muted }]}>{title}</Text>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      {subtitle ? <Text style={[styles.cardSub, { color: colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );

  if (loading && !dashboardData.ca_jour) {
    return (
      <View style={[styles.container, { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary || '#075E54'} />
        <Text style={{ color: colors.muted, marginTop: 12 }}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#f3f4f6' }]}>
      {/* Header du Dashboard */}
      <View style={[styles.dashboardHeader, { backgroundColor: colors.primary || '#075E54' }]}>
        <View style={styles.dashboardHeaderLeft}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.dashboardHeaderTitle}>Tableau de bord</Text>
        </View>
        <TouchableOpacity onPress={loadAll} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAll(); }} />
        }
      >
        {/* ==================== INDICATEURS PRINCIPAUX ==================== */}
        <View style={styles.row}>
          <Card
            title="Chiffre d'affaires"
            value={moneyFull(dashboardData.ca_jour)}
            color="#16a34a"
            subtitle="Aujourd'hui"
          />
          <Card
            title="Ventes du jour"
            value={String(dashboardData.nb_ventes_jour)}
            color="#2563eb"
            subtitle="Factures validées"
          />
        </View>

        <View style={styles.row}>
          <Card
            title="Solde caisses"
            value={moneyFull(dashboardData.solde_caisses)}
            color="#7c3aed"
          />
          <Card
            title="Créances clients"
            value={moneyFull(dashboardData.creances)}
            color="#dc2626"
            subtitle="Reste à encaisser"
          />
        </View>

        {/* Alertes */}
        <View style={[styles.alertBox, { 
          backgroundColor: dashboardData.nb_alertes_stock > 0 ? '#fef2f2' : '#f0fdf4', 
          borderColor: dashboardData.nb_alertes_stock > 0 ? '#fecaca' : '#bbf7d0' 
        }]}>
          <Text style={{ 
            fontSize: 15, 
            fontWeight: '700', 
            color: dashboardData.nb_alertes_stock > 0 ? '#dc2626' : '#16a34a' 
          }}>
            {dashboardData.nb_alertes_stock > 0
              ? `⚠ ${dashboardData.nb_alertes_stock} alerte(s) stock`
              : '✓ Aucune alerte stock'}
          </Text>
        </View>

        {/* Stats rapides */}
        <View style={styles.row}>
          <Card title="Articles" value={String(dashboardData.nb_articles)} />
          <Card title="Clients" value={String(dashboardData.nb_clients)} />
          <Card title="Fournisseurs" value={String(dashboardData.nb_fournisseurs)} />
        </View>

        {/* ==================== SECTION GRAPHIQUE ==================== */}

        {/* Sélecteur de période */}
        <View style={[styles.periodContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.periodRow}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.periodChip, 
                  selectedPeriod === p.key && { backgroundColor: colors.primary || '#075E54' }
                ]}
                onPress={() => selectPeriod(p.key)}
              >
                <Text style={{
                  fontSize: 11, fontWeight: '600',
                  color: selectedPeriod === p.key ? '#fff' : colors.muted,
                }}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.dateRow}>
            <TouchableOpacity 
              style={[styles.dateButton, { borderColor: colors.border }]}
              onPress={() => openPicker('debut')}
            >
              <Text style={{ color: colors.muted, fontSize: 9 }}>Du</Text>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 11 }}>
                {formatDateDisplay(dateDebut)}
              </Text>
            </TouchableOpacity>
            
            <Text style={{ color: colors.muted, marginHorizontal: 4, fontWeight: '600', fontSize: 12 }}>→</Text>
            
            <TouchableOpacity 
              style={[styles.dateButton, { borderColor: colors.border }]}
              onPress={() => openPicker('fin')}
            >
              <Text style={{ color: colors.muted, fontSize: 9 }}>Au</Text>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 11 }}>
                {formatDateDisplay(dateFin)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker */}
        {showPicker && (
          <DateTimePicker
            value={pickerTarget === 'debut' ? dateDebut : dateFin}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={onDateChange}
            maximumDate={new Date()}
            textColor={colors.text}
          />
        )}
        {Platform.OS === 'ios' && showPicker && (
          <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setShowPicker(false)}>
            <Text style={{ color: colors.primary || '#075E54', fontWeight: 'bold', padding: 12 }}>Terminé</Text>
          </TouchableOpacity>
        )}

        {/* Onglets */}
        <View style={[styles.subTabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          {tabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.subTab, activeTab === t.key && { borderBottomColor: colors.primary || '#075E54', borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(t.key)}
            >
              <Text style={{
                fontSize: 11, fontWeight: '600',
                color: activeTab === t.key ? colors.primary || '#075E54' : colors.muted,
              }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ==================== CONTENU GRAPHIQUE ==================== */}
        
        {/* VENTES */}
        {activeTab === 'ventes' && (
          <>
            <View style={styles.kpiGrid}>
              <KpiCard 
                label="Chiffre d'affaires"
                value={moneyFull(kpis?.ca_ventes)}
                variation={comparaison?.ca_variation}
                colors={colors}
                color="#16a34a"
                icon="💰"
              />
              <KpiCard 
                label="Achats"
                value={moneyFull(kpis?.ca_achats)}
                colors={colors}
                color="#f59e0b"
                icon="🛒"
              />
              <KpiCard 
                label="Marge brute"
                value={moneyFull(kpis?.marge_brute)}
                variation={kpis?.taux_marge}
                colors={colors}
                color="#7c3aed"
                icon="📊"
              />
              <KpiCard 
                label="Nombre de ventes"
                value={String(kpis?.nb_factures || 0)}
                variation={comparaison?.nb_variation}
                colors={colors}
                color="#3b82f6"
                icon="📄"
              />
            </View>

            <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>📊 Évolution du CA</Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>
                {formatDateDisplay(dateDebut)} → {formatDateDisplay(dateFin)}
                {caEvolution.length > 0 && ` · ${caEvolution.length} jours`}
              </Text>
              <BarChartCA data={caEvolution} colors={colors} />
            </View>

            <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>📊 Ventes / Achats / Dépenses</Text>
              <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>
                {formatDateDisplay(dateDebut)} → {formatDateDisplay(dateFin)}
              </Text>
              <MultiBarChart data={multibarData} colors={colors} />
              {synthese && (
                <View style={styles.syntheseRow}>
                  <View style={styles.syntheseItem}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>Ventes</Text>
                    <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 13 }}>{moneyFull(synthese.ventes)}</Text>
                  </View>
                  <View style={styles.syntheseItem}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>Achats</Text>
                    <Text style={{ color: '#f59e0b', fontWeight: '700', fontSize: 13 }}>{moneyFull(synthese.achats)}</Text>
                  </View>
                  <View style={styles.syntheseItem}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>Dépenses</Text>
                    <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>{moneyFull(synthese.depenses)}</Text>
                  </View>
                  <View style={styles.syntheseItem}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>Marge</Text>
                    <Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 13 }}>{moneyFull(synthese.marge)}</Text>
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>🏆 Top produits vendus</Text>
              <HBarChart
                data={topProduits}
                labelKey="nom"
                valueKey="ca"
                color="#7c3aed"
                colors={colors}
              />
            </View>

            <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>🏆 Top clients</Text>
              <HBarChart
                data={topClients}
                labelKey="nom"
                valueKey="montant"
                color="#3b82f6"
                colors={colors}
              />
            </View>
          </>
        )}

        {/* STOCK */}
        {activeTab === 'stock' && (
          <>
            <View style={styles.kpiGrid}>
              <KpiCard 
                label="Valeur du stock"
                value={moneyFull(valeurStock)}
                colors={colors}
                color="#f59e0b"
                icon="💰"
              />
              <KpiCard 
                label="Articles en stock"
                value={String(etatStock.reduce((sum, d) => sum + (d.value || 0), 0))}
                colors={colors}
                color="#16a34a"
                icon="📦"
              />
              <KpiCard 
                label="Ruptures"
                value={String((etatStock.find(d => d.label === 'Rupture')?.value || 0))}
                colors={colors}
                color="#ef4444"
                icon="⚠️"
              />
            </View>

            <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>📦 État du stock</Text>
              <DonutChart data={etatStock} colors={colors} />
            </View>

            <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>📋 Détail du stock</Text>
              <HBarChart
                data={etatStock}
                labelKey="label"
                valueKey="value"
                color="#7c3aed"
                colors={colors}
                format={(v) => String(v)}
              />
            </View>
          </>
        )}

        {/* FINANCE */}
        {activeTab === 'finance' && (
          <>
            <View style={styles.kpiGrid}>
              <KpiCard 
                label="Encaissements"
                value={moneyFull(kpis?.total_entrees)}
                colors={colors}
                color="#16a34a"
                icon="💳"
              />
              <KpiCard 
                label="Décaissements"
                value={moneyFull(kpis?.total_depenses)}
                colors={colors}
                color="#ef4444"
                icon="💸"
              />
              <KpiCard 
                label="Solde"
                value={moneyFull((kpis?.total_entrees || 0) - (kpis?.total_depenses || 0))}
                colors={colors}
                color="#7c3aed"
                icon="⚖️"
              />
              <KpiCard 
                label="Créances"
                value={moneyFull(kpis?.creances)}
                colors={colors}
                color="#f59e0b"
                icon="📋"
              />
            </View>

            {synthese && (
              <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>📊 Synthèse financière</Text>
                <View style={styles.syntheseRow}>
                  <View style={styles.syntheseItem}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>Encaissements</Text>
                    <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 13 }}>{moneyFull(synthese.entrees)}</Text>
                  </View>
                  <View style={styles.syntheseItem}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>Décaissements</Text>
                    <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>{moneyFull(synthese.depenses)}</Text>
                  </View>
                  <View style={styles.syntheseItem}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>Solde</Text>
                    <Text style={{ 
                      color: synthese.solde >= 0 ? '#16a34a' : '#ef4444', 
                      fontWeight: '700', 
                      fontSize: 13 
                    }}>
                      {moneyFull(synthese.solde)}
                    </Text>
                  </View>
                  <View style={styles.syntheseItem}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>Marge</Text>
                    <Text style={{ 
                      color: synthese.marge >= 0 ? '#16a34a' : '#ef4444', 
                      fontWeight: '700', 
                      fontSize: 13 
                    }}>
                      {moneyFull(synthese.marge)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>🧾 Modes de paiement</Text>
              <HBarChart
                data={modesPaiement}
                labelKey="mode"
                valueKey="montant"
                color="#7c3aed"
                colors={colors}
              />
            </View>
          </>
        )}

        {/* PERFORMANCE */}
        {activeTab === 'performance' && (
          <>
            {!boutiqueId ? (
              <>
                <View style={styles.kpiGrid}>
                  <KpiCard 
                    label="Total CA"
                    value={moneyFull(performanceBoutiques.reduce((sum, d) => sum + (d.ca_ventes || 0), 0))}
                    colors={colors}
                    color="#16a34a"
                    icon="💰"
                  />
                  <KpiCard 
                    label="Total ventes"
                    value={String(performanceBoutiques.reduce((sum, d) => sum + (d.nb_ventes || 0), 0))}
                    colors={colors}
                    color="#3b82f6"
                    icon="📄"
                  />
                  <KpiCard 
                    label="Boutiques"
                    value={String(performanceBoutiques.length)}
                    colors={colors}
                    color="#f59e0b"
                    icon="🏪"
                  />
                </View>

                <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>🏪 CA par boutique</Text>
                  <HBarChart
                    data={performanceBoutiques}
                    labelKey="nom"
                    valueKey="ca_ventes"
                    color="#7c3aed"
                    colors={colors}
                  />
                </View>

                <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>📊 Ventes par boutique</Text>
                  <HBarChart
                    data={performanceBoutiques}
                    labelKey="nom"
                    valueKey="nb_ventes"
                    color="#3b82f6"
                    colors={colors}
                    format={(v) => String(v)}
                  />
                </View>

                <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>💰 Marge par boutique</Text>
                  <HBarChart
                    data={performanceBoutiques}
                    labelKey="nom"
                    valueKey="marge"
                    color="#16a34a"
                    colors={colors}
                  />
                </View>
              </>
            ) : (
              <View style={[styles.graphCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={{ textAlign: 'center', color: colors.muted, padding: 20 }}>
                  Sélectionnez "Toutes les boutiques" pour voir les comparaisons
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ paddingVertical: 8, alignItems: 'center' }}>
          <Text style={{ color: colors.muted, fontSize: 10 }}>
            Période : {formatDateDisplay(dateDebut)} → {formatDateDisplay(dateFin)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ================== STYLES ==================

const styles = StyleSheet.create({
  container: { flex: 1, },
  
  dashboardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',backgroundColor:'#075E54'
  },
  dashboardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },

  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  cardSub: {
    fontSize: 11,
    marginTop: 4,
  },
  alertBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    alignItems: 'center',
  },

  // Période
  periodContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
    borderRadius: 12,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  periodChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
    gap: 4,
  },
  pickerDoneButton: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Onglets
  subTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 12,
    borderRadius: 12,
  },
  subTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },

  // KPIs
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: (SCREEN_W - 48) / 2 - 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },

  // Cartes graphiques
  graphCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },

  // Barres
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },

  // Donut
  donutContainer: {
    width: 160,
    height: 160,
    position: 'relative',
  },
  donutSegment: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 80,
  },
  donutCenter: {
    position: 'absolute',
    top: 30,
    left: 30,
    right: 30,
    bottom: 30,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  // Synthèse
  syntheseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  syntheseItem: {
    flex: 1,
    minWidth: (SCREEN_W - 60) / 4,
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
});