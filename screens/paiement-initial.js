// PaiementInitial.js - Écran d'initialisation du paiement Wave

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';



export default function PaiementInitial({ route, navigation }) {
  const { id: numeroTransaction } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [waveUrl, setWaveUrl] = useState(null);
  const [error, setError] = useState(null);


  useEffect(() => {
    if (!numeroTransaction) {
      setError('Aucune transaction spécifiée');
      setLoading(false);
      return;
    }

    // Initialiser le paiement au chargement
    initierPaiement();
  }, [numeroTransaction]);

  // Fonction pour initialiser le paiement via l'API
  const initierPaiement = async () => {
    try {
      setInitializing(true);
      setError(null);

      const response = await fetch(`https://rouah.net/api/paiement-initial.php?id=${numeroTransaction}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Erreur HTTP ${response.status}`);
      }

      if (data.success) {
        setTransaction(data.data);
        
        // Si l'URL Wave est disponible
        if (data.data?.wave_url) {
          setWaveUrl(data.data.wave_url);
        } else if (data.redirect_url) {
          setWaveUrl(data.redirect_url);
        }

        // Gérer les redirections spéciales
        if (data.redirect) {
          handleRedirect(data.redirect);
        }
      } else {
        throw new Error(data.message || 'Erreur lors de l\'initialisation');
      }

    } catch (err) {
 
      setError(err.message);
      
      Alert.alert(
        'Erreur',
        err.message || 'Impossible d\'initialiser le paiement',
        [
          { text: 'Réessayer', onPress: initierPaiement },
          { text: 'Annuler', style: 'cancel', onPress: () => navigation.goBack() }
        ]
      );
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  };

  // Gérer les redirections spéciales (succès/échec déjà traités)
  const handleRedirect = (redirectUrl) => {
    if (redirectUrl.includes('paiement-succes')) {
      // Extraire l'ID et naviguer vers succès
      const match = redirectUrl.match(/id=([^&]+)/);
      const id = match ? match[1] : numeroTransaction;
      navigation.replace('PaiementSucces', { id });
    } else if (redirectUrl.includes('paiement-echec')) {
      const match = redirectUrl.match(/id=([^&]+)/);
      const id = match ? match[1] : numeroTransaction;
      navigation.replace('PaiementEchec', { id });
    }
  };


  // Ouvrir l'URL Wave dans le navigateur par défaut
  const ouvrirWaveNavigateur = async (waveUrl) => {

      try {
        if (waveUrl) {
          await Linking.openURL(waveUrl);
        } else {
          Alert.alert('Erreur', 'Impossible d\'ouvrir l\'URL de paiement');
        }
      } catch (error) {

        Alert.alert('Erreur', 'Impossible d\'ouvrir le lien de paiement');
      }
    
  };


  // Formater le montant
  const formatMontant = (montant) => {
    if (!montant) return '0';
    return Number(montant).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top','bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color="#0d6efd" />
        <Text style={styles.loadingText}>Initialisation du paiement...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom', 'left', 'right']}>

      <View style={styles.card}>
        <Ionicons name="wallet-outline" size={80} color="#0d6efd" style={styles.icon} />

        <Text style={styles.title}>Paiement Wave</Text>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Finalisez votre paiement via Wave
            </Text>

            {transaction && (
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Transaction :</Text>
                  <Text style={styles.value}>{transaction.numero_transaction}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.label}>Montant :</Text>
                  <Text style={[styles.value, styles.amount]}>
                    {formatMontant(transaction.montant)} FCFA
        </Text>
                </View>

              </View>
            )}

            <View style={styles.waveInfo}>
              <Ionicons name="information-circle-outline" size={20} color="#6c757d" />
              <Text style={styles.waveInfoText}>
                Vous allez être redirigé vers Wave pour finaliser votre paiement
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btnPrimary, initializing && styles.btnDisabled]}
              onPress={()=>ouvrirWaveNavigateur(transaction.wave_url)}
              disabled={initializing || !waveUrl}
            >
              {initializing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="card" size={24} color="#fff" style={styles.btnIcon} />
                  <Text style={styles.btnText}>Payer avec Wave</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => navigation.goBack()}
              disabled={initializing}
            >
              <Text style={styles.btnOutlineText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.retryLink}
              onPress={initierPaiement}
              disabled={initializing}
            >
              <Text style={styles.retryLinkText}>Réinitialiser le paiement</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c2c7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#842029',
    textAlign: 'center',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  label: {
    fontWeight: '600',
    color: '#495057',
    fontSize: 15,
  },
  value: {
    fontWeight: '500',
    color: '#212529',
    fontSize: 15,
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  amount: {
    color: '#0d6efd',
    fontWeight: 'bold',
    fontSize: 18,
  },
  waveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e7f3ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  waveInfoText: {
    color: '#0d6efd',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  btnPrimary: {
    backgroundColor: '#0d6efd',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  btnDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  btnIcon: {
    marginRight: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: '#6c757d',
    borderRadius: 12,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnOutlineText: {
    color: '#6c757d',
    fontSize: 17,
    fontWeight: '600',
  },
  retryLink: {
    paddingVertical: 12,
  },
  retryLinkText: {
    color: '#6c757d',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  // Styles WebView
  webViewContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d6efd',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  webViewCloseButton: {
    padding: 8,
  },
  webViewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  webView: {
    flex: 1,
  },
  webViewLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
