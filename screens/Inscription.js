// screens/Inscription.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_REGISTER_URL = 'https://rouah.net/api/api-inscription.php';

export default function InscriptionModal({ 
  visible, 
  onClose, 
  onLoginPress, 
  onRegisterSuccess 
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // État pour la société
  const [societe, setSociete] = useState({
    nom: '',
    sigle: '',
    telephone: '',
    email: '',
  });

  // État pour l'utilisateur
  const [utilisateur, setUtilisateur] = useState({
    nom_prenom: '',
    login: '',
    mdp: '',
    telephone: '',
    email: '',
  });

  const setS = (key, value) => setSociete({ ...societe, [key]: value });
  const setU = (key, value) => setUtilisateur({ ...utilisateur, [key]: value });

  const validateSociete = () => {
    if (!societe.nom.trim()) {
      setError('Le nom de la société est obligatoire');
      return false;
    }
    if (!societe.email.trim()) {
      setError('L\'email de la société est obligatoire');
      return false;
    }
    return true;
  };

  const validateUtilisateur = () => {
    if (!utilisateur.nom_prenom.trim()) {
      setError('Le nom de l\'utilisateur est obligatoire');
      return false;
    }
    if (!utilisateur.login.trim()) {
      setError('Le login est obligatoire');
      return false;
    }
    if (!utilisateur.mdp.trim() || utilisateur.mdp.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return false;
    }
    if (!utilisateur.email.trim()) {
      setError('L\'email de l\'utilisateur est obligatoire');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (step === 1) {
      if (validateSociete()) {
        setError('');
        setStep(2);
      }
      return;
    }

    if (step === 2) {
      if (!validateUtilisateur()) return;

      setLoading(true);
      setError('');

      try {
        const payload = {
          societe: societe,
          utilisateur: utilisateur,
        };

        const response = await fetch(API_REGISTER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.success) {
          Alert.alert(
            '🎉 Inscription réussie',
            'Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.',
            [
              {
                text: 'Se connecter',
                onPress: () => {
                  onClose();
                  onRegisterSuccess();
                  if (onLoginPress) onLoginPress();
                }
              }
            ]
          );
          // Réinitialiser les formulaires
          setSociete({
            nom: '',
            sigle: '',
            telephone: '',
            email: '',
          });
          setUtilisateur({
            nom_prenom: '',
            login: '',
            mdp: '',
            telephone: '',
            email: '',
          });
          setStep(1);
        } else {
          setError(data.error || 'Erreur lors de l\'inscription');
        }
      } catch (e) {
        setError('Erreur réseau: ' + e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setStep(1);
    setError('');
    setSociete({
      nom: '',
      sigle: '',
      telephone: '',
      email: '',
    });
    setUtilisateur({
      nom_prenom: '',
      login: '',
      mdp: '',
      telephone: '',
      email: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: '#fff', maxHeight: '95%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 1 ? '📝 Créer une société' : '👤 Créer un compte'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Indicateur de progression */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
              <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
              <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
            </View>
            <Text style={styles.progressText}>
              {step === 1 ? 'Étape 1/2 : Informations société' : 'Étape 2/2 : Informations utilisateur'}
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {step === 1 ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nom de la société *</Text>
                  <TextInput
                    style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                    placeholder="Nom de votre entreprise"
                    placeholderTextColor="#999"
                    value={societe.nom}
                    onChangeText={(text) => setS('nom', text)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sigle</Text>
                  <TextInput
                    style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                    placeholder="Sigle de la société"
                    placeholderTextColor="#999"
                    value={societe.sigle}
                    onChangeText={(text) => setS('sigle', text)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Téléphone</Text>
                  <TextInput
                    style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                    placeholder="Téléphone de la société"
                    placeholderTextColor="#999"
                    value={societe.telephone}
                    onChangeText={(text) => setS('telephone', text)}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                    placeholder="Email de la société"
                    placeholderTextColor="#999"
                    value={societe.email}
                    onChangeText={(text) => setS('email', text)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nom complet *</Text>
                  <TextInput
                    style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                    placeholder="Votre nom complet"
                    placeholderTextColor="#999"
                    value={utilisateur.nom_prenom}
                    onChangeText={(text) => setU('nom_prenom', text)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Login *</Text>
                  <TextInput
                    style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                    placeholder="Votre identifiant de connexion"
                    placeholderTextColor="#999"
                    value={utilisateur.login}
                    onChangeText={(text) => setU('login', text)}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mot de passe *</Text>
                  <View style={[styles.passwordWrapper, { backgroundColor: '#f8f9fa' }]}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Minimum 6 caractères"
                      placeholderTextColor="#999"
                      value={utilisateur.mdp}
                      onChangeText={(text) => setU('mdp', text)}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                      <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#999" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                    placeholder="Votre email"
                    placeholderTextColor="#999"
                    value={utilisateur.email}
                    onChangeText={(text) => setU('email', text)}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Téléphone</Text>
                  <TextInput
                    style={[styles.inputWrapper, { backgroundColor: '#f8f9fa' }]}
                    placeholder="Votre numéro de téléphone"
                    placeholderTextColor="#999"
                    value={utilisateur.telephone}
                    onChangeText={(text) => setU('telephone', text)}
                    keyboardType="phone-pad"
                  />
                </View>
              </>
            )}

            <View style={styles.registerActions}>
              {step === 2 && (
                <TouchableOpacity
                  style={[styles.backBtn, { backgroundColor: '#f0f0f0' }]}
                  onPress={() => { setStep(1); setError(''); }}
                  disabled={loading}
                >
                  <Text style={[styles.backBtnText, { color: '#666' }]}>Retour</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.registerBtn,
                  loading && styles.registerBtnDisabled
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.registerBtnText}>
                    {step === 1 ? 'Suivant →' : 'Créer mon compte'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>
                Vous avez déjà un compte ?{' '}
                <Text 
                  style={styles.footerLink} 
                  onPress={() => { 
                    resetForm();
                    onClose(); 
                    if (onLoginPress) onLoginPress(); 
                  }}
                >
                  Se connecter
                </Text>
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '95%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#075E54',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    paddingBottom: 30,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e0e0e0',
  },
  progressDotActive: {
    backgroundColor: '#075E54',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: '#075E54',
  },
  progressText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginBottom: 16,
  },

  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
  },

  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#171717',
  },
  // Style spécifique pour le mot de passe (moins haut)
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: '#171717',
    paddingVertical: 6,
  },
  eyeBtn: {
    padding: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  roleChipActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#075E54',
  },
  roleChipText: {
    fontSize: 13,
    color: '#666',
  },
  roleChipTextActive: {
    color: '#075E54',
    fontWeight: '600',
  },

  registerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 11,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  registerBtn: {
    flex: 2,
    backgroundColor: '#075E54',
    borderRadius: 11,
    paddingVertical: 14,
    alignItems: 'center',
  },
  registerBtnDisabled: {
    opacity: 0.7,
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  footerContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  footerLink: {
    color: '#075E54',
    fontWeight: '600',
  },
});