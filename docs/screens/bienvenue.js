import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StatusBar,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Localisation de la famille et des amis',
    description:
      'Obtenez des informations précises pour savoir où va votre enfant ou votre parent.',
    image: require('../assets/images/images1.png'),
  },
  {
    id: '2',
    title: 'Suivi en temps réel',
    description:
      'Gardez un œil sur votre famille et vos amis avec des alertes en temps réel.',
    image: require('../assets/images/images2.png'),
  },
  {
    id: '3',
    title: 'Ordinateurs perdus ou volés',
    description:
      'Suivez les traces de votre ordinateur après un vol ou une perte.',
    image: require('../assets/images/images3.png'),
  },
];

export default function Bienvenue({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const directionRef = useRef(1);

  useEffect(() => {
    const interval = setInterval(() => {
      let nextIndex = currentIndex + directionRef.current;

      if (nextIndex >= slides.length) {
        directionRef.current = -1;
        nextIndex = currentIndex + directionRef.current;
      } else if (nextIndex < 0) {
        directionRef.current = 1;
        nextIndex = currentIndex + directionRef.current;
      }

      scrollToIndex(nextIndex);
      setCurrentIndex(nextIndex);
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const scrollToIndex = (index) => {
    flatListRef.current?.scrollToIndex({ index });
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{flexDirection: 'row',alignItems: 'center',justifyContent: 'flex-end',marginLeft:10}}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.avatarImg}
            resizeMode="contain"
          />
          <Text style={{color: '#414d63',fontSize: 20,fontWeight: 'bold',marginLeft:8}}>Adorès Cloud</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.appButton2}
              onPress={() => navigation.navigate('Gemini')}
            >
              <MaterialCommunityIcons name="chat" size={24} color="#414d63" />
            </TouchableOpacity>
            <View style={{ marginRight: 2 }} />
            <TouchableOpacity
              style={styles.appButton2}
              onPress={() => navigation.navigate('Registre de controle')}
            >
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={24} color="#414d63" />
            </TouchableOpacity>
            <View style={{ marginRight: 2 }} />
            <TouchableOpacity
              style={styles.appButton2}
              onPress={() => navigation.navigate('Connexion')}
            >
              <MaterialCommunityIcons name="login" size={24} color="#414d63" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Slider */}
        <View style={styles.sliderContainer}>
          <FlatList
            ref={flatListRef}
            data={slides}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            renderItem={({ item }) => (
              <View style={styles.slide}>
                <Image source={item.image} style={styles.image} resizeMode="contain" />
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>
              </View>
            )}
          />
        </View>

        {/* Pagination */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentIndex === index && styles.activeDot]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Connexion')}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>CONNEXION ›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Inscription')}
            style={styles.nextButton}
          >
            <Text style={styles.nextText}>INSCRIPTION ›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  logo: {
    width: 100,
    height: 40,
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    borderWidth:1,
    borderColor:'gray'
  },
  headerButtons: {
    flexDirection: 'row',
  },
  appButton2: {
    padding: 8,
  },
  sliderContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 20,
  },
  image: {
    width: '90%',
    height: '50%',
    maxHeight: height * 0.4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 12,
    color: '#111',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#0A84FF',
    width: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  skipButton: {
    padding: 14,
    backgroundColor: '#F3F3F3',
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  nextButton: {
    padding: 14,
    backgroundColor: '#0A84FF',
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  skipText: {
    color: '#333',
    fontWeight: 'bold',
  },
  nextText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});