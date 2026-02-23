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
  RefreshControl,
  Image
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

// Constantes
const API_BASE_URL = 'https://rouah.net/api/gestion-cours.php';
const TYPES_COURS = ['Cours', 'Exercices', 'Corrigés'];
const NIVEAUX_DIFFICULTE = ['débutant', 'intermédiaire', 'avancé'];
const STATUTS_COURS = ['publié', 'brouillon', 'archivé'];

export default function GestionCours({ navigation }) {
  // États principaux
  const [mode, setMode] = useState('list'); // list, add, edit, view
  const [coursList, setCoursList] = useState([]);
  const [filteredCours, setFilteredCours] = useState([]);
  const [currentCours, setCurrentCours] = useState(null);
  
  // États pour les sélections en cascade
  const [categories, setCategories] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [matieres, setMatieres] = useState([]);
  
  // États pour les sélections actuelles
  const [categorieSelected, setCategorieSelected] = useState('');
  const [niveauSelected, setNiveauSelected] = useState(null);
  const [matiereSelected, setMatiereSelected] = useState(null);
  
  // États pour les champs du formulaire
  const [code, setCode] = useState('');
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [contenu, setContenu] = useState('');
  const [type, setType] = useState('Cours');
  const [duree, setDuree] = useState('45');
  const [difficulte, setDifficulte] = useState('débutant');
  const [enseignant, setEnseignant] = useState('');
  const [urlVideo, setUrlVideo] = useState('');
  const [urlPdf, setUrlPdf] = useState('');
  const [statut, setStatut] = useState('publié');
  
  // États pour les modals
  const [showCategorieModal, setShowCategorieModal] = useState(false);
  const [showNiveauModal, setShowNiveauModal] = useState(false);
  const [showMatiereModal, setShowMatiereModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDifficulteModal, setShowDifficulteModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // États pour la recherche et filtres
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterNiveau, setFilterNiveau] = useState(null);
  const [filterMatiere, setFilterMatiere] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingNiveaux, setLoadingNiveaux] = useState(false);
  const [loadingMatieres, setLoadingMatieres] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (categorieSelected) {
      loadNiveauxByCategorie(categorieSelected);
      setNiveauSelected(null);
      setMatiereSelected(null);
    }
  }, [categorieSelected]);

  useEffect(() => {
    if (niveauSelected) {
      loadMatieresByNiveau(niveauSelected.id);
      setMatiereSelected(null);
    }
  }, [niveauSelected]);

  useEffect(() => {
    if (mode === 'list') {
      loadCours();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && currentCours) {
      loadCoursForEdit();
    }
  }, [mode, currentCours]);

  // ============ FONCTIONS DE CHARGEMENT ============
  
  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadCategories(),
        loadCours()
      ]);
    } catch (error) {
      console.error("Erreur chargement initial:", error);
      Alert.alert("Erreur", "Impossible de charger les données");
    } finally {
      setLoadingCategories(false);
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
        setNiveaux(data.niveaux);
      }
    } catch (error) {
      console.error("Erreur chargement niveaux:", error);
    } finally {
      setLoadingNiveaux(false);
    }
  };

  const loadMatieresByNiveau = async (niveauId) => {
    setLoadingMatieres(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_matieres_by_niveau&niveau_id=${niveauId}`);
      const data = await response.json();
      if (data.success) {
        setMatieres(data.matieres);
      }
    } catch (error) {
      console.error("Erreur chargement matières:", error);
    } finally {
      setLoadingMatieres(false);
    }
  };

  const loadCours = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_cours`);
      const data = await response.json();
      if (data.success) {
        setCoursList(data.cours);
        setFilteredCours(data.cours);
      }
    } catch (error) {
      console.error("Erreur chargement cours:", error);
      Alert.alert("Erreur", "Impossible de charger la liste des cours");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCoursById = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_cours_by_id&id=${id}`);
      const data = await response.json();
      if (data.success) {
        setCurrentCours(data.cours);
        setMode('view');
      } else {
        Alert.alert("Erreur", data.error || "Cours non trouvé");
      }
    } catch (error) {
      console.error("Erreur chargement cours:", error);
      Alert.alert("Erreur", "Impossible de charger le cours");
    } finally {
      setLoading(false);
    }
  };

  const loadCoursForEdit = async () => {
    try {
      // Charger la catégorie et le niveau
      if (currentCours.categorie) {
        setCategorieSelected(currentCours.categorie);
        
        // Attendre que les niveaux soient chargés
        setTimeout(() => {
          const niveau = niveaux.find(n => n.nom === currentCours.niveau_nom);
          if (niveau) {
            setNiveauSelected(niveau);
            
            // Charger les matières du niveau
            setTimeout(() => {
              const matiere = { 
                id: currentCours.matiere_id, 
                nom: currentCours.matiere_nom 
              };
              setMatiereSelected(matiere);
            }, 500);
          }
        }, 500);
      }
      
      // Remplir le formulaire
      setCode(currentCours.code || '');
      setTitre(currentCours.titre || '');
      setDescription(currentCours.description || '');
      setContenu(currentCours.contenu || '');
      setType(currentCours.type || 'Cours');
      setDuree((currentCours.duree_minutes || 45).toString());
      setDifficulte(currentCours.difficulte || 'débutant');
      setEnseignant(currentCours.enseignant || '');
      setUrlVideo(currentCours.url_video || '');
      setUrlPdf(currentCours.url_pdf || '');
      setStatut(currentCours.statut || 'publié');
      
    } catch (error) {
      console.error("Erreur préparation édition:", error);
    }
  };

  const searchCours = async (keyword) => {
    if (!keyword.trim()) {
      setFilteredCours(coursList);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=search_cours&keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      if (data.success) {
        setFilteredCours(data.cours);
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
    if (!categorieSelected) {
      Alert.alert("Erreur", "Veuillez sélectionner une catégorie");
      return false;
    }
    if (!niveauSelected) {
      Alert.alert("Erreur", "Veuillez sélectionner un niveau");
      return false;
    }
    if (!matiereSelected) {
      Alert.alert("Erreur", "Veuillez sélectionner une matière");
      return false;
    }
    if (!titre.trim()) {
      Alert.alert("Erreur", "Veuillez saisir un titre");
      return false;
    }
    if (!enseignant.trim()) {
      Alert.alert("Erreur", "Veuillez saisir le nom de l'enseignant");
      return false;
    }
    return true;
  };

  const ajouterCours = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    const coursData = {
      action: 'ajouter_cours',
      code: code,
      type: type,
      matiere_id: matiereSelected.id,
      titre: titre,
      description: description,
      contenu: contenu,
      enseignant: enseignant,
      duree_minutes: parseInt(duree) || 45,
      difficulte: difficulte,
      url_video: urlVideo,
      url_pdf: urlPdf,
      statut: statut
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coursData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Cours ajouté avec succès");
        resetForm();
        setMode('list');
        loadCours();
      } else {
        throw new Error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      Alert.alert("Erreur", error.message || "Impossible d'ajouter le cours");
    } finally {
      setSubmitting(false);
    }
  };

  const modifierCours = async () => {
    if (!validateForm()) return;
    if (!currentCours?.id) return;
    
    setSubmitting(true);
    
    const coursData = {
      action: 'modifier_cours',
      id: currentCours.id,
      code: code,
      type: type,
      matiere_id: matiereSelected.id,
      titre: titre,
      description: description,
      contenu: contenu,
      enseignant: enseignant,
      duree_minutes: parseInt(duree) || 45,
      difficulte: difficulte,
      url_video: urlVideo,
      url_pdf: urlPdf,
      statut: statut
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coursData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Cours modifié avec succès");
        resetForm();
        setMode('list');
        loadCours();
      } else {
        throw new Error(data.error || "Erreur lors de la modification");
      }
    } catch (error) {
      console.error("Erreur modification:", error);
      Alert.alert("Erreur", error.message || "Impossible de modifier le cours");
    } finally {
      setSubmitting(false);
    }
  };

  const supprimerCours = async (id) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=supprimer_cours&id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Cours supprimé avec succès");
        setShowDeleteModal(false);
        if (mode === 'view') {
          setMode('list');
        }
        loadCours();
      } else {
        throw new Error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      Alert.alert("Erreur", error.message || "Impossible de supprimer le cours");
    } finally {
      setSubmitting(false);
    }
  };

  // ============ FONCTIONS UTILITAIRES ============
  
  const resetForm = () => {
    setCategorieSelected('');
    setNiveauSelected(null);
    setMatiereSelected(null);
    setCode('');
    setTitre('');
    setDescription('');
    setContenu('');
    setType('Cours');
    setDuree('45');
    setDifficulte('débutant');
    setEnseignant('');
    setUrlVideo('');
    setUrlPdf('');
    setStatut('publié');
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setFilterCategorie('');
    setFilterNiveau(null);
    setFilterMatiere(null);
    setFilterType('');
    setFilterStatut('');
    setFilteredCours(coursList);
  };

  const applyFilters = () => {
    let filtered = [...coursList];
    
    if (searchKeyword) {
      filtered = filtered.filter(c => 
        c.titre?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        c.enseignant?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    if (filterCategorie) {
      filtered = filtered.filter(c => c.categorie === filterCategorie);
    }
    
    if (filterNiveau) {
      filtered = filtered.filter(c => c.niveau_nom === filterNiveau.nom);
    }
    
    if (filterMatiere) {
      filtered = filtered.filter(c => c.matiere_id === filterMatiere.id);
    }
    
    if (filterType) {
      filtered = filtered.filter(c => c.type === filterType);
    }
    
    if (filterStatut) {
      filtered = filtered.filter(c => c.statut === filterStatut);
    }
    
    setFilteredCours(filtered);
    setShowFilterModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDifficulteColor = (difficulte) => {
    switch(difficulte) {
      case 'débutant': return '#27ae60';
      case 'intermédiaire': return '#f39c12';
      case 'avancé': return '#e74c3c';
      default: return '#7f8c8d';
    }
  };

  const getStatutColor = (statut) => {
    switch(statut) {
      case 'publié': return '#27ae60';
      case 'brouillon': return '#f39c12';
      case 'archivé': return '#95a5a6';
      default: return '#7f8c8d';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCours();
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
  
  const renderCategorieSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>📁 Catégorie</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowCategorieModal(true)}
      >
        <Text style={styles.selectorButtonText}>
          {categorieSelected || "Sélectionner une catégorie"}
        </Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNiveauSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>🎓 Niveau</Text>
      <TouchableOpacity
        style={[
          styles.selectorButton,
          !categorieSelected && styles.selectorButtonDisabled
        ]}
        onPress={() => categorieSelected && setShowNiveauModal(true)}
        disabled={!categorieSelected}
      >
        {loadingNiveaux ? (
          <ActivityIndicator size="small" color="#3498db" />
        ) : (
          <>
            <Text style={styles.selectorButtonText}>
              {niveauSelected ? niveauSelected.nom : "Sélectionner un niveau"}
            </Text>
            <Text style={styles.selectorButtonIcon}>▼</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderMatiereSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>📚 Matière</Text>
      <TouchableOpacity
        style={[
          styles.selectorButton,
          !niveauSelected && styles.selectorButtonDisabled
        ]}
        onPress={() => niveauSelected && setShowMatiereModal(true)}
        disabled={!niveauSelected}
      >
        {loadingMatieres ? (
          <ActivityIndicator size="small" color="#3498db" />
        ) : (
          <>
            <Text style={styles.selectorButtonText}>
              {matiereSelected ? matiereSelected.nom : "Sélectionner une matière"}
            </Text>
            <Text style={styles.selectorButtonIcon}>▼</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderTypeSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>📋 Type</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowTypeModal(true)}
      >
        <Text style={styles.selectorButtonText}>{type}</Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDifficulteSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>📊 Difficulté</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowDifficulteModal(true)}
      >
        <Text style={styles.selectorButtonText}>
          {difficulte.charAt(0).toUpperCase() + difficulte.slice(1)}
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
        <Text style={styles.selectorButtonText}>
          {statut.charAt(0).toUpperCase() + statut.slice(1)}
        </Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEnseignantInput = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>👨‍🏫 Enseignant</Text>
      <TextInput
        style={styles.input}
        value={enseignant}
        onChangeText={setEnseignant}
        placeholder="Nom de l'enseignant"
        placeholderTextColor="#95a5a6"
      />
    </View>
  );

  // ============ RENDU DES ÉCRANS ============
  
  const renderHeader = () => {
    let title = "📚 Gestion des cours";
    let subtitle = "";
    
    if (mode === 'add') {
      title = "➕ Ajouter un cours";
      subtitle = "Remplissez les informations du cours";
    } else if (mode === 'edit') {
      title = "✏️ Modifier le cours";
      subtitle = "Modifiez les informations du cours";
    } else if (mode === 'view') {
      title = "📖 Détail du cours";
      subtitle = currentCours?.titre || "";
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
                generateCode();
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
              searchCours(text);
            }}
            placeholder="Rechercher un cours..."
            placeholderTextColor="#95a5a6"
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => {
              setSearchKeyword('');
              setFilteredCours(coursList);
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
      </View>

      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{coursList.length}</Text>
          <Text style={styles.statLabel}>Total cours</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {coursList.filter(c => c.statut === 'publié').length}
          </Text>
          <Text style={styles.statLabel}>Publiés</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {coursList.filter(c => c.statut === 'brouillon').length}
          </Text>
          <Text style={styles.statLabel}>Brouillons</Text>
        </View>
      </View>

      {/* Liste des cours */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des cours...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.coursList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredCours.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>Aucun cours trouvé</Text>
              <Text style={styles.emptyText}>
                {coursList.length === 0 
                  ? "Commencez par ajouter votre premier cours"
                  : "Aucun cours ne correspond à votre recherche"}
              </Text>
            </View>
          ) : (
            filteredCours.map((cours) => (
              <TouchableOpacity
                key={cours.id}
                style={styles.coursCard}
                onPress={() => loadCoursById(cours.id)}
              >
                <View style={styles.coursHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: getDifficulteColor(cours.difficulte) }]}>
                    <Text style={styles.typeBadgeText}>{cours.type}</Text>
                  </View>
                  <View style={[styles.statutBadge, { backgroundColor: getStatutColor(cours.statut) }]}>
                    <Text style={styles.statutBadgeText}>{cours.statut}</Text>
                  </View>
                </View>

                <Text style={styles.coursTitre} numberOfLines={2}>
                  {cours.titre}
                </Text>

                <View style={styles.coursInfos}>
                  <Text style={styles.coursCode}>{cours.code}</Text>
                  <Text style={styles.coursMatiere}>{cours.matiere_nom}</Text>
                </View>

                <View style={styles.coursDetails}>
                  <View style={styles.coursDetail}>
                    <Text style={styles.detailIcon}>🎓</Text>
                    <Text style={styles.detailText}>{cours.niveau_nom || 'N/A'}</Text>
                  </View>
                  <View style={styles.coursDetail}>
                    <Text style={styles.detailIcon}>👨‍🏫</Text>
                    <Text style={styles.detailText}>{cours.enseignant}</Text>
                  </View>
                  <View style={styles.coursDetail}>
                    <Text style={styles.detailIcon}>📅</Text>
                    <Text style={styles.detailText}>{formatDate(cours.date_publication)}</Text>
                  </View>
                </View>

                <View style={styles.coursFooter}>
                  <View style={styles.coursStats}>
                    <Text style={styles.statIcon}>👁️ {cours.vues || 0}</Text>
                    <Text style={styles.statIcon}>⬇️ {cours.telechargements || 0}</Text>
                  </View>
                  <View style={styles.difficulteBadge}>
                    <View style={[styles.difficulteDot, { backgroundColor: getDifficulteColor(cours.difficulte) }]} />
                    <Text style={styles.difficulteText}>{cours.difficulte}</Text>
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
        <Text style={styles.codeLabel}>🔑 Code </Text>
        <View style={styles.codeInputContainer}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={setCode}
            placeholder="Ex: NIV-001"
            placeholderTextColor="#95a5a6"
            maxLength={20}
          />
        </View>
      </View>

        {/* Sélections */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📌 Sélection du cours</Text>
          {renderCategorieSelector()}
          {renderNiveauSelector()}
          {renderMatiereSelector()}
          {renderTypeSelector()}
          {renderDifficulteSelector()}
          {renderStatutSelector()}
          {renderEnseignantInput()}
        </View>

        {/* Informations générales */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📝 Informations générales</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Titre du cours</Text>
            <TextInput
              style={styles.input}
              value={titre}
              onChangeText={setTitre}
              placeholder="Ex: Introduction à l'algorithmique"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description détaillée du cours..."
              placeholderTextColor="#95a5a6"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Durée (minutes)</Text>
            <TextInput
              style={styles.input}
              value={duree}
              onChangeText={setDuree}
              placeholder="45"
              placeholderTextColor="#95a5a6"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Contenu */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📄 Contenu du cours</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contenu textuel</Text>
            <TextInput
              style={[styles.input, styles.textAreaBig]}
              value={contenu}
              onChangeText={setContenu}
              placeholder="Saisissez le contenu du cours ici..."
              placeholderTextColor="#95a5a6"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>URL Vidéo (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={urlVideo}
              onChangeText={setUrlVideo}
              placeholder="https://..."
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>URL PDF (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={urlPdf}
              onChangeText={setUrlPdf}
              placeholder="https://..."
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
            onPress={mode === 'add' ? ajouterCours : modifierCours}
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
    if (!currentCours) return null;
    
    return (
      <ScrollView style={styles.viewContainer}>
        {/* En-tête du cours */}
        <View style={[styles.viewHeader, { backgroundColor: getDifficulteColor(currentCours.difficulte) }]}>
          <View style={styles.viewHeaderTop}>
            <View style={styles.viewTypeBadge}>
              <Text style={styles.viewTypeText}>{currentCours.type}</Text>
            </View>
            <View style={[styles.viewStatutBadge, { backgroundColor: getStatutColor(currentCours.statut) }]}>
              <Text style={styles.viewStatutText}>{currentCours.statut}</Text>
            </View>
          </View>
          <Text style={styles.viewTitre}>{currentCours.titre}</Text>
          <Text style={styles.viewCode}>{currentCours.code}</Text>
        </View>

        {/* Informations */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>📋 Informations</Text>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Matière</Text>
            <Text style={styles.viewInfoValue}>{currentCours.matiere_nom}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Niveau</Text>
            <Text style={styles.viewInfoValue}>{currentCours.niveau_nom} ({currentCours.categorie})</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Enseignant</Text>
            <Text style={styles.viewInfoValue}>{currentCours.enseignant}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Difficulté</Text>
            <View style={styles.viewDifficulte}>
              <View style={[styles.difficulteDot, { backgroundColor: getDifficulteColor(currentCours.difficulte) }]} />
              <Text style={styles.viewInfoValue}>{currentCours.difficulte}</Text>
            </View>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Durée</Text>
            <Text style={styles.viewInfoValue}>{currentCours.duree_minutes || 45} minutes</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Date publication</Text>
            <Text style={styles.viewInfoValue}>{formatDate(currentCours.date_publication)}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Statistiques</Text>
            <Text style={styles.viewInfoValue}>👁️ {currentCours.vues || 0} vues • ⬇️ {currentCours.telechargements || 0} téléchargements</Text>
          </View>
        </View>

        {/* Description */}
        {currentCours.description ? (
          <View style={styles.viewSection}>
            <Text style={styles.viewSectionTitle}>📝 Description</Text>
            <Text style={styles.viewText}>{currentCours.description}</Text>
          </View>
        ) : null}

        {/* Contenu */}
        {currentCours.contenu ? (
          <View style={styles.viewSection}>
            <Text style={styles.viewSectionTitle}>📄 Contenu</Text>
            <Text style={styles.viewText}>{currentCours.contenu}</Text>
          </View>
        ) : null}

        {/* Ressources */}
        {(currentCours.url_video || currentCours.url_pdf) ? (
          <View style={styles.viewSection}>
            <Text style={styles.viewSectionTitle}>🔗 Ressources</Text>
            {currentCours.url_video ? (
              <View style={styles.viewResource}>
                <Text style={styles.resourceIcon}>🎬</Text>
                <Text style={styles.resourceText} numberOfLines={1}>{currentCours.url_video}</Text>
              </View>
            ) : null}
            {currentCours.url_pdf ? (
              <View style={styles.viewResource}>
                <Text style={styles.resourceIcon}>📄</Text>
                <Text style={styles.resourceText} numberOfLines={1}>{currentCours.url_pdf}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Boutons d'action */}
        <View style={styles.viewActions}>
          <TouchableOpacity
            style={[styles.viewActionButton, styles.editButton]}
            onPress={() => {
              setCurrentCours(currentCours);
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

      {/* MODALS */}

      {/* Modal Catégorie */}
      {renderSelectionModal(
        showCategorieModal,
        () => setShowCategorieModal(false),
        "Sélectionner une catégorie",
        categories,
        (item) => {
          setCategorieSelected(item);
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
        "Sélectionner un niveau",
        niveaux,
        (item) => {
          setNiveauSelected(item);
          setShowNiveauModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.modalItem,
              niveauSelected?.id === item.id && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item.couleur_principale || '#3498db' }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.nom}</Text>
              <Text style={styles.modalItemSubtitle}>{item.code}</Text>
            </View>
            {niveauSelected?.id === item.id && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Matière */}
      {renderSelectionModal(
        showMatiereModal,
        () => setShowMatiereModal(false),
        "Sélectionner une matière",
        matieres,
        (item) => {
          setMatiereSelected(item);
          setShowMatiereModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.modalItem,
              matiereSelected?.id === item.id && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item.couleur || '#3498db' }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.nom}</Text>
              <Text style={styles.modalItemSubtitle}>{item.code}</Text>
            </View>
            {matiereSelected?.id === item.id && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Type */}
      {renderSelectionModal(
        showTypeModal,
        () => setShowTypeModal(false),
        "Type de cours",
        TYPES_COURS,
        (item) => {
          setType(item);
          setShowTypeModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              type === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item}</Text>
            </View>
            {type === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Difficulté */}
      {renderSelectionModal(
        showDifficulteModal,
        () => setShowDifficulteModal(false),
        "Niveau de difficulté",
        NIVEAUX_DIFFICULTE,
        (item) => {
          setDifficulte(item);
          setShowDifficulteModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              difficulte === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </View>
            {difficulte === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Statut */}
      {renderSelectionModal(
        showStatutModal,
        () => setShowStatutModal(false),
        "Statut du cours",
        STATUTS_COURS,
        (item) => {
          setStatut(item);
          setShowStatutModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              statut === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </View>
            {statut === item && (
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

              {/* Filtre par catégorie */}
              <Text style={styles.filterLabel}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterCategorie && styles.filterChipActive]}
                  onPress={() => setFilterCategorie('')}
                >
                  <Text style={[styles.filterChipText, !filterCategorie && styles.filterChipTextActive]}>Tous</Text>
                </TouchableOpacity>
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.filterChip, filterCategorie === cat && styles.filterChipActive]}
                    onPress={() => setFilterCategorie(cat)}
                  >
                    <Text style={[styles.filterChipText, filterCategorie === cat && styles.filterChipTextActive]}>
                      {cat}
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
                {STATUTS_COURS.map((stat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.filterChip, filterStatut === stat && styles.filterChipActive]}
                    onPress={() => setFilterStatut(stat)}
                  >
                    <Text style={[styles.filterChipText, filterStatut === stat && styles.filterChipTextActive]}>
                      {stat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Filtre par type */}
              <Text style={styles.filterLabel}>Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterType && styles.filterChipActive]}
                  onPress={() => setFilterType('')}
                >
                  <Text style={[styles.filterChipText, !filterType && styles.filterChipTextActive]}>Tous</Text>
                </TouchableOpacity>
                {TYPES_COURS.map((typ, index) => (
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
              Êtes-vous sûr de vouloir supprimer ce cours ?
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
                onPress={() => supprimerCours(currentCours?.id)}
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
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterIcon: {
    fontSize: 20,
  },
  // Stats
  statsContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  // Cours List
  coursList: {
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
  coursCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  coursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statutBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  coursTitre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  coursInfos: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coursCode: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '500',
  },
  coursMatiere: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  coursDetails: {
    marginBottom: 10,
  },
  coursDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailIcon: {
    fontSize: 12,
    marginRight: 6,
    width: 16,
  },
  detailText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  coursFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  coursStats: {
    flexDirection: 'row',
  },
  statIcon: {
    fontSize: 12,
    color: '#95a5a6',
    marginRight: 12,
  },
  difficulteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficulteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  difficulteText: {
    fontSize: 11,
    color: '#7f8c8d',
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
  selectorButtonDisabled: {
    backgroundColor: '#f1f3f4',
    borderColor: '#dee2e6',
    opacity: 0.6,
  },
  selectorButtonText: {
    fontSize: 15,
    color: '#2c3e50',
  },
  selectorButtonIcon: {
    fontSize: 12,
    color: '#95a5a6',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  textAreaBig: {
    height: 150,
    textAlignVertical: 'top',
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
    backgroundColor: '#3498db',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  viewHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
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
  viewTitre: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  viewCode: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
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
  viewDifficulte: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
  },
  viewResource: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resourceIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 24,
  },
  resourceText: {
    flex: 1,
    fontSize: 14,
    color: '#3498db',
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
  // CODE
  codeInputContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
  marginTop:8
},
codeInput: {
  flex: 1,
  paddingHorizontal: 15,
  paddingVertical: 12,
  backgroundColor: '#f8f9fa',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#e9ecef',
  fontSize: 15,
  color: '#2c3e50',
  marginRight: 10,
},
codeHint: {
  fontSize: 12,
  color: '#95a5a6',
  marginTop: 8,
  fontStyle: 'italic',
},
});