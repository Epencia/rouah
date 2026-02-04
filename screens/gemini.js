import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.9;
const cardHeight = cardWidth * 0.56; // Ratio proche d'une carte de visite standard

const BusinessCard = () => {
  // Valeur du QR code : tu peux mettre une URL ou une vCard
  const qrValue = `BEGIN:VCARD
VERSION:3.0
N:Koffi;Eric;;;
FN:Eric Koffi
ORG:CYBERIC
TITLE:Ingénieur informaticien
TEL:+2250709107849
EMAIL:erickoffi@rouah.net
URL:https://cyberic.example.com
END:VCARD`;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Logo à gauche */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/cyberic.png')} // Assure-toi que le chemin est correct
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Informations à droite */}
        <View style={styles.infoContainer}>
          <Text style={styles.name}>KOFFI ERIC</Text>
          <Text style={styles.title}>Ingénieur informaticien</Text>
          <Text style={styles.email}>erickoffi@rouah.net</Text>
          <Text style={styles.phone}>0709107849</Text>
        </View>

        {/* QR Code en bas à droite */}
        <View style={styles.qrContainer}>
          <QRCode
            value={qrValue}
            size={50}
            color="#D4AF37"
            backgroundColor="transparent"
          />
        </View>

        {/* Nom de l'entreprise en bas à gauche */}
        
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  card: {
    width: cardWidth,
    height: cardHeight,
    backgroundColor: '#2F241F', // Marron très foncé
    borderRadius: 16,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 25,
    position: 'relative',
    overflow: 'hidden',
  },
  logoContainer: {
    position: 'absolute',
    
  },
  logo: {
    width: 200,
    height: 200,
  },
  infoContainer: {
    justifyContent: 'center',
    alignItems:'flex-end',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#D4AF37',
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    color: '#D4AF37',
    marginTop: 8,
    opacity: 0.9,
  },
  email: {
    fontSize: 17,
    color: '#D4AF37',
    marginTop: 20,
  },
  phone: {
    fontSize: 17,
    color: '#D4AF37',
    marginTop: 6,
  },
  qrContainer: {
    position: 'absolute',
    right: 30,
    bottom: 30,
  },
  company: {
    position: 'absolute',
    left: 30,
    bottom: 30,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#D4AF37',
    letterSpacing: 1,
  },
});

export default BusinessCard;