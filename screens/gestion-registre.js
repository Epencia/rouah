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
const API_BASE_URL = 'https://rouah.net/api/gestion-registre.php';
const CATEGORIE_OPTIONS = [
  { value: 'Formation', label: 'Formation', color: '#3498db', icon: '📚' },
  { value: 'Stage', label: 'Stage', color: '#27ae60', icon: '💼' },
  { value: 'Personnel', label: 'Personnel', color: '#f39c12', icon: '👤' }
];
const SEXE_OPTIONS = [
  { value: 'Masculin', label: 'Masculin', color: '#3498db', icon: '👨' },
  { value: 'Feminin', label: 'Féminin', color: '#e83e8c', icon: '👩' }
];
const ETAT_OPTIONS = [
  { value: 'actif', label: 'Actif', color: '#27ae60', icon: '✅' },
  { value: 'inactif', label: 'Inactif', color: '#95a5a6', icon: '❌' },
  { value: 'en cours', label: 'En cours', color: '#f39c12', icon: '⏳' },
  { value: 'en attente', label: 'En attente', color: '#e83e8c', icon: '⏳' }
];

export default function GestionRegistres({ navigation }) {
  // États principaux
  const [mode, setMode] = useState('list'); // list, add, edit, view
  const [registresList, setRegistresList] = useState([]);
  const [filteredRegistres, setFilteredRegistres] = useState([]);
  const [currentRegistre, setCurrentRegistre] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  
  // États pour les champs du formulaire
  const [code, setCode] = useState('');
  const [matricule, setMatricule] = useState('');
  const [categorie, setCategorie] = useState('Formation');
  const [nomPrenom, setNomPrenom] = useState('');
  const [nationalite, setNationalite] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [lieuNaissance, setLieuNaissance] = useState('');
  const [sexe, setSexe] = useState('Masculin');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [diplome, setDiplome] = useState('');
  const [specialite, setSpecialite] = useState('');
  const [contrat, setContrat] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [duree, setDuree] = useState('');
  const [signataire, setSignataire] = useState('');
  const [encadreur, setEncadreur] = useState('');
  const [memoire, setMemoire] = useState('');
  const [appreciation, setAppreciation] = useState('');
  const [organisme, setOrganisme] = useState('');
  const [observation, setObservation] = useState('');
  const [dateDelivrance, setDateDelivrance] = useState('');
  const [etat, setEtat] = useState('actif');
  
  // États pour les modals
  const [showCategorieModal, setShowCategorieModal] = useState(false);
  const [showSexeModal, setShowSexeModal] = useState(false);
  const [showEtatModal, setShowEtatModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour la recherche et filtres
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterEtat, setFilterEtat] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (mode === 'list') {
      loadRegistres();
      loadStatistiques();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && currentRegistre) {
      loadRegistreForEdit();
    }
  }, [mode, currentRegistre]);

  // ============ FONCTIONS DE CHARGEMENT ============
  
  const loadInitialData = async () => {
    try {
      // Pas de génération automatique
    } catch (error) {
      console.error("Erreur chargement initial:", error);
      Alert.alert("Erreur", "Impossible de charger les données");
    }
  };

  const loadRegistres = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_registres`);
      const data = await response.json();
      if (data.success) {
        setRegistresList(data.registres);
        setFilteredRegistres(data.registres);
      }
    } catch (error) {
      console.error("Erreur chargement registres:", error);
      Alert.alert("Erreur", "Impossible de charger la liste des registres");
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

  const loadRegistreByCode = async (code) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_registre_by_code&code=${encodeURIComponent(code)}`);
      const data = await response.json();
      if (data.success) {
        setCurrentRegistre(data.registre);
        setMode('view');
      } else {
        Alert.alert("Erreur", data.error || "Registre non trouvé");
      }
    } catch (error) {
      console.error("Erreur chargement registre:", error);
      Alert.alert("Erreur", "Impossible de charger le registre");
    } finally {
      setLoading(false);
    }
  };

  const loadRegistreForEdit = async () => {
    try {
      setCode(currentRegistre.code || '');
      setMatricule(currentRegistre.matricule || '');
      setCategorie(currentRegistre.categorie || 'Formation');
      setNomPrenom(currentRegistre.nom_prenom || '');
      setNationalite(currentRegistre.nationalite || '');
      setDateNaissance(currentRegistre.date_naissance || '');
      setLieuNaissance(currentRegistre.lieu_naissance || '');
      setSexe(currentRegistre.sexe || 'Masculin');
      setTelephone(currentRegistre.telephone || '');
      setEmail(currentRegistre.email || '');
      setDiplome(currentRegistre.diplome || '');
      setSpecialite(currentRegistre.specialite || '');
      setContrat(currentRegistre.contrat || '');
      setDateDebut(currentRegistre.date_debut || '');
      setDateFin(currentRegistre.date_fin || '');
      setDuree(currentRegistre.duree || '');
      setSignataire(currentRegistre.signataire || '');
      setEncadreur(currentRegistre.encadreur || '');
      setMemoire(currentRegistre.memoire || '');
      setAppreciation(currentRegistre.appreciation || '');
      setOrganisme(currentRegistre.organisme || '');
      setObservation(currentRegistre.observation || '');
      setDateDelivrance(currentRegistre.date_delivrance || '');
      setEtat(currentRegistre.etat || 'actif');
    } catch (error) {
      console.error("Erreur préparation édition:", error);
    }
  };

  const searchRegistres = async (keyword) => {
    if (!keyword.trim()) {
      setFilteredRegistres(registresList);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=search_registres&keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      if (data.success) {
        setFilteredRegistres(data.registres);
      }
    } catch (error) {
      console.error("Erreur recherche:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============ FONCTIONS CRUD ============
  
  const validateForm = () => {
    const required = [
      { field: code, name: 'Code' },
      { field: matricule, name: 'Matricule' },
      { field: nomPrenom, name: 'Nom et prénoms' },
      { field: etat, name: 'État' }
    ];

    for (let item of required) {
      if (!item.field || !item.field.toString().trim()) {
        Alert.alert("Erreur", `Le champ "${item.name}" est requis`);
        return false;
      }
    }
    
    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Erreur", "Format d'email invalide");
      return false;
    }

    return true;
  };

  const ajouterRegistre = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    const registreData = {
      action: 'ajouter_registre',
      code, matricule, categorie, nom_prenom: nomPrenom,
      nationalite, date_naissance: dateNaissance, lieu_naissance: lieuNaissance,
      sexe, telephone, email, diplome, specialite, contrat,
      date_debut: dateDebut, date_fin: dateFin, duree,
      signataire, encadreur, memoire, appreciation,
      organisme, observation, date_delivrance: dateDelivrance, etat
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registreData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Registre ajouté avec succès");
        resetForm();
        setMode('list');
        loadRegistres();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      Alert.alert("Erreur", error.message || "Impossible d'ajouter le registre");
    } finally {
      setSubmitting(false);
    }
  };

  const modifierRegistre = async () => {
    if (!validateForm()) return;
    if (!currentRegistre?.code) return;
    
    setSubmitting(true);
    
    const registreData = {
      action: 'modifier_registre',
      code: currentRegistre.code,
      matricule, categorie, nom_prenom: nomPrenom,
      nationalite, date_naissance: dateNaissance, lieu_naissance: lieuNaissance,
      sexe, telephone, email, diplome, specialite, contrat,
      date_debut: dateDebut, date_fin: dateFin, duree,
      signataire, encadreur, memoire, appreciation,
      organisme, observation, date_delivrance: dateDelivrance, etat
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registreData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Registre modifié avec succès");
        resetForm();
        setMode('list');
        loadRegistres();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la modification");
      }
    } catch (error) {
      console.error("Erreur modification:", error);
      Alert.alert("Erreur", error.message || "Impossible de modifier le registre");
    } finally {
      setSubmitting(false);
    }
  };

  const supprimerRegistre = async (code) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=supprimer_registre&code=${encodeURIComponent(code)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Registre supprimé avec succès");
        setShowDeleteModal(false);
        if (mode === 'view') {
          setMode('list');
        }
        loadRegistres();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      Alert.alert("Erreur", error.message || "Impossible de supprimer le registre");
    } finally {
      setSubmitting(false);
    }
  };

  // ============ FONCTIONS UTILITAIRES ============
  
  const resetForm = () => {
    setCode('');
    setMatricule('');
    setCategorie('Formation');
    setNomPrenom('');
    setNationalite('');
    setDateNaissance('');
    setLieuNaissance('');
    setSexe('Masculin');
    setTelephone('');
    setEmail('');
    setDiplome('');
    setSpecialite('');
    setContrat('');
    setDateDebut('');
    setDateFin('');
    setDuree('');
    setSignataire('');
    setEncadreur('');
    setMemoire('');
    setAppreciation('');
    setOrganisme('');
    setObservation('');
    setDateDelivrance('');
    setEtat('actif');
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setFilterCategorie('');
    setFilterEtat('');
    setFilteredRegistres(registresList);
  };

  const applyFilters = () => {
    let filtered = [...registresList];
    
    if (searchKeyword) {
      filtered = filtered.filter(r => 
        r.nom_prenom?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        r.matricule?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        r.code?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    if (filterCategorie) {
      filtered = filtered.filter(r => r.categorie === filterCategorie);
    }
    
    if (filterEtat) {
      filtered = filtered.filter(r => r.etat === filterEtat);
    }
    
    setFilteredRegistres(filtered);
    setShowFilterModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dateString;
  };

  const getCategorieInfo = (categorieValue) => {
    return CATEGORIE_OPTIONS.find(c => c.value === categorieValue) || CATEGORIE_OPTIONS[0];
  };

  const getSexeInfo = (sexeValue) => {
    return SEXE_OPTIONS.find(s => s.value === sexeValue) || SEXE_OPTIONS[0];
  };

  const getEtatInfo = (etatValue) => {
    return ETAT_OPTIONS.find(e => e.value === etatValue) || ETAT_OPTIONS[0];
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRegistres();
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

  const renderCategorieSelector = () => {
    const categorieInfo = getCategorieInfo(categorie);
    return (
      <View style={styles.selectorSection}>
        <Text style={styles.selectorLabel}>📁 Catégorie</Text>
        <TouchableOpacity
          style={[styles.selectorButton, { 
            borderLeftWidth: 5, 
            borderLeftColor: categorieInfo.color 
          }]}
          onPress={() => setShowCategorieModal(true)}
        >
          <Text style={styles.selectorButtonText}>
            {categorieInfo.icon} {categorieInfo.label}
          </Text>
          <Text style={styles.selectorButtonIcon}>▼</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSexeSelector = () => {
    const sexeInfo = getSexeInfo(sexe);
    return (
      <View style={styles.selectorSection}>
        <Text style={styles.selectorLabel}>👤 Sexe</Text>
        <TouchableOpacity
          style={[styles.selectorButton, { 
            borderLeftWidth: 5, 
            borderLeftColor: sexeInfo.color 
          }]}
          onPress={() => setShowSexeModal(true)}
        >
          <Text style={styles.selectorButtonText}>
            {sexeInfo.icon} {sexeInfo.label}
          </Text>
          <Text style={styles.selectorButtonIcon}>▼</Text>
        </TouchableOpacity>
      </View>
    );
  };

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
    let title = "📋 Gestion des registres";
    let subtitle = "";
    
    if (mode === 'add') {
      title = "➕ Ajouter un registre";
      subtitle = "Remplissez toutes les informations";
    } else if (mode === 'edit') {
      title = "✏️ Modifier le registre";
      subtitle = "Modifiez les informations du registre";
    } else if (mode === 'view') {
      title = "📄 Détail du registre";
      subtitle = currentRegistre?.nom_prenom || "";
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
            <Text style={styles.statLabel}>Total registres</Text>
          </LinearGradient>
          
          {statistiques.par_categorie?.map((item, index) => {
            const categorieInfo = getCategorieInfo(item.categorie);
            return (
              <LinearGradient
                key={index}
                colors={[categorieInfo.color, adjustColor(categorieInfo.color, -20)]}
                style={styles.statCard}
              >
                <Text style={styles.statNumber}>{item.total || 0}</Text>
                <Text style={styles.statLabel}>{categorieInfo.label}</Text>
              </LinearGradient>
            );
          })}

          {statistiques.par_etat?.map((item, index) => {
            const etatInfo = getEtatInfo(item.etat);
            return (
              <LinearGradient
                key={`etat-${index}`}
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
              searchRegistres(text);
            }}
            placeholder="Rechercher par nom, matricule ou code..."
            placeholderTextColor="#95a5a6"
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => {
              setSearchKeyword('');
              setFilteredRegistres(registresList);
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

      {/* Liste des registres */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des registres...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRegistres}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Aucun registre trouvé</Text>
              <Text style={styles.emptyText}>
                {registresList.length === 0 
                  ? "Commencez par ajouter votre premier registre"
                  : "Aucun registre ne correspond à votre recherche"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const categorieInfo = getCategorieInfo(item.categorie);
            const etatInfo = getEtatInfo(item.etat);
            return (
              <TouchableOpacity
                style={styles.registreCard}
                onPress={() => loadRegistreByCode(item.code)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.referenceContainer}>
                    <Text style={styles.referenceIcon}>👤</Text>
                    <Text style={styles.reference}>{item.nom_prenom}</Text>
                  </View>
                  <View style={[styles.etatBadge, { backgroundColor: categorieInfo.color }]}>
                    <Text style={styles.etatBadgeText}>
                      {categorieInfo.icon} {categorieInfo.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.texte} numberOfLines={2}>
                  {item.matricule} • {item.organisme}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>Code: {item.code}</Text>
                  <View style={[styles.etatBadge, { backgroundColor: etatInfo.color }]}>
                    <Text style={styles.etatBadgeText}>
                      {etatInfo.icon} {item.etat}
                    </Text>
                  </View>
                </View>
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
        {/* Section Informations générales */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📝 Informations générales</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Code *</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="Ex: REG-2024-001"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Matricule *</Text>
            <TextInput
              style={styles.input}
              value={matricule}
              onChangeText={setMatricule}
              placeholder="Ex: MAT-2024-001"
              placeholderTextColor="#95a5a6"
            />
          </View>

          {renderCategorieSelector()}
          {renderSexeSelector()}
          

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom et prénoms *</Text>
            <TextInput
              style={styles.input}
              value={nomPrenom}
              onChangeText={setNomPrenom}
              placeholder="Ex: Jean Dupont"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nationalité *</Text>
            <TextInput
              style={styles.input}
              value={nationalite}
              onChangeText={setNationalite}
              placeholder="Ex: Française"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date de naissance * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={dateNaissance}
              onChangeText={setDateNaissance}
              placeholder="1990-01-01"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lieu de naissance *</Text>
            <TextInput
              style={styles.input}
              value={lieuNaissance}
              onChangeText={setLieuNaissance}
              placeholder="Ex: Paris"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Téléphone *</Text>
            <TextInput
              style={styles.input}
              value={telephone}
              onChangeText={setTelephone}
              placeholder="Ex: +33 6 12 34 56 78"
              placeholderTextColor="#95a5a6"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Ex: jean.dupont@email.com"
              placeholderTextColor="#95a5a6"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Diplôme *</Text>
            <TextInput
              style={styles.input}
              value={diplome}
              onChangeText={setDiplome}
              placeholder="Ex: Licence, Master, etc."
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Spécialité *</Text>
            <TextInput
              style={styles.input}
              value={specialite}
              onChangeText={setSpecialite}
              placeholder="Ex: Informatique, Gestion, etc."
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contrat *</Text>
            <TextInput
              style={styles.input}
              value={contrat}
              onChangeText={setContrat}
              placeholder="Type de contrat"
              placeholderTextColor="#95a5a6"
            />
          </View>
        </View>

        {/* Section Stage/Formation */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📅 Stage/Formation</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date de début * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={dateDebut}
              onChangeText={setDateDebut}
              placeholder="2024-01-01"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date de fin * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={dateFin}
              onChangeText={setDateFin}
              placeholder="2024-12-31"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Durée *</Text>
            <TextInput
              style={styles.input}
              value={duree}
              onChangeText={setDuree}
              placeholder="Ex: 6 mois"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Signataire *</Text>
            <TextInput
              style={styles.input}
              value={signataire}
              onChangeText={setSignataire}
              placeholder="Nom du signataire"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Encadreur *</Text>
            <TextInput
              style={styles.input}
              value={encadreur}
              onChangeText={setEncadreur}
              placeholder="Nom de l'encadreur"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mémoire (optionnel)</Text>
            <TextInput
              style={styles.input}
              value={memoire}
              onChangeText={setMemoire}
              placeholder="Titre du mémoire"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Appréciation *</Text>
            <TextInput
              style={styles.input}
              value={appreciation}
              onChangeText={setAppreciation}
              placeholder="Ex: Très bien, Excellent, etc."
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Organisme *</Text>
            <TextInput
              style={styles.input}
              value={organisme}
              onChangeText={setOrganisme}
              placeholder="Nom de l'organisme"
              placeholderTextColor="#95a5a6"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Observation *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={observation}
              onChangeText={setObservation}
              placeholder="Observations..."
              placeholderTextColor="#95a5a6"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date de délivrance * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={dateDelivrance}
              onChangeText={setDateDelivrance}
              placeholder="2024-12-31"
              placeholderTextColor="#95a5a6"
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
            onPress={mode === 'add' ? ajouterRegistre : modifierRegistre}
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
    if (!currentRegistre) return null;
    
    const categorieInfo = getCategorieInfo(currentRegistre.categorie);
    const sexeInfo = getSexeInfo(currentRegistre.sexe);
    const etatInfo = getEtatInfo(currentRegistre.etat);
    
    return (
      <ScrollView style={styles.viewContainer}>
        {/* En-tête */}
        <LinearGradient
          colors={[categorieInfo.color, adjustColor(categorieInfo.color, -20)]}
          style={styles.viewHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.viewHeaderTop}>
            <Text style={styles.viewIcon}>{categorieInfo.icon}</Text>
            <View style={styles.viewEtatBadge}>
              <Text style={styles.viewEtatText}>{categorieInfo.label}</Text>
            </View>
          </View>
          <Text style={styles.viewReference}>{currentRegistre.nom_prenom}</Text>
          <Text style={[styles.viewCode, { color: 'rgba(255,255,255,0.9)' }]}>
            {currentRegistre.code} • {currentRegistre.matricule}
          </Text>
        </LinearGradient>

        {/* Informations personnelles */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>👤 Informations personnelles</Text>
          
          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Sexe</Text>
            <Text style={styles.viewInfoValue}>{sexeInfo.icon} {currentRegistre.sexe}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Nationalité</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.nationalite}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Date naissance</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.date_naissance}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Lieu naissance</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.lieu_naissance}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Téléphone</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.telephone}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Email</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.email}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Diplôme</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.diplome}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Spécialité</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.specialite}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Contrat</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.contrat}</Text>
          </View>
        </View>

        {/* Stage/Formation */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>📅 Stage/Formation</Text>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Période</Text>
            <Text style={styles.viewInfoValue}>
              {currentRegistre.date_debut} au {currentRegistre.date_fin}
            </Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Durée</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.duree}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Signataire</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.signataire}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Encadreur</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.encadreur}</Text>
          </View>

          {currentRegistre.memoire && (
            <View style={styles.viewInfoRow}>
              <Text style={styles.viewInfoLabel}>Mémoire</Text>
              <Text style={styles.viewInfoValue}>{currentRegistre.memoire}</Text>
            </View>
          )}

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Appréciation</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.appreciation}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Organisme</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.organisme}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Observation</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.observation}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Délivrance</Text>
            <Text style={styles.viewInfoValue}>{currentRegistre.date_delivrance}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>État</Text>
            <View style={[styles.viewEtatValue, { backgroundColor: etatInfo.color }]}>
              <Text style={styles.viewEtatValueText}>
                {etatInfo.icon} {currentRegistre.etat}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions principales */}
        <View style={styles.viewActions}>
          <TouchableOpacity
            style={[styles.viewActionButton, styles.editButton]}
            onPress={() => {
              setCurrentRegistre(currentRegistre);
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

      {/* Modal Catégorie */}
      {renderSelectionModal(
        showCategorieModal,
        () => setShowCategorieModal(false),
        "Sélectionner une catégorie",
        CATEGORIE_OPTIONS,
        (item) => {
          setCategorie(item.value);
          setShowCategorieModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              categorie === item.value && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item.color }]}>
              <Text style={styles.modalItemIcon}>{item.icon}</Text>
            </View>
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.label}</Text>
            </View>
            {categorie === item.value && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

      {/* Modal Sexe */}
      {renderSelectionModal(
        showSexeModal,
        () => setShowSexeModal(false),
        "Sélectionner le sexe",
        SEXE_OPTIONS,
        (item) => {
          setSexe(item.value);
          setShowSexeModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              sexe === item.value && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item.color }]}>
              <Text style={styles.modalItemIcon}>{item.icon}</Text>
            </View>
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.label}</Text>
            </View>
            {sexe === item.value && (
              <Text style={styles.modalItemCheck}>✓</Text>
            )}
          </TouchableOpacity>
        )
      )}

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

              {/* Filtre par catégorie */}
              <Text style={styles.filterLabel}>Catégorie</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterCategorie && styles.filterChipActive]}
                  onPress={() => setFilterCategorie('')}
                >
                  <Text style={[styles.filterChipText, !filterCategorie && styles.filterChipTextActive]}>Tous</Text>
                </TouchableOpacity>
                {CATEGORIE_OPTIONS.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterChip, 
                      filterCategorie === option.value && styles.filterChipActive,
                      { borderColor: option.color }
                    ]}
                    onPress={() => setFilterCategorie(option.value)}
                  >
                    <Text style={[
                      styles.filterChipText, 
                      filterCategorie === option.value && styles.filterChipTextActive
                    ]}>
                      {option.icon} {option.label}
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
              Êtes-vous sûr de vouloir supprimer ce registre ?
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
                onPress={() => supprimerRegistre(currentRegistre?.code)}
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
  registreCard: {
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 10,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
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
    height: 80,
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
  viewCode: {
    fontSize: 14,
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
  viewEtatValue: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewEtatValueText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});