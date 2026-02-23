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
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

// Constantes
const API_BASE_URL = 'https://rouah.net/api/gestion-matiere.php';
const STATUTS_MATIERE = ['actif', 'inactif'];
const TYPES_MATIERE = ['Matiere', 'Filiere'];
const ICONES_DISPONIBLES = [
  'school', 'book', 'math', 'science', 'language', 'history', 'art', 'music', 'sports', 'computer'
];
const COULEURS_PREDEFINIES = [
  '#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b'
];

export default function GestionMatiere({ navigation }) {
  // États principaux
  const [mode, setMode] = useState('list'); // list, add, edit, view
  const [matieresList, setMatieresList] = useState([]);
  const [filteredMatieres, setFilteredMatieres] = useState([]);
  const [currentMatiere, setCurrentMatiere] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  
  // États pour les sélections en cascade
  const [categories, setCategories] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  
  // États pour les sélections actuelles
  const [categorieSelected, setCategorieSelected] = useState('');
  const [niveauSelected, setNiveauSelected] = useState(null);
  
  // États pour les champs du formulaire
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('Matiere');
  const [icone, setIcone] = useState('school');
  const [couleur, setCouleur] = useState('#3498db');
  const [ordre, setOrdre] = useState('0');
  const [statut, setStatut] = useState('actif');
  
  // États pour les modals
  const [showCategorieModal, setShowCategorieModal] = useState(false);
  const [showNiveauModal, setShowNiveauModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showIconeModal, setShowIconeModal] = useState(false);
  const [showCouleurModal, setShowCouleurModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingNiveaux, setLoadingNiveaux] = useState(false);
  
  // États pour la recherche et filtres
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterNiveau, setFilterNiveau] = useState('');
  const [filterStatut, setFilterStatut] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (mode === 'list') {
      loadMatieres();
      loadStatistiques();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && currentMatiere) {
      loadMatiereForEdit();
    }
  }, [mode, currentMatiere]);

  useEffect(() => {
    if (categorieSelected) {
      loadNiveauxByCategorie(categorieSelected);
      setNiveauSelected(null);
    }
  }, [categorieSelected]);

  // ============ FONCTIONS DE CHARGEMENT ============
  
  const loadInitialData = async () => {
    try {
      await Promise.all([
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
        setNiveaux(data.niveaux);
      }
    } catch (error) {
      console.error("Erreur chargement niveaux:", error);
    } finally {
      setLoadingNiveaux(false);
    }
  };

  const loadMatieres = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_matieres`);
      const data = await response.json();
      if (data.success) {
        setMatieresList(data.matieres);
        setFilteredMatieres(data.matieres);
      }
    } catch (error) {
      console.error("Erreur chargement matières:", error);
      Alert.alert("Erreur", "Impossible de charger la liste des matières");
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

  const loadMatiereById = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_matiere_by_id&id=${id}`);
      const data = await response.json();
      if (data.success) {
        setCurrentMatiere(data.matiere);
        setMode('view');
      } else {
        Alert.alert("Erreur", data.error || "Matière non trouvée");
      }
    } catch (error) {
      console.error("Erreur chargement matière:", error);
      Alert.alert("Erreur", "Impossible de charger la matière");
    } finally {
      setLoading(false);
    }
  };

  const loadMatiereForEdit = async () => {
    try {
      setCode(currentMatiere.code || '');
      setNom(currentMatiere.nom || '');
      setDescription(currentMatiere.description || '');
      setType(currentMatiere.type || 'Matiere');
      setIcone(currentMatiere.icone || 'school');
      setCouleur(currentMatiere.couleur || '#3498db');
      setOrdre((currentMatiere.ordre || 0).toString());
      setStatut(currentMatiere.statut || 'actif');
      
      // Charger la catégorie et le niveau
      if (currentMatiere.categorie) {
        setCategorieSelected(currentMatiere.categorie);
        
        // Attendre que les niveaux soient chargés
        setTimeout(() => {
          const niveau = niveaux.find(n => n.id === currentMatiere.niveau_id);
          if (niveau) {
            setNiveauSelected(niveau);
          } else {
            // Charger le niveau directement
            setNiveauSelected({
              id: currentMatiere.niveau_id,
              nom: currentMatiere.niveau_nom,
              code: currentMatiere.niveau_code
            });
          }
        }, 500);
      }
    } catch (error) {
      console.error("Erreur préparation édition:", error);
    }
  };

  const searchMatieres = async (keyword) => {
    if (!keyword.trim()) {
      setFilteredMatieres(matieresList);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=search_matieres&keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      if (data.success) {
        setFilteredMatieres(data.matieres);
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
    if (!nom.trim()) {
      Alert.alert("Erreur", "Veuillez saisir le nom de la matière");
      return false;
    }
    if (!code.trim()) {
      Alert.alert("Erreur", "Le code de la matière est requis");
      return false;
    }
    return true;
  };

  const ajouterMatiere = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    const matiereData = {
      action: 'ajouter_matiere',
      code: code,
      nom: nom,
      description: description,
      type: type,
      niveau_id: niveauSelected.id,
      icone: icone,
      couleur: couleur,
      ordre: parseInt(ordre) || 0,
      statut: statut
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matiereData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Matière ajoutée avec succès");
        resetForm();
        setMode('list');
        loadMatieres();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      Alert.alert("Erreur", error.message || "Impossible d'ajouter la matière");
    } finally {
      setSubmitting(false);
    }
  };

  const modifierMatiere = async () => {
    if (!validateForm()) return;
    if (!currentMatiere?.id) return;
    
    setSubmitting(true);
    
    const matiereData = {
      action: 'modifier_matiere',
      id: currentMatiere.id,
      code: code,
      nom: nom,
      description: description,
      type: type,
      niveau_id: niveauSelected.id,
      icone: icone,
      couleur: couleur,
      ordre: parseInt(ordre) || 0,
      statut: statut
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matiereData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Matière modifiée avec succès");
        resetForm();
        setMode('list');
        loadMatieres();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la modification");
      }
    } catch (error) {
      console.error("Erreur modification:", error);
      Alert.alert("Erreur", error.message || "Impossible de modifier la matière");
    } finally {
      setSubmitting(false);
    }
  };

  const supprimerMatiere = async (id) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=supprimer_matiere&id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Matière supprimée avec succès");
        setShowDeleteModal(false);
        if (mode === 'view') {
          setMode('list');
        }
        loadMatieres();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      Alert.alert("Erreur", error.message || "Impossible de supprimer la matière");
    } finally {
      setSubmitting(false);
    }
  };

  // ============ FONCTIONS UTILITAIRES ============
  
  const resetForm = () => {
    setCategorieSelected('');
    setNiveauSelected(null);
    setNom('');
    setDescription('');
    setType('Matiere');
    setIcone('school');
    setCouleur('#3498db');
    setOrdre('0');
    setStatut('actif');
    generateCode();
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setFilterCategorie('');
    setFilterNiveau('');
    setFilterStatut('');
    setFilteredMatieres(matieresList);
  };

  const applyFilters = () => {
    let filtered = [...matieresList];
    
    if (searchKeyword) {
      filtered = filtered.filter(m => 
        m.nom?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        m.code?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    if (filterCategorie) {
      filtered = filtered.filter(m => m.categorie === filterCategorie);
    }
    
    if (filterNiveau) {
      filtered = filtered.filter(m => m.niveau_nom === filterNiveau);
    }
    
    if (filterStatut) {
      filtered = filtered.filter(m => m.statut === filterStatut);
    }
    
    setFilteredMatieres(filtered);
    setShowFilterModal(false);
  };

  const selectNiveau = (niveau) => {
    setNiveauSelected(niveau);
    setShowNiveauModal(false);
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

  const getStatutColor = (statut) => {
    switch(statut) {
      case 'actif': return '#27ae60';
      case 'inactif': return '#95a5a6';
      default: return '#7f8c8d';
    }
  };

  const getStatutLabel = (statut) => {
    switch(statut) {
      case 'actif': return 'Actif';
      case 'inactif': return 'Inactif';
      default: return statut;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMatieres();
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

  const renderStatutSelector = () => (
    <View style={styles.selectorSection}>
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

  const renderTypeSelector = () => (
    <View style={styles.selectorSection}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowTypeModal(true)}
      >
        <Text style={styles.selectorButtonText}>{type}</Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderIconeSelector = () => (
    <View style={styles.selectorSection}>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowIconeModal(true)}
      >
        <Text style={styles.selectorButtonText}>{icone}</Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCouleurSelector = () => (
    <View style={styles.selectorSection}>
      <TouchableOpacity
        style={[styles.selectorButton, { borderLeftWidth: 5, borderLeftColor: couleur }]}
        onPress={() => setShowCouleurModal(true)}
      >
        <Text style={styles.selectorButtonText}>{couleur}</Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  // ============ RENDU DES ÉCRANS ============
  
  const renderHeader = () => {
    let title = "📚 Gestion des matières";
    let subtitle = "";
    
    if (mode === 'add') {
      title = "➕ Ajouter une matière";
      subtitle = "Remplissez les informations de la matière";
    } else if (mode === 'edit') {
      title = "✏️ Modifier la matière";
      subtitle = "Modifiez les informations de la matière";
    } else if (mode === 'view') {
      title = "📄 Détail de la matière";
      subtitle = currentMatiere?.nom || "";
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
            <Text style={styles.statNumber}>{statistiques.actives || 0}</Text>
            <Text style={styles.statLabel}>Actives</Text>
          </LinearGradient>
          
          <LinearGradient
            colors={['#95a5a6', '#7f8c8d']}
            style={styles.statCard}
          >
            <Text style={styles.statNumber}>{statistiques.inactives || 0}</Text>
            <Text style={styles.statLabel}>Inactives</Text>
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
              searchMatieres(text);
            }}
            placeholder="Rechercher une matière..."
            placeholderTextColor="#95a5a6"
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => {
              setSearchKeyword('');
              setFilteredMatieres(matieresList);
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
      {renderStats()}

      {/* Liste des matières */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des matières...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredMatieres.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📚</Text>
              <Text style={styles.emptyTitle}>Aucune matière trouvée</Text>
              <Text style={styles.emptyText}>
                {matieresList.length === 0 
                  ? "Commencez par ajouter votre première matière"
                  : "Aucune matière ne correspond à votre recherche"}
              </Text>
            </View>
          ) : (
            filteredMatieres.map((matiere) => (
              <TouchableOpacity
                key={matiere.id}
                style={styles.matiereCard}
                onPress={() => loadMatiereById(matiere.id)}
              >
                <View style={[styles.cardColorBar, { backgroundColor: matiere.couleur || '#3498db' }]} />
                
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleContainer}>
                      <Text style={styles.cardIcon}>📚</Text>
                      <View>
                        <Text style={styles.matiereNom}>{matiere.nom}</Text>
                        <Text style={styles.matiereCode}>{matiere.code}</Text>
                        <Text style={styles.matiereType}>{matiere.type || 'Matiere'}</Text>
                      </View>
                    </View>
                    <View style={[styles.statutBadge, { backgroundColor: getStatutColor(matiere.statut) }]}>
                      <Text style={styles.statutBadgeText}>
                        {getStatutLabel(matiere.statut)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.matiereInfos}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>🎓</Text>
                      <Text style={styles.infoText}>
                        {matiere.categorie || ''} {matiere.niveau_nom || 'N/A'}
                      </Text>
                    </View>
                    
                    {matiere.description ? (
                      <Text style={styles.matiereDescription} numberOfLines={2}>
                        {matiere.description}
                      </Text>
                    ) : null}

                    <View style={styles.matiereFooter}>
                      <Text style={styles.ordreText}>Ordre: {matiere.ordre || 0}</Text>
                      <Text style={styles.dateText}>Créé le: {formatDate(matiere.date_creation)}</Text>
                    </View>
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
            placeholder=""
            placeholderTextColor="#95a5a6"
            maxLength={20}
          />
        </View>
      </View>

        {/* Section Catégorie et Niveau */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📌 Classification</Text>
          
          {renderCategorieSelector()}
          {renderNiveauSelector()}
        </View>

        {/* Section Informations */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📝 Informations</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom de la matière</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Ex: Mathématiques"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Type</Text>
            {renderTypeSelector()}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description de la matière..."
              placeholderTextColor="#95a5a6"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Ordre d'affichage</Text>
              <TextInput
                style={styles.input}
                value={ordre}
                onChangeText={setOrdre}
                placeholder="0"
                placeholderTextColor="#95a5a6"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Statut</Text>
              {renderStatutSelector()}
            </View>
          </View>
        </View>

        {/* Section Apparence */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>🎨 Apparence</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Icône</Text>
              {renderIconeSelector()}
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Couleur</Text>
              {renderCouleurSelector()}
            </View>
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
            onPress={mode === 'add' ? ajouterMatiere : modifierMatiere}
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
    if (!currentMatiere) return null;
    
    return (
      <ScrollView style={styles.viewContainer}>
        {/* En-tête */}
        <LinearGradient
          colors={[currentMatiere.couleur || '#3498db', (currentMatiere.couleur || '#3498db') + 'dd']}
          style={styles.viewHeader}
        >
          <View style={styles.viewHeaderTop}>
            <Text style={styles.viewIcon}>📚</Text>
            <View style={[styles.viewStatutBadge, { backgroundColor: getStatutColor(currentMatiere.statut) }]}>
              <Text style={styles.viewStatutText}>
                {getStatutLabel(currentMatiere.statut)}
              </Text>
            </View>
          </View>
          <Text style={styles.viewNom}>{currentMatiere.nom}</Text>
          <Text style={styles.viewCode}>{currentMatiere.code}</Text>
        </LinearGradient>

        {/* Informations */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>📌 Classification</Text>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Catégorie</Text>
            <Text style={styles.viewInfoValue}>{currentMatiere.categorie || 'N/A'}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Niveau</Text>
            <Text style={styles.viewInfoValue}>{currentMatiere.niveau_nom || 'N/A'}</Text>
          </View>
        </View>

        {/* Description */}
        {currentMatiere.description ? (
          <View style={styles.viewSection}>
            <Text style={styles.viewSectionTitle}>📝 Description</Text>
            <Text style={styles.viewText}>{currentMatiere.description}</Text>
          </View>
        ) : null}

        {/* Détails */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>⚙️ Détails</Text>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Type</Text>
            <Text style={styles.viewInfoValue}>{currentMatiere.type || 'Matiere'}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Ordre d'affichage</Text>
            <Text style={styles.viewInfoValue}>{currentMatiere.ordre || 0}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Date de création</Text>
            <Text style={styles.viewInfoValue}>{formatDate(currentMatiere.date_creation)}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Dernière modification</Text>
            <Text style={styles.viewInfoValue}>{formatDate(currentMatiere.date_modification || currentMatiere.date_creation)}</Text>
          </View>
        </View>

        {/* Apparence */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>🎨 Apparence</Text>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Icône</Text>
            <View style={styles.viewInfoValueContainer}>
              <Text style={styles.viewIconPreview}>{currentMatiere.icone || 'school'}</Text>
              <Text style={styles.viewInfoValue}>{currentMatiere.icone || 'school'}</Text>
            </View>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Couleur</Text>
            <View style={styles.viewInfoValueContainer}>
              <View style={[styles.colorPreview, { backgroundColor: currentMatiere.couleur || '#3498db' }]} />
              <Text style={styles.viewInfoValue}>{currentMatiere.couleur || '#3498db'}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.viewActions}>
          <TouchableOpacity
            style={[styles.viewActionButton, styles.editButton]}
            onPress={() => {
              setCurrentMatiere(currentMatiere);
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

      {/* Modal Catégories */}
      {renderSelectionModal(
        showCategorieModal,
        () => setShowCategorieModal(false),
        "Sélectionner une catégorie",
        categories,
        (item) => {
          setCategorieSelected(item);
          setNiveauSelected(null);
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

      {/* Modal Niveaux */}
      {renderSelectionModal(
        showNiveauModal,
        () => setShowNiveauModal(false),
        `Sélectionner un niveau - ${categorieSelected}`,
        niveaux,
        selectNiveau,
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

      {/* Modal Statut */}
      {renderSelectionModal(
        showStatutModal,
        () => setShowStatutModal(false),
        "Statut de la matière",
        STATUTS_MATIERE,
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

      {/* Modal Type */}
      {renderSelectionModal(
        showTypeModal,
        () => setShowTypeModal(false),
        "Sélectionner le type",
        TYPES_MATIERE,
        (item) => {
          setType(item);
          setShowTypeModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={item}
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

      {/* Modal Icônes */}
      {renderSelectionModal(
        showIconeModal,
        () => setShowIconeModal(false),
        "Sélectionner une icône",
        ICONES_DISPONIBLES,
        (item) => {
          setIcone(item);
          setShowIconeModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              icone === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item}</Text>
            </View>
            {icone === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Couleurs */}
      {renderSelectionModal(
        showCouleurModal,
        () => setShowCouleurModal(false),
        "Sélectionner une couleur",
        COULEURS_PREDEFINIES,
        (item) => {
          setCouleur(item);
          setShowCouleurModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              couleur === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item}</Text>
            </View>
            {couleur === item && (
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
                {STATUTS_MATIERE.map((stat, index) => (
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
              Êtes-vous sûr de vouloir supprimer cette matière ?
            </Text>
            <Text style={styles.confirmWarning}>
              Cette action est irréversible et peut affecter les cours associés.
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
                onPress={() => supprimerMatiere(currentMatiere?.id)}
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
  matiereCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardColorBar: {
    width: 8,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  matiereNom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  matiereCode: {
    fontSize: 11,
    color: '#3498db',
  },
  matiereType: {
    fontSize: 10,
    color: '#7f8c8d',
    marginTop: 2,
  },
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statutBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  matiereInfos: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 6,
    width: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#7f8c8d',
    flex: 1,
  },
  matiereDescription: {
    fontSize: 13,
    color: '#5d6d7e',
    marginBottom: 8,
    lineHeight: 18,
  },
  matiereFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  ordreText: {
    fontSize: 11,
    color: '#95a5a6',
  },
  dateText: {
    fontSize: 11,
    color: '#95a5a6',
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
  selectorButtonDisabled: {
    backgroundColor: '#f1f3f4',
    borderColor: '#dee2e6',
    opacity: 0.6,
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
  statutDot: {
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
  textArea: {
    height: 100,
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
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  viewHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewIcon: {
    fontSize: 40,
    color: '#fff',
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
  viewNom: {
    fontSize: 24,
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
    width: 120,
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
  },
  viewText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
  },
  viewIconPreview: {
    fontSize: 16,
    marginRight: 10,
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
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
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmWarning: {
    fontSize: 13,
    color: '#e74c3c',
    marginBottom: 25,
    textAlign: 'center',
    fontStyle: 'italic',
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