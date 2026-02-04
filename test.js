import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.9;
const cardHeight = cardWidth * 0.55; // Ratio approximatif d'une carte de visite (3.5 x 2 pouces)

const BusinessCard = () => {
  const flip = useSharedValue(0);

  const handleFlip = () => {
    flip.value = flip.value ? 0 : 1;
  };

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotateY: interpolate(flip.value, [0, 1], [0, 180]) + 'deg',
      },
    ],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotateY: interpolate(flip.value, [0, 1], [180, 360]) + 'deg',
      },
    ],
  }));

  // Suppose que le QR code pointe vers le site ou les contacts (vCard ou URL)
  // Exemple : une URL vers un site personnel ou LinkedIn, ou une vCard
  const qrValue = 'https://cyberic.example.com'; // Remplace par la vraie valeur si connue
  // Ou pour une vCard :
  // const qrValue = `BEGIN:VCARD\nVERSION:3.0\nN:Koffi;Eric;;;\nFN:Eric Koffi\nTITLE:Ingénieur informaticien\nEMAIL:erickoffi@rouah.net\nTEL:0709107849\nORG:CYBERIC\nEND:VCARD`;

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleFlip} activeOpacity={1}>
        <View style={styles.cardContainer}>
          <Animated.View
            style={[
              styles.card,
              styles.frontCard,
              frontAnimatedStyle,
            ]}
          >
            {/* Logo (utilise une Image si tu as l'URL du logo, sinon approximation avec Text) */}
            <View style={styles.logoContainer}>
              <Image
                            source={require('../assets/cyberic.png')}
                            style={styles.logo}
                            resizeMode="contain"
                          />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.name}>KOFFI ERIC</Text>
              <Text style={styles.title}>Ingénieur informaticien</Text>
              <Text style={styles.email}>erickoffi@rouah.net</Text>
              <Text style={styles.phone}>0709107849</Text>
            </View>

            
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              styles.backCard,
              styles.absolute,
              backAnimatedStyle,
            ]}
          >
            <View style={styles.backLogoContainer}>
              <Image
                            source={require('../assets/cyberic.png')}
                            style={styles.logo}
                            resizeMode="contain"
                          />
            </View>

            <View style={styles.qrContainer}>
              <QRCode
                value={qrValue}
                size={150}
                color="#d4af37" // Or doré
                backgroundColor="transparent"
              />
            </View>

            
          </Animated.View>
        </View>
      </TouchableOpacity>
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
  cardContainer: {
    width: cardWidth,
    height: cardHeight,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2F241F', // Marron foncé
    borderRadius: 15,
    padding: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  frontCard: {},
  backCard: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 80,
    color: '#d4af37',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  title: {
    fontSize: 15,
    color: '#d4af37',
    marginTop: 5,
  },
  email: {
    fontSize: 16,
    color: '#d4af37',
    marginTop: 15,
  },
  phone: {
    fontSize: 16,
    color: '#d4af37',
    marginTop: 5,
  },
  companyBottom: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  backLogoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backLogoText: {
    fontSize: 80,
    color: '#d4af37',
  },
  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyBack: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
  },
  logo: {
    width: 200,
    height: 200,
    borderColor: '#ccc',
  },
});

export default BusinessCard;