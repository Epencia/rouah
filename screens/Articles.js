import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { offlineFetch } from '../services/offlineApi';

// ============ CONSTANTES API ============
const API_URL = 'https://rouah.net/api/api-article.php';
const STOCK_API_URL = 'https://rouah.net/api/api-stock.php';
const INVENTAIRE_API_URL = 'https://rouah.net/api/api-inventaire.php';

// ============ FONCTIONS UTILITAIRES ============
const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatMoney = (val) => {
  return Number(val || 0).toLocaleString('fr-FR') + ' F';
};

// Filtres pour les inventaires
const INVENTAIRE_FILTERS = [
  { key: '', label: 'Tous' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'valide', label: 'Validés' },
  { key: 'annule', label: 'Annulés' },
];

// Options pour les nouveaux champs
const TYPE_OPTIONS = [
  { value: 'Biens', label: 'Biens' },
  { value: 'Services', label: 'Services' },
];

const RESTRICTION_OPTIONS = [
  { value: 'facultatif', label: 'Facultatif' },
  { value: 'obligatoire', label: 'Obligatoire' },
];

const STATUT_OPTIONS = [
  { value: 'actif', label: 'Actif', color: '#25D366' },
  { value: 'inactif', label: 'Inactif', color: '#999' },
];

export default function ArticlesScreen({ societeId, boutiqueId, user, onChanged }) {
  // ==================== ÉTATS ====================
  const [activeTab, setActiveTab] = useState('articles');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Articles
  const [articles, setArticles] = useState([]);
  const [searchText, setSearchText] = useState('');

  // Familles
  const [familles, setFamilles] = useState([]);
  const [searchFamille, setSearchFamille] = useState('');

  // Unités
  const [unites, setUnites] = useState([]);
  const [searchUnite, setSearchUnite] = useState('');

  // Stocks
  const [stocks, setStocks] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [stockTab, setStockTab] = useState('stock');

  // Inventaires
  const [inventaires, setInventaires] = useState([]);
  const [inventaireFilter, setInventaireFilter] = useState('');
  const [searchInventaire, setSearchInventaire] = useState('');

  // Lots
  const [lots, setLots] = useState([]);
  const [searchLot, setSearchLot] = useState('');

  // Dates pour mouvements
  const [dateDebut, setDateDebut] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [dateFin, setDateFin] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTarget, setPickerTarget] = useState('debut');

  // Formulaires
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create');
  const [formEntity, setFormEntity] = useState('article');
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Modal sélection article (partagé entre mouvement et lot)
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [articleModalTarget, setArticleModalTarget] = useState('mouvement'); // 'mouvement' | 'lot'
  const [articleSearch, setArticleSearch] = useState('');
  const [filteredArticles, setFilteredArticles] = useState([]);

  // Modal inventaire
  const [showInventaireDetail, setShowInventaireDetail] = useState(false);
  const [currentInventaire, setCurrentInventaire] = useState(null);
  const [inventaireLignes, setInventaireLignes] = useState([]);
  const [inventaireSearch, setInventaireSearch] = useState('');
  const [onlyEcarts, setOnlyEcarts] = useState(false);
  const [creatingInventaire, setCreatingInventaire] = useState(false);

  // ==================== ÉTATS MOUVEMENTS ====================
  const [showMvtForm, setShowMvtForm] = useState(false);
  const [mvtType, setMvtType] = useState('entree_reception');
  const [selectedArticleMvt, setSelectedArticleMvt] = useState(null);
  const [quantiteMvt, setQuantiteMvt] = useState('');
  const [notesMvt, setNotesMvt] = useState('');
  const [boutiqueDest, setBoutiqueDest] = useState(null);
  const [boutiques, setBoutiques] = useState([]);
  const [mvtSaving, setMvtSaving] = useState(false);

  // ==================== ÉTATS LOTS ====================
  const [showLotForm, setShowLotForm] = useState(false);
  const [lotFormMode, setLotFormMode] = useState('create');
  const [lotForm, setLotForm] = useState({
    article_id: '',
    article_nom: '',
    numero_lot: '',
    quantite: '',
    date_fabrication: new Date(),
    date_peremption: new Date(),
    boutique_id: '',
  });
  const [showLotDatePicker, setShowLotDatePicker] = useState(false);
  const [lotDatePickerTarget, setLotDatePickerTarget] = useState('fabrication');
  const [lotBoutiques, setLotBoutiques] = useState([]);
  const [lotSaving, setLotSaving] = useState(false);

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
  const loadArticles = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(API_URL, { action: 'list_articles', search: searchText || undefined, statut: 'all' });
      setArticles(json.data || []);
    } catch (e) {
      console.warn('loadArticles error:', e.message);
    }
  }, [societeId, searchText]);

  const loadFamilles = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(API_URL, { action: 'list_familles', statut: 'all' });
      setFamilles(json.data || []);
    } catch (e) {
      console.warn('loadFamilles error:', e.message);
    }
  }, [societeId]);

  const loadUnites = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(API_URL, { action: 'list_unites', statut: 'all' });
      setUnites(json.data || []);
    } catch (e) {
      console.warn('loadUnites error:', e.message);
    }
  }, [societeId]);

  const loadStocks = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(STOCK_API_URL, { action: 'list_stocks', search: searchText || undefined });
      setStocks(json.data || []);
    } catch (e) {
      console.warn('loadStocks error:', e.message);
    }
  }, [societeId, searchText]);

  const loadMouvements = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(STOCK_API_URL, {
        action: 'list_mouvements',
        date_debut: formatDate(dateDebut),
        date_fin: formatDate(dateFin),
      });
      setMouvements(json.data || []);
    } catch (e) {
      console.warn('loadMouvements error:', e.message);
    }
  }, [societeId, dateDebut, dateFin]);

  const loadAlertes = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(STOCK_API_URL, { action: 'alertes' });
      setAlertes(json.data || []);
    } catch (e) {
      console.warn('loadAlertes error:', e.message);
    }
  }, [societeId]);

  const loadInventaires = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(INVENTAIRE_API_URL, {
        action: 'list_inventaires',
        statut: inventaireFilter || undefined,
        date_debut: formatDate(dateDebut),
        date_fin: formatDate(dateFin),
        search: searchInventaire || undefined,
      });
      setInventaires(json.data || []);
    } catch (e) {
      console.warn('loadInventaires error:', e.message);
    }
  }, [societeId, dateDebut, dateFin, inventaireFilter, searchInventaire]);

  const loadLots = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(STOCK_API_URL, {
        action: 'list_lots',
        search: searchLot || undefined,
      });
      setLots(json.data || []);
    } catch (e) {
      console.warn('loadLots error:', e.message);
    }
  }, [societeId, searchLot]);

  const loadBoutiques = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(STOCK_API_URL, { action: 'list_boutiques' });
      setBoutiques(json.data || []);
    } catch (e) {
      console.warn('loadBoutiques error:', e.message);
    }
  }, [societeId]);

  const loadLotBoutiques = useCallback(async () => {
    if (!societeId) return;
    try {
      const json = await apiCall(STOCK_API_URL, { action: 'list_boutiques' });
      setLotBoutiques(json.data || []);
    } catch (e) {
      console.warn('loadLotBoutiques error:', e.message);
    }
  }, [societeId]);

  const loadAllData = useCallback(async () => {
    if (!societeId) return;
    setLoading(true);
    try {
      await loadBoutiques();
      await Promise.all([
        loadArticles(),
        loadFamilles(),
        loadUnites(),
        loadStocks(),
        loadMouvements(),
        loadAlertes(),
        loadInventaires(),
        loadLots(),
      ]);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [societeId, loadArticles, loadFamilles, loadUnites, loadStocks, loadMouvements, loadAlertes, loadInventaires, loadLots, loadBoutiques]);

  useEffect(() => {
    if (societeId) {
      loadAllData();
    }
  }, [societeId, loadAllData]);

  useEffect(() => {
    if (!societeId) return;
    if (activeTab === 'articles') loadArticles();
    else if (activeTab === 'familles') loadFamilles();
    else if (activeTab === 'unites') loadUnites();
    else if (activeTab === 'stocks') {
      if (stockTab === 'stock') loadStocks();
      else if (stockTab === 'mouvements') loadMouvements();
      else if (stockTab === 'alertes') loadAlertes();
    } else if (activeTab === 'inventaires') {
      loadInventaires();
    } else if (activeTab === 'lots') {
      loadLots();
    }
  }, [activeTab, stockTab, loadArticles, loadFamilles, loadUnites, loadStocks, loadMouvements, loadAlertes, loadInventaires, loadLots, societeId, inventaireFilter, searchInventaire, searchLot]);

  // ==================== CRUD ARTICLES ====================
  const buildArticlePayload = () => ({
    nom: form.nom,
    type: form.type || undefined,
    unite_achat_id: form.unite_achat_id || undefined,
    unite_vente_id: form.unite_vente_id || undefined,
    facteur_conversion: parseFloat(form.facteur_conversion) || 1,
    code_barre: form.code_barre || undefined,
    reference_fournisseur: form.reference_fournisseur || undefined,
    prix_achat: parseFloat(form.prix_achat) || 0,
    prix_vente: parseFloat(form.prix_vente) || 0,
    restriction_prix: form.restriction_prix || 'facultatif',
    stock_alerte: parseInt(form.stock_alerte) || 0,
    famille_id: form.famille_id || undefined,
    description: form.description || undefined,
    statut: form.statut || 'actif',
  });

  const createArticle = async () => {
    if (!form.nom?.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const json = await apiCall(API_URL, {
        action: 'create_article',
        ...buildArticlePayload(),
      });
      Alert.alert('Succès', json.message || 'Article créé');
      setShowForm(false);
      loadArticles();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateArticle = async () => {
    if (!form.nom?.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const json = await apiCall(API_URL, {
        action: 'update_article',
        article_id: form.id,
        ...buildArticlePayload(),
      });
      Alert.alert('Succès', json.message || 'Article mis à jour');
      setShowForm(false);
      loadArticles();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteArticle = async (id, label) => {
    Alert.alert('Supprimer', `Supprimer « ${label} » ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', style: 'destructive',
        onPress: async () => {
          try {
            const json = await apiCall(API_URL, { action: 'delete_article', article_id: id });
            Alert.alert('Succès', json.message || 'Supprimé');
            loadArticles();
            onChanged?.();
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        }
      }
    ]);
  };

  // ==================== CRUD FAMILLES ====================
  const createFamille = async () => {
    if (!form.nom?.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const json = await apiCall(API_URL, {
        action: 'create_famille',
        nom: form.nom,
        statut: form.statut || 'actif',
      });
      Alert.alert('Succès', json.message || 'Famille créée');
      setShowForm(false);
      loadFamilles();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateFamille = async () => {
    if (!form.nom?.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const json = await apiCall(API_URL, {
        action: 'update_famille',
        famille_id: form.id,
        nom: form.nom,
        statut: form.statut || 'actif',
      });
      Alert.alert('Succès', json.message || 'Famille mise à jour');
      setShowForm(false);
      loadFamilles();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteFamille = async (id, label) => {
    Alert.alert('Supprimer', `Supprimer la famille « ${label} » ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', style: 'destructive',
        onPress: async () => {
          try {
            const json = await apiCall(API_URL, { action: 'delete_famille', famille_id: id });
            Alert.alert('Succès', json.message || 'Supprimé');
            loadFamilles();
            onChanged?.();
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        }
      }
    ]);
  };

  // ==================== CRUD UNITÉS ====================
  const createUnite = async () => {
    if (!form.nom?.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const json = await apiCall(API_URL, {
        action: 'create_unite',
        nom: form.nom,
        abreviation: form.abreviation || undefined,
        statut: form.statut || 'actif',
      });
      Alert.alert('Succès', json.message || 'Unité créée');
      setShowForm(false);
      loadUnites();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const updateUnite = async () => {
    if (!form.nom?.trim()) {
      Alert.alert('Erreur', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      const json = await apiCall(API_URL, {
        action: 'update_unite',
        unite_id: form.id,
        nom: form.nom,
        abreviation: form.abreviation || undefined,
        statut: form.statut || 'actif',
      });
      Alert.alert('Succès', json.message || 'Unité mise à jour');
      setShowForm(false);
      loadUnites();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteUnite = async (id, label) => {
    Alert.alert('Supprimer', `Supprimer l'unité « ${label} » ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', style: 'destructive',
        onPress: async () => {
          try {
            const json = await apiCall(API_URL, { action: 'delete_unite', unite_id: id });
            Alert.alert('Succès', json.message || 'Supprimé');
            loadUnites();
            onChanged?.();
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        }
      }
    ]);
  };

  // ==================== FORMULAIRE ====================
  const openCreate = (entity) => {
    setFormEntity(entity);
    setFormMode('create');
    if (entity === 'article') {
      setForm({
        nom: '',
        type: 'Biens',
        unite_achat_id: '',
        unite_vente_id: '',
        facteur_conversion: '1',
        code_barre: '',
        reference_fournisseur: '',
        prix_achat: '',
        prix_vente: '',
        restriction_prix: 'facultatif',
        stock_alerte: '0',
        famille_id: '',
        description: '',
        statut: 'actif',
      });
    } else if (entity === 'famille') {
      setForm({ nom: '', statut: 'actif' });
    } else if (entity === 'unite') {
      setForm({ nom: '', abreviation: '', statut: 'actif' });
    }
    setShowForm(true);
  };

  const openEdit = (entity, item) => {
    setFormEntity(entity);
    setFormMode('edit');
    if (entity === 'article') {
      setForm({
        id: item.article_id,
        nom: item.nom || '',
        type: item.type || 'Biens',
        unite_achat_id: item.unite_achat_id || '',
        unite_vente_id: item.unite_vente_id || '',
        facteur_conversion: String(item.facteur_conversion || '1'),
        code_barre: item.code_barre || '',
        reference_fournisseur: item.reference_fournisseur || '',
        prix_achat: String(item.prix_achat || ''),
        prix_vente: String(item.prix_vente || ''),
        restriction_prix: item.restriction_prix || 'facultatif',
        stock_alerte: String(item.stock_alerte || 0),
        famille_id: item.famille_id || '',
        description: item.description || '',
        statut: item.statut || 'actif',
      });
    } else if (entity === 'famille') {
      setForm({ id: item.famille_id, nom: item.nom, statut: item.statut || 'actif' });
    } else {
      setForm({
        id: item.unite_id,
        nom: item.nom,
        abreviation: item.abreviation || '',
        statut: item.statut || 'actif',
      });
    }
    setShowForm(true);
  };

  const saveForm = () => {
    if (formEntity === 'article') {
      if (formMode === 'create') createArticle();
      else updateArticle();
    } else if (formEntity === 'famille') {
      if (formMode === 'create') createFamille();
      else updateFamille();
    } else if (formEntity === 'unite') {
      if (formMode === 'create') createUnite();
      else updateUnite();
    }
  };

  // ==================== DATE PICKER ====================
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

  // ==================== OUVERTURE MODAL ARTICLE ====================
  const openArticleSelector = (target) => {
    setArticleModalTarget(target);
    setArticleSearch('');
    setFilteredArticles(articles);
    setShowArticleModal(true);
  };

  const selectArticleFromModal = (item) => {
    if (articleModalTarget === 'mouvement') {
      setSelectedArticleMvt(item);
    } else if (articleModalTarget === 'lot') {
      setLotForm(prev => ({ ...prev, article_id: item.article_id, article_nom: item.nom }));
    }
    setShowArticleModal(false);
  };

  // ==================== INVENTAIRE ====================
  const openInventaireDetail = async (inventaire) => {
    setCurrentInventaire(inventaire);
    setInventaireSearch('');
    setOnlyEcarts(false);
    try {
      const json = await apiCall(INVENTAIRE_API_URL, {
        action: 'get_inventaire',
        inventaire_id: inventaire.inventaire_id,
      });
      if (json.success) {
        setInventaireLignes(json.data?.lignes || []);
        setShowInventaireDetail(true);
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  };

  const updateInventaireLigne = async (ligneId, quantiteComptee) => {
    setInventaireLignes(prev => prev.map(l =>
      l.ligne_inventaire_id === ligneId ? { ...l, quantite_comptee: quantiteComptee } : l
    ));
  };

  const saveInventaireLignes = async () => {
    setSaving(true);
    try {
      const payload = inventaireLignes.map(l => ({
        ligne_inventaire_id: l.ligne_inventaire_id,
        quantite_comptee: parseFloat(l.quantite_comptee) || 0,
        commentaire: l.commentaire || null,
      }));
      const json = await apiCall(INVENTAIRE_API_URL, { action: 'update_lignes', lignes: payload });
      Alert.alert('Succès', json.message || 'Comptage enregistré');
      loadInventaires();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  const validerInventaire = async () => {
    Alert.alert(
      'Valider l\'inventaire',
      'Les écarts seront appliqués au stock. Continuer ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Valider',
          onPress: async () => {
            setSaving(true);
            try {
              const payload = inventaireLignes.map(l => ({
                ligne_inventaire_id: l.ligne_inventaire_id,
                quantite_comptee: parseFloat(l.quantite_comptee) || 0,
                commentaire: l.commentaire || null,
              }));
              await apiCall(INVENTAIRE_API_URL, { action: 'update_lignes', lignes: payload });
              const json = await apiCall(INVENTAIRE_API_URL, {
                action: 'valider_inventaire',
                inventaire_id: currentInventaire.inventaire_id,
              });
              Alert.alert('Succès', json.message || 'Inventaire validé');
              setShowInventaireDetail(false);
              loadInventaires();
              onChanged?.();
            } catch (e) {
              Alert.alert('Erreur', e.message);
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const annulerInventaire = (inv) => {
    Alert.alert('Annuler', 'Annuler cet inventaire ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui', style: 'destructive',
        onPress: async () => {
          try {
            const json = await apiCall(INVENTAIRE_API_URL, {
              action: 'annuler_inventaire',
              inventaire_id: inv.inventaire_id,
            });
            if (json.success) {
              Alert.alert('Succès', json.message);
              setShowInventaireDetail(false);
              loadInventaires();
              onChanged?.();
            }
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        }
      }
    ]);
  };

  // ==================== CRÉATION INVENTAIRE AVEC VÉRIFICATION BOUTIQUE ====================
  const createInventaire = () => {
    if (!boutiqueId) {
      Alert.alert(
        'Erreur',
        'Aucune boutique active sélectionnée.\nVeuillez sélectionner une boutique dans les paramètres.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Nouvel inventaire',
      `Créer un inventaire pour la boutique "${boutiques.find(b => b.boutique_id === boutiqueId)?.nom || 'sélectionnée'}" ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          onPress: async () => {
            setCreatingInventaire(true);
            try {
              const json = await apiCall(INVENTAIRE_API_URL, {
                action: 'create_inventaire',
                boutique_id: boutiqueId
              });
              if (json.success) {
                Alert.alert('Succès', json.message || 'Inventaire créé');
                loadInventaires();
                onChanged?.();
                openInventaireDetail({ inventaire_id: json.inventaire_id });
              }
            } catch (e) {
              Alert.alert('Erreur', e.message);
            } finally {
              setCreatingInventaire(false);
            }
          }
        }
      ]
    );
  };

  // ==================== MOUVEMENTS DE STOCK ====================
  const openMouvementForm = (type) => {
    if (!boutiqueId) {
      Alert.alert(
        'Erreur',
        'Aucune boutique active sélectionnée.\nVeuillez sélectionner une boutique dans les paramètres.',
        [{ text: 'OK' }]
      );
      return;
    }

    setMvtType(type);
    setSelectedArticleMvt(null);
    setQuantiteMvt('');
    setNotesMvt('');
    setBoutiqueDest(null);
    loadBoutiques();
    setShowMvtForm(true);
  };

  const saveMouvement = async () => {
    if (!selectedArticleMvt) {
      Alert.alert('Erreur', 'Sélectionnez un article');
      return;
    }
    const qty = parseFloat(quantiteMvt);
    if (!qty || qty <= 0) {
      Alert.alert('Erreur', 'Quantité invalide');
      return;
    }
    if (mvtType === 'transfert_sortie' && !boutiqueDest) {
      Alert.alert('Erreur', 'Sélectionnez la boutique de destination');
      return;
    }

    setMvtSaving(true);
    try {
      const json = await apiCall(STOCK_API_URL, {
        action: 'mouvement',
        article_id: selectedArticleMvt.article_id,
        quantite: qty,
        type: mvtType,
        notes: notesMvt,
        boutique_destination_id: boutiqueDest?.boutique_id,
      });
      Alert.alert('Succès', json.message || 'Mouvement enregistré');
      setShowMvtForm(false);
      loadStocks();
      loadMouvements();
      loadAlertes();
      onChanged?.();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setMvtSaving(false);
    }
  };

  // ==================== GESTION DES LOTS ====================
  const openCreateLot = () => {
    setLotFormMode('create');
    setLotForm({
      article_id: '',
      article_nom: '',
      numero_lot: '',
      quantite: '',
      date_fabrication: new Date(),
      date_peremption: new Date(),
      boutique_id: boutiqueId || '',
    });
    loadLotBoutiques();
    setShowLotForm(true);
  };

  const openEditLot = (lot) => {
    setLotFormMode('edit');
    setLotForm({
      lot_id: lot.lot_id,
      article_id: lot.article_id,
      article_nom: lot.article_nom || '',
      numero_lot: lot.numero_lot || '',
      quantite: String(lot.quantite),
      date_fabrication: lot.date_fabrication ? new Date(lot.date_fabrication) : new Date(),
      date_peremption: lot.date_peremption ? new Date(lot.date_peremption) : new Date(),
      boutique_id: lot.boutique_id || '',
    });
    loadLotBoutiques();
    setShowLotForm(true);
  };

  const saveLot = async () => {
    if (!lotForm.article_id) {
      Alert.alert('Erreur', 'Sélectionnez un article');
      return;
    }
    const qty = parseFloat(lotForm.quantite);
    if (!qty || qty <= 0) {
      Alert.alert('Erreur', 'Quantité invalide');
      return;
    }
    if (!lotForm.boutique_id) {
      Alert.alert('Erreur', 'Sélectionnez une boutique');
      return;
    }

    setLotSaving(true);
    try {
      const payload = {
        societe_id: societeId,
        article_id: lotForm.article_id,
        numero_lot: lotForm.numero_lot,
        quantite: qty,
        date_fabrication: formatDate(lotForm.date_fabrication),
        date_peremption: formatDate(lotForm.date_peremption),
        boutique_id: lotForm.boutique_id,
        utilisateur_id: user?.utilisateur_id,
      };

      let action = 'create_lot';
      if (lotFormMode === 'edit') {
        action = 'update_lot';
        payload.lot_id = lotForm.lot_id;
      }

      const json = await apiCall(STOCK_API_URL, { action, ...payload });
      if (json.success) {
        Alert.alert('Succès', json.message || 'Lot enregistré');
        setShowLotForm(false);
        loadLots();
        loadStocks();
        onChanged?.();
      } else {
        Alert.alert('Erreur', json.message || 'Échec');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLotSaving(false);
    }
  };

  const confirmDeleteLot = (lot) => {
    Alert.alert('Supprimer le lot', `Supprimer le lot "${lot.numero_lot || 'Sans numéro'}" pour "${lot.article_nom}" ?`, [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          try {
            const json = await apiCall(STOCK_API_URL, {
              action: 'delete_lot',
              societe_id: societeId,
              lot_id: lot.lot_id,
            });
            if (json.success) {
              Alert.alert('Succès', json.message);
              loadLots();
              loadStocks();
              onChanged?.();
            } else {
              Alert.alert('Erreur', json.message || 'Échec');
            }
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        },
      },
    ]);
  };

  const onLotDateChange = (event, selectedDate) => {
    setShowLotDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      if (lotDatePickerTarget === 'fabrication') {
        setLotForm({ ...lotForm, date_fabrication: selectedDate });
        if (selectedDate > lotForm.date_peremption) {
          setLotForm(prev => ({ ...prev, date_peremption: selectedDate }));
        }
      } else {
        setLotForm({ ...lotForm, date_peremption: selectedDate });
        if (selectedDate < lotForm.date_fabrication) {
          setLotForm(prev => ({ ...prev, date_fabrication: selectedDate }));
        }
      }
    }
  };

  // ==================== RENDU ====================
  const renderTabs = () => {
    const tabs = [
      { key: 'articles', label: 'Articles', icon: 'cube-outline' },
      { key: 'familles', label: 'Familles', icon: 'list-outline' },
      { key: 'unites', label: 'Unités', icon: 'scale-outline' },
      { key: 'stocks', label: 'Stocks', icon: 'stats-chart-outline' },
      { key: 'inventaires', label: 'Inventaires', icon: 'clipboard-outline' },
      { key: 'lots', label: 'Lots', icon: 'pricetag-outline' },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? '#075E54' : '#999'} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // ==================== ARTICLES ====================
  const renderArticles = () => (
    <View style={styles.tabContent}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un article..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={loadArticles}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchText(''); loadArticles(); }}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.addBtn} onPress={() => openCreate('article')}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Nouvel article</Text>
      </TouchableOpacity>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.article_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadArticles().finally(() => setRefreshing(false)); }} />}
        renderItem={({ item }) => {
          const isLow = (item.quantite || 0) <= (item.stock_alerte || 0);
          const isInactive = item.statut === 'inactif';
          return (
            <View style={[styles.card, isLow && styles.cardAlert, isInactive && styles.cardInactive]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, isInactive && styles.textInactive]}>{item.nom}</Text>
                <Text style={[styles.cardPrice, isInactive && styles.textInactive]}>{formatMoney(item.prix_vente)}</Text>
              </View>
              <Text style={styles.cardSub}>
                Code: {item.code_barre || 'N/A'} · {item.famille_nom || 'Non classé'}
                {item.type ? ` · ${item.type}` : ''}
              </Text>
              <View style={styles.cardBadges}>
                <View style={[styles.badge, styles.badgeAchat]}>
                  <Text style={styles.badgeText}>Achat: {formatMoney(item.prix_achat)}</Text>
                </View>
                <View style={[styles.badge, isLow ? styles.badgeAlert : styles.badgeStock]}>
                  <Text style={styles.badgeText}>Stock: {item.quantite || 0}</Text>
                </View>
                {isInactive && (
                  <View style={[styles.badge, { backgroundColor: '#e0e0e0' }]}>
                    <Text style={[styles.badgeText, { color: '#666' }]}>Inactif</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit('article', item)}>
                  <Text style={styles.actionEdit}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteArticle(item.article_id, item.nom)}>
                  <Text style={styles.actionDelete}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun article</Text>}
      />
    </View>
  );

  // ==================== FAMILLES ====================
  const renderFamilles = () => {
    const filteredFamilles = familles.filter(item =>
      item.nom.toLowerCase().includes(searchFamille.toLowerCase())
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une famille..."
            value={searchFamille}
            onChangeText={setSearchFamille}
          />
          {searchFamille.length > 0 && (
            <TouchableOpacity onPress={() => setSearchFamille('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => openCreate('famille')}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Nouvelle famille</Text>
        </TouchableOpacity>

        <FlatList
          data={filteredFamilles}
          keyExtractor={(item) => item.famille_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadFamilles().finally(() => setRefreshing(false)); }} />}
          renderItem={({ item }) => {
            const isInactive = item.statut === 'inactif';
            return (
              <View style={[styles.card, isInactive && styles.cardInactive]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, isInactive && styles.textInactive]}>{item.nom}</Text>
                  {isInactive && (
                    <View style={[styles.badge, { backgroundColor: '#e0e0e0' }]}>
                      <Text style={[styles.badgeText, { color: '#666' }]}>Inactif</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit('famille', item)}>
                    <Text style={styles.actionEdit}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteFamille(item.famille_id, item.nom)}>
                    <Text style={styles.actionDelete}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune famille trouvée</Text>}
        />
      </View>
    );
  };

  // ==================== UNITÉS ====================
  const renderUnites = () => {
    const filteredUnites = unites.filter(item =>
      item.nom.toLowerCase().includes(searchUnite.toLowerCase()) ||
      (item.abreviation && item.abreviation.toLowerCase().includes(searchUnite.toLowerCase()))
    );

    return (
      <View style={styles.tabContent}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une unité..."
            value={searchUnite}
            onChangeText={setSearchUnite}
          />
          {searchUnite.length > 0 && (
            <TouchableOpacity onPress={() => setSearchUnite('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => openCreate('unite')}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Nouvelle unité</Text>
        </TouchableOpacity>

        <FlatList
          data={filteredUnites}
          keyExtractor={(item) => item.unite_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadUnites().finally(() => setRefreshing(false)); }} />}
          renderItem={({ item }) => {
            const isInactive = item.statut === 'inactif';
            return (
              <View style={[styles.card, isInactive && styles.cardInactive]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, isInactive && styles.textInactive]}>{item.nom}</Text>
                  <Text style={[styles.cardSub, isInactive && styles.textInactive]}>{item.abreviation}</Text>
                </View>
                {isInactive && (
                  <View style={[styles.badge, { backgroundColor: '#e0e0e0', alignSelf: 'flex-start', marginTop: 4 }]}>
                    <Text style={[styles.badgeText, { color: '#666' }]}>Inactif</Text>
                  </View>
                )}
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEdit('unite', item)}>
                    <Text style={styles.actionEdit}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteUnite(item.unite_id, item.nom)}>
                    <Text style={styles.actionDelete}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune unité trouvée</Text>}
        />
      </View>
    );
  };

  // ==================== STOCKS ====================
  const renderStocks = () => {
    const getStockData = () => {
      if (stockTab === 'stock') return stocks;
      if (stockTab === 'mouvements') return mouvements;
      if (stockTab === 'alertes') return alertes;
      return stocks;
    };

    const data = getStockData();
    const totalStock = stocks.reduce((sum, s) => sum + (s.quantite || 0), 0);

    return (
      <View style={styles.tabContent}>
        <View style={styles.stockTabs}>
          {['stock', 'mouvements', 'alertes'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.stockTab, stockTab === tab && styles.stockTabActive]}
              onPress={() => setStockTab(tab)}
            >
              <Text style={[styles.stockTabText, stockTab === tab && styles.stockTabTextActive]}>
                {tab === 'stock' ? 'Stock' : tab === 'mouvements' ? 'Mouvements' : 'Alertes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {stockTab === 'stock' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnGreen]} onPress={() => openMouvementForm('entree_reception')}>
              <Ionicons name="arrow-down-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Entrée</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRed]} onPress={() => openMouvementForm('sortie_bl')}>
              <Ionicons name="arrow-up-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Sortie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnBlue]} onPress={() => openMouvementForm('transfert_sortie')}>
              <Ionicons name="swap-horizontal-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Transfert</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPurple]} onPress={() => openMouvementForm('ajustement_plus')}>
              <Ionicons name="add-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Ajust. +</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOrange]} onPress={() => openMouvementForm('ajustement_moins')}>
              <Ionicons name="remove-outline" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Ajust. -</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalStock}</Text>
            <Text style={styles.statLabel}>Total stock</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#DC3545' }]}>{alertes.length}</Text>
            <Text style={styles.statLabel}>Alertes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stocks.length}</Text>
            <Text style={styles.statLabel}>Articles</Text>
          </View>
        </View>

        {stockTab !== 'stock' && (
          <View style={styles.periodContainer}>
            <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('debut')}>
              <Text style={styles.dateLabel}>Du</Text>
              <Text style={styles.dateValue}>{formatDate(dateDebut)}</Text>
            </TouchableOpacity>
            <Text style={styles.dateSeparator}>au</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('fin')}>
              <Text style={styles.dateLabel}>Au</Text>
              <Text style={styles.dateValue}>{formatDate(dateFin)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {showPicker && (
          <DateTimePicker
            value={pickerTarget === 'debut' ? dateDebut : dateFin}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        <FlatList
          data={data}
          keyExtractor={(item) => item.stock_id || item.mouvement_id || item.article_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                if (stockTab === 'stock') loadStocks().finally(() => setRefreshing(false));
                else if (stockTab === 'mouvements') loadMouvements().finally(() => setRefreshing(false));
                else loadAlertes().finally(() => setRefreshing(false));
              }}
            />
          }
          renderItem={({ item }) => {
            if (stockTab === 'mouvements') {
              const isEntree = item.type === 'entrée' || item.type === 'entree' ||
                              item.type === 'entree_reception' || item.type === 'ajustement_plus' ||
                              item.type === 'transfert_entree' || item.type === 'retour_client';
              return (
                <View style={styles.mouvementCard}>
                  <View style={styles.mouvementIcon}>
                    <Ionicons name={isEntree ? 'arrow-down-circle' : 'arrow-up-circle'} size={28} color={isEntree ? '#25D366' : '#DC3545'} />
                  </View>
                  <View style={styles.mouvementInfo}>
                    <Text style={styles.mouvementArticle}>{item.article_nom}</Text>
                    <Text style={styles.mouvementDetails}>
                      {item.date?.substring(0, 16)} · {item.notes || '—'}
                    </Text>
                  </View>
                  <Text style={[styles.mouvementQty, isEntree ? styles.qtyPositive : styles.qtyNegative]}>
                    {isEntree ? '+' : '-'}{item.quantite}
                  </Text>
                </View>
              );
            }
            const isLow = (item.quantite || 0) <= (item.stock_alerte || 0);
            return (
              <View style={[styles.stockCard, isLow && styles.stockCardAlert]}>
                <View style={styles.stockHeader}>
                  <Text style={styles.stockName}>{item.article_nom || item.nom}</Text>
                  <Text style={[styles.stockQty, isLow && styles.stockQtyAlert]}>
                    {item.quantite || 0}
                  </Text>
                </View>
                <Text style={styles.stockRef}>{item.code_barre}</Text>
                {isLow && (
                  <Text style={styles.stockAlertText}>⚠ Alerte seuil: {item.stock_alerte || 0}</Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune donnée</Text>}
        />

        {/* Modal Mouvement de stock */}
        <Modal visible={showMvtForm} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
          <KeyboardAvoidingView style={styles.modalWrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mvtType === 'entree_reception' ? 'Entrée de stock' :
                 mvtType === 'sortie_bl' ? 'Sortie de stock' :
                 mvtType === 'transfert_sortie' ? 'Transfert de stock' :
                 mvtType === 'ajustement_plus' ? 'Ajustement +' :
                 mvtType === 'ajustement_moins' ? 'Ajustement -' : 'Mouvement de stock'}
              </Text>
              <TouchableOpacity onPress={() => setShowMvtForm(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalLabel}>Article *</Text>
              {selectedArticleMvt ? (
                <View style={[styles.selectedBox, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                  <Text style={{ fontWeight: '600', color: '#16a34a', flex: 1 }}>{selectedArticleMvt.nom}</Text>
                  <TouchableOpacity onPress={() => setSelectedArticleMvt(null)}>
                    <Text style={{ color: '#dc2626', fontSize: 18, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.selectBtn, { borderColor: '#e0e0e0', backgroundColor: '#fafafa' }]}
                  onPress={() => openArticleSelector('mouvement')}
                >
                  <Text style={{ color: '#075E54', fontWeight: '600' }}>🔍 Choisir un article</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.modalLabel}>Quantité *</Text>
              <TextInput
                style={styles.modalInput}
                value={quantiteMvt}
                onChangeText={setQuantiteMvt}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />

              {mvtType === 'transfert_sortie' && (
                <>
                  <Text style={styles.modalLabel}>Boutique destination *</Text>
                  {boutiques.filter(b => b.boutique_id !== boutiqueId).map((b) => (
                    <TouchableOpacity
                      key={b.boutique_id}
                      style={[styles.selectItem, boutiqueDest?.boutique_id === b.boutique_id && styles.selectItemActive]}
                      onPress={() => setBoutiqueDest(b)}
                    >
                      <Text style={{ color: '#333' }}>{b.nom}</Text>
                      {boutiqueDest?.boutique_id === b.boutique_id && (
                        <Ionicons name="checkmark-circle" size={20} color="#25D366" />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <Text style={styles.modalLabel}>Notes</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60, textAlignVertical: 'top' }]}
                value={notesMvt}
                onChangeText={setNotesMvt}
                placeholder="Motif du mouvement..."
                placeholderTextColor="#999"
                multiline
              />

              <TouchableOpacity
                style={[styles.modalSaveBtn, mvtSaving && styles.modalSaveBtnDisabled]}
                onPress={saveMouvement}
                disabled={mvtSaving}
              >
                {mvtSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  };

  // ==================== INVENTAIRES ====================
  const renderInventaires = () => {
    const filteredInventaires = inventaires.filter(item => {
      if (!searchInventaire) return true;
      const q = searchInventaire.toLowerCase();
      return (item.boutique_nom || '').toLowerCase().includes(q) ||
             (item.date_inventaire || '').includes(q);
    });

    const activeBoutique = boutiques.find(b => b.boutique_id === boutiqueId);

    return (
      <View style={styles.tabContent}>
        {!boutiqueId && boutiques.length > 0 && (
          <View style={[styles.boutiqueInfoContainer, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="warning-outline" size={16} color="#d97706" />
            <Text style={[styles.boutiqueInfoText, { color: '#d97706' }]}>
              Aucune boutique active sélectionnée
            </Text>
          </View>
        )}

        {boutiqueId && activeBoutique && (
          <View style={styles.boutiqueInfoContainer}>
            <Ionicons name="storefront-outline" size={16} color="#075E54" />
            <Text style={styles.boutiqueInfoText}>
              Boutique active: {activeBoutique.nom}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.addBtn, {
            backgroundColor: boutiqueId ? '#075E54' : '#999',
            opacity: boutiqueId ? 1 : 0.7
          }]}
          onPress={createInventaire}
          disabled={!boutiqueId || creatingInventaire}
        >
          {creatingInventaire ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.addBtnText}>
                Nouvel inventaire {activeBoutique ? `(${activeBoutique.nom})` : '(Aucune boutique)'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.filterRow}>
          <FlatList
            horizontal
            data={INVENTAIRE_FILTERS}
            keyExtractor={(item) => item.key || 'all'}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.filterChip, inventaireFilter === item.key && styles.filterChipActive]}
                onPress={() => setInventaireFilter(item.key)}
              >
                <Text style={[styles.filterChipText, inventaireFilter === item.key && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un inventaire..."
            value={searchInventaire}
            onChangeText={setSearchInventaire}
          />
          {searchInventaire.length > 0 && (
            <TouchableOpacity onPress={() => setSearchInventaire('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.periodContainer}>
          <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('debut')}>
            <Text style={styles.dateLabel}>Du</Text>
            <Text style={styles.dateValue}>{formatDate(dateDebut)}</Text>
          </TouchableOpacity>
          <Text style={styles.dateSeparator}>au</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('fin')}>
            <Text style={styles.dateLabel}>Au</Text>
            <Text style={styles.dateValue}>{formatDate(dateFin)}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredInventaires}
          keyExtractor={(item) => item.inventaire_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInventaires().finally(() => setRefreshing(false)); }} />}
          renderItem={({ item }) => {
            const isOpen = item.statut === 'en_cours';
            return (
              <TouchableOpacity
                style={[styles.inventaireCard, isOpen && styles.inventaireCardOpen]}
                onPress={() => openInventaireDetail(item)}
                activeOpacity={0.7}
              >
                <View style={styles.inventaireHeader}>
                  <Text style={styles.inventaireDate}>{item.date_inventaire || item.date}</Text>
                  <View style={[styles.inventaireStatus, isOpen ? styles.statusOpen : styles.statusClosed]}>
                    <Text style={styles.inventaireStatusText}>
                      {isOpen ? 'En cours' : item.statut === 'valide' ? 'Validé' : 'Annulé'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.inventaireBoutique}>{item.boutique_nom}</Text>
                <Text style={styles.inventaireDetails}>
                  {item.nb_lignes || 0} articles · {item.nb_ecarts ? `${item.nb_ecarts} écarts` : 'Aucun écart'}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun inventaire</Text>}
        />

        {/* Modal détail inventaire */}
        <Modal visible={showInventaireDetail} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
          <View style={styles.modalWrapper}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inventaire {currentInventaire?.date_inventaire || currentInventaire?.date}</Text>
              <TouchableOpacity onPress={() => setShowInventaireDetail(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.inventaireInfoBar}>
                <Text style={styles.inventaireInfoText}>{currentInventaire?.boutique_nom}</Text>
                <Text style={styles.inventaireInfoText}>
                  {inventaireLignes.filter(l => Math.abs(parseFloat(l.quantite_comptee || 0) - (l.quantite_theorique || 0)) > 0.01).length} écarts
                </Text>
              </View>

              <View style={{ flexDirection: 'row', paddingVertical: 8, gap: 8 }}>
                <TextInput
                  style={[styles.searchInputSmall, { flex: 1 }]}
                  placeholder="Rechercher article..."
                  placeholderTextColor="#999"
                  value={inventaireSearch}
                  onChangeText={setInventaireSearch}
                />
                <TouchableOpacity
                  style={[styles.filterChip, onlyEcarts && styles.filterChipActive]}
                  onPress={() => setOnlyEcarts(!onlyEcarts)}
                >
                  <Text style={[styles.filterChipText, onlyEcarts && styles.filterChipTextActive]}>Écarts</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={inventaireLignes.filter(l => {
                  if (onlyEcarts) {
                    const ecart = (parseFloat(l.quantite_comptee || 0) - (l.quantite_theorique || 0));
                    if (Math.abs(ecart) < 0.001) return false;
                  }
                  if (inventaireSearch) {
                    const q = inventaireSearch.toLowerCase();
                    return (l.article_nom || '').toLowerCase().includes(q);
                  }
                  return true;
                })}
                keyExtractor={(item) => item.ligne_inventaire_id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const theo = item.quantite_theorique || 0;
                  const comp = parseFloat(item.quantite_comptee || 0);
                  const ecart = comp - theo;
                  const hasEcart = Math.abs(ecart) > 0.01;
                  const editable = currentInventaire?.statut === 'en_cours';
                  return (
                    <View style={[styles.inventaireLigne, hasEcart && styles.inventaireLigneEcart]}>
                      <Text style={styles.inventaireLigneName}>{item.article_nom}</Text>
                      <View style={styles.inventaireLigneValues}>
                        <Text style={styles.inventaireLigneTheo}>Théo: {theo}</Text>
                        {editable ? (
                          <TextInput
                            style={styles.inventaireLigneInput}
                            value={String(item.quantite_comptee || '')}
                            onChangeText={(v) => updateInventaireLigne(item.ligne_inventaire_id, v)}
                            keyboardType="numeric"
                          />
                        ) : (
                          <Text style={styles.inventaireLigneTheo}>Compté: {comp}</Text>
                        )}
                        {hasEcart && (
                          <Text style={[styles.inventaireLigneEcartText, ecart > 0 ? styles.ecartPositif : styles.ecartNegatif]}>
                            {ecart > 0 ? '+' : ''}{ecart.toFixed(1)}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
              {currentInventaire?.statut === 'en_cours' && (
                <View style={styles.inventaireFooter}>
                  <TouchableOpacity style={[styles.inventaireBtn, styles.inventaireBtnCancel]} onPress={() => annulerInventaire(currentInventaire)}>
                    <Text style={styles.inventaireBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.inventaireBtn, styles.inventaireBtnSave]} onPress={saveInventaireLignes} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.inventaireBtnText}>Enregistrer</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.inventaireBtn, styles.inventaireBtnValidate]} onPress={validerInventaire} disabled={saving}>
                    <Text style={styles.inventaireBtnText}>Valider</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // ==================== LOTS ====================
  const renderLots = () => {
    const filteredLots = lots.filter(item => {
      if (!searchLot) return true;
      const q = searchLot.toLowerCase();
      return (item.article_nom || '').toLowerCase().includes(q) ||
             (item.numero_lot || '').toLowerCase().includes(q);
    });

    return (
      <View style={styles.tabContent}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un lot..."
            value={searchLot}
            onChangeText={setSearchLot}
          />
          {searchLot.length > 0 && (
            <TouchableOpacity onPress={() => setSearchLot('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openCreateLot}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Nouveau lot</Text>
        </TouchableOpacity>

        <FlatList
          data={filteredLots}
          keyExtractor={(item) => item.lot_id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLots().finally(() => setRefreshing(false)); }} />}
          renderItem={({ item }) => {
            const isExpired = item.date_peremption && new Date(item.date_peremption) < new Date();
            return (
              <View style={[styles.card, isExpired && styles.cardAlert]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.article_nom}</Text>
                  <Text style={[styles.cardPrice, { color: isExpired ? '#DC3545' : '#25D366' }]}>
                    {Number(item.quantite)}
                  </Text>
                </View>
                <Text style={styles.cardSub}>Lot: {item.numero_lot || '—'} · {item.boutique_nom || ''}</Text>
                {item.date_peremption && (
                  <Text style={{ color: isExpired ? '#DC3545' : '#d97706', fontSize: 11, marginTop: 2 }}>
                    {isExpired ? '⚠ EXPIRÉ' : '📅 Péremption'} : {item.date_peremption}
                  </Text>
                )}
                {item.date_fabrication && (
                  <Text style={{ color: '#999', fontSize: 10, marginTop: 1 }}>
                    Fabrication: {item.date_fabrication}
                  </Text>
                )}
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditLot(item)}>
                    <Text style={styles.actionEdit}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => confirmDeleteLot(item)}>
                    <Text style={styles.actionDelete}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucun lot trouvé</Text>}
        />

        {/* Modal Lot - Nouveau / Modifier */}
        <Modal visible={showLotForm} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
          <KeyboardAvoidingView style={styles.modalWrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {lotFormMode === 'create' ? 'Nouveau lot' : 'Modifier le lot'}
              </Text>
              <TouchableOpacity onPress={() => setShowLotForm(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalLabel}>Article *</Text>
              <TouchableOpacity
                style={[styles.selectBtn, { borderColor: '#e0e0e0', backgroundColor: '#fafafa' }]}
                onPress={() => openArticleSelector('lot')}
                disabled={lotFormMode === 'edit'}
              >
                <Text style={{ color: lotFormMode === 'edit' ? '#999' : '#075E54', fontWeight: '600' }}>
                  {lotForm.article_nom ? lotForm.article_nom : (lotFormMode === 'edit' ? '🔒 Article verrouillé' : '🔍 Choisir un article')}
                </Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Numéro de lot</Text>
              <TextInput
                style={styles.modalInput}
                value={lotForm.numero_lot}
                onChangeText={(text) => setLotForm({ ...lotForm, numero_lot: text })}
                placeholder="Ex: LOT-2026-001"
                placeholderTextColor="#999"
              />

              <Text style={styles.modalLabel}>Quantité *</Text>
              <TextInput
                style={styles.modalInput}
                value={lotForm.quantite}
                onChangeText={(text) => setLotForm({ ...lotForm, quantite: text })}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />

              <Text style={styles.modalLabel}>Date de fabrication</Text>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: '#e0e0e0', backgroundColor: '#fafafa' }]}
                onPress={() => { setLotDatePickerTarget('fabrication'); setShowLotDatePicker(true); }}
              >
                <Text style={{ color: '#333' }}>{formatDate(lotForm.date_fabrication)}</Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Date de péremption</Text>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: '#e0e0e0', backgroundColor: '#fafafa' }]}
                onPress={() => { setLotDatePickerTarget('peremption'); setShowLotDatePicker(true); }}
              >
                <Text style={{ color: '#333' }}>{formatDate(lotForm.date_peremption)}</Text>
              </TouchableOpacity>

              <Text style={styles.modalLabel}>Boutique *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {lotBoutiques.map((b) => (
                  <TouchableOpacity
                    key={b.boutique_id}
                    style={[styles.chip, lotForm.boutique_id === b.boutique_id && styles.chipActive]}
                    onPress={() => setLotForm({ ...lotForm, boutique_id: b.boutique_id })}
                  >
                    <Text style={{ fontSize: 12, color: lotForm.boutique_id === b.boutique_id ? '#fff' : '#666' }}>
                      {b.nom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {showLotDatePicker && (
                <DateTimePicker
                  value={lotDatePickerTarget === 'fabrication' ? lotForm.date_fabrication : lotForm.date_peremption}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onValueChange={onLotDateChange}
                  maximumDate={new Date()}
                  textColor="#333"
                />
              )}
              {Platform.OS === 'ios' && showLotDatePicker && (
                <TouchableOpacity style={styles.pickerDoneButton} onPress={() => setShowLotDatePicker(false)}>
                  <Text style={{ color: '#075E54', fontWeight: 'bold' }}>Terminé</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.modalSaveBtn, lotSaving && styles.modalSaveBtnDisabled]}
                onPress={saveLot}
                disabled={lotSaving}
              >
                {lotSaving ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.modalSaveBtnText}>
                    {lotFormMode === 'create' ? 'Créer le lot' : 'Mettre à jour'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 80 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  };

  // ==================== RENDU PRINCIPAL ====================
  if (loading && !articles.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#075E54" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTabs()}

      <View style={styles.content}>
        {activeTab === 'articles' && renderArticles()}
        {activeTab === 'familles' && renderFamilles()}
        {activeTab === 'unites' && renderUnites()}
        {activeTab === 'stocks' && renderStocks()}
        {activeTab === 'inventaires' && renderInventaires()}
        {activeTab === 'lots' && renderLots()}
      </View>

      {/* ============ MODAL FORMULAIRE (Article / Famille / Unité) ============ */}
      <Modal visible={showForm} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <KeyboardAvoidingView style={styles.modalWrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {formMode === 'create' ? 'Ajouter' : 'Modifier'} {formEntity === 'article' ? 'article' : formEntity === 'famille' ? 'famille' : 'unité'}
            </Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {formEntity === 'article' && (
              <>
                <Text style={styles.modalLabel}>Nom *</Text>
                <TextInput style={styles.modalInput} value={form.nom} onChangeText={(v) => setForm({ ...form, nom: v })} placeholder="Nom de l'article" placeholderTextColor="#999" />

                {/* Type */}
                <Text style={styles.modalLabel}>Type</Text>
                <View style={styles.modalRowChips}>
                  {TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, form.type === opt.value && styles.chipActive]}
                      onPress={() => setForm({ ...form, type: opt.value })}
                    >
                      <Text style={[styles.chipText, form.type === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Code-barres</Text>
                <TextInput style={styles.modalInput} value={form.code_barre} onChangeText={(v) => setForm({ ...form, code_barre: v })} placeholder="Code-barres" placeholderTextColor="#999" />

                <View style={styles.modalRow}>
                  <View style={styles.modalHalf}>
                    <Text style={styles.modalLabel}>Prix d'achat</Text>
                    <TextInput style={styles.modalInput} value={form.prix_achat} onChangeText={(v) => setForm({ ...form, prix_achat: v })} keyboardType="numeric" placeholder="0" placeholderTextColor="#999" />
                  </View>
                  <View style={styles.modalHalf}>
                    <Text style={styles.modalLabel}>Prix de vente</Text>
                    <TextInput style={styles.modalInput} value={form.prix_vente} onChangeText={(v) => setForm({ ...form, prix_vente: v })} keyboardType="numeric" placeholder="0" placeholderTextColor="#999" />
                  </View>
                </View>

                                {/* Restriction prix */}
                <Text style={styles.modalLabel}>Restriction de prix</Text>
                <View style={styles.modalRowChips}>
                  {RESTRICTION_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, form.restriction_prix === opt.value && styles.chipActive]}
                      onPress={() => setForm({ ...form, restriction_prix: opt.value })}
                    >
                      <Text style={[styles.chipText, form.restriction_prix === opt.value && styles.chipTextActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Seuil d'alerte stock</Text>
                <TextInput style={styles.modalInput} value={form.stock_alerte} onChangeText={(v) => setForm({ ...form, stock_alerte: v })} keyboardType="numeric" placeholder="0" placeholderTextColor="#999" />

                {familles.length > 0 && (
                  <>
                    <Text style={styles.modalLabel}>Famille</Text>
                    <View style={styles.modalRowChips}>
                      <TouchableOpacity
                        style={[styles.chip, !form.famille_id && styles.chipActive]}
                        onPress={() => setForm({ ...form, famille_id: '' })}
                      >
                        <Text style={[styles.chipText, !form.famille_id && styles.chipTextActive]}>Aucune</Text>
                      </TouchableOpacity>
                      {familles.map((f) => (
                        <TouchableOpacity
                          key={f.famille_id}
                          style={[styles.chip, form.famille_id === f.famille_id && styles.chipActive]}
                          onPress={() => setForm({ ...form, famille_id: f.famille_id })}
                        >
                          <Text style={[styles.chipText, form.famille_id === f.famille_id && styles.chipTextActive]}>
                            {f.nom}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.modalLabel}>Référence fournisseur</Text>
                <TextInput style={styles.modalInput} value={form.reference_fournisseur} onChangeText={(v) => setForm({ ...form, reference_fournisseur: v })} placeholder="Réf. fournisseur" placeholderTextColor="#999" />

                {/* Unité d'achat */}
                <Text style={styles.modalLabel}>Unité d'achat</Text>
                <View style={styles.modalRowChips}>
                  <TouchableOpacity
                    style={[styles.chip, !form.unite_achat_id && styles.chipActive]}
                    onPress={() => setForm({ ...form, unite_achat_id: '' })}
                  >
                    <Text style={[styles.chipText, !form.unite_achat_id && styles.chipTextActive]}>Aucune</Text>
                  </TouchableOpacity>
                  {unites.map((u) => (
                    <TouchableOpacity
                      key={u.unite_id}
                      style={[styles.chip, form.unite_achat_id === u.unite_id && styles.chipActive]}
                      onPress={() => setForm({ ...form, unite_achat_id: u.unite_id })}
                    >
                      <Text style={[styles.chipText, form.unite_achat_id === u.unite_id && styles.chipTextActive]}>
                        {u.nom}{u.abreviation ? ` (${u.abreviation})` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Unité de vente */}
                <Text style={styles.modalLabel}>Unité de vente</Text>
                <View style={styles.modalRowChips}>
                  <TouchableOpacity
                    style={[styles.chip, !form.unite_vente_id && styles.chipActive]}
                    onPress={() => setForm({ ...form, unite_vente_id: '' })}
                  >
                    <Text style={[styles.chipText, !form.unite_vente_id && styles.chipTextActive]}>Aucune</Text>
                  </TouchableOpacity>
                  {unites.map((u) => (
                    <TouchableOpacity
                      key={u.unite_id}
                      style={[styles.chip, form.unite_vente_id === u.unite_id && styles.chipActive]}
                      onPress={() => setForm({ ...form, unite_vente_id: u.unite_id })}
                    >
                      <Text style={[styles.chipText, form.unite_vente_id === u.unite_id && styles.chipTextActive]}>
                        {u.nom}{u.abreviation ? ` (${u.abreviation})` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Facteur de conversion (nb unités de vente pour 1 unité d'achat)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={form.facteur_conversion}
                  onChangeText={(v) => setForm({ ...form, facteur_conversion: v })}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#999"
                />


                {/* Description */}
                <Text style={styles.modalLabel}>Description</Text>
                <TextInput
                  style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                  placeholder="Description de l'article..."
                  placeholderTextColor="#999"
                  multiline
                />

                {/* Statut */}
                <Text style={styles.modalLabel}>Statut</Text>
                <View style={styles.modalRowChips}>
                  {STATUT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.chip,
                        form.statut === opt.value && { backgroundColor: opt.color },
                      ]}
                      onPress={() => setForm({ ...form, statut: opt.value })}
                    >
                      <Text style={[styles.chipText, form.statut === opt.value && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {formEntity === 'famille' && (
              <>
                <Text style={styles.modalLabel}>Nom *</Text>
                <TextInput style={styles.modalInput} value={form.nom} onChangeText={(v) => setForm({ ...form, nom: v })} placeholder="Nom de la famille" placeholderTextColor="#999" />

                <Text style={styles.modalLabel}>Statut</Text>
                <View style={styles.modalRowChips}>
                  {STATUT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, form.statut === opt.value && { backgroundColor: opt.color }]}
                      onPress={() => setForm({ ...form, statut: opt.value })}
                    >
                      <Text style={[styles.chipText, form.statut === opt.value && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {formEntity === 'unite' && (
              <>
                <Text style={styles.modalLabel}>Nom *</Text>
                <TextInput style={styles.modalInput} value={form.nom} onChangeText={(v) => setForm({ ...form, nom: v })} placeholder="Pièce, Carton, Kg..." placeholderTextColor="#999" />

                <Text style={styles.modalLabel}>Abréviation</Text>
                <TextInput style={styles.modalInput} value={form.abreviation} onChangeText={(v) => setForm({ ...form, abreviation: v })} placeholder="pcs, ctn, kg..." placeholderTextColor="#999" />

                <Text style={styles.modalLabel}>Statut</Text>
                <View style={styles.modalRowChips}>
                  {STATUT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, form.statut === opt.value && { backgroundColor: opt.color }]}
                      onPress={() => setForm({ ...form, statut: opt.value })}
                    >
                      <Text style={[styles.chipText, form.statut === opt.value && styles.chipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Espace avant le bouton */}
            <View style={{ height: 20 }} />

            <TouchableOpacity style={[styles.modalSaveBtn, saving && styles.modalSaveBtnDisabled]} onPress={saveForm} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveBtnText}>{formMode === 'create' ? 'Créer' : 'Enregistrer'}</Text>}
            </TouchableOpacity>

            {/* Espace final pour scroller au-delà du bouton */}
            <View style={{ height: 80 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ============ MODAL SÉLECTION ARTICLE (partagé mouvement/lot) ============ */}
      <Modal visible={showArticleModal} animationType="slide" statusBarTranslucent={true}
  navigationBarTranslucent={true}>
        <View style={styles.modalWrapper}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choisir un article</Text>
            <TouchableOpacity onPress={() => setShowArticleModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, padding: 16 }}>
            <TextInput
              style={styles.modalInput}
              placeholder="Rechercher par nom ou code-barre..."
              placeholderTextColor="#999"
              value={articleSearch}
              onChangeText={(text) => {
                setArticleSearch(text);
                const filtered = articles.filter(a =>
                  a.nom.toLowerCase().includes(text.toLowerCase()) ||
                  (a.code_barre && a.code_barre.toLowerCase().includes(text.toLowerCase()))
                );
                setFilteredArticles(filtered);
              }}
              autoFocus
            />
            <FlatList
              data={filteredArticles}
              keyExtractor={(item) => item.article_id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.selectItem}
                  onPress={() => selectArticleFromModal(item)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', fontSize: 14, color: '#333' }}>{item.nom}</Text>
                    <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                      Code: {item.code_barre || 'N/A'} · Stock: {item.quantite || 0}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#999' }}>Aucun article trouvé</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1 },
  tabContent: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { color: '#075E54', marginTop: 12, fontSize: 16 },

  // Tabs
  tabsScroll: {
    backgroundColor: '#fff',
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 40,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 1,
    borderRadius: 6,
    backgroundColor: 'transparent',
    gap: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#E8F5E9',
    borderBottomColor: '#075E54',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    margin: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    marginLeft: 6,
    paddingVertical: 4,
  },
  searchInputSmall: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: '#fff',
  },

  // Add button
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#075E54',
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 6,
    gap: 4,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  // List
  listContent: {
    padding: 10,
    paddingBottom: 30,
  },

  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  cardInactive: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#075E54',
  },
  cardSub: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  cardBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeAchat: {
    backgroundColor: '#f0f0f0',
  },
  badgeStock: {
    backgroundColor: '#E8F5E9',
  },
  badgeAlert: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: 10,
    color: '#333',
  },
  textInactive: {
    color: '#999',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionEdit: {
    color: '#075E54',
    fontWeight: '600',
    fontSize: 12,
  },
  actionDelete: {
    color: '#DC3545',
    fontWeight: '600',
    fontSize: 12,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginVertical: 6,
    gap: 6,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#075E54',
  },
  statLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnGreen: {
    backgroundColor: '#25D366',
  },
  actionBtnRed: {
    backgroundColor: '#DC3545',
  },
  actionBtnBlue: {
    backgroundColor: '#34B7F1',
  },
  actionBtnPurple: {
    backgroundColor: '#7C3AED',
  },
  actionBtnOrange: {
    backgroundColor: '#F59E0B',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  // Filter row
  filterRow: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#075E54',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },

  // Boutique info
  boutiqueInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    marginHorizontal: 10,
    marginBottom: 6,
    gap: 6,
  },
  boutiqueInfoText: {
    fontSize: 12,
    color: '#075E54',
    fontWeight: '500',
  },

  // Period
  periodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  dateLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#075E54',
  },
  dateSeparator: {
    color: '#999',
    fontWeight: '600',
    marginHorizontal: 6,
  },

  // Stock card
  stockCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
  },
  stockCardAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC3545',
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  stockQty: {
    fontSize: 14,
    fontWeight: '800',
    color: '#25D366',
  },
  stockQtyAlert: {
    color: '#DC3545',
  },
  stockRef: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  stockAlertText: {
    color: '#DC3545',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // Mouvement card
  mouvementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
  },
  mouvementIcon: {
    marginRight: 10,
  },
  mouvementInfo: {
    flex: 1,
  },
  mouvementArticle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  mouvementDetails: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  mouvementQty: {
    fontSize: 14,
    fontWeight: '700',
  },
  qtyPositive: {
    color: '#25D366',
  },
  qtyNegative: {
    color: '#DC3545',
  },

  // Stock tabs
  stockTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stockTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  stockTabActive: {
    borderBottomColor: '#075E54',
  },
  stockTabText: {
    fontSize: 12,
    color: '#999',
  },
  stockTabTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },

  // Select item
  selectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectItemActive: {
    backgroundColor: '#f0f7ff',
  },

  // Selected box
  selectedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  selectBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  // Date input
  dateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
    justifyContent: 'center',
  },
  pickerDoneButton: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Inventaire
  inventaireCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
  },
  inventaireCardOpen: {
    borderWidth: 2,
    borderColor: '#25D366',
  },
  inventaireHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventaireDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  inventaireStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusOpen: {
    backgroundColor: '#E8F5E9',
  },
  statusClosed: {
    backgroundColor: '#f5f5f5',
  },
  inventaireStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#333',
  },
  inventaireBoutique: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  inventaireDetails: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },

  // Modal
  modalWrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 14,
    paddingBottom: 100,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12, backgroundColor: '#075E54'
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold', color: '#fff'
  },
  modalBody: {
    padding: 14,
    paddingBottom: 100,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  modalRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalHalf: {
    flex: 1,
  },
  modalRowChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  chipActive: {
    backgroundColor: '#075E54',
  },
  chipText: {
    fontSize: 12,
    color: '#666',
  },
  chipTextActive: {
    color: '#fff',
  },
  modalSaveBtn: {
    backgroundColor: '#075E54',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSaveBtnDisabled: {
    opacity: 0.7,
  },
  modalSaveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Inventaire lignes
  inventaireInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 10,
  },
  inventaireInfoText: {
    fontSize: 13,
    color: '#666',
  },
  inventaireLigne: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inventaireLigneEcart: {
    borderColor: '#FF9500',
    borderWidth: 2,
  },
  inventaireLigneName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inventaireLigneValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inventaireLigneTheo: {
    fontSize: 12,
    color: '#666',
    minWidth: 60,
  },
  inventaireLigneInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    minWidth: 50,
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  inventaireLigneEcartText: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 35,
    textAlign: 'center',
  },
  ecartPositif: {
    color: '#25D366',
  },
  ecartNegatif: {
    color: '#DC3545',
  },

  // Inventaire footer
  inventaireFooter: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 6,
  },
  inventaireBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  inventaireBtnCancel: {
    backgroundColor: '#6b7280',
  },
  inventaireBtnSave: {
    backgroundColor: '#075E54',
  },
  inventaireBtnValidate: {
    backgroundColor: '#25D366',
  },
  inventaireBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginTop: 20,
  },
});