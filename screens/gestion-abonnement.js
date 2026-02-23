import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

// Constantes
const API_BASE_URL = 'https://rouah.net/api/gestion-abonnement.php';
const TYPES_ABONNEMENT = ['Standard', 'Special', 'Social'];
const STATUTS_ABONNEMENT = ['actif', 'expire', 'suspendu'];
const ETATS_ABONNEMENT = ['En ligne', 'Hors ligne'];
const MODES_REGLEMENT = ['Espèce', 'Virement bancaire', 'Carte bancaire', 'Wave', 'Orange money', 'MTN money', 'Moov money'];
const NIVEAUX = [
  'Collèges', 'Lycées', 'BTS', 'Licences', 'Masters', 'Concours', 'Examens', 'Certifications', 'Stages'
];

export default function GestionAbonnement({ navigation }) {
  // États principaux
  const [mode, setMode] = useState('list');
  const [abonnementsList, setAbonnementsList] = useState([]);
  const [filteredAbonnements, setFilteredAbonnements] = useState([]);
  const [currentAbonnement, setCurrentAbonnement] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  const [categories, setCategories] = useState([]);
  const [niveauxDisponibles, setNiveauxDisponibles] = useState([]);
  const [categorieSelected, setCategorieSelected] = useState('');
  const [showCategorieModal, setShowCategorieModal] = useState(false);
  const [loadingNiveaux, setLoadingNiveaux] = useState(false);
  
  // États pour les sélections
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [typesAbonnement, setTypesAbonnement] = useState([]);
  
  // États pour les champs du formulaire
  const [code, setCode] = useState('');
  const [utilisateurId, setUtilisateurId] = useState('');
  const [nomPrenom, setNomPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('Standard');
  const [niveau, setNiveau] = useState('');
  const [montant, setMontant] = useState('');
  const [dateDebut, setDateDebut] = useState(new Date());
  const [dateExpiration, setDateExpiration] = useState(new Date());
  const [statut, setStatut] = useState('actif');
  const [etat, setEtat] = useState('En ligne');
  const [modeReglement, setModeReglement] = useState('Wave');
  const [numeroReglement, setNumeroReglement] = useState('');
  const [referenceReglement, setReferenceReglement] = useState('');
  
  // États pour les modals
  const [showUtilisateurModal, setShowUtilisateurModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showNiveauModal, setShowNiveauModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [showEtatModal, setShowEtatModal] = useState(false);
  const [showModeReglementModal, setShowModeReglementModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState('debut');
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour la recherche et filtres
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterEtat, setFilterEtat] = useState('');
  const [filterPeriode, setFilterPeriode] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (mode === 'list') {
      loadAbonnements();
      loadStatistiques();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && currentAbonnement) {
      loadAbonnementForEdit();
    }
  }, [mode, currentAbonnement]);

  useEffect(() => {
    const typeInfo = typesAbonnement.find(t => t.type === type);
    if (typeInfo) {
      setMontant(typeInfo.montant);
      
      if (dateDebut) {
        const newDate = new Date(dateDebut);
        newDate.setDate(newDate.getDate() + parseInt(typeInfo.duree));
        setDateExpiration(newDate);
      }
    }
  }, [type, typesAbonnement]);

  // ============ FONCTIONS DE CHARGEMENT ============
  
  const loadInitialData = async () => {
    try {
        await Promise.all([
            loadUtilisateurs(),
            loadTypesAbonnement(),
            loadCategories(),
            generateCode()
        ]);
    } catch (error) {
        console.error("Erreur chargement initial:", error);
        Alert.alert("Erreur", "Impossible de charger les données");
    }
  };
  
  const loadCategories = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_categories`);
        const data = await response.json();
        if (data.success) {
            setCategories(data.categories);
        }
    } catch (error) {
        console.error("Erreur chargement catégories:", error);
    }
  };

  const loadNiveauxByCategorie = async (categorie) => {
    setLoadingNiveaux(true);
    try {
        const response = await fetch(`${API_BASE_URL}?action=get_niveaux_by_categorie&categorie=${encodeURIComponent(categorie)}`);
        const data = await response.json();
        if (data.success) {
            setNiveauxDisponibles(data.niveaux);
            setShowNiveauModal(true);
        }
    } catch (error) {
        console.error("Erreur chargement niveaux:", error);
    } finally {
        setLoadingNiveaux(false);
    }
  };

  const loadAbonnements = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_abonnements`);
      const data = await response.json();
      if (data.success) {
        setAbonnementsList(data.abonnements);
        setFilteredAbonnements(data.abonnements);
      }
    } catch (error) {
      console.error("Erreur chargement abonnements:", error);
      Alert.alert("Erreur", "Impossible de charger la liste des abonnements");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStatistiques = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_statistiques`);
      const data = await response.json();
      if (data.success) {
        setStatistiques(data.statistiques);
      }
    } catch (error) {
      console.error("Erreur chargement statistiques:", error);
    }
  };

  const loadAbonnementById = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_abonnement_by_id&id=${id}`);
      const data = await response.json();
      if (data.success) {
        setCurrentAbonnement(data.abonnement);
        setMode('view');
      } else {
        Alert.alert("Erreur", data.error || "Abonnement non trouvé");
      }
    } catch (error) {
      console.error("Erreur chargement abonnement:", error);
      Alert.alert("Erreur", "Impossible de charger l'abonnement");
    } finally {
      setLoading(false);
    }
  };

  const loadUtilisateurs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_utilisateurs`);
      const data = await response.json();
      if (data.success) {
        setUtilisateurs(data.utilisateurs);
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
    }
  };

  const loadTypesAbonnement = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_types_abonnement`);
      const data = await response.json();
      if (data.success) {
        setTypesAbonnement(data.types);
      }
    } catch (error) {
      console.error("Erreur chargement types:", error);
    }
  };

  const loadAbonnementForEdit = async () => {
    try {
      setCode(currentAbonnement.code || '');
      setUtilisateurId(currentAbonnement.utilisateur_id || '');
      setNomPrenom(currentAbonnement.nom_prenom || '');
      setTelephone(currentAbonnement.telephone || '');
      setEmail(currentAbonnement.email || '');
      setType(currentAbonnement.type || 'Standard');
      setNiveau(currentAbonnement.niveau || '');
      setMontant(currentAbonnement.montant || '');
      setDateDebut(new Date(currentAbonnement.date_debut));
      setDateExpiration(new Date(currentAbonnement.date_expiration));
      setStatut(currentAbonnement.statut || 'actif');
      setEtat(currentAbonnement.etat || 'En ligne');
    } catch (error) {
      console.error("Erreur préparation édition:", error);
    }
  };

  const loadAbonnementsExpirant = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_abonnements_expirant&jours=7`);
      const data = await response.json();
      if (data.success) {
        setFilteredAbonnements(data.abonnements);
      }
    } catch (error) {
      console.error("Erreur chargement abonnements expirant:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchAbonnements = async (keyword) => {
    if (!keyword.trim()) {
      setFilteredAbonnements(abonnementsList);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=search_abonnements&keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      if (data.success) {
        setFilteredAbonnements(data.abonnements);
      }
    } catch (error) {
      console.error("Erreur recherche:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}?action=generate_code`);
      const data = await response.json();
      if (data.success) {
        setCode(data.code);
      }
    } catch (error) {
      console.error("Erreur génération code:", error);
    }
  };

  // ============ FONCTIONS CRUD ============
  
  const validateForm = () => {
    if (!type) {
      Alert.alert("Erreur", "Veuillez sélectionner un type d'abonnement");
      return false;
    }
    if (!niveau) {
      Alert.alert("Erreur", "Veuillez sélectionner un niveau");
      return false;
    }
    if (!dateDebut) {
      Alert.alert("Erreur", "Veuillez sélectionner une date de début");
      return false;
    }
    if (!dateExpiration) {
      Alert.alert("Erreur", "Veuillez sélectionner une date d'expiration");
      return false;
    }
    if (!nomPrenom.trim() && !utilisateurId) {
      Alert.alert("Erreur", "Veuillez saisir le nom de l'abonné ou sélectionner un utilisateur");
      return false;
    }
    return true;
  };

  const ajouterAbonnement = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    const abonnementData = {
      action: 'ajouter_abonnement',
      code: code,
      utilisateur_id: utilisateurId || null,
      nom_prenom: nomPrenom,
      telephone: telephone,
      email: email,
      type: type,
      niveau: niveau,
      montant: montant,
      date_debut: dateDebut.toISOString().split('T')[0],
      date_expiration: dateExpiration.toISOString().split('T')[0],
      statut: statut,
      etat: etat
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(abonnementData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Abonnement ajouté avec succès");
        resetForm();
        setMode('list');
        loadAbonnements();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      Alert.alert("Erreur", error.message || "Impossible d'ajouter l'abonnement");
    } finally {
      setSubmitting(false);
    }
  };

  const modifierAbonnement = async () => {
    if (!validateForm()) return;
    if (!currentAbonnement?.id) return;
    
    setSubmitting(true);
    
    const abonnementData = {
      action: 'modifier_abonnement',
      id: currentAbonnement.id,
      code: code,
      utilisateur_id: utilisateurId || null,
      nom_prenom: nomPrenom,
      telephone: telephone,
      email: email,
      type: type,
      niveau: niveau,
      montant: montant,
      date_debut: dateDebut.toISOString().split('T')[0],
      date_expiration: dateExpiration.toISOString().split('T')[0],
      statut: statut,
      etat: etat
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(abonnementData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Abonnement modifié avec succès");
        resetForm();
        setMode('list');
        loadAbonnements();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la modification");
      }
    } catch (error) {
      console.error("Erreur modification:", error);
      Alert.alert("Erreur", error.message || "Impossible de modifier l'abonnement");
    } finally {
      setSubmitting(false);
    }
  };

  const renouvelerAbonnement = async (id) => {
    Alert.alert(
      "Renouveler",
      "Voulez-vous renouveler cet abonnement pour 30 jours supplémentaires ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Renouveler",
          onPress: async () => {
            setSubmitting(true);
            try {
              const response = await fetch(API_BASE_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'renouveler_abonnement',
                  id: id,
                  duree: 30
                })
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert("Succès", "Abonnement renouvelé avec succès");
                loadAbonnements();
                loadStatistiques();
                if (mode === 'view') {
                  loadAbonnementById(id);
                }
              } else {
                throw new Error(data.error || "Erreur lors du renouvellement");
              }
            } catch (error) {
              console.error("Erreur renouvellement:", error);
              Alert.alert("Erreur", error.message || "Impossible de renouveler l'abonnement");
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const supprimerAbonnement = async (id) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=supprimer_abonnement&id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Abonnement supprimé avec succès");
        setShowDeleteModal(false);
        if (mode === 'view') {
          setMode('list');
        }
        loadAbonnements();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      Alert.alert("Erreur", error.message || "Impossible de supprimer l'abonnement");
    } finally {
      setSubmitting(false);
    }
  };

  // ============ FONCTIONS UTILITAIRES ============
  
  const resetForm = () => {
    setUtilisateurId('');
    setNomPrenom('');
    setTelephone('');
    setEmail('');
    setType('Standard');
    setCategorieSelected('');
    setNiveau('');
    setMontant('');
    setDateDebut(new Date());
    setDateExpiration(new Date());
    setStatut('actif');
    setEtat('En ligne');
    setModeReglement('Wave');
    setNumeroReglement('');
    setReferenceReglement('');
    generateCode();
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setFilterType('');
    setFilterStatut('');
    setFilterEtat('');
    setFilterPeriode('');
    setFilteredAbonnements(abonnementsList);
  };

  const applyFilters = () => {
    let filtered = [...abonnementsList];
    
    if (searchKeyword) {
      filtered = filtered.filter(a => 
        a.code?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        a.nom_prenom?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        a.telephone?.includes(searchKeyword) ||
        a.email?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    if (filterType) {
      filtered = filtered.filter(a => a.type === filterType);
    }
    
    if (filterStatut) {
      filtered = filtered.filter(a => a.statut === filterStatut);
    }
    
    if (filterEtat) {
      filtered = filtered.filter(a => a.etat === filterEtat);
    }
    
    if (filterPeriode === 'aujourdhui') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(a => a.date_debut === today);
    } else if (filterPeriode === 'semaine') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(a => new Date(a.date_debut) >= weekAgo);
    } else if (filterPeriode === 'mois') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(a => new Date(a.date_debut) >= monthAgo);
    }
    
    setFilteredAbonnements(filtered);
    setShowFilterModal(false);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      if (datePickerMode === 'debut') {
        setDateDebut(selectedDate);
        const typeInfo = typesAbonnement.find(t => t.type === type);
        if (typeInfo) {
          const newDate = new Date(selectedDate);
          newDate.setDate(newDate.getDate() + parseInt(typeInfo.duree));
          setDateExpiration(newDate);
        }
      } else {
        setDateExpiration(selectedDate);
      }
    }
  };

  const selectUtilisateur = (utilisateur) => {
    setUtilisateurId(utilisateur.utilisateur_id);
    setNomPrenom(utilisateur.nom_prenom);
    setTelephone(utilisateur.telephone || '');
    setEmail(utilisateur.email || '');
    setShowUtilisateurModal(false);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatMontant = (montant) => {
    if (!montant) return '0 FCFA';
    return parseInt(montant).toLocaleString('fr-FR') + ' FCFA';
  };

  const getStatutColor = (statut) => {
    switch(statut) {
      case 'actif': return '#27ae60';
      case 'expire': return '#e74c3c';
      case 'suspendu': return '#f39c12';
      default: return '#7f8c8d';
    }
  };

  const getStatutLabel = (statut) => {
    switch(statut) {
      case 'actif': return 'Actif';
      case 'expire': return 'Expiré';
      case 'suspendu': return 'Suspendu';
      default: return statut;
    }
  };

  const getEtatColor = (etat) => {
    switch(etat) {
      case 'En ligne': return '#27ae60';
      case 'Hors ligne': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'Standard': return '#3498db';
      case 'Special': return '#9b59b6';
      case 'Social': return '#e67e22';
      default: return '#7f8c8d';
    }
  };

  const getJoursRestantsColor = (jours) => {
    if (jours < 0) return '#e74c3c';
    if (jours <= 7) return '#f39c12';
    return '#27ae60';
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAbonnements();
    loadStatistiques();
  };

  // ============ RENDU DES MODALS ============
  
  const renderSelectionModal = (visible, onClose, title, items, onSelect, renderItem) => (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalList}>
            {items.length === 0 ? (
              <Text style={styles.modalEmptyText}>Aucun élément disponible</Text>
            ) : (
              items.map((item, index) => renderItem(item, index, onSelect))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // ============ RENDU DES SÉLECTEURS ============
  
  const renderUtilisateurSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>👤 Utilisateur (optionnel)</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowUtilisateurModal(true)}
      >
        <Text style={styles.selectorButtonText}>
          {utilisateurId ? nomPrenom : "Sélectionner un utilisateur"}
        </Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>📦 Type d'abonnement</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowTypeModal(true)}
      >
        <View style={styles.selectorButtonLeft}>
          <View style={[styles.typeDot, { backgroundColor: getTypeColor(type) }]} />
          <Text style={styles.selectorButtonText}>{type}</Text>
        </View>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNiveauSelector = () => (
    <View style={styles.selectorSection}>
        <Text style={styles.selectorLabel}>🎓 Catégorie / Niveau</Text>
        <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowCategorieModal(true)}
        >
            <Text style={styles.selectorButtonText}>
                {categorieSelected ? `${categorieSelected} > ${niveau || 'Sélectionner'}` : "Sélectionner une catégorie"}
            </Text>
            <Text style={styles.selectorButtonIcon}>▼</Text>
        </TouchableOpacity>
    </View>
  );

  const renderStatutSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>⚙️ Statut</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowStatutModal(true)}
      >
        <View style={styles.selectorButtonLeft}>
          <View style={[styles.statutDot, { backgroundColor: getStatutColor(statut) }]} />
          <Text style={styles.selectorButtonText}>
            {getStatutLabel(statut)}
          </Text>
        </View>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEtatSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>🌐 État</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowEtatModal(true)}
      >
        <View style={styles.selectorButtonLeft}>
          <View style={[styles.etatDot, { backgroundColor: getEtatColor(etat) }]} />
          <Text style={styles.selectorButtonText}>{etat}</Text>
        </View>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModeReglementSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>💳 Mode de règlement</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowModeReglementModal(true)}
      >
        <Text style={styles.selectorButtonText}>{modeReglement}</Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  // ============ RENDU DES ÉCRANS ============
  
  const renderHeader = () => {
    let title = "🎫 Gestion des abonnements";
    let subtitle = "";
    
    if (mode === 'add') {
      title = "➕ Ajouter un abonnement";
      subtitle = "Remplissez les informations de l'abonnement";
    } else if (mode === 'edit') {
      title = "✏️ Modifier l'abonnement";
      subtitle = "Modifiez les informations de l'abonnement";
    } else if (mode === 'view') {
      title = "📄 Détail de l'abonnement";
      subtitle = currentAbonnement?.code || "";
    }
    
    return (
      <View style={styles.header}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.headerTop}>
          {mode !== 'list' && (
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                resetForm();
                setMode('list');
              }}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{title}</Text>
          {mode === 'list' && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => {
                resetForm();
                setMode('add');
              }}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          )}
          {mode === 'list' && !mode.startsWith('add') && (
            <View style={styles.headerRight} />
          )}
        </View>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
    );
  };

  const renderStats = () => {
    if (!statistiques) return null;
    
    return (
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <LinearGradient
            colors={['#3498db', '#2980b9']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{statistiques.total || 0}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#27ae60', '#229954']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{statistiques.actifs || 0}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#f39c12', '#e67e22']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{statistiques.expirant_bientot || 0}</Text>
            <Text style={styles.statLabel}>Expirant bientôt</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#e74c3c', '#c0392b']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{statistiques.expires || 0}</Text>
            <Text style={styles.statLabel}>Expirés</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#9b59b6', '#8e44ad']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{statistiques.revenus_mois_formate}</Text>
            <Text style={styles.statLabel}>Revenus mois</Text>
          </LinearGradient>
        </ScrollView>
      </View>
    );
  };

  const renderListMode = () => (
    <>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={searchKeyword}
            onChangeText={(text) => {
              setSearchKeyword(text);
              searchAbonnements(text);
            }}
            placeholder="Rechercher un abonnement..."
            placeholderTextColor="#95a5a6"
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => {
              setSearchKeyword('');
              setFilteredAbonnements(abonnementsList);
            }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.expiringButton}
          onPress={loadAbonnementsExpirant}
        >
          <Text style={styles.expiringIcon}>⏰</Text>
        </TouchableOpacity>
      </View>

      {/* Statistiques */}
      {renderStats()}

      {/* Liste des abonnements */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des abonnements...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredAbonnements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎫</Text>
              <Text style={styles.emptyTitle}>Aucun abonnement trouvé</Text>
              <Text style={styles.emptyText}>
                {abonnementsList.length === 0 
                  ? "Commencez par ajouter votre premier abonnement"
                  : "Aucun abonnement ne correspond à votre recherche"}
              </Text>
            </View>
          ) : (
            filteredAbonnements.map((abonnement) => (
              <TouchableOpacity
                key={abonnement.id}
                style={styles.abonnementCard}
                onPress={() => loadAbonnementById(abonnement.id)}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor(abonnement.type) }]}>
                    <Text style={styles.typeBadgeText}>{abonnement.type}</Text>
                  </View>
                  <View style={styles.cardHeaderRight}>
                    <View style={[styles.etatBadge, { backgroundColor: getEtatColor(abonnement.etat) }]}>
                      <Text style={styles.etatBadgeText}>{abonnement.etat}</Text>
                    </View>
                    <View style={[styles.statutBadge, { backgroundColor: getStatutColor(abonnement.statut) }]}>
                      <Text style={styles.statutBadgeText}>
                        {getStatutLabel(abonnement.statut)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.abonneNom} numberOfLines={1}>
                    {abonnement.nom_prenom || 'Anonyme'}
                  </Text>
                  <Text style={styles.abonnementCode}>{abonnement.code}</Text>
                  
                  <View style={styles.abonnementInfos}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>🎓</Text>
                      <Text style={styles.infoText}>{abonnement.niveau}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>💰</Text>
                      <Text style={styles.infoText}>{abonnement.montant_formate}</Text>
                    </View>
                  </View>

                  <View style={styles.datesContainer}>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>Début</Text>
                      <Text style={styles.dateValue}>{abonnement.date_debut_formate}</Text>
                    </View>
                    <View style={styles.dateSeparator}>
                      <Text style={styles.dateSeparatorText}>→</Text>
                    </View>
                    <View style={styles.dateItem}>
                      <Text style={styles.dateLabel}>Expiration</Text>
                      <Text style={[
                        styles.dateValue,
                        { color: getJoursRestantsColor(abonnement.jours_restants) }
                      ]}>
                        {abonnement.date_expiration_formate}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.joursRestants}>
                      <View style={[styles.joursRestantsDot, { backgroundColor: getJoursRestantsColor(abonnement.jours_restants) }]} />
                      <Text style={styles.joursRestantsText}>
                        {abonnement.jours_restants > 0 
                          ? `${abonnement.jours_restants} jours restants`
                          : abonnement.jours_restants === 0
                            ? "Expire aujourd'hui"
                            : "Expiré"}
                      </Text>
                    </View>
                    {abonnement.telephone ? (
                      <Text style={styles.contactInfo}>{abonnement.telephone}</Text>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </>
  );

  const renderFormMode = () => (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Code */}
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>🔑 Code de l'abonnement</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{code}</Text>
            <TouchableOpacity onPress={generateCode} style={styles.codeRefresh}>
              <Text style={styles.codeRefreshText}>🔄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Abonné */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>👤 Informations de l'abonné</Text>
          
          {renderUtilisateurSelector()}
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={nomPrenom}
              onChangeText={setNomPrenom}
              placeholder="Nom et prénom de l'abonné"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={telephone}
                onChangeText={setTelephone}
                placeholder="Numéro de téléphone"
                placeholderTextColor="#95a5a6"
                keyboardType="phone-pad"
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Adresse email"
                placeholderTextColor="#95a5a6"
                keyboardType="email-address"
              />
            </View>
          </View>
        </View>

        {/* Section Abonnement */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📦 Détails de l'abonnement</Text>
          
          {renderTypeSelector()}
          {renderNiveauSelector()}
          {renderStatutSelector()}
          {renderEtatSelector()}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Montant</Text>
            <TextInput
              style={styles.input}
              value={montant}
              onChangeText={setMontant}
              placeholder="Montant de l'abonnement"
              placeholderTextColor="#95a5a6"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Date de début</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerMode('debut');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>{formatDate(dateDebut)}</Text>
                <Text style={styles.dateButtonIcon}>📅</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Date d'expiration</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setDatePickerMode('expiration');
                  setShowDatePicker(true);
                }}
              >
                <Text style={styles.dateButtonText}>{formatDate(dateExpiration)}</Text>
                <Text style={styles.dateButtonIcon}>📅</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Section Paiement */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>💰 Informations de paiement</Text>
          
          {renderModeReglementSelector()}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Numéro de règlement</Text>
            <TextInput
              style={styles.input}
              value={numeroReglement}
              onChangeText={setNumeroReglement}
              placeholder="Numéro de transaction"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Référence</Text>
            <TextInput
              style={styles.input}
              value={referenceReglement}
              onChangeText={setReferenceReglement}
              placeholder="Référence de paiement"
              placeholderTextColor="#95a5a6"
            />
          </View>
        </View>

        {/* Boutons d'action */}
        <View style={styles.formActions}>
          <TouchableOpacity
            style={[styles.cancelButton]}
            onPress={() => {
              resetForm();
              setMode('list');
            }}
          >
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled
            ]}
            onPress={mode === 'add' ? ajouterAbonnement : modifierAbonnement}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {mode === 'add' ? 'Ajouter' : 'Modifier'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderViewMode = () => {
    if (!currentAbonnement) return null;
    
    return (
      <ScrollView style={styles.viewContainer}>
        {/* En-tête */}
        <LinearGradient
          colors={[getTypeColor(currentAbonnement.type), getTypeColor(currentAbonnement.type) + 'dd']}
          style={styles.viewHeader}
        >
          <View style={styles.viewHeaderTop}>
            <View style={styles.viewTypeBadge}>
              <Text style={styles.viewTypeText}>{currentAbonnement.type}</Text>
            </View>
            <View style={styles.viewHeaderRight}>
              <View style={[styles.viewEtatBadge, { backgroundColor: getEtatColor(currentAbonnement.etat) }]}>
                <Text style={styles.viewEtatText}>{currentAbonnement.etat}</Text>
              </View>
              <View style={[styles.viewStatutBadge, { backgroundColor: getStatutColor(currentAbonnement.statut) }]}>
                <Text style={styles.viewStatutText}>
                  {getStatutLabel(currentAbonnement.statut)}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.viewCode}>{currentAbonnement.code}</Text>
        </LinearGradient>

        {/* Informations abonné */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>👤 Abonné</Text>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Nom</Text>
            <Text style={styles.viewInfoValue}>
              {currentAbonnement.nom_prenom || 'Non renseigné'}
            </Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>ID Utilisateur</Text>
            <Text style={styles.viewInfoValue}>
              {currentAbonnement.utilisateur_id || 'Non lié'}
            </Text>
          </View>
          
          {currentAbonnement.telephone ? (
            <View style={styles.viewInfoRow}>
              <Text style={styles.viewInfoLabel}>Téléphone</Text>
              <Text style={styles.viewInfoValue}>{currentAbonnement.telephone}</Text>
            </View>
          ) : null}
          
          {currentAbonnement.email ? (
            <View style={styles.viewInfoRow}>
              <Text style={styles.viewInfoLabel}>Email</Text>
              <Text style={styles.viewInfoValue}>{currentAbonnement.email}</Text>
            </View>
          ) : null}
        </View>

        {/* Détails abonnement */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>📦 Détails</Text>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Niveau</Text>
            <Text style={styles.viewInfoValue}>{currentAbonnement.niveau}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Montant</Text>
            <Text style={styles.viewInfoValue}>{currentAbonnement.montant_formate}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Date début</Text>
            <Text style={styles.viewInfoValue}>{currentAbonnement.date_debut_formate}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Date expiration</Text>
            <View style={styles.viewInfoValueContainer}>
              <Text style={[
                styles.viewInfoValue,
                { color: getJoursRestantsColor(currentAbonnement.jours_restants) }
              ]}>
                {currentAbonnement.date_expiration_formate}
              </Text>
              <View style={[styles.joursRestantsBadge, { backgroundColor: getJoursRestantsColor(currentAbonnement.jours_restants) }]}>
                <Text style={styles.joursRestantsBadgeText}>
                  {currentAbonnement.jours_restants > 0 
                    ? `${currentAbonnement.jours_restants}j`
                    : 'Expiré'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.viewActions}>
          {currentAbonnement.statut !== 'actif' && (
            <TouchableOpacity
              style={[styles.viewActionButton, styles.renewButton]}
              onPress={() => renouvelerAbonnement(currentAbonnement.id)}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.viewActionButtonText}>🔄 Renouveler</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.viewActionButton, styles.editButton]}
            onPress={() => {
              setCurrentAbonnement(currentAbonnement);
              setMode('edit');
            }}
          >
            <Text style={styles.viewActionButtonText}>✏️ Modifier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewActionButton, styles.deleteButton]}
            onPress={() => setShowDeleteModal(true)}
          >
            <Text style={styles.viewActionButtonText}>🗑️ Supprimer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ============ RENDU PRINCIPAL ============
  
  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {renderHeader()}
      
      {mode === 'list' && renderListMode()}
      {(mode === 'add' || mode === 'edit') && renderFormMode()}
      {mode === 'view' && renderViewMode()}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'debut' ? dateDebut : dateExpiration}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
        />
      )}

      {/* MODALS */}

      {/* Modal Utilisateurs */}
      {renderSelectionModal(
        showUtilisateurModal,
        () => setShowUtilisateurModal(false),
        "Sélectionner un utilisateur",
        utilisateurs,
        (item) => selectUtilisateur(item),
        (item, index, onSelect) => (
          <TouchableOpacity
            key={item.utilisateur_id}
            style={[
              styles.modalItem,
              utilisateurId === item.utilisateur_id && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={styles.modalItemAvatar}>
              <Text style={styles.modalItemAvatarText}>👤</Text>
            </View>
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.nom_prenom}</Text>
              <Text style={styles.modalItemSubtitle}>
                {item.email || item.telephone || 'Aucun contact'}
              </Text>
            </View>
            {utilisateurId === item.utilisateur_id && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Type Abonnement */}
      {renderSelectionModal(
        showTypeModal,
        () => setShowTypeModal(false),
        "Type d'abonnement",
        typesAbonnement,
        (item) => {
          setType(item.type);
          setMontant(item.montant);
          setShowTypeModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={item.type}
            style={[
              styles.modalItem,
              type === item.type && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: getTypeColor(item.type) }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.type}</Text>
              <Text style={styles.modalItemSubtitle}>
                {item.montant_formate} • {item.duree} jours
              </Text>
              <Text style={styles.modalItemDescription}>{item.description}</Text>
            </View>
            {type === item.type && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Catégories */}
      {renderSelectionModal(
        showCategorieModal,
        () => setShowCategorieModal(false),
        "Sélectionner une catégorie",
        categories,
        (item) => {
          setCategorieSelected(item);
          setNiveau('');
          loadNiveauxByCategorie(item);
          setShowCategorieModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              categorieSelected === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: '#3498db' }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item}</Text>
            </View>
            {categorieSelected === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Niveau */}
      {renderSelectionModal(
        showNiveauModal,
        () => setShowNiveauModal(false),
        `Sélectionner un niveau - ${categorieSelected}`,
        niveauxDisponibles,
        (item) => {
          setNiveau(item.nom);
          setShowNiveauModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.modalItem,
              niveau === item.nom && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item.couleur_principale || '#3498db' }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.nom}</Text>
              <Text style={styles.modalItemSubtitle}>{item.code}</Text>
            </View>
            {niveau === item.nom && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Statut */}
      {renderSelectionModal(
        showStatutModal,
        () => setShowStatutModal(false),
        "Statut de l'abonnement",
        STATUTS_ABONNEMENT,
        (item) => {
          setStatut(item);
          setShowStatutModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.modalItem,
              statut === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: getStatutColor(item) }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{getStatutLabel(item)}</Text>
            </View>
            {statut === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal État */}
      {renderSelectionModal(
        showEtatModal,
        () => setShowEtatModal(false),
        "État de l'abonnement",
        ETATS_ABONNEMENT,
        (item) => {
          setEtat(item);
          setShowEtatModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              etat === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: getEtatColor(item) }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item}</Text>
            </View>
            {etat === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Mode Règlement */}
      {renderSelectionModal(
        showModeReglementModal,
        () => setShowModeReglementModal(false),
        "Mode de règlement",
        MODES_REGLEMENT,
        (item) => {
          setModeReglement(item);
          setShowModeReglementModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              modeReglement === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item}</Text>
            </View>
            {modeReglement === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Filtres */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Filtres</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalList}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
              </TouchableOpacity>

              {/* Filtre par type */}
              <Text style={styles.filterLabel}>Type d'abonnement</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterType && styles.filterChipActive]}
                  onPress={() => setFilterType('')}
                >
                  <Text style={[styles.filterChipText, !filterType && styles.filterChipTextActive]}>Tous</Text>
                </TouchableOpacity>
                {TYPES_ABONNEMENT.map((typ, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.filterChip, filterType === typ && styles.filterChipActive]}
                    onPress={() => setFilterType(typ)}
                  >
                    <Text style={[styles.filterChipText, filterType === typ && styles.filterChipTextActive]}>
                      {typ}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Filtre par statut */}
              <Text style={styles.filterLabel}>Statut</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterStatut && styles.filterChipActive]}
                  onPress={() => setFilterStatut('')}
                >
                  <Text style={[styles.filterChipText, !filterStatut && styles.filterChipTextActive]}>Tous</Text>
                </TouchableOpacity>
                {STATUTS_ABONNEMENT.map((stat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.filterChip, filterStatut === stat && styles.filterChipActive]}
                    onPress={() => setFilterStatut(stat)}
                  >
                    <Text style={[styles.filterChipText, filterStatut === stat && styles.filterChipTextActive]}>
                      {getStatutLabel(stat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Filtre par état */}
              <Text style={styles.filterLabel}>État</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterEtat && styles.filterChipActive]}
                  onPress={() => setFilterEtat('')}
                >
                  <Text style={[styles.filterChipText, !filterEtat && styles.filterChipTextActive]}>Tous</Text>
                </TouchableOpacity>
                {ETATS_ABONNEMENT.map((etatItem, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.filterChip, filterEtat === etatItem && styles.filterChipActive]}
                    onPress={() => setFilterEtat(etatItem)}
                  >
                    <Text style={[styles.filterChipText, filterEtat === etatItem && styles.filterChipTextActive]}>
                      {etatItem}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Filtre par période */}
              <Text style={styles.filterLabel}>Période</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterPeriode && styles.filterChipActive]}
                  onPress={() => setFilterPeriode('')}
                >
                  <Text style={[styles.filterChipText, !filterPeriode && styles.filterChipTextActive]}>Toujours</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, filterPeriode === 'aujourdhui' && styles.filterChipActive]}
                  onPress={() => setFilterPeriode('aujourdhui')}
                >
                  <Text style={[styles.filterChipText, filterPeriode === 'aujourdhui' && styles.filterChipTextActive]}>
                    Aujourd'hui
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, filterPeriode === 'semaine' && styles.filterChipActive]}
                  onPress={() => setFilterPeriode('semaine')}
                >
                  <Text style={[styles.filterChipText, filterPeriode === 'semaine' && styles.filterChipTextActive]}>
                    7 jours
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, filterPeriode === 'mois' && styles.filterChipActive]}
                  onPress={() => setFilterPeriode('mois')}
                >
                  <Text style={[styles.filterChipText, filterPeriode === 'mois' && styles.filterChipTextActive]}>
                    30 jours
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity 
                style={styles.applyButton}
                onPress={applyFilters}
              >
                <Text style={styles.applyButtonText}>Appliquer les filtres</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Confirmation Suppression */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>🗑️ Confirmer la suppression</Text>
            <Text style={styles.confirmText}>
              Êtes-vous sûr de vouloir supprimer cet abonnement ?
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.confirmButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={() => supprimerAbonnement(currentAbonnement?.id)}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Supprimer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  // Header
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  // Loading
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7f8c8d',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#95a5a6',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2c3e50',
  },
  clearIcon: {
    fontSize: 16,
    color: '#95a5a6',
    padding: 5,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  expiringButton: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#f39c12',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterIcon: {
    fontSize: 20,
  },
  expiringIcon: {
    fontSize: 20,
    color: '#fff',
  },
  // Stats
  statsContainer: {
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  statCard: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    marginRight: 12,
    minWidth: 130,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  // List
  listContainer: {
    flex: 1,
    padding: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 15,
    color: '#bdc3c7',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#95a5a6',
    textAlign: 'center',
  },
  abonnementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  cardHeaderRight: {
    flexDirection: 'row',
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  etatBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  etatBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  statutBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statutBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    padding: 15,
  },
  abonneNom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  abonnementCode: {
    fontSize: 12,
    color: '#3498db',
    marginBottom: 12,
  },
  abonnementInfos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  datesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 12,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: '#95a5a6',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2c3e50',
  },
  dateSeparator: {
    paddingHorizontal: 10,
  },
  dateSeparatorText: {
    fontSize: 16,
    color: '#bdc3c7',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  joursRestants: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  joursRestantsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  joursRestantsText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  contactInfo: {
    fontSize: 12,
    color: '#3498db',
  },
  // Form
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  codeSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  codeLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
    marginRight: 10,
  },
  codeRefresh: {
    padding: 5,
  },
  codeRefreshText: {
    fontSize: 18,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -5,
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 5,
  },
  selectorSection: {
    marginBottom: 15,
  },
  selectorLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectorButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectorButtonText: {
    fontSize: 15,
    color: '#2c3e50',
  },
  selectorButtonIcon: {
    fontSize: 12,
    color: '#95a5a6',
  },
  typeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statutDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  etatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    fontSize: 15,
    color: '#2c3e50',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#2c3e50',
  },
  dateButtonIcon: {
    fontSize: 16,
    color: '#95a5a6',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#95a5a6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // View Mode
  viewContainer: {
    flex: 1,
    padding: 20,
  },
  viewHeader: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  viewHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  viewHeaderRight: {
    flexDirection: 'row',
  },
  viewTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewEtatBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  viewEtatText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewStatutBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewStatutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  viewSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  viewSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  viewInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  viewInfoLabel: {
    width: 100,
    fontSize: 14,
    color: '#7f8c8d',
  },
  viewInfoValue: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  viewInfoValueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joursRestantsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  joursRestantsBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  viewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  viewActionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  renewButton: {
    backgroundColor: '#f39c12',
  },
  viewActionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#95a5a6',
  },
  modalList: {
    padding: 15,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  modalItemSelected: {
    backgroundColor: '#ebf5ff',
    borderColor: '#3498db',
  },
  modalItemColor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  modalItemAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  modalItemAvatarText: {
    fontSize: 20,
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  modalItemSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  modalItemDescription: {
    fontSize: 12,
    color: '#95a5a6',
  },
  modalItemCheck: {
    fontSize: 20,
    color: '#27ae60',
    fontWeight: 'bold',
  },
  modalEmptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  // Filter Modal
  filterLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 15,
    marginBottom: 10,
  },
  filterChips: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterChipActive: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  filterChipText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  resetButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  resetButtonText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Confirmation Modal
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 25,
    marginHorizontal: 30,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 15,
    color: '#7f8c8d',
    marginBottom: 25,
    textAlign: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  deleteConfirmButton: {
    backgroundColor: '#e74c3c',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});