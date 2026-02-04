import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Text,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

const Webviews = ({ navigation }) => {
  const [loading, setLoading] = useState(true);

  const handleLoadStart = () => setLoading(true);
  const handleLoadEnd = () => setLoading(false);

  const handleError = () => {
    Alert.alert(
      "Erreur de connexion",
      "Impossible de charger la page. Vérifiez votre connexion internet.",
      [{ text: "Réessayer", onPress: () => navigation.replace("ConnexionWeb") }]
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer}>

      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Indicateur de chargement */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2c5530" />
          <Text style={styles.loadingText}>Chargement de Rouah...</Text>
        </View>
      )}

      {/* WebView */}
      <WebView
        source={{ uri: 'https://rouah.net/core/pro' }}
        style={styles.webview}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        scalesPageToFit

        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"

        injectedJavaScript={`
          document.querySelector('meta[name="viewport"]').setAttribute(
            'content',
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
          );
          true;
        `}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#2c5530',
    fontWeight: '600',
  },
});

export default Webviews;
