import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const API_BASE_URL = 'https://rouah.net/api/';

export default function RetrouveCodeAbonnement({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  React.useEffect(() => {
    navigation.setOptions({ title: 'Retrouvez votre code' });
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    // Reset error
    setEmailError('');
    
    // Validation
    if (!email.trim()) {
      setEmailError('Veuillez saisir votre adresse email');
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError('Format d\'email invalide');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}retrouve-code.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
        Alert.alert(
          '✅ Succès',
          result.message,
          [
            {
              text: 'OK',
              onPress: () => {
                // Optionnel: rediriger vers l'écran de connexion
                // navigation.navigate('Connexion');
              }
            }
          ]
        );
      } else {
        Alert.alert('❌ Erreur', result.message);
      }
    } catch (error) {
      console.error('Erreur:', error);
      Alert.alert(
        '❌ Erreur',
        'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setSuccess(false);
    setEmail('');
    setEmailError('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >


        <Animated.ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Illustration */}
          <Animated.View 
            style={[
              styles.illustrationContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['#414d63', '#764ba2']}
              style={styles.iconCircle}
            >
              <Icon name="vpn-key" size={60} color="#FFF" />
            </LinearGradient>
            <Text style={styles.title}>Vous avez perdu votre code ?</Text>
            <Text style={styles.subtitle}>
              Saisissez votre adresse email pour recevoir votre code d'abonnement
            </Text>
          </Animated.View>

          {/* Formulaire */}
          <Animated.View 
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            {!success ? (
              <>
                <View style={styles.inputWrapper}>
                  <Icon 
                    name="email" 
                    size={20} 
                    color={emailError ? '#e74c3c' : '#414d63'} 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={[styles.input, emailError && styles.inputError]}
                    placeholder="votre@email.com"
                    placeholderTextColor="#95a5a6"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
                
                {emailError ? (
                  <Text style={styles.errorText}>
                    <Icon name="error" size={14} color="#e74c3c" /> {emailError}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Envoyer le code</Text>
                      <Icon name="send" size={20} color="#FFF" />
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIconContainer}>
                  <Icon name="check-circle" size={80} color="#27ae60" />
                </View>
                <Text style={styles.successTitle}>Email envoyé !</Text>
                <Text style={styles.successMessage}>
                  Un email contenant votre code d'abonnement a été envoyé à {'\n'}
                  <Text style={styles.successEmail}>{email}</Text>
                </Text>
                <Text style={styles.successInfo}>
                  📧 Vérifiez votre boîte de réception et vos spams
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRetry}
                >
                  <Icon name="refresh" size={20} color="#414d63" />
                  <Text style={styles.retryButtonText}>Envoyer à une autre adresse</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Informations complémentaires */}
          <Animated.View 
            style={[
              styles.infoContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.infoItem}>
              <Icon name="info" size={18} color="#414d63" />
              <Text style={styles.infoText}>
                Le code sera envoyé à l'adresse email associée à votre compte
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="schedule" size={18} color="#414d63" />
              <Text style={styles.infoText}>
                Délai de réception : 2-3 minutes maximum
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Icon name="security" size={18} color="#414d63" />
              <Text style={styles.infoText}>
                Vos informations sont confidentielles et sécurisées
              </Text>
            </View>
          </Animated.View>

          {/* Lien d'aide */}
          <TouchableOpacity 
            style={styles.helpLink}
            onPress={() => Alert.alert(
              'Besoin d\'aide ?',
              'Contactez notre support :\n📧 support@rouah.net\n📞 +225 07 08 09 10 11'
            )}
          >
            <Icon name="help-outline" size={18} color="#95a5a6" />
            <Text style={styles.helpLinkText}>Besoin d'aide ? Contactez-nous</Text>
          </TouchableOpacity>
        </Animated.ScrollView>
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
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 10,
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2c3e50',
    paddingVertical: 15,
  },
  inputError: {
    color: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 13,
    marginBottom: 15,
    marginLeft: 5,
  },
  submitButton: {
    backgroundColor: '#414d63',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  successEmail: {
    fontWeight: 'bold',
    color: '#414d63',
  },
  successInfo: {
    fontSize: 13,
    color: '#95a5a6',
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#414d63',
    backgroundColor: '#f0f3ff',
  },
  retryButtonText: {
    color: '#414d63',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoContainer: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#7f8c8d',
    marginLeft: 12,
    flex: 1,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#95a5a6',
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
});