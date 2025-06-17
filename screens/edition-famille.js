import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditionFamille() {
  const [formData, setFormData] = useState({
    demandeur: '',
    receveur: '',
    parente: '',
    etatMembre: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.demandeur) newErrors.demandeur = 'Le champ Demandeur est requis';
    if (!formData.receveur) newErrors.receveur = 'Le champ Receveur est requis';
    if (!formData.parente) newErrors.parente = 'Le champ Parenté est requis';
    if (!formData.etatMembre) newErrors.etatMembre = 'Le champ État est requis';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddMembre = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('https://adores.cloud/api/edition-membre.php', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          demandeur: formData.demandeur,
          receveur: formData.receveur,
          parente: formData.parente,
          etat_membre: formData.etatMembre,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erreur serveur');
      }

      Alert.alert('Succès', result.message || 'Membre ajouté avec succès');
      // Reset form
      setFormData({
        demandeur: '',
        receveur: '',
        parente: '',
        etatMembre: ''
      });
    } catch (error) {
      Alert.alert('Erreur', error.message || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
       <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Ajout de Membre</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Demandeur *</Text>
          <TextInput
            style={[styles.input, errors.demandeur && styles.inputError]}
            placeholder="Code du demandeur"
            value={formData.demandeur}
            onChangeText={(text) => handleChange('demandeur', text)}
          />
          {errors.demandeur && <Text style={styles.errorText}>{errors.demandeur}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Receveur *</Text>
          <TextInput
            style={[styles.input, errors.receveur && styles.inputError]}
            placeholder="Code du receveur"
            value={formData.receveur}
            onChangeText={(text) => handleChange('receveur', text)}
          />
          {errors.receveur && <Text style={styles.errorText}>{errors.receveur}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Parenté *</Text>
          <TextInput
            style={[styles.input, errors.parente && styles.inputError]}
            placeholder="Ex : Frère, Mère, Ami(e)..."
            value={formData.parente}
            onChangeText={(text) => handleChange('parente', text)}
          />
          {errors.parente && <Text style={styles.errorText}>{errors.parente}</Text>}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>État du Membre *</Text>
          <TextInput
            style={[styles.input, errors.etatMembre && styles.inputError]}
            placeholder="Ex : actif, inactif"
            value={formData.etatMembre}
            onChangeText={(text) => handleChange('etatMembre', text)}
          />
          {errors.etatMembre && <Text style={styles.errorText}>{errors.etatMembre}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleAddMembre}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Ajouter le Membre</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff'
  },
  container: {
    padding: 20,
    paddingBottom: 40
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#2593B6'
  },
  formGroup: {
    marginBottom: 15
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#333'
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9'
  },
  inputError: {
    borderColor: 'red',
    backgroundColor: '#fff0f0'
  },
  errorText: {
    color: 'red',
    marginTop: 5,
    fontSize: 14
  },
  button: {
    backgroundColor: '#2593B6',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonDisabled: {
    opacity: 0.7
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});