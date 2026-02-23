import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://rouah.net/api/';

export default function Abonnement({ navigation, route }) {
  // On reçoit soit un niveau unique, soit un tableau de niveaux
  const { 
    niveau: niveauUnique, 
    niveaux: niveauxRecus = [], 
    preselectNiveau = '',
    categorie 
  } = route.params || {};

  // États
  const [loading, setLoading] = useState(false);
  const [loadingNiveaux, setLoadingNiveaux] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [codePromo, setCodePromo] = useState('');
  const [verificationCodePromo, setVerificationCodePromo] = useState(null);
  
  // Prix par défaut (seront mis à jour quand un niveau est sélectionné)
  const [prixInfo, setPrixInfo] = useState({
    original: 0,
    reduit: 0,
    reduction: 0,
    hasValidPrice: false
  });
  
  const [formData, setFormData] = useState({
    nom_prenom: '',
    email: '',
    telephone: '',
    niveau: preselectNiveau || (niveauUnique ? niveauUnique.code : ''),
    code_promo: ''
  });

  // États pour les niveaux
  const [niveaux, setNiveaux] = useState(
    niveauUnique ? [niveauUnique] : niveauxRecus
  );
  const [selectedNiveau, setSelectedNiveau] = useState(
    niveauUnique || (niveauxRecus.find(n => n.code === preselectNiveau) || null)
  );

  // États pour les modals
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [showEchecModal, setShowEchecModal] = useState(false);
  const [echecData, setEchecData] = useState(null);

  // Fonction pour calculer le taux de réduction
  const calculerTauxReduction = (prixNormal, prixReduit) => {
    if (!prixNormal || prixNormal <= 0 || !prixReduit || prixReduit >= prixNormal) {
      return 0;
    }
    return Math.round(((prixNormal - prixReduit) / prixNormal) * 100);
  };

  // Vérifier la connexion réseau
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Charger les niveaux si non fournis et si nécessaire
  useEffect(() => {
    if (niveaux.length === 0 && categorie) {
      fetchNiveaux();
    }
  }, [categorie]);

  // Mettre à jour les prix quand un niveau est sélectionné
  useEffect(() => {
    if (selectedNiveau) {
      const prixNormal = parseFloat(selectedNiveau.prix_normal) || 0;
      // Utiliser prix_reduction s'il existe et est valide, sinon prix_normal
      const prixReduction = selectedNiveau.prix_reduction && parseFloat(selectedNiveau.prix_reduction) > 0 
        ? parseFloat(selectedNiveau.prix_reduction) 
        : prixNormal;
      
      // Calculer le taux de réduction basé sur les prix réels
      const tauxReduction = calculerTauxReduction(prixNormal, prixReduction);
      
      setPrixInfo({
        original: prixNormal,
        reduit: prixReduction,
        reduction: tauxReduction,
        hasValidPrice: prixNormal > 0 // Vérifie si le prix est valide (>0)
      });
      
      // Mettre à jour le niveau dans le formulaire si ce n'est pas déjà fait
      if (formData.niveau !== selectedNiveau.code) {
        setFormData(prev => ({
          ...prev,
          niveau: selectedNiveau.code
        }));
      }
    }
  }, [selectedNiveau]);

  // Mettre à jour les prix quand un code promo est appliqué
  useEffect(() => {
    if (verificationCodePromo && verificationCodePromo.valid && selectedNiveau) {
      const nouveauPrix = parseFloat(verificationCodePromo.nouveau_prix) || 0;
      const ancienPrix = parseFloat(verificationCodePromo.ancien_prix) || prixInfo.original;
      
      // Calculer le taux de réduction du code promo
      const tauxReduction = calculerTauxReduction(ancienPrix, nouveauPrix);
      
      setPrixInfo({
        original: ancienPrix,
        reduit: nouveauPrix,
        reduction: tauxReduction,
        hasValidPrice: ancienPrix > 0
      });
    }
  }, [verificationCodePromo]);

  // Charger les niveaux depuis l'API
  const fetchNiveaux = async () => {
    if (!categorie) return;
    
    setLoadingNiveaux(true);
    try {
      const response = await fetch(`${API_BASE_URL}get-niveaux-classe.php?categorie=${encodeURIComponent(categorie)}`);
      const data = await response.json();
      
      if (data.success) {
        setNiveaux(data.data);
        // Si un niveau était présélectionné mais pas encore dans la liste
        if (preselectNiveau) {
          const niveau = data.data.find(n => n.code === preselectNiveau);
          if (niveau) {
            setSelectedNiveau(niveau);
          }
        }
      } else {
        console.error('Erreur chargement niveaux:', data.message);
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
    } finally {
      setLoadingNiveaux(false);
    }
  };

  // Formater les nombres
  const formatNumber = (num) => {
    if (!num || num === 0) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Vérifier le code promo
  const verifierCodePromo = async (code) => {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Vérifiez votre connexion internet');
      return false;
    }

    if (!code.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code promo');
      return false;
    }

    if (!selectedNiveau) {
      Alert.alert('Erreur', 'Veuillez d\'abord sélectionner un niveau');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}abonnement.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'verifier_code_promo',
          code_promo: code,
          niveau: selectedNiveau.code
        })
      });

      const data = await response.json();

      if (data.success) {
        const nouveauPrix = parseFloat(data.data.nouveau_prix) || 0;
        const ancienPrix = parseFloat(data.data.ancien_prix) || prixInfo.original;
        
        setVerificationCodePromo({
          code: code,
          valid: true,
          utilisateur_nom: data.data.utilisateur_nom,
          utilisateur_id: data.data.utilisateur_id,
          reduction: data.data.reduction,
          nouveau_prix: nouveauPrix,
          ancien_prix: ancienPrix
        });
        
        setFormData(prev => ({
          ...prev,
          code_promo: code
        }));
        
        Alert.alert(
          '✅ Code promo valide !',
          `Félicitations ! Vous bénéficiez d'une réduction.\n\nPrix normal: ${formatNumber(ancienPrix)} FCFA\nPrix réduit: ${formatNumber(nouveauPrix)} FCFA`,
          [{ text: 'OK' }]
        );
        return true;
      } else {
        Alert.alert('❌ Code promo invalide', data.message || 'Ce code promo n\'est pas valide');
        setVerificationCodePromo({
          code: code,
          valid: false
        });
        
        // Restaurer les prix du niveau sélectionné
        if (selectedNiveau) {
          const prixNormal = parseFloat(selectedNiveau.prix_normal) || 0;
          const prixReduction = selectedNiveau.prix_reduction && parseFloat(selectedNiveau.prix_reduction) > 0 
            ? parseFloat(selectedNiveau.prix_reduction) 
            : prixNormal;
          const tauxReduction = calculerTauxReduction(prixNormal, prixReduction);
          
          setPrixInfo({
            original: prixNormal,
            reduit: prixReduction,
            reduction: tauxReduction,
            hasValidPrice: prixNormal > 0
          });
        }
        
        setFormData(prev => ({
          ...prev,
          code_promo: ''
        }));
        return false;
      }
    } catch (error) {
      console.error('Erreur vérification code promo:', error);
      Alert.alert('Erreur', 'Impossible de vérifier le code promo');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Créer un abonnement
  const creerAbonnement = async () => {
    if (!isConnected) {
      Alert.alert('Hors ligne', 'Vérifiez votre connexion internet');
      return false;
    }

    // Vérifier si le prix est valide
    if (!prixInfo.hasValidPrice) {
      Alert.alert('Erreur', 'Ce niveau n\'est pas disponible pour le moment');
      return false;
    }

    if (!formData.nom_prenom || !formData.email || !formData.niveau) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires (*)');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
      return false;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}abonnement.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'creer',
          nom_prenom: formData.nom_prenom,
          email: formData.email,
          telephone: formData.telephone || '',
          niveau: formData.niveau,
          code_promo: formData.code_promo || ''
        })
      });

      const data = await response.json();

      if (data.success) {
        const successData = {
          code: data.data.code,
          niveau: data.data.niveau,
          montant: parseFloat(data.data.montant) || 0,
          montant_original: parseFloat(data.data.montant_original) || 0,
          date_expiration: data.data.date_expiration,
          type: data.data.type,
          duree_mois: data.data.duree_mois,
          abonnement_id: data.data.abonnement_id,
          numero_transaction: data.data.numero,
          wave_url: data.data.wave_url,
          reduction_appliquee: parseFloat(data.data.reduction_appliquee) || 0,
          reduction_type: data.data.reduction_type,
          avecReduction: (parseFloat(data.data.reduction_appliquee) || 0) > 0
        };

        setSuccessData(successData);
        setShowSuccessModal(true);
        
        // Réinitialiser le formulaire
        setFormData({
          nom_prenom: '',
          email: '',
          telephone: '',
          niveau: '',
          code_promo: ''
        });
        setCodePromo('');
        setVerificationCodePromo(null);
        setSelectedNiveau(null);
        
        return true;
      } else {
        setEchecData({
          message: data.message || 'Une erreur est survenue',
          numero: data.data?.numero || null
        });
        setShowEchecModal(true);
        return false;
      }
    } catch (error) {
      console.error('Erreur création abonnement:', error);
      setEchecData({
        message: 'Impossible de créer l\'abonnement. Vérifiez votre connexion.',
        numero: null
      });
      setShowEchecModal(true);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Gestionnaires pour les modals
  const handlePayerMaintenant = () => {
    if (successData && successData.wave_url) {
      Linking.openURL(successData.wave_url);
      AsyncStorage.setItem('pending_subscription_code', successData.code);
      setShowSuccessModal(false);
      setSuccessData(null);
      navigation.goBack();
    }
  };

  const handleAnnulerPaiement = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
    navigation.goBack();
  };

  const handleEchecRetour = () => {
    setShowEchecModal(false);
    setEchecData(null);
  };

  const handleVerifierCodePromo = async () => {
    if (!codePromo.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un code promo');
      return;
    }
    await verifierCodePromo(codePromo);
  };

  const handleNiveauChange = (itemValue) => {
    setFormData({...formData, niveau: itemValue});
    const niveau = niveaux.find(n => n.code === itemValue);
    if (niveau) {
      setSelectedNiveau(niveau);
      // Réinitialiser la vérification du code promo quand on change de niveau
      setVerificationCodePromo(null);
      setCodePromo('');
    }
  };

  // Fonction pour réinitialiser le code promo
  const handleResetCodePromo = () => {
    setCodePromo('');
    setVerificationCodePromo(null);
    setFormData(prev => ({
      ...prev,
      code_promo: ''
    }));
    
    // Restaurer les prix du niveau
    if (selectedNiveau) {
      const prixNormal = parseFloat(selectedNiveau.prix_normal) || 0;
      const prixReduction = selectedNiveau.prix_reduction && parseFloat(selectedNiveau.prix_reduction) > 0 
        ? parseFloat(selectedNiveau.prix_reduction) 
        : prixNormal;
      const tauxReduction = calculerTauxReduction(prixNormal, prixReduction);
      
      setPrixInfo({
        original: prixNormal,
        reduit: prixReduction,
        reduction: tauxReduction,
        hasValidPrice: prixNormal > 0
      });
    }
  };

  // Vérifier si le formulaire doit être désactivé
  const isFormDisabled = !prixInfo.hasValidPrice || loading || !selectedNiveau;

  // Modal de succès
  const renderSuccessModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showSuccessModal}
      onRequestClose={() => {
        setShowSuccessModal(false);
        setSuccessData(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.successModalContent}>
          <View style={styles.successIconContainer}>
            <Icon name="check-circle" size={80} color="#2ecc71" />
          </View>

          <Text style={styles.successModalTitle}>Abonnement créé avec succès !</Text>

          {successData && (
            <View style={styles.successDetailsContainer}>
              <View style={styles.successDetailRow}>
                <Icon name="vpn-key" size={20} color="#3498db" />
                <Text style={styles.successDetailLabel}>Code d'accès:</Text>
                <Text style={styles.successDetailValue}>{successData.code}</Text>
              </View>

              <View style={styles.successDetailRow}>
                <Icon name="school" size={20} color="#3498db" />
                <Text style={styles.successDetailLabel}>Niveau:</Text>
                <Text style={styles.successDetailValue}>{successData.niveau}</Text>
              </View>

              <View style={styles.successDetailRow}>
                <Icon name="attach-money" size={20} color="#3498db" />
                <Text style={styles.successDetailLabel}>Prix:</Text>
                <Text style={styles.successDetailValue}>
                  {formatNumber(successData.montant)} FCFA
                  {successData.montant_original && successData.montant < successData.montant_original && 
                    ` (au lieu de ${formatNumber(successData.montant_original)} FCFA)`}
                </Text>
              </View>

              <View style={styles.successDetailRow}>
                <Icon name="access-time" size={20} color="#3498db" />
                <Text style={styles.successDetailLabel}>Validité:</Text>
                <Text style={styles.successDetailValue}>{successData.duree_mois} mois</Text>
              </View>
            </View>
          )}

          <View style={styles.successMessageContainer}>
            <Icon name="info-outline" size={24} color="#f39c12" />
            <Text style={styles.successMessageText}>
              Vous allez être redirigé vers Wave pour finaliser votre paiement.
            </Text>
          </View>

          <View style={styles.successButtonContainer}>
            <TouchableOpacity
              style={[styles.successButton, styles.successButtonPrimary]}
              onPress={handlePayerMaintenant}
            >
              <Icon name="payment" size={20} color="#FFF" />
              <Text style={styles.successButtonText}>Payer maintenant</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.successButton, styles.successButtonSecondary]}
              onPress={handleAnnulerPaiement}
            >
              <Icon name="cancel" size={20} color="#FFF" />
              <Text style={styles.successButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.successNote}>
            Votre code vous sera également envoyé par email après confirmation du paiement.
          </Text>
        </View>
      </View>
    </Modal>
  );

  // Modal d'échec
  const renderEchecModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showEchecModal}
      onRequestClose={() => {
        setShowEchecModal(false);
        setEchecData(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.echecModalContent}>
          <View style={styles.echecIconContainer}>
            <Icon name="error-outline" size={80} color="#e74c3c" />
          </View>

          <Text style={styles.echecModalTitle}>Échec de la création</Text>

          {echecData && (
            <View style={styles.echecMessageContainer}>
              <Text style={styles.echecMessageText}>{echecData.message}</Text>
              {echecData.numero && (
                <Text style={styles.echecReference}>Réf: {echecData.numero}</Text>
              )}
            </View>
          )}

          <View style={styles.echecTipsContainer}>
            <Text style={styles.echecTipsTitle}>💡 Suggestions :</Text>
            <Text style={styles.echecTipText}>• Vérifiez votre connexion internet</Text>
            <Text style={styles.echecTipText}>• Assurez-vous que tous les champs sont corrects</Text>
            <Text style={styles.echecTipText}>• Réessayez dans quelques instants</Text>
            <Text style={styles.echecTipText}>• Contactez le support si le problème persiste</Text>
          </View>

          <TouchableOpacity
            style={styles.echecButton}
            onPress={handleEchecRetour}
          >
            <Icon name="arrow-back" size={20} color="#FFF" />
            <Text style={styles.echecButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Informations de prix */}
            {selectedNiveau && (
              <View style={styles.prixContainer}>
                <View style={[
                  styles.prixInfoCard,
                  !prixInfo.hasValidPrice && styles.prixInfoCardDisabled
                ]}>
                  <Text style={styles.prixTitle}>
                    Tarif - {selectedNiveau.nom}
                  </Text>
                  
                  {!prixInfo.hasValidPrice ? (
                    <View style={styles.prixIndisponible}>
                      <Icon name="info-outline" size={40} color="#e74c3c" />
                      <Text style={styles.prixIndisponibleText}>
                        Ce niveau n'est pas disponible pour le moment
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.prixDetails}>
                        {/* Prix normal */}
                        <Text style={[
  styles.prixNormal,
  // Ne barrer que si un code promo valide est appliqué ET que le prix réduit est inférieur
  verificationCodePromo && verificationCodePromo.valid && prixInfo.reduit < prixInfo.original && styles.prixNormalBarre
]}>
  {formatNumber(prixInfo.original)} FCFA
</Text>
                        
                        {/* Prix réduit (si applicable) */}
                        {verificationCodePromo && verificationCodePromo.valid && prixInfo.reduit < prixInfo.original && (
  <>
    <Text style={styles.prixReduit}>
      {formatNumber(prixInfo.reduit)} FCFA
    </Text>
    {prixInfo.reduction > 0 && (
      <View style={styles.reductionBadge}>
        <Icon name="local-offer" size={16} color="#FFF" />
        <Text style={styles.reductionText}>
          -{prixInfo.reduction}%
        </Text>
      </View>
    )}
  </>
)}
                      </View>
                      
                      <Text style={styles.prixDescription}>
                        Abonnement de 12 mois • Tous les cours du niveau
                      </Text>
                      {selectedNiveau.cours_count > 0 && (
                        <Text style={styles.coursCount}>
                          {selectedNiveau.cours_count} cours disponibles
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Code promo - Visible seulement si le prix est valide */}
            {selectedNiveau && prixInfo.hasValidPrice && (
              <View style={styles.codePromoContainer}>
                <Text style={styles.label}>Code promo (optionnel)</Text>
                <View style={styles.codePromoInputContainer}>
                  <TextInput
                    style={[
                      styles.codePromoInput,
                      isFormDisabled && styles.inputDisabled
                    ]}
                    placeholder="Entrez un code promo"
                    value={codePromo}
                    onChangeText={setCodePromo}
                    autoCapitalize="characters"
                    editable={!isFormDisabled}
                  />
                  {verificationCodePromo && verificationCodePromo.valid ? (
                    <TouchableOpacity 
                      style={[styles.verifierButton, styles.buttonSuccess]}
                      onPress={handleResetCodePromo}
                      disabled={isFormDisabled}
                    >
                      <Icon name="close" size={20} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[
                        styles.verifierButton, 
                        (isFormDisabled) && styles.buttonDisabled
                      ]}
                      onPress={handleVerifierCodePromo}
                      disabled={isFormDisabled}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.verifierButtonText}>Vérifier</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
                
                {verificationCodePromo && verificationCodePromo.valid && (
                  <View style={styles.codePromoValid}>
                    <Icon name="check-circle" size={20} color="#2ecc71" />
                    <Text style={styles.codePromoValidText}>
                      Code promo valide ! Réduction de {prixInfo.reduction}% appliquée
                    </Text>
                  </View>
                )}
                
                {verificationCodePromo && !verificationCodePromo.valid && (
                  <View style={styles.codePromoInvalid}>
                    <Icon name="error" size={20} color="#e74c3c" />
                    <Text style={styles.codePromoInvalidText}>
                      Code promo invalide
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Formulaire */}
            <View style={[
              styles.formContainer,
              isFormDisabled && styles.formContainerDisabled
            ]}>
              <Text style={styles.formTitle}>Vos informations</Text>

              <View style={styles.formRow}>
                <Icon name="person" size={20} color="#3498db" style={styles.formIcon} />
                <TextInput
                  style={[
                    styles.formInput,
                    isFormDisabled && styles.inputDisabled
                  ]}
                  placeholder="Nom & Prénoms *"
                  value={formData.nom_prenom}
                  onChangeText={(text) => setFormData({...formData, nom_prenom: text})}
                  editable={!isFormDisabled}
                />
              </View>
              
              <View style={styles.formRow}>
                <Icon name="email" size={20} color="#3498db" style={styles.formIcon} />
                <TextInput
                  style={[
                    styles.formInput,
                    isFormDisabled && styles.inputDisabled
                  ]}
                  placeholder="Email *"
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isFormDisabled}
                />
              </View>
              
              <View style={styles.formRow}>
                <Icon name="phone" size={20} color="#3498db" style={styles.formIcon} />
                <TextInput
                  style={[
                    styles.formInput,
                    isFormDisabled && styles.inputDisabled
                  ]}
                  placeholder="Téléphone"
                  value={formData.telephone}
                  onChangeText={(text) => setFormData({...formData, telephone: text})}
                  keyboardType="phone-pad"
                  editable={!isFormDisabled}
                />
              </View>
              
              <View style={styles.formRow}>
                <Icon name="school" size={20} color="#3498db" style={styles.formIcon} />
                <View style={[
                  styles.formSelectContainer,
                  isFormDisabled && styles.selectDisabled
                ]}>
                  {loadingNiveaux ? (
                    <View style={styles.loadingPicker}>
                      <ActivityIndicator size="small" color="#3498db" />
                      <Text style={styles.loadingPickerText}>Chargement...</Text>
                    </View>
                  ) : niveaux.length > 0 ? (
                    <>

                    <View style={{ width: 30 }} /> 
                    <Picker
                      selectedValue={formData.niveau}
                      onValueChange={handleNiveauChange}
                      style={styles.picker}
                      dropdownIconColor={isFormDisabled ? "#95a5a6" : "#3498db"}
                      mode="dropdown"
                      enabled={!isFormDisabled}
                    >
                      <Picker.Item 
                        label="Sélectionnez un niveau *" 
                        value="" 
                        color="#95a5a6"
                      />
                      {niveaux.map((niveau) => {
                        const prixNormal = parseFloat(niveau.prix_normal) || 0;
                        const isAvailable = prixNormal > 0;
                        return (
                          <Picker.Item 
                            key={niveau.id} 
                            label={`${niveau.nom} (${niveau.code})${!isAvailable ? ' - Indisponible' : ''}`} 
                            value={niveau.code}
                            color={isAvailable ? "#2c3e50" : "#95a5a6"}
                          />
                        );
                      })}
                    </Picker>
                    </>

                  ) : (
                    <View style={styles.loadingPicker}>
                      <Text style={styles.loadingPickerText}>Aucun niveau disponible</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Message d'indisponibilité si prix = 0 */}
            {selectedNiveau && !prixInfo.hasValidPrice && (
              <View style={styles.indisponibleMessage}>
                <Icon name="warning" size={24} color="#e74c3c" />
                <Text style={styles.indisponibleMessageText}>
                  Ce niveau n'est pas disponible pour le moment. Veuillez sélectionner un autre niveau ou réessayer plus tard.
                </Text>
              </View>
            )}

            {/* Bouton de soumission */}
            <TouchableOpacity 
              style={[
                styles.submitButton, 
                (loading || !selectedNiveau || !prixInfo.hasValidPrice) && styles.submitButtonDisabled
              ]}
              onPress={creerAbonnement}
              disabled={loading || !selectedNiveau || !prixInfo.hasValidPrice}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Icon name="send" size={20} color="#FFF" />
                  <Text style={styles.submitButtonText}>
                    {!selectedNiveau ? 'Sélectionnez un niveau' : 
                     !prixInfo.hasValidPrice ? 'Niveau indisponible' : 
                     'Obtenir mon code'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            
            <Text style={styles.formInfo}>
              * Champs obligatoires. Le code vous sera envoyé par email après confirmation du paiement.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modals */}
      {renderSuccessModal()}
      {renderEchecModal()}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  prixContainer: {
    marginBottom: 25,
  },
  prixInfoCard: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  prixInfoCardDisabled: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E0E0E0',
    opacity: 0.8,
  },
  prixTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
    textAlign: 'center',
  },
  prixDetails: {
    alignItems: 'center',
    marginBottom: 15,
  },
  prixNormal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  prixNormalBarre: {
    fontSize: 20,
    color: '#95a5a6',
    textDecorationLine: 'line-through',
    marginBottom: 5,
  },
  prixReduit: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 10,
  },
  reductionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  reductionText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  prixDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  coursCount: {
    fontSize: 12,
    color: '#3498db',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '600',
  },
  prixIndisponible: {
    alignItems: 'center',
    padding: 20,
  },
  prixIndisponibleText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  codePromoContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  codePromoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  codePromoInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c3e50',
    marginRight: 10,
  },
  verifierButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonSuccess: {
    backgroundColor: '#2ecc71',
  },
  verifierButtonText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  codePromoValid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAFAF1',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2ecc71',
  },
  codePromoValidText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  codePromoInvalid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEDEC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  codePromoInvalidText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  formContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  formContainerDisabled: {
    backgroundColor: '#F8F9FA',
    opacity: 0.8,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  formRow: {
    marginBottom: 20,
    position: 'relative',
  },
  formIcon: {
    position: 'absolute',
    left: 12,
    top: 15,
    zIndex: 1,
  },
  formInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 45,
    paddingVertical: 15,
    fontSize: 16,
    color: '#2c3e50',
  },
  inputDisabled: {
    backgroundColor: '#ECF0F1',
    color: '#95a5a6',
  },
  formSelectContainer: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 50,
    position: 'relative',
  },
  selectDisabled: {
    backgroundColor: '#ECF0F1',
    borderColor: '#D5D8DC',
  },
  picker: {
    flex: 1,
    color: '#2c3e50',
    fontSize: 16,
    paddingLeft: 35,
    paddingRight: 30,
    height: 50,
  },
  loadingPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  loadingPickerText: {
    marginLeft: 10,
    color: '#7f8c8d',
    fontSize: 14,
  },
  indisponibleMessage: {
    backgroundColor: '#FDEDEC',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  indisponibleMessageText: {
    fontSize: 14,
    color: '#e74c3c',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#414d63',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#f1c40f',
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  formInfo: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  echecModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 25,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  echecIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 20,
  },
  echecModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 20,
  },
  successDetailsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  successDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  successDetailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
    marginLeft: 10,
    width: 90,
  },
  successDetailValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: 'bold',
    flex: 1,
  },
  successMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9E7',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  successMessageText: {
    fontSize: 14,
    color: '#f39c12',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  echecMessageContainer: {
    backgroundColor: '#FDEDEC',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  echecMessageText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    lineHeight: 20,
  },
  echecReference: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 10,
  },
  echecTipsContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  echecTipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  echecTipText: {
    fontSize: 14,
    color: '#5d6d7e',
    marginBottom: 5,
    lineHeight: 20,
  },
  successButtonContainer: {
    marginBottom: 15,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginVertical: 5,
  },
  echecButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: '#3498db',
  },
  successButtonPrimary: {
    backgroundColor: '#f39c12',
    elevation: 3,
    shadowColor: '#f39c12',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  successButtonSecondary: {
    backgroundColor: '#e74c3c',
    elevation: 3,
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  successButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  echecButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  successNote: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});