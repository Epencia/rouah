import React, { useRef, useState, useContext } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { GlobalContext } from '../global/GlobalState';

export default function Cartes() {
  const [bgColor, setBgColor] = useState('#fa4447');
  const viewShotRef = useRef(null);
  const [user] = useContext(GlobalContext);

  const colors = [
    '#fa4447', '#0099cc', '#28a745', '#ff9800',
    '#8e44ad', '#e67e22', '#34495e', '#1abc9c',
    '#f39c12', '#2ecc71', '#c0392b', '#3498db',
    '#9b59b6', '#e74c3c'
  ];

  const downloadCard = async () => {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission requise", "Autorise l'accès à la galerie pour enregistrer l'image.");
      return;
    }

    try {
      const uri = await viewShotRef.current.capture();
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Succès", "La carte a été enregistrée dans ta galerie !");
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'enregistrer l'image.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabsContainer}>
        {colors.map((color) => (
          <TouchableOpacity
            key={color}
            style={[styles.tab, { backgroundColor: color }]}
            onPress={() => setBgColor(color)}
          />
        ))}
      </View>

      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
        <View style={[styles.card, { backgroundColor: bgColor }]}>
          
          {/* ✅ "Découvrez" au-dessus + rapprochement logo/titre */}
          <View style={styles.topSection}>
            <Text style={styles.subtitle}>Scannez & Découvrez</Text>
            <Image source={require('../assets/logo.png')} style={styles.logo} />
            <Text style={styles.title}>Rouah</Text>
          </View>

          <View style={styles.qrBox}>
            <QRCode value={`https://rouah.net/app/boutique/${user?.matricule ?? "001"}`} size={160} />
          </View>
        </View>
      </ViewShot>

      <TouchableOpacity style={styles.downloadBtn} onPress={downloadCard}>
        <Text style={styles.downloadText}>Télécharger la carte</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  tabsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 },
  tab: { width: 40, height: 40, borderRadius: 20, margin: 5 },

  card: { 
    width: 250, 
    height: 400, 
    padding: 20, 
    borderRadius: 16, 
    alignItems: 'center' 
  },
  
  // ✅ Section modifiée
  topSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#fff',
    marginBottom: -5, // Petit espace au-dessus du logo
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    marginTop: -15,  // ✅ Espace réduit entre logo et "Rouah"
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
  },

  qrBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
  },
  downloadBtn: { marginTop: 20, backgroundColor: '#333', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  downloadText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
