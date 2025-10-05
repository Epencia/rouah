import React, { useState, useContext, useEffect } from 'react';
import { View,Image, Pressable, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity,Alert } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import QRCode from 'react-native-qrcode-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GlobalContext } from '../global/GlobalState';

export default function Accueil() {

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;


  const rotation = useSharedValue(0);
    const [flipped, setFlipped] = useState(false);
    const [showBalance, setShowBalance] = useState(true);

  // variables
  const [user] = useContext(GlobalContext);
  const [annonce, setAnnonce] = useState([]);
  const [caisse, setCaisse] = useState(null);
  const [BarData, setBarData] = useState([]);
  const [PieData, setPieData] = useState([]);
  const [error, setError] = useState(null);

  // Formatage des montants
  const formatAmount = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
  };

  // Données pour les graphiques

  const getBarData = async () => {
    try {
      const response = await fetch(`https://rouah.net/api/statistique-annonce.php?matricule=${user?.matricule}`);
      const newData = await response.json();
      setBarData(newData);
    } catch (error) {
      setError(error);
    }
  };

  const getPieData = async () => {
    try {
      const response = await fetch(`https://rouah.net/api/statistique-transaction.php?matricule=${user?.matricule}`);
      const newData = await response.json();
      setPieData(newData);
    } catch (error) {
      setError(error);
    }
  };


  // Calcul du total pour le PieChart
  const total = PieData.reduce((sum, item) => sum + item.value, 0);

  // carte Rouah
    const flip = () => {
      setFlipped(!flipped);
      rotation.value = withTiming(flipped ? 0 : 180, { duration: 600 });
    };
  
    const frontAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotateY: `${rotation.value}deg` }],
      zIndex: rotation.value < 90 ? 1 : 0,
    }));
  
    const backAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ rotateY: `${rotation.value + 180}deg` }],
      zIndex: rotation.value >= 90 ? 1 : 0,
    }));


  useEffect(() => {
    const delay = 10000;
    getAnnonces();
    getCaisse();
    getBarData();
    getPieData();
    const intervalId = setInterval(getAnnonces, delay);
    return () => clearInterval(intervalId);
  }, []);


  const getAnnonces = async () => {
    try {
      const response = await fetch(`https://rouah.net/api/nombre-publication.php?matricule=${user?.matricule}`);
      const newData = await response.json();
      setAnnonce(newData);
    } catch (error) {
      setError(error);
    }
  };

  const getCaisse = async () => {
    try {
      const response = await fetch(`https://rouah.net/api/caisses-solde.php?utilisateur_id=${user?.matricule}`);
      const newData = await response.json();
      setCaisse(newData);
    } catch (error) {
      setError(error);
    }
  };

  // Composant de légende


  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de Bord</Text>
      </View>

      {/* Cartes de statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatAmount(user?.solde) || 0}</Text>
          <Text style={styles.statLabel}>Solde</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
           {typeof annonce !== 'undefined' && annonce !== null && annonce !== '' ? annonce : 0}
          </Text>
          <Text style={styles.statLabel}>Annonces</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatAmount(caisse?.solde) || 0}</Text>
          <Text style={styles.statLabel}>Caisse</Text>
        </View>
      </View>

  <View style={styles.profileContent}>
      <Pressable onPress={flip} style={styles.cardWrapper}>
              {/* Recto */}
              <Animated.View style={[styles.card, frontAnimatedStyle]}>
                <View style={styles.qrWrapper}>
                  <Image
                    source={require('../assets/logo.png')}
                    style={styles.filigrane}
                  />
                  <View style={{ alignItems: 'center', justifyContent: 'center', padding: 20,borderWidth: 0, }}>
                  {user && user.length > 0 && user.matricule ? (
             <QRCode
                value={user.matricule}
                size={200}
                backgroundColor="white"
                color="black"
              />
                 ) : (
             <QRCode
                value="001"
                size={200}
                backgroundColor="white"
                color="black"
              />
                  )}
                  </View>
                  <Image
                    source={require('../assets/logo.png')}
                    style={styles.qrLogo}
                  />
                </View>
              </Animated.View>
      
              {/* Verso */}
              <Animated.View style={[styles.card, styles.backCard, backAnimatedStyle]}>
                <Text style={styles.backText}>Rouah</Text>
              </Animated.View>
            </Pressable>
    </View>



  
    </ScrollView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333'
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '30%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fa4447'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden'
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerLabelText: {
    fontSize: 12,
    color: '#333'
  },
  centerLabelValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fa4447'
  },
  legendContainer: {
    marginLeft: 20,
    justifyContent: 'center'
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  legendText: {
    fontSize: 12,
    color: '#333'
  },
  // carte
  cardWrapper: {
    width: 250,
    height: 350,
    perspective: 1000,
  },
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth:1,
    borderColor:"#fa4447",
    backfaceVisibility: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backCard: {
    backgroundColor: '#fa4447',
    transform: [{ rotateY: '180deg' }],
  },
  backText: {
    fontSize: 55,
    color: 'white',
    fontFamily: 'Poppins',
  },
  qrWrapper: {
    width: 200,
    height: 200,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCode: {
    width: 200,
    height: 200,
    position: 'absolute',
    zIndex: 2,
  },
  filigrane: {
    width: 100,
    height: 100,
    position: 'absolute',
    opacity: 0.1,
    zIndex: 1,
  },
  qrLogo: {
    width: 50,
    height: 50,
    position: 'absolute',
    zIndex: 3,
    borderRadius: 10,
    backgroundColor: 'white',
    padding: 5,
  },
  profileContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    marginTop:15,
  },

});