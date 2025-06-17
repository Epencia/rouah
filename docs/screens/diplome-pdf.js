import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Linking,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';


export default function Diplomes({route}) {

  const item = route?.params?.item;

  const pdfUrl = `https://adores.cloud/api/diplome-pdf.php?matricule=${item.code_certificat}`;

   const handleDownload = () => {
    Linking.openURL(pdfUrl).catch(() => {
      Alert.alert('Erreur', 'Impossible d’ouvrir le PDF.');
    });
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: `https://adores.cloud/api/diplome-pdf.php?matricule=${item.code_certificat}` }}
        style={styles.webview}
        startInLoadingState
      />


      {/* Footer avec bouton centré */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                <Text style={styles.buttonText}>Télécharger le PDF</Text>
              </TouchableOpacity>
            </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
   footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fafafa',
    alignItems: 'center',
  },
  downloadButton: {
    backgroundColor: '#0A84FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
