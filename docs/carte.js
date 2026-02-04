import React, { useRef, useState,useContext } from 'react';
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

  // Fonction pour capturer et enregistrer
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

      {/* Capture du recto/verso identique */}
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
        <View style={[styles.card, { backgroundColor: bgColor }]}>
          <View style={styles.headerRow}>
            <Image source={require('../assets/logo.png')} style={styles.logo} />
            <View style={styles.textContainer}>
              <Text style={styles.subtitle}>Découvrez</Text>
              <Text style={styles.title}>Rouah</Text>
            </View>
          </View>
          <View style={styles.qrBox}>
            <QRCode value={user?.matricule} size={160} />
          </View>
        </View>
      </ViewShot>

      {/* Bouton de téléchargement */}
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
  card: { width: 250, height: 400, padding: 20, borderRadius: 16, justifyContent: 'flex-start', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  logo: { width: 95, height: 95, marginLeft: -30 },
  textContainer: { justifyContent: 'center' },
  subtitle: { fontSize: 20, fontWeight: '500', color: '#fff' },
  title: { fontSize: 35, fontWeight: '700', color: '#fff' },
  qrBox: { backgroundColor: '#fff', padding: 10, borderRadius: 12, marginTop: 10 },
  downloadBtn: { marginTop: 20, backgroundColor: '#333', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  downloadText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
