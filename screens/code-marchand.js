import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  ScrollView, 
  Platform,
  Alert,
  TouchableOpacity
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalContext } from '../global/GlobalState';
import * as Clipboard from 'expo-clipboard';

export default function CodeMarchand() {
  const [otp, setOtp] = useState('');
  const [pushToken, setPushToken] = useState('');
  const [user] = useContext(GlobalContext);

  // Générer un OTP de 6 chiffres
  useEffect(() => {
    if (user?.matricule) {
      setOtp(user.matricule.toString().padStart(6, '0').slice(0, 6));
    }
  }, [user]);

  // Récupérer le token push
  useEffect(() => {
    const getPushToken = async () => {
      try {
        const token = await AsyncStorage.getItem('pushToken');
        if (token) {
          setPushToken(token);
        }
      } catch (error) {
        console.error('Erreur récupération token:', error);
      }
    };
    
    getPushToken();
  }, []);

  // Fonction pour copier le token dans le presse-papier
  const copyTokenToClipboard = async () => {
    if (pushToken) {
      await Clipboard.setStringAsync(pushToken);
      Alert.alert('Succès', 'Token copié dans le presse-papier');
    }
  };

  // Afficher le code dans 6 cases
  const renderOtpBoxes = () => {
    if (!otp) return null;
    
    return otp.split('').map((digit, index) => (
      <View key={index} style={styles.otpBox}>
        <Text style={styles.otpBoxText}>{digit}</Text>
      </View>
    ));
  };

  // Fonction pour copier l'OTP
  const copyOtpToClipboard = async () => {
    if (otp) {
      await Clipboard.setStringAsync(otp);
      Alert.alert('Succès', 'Code marchand copié');
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
      <View style={styles.container}>
        <Text style={styles.title}>Votre code marchand</Text>
        
        <View style={styles.otpContainer}>
          {renderOtpBoxes()}
        </View>
        
        <TouchableOpacity onPress={copyOtpToClipboard} style={styles.copyButton}>
          <Text style={styles.copyButtonText}>📋 Copier le code</Text>
        </TouchableOpacity>
        
        <Text style={styles.note}>
          Veuillez communiquer ce code pour votre identification auprès des partenaires
        </Text>

        {/* Section Token Push */}
        <View style={styles.tokenSection}>
          <Text style={styles.sectionTitle}>Informations Techniques</Text>
          
          {pushToken ? (
            <View style={styles.tokenContainer}>
              <View style={styles.tokenHeader}>
                <Text style={styles.tokenTitle}>Token Push :</Text>
                <TouchableOpacity onPress={copyTokenToClipboard} style={styles.copyIconButton}>
                  <Text style={styles.copyIcon}>📋</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.tokenBox} 
                onPress={copyTokenToClipboard}
                activeOpacity={0.7}
              >
                <Text style={styles.tokenText} selectable={true}>
                  {pushToken}
                </Text>
              </TouchableOpacity>
              
              <Text style={styles.tokenNote}>
                Ce token unique est utilisé pour les notifications push sur votre appareil
              </Text>
              
  
            </View>
          ) : (
            <View style={styles.noTokenContainer}>
              <Text style={styles.noTokenIcon}>🔔</Text>
              <Text style={styles.noTokenTitle}>Aucun token push disponible</Text>
              <Text style={styles.noTokenText}>
                Le token push sera généré automatiquement lorsque vous autoriserez les notifications
              </Text>
              <Text style={styles.noTokenSubtext}>
                (Redémarrez l'application si nécessaire)
              </Text>
            </View>
          )}
          

        </View>
      </View>
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 30,
  },
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: Math.min(width * 0.85, 350),
    marginBottom: 25,
  },
  otpBox: {
    width: 55,
    height: 65,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#fa4447',
  },
  otpBoxText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fa4447',
  },
  copyButton: {
    backgroundColor: '#414d63',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 25,
    shadowColor: '#414d63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  note: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    width: Math.min(width * 0.9, 400),
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  tokenSection: {
    width: '100%',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
    alignSelf: 'flex-start',
    paddingLeft: 10,
  },
  tokenContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 25,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tokenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  tokenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  copyIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  copyIcon: {
    fontSize: 20,
  },
  tokenBox: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginBottom: 15,
  },
  tokenText: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#495057',
    lineHeight: 20,
    textAlign: 'left',
    marginBottom: 10,
  },
  tokenHint: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tokenNote: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 20,
  },
  tokenInfo: {
    backgroundColor: '#e7f3ff',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0d6efd',
  },
  infoText: {
    fontSize: 13,
    color: '#0d6efd',
    marginBottom: 5,
  },
  noTokenContainer: {
    width: '100%',
    backgroundColor: '#fff8e1',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffeaa7',
    marginBottom: 25,
  },
  noTokenIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  noTokenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e67e22',
    marginBottom: 10,
    textAlign: 'center',
  },
  noTokenText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 5,
  },
  noTokenSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  userInfoContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  userInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  userInfoBox: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  userInfoText: {
    fontSize: 15,
    color: '#495057',
    marginBottom: 12,
    lineHeight: 22,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#333',
  },
});