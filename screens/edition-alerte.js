import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditionAlerte () {
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedFrequency, setSelectedFrequency] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [frequencyInput, setFrequencyInput] = useState('');
  const [error, setError] = useState('');

  // Générer les heures de 00 à 23
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

  // Valider et enregistrer l'heure et la fréquence, puis envoyer à l'API
  const handleSubmit = async () => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeInput)) {
      setError('Format d\'heure invalide. Utilisez HH:mm (ex. : 14:30)');
      return;
    }

    const frequencyRegex = /^\d+$/;
    if (!frequencyRegex.test(frequencyInput) || parseInt(frequencyInput) <= 0) {
      setError('Fréquence invalide. Entrez un nombre positif (ex. : 1 heure)');
      return;
    }

    const [hours, minutes] = timeInput.split(':').map(Number);
    const newTime = new Date(selectedTime);
    newTime.setHours(hours, minutes, 0, 0);
    const frequency = parseInt(frequencyInput);

    // Envoyer les données à l'API
    try {
      // matricule
      const matricule = await AsyncStorage.getItem('matricule');
          if (!matricule) {
            console.warn('⚠️ Veuillez vous connecter pour accéder à cette fonctionnalité.');
            return;
          }

      const response = await fetch('https://rouah.net/api/edition-alerte.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          heure: timeInput, // Format HH:mm
          frequence: frequency, // Nombre entier
          utilisateur_id:matricule,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi à l\'API');
      }

      const result = await response.json();
      Alert.alert('Succès', result);
      setSelectedTime(newTime);
      setSelectedFrequency(frequency.toString());
      setError('');
      setTimeInput('');
      setFrequencyInput('');
      setShowModal(false);
    } catch (error) {
      setError('Erreur lors de l\'envoi à l\'API : ' + error.message);
    }
  };

  const showTimePicker = (hour) => {
    setShowModal(true);
    setTimeInput(`${hour}:00`); // Préremplir avec l'heure cliquée
    setFrequencyInput('');
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeInput('');
    setFrequencyInput('');
    setError('');
  };

  return (
    <View style={styles.container}>
      {/* En-tête : dataContainer */}
      <View style={styles.dataContainer}>
        <View style={styles.dataRow}>
          <Text style={styles.label}>
            Heure sélectionnée :{' '}
            {selectedTime.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          <Text style={styles.label}>
            Fréquence : {selectedFrequency ? `${selectedFrequency} jour(s)` : 'Non définie'}
          </Text>
        </View>
      </View>
      {/* Grille des heures */}
      <View style={styles.hoursContainer}>
        <Text style={styles.hoursTitle}>Heures (00-23)</Text>
        <View style={styles.hoursGrid}>
          {hours.map((hour, index) => (
            <TouchableOpacity
              key={index}
              style={styles.hourCell}
              onPress={() => showTimePicker(hour)}
            >
              <Text style={styles.hourText}>{hour}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Saisir l'heure et la fréquence</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex. : 14:30"
              value={timeInput}
              onChangeText={setTimeInput}
              keyboardType="numeric"
              maxLength={5}
            />
            <TextInput
              style={styles.textInput}
              placeholder="Ex. : 1 (heure)"
              value={frequencyInput}
              onChangeText={setFrequencyInput}
              keyboardType="numeric"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={handleSubmit}>
                <Text style={styles.buttonText}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  dataContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    width: '100%',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  label: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  hoursContainer: {
    width: 280,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  hoursTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  hourCell: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    width: '100%',
    marginBottom: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});