// screens/DiplomeInfo.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';


const API_BASE_URL = 'https://rouah.net/api/';
const API_REGISTRE = 'get-registre.php';



// Composant pour afficher le certificat (ex-DiplomePdf)
const CertificatView = ({ registreData, certificat, niveau, onBack }) => {
  const [generating, setGenerating] = useState(false);



   const generatePDF = async () => {
    try {
      setGenerating(true);
      
      // Vérifier que nous avons un matricule
      const matricule = registreData?.matricule || registreData?.code;
      if (!matricule) {
        Alert.alert('Erreur', 'Matricule non disponible');
        setGenerating(false);
        return;
      }
      // Construire l'URL du certificat PDF
      const pdfUrl = `https://rouah.net/api/certificat-pdf.php?matricule=${matricule}`;
      
      // Ouvrir dans un navigateur in-app
    await WebBrowser.openBrowserAsync(pdfUrl);
      
    } catch (error) {
      console.error('Erreur génération PDF:', error);
      Alert.alert('Erreur', 'Impossible de générer le certificat');
    } finally {
      setGenerating(false);
    }
  };

  const shareRegistre = () => {
    Share.share({
      message: `Certificat ${certificat?.titre || registreData.specialite}\nNom: ${registreData.nom_prenom}\nMatricule: ${registreData.matricule || registreData.code}\nLien: https://rouah.net/api/certificat-pdf.php?matricule=${encodeURIComponent(registreData.matricule || registreData.code)}`,
      title: 'Mon certificat'
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>


      {/* Carte du certificat */}
      <View style={styles.certificateCard}>
        <View style={styles.certificateHeader}>
          <Icon name="verified" size={40} color="#3498db" />
          <Text style={styles.certificateTitle}>CERTIFICAT</Text>
        </View>

        <View style={styles.certificateBody}>
          <Text style={styles.label}>Code du registre</Text>
          <Text style={styles.value}>{registreData.matricule}</Text>

          <Text style={styles.label}>Matricule</Text>
          <Text style={[styles.value, styles.codeValue]}>{registreData.code}</Text>

          <Text style={styles.label}>Nom et prénoms</Text>
          <Text style={styles.value}>{registreData.nom_prenom}</Text>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Téléphone</Text>
              <Text style={styles.value}>{registreData.telephone}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{registreData.email}</Text>
            </View>
          </View>

          <Text style={styles.label}>Domaine (Niveau ID)</Text>
          <Text style={styles.value}>{niveau?.id || registreData.domaine || 'N/A'}</Text>

          <Text style={styles.label}>Spécialité (Certificat ID)</Text>
          <Text style={[styles.value, styles.specialite]}>{certificat?.id || registreData.specialite || 'N/A'}</Text>

        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.downloadButton]}
          onPress={generatePDF}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Icon name="picture-as-pdf" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Télécharger le PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={shareRegistre}
        >
          <Icon name="share" size={20} color="#FFF" />
          <Text style={styles.actionButtonText}>Partager</Text>
        </TouchableOpacity>
      </View>

     
    </ScrollView>
  );
};

// Composant pour le formulaire de saisie (ex-DiplomeInfo)
const CertificatForm = ({ certificat, niveau, score, onSubmit, onCancel, navigation }) => {
  const [formData, setFormData] = useState({
    nom_prenom: '',
    telephone: '',
    email: '',
    code_abonnement: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nom_prenom.trim()) {
      newErrors.nom_prenom = 'Le nom et prénom sont requis';
    } else if (formData.nom_prenom.length < 3) {
      newErrors.nom_prenom = 'Le nom doit contenir au moins 3 caractères';
    }
    
    if (!formData.telephone.trim()) {
      newErrors.telephone = 'Le téléphone est requis';
    } else if (!/^[0-9+\-\s]{8,}$/.test(formData.telephone)) {
      newErrors.telephone = 'Numéro de téléphone invalide';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Adresse email invalide';
    }
    
    if (!formData.code_abonnement.trim()) {
      newErrors.code_abonnement = 'Le code d\'abonnement est requis';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    await onSubmit(formData);
  };

  const handleScanQR = () => {
    // Naviguer vers l'écran d'abonnement avec les informations pré-remplies
    navigation.navigate('Abonnement', {
      categorie: 'Certifications',
      preselectNiveau: niveau?.code,
      // On peut aussi passer le niveau complet si disponible
      niveau: niveau,
      // Informations pré-remplies depuis le formulaire si disponibles
      prefillData: {
        nom_prenom: formData.nom_prenom,
        telephone: formData.telephone,
        email: formData.email
      }
    });
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête avec score */}
      <View
        style={styles.header}
      >
        <Icon name="emoji-events" size={60} color="#27ae60" />
        <Text style={styles.headerTitle}>Félicitations !</Text>
        <Text style={styles.headerSubtitle}>
          Vous avez obtenu {score?.toFixed(1)}% au quiz
        </Text>
      </View>

      {/* Informations du certificat */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Icon name="verified" size={20} color="#3498db" />
          <Text style={styles.infoLabel}>Certificat :</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {certificat?.titre} (ID: {certificat?.id})
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Icon name="school" size={20} color="#3498db" />
          <Text style={styles.infoLabel}>Niveau :</Text>
          <Text style={styles.infoValue}>{niveau?.nom} (ID: {niveau?.id})</Text>
        </View>
      </View>

      {/* Message d'information */}
      <View style={styles.messageBox}>
        <Icon name="info" size={20} color="#3498db" />
        <Text style={styles.messageText}>
          Pour générer votre certificat, veuillez remplir vos informations ci-dessous
        </Text>
      </View>

      {/* Formulaire */}
      <View style={styles.form}>
        {/* Code abonnement */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Code d'abonnement <Text style={styles.required}>*</Text></Text>
          <View style={styles.codeInputWrapper}>
            <TextInput
              style={[styles.input, errors.code_abonnement && styles.inputError]}
              placeholder="Ex: 200001"
              value={formData.code_abonnement}
              onChangeText={(text) => {
                setFormData({...formData, code_abonnement: text});
                if (errors.code_abonnement) {
                  setErrors({...errors, code_abonnement: null});
                }
              }}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={styles.scanButton}
              onPress={handleScanQR}
            >
              <Icon name="qr-code-scanner" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
          {errors.code_abonnement && (
            <Text style={styles.errorText}>{errors.code_abonnement}</Text>
          )}
          <Text style={styles.scanHelperText}>
            Appuyez sur le scanner pour obtenir un code d'abonnement
          </Text>
        </View>

        {/* Nom et prénom */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nom et prénoms <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.nom_prenom && styles.inputError]}
            placeholder="Votre nom complet"
            value={formData.nom_prenom}
            onChangeText={(text) => {
              setFormData({...formData, nom_prenom: text});
              if (errors.nom_prenom) {
                setErrors({...errors, nom_prenom: null});
              }
            }}
          />
          {errors.nom_prenom && (
            <Text style={styles.errorText}>{errors.nom_prenom}</Text>
          )}
        </View>

        {/* Téléphone */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Téléphone <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.telephone && styles.inputError]}
            placeholder="Ex: 771234567"
            value={formData.telephone}
            onChangeText={(text) => {
              setFormData({...formData, telephone: text});
              if (errors.telephone) {
                setErrors({...errors, telephone: null});
              }
            }}
            keyboardType="phone-pad"
          />
          {errors.telephone && (
            <Text style={styles.errorText}>{errors.telephone}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            placeholder="votre.email@exemple.com"
            value={formData.email}
            onChangeText={(text) => {
              setFormData({...formData, email: text});
              if (errors.email) {
                setErrors({...errors, email: null});
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email}</Text>
          )}
        </View>

        {/* Note d'information */}
        <View style={styles.noteContainer}>
          <Icon name="lock" size={16} color="#7f8c8d" />
          <Text style={styles.noteText}>
            Vos informations sont confidentielles et ne seront utilisées que pour la génération de votre certificat.
          </Text>
        </View>
      </View>

      {/* Boutons d'action */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Icon name="verified" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Générer mon certificat</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Conditions */}
      <Text style={styles.conditions}>
        En générant votre certificat, vous acceptez nos conditions d'utilisation et confirmez l'exactitude des informations fournies.
      </Text>
    </ScrollView>
  );
};

// Composant principal
export default function DiplomeInfo({ route, navigation }) {
  const { certificat, niveau, score, registreData, mode } = route.params || {};

  // useEffect
  useEffect(() => {
    navigation.setOptions({ title: 'Mon certificat' });
}, []);
  
  // Déterminer le mode d'affichage
  const isViewMode = mode === 'view' || registreData;

  const handleCreateRegistre = async (formData) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_REGISTRE}?action=createRegistre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code_abonnement,
          nom_prenom: formData.nom_prenom,
          telephone: formData.telephone,
          email: formData.email,
          certificat_nom: certificat.titre,
          certificat_id: certificat.id,
          niveau_nom: niveau.nom,
          niveau_id: niveau.id,
          score: score
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const newRegistre = {
          code: data.code, // matieres.id.abonnements.code
          matricule: data.matricule, // abonnements.code
          nom_prenom: formData.nom_prenom,
          telephone: formData.telephone,
          email: formData.email,
          specialite: certificat.id, // matieres.id
          domaine: niveau.id, // niveaux.id
          date_delivrance: new Date().toISOString(),
          date_fin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          etat: 'actif',
          score: score
        };
        
        Alert.alert(
          'Félicitations !',
          'Votre certificat a été généré avec succès.',
          [
            {
              text: 'Voir mon certificat',
              onPress: () => {
                navigation.replace('DiplomeInfo', {
                  mode: 'view',
                  registreData: newRegistre,
                  certificat: certificat,
                  niveau: niveau
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', data.message || 'Impossible de créer le certificat');
      }
    } catch (error) {
      console.error('Erreur création registre:', error);
      Alert.alert('Erreur', 'Connexion impossible au serveur');
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {isViewMode ? (
          <CertificatView 
            registreData={registreData}
            certificat={certificat}
            niveau={niveau}
            onBack={handleBack}
          />
        ) : (
          <CertificatForm 
            certificat={certificat}
            niveau={niveau}
            score={score}
            onSubmit={handleCreateRegistre}
            onCancel={handleBack}
            navigation={navigation}
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    marginLeft: 8,
    fontWeight: '500',
  },
  header: {
    marginTop:10,
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 30,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#2ecc71',
    marginTop: 5,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 10,
    width: 80,
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
  },
  messageBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF5FB',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 10,
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 15,
    fontSize: 15,
    color: '#2c3e50',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputError: {
    borderColor: '#e74c3c',
    backgroundColor: '#FDEDEC',
  },
  scanButton: {
    backgroundColor: '#3498db',
    borderRadius: 10,
    padding: 15,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanHelperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 5,
  },
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 8,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#414d63',
    paddingVertical: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  submitButtonDisabled: {
    backgroundColor: '#bdc3c7',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  conditions: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  // Styles pour la vue certificat
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  certificateCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginTop:10
  },
  certificateHeader: {
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
    paddingBottom: 15,
    marginBottom: 15,
  },
  certificateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10,
    letterSpacing: 2,
  },
  certificateBody: {
    marginBottom: 10,
  },
  codeValue: {
    fontFamily: 'monospace',
    fontSize: 14,
  },
  specialite: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  col: {
    flex: 0.48,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  actionButton: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 2,
  },
  downloadButton: {
    backgroundColor: '#27ae60',
  },
  shareButton: {
    backgroundColor: '#3498db',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  infoSection: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#34495e',
    marginLeft: 10,
    flex: 1,
  },
});