import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TextInput, TouchableOpacity, Alert } from 'react-native';
import { GlobalContext } from '../global/GlobalState';

export default function EditionFamille({navigation}) {
  const [otp1, setOtp1] = useState('');
  const [otp2, setOtp2] = useState('');
  const [userInput, setUserInput] = useState(['', '', '', '', '', '']);
  const [user] = useContext(GlobalContext);
  const inputRefs = useRef([]);

  // Générer deux OTP de 6 chiffres
  useEffect(() => {
    navigation.setOptions({ title: 'Ajouter un membre' });

    if (user?.matricule) {
      const matricule = user.matricule.toString();
      setOtp1(matricule.padStart(6, '0').slice(0, 6));
    }
  }, [user]);

  // Gérer la saisie utilisateur
  const handleInputChange = (text, index) => {
    // Vérifier que c'est un chiffre
    if (text && !/^\d+$/.test(text)) return;
    
    const newInput = [...userInput];
    newInput[index] = text;
    setUserInput(newInput);
    
    // Focus automatique sur le champ suivant si un chiffre est saisi
    if (text && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Valider le code saisi
  const validateCode = async () => {
    
   const otp2 = userInput.join(''); // Récupérer le code saisi
    
    if (otp2.length !== 6) {
      Alert.alert('Erreur', 'Veuillez saisir les 6 chiffres du code');
      return;
    }

    try {
  
        const response = await fetch('https://rouah.net/api/edition-famille.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            demandeur: user.matricule,
            receveur: otp2
          }),
        });
  
        const result = await response.json();
        Alert.alert('Message', result.message || result);
  
      } catch (err) {
        Alert.alert('Erreur', err.message || 'Échec de l\'opération');
      }

  };


  // Afficher le code principal dans 6 cases (lecture seule)
  const renderOtpBoxes = (otp) => {
    return otp.split('').map((digit, index) => (
      <View key={`otp-${index}`} style={styles.otpBox}>
        <Text style={styles.otpBoxText}>{digit}</Text>
      </View>
    ));
  };

  // Afficher les champs de saisie pour le code secondaire
  const renderInputBoxes = () => {
    return userInput.map((digit, index) => (
      <TextInput
        key={`input-${index}`}
        ref={(ref) => (inputRefs.current[index] = ref)}
        style={styles.inputBox}
        keyboardType="numeric"
        maxLength={1}
        value={digit}
        onChangeText={(text) => handleInputChange(text, index)}
        selectTextOnFocus
        onKeyPress={({ nativeEvent }) => {
          if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
            inputRefs.current[index - 1].focus();
          }
        }}
      />
    ));
  };

  return (
    <View style={styles.container}>
  
      {/* Premier code OTP (lecture seule) */}
      <View style={styles.otpSection}>
        <Text style={styles.subtitle}>Mon code de sécurité</Text>
        <View style={styles.otpContainer}>
          {renderOtpBoxes(otp1)}
        </View>
      </View>
      
      {/* Deuxième code OTP (saisie utilisateur) */}
      <View style={styles.otpSection}>
        <Text style={styles.subtitle}>Code de sécurité du proche</Text>
        <View style={styles.otpContainer}>
          {renderInputBoxes()}
        </View>
      </View>

      {/* Bouton de validation */}
      <TouchableOpacity 
        style={styles.button} 
        onPress={validateCode}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>Valider</Text>
      </TouchableOpacity>
      
      <Text style={styles.note}>
        Veuillez saisir le code de sécurité de votre proche pour l'ajouter à votre famille
      </Text>

      <TouchableOpacity 
        onPress={() => navigation.navigate('Contacts')}
        style={styles.linkContainer}
      >
        <Text style={styles.linkText}>Je n'ai pas le code de mon proche</Text>
      </TouchableOpacity>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  otpSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#555',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width * 0.85,
    marginBottom: 10,
  },
  otpBox: {
    width: 50,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#fa4447',
  },
  otpBoxText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fa4447',
  },
  inputBox: {
    width: 50,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#fff',
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fa4447',
    borderWidth: 1,
    borderColor: '#fa4447',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  button: {
    backgroundColor: '#fa4447',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  note: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 30,
    width: width * 0.8,
    lineHeight: 24,
  },
  linkContainer: {
    marginTop: 15,
  },
  linkText: {
    color: '#fa4447',
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});