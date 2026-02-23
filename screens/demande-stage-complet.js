import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_BASE_URL = 'https://rouah.net/api/';

export default function DemandeStageComplet({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [loadingNiveaux, setLoadingNiveaux] = useState(false);
  const [loadingFilieres, setLoadingFilieres] = useState(false);
  
  // Données
  const [niveaux, setNiveaux] = useState([]);
  const [filieres, setFilieres] = useState([]);
  
  // Sélections
  const [selectedNiveau, setSelectedNiveau] = useState(null);
  const [selectedFiliere, setSelectedFiliere] = useState(null);
  
  // Modals
  const [showNiveauModal, setShowNiveauModal] = useState(false);
  const [showFiliereModal, setShowFiliereModal] = useState(false);
  const [showSexeModal, setShowSexeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState({
    naissance: false,
    debut: false
  });
  
  // Formulaire
  const [formData, setFormData] = useState({
    nom_prenom: '',
    date_naissance: '',
    lieu_naissance: '',
    sexe: '',
    telephone: '',
    email: '',
    date_debut: '',
    nationalite: 'Ivoirienne',
    organisme: 'MANDIGO'
  });
  
  const [errors, setErrors] = useState({});

  // Charger les niveaux au montage
  useEffect(() => {
    fetchNiveaux();
  }, []);

  // Charger les filières quand un niveau est sélectionné
  useEffect(() => {
    if (selectedNiveau) {
      fetchFilieres(selectedNiveau.id);
    } else {
      setFilieres([]);
      setSelectedFiliere(null);
    }
  }, [selectedNiveau]);

  const fetchNiveaux = async () => {
    setLoadingNiveaux(true);
    try {
      const response = await fetch(`${API_BASE_URL}get-niveaux.php?categorie=stages`);
      const result = await response.json();
      
      if (result.success) {
        setNiveaux(result.data);
      } else {
        Alert.alert('Erreur', 'Impossible de charger les niveaux');
      }
    } catch (error) {
      console.error('Erreur chargement niveaux:', error);
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
    } finally {
      setLoadingNiveaux(false);
    }
  };

  const fetchFilieres = async (niveauId) => {
    setLoadingFilieres(true);
    setFilieres([]);
    try {
      const response = await fetch(`${API_BASE_URL}get-matieres.php?niveau=${niveauId}`);
      const result = await response.json();
      
      if (result.success) {
        setFilieres(result.data);
      } else {
        Alert.alert('Erreur', 'Impossible de charger les filières');
      }
    } catch (error) {
      console.error('Erreur chargement filières:', error);
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
    } finally {
      setLoadingFilieres(false);
    }
  };

  const validateForm = () => {
    let newErrors = {};
    
    if (!selectedNiveau) newErrors.niveau = 'Veuillez sélectionner un niveau';
    if (!selectedFiliere) newErrors.filiere = 'Veuillez sélectionner une filière';
    if (!formData.nom_prenom.trim()) newErrors.nom_prenom = 'Nom et prénom requis';
    if (!formData.date_naissance) newErrors.date_naissance = 'Date de naissance requise';
    if (!formData.lieu_naissance.trim()) newErrors.lieu_naissance = 'Lieu de naissance requis';
    if (!formData.sexe) newErrors.sexe = 'Sexe requis';
    if (!formData.telephone.trim()) newErrors.telephone = 'Téléphone requis';
    else if (!/^[0-9]{8,}$/.test(formData.telephone.replace(/\s/g, ''))) {
      newErrors.telephone = 'Numéro de téléphone invalide (8 chiffres minimum)';
    }
    if (!formData.email.trim()) newErrors.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email invalide';
    }
    if (!formData.date_debut) newErrors.date_debut = 'Date de début requise';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDateChange = (event, selectedDate, type) => {
    setShowDatePicker(prev => ({ ...prev, [type]: false }));
    
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        [type === 'naissance' ? 'date_naissance' : 'date_debut']: dateStr
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}demande-stage.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          niveau_id: selectedNiveau.id,
          matiere_id: selectedFiliere.id,
          niveau_code: selectedNiveau.code,
          matiere_code: selectedFiliere.code
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert(
          'Succès',
          `Votre demande de stage a été enregistrée avec succès\n\nCode: ${result.data.code}\nMatricule: ${result.data.matricule}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Une erreur est survenue');
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const renderSelectionButton = (label, value, onPress, icon, loading = false, error = null) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectionButton, error && styles.inputError]}
        onPress={onPress}
        disabled={loading}
      >
        <View style={styles.selectionButtonLeft}>
          <Icon name={icon} size={20} color="#414d63" style={styles.selectionIcon} />
          {loading ? (
            <ActivityIndicator size="small" color="#414d63" />
          ) : (
            <Text style={[styles.selectionButtonText, !value && styles.placeholderText]}>
              {value || `Sélectionnez ${label.toLowerCase()}`}
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={20} color="#95a5a6" />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const renderInput = (label, icon, field, options = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrapper, errors[field] && styles.inputError]}>
        <Icon name={icon} size={20} color="#414d63" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={formData[field]}
          onChangeText={(text) => {
            setFormData({ ...formData, [field]: text });
            if (errors[field]) setErrors({ ...errors, [field]: null });
          }}
          placeholder={options.placeholder || `Entrez ${label.toLowerCase()}`}
          placeholderTextColor="#95a5a6"
          keyboardType={options.keyboardType || 'default'}
          editable={!options.disabled}
        />
      </View>
      {errors[field] && (
        <Text style={styles.errorText}>{errors[field]}</Text>
      )}
    </View>
  );

  const renderModal = (visible, onClose, title, data, onSelect, loading) => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="large" color="#414d63" />
              <Text style={styles.modalLoadingText}>Chargement...</Text>
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                // Pour les niveaux, on utilise item.nom
                // Pour les filières, on utilise item.matiere (car l'API retourne "matiere" comme clé)
                const displayName = item.nom || item.matiere || item.titre;
                const displayCode = item.code;
                
                return (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <View style={styles.modalOptionContent}>
                      <Text style={styles.modalOptionTitle}>{displayName}</Text>
                      {displayCode && (
                        <Text style={styles.modalOptionCode}>{displayCode}</Text>
                      )}
                    </View>
                    <Icon name="chevron-right" size={20} color="#95a5a6" />
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
              ListEmptyComponent={() => (
                <View style={styles.modalEmpty}>
                  <Text style={styles.modalEmptyText}>Aucune donnée disponible</Text>
                </View>
              )}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Sélection du niveau et de la filière */}
          <View style={styles.selectionCard}>
            <Text style={styles.selectionCardTitle}>1. Choisissez votre filière</Text>
            
            {renderSelectionButton(
              'Niveau',
              selectedNiveau?.nom,
              () => setShowNiveauModal(true),
              'school',
              loadingNiveaux,
              errors.niveau
            )}
            
            {renderSelectionButton(
              'Filière',
              selectedFiliere?.matiere, // Changé de nom à matiere pour correspondre à l'API
              () => selectedNiveau ? setShowFiliereModal(true) : Alert.alert('Info', 'Veuillez d\'abord sélectionner un niveau'),
              'book',
              loadingFilieres,
              errors.filiere
            )}
          </View>

          {/* Formulaire */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>2. Vos informations personnelles</Text>

            {renderInput('Nom et prénom', 'person', 'nom_prenom')}

            {/* Date de naissance */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date de naissance</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, errors.date_naissance && styles.inputError]}
                onPress={() => setShowDatePicker({ ...showDatePicker, naissance: true })}
              >
                <Icon name="cake" size={20} color="#414d63" style={styles.inputIcon} />
                <Text style={[styles.input, !formData.date_naissance && styles.placeholderText]}>
                  {formData.date_naissance ? formatDate(formData.date_naissance) : 'Sélectionnez votre date de naissance'}
                </Text>
              </TouchableOpacity>
              {errors.date_naissance && (
                <Text style={styles.errorText}>{errors.date_naissance}</Text>
              )}
            </View>

            {renderInput('Lieu de naissance', 'place', 'lieu_naissance')}

            {/* Sexe */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Sexe</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, errors.sexe && styles.inputError]}
                onPress={() => setShowSexeModal(true)}
              >
                <Icon name="wc" size={20} color="#414d63" style={styles.inputIcon} />
                <Text style={[styles.input, !formData.sexe && styles.placeholderText]}>
                  {formData.sexe || 'Sélectionnez votre sexe'}
                </Text>
              </TouchableOpacity>
              {errors.sexe && (
                <Text style={styles.errorText}>{errors.sexe}</Text>
              )}
            </View>

            {renderInput('Téléphone', 'phone', 'telephone', { 
              keyboardType: 'phone-pad',
              placeholder: 'Ex: 0123456789'
            })}

            {renderInput('Email', 'email', 'email', { 
              keyboardType: 'email-address',
              placeholder: 'exemple@email.com'
            })}

            {/* Date de début */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Date de début souhaitée</Text>
              <TouchableOpacity
                style={[styles.inputWrapper, errors.date_debut && styles.inputError]}
                onPress={() => setShowDatePicker({ ...showDatePicker, debut: true })}
              >
                <Icon name="event" size={20} color="#414d63" style={styles.inputIcon} />
                <Text style={[styles.input, !formData.date_debut && styles.placeholderText]}>
                  {formData.date_debut ? formatDate(formData.date_debut) : 'Sélectionnez une date de début'}
                </Text>
              </TouchableOpacity>
              {errors.date_debut && (
                <Text style={styles.errorText}>{errors.date_debut}</Text>
              )}
            </View>
          </View>

          {/* Bouton de soumission */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Envoyer la demande</Text>
                <Icon name="send" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Modals */}
        {renderModal(
          showNiveauModal,
          () => setShowNiveauModal(false),
          'Sélectionnez votre niveau',
          niveaux,
          (item) => setSelectedNiveau(item),
          loadingNiveaux
        )}

        {renderModal(
          showFiliereModal,
          () => setShowFiliereModal(false),
          'Sélectionnez votre filière',
          filieres,
          (item) => setSelectedFiliere(item),
          loadingFilieres
        )}

        {/* Modal sexe */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showSexeModal}
          onRequestClose={() => setShowSexeModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowSexeModal(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sélectionnez votre sexe</Text>
                <TouchableOpacity onPress={() => setShowSexeModal(false)}>
                  <Icon name="close" size={24} color="#2c3e50" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFormData({ ...formData, sexe: 'Masculin' });
                  setShowSexeModal(false);
                }}
              >
                <Icon name="male" size={24} color="#414d63" />
                <Text style={styles.modalOptionText}>Masculin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setFormData({ ...formData, sexe: 'Feminin' });
                  setShowSexeModal(false);
                }}
              >
                <Icon name="female" size={24} color="#e83e8c" />
                <Text style={styles.modalOptionText}>Féminin</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Date Pickers */}
        {showDatePicker.naissance && (
          <DateTimePicker
            value={formData.date_naissance ? new Date(formData.date_naissance) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, date) => handleDateChange(e, date, 'naissance')}
            maximumDate={new Date()}
          />
        )}

        {showDatePicker.debut && (
          <DateTimePicker
            value={formData.date_debut ? new Date(formData.date_debut) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, date) => handleDateChange(e, date, 'debut')}
            minimumDate={new Date()}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#414d63',
  },
  headerRight: {
    width: 34,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  selectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectionCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#414d63',
    marginBottom: 15,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#414d63',
    marginBottom: 20,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 15,
    minHeight: 50,
  },
  selectionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectionIcon: {
    marginRight: 10,
  },
  selectionButtonText: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#fdedec',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#2c3e50',
    paddingVertical: 12,
  },
  placeholderText: {
    color: '#95a5a6',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
  },
  submitButton: {
    backgroundColor: '#414d63',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#95a5a6',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#414d63',
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    color: '#7f8c8d',
    fontSize: 14,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  modalOptionCode: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 15,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  modalEmpty: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    color: '#95a5a6',
    fontSize: 16,
  },
});