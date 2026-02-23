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

// Constantes
const API_BASE_URL = 'https://rouah.net/api/gestion-niveau.php';
const CATEGORIES_NIVEAUX = [
  'Collèges', 'Lycées', 'BTS', 'Licences', 'Masters', 'Concours', 'Examens', 'Certifications'
];
const COULEURS_PREDEFINIES = [
  '#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b'
];
const STATUT_OPTIONS = [
  { value: 'actif', label: 'Actif', color: '#27ae60' },
  { value: 'inactif', label: 'Inactif', color: '#95a5a6' },
  { value: 'en cours', label: 'En cours', color: '#f39c12' }
];

export default function GestionNiveau({ navigation }) {
  // États principaux
  const [mode, setMode] = useState('list'); // list, add, edit, view
  const [niveauxList, setNiveauxList] = useState([]);
  const [filteredNiveaux, setFilteredNiveaux] = useState([]);
  const [currentNiveau, setCurrentNiveau] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  
  // États pour les champs du formulaire
  const [code, setCode] = useState('');
  const [nom, setNom] = useState('');
  const [description, setDescription] = useState('');
  const [categorie, setCategorie] = useState('');
  const [couleurPrincipale, setCouleurPrincipale] = useState('#3498db');
  const [couleurSecondaire, setCouleurSecondaire] = useState('#2980b9');
  const [ordre, setOrdre] = useState('0');
  // Nouveaux champs
  const [prixNormal, setPrixNormal] = useState('');
  const [prixReduction, setPrixReduction] = useState('');
  const [statut, setStatut] = useState('actif');
  
  // États pour les modals
  const [showCategorieModal, setShowCategorieModal] = useState(false);
  const [showCouleurPrincipaleModal, setShowCouleurPrincipaleModal] = useState(false);
  const [showCouleurSecondaireModal, setShowCouleurSecondaireModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatutModal, setShowStatutModal] = useState(false);
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour la recherche et filtres
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (mode === 'list') {
      loadNiveaux();
      loadStatistiques();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && currentNiveau) {
      loadNiveauForEdit();
    }
  }, [mode, currentNiveau]);

  // ============ FONCTIONS DE CHARGEMENT ============
  
  const loadInitialData = async () => {
    try {
      await generateCode();
    } catch (error) {
      console.error("Erreur chargement initial:", error);
      Alert.alert("Erreur", "Impossible de charger les données");
    }
  };

  const loadNiveaux = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_niveaux`);
      const data = await response.json();
      if (data.success) {
        setNiveauxList(data.niveaux);
        setFilteredNiveaux(data.niveaux);
      }
    } catch (error) {
      console.error("Erreur chargement niveaux:", error);
      Alert.alert("Erreur", "Impossible de charger la liste des niveaux");
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

  const loadNiveauById = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_niveau_by_id&id=${id}`);
      const data = await response.json();
      if (data.success) {
        setCurrentNiveau(data.niveau);
        setMode('view');
      } else {
        Alert.alert("Erreur", data.error || "Niveau non trouvé");
      }
    } catch (error) {
      console.error("Erreur chargement niveau:", error);
      Alert.alert("Erreur", "Impossible de charger le niveau");
    } finally {
      setLoading(false);
    }
  };

  const loadNiveauForEdit = async () => {
    try {
      setCode(currentNiveau.code || '');
      setNom(currentNiveau.nom || '');
      setDescription(currentNiveau.description || '');
      setCategorie(currentNiveau.categorie || '');
      setCouleurPrincipale(currentNiveau.couleur_principale || '#3498db');
      setCouleurSecondaire(currentNiveau.couleur_secondaire || '#2980b9');
      setOrdre((currentNiveau.ordre || 0).toString());
      // Nouveaux champs
      setPrixNormal(currentNiveau.prix_normal ? currentNiveau.prix_normal.toString() : '');
      setPrixReduction(currentNiveau.prix_reduction ? currentNiveau.prix_reduction.toString() : '');
      setStatut(currentNiveau.statut || 'actif');
    } catch (error) {
      console.error("Erreur préparation édition:", error);
    }
  };

  const searchNiveaux = async (keyword) => {
    if (!keyword.trim()) {
      setFilteredNiveaux(niveauxList);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=search_niveaux&keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      if (data.success) {
        setFilteredNiveaux(data.niveaux);
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
    if (!categorie) {
      Alert.alert("Erreur", "Veuillez sélectionner une catégorie");
      return false;
    }
    if (!nom.trim()) {
      Alert.alert("Erreur", "Veuillez saisir le nom du niveau");
      return false;
    }
    if (!code.trim()) {
      Alert.alert("Erreur", "Le code du niveau est requis");
      return false;
    }
    // Validation des prix
    if (prixNormal && isNaN(parseInt(prixNormal))) {
      Alert.alert("Erreur", "Le prix normal doit être un nombre valide");
      return false;
    }
    if (prixReduction && isNaN(parseInt(prixReduction))) {
      Alert.alert("Erreur", "Le prix réduit doit être un nombre valide");
      return false;
    }
    return true;
  };

  const ajouterNiveau = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    const niveauData = {
      action: 'ajouter_niveau',
      code: code,
      nom: nom,
      description: description,
      categorie: categorie,
      couleur_principale: couleurPrincipale,
      couleur_secondaire: couleurSecondaire,
      ordre: parseInt(ordre) || 0,
      // Nouveaux champs
      prix_normal: prixNormal ? parseInt(prixNormal) : null,
      prix_reduction: prixReduction ? parseInt(prixReduction) : null,
      statut: statut
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(niveauData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Niveau ajouté avec succès");
        resetForm();
        setMode('list');
        loadNiveaux();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      Alert.alert("Erreur", error.message || "Impossible d'ajouter le niveau");
    } finally {
      setSubmitting(false);
    }
  };

  const modifierNiveau = async () => {
    if (!validateForm()) return;
    if (!currentNiveau?.id) return;
    
    setSubmitting(true);
    
    const niveauData = {
      action: 'modifier_niveau',
      id: currentNiveau.id,
      code: code,
      nom: nom,
      description: description,
      categorie: categorie,
      couleur_principale: couleurPrincipale,
      couleur_secondaire: couleurSecondaire,
      ordre: parseInt(ordre) || 0,
      // Nouveaux champs
      prix_normal: prixNormal ? parseInt(prixNormal) : null,
      prix_reduction: prixReduction ? parseInt(prixReduction) : null,
      statut: statut
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(niveauData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Niveau modifié avec succès");
        resetForm();
        setMode('list');
        loadNiveaux();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la modification");
      }
    } catch (error) {
      console.error("Erreur modification:", error);
      Alert.alert("Erreur", error.message || "Impossible de modifier le niveau");
    } finally {
      setSubmitting(false);
    }
  };

  const supprimerNiveau = async (id) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=supprimer_niveau&id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Niveau supprimé avec succès");
        setShowDeleteModal(false);
        if (mode === 'view') {
          setMode('list');
        }
        loadNiveaux();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      Alert.alert("Erreur", error.message || "Impossible de supprimer le niveau");
    } finally {
      setSubmitting(false);
    }
  };

  // ============ FONCTIONS UTILITAIRES ============
  
  const resetForm = () => {
    setCategorie('');
    setNom('');
    setDescription('');
    setCouleurPrincipale('#3498db');
    setCouleurSecondaire('#2980b9');
    setOrdre('0');
    // Nouveaux champs
    setPrixNormal('');
    setPrixReduction('');
    setStatut('actif');
    generateCode();
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setFilterCategorie('');
    setFilteredNiveaux(niveauxList);
  };

  const applyFilters = () => {
    let filtered = [...niveauxList];
    
    if (searchKeyword) {
      filtered = filtered.filter(n => 
        n.nom?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        n.code?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        n.description?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    if (filterCategorie) {
      filtered = filtered.filter(n => n.categorie === filterCategorie);
    }
    
    setFilteredNiveaux(filtered);
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

  const formatPrix = (prix) => {
    if (!prix) return null;
    return prix.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNiveaux();
    loadStatistiques();
  };

  // ============ RENDU DES SÉLECTEURS ============
  
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

  const renderCategorieSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>📁 Catégorie</Text>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setShowCategorieModal(true)}
      >
        <Text style={styles.selectorButtonText}>
          {categorie || "Sélectionner une catégorie"}
        </Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCouleurPrincipaleSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>🎨 Couleur principale</Text>
      <TouchableOpacity
        style={[styles.selectorButton, { borderLeftWidth: 5, borderLeftColor: couleurPrincipale }]}
        onPress={() => setShowCouleurPrincipaleModal(true)}
      >
        <Text style={styles.selectorButtonText}>{couleurPrincipale}</Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCouleurSecondaireSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>🎨 Couleur secondaire</Text>
      <TouchableOpacity
        style={[styles.selectorButton, { borderLeftWidth: 5, borderLeftColor: couleurSecondaire }]}
        onPress={() => setShowCouleurSecondaireModal(true)}
      >
        <Text style={styles.selectorButtonText}>{couleurSecondaire}</Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatutSelector = () => (
    <View style={styles.selectorSection}>
      <Text style={styles.selectorLabel}>📊 Statut</Text>
      <TouchableOpacity
        style={[styles.selectorButton, { 
          borderLeftWidth: 5, 
          borderLeftColor: STATUT_OPTIONS.find(s => s.value === statut)?.color || '#95a5a6' 
        }]}
        onPress={() => setShowStatutModal(true)}
      >
        <Text style={styles.selectorButtonText}>
          {STATUT_OPTIONS.find(s => s.value === statut)?.label || statut}
        </Text>
        <Text style={styles.selectorButtonIcon}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPrixSection = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>💰 Tarification</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Prix normal (FCFA)</Text>
        <TextInput
          style={styles.input}
          value={prixNormal}
          onChangeText={setPrixNormal}
          placeholder="Ex: 15000"
          placeholderTextColor="#95a5a6"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Prix réduit (FCFA) - optionnel</Text>
        <TextInput
          style={styles.input}
          value={prixReduction}
          onChangeText={setPrixReduction}
          placeholder="Ex: 12000"
          placeholderTextColor="#95a5a6"
          keyboardType="numeric"
        />
      </View>

      {prixNormal && prixReduction && parseInt(prixReduction) < parseInt(prixNormal) && (
        <View style={styles.reductionPreview}>
          <Text style={styles.reductionText}>
            Réduction: {Math.round(((parseInt(prixNormal) - parseInt(prixReduction)) / parseInt(prixNormal)) * 100)}%
          </Text>
        </View>
      )}
    </View>
  );

  // ============ RENDU DES ÉCRANS ============
  
  const renderHeader = () => {
    let title = "🎓 Gestion des niveaux";
    let subtitle = "";
    
    if (mode === 'add') {
      title = "➕ Ajouter un niveau";
      subtitle = "Remplissez les informations du niveau";
    } else if (mode === 'edit') {
      title = "✏️ Modifier le niveau";
      subtitle = "Modifiez les informations du niveau";
    } else if (mode === 'view') {
      title = "📄 Détail du niveau";
      subtitle = currentNiveau?.nom || "";
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
            <Text style={styles.statLabel}>Total niveaux</Text>
          </LinearGradient>
          
          {statistiques.par_categorie?.map((cat, index) => (
            <LinearGradient
              key={index}
              colors={['#9b59b6', '#8e44ad']}
              style={styles.statCard}
            >
              <Text style={styles.statNumber}>{cat.total || 0}</Text>
              <Text style={styles.statLabel}>{cat.categorie}</Text>
            </LinearGradient>
          ))}
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
              searchNiveaux(text);
            }}
            placeholder="Rechercher un niveau..."
            placeholderTextColor="#95a5a6"
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => {
              setSearchKeyword('');
              setFilteredNiveaux(niveauxList);
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

      {/* Liste des niveaux */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des niveaux...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredNiveaux.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎓</Text>
              <Text style={styles.emptyTitle}>Aucun niveau trouvé</Text>
              <Text style={styles.emptyText}>
                {niveauxList.length === 0 
                  ? "Commencez par ajouter votre premier niveau"
                  : "Aucun niveau ne correspond à votre recherche"}
              </Text>
            </View>
          ) : (
            filteredNiveaux.map((niveau) => (
              <TouchableOpacity
                key={niveau.id}
                style={styles.niveauCard}
                onPress={() => loadNiveauById(niveau.id)}
              >
                <LinearGradient
                  colors={[niveau.couleur_principale || '#3498db', niveau.couleur_secondaire || '#2980b9']}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardIcon}>🎓</Text>
                        <View>
                          <Text style={styles.niveauNom}>{niveau.nom}</Text>
                          <Text style={styles.niveauCode}>{niveau.code}</Text>
                        </View>
                      </View>
                      <View style={styles.categorieBadge}>
                        <Text style={styles.categorieBadgeText}>{niveau.categorie}</Text>
                      </View>
                    </View>

                    {niveau.description ? (
                      <Text style={styles.niveauDescription} numberOfLines={2}>
                        {niveau.description}
                      </Text>
                    ) : null}

                    <View style={styles.niveauFooter}>
                      <Text style={styles.ordreText}>Ordre: {niveau.ordre || 0}</Text>
                    </View>

                    {/* Prix et statut */}
                    {(niveau.prix_normal || niveau.prix_reduction) && (
                      <View style={styles.prixContainer}>
                        {niveau.prix_normal && (
                          <Text style={styles.prixNormal}>
                            {formatPrix(niveau.prix_normal)} FCFA
                          </Text>
                        )}
                        {niveau.prix_reduction && niveau.prix_reduction < niveau.prix_normal && (
                          <Text style={styles.prixReduit}>
                            {formatPrix(niveau.prix_reduction)} FCFA
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Badge statut */}
                    {niveau.statut && (
                      <View style={[
                        styles.statutBadgeSmall,
                        { 
                          backgroundColor: 
                            niveau.statut === 'actif' ? '#27ae60' :
                            niveau.statut === 'inactif' ? '#95a5a6' : '#f39c12'
                        }
                      ]}>
                        <Text style={styles.statutBadgeSmallText}>
                          {niveau.statut === 'actif' ? 'Actif' :
                           niveau.statut === 'inactif' ? 'Inactif' : 'En cours'}
                        </Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
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

        {/* Section Informations */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📝 Informations</Text>
          
          {renderCategorieSelector()}
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom du niveau</Text>
            <TextInput
              style={styles.input}
              value={nom}
              onChangeText={setNom}
              placeholder="Ex: 6ème, Terminale, Licence 1..."
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description du niveau..."
              placeholderTextColor="#95a5a6"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
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
        </View>

        {/* Section Apparence */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>🎨 Apparence</Text>
          
          {renderCouleurPrincipaleSelector()}
          {renderCouleurSecondaireSelector()}

          <View style={styles.colorPreviewContainer}>
            <LinearGradient
              colors={[couleurPrincipale, couleurSecondaire]}
              style={styles.gradientPreview}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.previewText}>Aperçu du dégradé</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Section Tarification */}
        {renderPrixSection()}

        {/* Section Statut */}
        {renderStatutSelector()}

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
            onPress={mode === 'add' ? ajouterNiveau : modifierNiveau}
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
    if (!currentNiveau) return null;
    
    return (
      <ScrollView style={styles.viewContainer}>
        {/* En-tête */}
        <LinearGradient
          colors={[currentNiveau.couleur_principale || '#3498db', currentNiveau.couleur_secondaire || '#2980b9']}
          style={styles.viewHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.viewHeaderTop}>
            <Text style={styles.viewIcon}>🎓</Text>
            <View style={styles.viewCategorieBadge}>
              <Text style={styles.viewCategorieText}>{currentNiveau.categorie}</Text>
            </View>
          </View>
          <Text style={styles.viewNom}>{currentNiveau.nom}</Text>
          <Text style={styles.viewCode}>{currentNiveau.code}</Text>
        </LinearGradient>

        {/* Description */}
        {currentNiveau.description ? (
          <View style={styles.viewSection}>
            <Text style={styles.viewSectionTitle}>📝 Description</Text>
            <Text style={styles.viewText}>{currentNiveau.description}</Text>
          </View>
        ) : null}

        {/* Détails */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>⚙️ Détails</Text>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Ordre d'affichage</Text>
            <Text style={styles.viewInfoValue}>{currentNiveau.ordre || 0}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Date de création</Text>
            <Text style={styles.viewInfoValue}>{formatDate(currentNiveau.date_creation)}</Text>
          </View>
        </View>

        {/* Tarification */}
        {currentNiveau.prix_normal && (
          <View style={styles.viewSection}>
            <Text style={styles.viewSectionTitle}>💰 Tarification</Text>
            
            <View style={styles.viewInfoRow}>
              <Text style={styles.viewInfoLabel}>Prix normal</Text>
              <Text style={styles.viewInfoValue}>
                {formatPrix(currentNiveau.prix_normal)} FCFA
              </Text>
            </View>
            
            {currentNiveau.prix_reduction && (
              <View style={styles.viewInfoRow}>
                <Text style={styles.viewInfoLabel}>Prix réduit</Text>
                <Text style={[styles.viewInfoValue, { color: '#27ae60' }]}>
                  {formatPrix(currentNiveau.prix_reduction)} FCFA
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Statut */}
        {currentNiveau.statut && (
          <View style={styles.viewSection}>
            <Text style={styles.viewSectionTitle}>📊 Statut</Text>
            
            <View style={styles.viewInfoRow}>
              <Text style={styles.viewInfoLabel}>Statut actuel</Text>
              <View style={[
                styles.statutBadge,
                { 
                  backgroundColor: 
                    currentNiveau.statut === 'actif' ? '#27ae60' :
                    currentNiveau.statut === 'inactif' ? '#95a5a6' : '#f39c12'
                }
              ]}>
                <Text style={styles.statutBadgeText}>
                  {currentNiveau.statut === 'actif' ? 'Actif' :
                   currentNiveau.statut === 'inactif' ? 'Inactif' : 'En cours'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Statistiques */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>📊 Statistiques</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{currentNiveau.nb_matieres || 0}</Text>
              <Text style={styles.statItemLabel}>Matières</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{currentNiveau.nb_cours || 0}</Text>
              <Text style={styles.statItemLabel}>Cours</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statItemValue}>{currentNiveau.nb_evaluations || 0}</Text>
              <Text style={styles.statItemLabel}>Évaluations</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.viewActions}>
          <TouchableOpacity
            style={[styles.viewActionButton, styles.editButton]}
            onPress={() => {
              setCurrentNiveau(currentNiveau);
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
        CATEGORIES_NIVEAUX,
        (item) => {
          setCategorie(item);
          setShowCategorieModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              categorie === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: '#3498db' }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item}</Text>
            </View>
            {categorie === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Couleur Principale */}
      {renderSelectionModal(
        showCouleurPrincipaleModal,
        () => setShowCouleurPrincipaleModal(false),
        "Sélectionner une couleur principale",
        COULEURS_PREDEFINIES,
        (item) => {
          setCouleurPrincipale(item);
          setShowCouleurPrincipaleModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              couleurPrincipale === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item}</Text>
            </View>
            {couleurPrincipale === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Couleur Secondaire */}
      {renderSelectionModal(
        showCouleurSecondaireModal,
        () => setShowCouleurSecondaireModal(false),
        "Sélectionner une couleur secondaire",
        COULEURS_PREDEFINIES,
        (item) => {
          setCouleurSecondaire(item);
          setShowCouleurSecondaireModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              couleurSecondaire === item && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item}</Text>
            </View>
            {couleurSecondaire === item && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Statut */}
      {renderSelectionModal(
        showStatutModal,
        () => setShowStatutModal(false),
        "Sélectionner un statut",
        STATUT_OPTIONS,
        (item) => {
          setStatut(item.value);
          setShowStatutModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              statut === item.value && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item.color }]} />
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.label}</Text>
            </View>
            {statut === item.value && (
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
                {CATEGORIES_NIVEAUX.map((cat, index) => (
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
              Êtes-vous sûr de vouloir supprimer ce niveau ?
            </Text>
            {currentNiveau?.nb_matieres > 0 && (
              <Text style={styles.confirmWarning}>
                ⚠️ Ce niveau contient {currentNiveau.nb_matieres} matière(s). La suppression est impossible.
              </Text>
            )}
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.confirmButtonText}>Annuler</Text>
              </TouchableOpacity>
              {currentNiveau?.nb_matieres === 0 && (
                <TouchableOpacity
                  style={[styles.confirmButton, styles.deleteConfirmButton]}
                  onPress={() => supprimerNiveau(currentNiveau?.id)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Supprimer</Text>
                  )}
                </TouchableOpacity>
              )}
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
  niveauCard: {
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    padding: 15,
  },
  cardContent: {
    flex: 1,
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
    color: '#fff',
  },
  niveauNom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  niveauCode: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  categorieBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categorieBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  niveauDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
    lineHeight: 18,
  },
  niveauFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  ordreText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  dateText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  prixContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  prixNormal: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  prixReduit: {
    fontSize: 14,
    color: '#f1c40f',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statutBadgeSmall: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statutBadgeSmallText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
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
  colorPreviewContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  gradientPreview: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewText: {
    color: '#fff',
    fontWeight: '600',
  },
  reductionPreview: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  reductionText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '600',
    textAlign: 'center',
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
  viewCategorieBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewCategorieText: {
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
  viewText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statItemValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  statItemLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e9ecef',
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
  statutBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statutBadgeText: {
    color: '#fff',
    fontSize: 12,
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
    fontWeight: '600',
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