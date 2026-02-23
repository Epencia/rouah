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
  FlatList,
  Image
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

// Constantes
const API_BASE_URL = 'https://rouah.net/api/gestion-utilisateur.php';
const ROLE_OPTIONS = [
  { value: 'Superviseur', label: 'Superviseur', color: '#9b59b6', icon: '👑' },
  { value: 'Administrateur', label: 'Administrateur', color: '#e74c3c', icon: '⚙️' },
  { value: 'Assistant', label: 'Assistant', color: '#3498db', icon: '🤝' },
  { value: 'Partenaire', label: 'Partenaire', color: '#27ae60', icon: '👨‍🏫' }
];
const ETAT_OPTIONS = [
  { value: 'actif', label: 'Actif', color: '#27ae60', icon: '✅' },
  { value: 'inactif', label: 'Inactif', color: '#95a5a6', icon: '❌' },
  { value: 'en cours', label: 'En cours', color: '#f39c12', icon: '⏳' }
];

export default function GestionUtilisateurs({ navigation }) {
  // États principaux
  const [mode, setMode] = useState('list'); // list, add, edit, view
  const [utilisateursList, setUtilisateursList] = useState([]);
  const [filteredUtilisateurs, setFilteredUtilisateurs] = useState([]);
  const [currentUtilisateur, setCurrentUtilisateur] = useState(null);
  const [statistiques, setStatistiques] = useState(null);
  
  // États pour les champs du formulaire
  const [utilisateurId, setUtilisateurId] = useState('');
  const [matricule, setMatricule] = useState('');
  const [nomPrenom, setNomPrenom] = useState('');
  const [login, setLogin] = useState('');
  const [mdp, setMdp] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Superviseur');
  const [dateSaisie, setDateSaisie] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoBase64, setPhotoBase64] = useState(null);
  const [type, setType] = useState('');
  const [etat, setEtat] = useState('actif');
  
  // États pour les modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showEtatModal, setShowEtatModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  // États de chargement
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // États pour la recherche et filtres
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterEtat, setFilterEtat] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (mode === 'list') {
      loadUtilisateurs();
      loadStatistiques();
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'edit' && currentUtilisateur) {
      loadUtilisateurForEdit();
    }
  }, [mode, currentUtilisateur]);

  // ============ FONCTIONS DE CHARGEMENT ============
  
  const loadInitialData = async () => {
    try {
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];
      setDateSaisie(formattedDate);
    } catch (error) {
      console.error("Erreur chargement initial:", error);
    }
  };

  const loadUtilisateurs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_utilisateurs`);
      const data = await response.json();
      if (data.success) {
        setUtilisateursList(data.utilisateurs);
        setFilteredUtilisateurs(data.utilisateurs);
      }
    } catch (error) {
      console.error("Erreur chargement utilisateurs:", error);
      Alert.alert("Erreur", "Impossible de charger la liste des utilisateurs");
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

  const loadUtilisateurById = async (id) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=get_utilisateur_by_id&id=${encodeURIComponent(id)}`);
      const data = await response.json();
      if (data.success) {
        setCurrentUtilisateur(data.utilisateur);
        setMode('view');
      } else {
        Alert.alert("Erreur", data.error || "Utilisateur non trouvé");
      }
    } catch (error) {
      console.error("Erreur chargement utilisateur:", error);
      Alert.alert("Erreur", "Impossible de charger l'utilisateur");
    } finally {
      setLoading(false);
    }
  };

  const loadUtilisateurForEdit = async () => {
    try {
      setUtilisateurId(currentUtilisateur.utilisateur_id || '');
      setMatricule(currentUtilisateur.matricule || '');
      setNomPrenom(currentUtilisateur.nom_prenom || '');
      setLogin(currentUtilisateur.login || '');
      setMdp('');
      setTelephone(currentUtilisateur.telephone || '');
      setEmail(currentUtilisateur.email || '');
      setRole(currentUtilisateur.role || 'Superviseur');
      setDateSaisie(currentUtilisateur.date_saisie || '');
      setPhoto(currentUtilisateur.photo || null);
      setPhotoBase64(null);
      setType(currentUtilisateur.type || '');
      setEtat(currentUtilisateur.etat || 'actif');
    } catch (error) {
      console.error("Erreur préparation édition:", error);
    }
  };

  const searchUtilisateurs = async (keyword) => {
    if (!keyword.trim()) {
      setFilteredUtilisateurs(utilisateursList);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=search_utilisateurs&keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      if (data.success) {
        setFilteredUtilisateurs(data.utilisateurs);
      }
    } catch (error) {
      console.error("Erreur recherche:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============ FONCTIONS DE GESTION PHOTO ============
  
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert("Permission refusée", "Nous avons besoin d'accéder à vos photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto(asset.uri);
      setPhotoBase64(asset.base64);
      setType(asset.type || 'image/jpeg');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert("Permission refusée", "Nous avons besoin d'accéder à votre caméra");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setPhoto(asset.uri);
      setPhotoBase64(asset.base64);
      setType(asset.type || 'image/jpeg');
    }
  };

  // ============ FONCTIONS CRUD ============
  
  const validateForm = () => {
    const required = [
      { field: utilisateurId, name: 'ID Utilisateur' },
      { field: nomPrenom, name: 'Nom et prénoms' },
      { field: login, name: 'Login' }
    ];

    if (mode === 'add') {
      required.push({ field: mdp, name: 'Mot de passe' });
    }

    for (let item of required) {
      if (!item.field || !item.field.toString().trim()) {
        Alert.alert("Erreur", `Le champ "${item.name}" est requis`);
        return false;
      }
    }
    
    // Validation email si présent
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert("Erreur", "Format d'email invalide");
        return false;
      }
    }

    return true;
  };

  const ajouterUtilisateur = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    const utilisateurData = {
      action: 'ajouter_utilisateur',
      utilisateur_id: utilisateurId,
      matricule: matricule || null,
      nom_prenom: nomPrenom,
      login: login,
      mdp: mdp,
      telephone: telephone || null,
      email: email || null,
      role: role,
      date_saisie: dateSaisie,
      photo: photoBase64,
      type: type,
      etat: etat
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(utilisateurData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Utilisateur ajouté avec succès");
        resetForm();
        setMode('list');
        loadUtilisateurs();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Erreur soumission:", error);
      Alert.alert("Erreur", error.message || "Impossible d'ajouter l'utilisateur");
    } finally {
      setSubmitting(false);
    }
  };

  const modifierUtilisateur = async () => {
    if (!validateForm()) return;
    if (!currentUtilisateur?.utilisateur_id) return;
    
    setSubmitting(true);
    
    const utilisateurData = {
      action: 'modifier_utilisateur',
      utilisateur_id: currentUtilisateur.utilisateur_id,
      matricule: matricule || null,
      nom_prenom: nomPrenom,
      login: login,
      mdp: mdp || null,
      telephone: telephone || null,
      email: email || null,
      role: role,
      date_saisie: dateSaisie,
      photo: photoBase64,
      type: type,
      etat: etat
    };

    try {
      const response = await fetch(API_BASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(utilisateurData)
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Utilisateur modifié avec succès");
        resetForm();
        setMode('list');
        loadUtilisateurs();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la modification");
      }
    } catch (error) {
      console.error("Erreur modification:", error);
      Alert.alert("Erreur", error.message || "Impossible de modifier l'utilisateur");
    } finally {
      setSubmitting(false);
    }
  };

  const supprimerUtilisateur = async (id) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}?action=supprimer_utilisateur&id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert("Succès", "Utilisateur supprimé avec succès");
        setShowDeleteModal(false);
        if (mode === 'view') {
          setMode('list');
        }
        loadUtilisateurs();
        loadStatistiques();
      } else {
        throw new Error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
      Alert.alert("Erreur", error.message || "Impossible de supprimer l'utilisateur");
    } finally {
      setSubmitting(false);
    }
  };

  // ============ FONCTIONS UTILITAIRES ============
  
  const resetForm = () => {
    setUtilisateurId('');
    setMatricule('');
    setNomPrenom('');
    setLogin('');
    setMdp('');
    setTelephone('');
    setEmail('');
    setRole('Superviseur');
    const today = new Date();
    setDateSaisie(today.toISOString().split('T')[0]);
    setPhoto(null);
    setPhotoBase64(null);
    setType('');
    setEtat('actif');
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setFilterRole('');
    setFilterEtat('');
    setFilteredUtilisateurs(utilisateursList);
  };

  const applyFilters = () => {
    let filtered = [...utilisateursList];
    
    if (searchKeyword) {
      filtered = filtered.filter(u => 
        u.nom_prenom?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        u.matricule?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        u.login?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        u.utilisateur_id?.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }
    
    if (filterRole) {
      filtered = filtered.filter(u => u.role === filterRole);
    }
    
    if (filterEtat) {
      filtered = filtered.filter(u => u.etat === filterEtat);
    }
    
    setFilteredUtilisateurs(filtered);
    setShowFilterModal(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return dateString;
  };

  const getRoleInfo = (roleValue) => {
    return ROLE_OPTIONS.find(r => r.value === roleValue) || ROLE_OPTIONS[0];
  };

  const getEtatInfo = (etatValue) => {
    return ETAT_OPTIONS.find(e => e.value === etatValue) || ETAT_OPTIONS[0];
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUtilisateurs();
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

  const renderRoleSelector = () => {
    const roleInfo = getRoleInfo(role);
    return (
      <View style={styles.selectorSection}>
        <Text style={styles.selectorLabel}>👤 Rôle</Text>
        <TouchableOpacity
          style={[styles.selectorButton, { 
            borderLeftWidth: 5, 
            borderLeftColor: roleInfo.color 
          }]}
          onPress={() => setShowRoleModal(true)}
        >
          <Text style={styles.selectorButtonText}>
            {roleInfo.icon} {roleInfo.label}
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

  const renderPhotoSelector = () => (
    <View style={styles.photoSection}>
      <Text style={styles.selectorLabel}>📸 Photo</Text>
      <TouchableOpacity
        style={styles.photoButton}
        onPress={() => setShowPhotoModal(true)}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderIcon}>📷</Text>
            <Text style={styles.photoPlaceholderText}>Ajouter une photo</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // ============ RENDU DES ÉCRANS ============
  
  const renderHeader = () => {
    let title = "👥 Gestion des utilisateurs";
    let subtitle = "";
    
    if (mode === 'add') {
      title = "➕ Ajouter un utilisateur";
      subtitle = "Remplissez les informations";
    } else if (mode === 'edit') {
      title = "✏️ Modifier l'utilisateur";
      subtitle = "Modifiez les informations";
    } else if (mode === 'view') {
      title = "📄 Détail de l'utilisateur";
      subtitle = currentUtilisateur?.nom_prenom || "";
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
            <Text style={styles.statLabel}>Total utilisateurs</Text>
          </LinearGradient>
          
          {statistiques.par_role?.map((item, index) => {
            const roleInfo = getRoleInfo(item.role);
            return (
              <LinearGradient
                key={index}
                colors={[roleInfo.color, adjustColor(roleInfo.color, -20)]}
                style={styles.statCard}
              >
                <Text style={styles.statNumber}>{item.total || 0}</Text>
                <Text style={styles.statLabel}>{roleInfo.label}</Text>
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
              searchUtilisateurs(text);
            }}
            placeholder="Rechercher par nom, login, matricule..."
            placeholderTextColor="#95a5a6"
          />
          {searchKeyword ? (
            <TouchableOpacity onPress={() => {
              setSearchKeyword('');
              setFilteredUtilisateurs(utilisateursList);
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

      {/* Liste des utilisateurs */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUtilisateurs}
          keyExtractor={(item) => item.utilisateur_id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>Aucun utilisateur trouvé</Text>
              <Text style={styles.emptyText}>
                {utilisateursList.length === 0 
                  ? "Commencez par ajouter votre premier utilisateur"
                  : "Aucun utilisateur ne correspond à votre recherche"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const roleInfo = getRoleInfo(item.role);
            const etatInfo = getEtatInfo(item.etat);
            return (
              <TouchableOpacity
                style={styles.versetCard}
                onPress={() => loadUtilisateurById(item.utilisateur_id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.referenceContainer}>
                    <Text style={styles.referenceIcon}>👤</Text>
                    <View style={styles.userInfo}>
                      <Text style={styles.reference}>{item.nom_prenom}</Text>
                      <Text style={styles.userLogin}>@{item.login}</Text>
                    </View>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: roleInfo.color }]}>
                    <Text style={styles.roleBadgeText}>
                      {roleInfo.icon} {roleInfo.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.userDetails}>
                  <Text style={styles.userMatricule}>Matricule: {item.matricule || 'Non défini'}</Text>
                  <Text style={styles.userEmail}>{item.email || 'Email non défini'}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={[styles.etatBadge, { backgroundColor: etatInfo.color }]}>
                    <Text style={styles.etatBadgeText}>
                      {etatInfo.icon} {etatInfo.label}
                    </Text>
                  </View>
                  <Text style={styles.dateText}>ID: {item.utilisateur_id}</Text>
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
        {/* Section Photo */}
        {renderPhotoSelector()}

        {/* Section Informations */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>📝 Informations</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ID Utilisateur *</Text>
            <TextInput
              style={styles.input}
              value={utilisateurId}
              onChangeText={setUtilisateurId}
              placeholder="Ex: USR-2024-001"
              placeholderTextColor="#95a5a6"
              editable={mode === 'add'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Matricule</Text>
            <TextInput
              style={styles.input}
              value={matricule}
              onChangeText={setMatricule}
              placeholder="Ex: EMP-2024-001"
              placeholderTextColor="#95a5a6"
            />
          </View>

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
            <Text style={styles.inputLabel}>Login *</Text>
            <TextInput
              style={styles.input}
              value={login}
              onChangeText={setLogin}
              placeholder="Ex: jdupont"
              placeholderTextColor="#95a5a6"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {mode === 'add' ? 'Mot de passe *' : 'Mot de passe (laisser vide pour ne pas changer)'}
            </Text>
            <TextInput
              style={styles.input}
              value={mdp}
              onChangeText={setMdp}
              placeholder="********"
              placeholderTextColor="#95a5a6"
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Téléphone</Text>
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
            <Text style={styles.inputLabel}>Email</Text>
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

          {renderRoleSelector()}
          {renderEtatSelector()}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date de saisie</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={dateSaisie}
              editable={false}
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
            onPress={mode === 'add' ? ajouterUtilisateur : modifierUtilisateur}
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
    if (!currentUtilisateur) return null;
    
    const roleInfo = getRoleInfo(currentUtilisateur.role);
    const etatInfo = getEtatInfo(currentUtilisateur.etat);
    
    return (
      <ScrollView style={styles.viewContainer}>
        {/* En-tête */}
        <LinearGradient
          colors={[roleInfo.color, adjustColor(roleInfo.color, -20)]}
          style={styles.viewHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.viewHeaderTop}>
            <Text style={styles.viewIcon}>{roleInfo.icon}</Text>
            <View style={styles.viewRoleBadge}>
              <Text style={styles.viewRoleText}>{roleInfo.label}</Text>
            </View>
          </View>
          
          {currentUtilisateur.photo ? (
            <Image 
              source={{ uri: `data:${currentUtilisateur.type};base64,${currentUtilisateur.photo}` }} 
              style={styles.viewPhoto} 
            />
          ) : (
            <View style={styles.viewPhotoPlaceholder}>
              <Text style={styles.viewPhotoPlaceholderText}>📷</Text>
            </View>
          )}
          
          <Text style={styles.viewNom}>{currentUtilisateur.nom_prenom}</Text>
          <Text style={styles.viewLogin}>@{currentUtilisateur.login}</Text>
          <Text style={styles.viewId}>ID: {currentUtilisateur.utilisateur_id}</Text>
        </LinearGradient>

        {/* Informations */}
        <View style={styles.viewSection}>
          <Text style={styles.viewSectionTitle}>📋 Informations</Text>
          
          {currentUtilisateur.matricule && (
            <View style={styles.viewInfoRow}>
              <Text style={styles.viewInfoLabel}>Matricule</Text>
              <Text style={styles.viewInfoValue}>{currentUtilisateur.matricule}</Text>
            </View>
          )}

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Téléphone</Text>
            <Text style={styles.viewInfoValue}>{currentUtilisateur.telephone || 'Non défini'}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Email</Text>
            <Text style={styles.viewInfoValue}>{currentUtilisateur.email || 'Non défini'}</Text>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Rôle</Text>
            <View style={[styles.viewRoleValue, { backgroundColor: roleInfo.color }]}>
              <Text style={styles.viewRoleValueText}>{roleInfo.icon} {roleInfo.label}</Text>
            </View>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>État</Text>
            <View style={[styles.viewEtatValue, { backgroundColor: etatInfo.color }]}>
              <Text style={styles.viewEtatValueText}>{etatInfo.icon} {etatInfo.label}</Text>
            </View>
          </View>

          <View style={styles.viewInfoRow}>
            <Text style={styles.viewInfoLabel}>Date saisie</Text>
            <Text style={styles.viewInfoValue}>{currentUtilisateur.date_saisie}</Text>
          </View>

          {currentUtilisateur.type && (
            <View style={styles.viewInfoRow}>
              <Text style={styles.viewInfoLabel}>Type image</Text>
              <Text style={styles.viewInfoValue}>{currentUtilisateur.type}</Text>
            </View>
          )}
        </View>

        {/* Actions principales */}
        <View style={styles.viewActions}>
          <TouchableOpacity
            style={[styles.viewActionButton, styles.editButton]}
            onPress={() => {
              setCurrentUtilisateur(currentUtilisateur);
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

      {/* Modal Rôle */}
      {renderSelectionModal(
        showRoleModal,
        () => setShowRoleModal(false),
        "Sélectionner un rôle",
        ROLE_OPTIONS,
        (item) => {
          setRole(item.value);
          setShowRoleModal(false);
        },
        (item, index, onSelect) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.modalItem,
              role === item.value && styles.modalItemSelected
            ]}
            onPress={() => onSelect(item)}
          >
            <View style={[styles.modalItemColor, { backgroundColor: item.color }]}>
              <Text style={styles.modalItemIcon}>{item.icon}</Text>
            </View>
            <View style={styles.modalItemContent}>
              <Text style={styles.modalItemTitle}>{item.label}</Text>
            </View>
            {role === item.value && (
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

      {/* Modal Photo */}
      <Modal
        visible={showPhotoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📸 Choisir une photo</Text>
              <TouchableOpacity onPress={() => setShowPhotoModal(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.photoModalBody}>
              <TouchableOpacity
                style={styles.photoModalOption}
                onPress={() => {
                  takePhoto();
                  setShowPhotoModal(false);
                }}
              >
                <Text style={styles.photoModalIcon}>📷</Text>
                <Text style={styles.photoModalText}>Prendre une photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.photoModalOption}
                onPress={() => {
                  pickImage();
                  setShowPhotoModal(false);
                }}
              >
                <Text style={styles.photoModalIcon}>🖼️</Text>
                <Text style={styles.photoModalText}>Choisir depuis la galerie</Text>
              </TouchableOpacity>

              {photo && (
                <TouchableOpacity
                  style={[styles.photoModalOption, styles.photoModalRemove]}
                  onPress={() => {
                    setPhoto(null);
                    setPhotoBase64(null);
                    setType('');
                    setShowPhotoModal(false);
                  }}
                >
                  <Text style={styles.photoModalIcon}>🗑️</Text>
                  <Text style={styles.photoModalText}>Supprimer la photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

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

              {/* Filtre par rôle */}
              <Text style={styles.filterLabel}>Rôle</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterRole && styles.filterChipActive]}
                  onPress={() => setFilterRole('')}
                >
                  <Text style={[styles.filterChipText, !filterRole && styles.filterChipTextActive]}>Tous</Text>
                </TouchableOpacity>
                {ROLE_OPTIONS.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.filterChip, 
                      filterRole === option.value && styles.filterChipActive,
                      { borderColor: option.color }
                    ]}
                    onPress={() => setFilterRole(option.value)}
                  >
                    <Text style={[
                      styles.filterChipText, 
                      filterRole === option.value && styles.filterChipTextActive
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
              Êtes-vous sûr de vouloir supprimer cet utilisateur ?
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
                onPress={() => supprimerUtilisateur(currentUtilisateur?.utilisateur_id)}
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

// Styles supplémentaires pour la gestion des photos
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

  photoSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderIcon: {
    fontSize: 40,
    color: '#95a5a6',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 5,
  },
  photoModalBody: {
    padding: 20,
  },
  photoModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  photoModalIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  photoModalText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  photoModalRemove: {
    backgroundColor: '#fdedec',
    borderColor: '#e74c3c',
  },
  viewPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginVertical: 15,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  viewPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginVertical: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  viewPhotoPlaceholderText: {
    fontSize: 40,
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userLogin: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  userDetails: {
    marginBottom: 10,
  },
  userMatricule: {
    fontSize: 13,
    color: '#34495e',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  etatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  etatBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  viewRoleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewRoleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewNom: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  viewLogin: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 8,
  },
  viewId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  viewRoleValue: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewRoleValueText: {
    color: '#fff',
    fontSize: 12,
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
  inputDisabled: {
    backgroundColor: '#ecf0f1',
    color: '#7f8c8d',
  },
});

