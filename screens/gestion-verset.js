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
  FlatList
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// Constantes
const API_BASE_URL = 'https://rouah.net/api/gestion-verset.php';
const ETAT_OPTIONS = [
  { value: 'actif', label: 'actif', color: '#f39c12', icon: '📝' },
  { value: 'En cours', label: 'En cours', color: '#3498db', icon: '🔄' },
  { value: 'incatif', label: 'inactif', color: '#9b59b6', icon: '📖' }
];

export default function GestionVersets({ navigation }) {
  // États principaux
  const [mode, setMode] = useState('list'); // list, add, edit, view
  const [versetsList, setVersetsList] = useState([]);
  const [filteredVersets, setFilteredVersets] = useState([]);
  const [currentVerset, setCurrentVerset] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  
  // États pour les champs du formulaire
  const [reference, setReference] = useState('');
  const [texte, setTexte] = useState('');
  const [etat, setEtat] = useState('À mémoriser');
  
  // États pour les modals
  const [showEtatModal, setShowEtatModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour la recherche et filtres
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterEtat, setFilterEtat] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (mode === 'list') {
      loadVersets();
      loadStatistiques();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && currentVerset) {
      loadVersetForEdit();
    }
  }, [mode, currentVerset]);

  // ============ FONCTIONS DE CHARGEMENT ============
  
  const loadInitialData = async () => {
    try {
      // Pas de génération automatique de référence
    } catch (error) {
      console.error("Erreur chargement initial:", error);
      Alert.alert("Erreur", "Impossible de charger les données");
    }
  };

  const loadVersets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_versets`);
      const data = await response.json();
      if (data.success) {
        setVersetsList(data.versets);
        setFilteredVersets(data.versets);
      }
    } catch (error) {
      console.error("Erreur chargement versets:", error);
      Alert.alert("Erreur", "Impossible de charger la liste des versets");
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

  const loadVersetById = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_verset_by_id&id=${id}`);
      const data = await response.json();
      if (data.success) {
        setCurrentVerset(data.verset);
        setMode('view');
      } else {
        Alert.alert("Erreur", data.error || "Verset non trouvé");
      }
    } catch (error) {
      console.error("Erreur chargement verset:", error);
      Alert.alert("Erreur", "Impossible de charger le verset");
    } finally {
      setLoading(false);
    }
  };

  const loadVersetForEdit = async () => {
    try {
      setReference(currentVerset.reference || '');
      setTexte(currentVerset.texte || '');
      setEtat(currentVerset.etat || 'À mémoriser');
    } catch (error) {
      console.error("Erreur préparation édition:", error);
    }
  };

  const searchVersets = async (keyword) => {
    if (!keyword.trim()) {
      setFilteredVersets(versetsList);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=search_versets&keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      if (data.success) {
        setFilteredVersets(data.versets);
      }
    } catch (error) {
      console.error("Erreur recherche:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============ FONCTIONS CRUD ============
  
  const validateForm = () => {
    if (!reference.trim()) {
      Alert.alert("Erreur", "Veuillez saisir la référence du verset");
      return false;
    }
    if (!texte.trim()) {
      Alert.alert("Erreur", "Veuillez saisir le texte du verset");
      return false;
    }
    return true;
  };

  const ajouterVerset = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    const versetData = {
      action: 'ajouter_verset',
      reference: reference,
      texte: texte,
      etat: etat
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versetData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Verset ajouté avec succès");
        resetForm();
        setMode('list');
        loadVersets();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      Alert.alert("Erreur", error.message || "Impossible d'ajouter le verset");
    } finally {
      setSubmitting(false);
    }
  };

  const modifierVerset = async () => {
    if (!validateForm()) return;
    if (!currentVerset?.id) return;
    
    setSubmitting(true);
    
    const versetData = {
      action: 'modifier_verset',
      id: currentVerset.id,
      reference: reference,
      texte: texte,
      etat: etat
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(versetData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Verset modifié avec succès");
        resetForm();
        setMode('list');
        loadVersets();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la modification");
      }
    } catch (error) {
      console.error("Erreur modification:", error);
      Alert.alert("Erreur", error.message || "Impossible de modifier le verset");
    } finally {
      setSubmitting(false);
    }
  };

  const supprimerVerset = async (id) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=supprimer_verset&id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Verset supprimé avec succès");
        setShowDeleteModal(false);
        if (mode === 'view') {
          setMode('list');
        }
        loadVersets();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      Alert.alert("Erreur", error.message || "Impossible de supprimer le verset");
    } finally {
      setSubmitting(false);
    }
  };

  const changerEtat = async (id, nouvelEtat) => {
    setSubmitting(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'changer_etat',
          id: id,
          etat: nouvelEtat
        })
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", `État changé en "${nouvelEtat}"`);
        loadVersets();
        loadStatistiques();
        if (mode === 'view' && currentVerset?.id === id) {
          setCurrentVerset({...currentVerset, etat: nouvelEtat});
        }
      } else {
        throw new Error(data.error || "Erreur lors du changement d'état");
      }
    } catch (error) {
      console.error("Erreur changement état:", error);
      Alert.alert("Erreur", error.message || "Impossible de changer l'état");
    } finally {
      setSubmitting(false);
    }
  };

  // ============ FONCTIONS UTILITAIRES ============
  
  const resetForm = () => {
    setReference('');
    setTexte('');
    setEtat('À mémoriser');
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setFilterEtat('');
    setFilteredVersets(versetsList);
  };

  const applyFilters = () => {
    let filtered = [...versetsList];
    
    if (searchKeyword) {
      filtered = filtered.filter(v => 
        v.reference?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        v.texte?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    if (filterEtat) {
      filtered = filtered.filter(v => v.etat === filterEtat);
    }
    
    setFilteredVersets(filtered);
    setShowFilterModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEtatInfo = (etatValue) => {
    return ETAT_OPTIONS.find(e => e.value === etatValue) || ETAT_OPTIONS[0];
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVersets();
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

  const renderEtatSelector = () => {
    const etatInfo = getEtatInfo(etat);
    return (
      <View style={styles.selectorSection}>
        <Text style={styles.selectorLabel}>📊 État</Text>
        <TouchableOpacity
          style={[styles.selectorButton, { 
            borderLeftWidth: 5, 
            borderLeftColor: etatInfo.color 
          }]}
          onPress={() => setShowEtatModal(true)}
        >
          <Text style={styles.selectorButtonText}>
            {etatInfo.icon} {etatInfo.label}
          </Text>
          <Text style={styles.selectorButtonIcon}>▼</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ============ RENDU DES ÉCRANS ============
  
  const renderHeader = () => {
    let title = "📖 Gestion des versets";
    let subtitle = "";
    
    if (mode === 'add') {
      title = "➕ Ajouter un verset";
      subtitle = "Saisissez la référence et le texte du verset";
    } else if (mode === 'edit') {
      title = "✏️ Modifier le verset";
      subtitle = "Modifiez les informations du verset";
    } else if (mode === 'view') {
      title = "📄 Détail du verset";
      subtitle = currentVerset?.reference || "";
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
            <Text style={styles.statLabel}>Total versets</Text>
          </LinearGradient>
          
          {statistiques.par_etat?.map((item, index) => {
            const etatInfo = getEtatInfo(item.etat);
            return (
              <LinearGradient
                key={index}
                colors={[etatInfo.color, adjustColor(etatInfo.color, -20)]}
                style={styles.statCard}
              >
                <Text style={styles.statNumber}>{item.total || 0}</Text>
                <Text style={styles.statLabel}>{etatInfo.label}</Text>
              </LinearGradient>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const adjustColor = (color, percent) => {
    // Fonction simple pour assombrir une couleur
    return color;
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
              searchVersets(text);
            }}
            placeholder="Rechercher un verset (référence ou texte)..."
            placeholderTextColor="#95a5a6"
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => {
              setSearchKeyword('');
              setFilteredVersets(versetsList);
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

      {/* Liste des versets */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des versets...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredVersets}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyTitle}>Aucun verset trouvé</Text>
              <Text style={styles.emptyText}>
                {versetsList.length === 0 
                  ? "Commencez par ajouter votre premier verset"
                  : "Aucun verset ne correspond à votre recherche"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const etatInfo = getEtatInfo(item.etat);
            return (
              <TouchableOpacity
                style={styles.versetCard}
                onPress={() => loadVersetById(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.referenceContainer}>
                    <Text style={styles.referenceIcon}>📌</Text>
                    <Text style={styles.reference}>{item.reference}</Text>
                  </View>
                  <View style={[styles.etatBadge, { backgroundColor: etatInfo.color }]}>
                    <Text style={styles.etatBadgeText}>
                      {etatInfo.icon} {etatInfo.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.texte} numberOfLines={3}>
                  {item.texte}
                </Text>

                
              </TouchableOpacity>
            );
          }}
        />
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
        {/* Section Informations */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📝 Informations du verset</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Référence *</Text>
            <TextInput
              style={styles.input}
              value={reference}
              onChangeText={setReference}
              placeholder="Ex: Jean 3:16, Psaume 23:1, etc."
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Texte du verset *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={texte}
              onChangeText={setTexte}
              placeholder="Saisissez le texte du verset..."
              placeholderTextColor="#95a5a6"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {renderEtatSelector()}
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
            onPress={mode === 'add' ? ajouterVerset : modifierVerset}
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
    if (!currentVerset) return null;
    
    const etatInfo = getEtatInfo(currentVerset.etat);
    
    return (
      <ScrollView style={styles.viewContainer}>
        {/* En-tête */}
        <LinearGradient
          colors={[etatInfo.color, adjustColor(etatInfo.color, -20)]}
          style={styles.viewHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.viewHeaderTop}>
            <Text style={styles.viewIcon}>{etatInfo.icon}</Text>
            <View style={styles.viewEtatBadge}>
              <Text style={styles.viewEtatText}>{etatInfo.label}</Text>
            </View>
          </View>
          <Text style={styles.viewReference}>{currentVerset.reference}</Text>
        </LinearGradient>

        {/* Texte du verset */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>📖 Texte</Text>
          <Text style={styles.viewTexte}>{currentVerset.texte}</Text>
        </View>

        {/* Détails */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>⚙️ Détails</Text>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>ID</Text>
            <Text style={styles.viewInfoValue}>#{currentVerset.id}</Text>
          </View>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Référence</Text>
            <Text style={styles.viewInfoValue}>{currentVerset.reference}</Text>
          </View>
          
        </View>

        {/* Actions rapides - Changement d'état */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>🔄 Changer l'état</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.etatActions}>
            {ETAT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.etatActionButton,
                  { backgroundColor: option.color },
                  currentVerset.etat === option.value && styles.etatActionButtonActive
                ]}
                onPress={() => changerEtat(currentVerset.id, option.value)}
                disabled={submitting || currentVerset.etat === option.value}
              >
                <Text style={styles.etatActionIcon}>{option.icon}</Text>
                <Text style={styles.etatActionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Actions principales */}
        <View style={styles.viewActions}>
          <TouchableOpacity
            style={[styles.viewActionButton, styles.editButton]}
            onPress={() => {
              setCurrentVerset(currentVerset);
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
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      {renderHeader()}
      
      {mode === 'list' && renderListMode()}
      {(mode === 'add' || mode === 'edit') && renderFormMode()}
      {mode === 'view' && renderViewMode()}

      {/* MODALS */}

      {/* Modal État */}
      {renderSelectionModal(
        showEtatModal,
        () => setShowEtatModal(false),
        "Sélectionner un état",
        ETAT_OPTIONS,
        (item) => {
          setEtat(item.value);
          setShowEtatModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              etat === item.value && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item.color }]}>
              <Text style={styles.modalItemIcon}>{item.icon}</Text>
            </View>
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.label}</Text>
            </View>
            {etat === item.value && (
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

              {/* Filtre par état */}
              <Text style={styles.filterLabel}>État</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterEtat && styles.filterChipActive]}
                  onPress={() => setFilterEtat('')}
                >
                  <Text style={[styles.filterChipText, !filterEtat && styles.filterChipTextActive]}>Tous</Text>
                </TouchableOpacity>
                {ETAT_OPTIONS.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterChip, 
                      filterEtat === option.value && styles.filterChipActive,
                      { borderColor: option.color }
                    ]}
                    onPress={() => setFilterEtat(option.value)}
                  >
                    <Text style={[
                      styles.filterChipText, 
                      filterEtat === option.value && styles.filterChipTextActive
                    ]}>
                      {option.icon} {option.label}
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
              Êtes-vous sûr de vouloir supprimer ce verset ?
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
                onPress={() => supprimerVerset(currentVerset?.id)}
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
  versetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  referenceIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#7f8c8d',
  },
  reference: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  etatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  etatBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  texte: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dateText: {
    fontSize: 10,
    color: '#95a5a6',
    fontStyle: 'italic',
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
    height: 120,
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
  },
  viewEtatBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewEtatText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewReference: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
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
  viewTexte: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
    fontStyle: 'italic',
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
  etatActions: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  etatActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    opacity: 0.7,
  },
  etatActionButtonActive: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#fff',
  },
  etatActionIcon: {
    fontSize: 16,
    marginRight: 5,
    color: '#fff',
  },
  etatActionText: {
    fontSize: 13,
    color: '#fff',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemIcon: {
    fontSize: 20,
    color: '#fff',
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