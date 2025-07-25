import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { GlobalContext } from '../global/GlobalState';

export default function CodeSecurite() {
  const [otp, setOtp] = useState('');
  const [user] = useContext(GlobalContext);

  // Générer un OTP de 6 chiffres
  useEffect(() => {
    if (user?.matricule) {
      setOtp(user.matricule.toString().padStart(6, '0').slice(0, 6));
    }
  }, [user]);

  // Afficher le code dans 6 cases (1 chiffre par case)
  const renderOtpBoxes = () => {
    return otp.split('').map((digit, index) => (
      <View key={index} style={styles.otpBox}>
        <Text style={styles.otpBoxText}>{digit}</Text>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Votre code de sécurité</Text>
      
      <View style={styles.otpContainer}>
        {renderOtpBoxes()}
      </View>
      
      <Text style={styles.note}>Veuillez le communiquer à vos proches pour devenir un membre de leurs familles</Text>
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
    marginBottom: 40,
    color: '#333',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width * 0.85,
    marginBottom: 40,
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
  note: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    width: width * 0.8,
    lineHeight: 24,
  },
});