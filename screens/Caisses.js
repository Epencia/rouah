import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { offlineFetch } from '../services/offlineApi';

// ============ CONSTANTES API ============
const API_URL = 'https://rouah.net/api/api-finance.php';

// ============ FONCTIONS UTILITAIRES ============
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMoney = (val) => {
  return Number(val || 0).toLocaleString('fr-FR') + ' F';
};

const MODES = [
  { key: 'especes', label: 'Espèces' },
  { key: 'mobile_money', label: 'Mobile Money' },
  { key: 'carte', label: 'Carte' },
  { key: 'cheque', label: 'Chèque' },
  { key: 'virement', label: 'Virement' },
];

// Retourne le label lisible d'un mode
const labelMode = (key) => {
  const m = MODES.find((x) => x.key === key);
  return m ? m.label : (key || '—');
};

// Retourne un placeholder adapté au mode
const placeholderNumero = (mode) => {
  switch (mode) {
    case 'cheque':       return 'Ex: N° chèque';
    case 'virement':     return 'Ex: N° virement';
    case 'carte':        return 'Ex: N° carte';
    case 'mobile_money': return 'Ex: N° téléphone';
    default:             return 'Numéro du règlement';
  }
};

export default function CaissesScreen({ societeId, boutiqueId, user, onChanged }) {
  // ==================== ÉTATS ====================
  const [activeTab, setActiveTab] = useState('reglement');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Données
  const [factures, setFactures] = useState([]);
  const [caisses, setCaisses] = useState([]);
  const [journees, setJournees] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [charges, setCharges] = useState([]);         // 👈 liste des charges
  
  // Filtres règlement
  const [categorie, setCategorie] = useState('Vente');
  const [search, setSearch] = useState('');
  
  // Dates
  const [dateDebut, setDateDebut] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateFin, setDateFin] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('debut');
  
  // Modals
  const [showPay, setShowPay] = useState(false);
  const [showOpenJournee, setShowOpenJournee] = useState(false);
  const [showTransaction, setShowTransaction] = useState(false);
  const [showCloseJournee, setShowCloseJournee] = useState(false);
  const [showTxDetail, setShowTxDetail] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // Formulaire paiement
  const [selectedFacture, setSelectedFacture] = useState(null);
  const [montant, setMontant] = useState('');
  const [mode, setMode] = useState('especes');
  const [selectedCaisse, setSelectedCaisse] = useState(null);
  const [numeroReglement, setNumeroReglement] = useState('');
  const [referenceReglement, setReferenceReglement] = useState('');
  
  // Formulaire journée
  const [selectedCaisseJournee, setSelectedCaisseJournee] = useState(null);
  const [selectedJournee, setSelectedJournee] = useState(null);
  const [soldeOuverture, setSoldeOuverture] = useState('0');
  const [soldeReel, setSoldeReel] = useState('');
  const [commentaireEcart, setCommentaireEcart] = useState('');
  
  // Formulaire transaction
  const [txType, setTxType] = useState('Entree');
  const [txMontant, setTxMontant] = useState('');
  const [txObjet, setTxObjet] = useState('');
  const [txMode, setTxMode] = useState('especes');
  const [txNumeroReglement, setTxNumeroReglement] = useState('');
  const [txReferenceReglement, setTxReferenceReglement] = useState('');
  const [txChargeId, setTxChargeId] = useState(null);  // 👈 charge sélectionnée
  
  const [saving, setSaving] = useState(false);

  // ==================== APPELS API ====================
  const apiCall = async (url, body = {}) => {
    if (typeof url === 'object' && url !== null) {
      body = url;
      url = API_URL;
    }

    const json = await offlineFetch(url, {
      societe_id: societeId,
      boutique_id: boutiqueId || undefined,
      utilisateur_id: user?.utilisateur_id,
      ...body,
    });

    if (!json.success) throw new Error(json.message || 'Erreur API');
    return json;
  };

  // ==================== CHARGEMENT DES DONNÉES ====================
  const loadFactures = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({
        action: 'list_factures_impayees',
        categorie,
        search: search || undefined,
        date_debut: formatDate(dateDebut),
        date_fin: formatDate(dateFin),
      });
      setFactures(json.data || []);
    } catch (e) {
      console.warn('loadFactures error:', e.message);
    }
  }, [societeId, categorie, search, dateDebut, dateFin]);

  const loadCaisses = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({ action: 'list_caisses' });
      setCaisses(json.data || []);
    } catch (e) {
      console.warn('loadCaisses error:', e.message);
    }
  }, [societeId]);

  const loadJournees = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({
        action: 'list_journees',
        date_debut: formatDate(dateDebut),
        date_fin: formatDate(dateFin),
      });
      setJournees(json.data || []);
    } catch (e) {
      console.warn('loadJournees error:', e.message);
    }
  }, [societeId, dateDebut, dateFin]);

  const loadTransactions = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({
        action: 'list_transactions',
        date_debut: formatDate(dateDebut),
        date_fin: formatDate(dateFin),
      });
      setTransactions(json.data || []);
    } catch (e) {
      console.warn('loadTransactions error:', e.message);
    }
  }, [societeId, dateDebut, dateFin]);

  // 👇 Chargement des charges (pour le décaissement)
  const loadCharges = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall({ action: 'list_charges' });
      setCharges(json.data || []);
    } catch (e) {
      console.warn('loadCharges error:', e.message);
    }
  }, [societeId]);

  const loadAllData = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      await Promise.all([
        loadFactures(),
        loadCaisses(),
        loadJournees(),
        loadTransactions(),
        loadCharges(),   // 👈 AJOUT
      ]);
      setInitialLoadDone(true);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societeId, loadFactures, loadCaisses, loadJournees, loadTransactions, loadCharges]);

  useEffect(() => {
    if (societeId && !initialLoadDone) {
      loadAllData();
    }
  }, [societeId, initialLoadDone, loadAllData]);

  // Recharger selon l'onglet actif
  useEffect(() => {
    if (!societeId || !initialLoadDone) return;
    if (activeTab === 'reglement') loadFactures();
    else if (activeTab === 'caisses') loadCaisses();
    else if (activeTab === 'journees') loadJournees();
    else if (activeTab === 'transactions') loadTransactions();
  }, [activeTab, loadFactures, loadCaisses, loadJournees, loadTransactions, societeId, initialLoadDone]);

  // Recharger quand les dates changent
  useEffect(() => {
    if (!societeId || !initialLoadDone) return;
    if (activeTab === 'reglement') loadFactures();
    else if (activeTab === 'journees') loadJournees();
    else if (activeTab === 'transactions') loadTransactions();
  }, [dateDebut, dateFin, activeTab, loadFactures, loadJournees, loadTransactions, societeId, initialLoadDone]);

  // ==================== GESTION DES DATES ====================
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

  // ==================== PAIEMENT FACTURE ====================
  const openPay = (doc) => {
    setSelectedFacture(doc);
    setMontant(String(doc.reste));
    setMode('especes');
    setNumeroReglement('');
    setReferenceReglement('');
    setSelectedCaisse(null);
    setShowPay(true);
  };

  const confirmerPaiement = async () => {
    const m = parseFloat(montant) || 0;
    if (m <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    if (m > Number(selectedFacture.reste) + 0.01) {
      Alert.alert('Erreur', `Le reste à payer est ${formatMoney(selectedFacture.reste)}`);
      return;
    }

    if (mode !== 'especes' && !numeroReglement.trim()) {
      Alert.alert('Erreur', 'Le numéro de règlement est obligatoire pour ce mode de paiement.');
      return;
    }

    setSaving(true);
    try {
      const json = await apiCall({
        action: 'regler_facture',
        document_id: selectedFacture.document_id,
        montant: m,
        mode_reglement: mode,
        caisse_id: selectedCaisse?.caisse_id || null,
        journee_caisse_id: selectedCaisse?.journee_ouverte_id || null,
        numero_reglement: mode !== 'especes' ? numeroReglement.trim() : null,
        reference_reglement: mode !== 'especes' ? (referenceReglement.trim() || null) : null,
      });
      Alert.alert('Succès', json.message || 'Règlement enregistré');
      setShowPay(false);
      setSelectedFacture(null);
      setNumeroReglement('');
      setReferenceReglement('');
      setSelectedCaisse(null);
      loadFactures();
      loadCaisses();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ==================== OUVRIR JOURNÉE ====================
  const openJournee = async () => {
    if (!selectedCaisseJournee) {
      Alert.alert('Erreur', 'Sélectionnez une caisse');
      return;
    }
    setSaving(true);
    try {
      const json = await apiCall({
        action: 'open_journee',
        caisse_id: selectedCaisseJournee.caisse_id,
        solde_ouverture: parseFloat(soldeOuverture) || 0,
      });
      Alert.alert('Succès', json.message || 'Journée de caisse ouverte');
      setShowOpenJournee(false);
      setSelectedCaisseJournee(null);
      setSoldeOuverture('0');
      loadJournees();
      loadCaisses();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ==================== FERMER JOURNÉE ====================
  const openCloseJournee = (journee) => {
    setSelectedJournee(journee);
    setSoldeReel(String(journee.solde_theorique || 0));
    setCommentaireEcart('');
    setShowCloseJournee(true);
  };

  const closeJournee = async () => {
    if (!selectedJournee) {
      Alert.alert('Erreur', 'Sélectionnez une journée à fermer');
      return;
    }
    const reel = parseFloat(soldeReel);
    if (isNaN(reel) || reel < 0) {
      Alert.alert('Erreur', 'Solde réel invalide');
      return;
    }
    
    setSaving(true);
    try {
      const json = await apiCall({
        action: 'close_journee',
        journee_id: selectedJournee.journee_id,
        solde_reel: reel,
        commentaire_ecart: commentaireEcart || null,
      });
      const ecart = json.ecart || 0;
      Alert.alert(
        'Succès',
        `Journée fermée\nSolde théorique: ${formatMoney(json.solde_theorique || selectedJournee.solde_theorique)}\nÉcart: ${formatMoney(ecart)}`
      );
      setShowCloseJournee(false);
      setSelectedJournee(null);
      setSoldeReel('');
      setCommentaireEcart('');
      loadJournees();
      loadCaisses();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ==================== CRÉER TRANSACTION ====================
  const createTransaction = async () => {
    const montantVal = parseFloat(txMontant);
    if (!montantVal || montantVal <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }
    if (!selectedCaisse) {
      Alert.alert('Erreur', 'Sélectionnez une caisse');
      return;
    }

    if (txMode !== 'especes' && !txNumeroReglement.trim()) {
      Alert.alert('Erreur', 'Le numéro de règlement est obligatoire pour ce mode de paiement.');
      return;
    }

    setSaving(true);
    try {
      const json = await apiCall({
        action: 'create_transaction',
        caisse_id: selectedCaisse.caisse_id,
        type: txType,
        montant: montantVal,
        objet: txObjet,
        mode_reglement: txMode,
        numero_reglement: txMode !== 'especes' ? txNumeroReglement.trim() : null,
        reference_reglement: txMode !== 'especes' ? (txReferenceReglement.trim() || null) : null,
        charge_id: txType === 'Sortie' ? (txChargeId || null) : null,   // 👈 AJOUT
      });
      Alert.alert('Succès', json.message || 'Transaction enregistrée');
      setShowTransaction(false);
      setSelectedCaisse(null);
      setTxMontant('');
      setTxObjet('');
      setTxNumeroReglement('');
      setTxReferenceReglement('');
      setTxChargeId(null);   // 👈 AJOUT
      loadTransactions();
      loadCaisses();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ==================== OUVRIR DÉTAIL TRANSACTION ====================
  const openTxDetail = (tx) => {
    setSelectedTransaction(tx);
    setShowTxDetail(true);
  };

  const closeTxDetail = () => {
    setShowTxDetail(false);
    setSelectedTransaction(null);
  };

  // ==================== RENDU ====================
  const TABS = [
    { key: 'reglement', label: 'Règlements', icon: 'cash-outline' },
    { key: 'caisses', label: 'Caisses', icon: 'business-outline' },
    { key: 'journees', label: 'Journées', icon: 'calendar-outline' },
    { key: 'transactions', label: 'Transactions', icon: 'swap-horizontal-outline' },
  ];

  const renderPeriodSelector = () => (
    <View style={styles.periodContainer}>
      <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('debut')}>
        <Text style={styles.dateLabel}>Du</Text>
        <Text style={styles.dateValue}>{formatDate(dateDebut)}</Text>
        <Ionicons name="chevron-down" size={16} color="#075E54" />
      </TouchableOpacity>
      
      <Text style={styles.dateSeparator}>au</Text>
      
      <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('fin')}>
        <Text style={styles.dateLabel}>Au</Text>
        <Text style={styles.dateValue}>{formatDate(dateFin)}</Text>
        <Ionicons name="chevron-down" size={16} color="#075E54" />
      </TouchableOpacity>
    </View>
  );

  // ==================== RENDRE LES ONGLETS ====================
  const renderTabContent = () => {
    switch(activeTab) {
      case 'reglement':
        return renderReglement();
      case 'caisses':
        return renderCaisses();
      case 'journees':
        return renderJournees();
      case 'transactions':
        return renderTransactions();
      default:
        return null;
    }
  };

  // ==================== RÈGLEMENT ====================
  const renderReglement = () => (
    <>
      <View style={styles.subTabs}>
        {[
          { key: 'Vente', label: 'Encaissements clients' },
          { key: 'Achat', label: 'Paiements fournisseurs' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.subTab, categorie === t.key && styles.subTabActive]}
            onPress={() => setCategorie(t.key)}
          >
            <Text style={[styles.subTabText, categorie === t.key && styles.subTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {renderPeriodSelector()}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="N° facture ou nom..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={loadFactures}
        />
      </View>

      <FlatList
        data={factures.filter(f => f.reste > 0)}
        keyExtractor={(item) => item.document_id || item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadFactures().finally(() => setRefreshing(false)); }} 
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.factureCard}
            onPress={() => openPay(item)}
            activeOpacity={0.7}
          >
            <View style={styles.factureHeader}>
              <Text style={styles.factureNumero}>{item.numero}</Text>
              <Text style={styles.factureReste}>{formatMoney(item.reste)}</Text>
            </View>
            <Text style={styles.factureClient}>{item.acteur_nom}</Text>
            <View style={styles.factureFooter}>
              <Text style={styles.factureDate}>{item.date}</Text>
              <Text style={styles.factureTotal}>
                Total: {formatMoney(item.montant_toutetaxe)} · Payé: {formatMoney(item.avance)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#25D366" />
            <Text style={styles.emptyText}>Aucune facture impayée</Text>
          </View>
        }
      />
    </>
  );

  // ==================== CAISSES ====================
  const renderCaisses = () => (
    <>
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.actionBtnGreen]}
          onPress={() => { setSelectedCaisseJournee(null); setSoldeOuverture('0'); setShowOpenJournee(true); }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Ouvrir</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.actionBtnBlue]}
          onPress={() => { 
            setTxType('Entree'); 
            setTxMontant('');
            setTxObjet('');
            setTxMode('especes');
            setTxNumeroReglement('');
            setTxReferenceReglement('');
            setTxChargeId(null);   // 👈 AJOUT
            setSelectedCaisse(null);
            setShowTransaction(true); 
          }}
        >
          <Ionicons name="arrow-down-outline" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Encaissement</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.actionBtnRed]}
          onPress={() => { 
            setTxType('Sortie'); 
            setTxMontant('');
            setTxObjet('');
            setTxMode('especes');
            setTxNumeroReglement('');
            setTxReferenceReglement('');
            setTxChargeId(null);   // 👈 AJOUT
            setSelectedCaisse(null);
            setShowTransaction(true); 
          }}
        >
          <Ionicons name="arrow-up-outline" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>Décaissement</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={caisses}
        keyExtractor={(item) => item.caisse_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadCaisses().finally(() => setRefreshing(false)); }} 
          />
        }
        renderItem={({ item }) => (
          <View style={styles.caisseCard}>
            <View style={styles.caisseHeader}>
              <View style={styles.caisseIcon}>
                <Ionicons name="cash-outline" size={24} color="#075E54" />
              </View>
              <View style={styles.caisseInfo}>
                <Text style={styles.caisseNom}>{item.nom}</Text>
                <Text style={styles.caisseBoutique}>{item.boutique_nom}</Text>
              </View>
              <Text style={styles.caisseSolde}>{formatMoney(item.solde)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>Aucune caisse</Text>
          </View>
        }
      />
    </>
  );

  // ==================== JOURNÉES ====================
  const renderJournees = () => (
    <>
      {renderPeriodSelector()}
      <FlatList
        data={journees}
        keyExtractor={(item) => item.journee_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadJournees().finally(() => setRefreshing(false)); }} 
          />
        }
        renderItem={({ item }) => {
          const isOpen = item.statut === 'ouverte';
          const ecart = Number(item.ecart || 0);
          return (
            <View style={[styles.journeeCard, isOpen && styles.journeeCardOpen]}>
              <View style={styles.journeeHeader}>
                <Text style={styles.journeeCaisse}>{item.caisse_nom}</Text>
                <View style={[styles.journeeStatus, isOpen ? styles.statusOpen : styles.statusClosed]}>
                  <Text style={styles.journeeStatusText}>
                    {isOpen ? 'Ouverte' : 'Fermée'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.journeeDate}>
                Ouverture: {item.date_ouverture?.substring(0, 16)}
              </Text>
              <Text style={styles.journeeSolde}>
                Fond: {formatMoney(item.solde_ouverture)}
              </Text>
              
              {!isOpen && (
                <>
                  <Text style={styles.journeeSolde}>
                    Théorique: {formatMoney(item.solde_theorique)}
                  </Text>
                  <Text style={styles.journeeSolde}>
                    Réel: {formatMoney(item.solde_reel)}
                  </Text>
                  {ecart !== 0 && (
                    <Text style={[styles.journeeEcart, ecart > 0 ? styles.ecartPositif : styles.ecartNegatif]}>
                      Écart: {ecart > 0 ? '+' : ''}{formatMoney(ecart)}
                    </Text>
                  )}
                </>
              )}
              
              {isOpen && (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => openCloseJournee(item)}
                >
                  <Text style={styles.closeBtnText}>🔒 Fermer la journée</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>Aucune journée</Text>
          </View>
        }
      />
    </>
  );

  // ==================== TRANSACTIONS ====================
  const renderTransactions = () => (
    <>
      {renderPeriodSelector()}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.transaction_id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadTransactions().finally(() => setRefreshing(false)); }} 
          />
        }
        renderItem={({ item }) => {
          const isEntree = item.type === 'Entree';
          return (
            <TouchableOpacity
              style={styles.transactionCard}
              onPress={() => openTxDetail(item)}
              activeOpacity={0.7}
            >
              <View style={styles.transactionIcon}>
                <Ionicons 
                  name={isEntree ? 'arrow-down-circle' : 'arrow-up-circle'} 
                  size={32} 
                  color={isEntree ? '#25D366' : '#DC3545'} 
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionObjet}>{item.objet || item.type}</Text>
                <Text style={styles.transactionDetails}>
                  {item.date} {item.heure} · {labelMode(item.mode_reglement || item.mode)} · {item.acteur_nom || ''}
                </Text>
                {item.numero_reglement && (
                  <Text style={styles.transactionReglement}>
                    N°: {item.numero_reglement}{item.reference_reglement ? ` · Réf: ${item.reference_reglement}` : ''}
                  </Text>
                )}
                {item.charge_nom && (
                  <Text style={styles.transactionReglement}>
                    Charge: {item.charge_nom}
                  </Text>
                )}
              </View>
              <Text style={[styles.transactionMontant, isEntree ? styles.montantPositif : styles.montantNegatif]}>
                {isEntree ? '+' : '-'}{formatMoney(item.montant_total || item.montant)}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="swap-horizontal-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>Aucune transaction</Text>
          </View>
        }
      />
    </>
  );

  // ==================== RENDU PRINCIPAL ====================
  if (loading && !initialLoadDone) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Onglets */}
      <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  style={styles.tabsScroll}
  contentContainerStyle={styles.tabsContainer}
>
  {TABS.map((t) => (
    <TouchableOpacity
      key={t.key}
      style={[styles.tab, activeTab === t.key && styles.tabActive]}
      onPress={() => setActiveTab(t.key)}
    >
      <Ionicons 
        name={t.icon} 
        size={18} 
        color={activeTab === t.key ? '#075E54' : '#999'} 
      />
      <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>
        {t.label}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>

      {/* Contenu */}
      <View style={styles.content}>
        {renderTabContent()}
      </View>

      {/* ==================== MODAL PAIEMENT FACTURE ==================== */}
      <Modal visible={showPay} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {categorie === 'Vente' ? 'Encaisser' : 'Payer'}
            </Text>
            <TouchableOpacity onPress={() => setShowPay(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {selectedFacture && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalLabel}>Document</Text>
              <Text style={styles.modalValue}>{selectedFacture.numero}</Text>
              <Text style={[styles.modalSubValue, { marginBottom: 12 }]}>{selectedFacture.acteur_nom}</Text>

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total TTC</Text>
                  <Text style={styles.summaryValue}>{formatMoney(selectedFacture.montant_toutetaxe)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Déjà payé</Text>
                  <Text style={styles.summaryValue}>{formatMoney(selectedFacture.avance)}</Text>
                </View>
                <View style={[styles.summaryRow, styles.summaryTotal]}>
                  <Text style={styles.summaryLabel}>Reste</Text>
                  <Text style={styles.summaryTotalValue}>{formatMoney(selectedFacture.reste)}</Text>
                </View>
              </View>

              <Text style={styles.modalLabel}>Montant du règlement</Text>
              <TextInput
                style={styles.modalInput}
                value={montant}
                onChangeText={setMontant}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
              <TouchableOpacity 
                onPress={() => setMontant(String(selectedFacture.reste))} 
                style={styles.solderBtn}
              >
                <Text style={styles.solderBtnText}>Solder entièrement</Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Mode de règlement</Text>
              <View style={styles.modesContainer}>
                {MODES.map((m) => (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.modeChip, mode === m.key && styles.modeChipActive]}
                    onPress={() => {
                      setMode(m.key);
                      if (m.key === 'especes') {
                        setNumeroReglement('');
                        setReferenceReglement('');
                      }
                    }}
                  >
                    <Text style={[styles.modeChipText, mode === m.key && styles.modeChipTextActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {mode !== 'especes' && (
                <>
                  <Text style={styles.modalLabel}>
                    Numéro de règlement <Text style={{ color: '#DC3545' }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    value={numeroReglement}
                    onChangeText={setNumeroReglement}
                    placeholder={placeholderNumero(mode)}
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.modalLabel}>Référence (optionnel)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={referenceReglement}
                    onChangeText={setReferenceReglement}
                    placeholder="Ex: ID de Transaction..."
                    placeholderTextColor="#999"
                  />
                </>
              )}

              <Text style={styles.modalLabel}>Caisse</Text>
              <View style={styles.modesContainer}>
                {caisses.map((c) => (
                  <TouchableOpacity
                    key={c.caisse_id}
                    style={[styles.modeChip, selectedCaisse?.caisse_id === c.caisse_id && styles.modeChipActive]}
                    onPress={() => setSelectedCaisse(c)}
                  >
                    <Text style={[styles.modeChipText, selectedCaisse?.caisse_id === c.caisse_id && styles.modeChipTextActive]}>
                      {c.nom}{c.journee_ouverte_id ? ' ●' : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
                onPress={confirmerPaiement}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {categorie === 'Vente' ? 'Encaisser' : 'Payer'} {formatMoney(parseFloat(montant) || 0)}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ==================== MODAL OUVRIR JOURNÉE ==================== */}
      <Modal visible={showOpenJournee} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ouvrir une journée</Text>
            <TouchableOpacity onPress={() => setShowOpenJournee(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalLabel}>Caisse *</Text>
            {caisses.map((c) => (
              <TouchableOpacity
                key={c.caisse_id}
                style={[
                  styles.selectItem,
                  selectedCaisseJournee?.caisse_id === c.caisse_id && styles.selectItemActive
                ]}
                onPress={() => setSelectedCaisseJournee(c)}
              >
                <Text style={[styles.selectItemText, selectedCaisseJournee?.caisse_id === c.caisse_id && styles.selectItemTextActive]}>
                  {c.nom} — Solde: {formatMoney(c.solde)}
                </Text>
                {selectedCaisseJournee?.caisse_id === c.caisse_id && (
                  <Ionicons name="checkmark-circle" size={20} color="#25D366" />
                )}
              </TouchableOpacity>
            ))}

            <Text style={styles.modalLabel}>Fond de caisse</Text>
            <TextInput
              style={styles.modalInput}
              value={soldeOuverture}
              onChangeText={setSoldeOuverture}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
              onPress={openJournee}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Ouvrir la journée</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ==================== MODAL FERMER JOURNÉE ==================== */}
      <Modal visible={showCloseJournee} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Fermer la journée</Text>
            <TouchableOpacity onPress={() => { setShowCloseJournee(false); setSelectedJournee(null); }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          {selectedJournee && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Caisse</Text>
                  <Text style={styles.infoValue}>{selectedJournee.caisse_nom}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Ouverture</Text>
                  <Text style={styles.infoValue}>{selectedJournee.date_ouverture?.substring(0, 16)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Fond initial</Text>
                  <Text style={styles.infoValue}>{formatMoney(selectedJournee.solde_ouverture)}</Text>
                </View>
                <View style={[styles.infoRow, styles.infoTotal]}>
                  <Text style={styles.infoLabel}>Solde théorique</Text>
                  <Text style={styles.infoTotalValue}>{formatMoney(selectedJournee.solde_theorique)}</Text>
                </View>
              </View>

              <Text style={styles.modalLabel}>Solde réel (comptage) *</Text>
              <TextInput
                style={styles.modalInput}
                value={soldeReel}
                onChangeText={setSoldeReel}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />

              <Text style={styles.modalLabel}>Commentaire (écart éventuel)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={commentaireEcart}
                onChangeText={setCommentaireEcart}
                multiline
                placeholder="Justifier l'écart si nécessaire..."
                placeholderTextColor="#999"
              />

              {soldeReel && selectedJournee.solde_theorique !== null &&
                parseFloat(soldeReel) !== selectedJournee.solde_theorique && (
                <View style={styles.alertCard}>
                  <Ionicons name="warning-outline" size={24} color="#DC3545" />
                  <Text style={styles.alertText}>
                    ⚠️ Écart de {formatMoney(Math.abs(parseFloat(soldeReel) - selectedJournee.solde_theorique))}
                  </Text>
                  <Text style={styles.alertSubText}>
                    {parseFloat(soldeReel) > selectedJournee.solde_theorique ? 'Excédent' : 'Manquant'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmBtnDanger, saving && styles.confirmBtnDisabled]}
                onPress={closeJournee}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmBtnText}>Fermer la journée</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ==================== MODAL TRANSACTION ==================== */}
      <Modal visible={showTransaction} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{txType === 'Entree' ? 'Encaissement' : 'Décaissement'}</Text>
            <TouchableOpacity onPress={() => setShowTransaction(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalLabel}>Caisse *</Text>
            {caisses.map((c) => (
              <TouchableOpacity
                key={c.caisse_id}
                style={[
                  styles.selectItem,
                  selectedCaisse?.caisse_id === c.caisse_id && styles.selectItemActive
                ]}
                onPress={() => setSelectedCaisse(c)}
              >
                <Text style={[styles.selectItemText, selectedCaisse?.caisse_id === c.caisse_id && styles.selectItemTextActive]}>
                  {c.nom}
                </Text>
                {selectedCaisse?.caisse_id === c.caisse_id && (
                  <Ionicons name="checkmark-circle" size={20} color="#25D366" />
                )}
              </TouchableOpacity>
            ))}

            <Text style={styles.modalLabel}>Montant *</Text>
            <TextInput
              style={styles.modalInput}
              value={txMontant}
              onChangeText={setTxMontant}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Objet / Libellé</Text>
            <TextInput
              style={styles.modalInput}
              value={txObjet}
              onChangeText={setTxObjet}
              placeholderTextColor="#999"
            />

            {/* 👇 Champ Charge uniquement pour Décaissement */}
            {txType === 'Sortie' && (
              <>
                <Text style={styles.modalLabel}>Charge</Text>
                <View style={styles.modesContainer}>
                  {/* Option Aucune charge */}
                  <TouchableOpacity
                    style={[styles.modeChip, !txChargeId && styles.modeChipActive]}
                    onPress={() => setTxChargeId(null)}
                  >
                    <Text style={[styles.modeChipText, !txChargeId && styles.modeChipTextActive]}>
                      Aucune charge
                    </Text>
                  </TouchableOpacity>

                  {/* Liste des charges */}
                  {charges.map((ch) => (
                    <TouchableOpacity
                      key={ch.charge_id}
                      style={[styles.modeChip, txChargeId === ch.charge_id && styles.modeChipActive]}
                      onPress={() => setTxChargeId(ch.charge_id)}
                    >
                      <Text style={[styles.modeChipText, txChargeId === ch.charge_id && styles.modeChipTextActive]}>
                        {ch.nom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {charges.length === 0 && (
                  <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                    Aucune charge enregistrée. Créez-en depuis Paramètres → Charges.
                  </Text>
                )}
              </>
            )}

            <Text style={styles.modalLabel}>Mode de règlement</Text>
            <View style={styles.modesContainer}>
              {MODES.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.modeChip, txMode === m.key && styles.modeChipActive]}
                  onPress={() => {
                    setTxMode(m.key);
                    if (m.key === 'especes') {
                      setTxNumeroReglement('');
                      setTxReferenceReglement('');
                    }
                  }}
                >
                  <Text style={[styles.modeChipText, txMode === m.key && styles.modeChipTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {txMode !== 'especes' && (
              <>
                <Text style={styles.modalLabel}>
                  Numéro de règlement <Text style={{ color: '#DC3545' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={txNumeroReglement}
                  onChangeText={setTxNumeroReglement}
                  placeholder={placeholderNumero(txMode)}
                  placeholderTextColor="#999"
                />

                <Text style={styles.modalLabel}>Référence (optionnel)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={txReferenceReglement}
                  onChangeText={setTxReferenceReglement}
                  placeholder="Ex: ID de transaction"
                  placeholderTextColor="#999"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, saving && styles.confirmBtnDisabled]}
              onPress={createTransaction}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* ==================== MODAL DÉTAIL TRANSACTION ==================== */}
      <Modal
        visible={showTxDetail}
        animationType="slide"
        statusBarTranslucent={true}
  navigationBarTranslucent={true}
        onRequestClose={closeTxDetail}
      >
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Détail de la transaction</Text>
            <TouchableOpacity onPress={closeTxDetail}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {selectedTransaction && (() => {
            const tx = selectedTransaction;
            const isEntree = tx.type === 'Entree';
            const modeKey = tx.mode_reglement || tx.mode || 'especes';
            const isEspeces = modeKey === 'especes';

            return (
              <ScrollView contentContainerStyle={styles.modalContent}>
                {/* Bandeau type */}
                <View
                  style={[
                    styles.txDetailBanner,
                    { backgroundColor: isEntree ? '#E8F5E9' : '#fee2e2' },
                  ]}
                >
                  <Ionicons
                    name={isEntree ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={44}
                    color={isEntree ? '#25D366' : '#DC3545'}
                  />
                  <Text
                    style={[
                      styles.txDetailBannerType,
                      { color: isEntree ? '#25D366' : '#DC3545' },
                    ]}
                  >
                    {isEntree ? 'Encaissement' : 'Décaissement'}
                  </Text>
                  <Text
                    style={[
                      styles.txDetailBannerMontant,
                      { color: isEntree ? '#25D366' : '#DC3545' },
                    ]}
                  >
                    {isEntree ? '+' : '-'}{formatMoney(tx.montant_total || tx.montant)}
                  </Text>
                </View>

                {/* Infos principales */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Objet / Libellé</Text>
                    <Text style={styles.infoValue} numberOfLines={2}>
                      {tx.objet || tx.type || '—'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date</Text>
                    <Text style={styles.infoValue}>{tx.date || '—'}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Heure</Text>
                    <Text style={styles.infoValue}>{tx.heure || '—'}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>
                      {isEntree ? 'Entrée' : 'Sortie'}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mode de règlement</Text>
                    <Text style={styles.infoValue}>{labelMode(modeKey)}</Text>
                  </View>

                  {tx.acteur_nom && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Tiers</Text>
                      <Text style={styles.infoValue}>{tx.acteur_nom}</Text>
                    </View>
                  )}

                  {tx.charge_nom && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Charge</Text>
                      <Text style={styles.infoValue}>{tx.charge_nom}</Text>
                    </View>
                  )}
                </View>

                {/* Détails financiers */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Montant</Text>
                    <Text style={styles.infoValue}>{formatMoney(tx.montant)}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Frais</Text>
                    <Text style={styles.infoValue}>{formatMoney(tx.frais || 0)}</Text>
                  </View>

                  <View style={[styles.infoRow, styles.infoTotal]}>
                    <Text style={styles.infoLabel}>Montant total</Text>
                    <Text style={styles.infoTotalValue}>
                      {formatMoney(tx.montant_total || tx.montant)}
                    </Text>
                  </View>
                </View>

                {/* Détails de règlement (uniquement si mode ≠ espèces) */}
                {!isEspeces && (
                  <View style={styles.infoCard}>
                    <Text style={styles.txDetailSectionTitle}>Détails du règlement</Text>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Numéro</Text>
                      <Text style={styles.infoValue}>{tx.numero_reglement || '—'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Référence</Text>
                      <Text style={styles.infoValue}>{tx.reference_reglement || '—'}</Text>
                    </View>
                  </View>
                )}

                {/* Statut */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Statut</Text>
                    <View
                      style={[
                        styles.txDetailStatusBadge,
                        {
                          backgroundColor:
                            tx.statut === 'succes' || tx.statut === 'valide'
                              ? '#dcfce7'
                              : '#fef3c7',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            tx.statut === 'succes' || tx.statut === 'valide'
                              ? '#16a34a'
                              : '#d97706',
                          fontWeight: '600',
                          fontSize: 12,
                        }}
                      >
                        {tx.statut || 'succes'}
                      </Text>
                    </View>
                  </View>

                  {tx.transaction_id && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>ID Transaction</Text>
                      <Text style={styles.infoValue} numberOfLines={1}>
                        {String(tx.transaction_id).substring(0, 14)}...
                      </Text>
                    </View>
                  )}
                </View>

                {/* Bouton fermer */}
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: '#075E54' }]}
                  onPress={closeTxDetail}
                >
                  <Text style={styles.confirmBtnText}>Fermer</Text>
                </TouchableOpacity>
              </ScrollView>
            );
          })()}
        </View>
      </Modal>

      {/* DatePicker */}
      {showPicker && (
        <DateTimePicker
          value={pickerTarget === 'debut' ? dateDebut : dateFin}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
      {Platform.OS === 'ios' && showPicker && (
        <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowPicker(false)}>
          <Text style={styles.pickerDoneText}>Terminé</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { color: '#075E54', marginTop: 12, fontSize: 16 },
  content: { flex: 1 },

  // Tabs
  // Remplace le style `tabs` par deux nouveaux styles
tabsScroll: {
  flexGrow: 0,              // ← empêche le ScrollView de prendre toute la hauteur
  backgroundColor: '#fff',
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
tabsContainer: {
  flexDirection: 'row',
  paddingVertical: 6,
  paddingHorizontal: 8,
  gap: 6,                   // ← espace entre les onglets
},

// Modifie `tab` : retire flex:1, ajoute paddingHorizontal
tab: {
  // flex: 1,               ← SUPPRIMÉ (sinon les onglets se compressent)
  alignItems: 'center',
  paddingVertical: 6,
  paddingHorizontal: 14,    // ← largeur confortable
  borderBottomWidth: 2,
  borderBottomColor: 'transparent',
  flexDirection: 'row',
  justifyContent: 'center',
  gap: 4,
},
  tabActive: {
    borderBottomColor: '#075E54',
    backgroundColor: '#E8F5E9',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#075E54',
  },

  // Sub tabs
  subTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  subTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  subTabActive: {
    backgroundColor: '#E8F5E9',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  subTabTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },

  // Search
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    paddingVertical: 6,
  },

  // Action Bar
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  actionBtn: {
    width: '32%',
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderRadius: 8,
  },

  actionBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
    marginLeft: 5,
    textAlign: 'center',
  },
  actionBtnGreen: {
    backgroundColor: '#25D366',
  },
  actionBtnBlue: {
    backgroundColor: '#34B7F1',
  },
  actionBtnRed: {
    backgroundColor: '#DC3545',
  },

  // Period
  periodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  dateLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#075E54',
  },
  dateSeparator: {
    color: '#999',
    fontWeight: '600',
    marginHorizontal: 8,
  },

  // Lists
  listContainer: {
    padding: 12,
    paddingBottom: 40,
  },

  // Facture Card
  factureCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  factureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factureNumero: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  factureReste: {
    fontSize: 16,
    fontWeight: '800',
    color: '#DC3545',
  },
  factureClient: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  factureFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  factureDate: {
    fontSize: 12,
    color: '#999',
  },
  factureTotal: {
    fontSize: 12,
    color: '#999',
  },

  // Caisse Card
  caisseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  caisseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caisseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  caisseInfo: {
    flex: 1,
  },
  caisseNom: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  caisseBoutique: {
    fontSize: 12,
    color: '#999',
  },
  caisseSolde: {
    fontSize: 16,
    fontWeight: '800',
    color: '#075E54',
  },

  // Journée Card
  journeeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  journeeCardOpen: {
    borderColor: '#25D366',
    borderWidth: 2,
  },
  journeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  journeeCaisse: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  journeeStatus: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusOpen: {
    backgroundColor: '#E8F5E9',
  },
  statusClosed: {
    backgroundColor: '#f5f5f5',
  },
  journeeStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  journeeDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  journeeSolde: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  journeeEcart: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  ecartPositif: {
    color: '#25D366',
  },
  ecartNegatif: {
    color: '#DC3545',
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
  },
  closeBtnText: {
    fontWeight: '600',
    fontSize: 14,
    color: '#DC3545',
  },

  // Transaction Card
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionIcon: {
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionObjet: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  transactionDetails: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionReglement: {
    fontSize: 11,
    color: '#075E54',
    marginTop: 2,
    fontWeight: '500',
  },
  transactionMontant: {
    fontSize: 15,
    fontWeight: '700',
  },
  montantPositif: {
    color: '#25D366',
  },
  montantNegatif: {
    color: '#DC3545',
  },

  // Empty
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
  },

  // Modals
  modalWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 46,
    paddingBottom: 12,
    backgroundColor:'#075E54'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalContent: {
    padding: 16,
    paddingBottom: 40,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  modalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  modalSubValue: {
    fontSize: 14,
    color: '#666',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 6,
    paddingTop: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC3545',
  },

  // Solder Button
  solderBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  solderBtnText: {
    color: '#075E54',
    fontWeight: '600',
    fontSize: 13,
  },

  // Modes
  modesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#075E54',
  },
  modeChipText: {
    fontSize: 13,
    color: '#666',
  },
  modeChipTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },

  // Select Item
  selectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingHorizontal: 4,
  },
  selectItemActive: {
    backgroundColor: '#f0f7ff',
  },
  selectItemText: {
    fontSize: 14,
    color: '#333',
  },
  selectItemTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoTotal: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 6,
    paddingTop: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  infoTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#075E54',
  },

  // Alert Card
  alertCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DC3545',
    alignItems: 'center',
  },
  alertText: {
    color: '#DC3545',
    fontWeight: '600',
    marginTop: 4,
  },
  alertSubText: {
    color: '#DC3545',
    fontSize: 12,
    marginTop: 2,
  },

  // Confirm Button
  confirmBtn: {
    backgroundColor: '#075E54',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnDanger: {
    backgroundColor: '#DC3545',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Picker Done
  pickerDoneBtn: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pickerDoneText: {
    color: '#075E54',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // ===== DÉTAIL TRANSACTION =====
  txDetailBanner: {
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  txDetailBannerType: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  txDetailBannerMontant: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
  },
  txDetailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#075E54',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txDetailStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
});