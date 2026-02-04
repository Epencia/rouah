import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import CountryPicker from 'react-native-country-picker-modal';

export default function MotPasseOublie() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('CI');
  const [callingCode, setCallingCode] = useState('225');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSelectCountry = (country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
    setPhoneNumber('');
  };

  const handleForgotPassword = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre numéro de téléphone');
      return;
    }

    const fullPhoneNumber = `+${callingCode}${phoneNumber.replace(/\s/g, '')}`;
    console.log('Numéro envoyé:', fullPhoneNumber);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // TEST 1: Essayer avec GET d'abord (plus simple)
      const testUrl = `http://rouah.net/api/mot-passe-oublie.php?telephone=${encodeURIComponent(fullPhoneNumber)}`;
      console.log('URL de test:', testUrl);

      let response = await fetch(testUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      // Si GET ne marche pas, essayer POST avec FormData
      if (!response.ok) {
        console.log('GET a échoué, essai avec POST...');
        
        const formData = new FormData();
        formData.append('telephone', fullPhoneNumber);

        response = await fetch('http://rouah.net/api/mot-passe-oublie.php', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Erreur serveur: ${response.status}`);
      }

      const data = await response.json();
      console.log('Réponse API:', data);

      if (data.status === 'success') {
        Alert.alert(
          'Succès', 
          'Vos identifiants ont été envoyés par notification push',
          [{ text: 'OK' }]
        );
        setPhoneNumber('');
      } else {
        // Afficher le message d'erreur avec debug si disponible
        const errorMsg = data.debug ? 
          `${data.message}\n\nDebug: ${JSON.stringify(data.debug)}` : 
          data.message;
        Alert.alert('Erreur', errorMsg);
      }

    } catch (error) {
      console.error('Erreur:', error);
      
      if (error.name === 'AbortError') {
        Alert.alert('Erreur', 'Le serveur ne répond pas. Vérifiez votre connexion internet.');
      } else if (error.message.includes('Network request failed')) {
        Alert.alert('Erreur', 'Problème de connexion réseau. Vérifiez votre internet.');
      } else {
        Alert.alert('Erreur', error.message || 'Une erreur inattendue est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneNumberChange = (text) => {
    const cleanedText = text.replace(/[^0-9]/g, '');
    setPhoneNumber(cleanedText);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            Saisissez votre numéro de téléphone pour recevoir vos identifiants par notification push
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.phoneContainer}>
            <TouchableOpacity 
              style={styles.countryPicker}
              onPress={() => setShowCountryPicker(true)}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <CountryPicker
                countryCode={countryCode}
                withFilter
                withFlag
                withCallingCode
                withCallingCodeButton
                withAlphaFilter
                visible={showCountryPicker}
                onSelect={onSelectCountry}
                onClose={() => setShowCountryPicker(false)}
                containerButtonStyle={styles.countryButton}
              />
            </TouchableOpacity>

            <TextInput
              style={styles.phoneInput}
              placeholder="Saisissez votre numéro"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              autoComplete="tel"
              textContentType="telephoneNumber"
              editable={!isLoading}
            />
          </View>

          {phoneNumber.length > 0 && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Numéro complet:</Text>
              <Text style={styles.previewNumber}>+{callingCode} {phoneNumber}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              (isLoading || !phoneNumber.trim()) && styles.submitButtonDisabled
            ]}
            onPress={handleForgotPassword}
            disabled={isLoading || !phoneNumber.trim()}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loadingText}>Envoi en cours...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Envoyer les identifiants</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              ✓ Notification envoyée avec succès
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Les styles restent les mêmes...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: '100%',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: '#e1e1e1',
    height: 56,
    backgroundColor: '#ffffff',
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneInput: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#f8f9fa',
  },
  previewContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  previewNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  submitButton: {
    backgroundColor: '#fa4447',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  infoContainer: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
});