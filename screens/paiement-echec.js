// PaiementEchec.js - Écran échec en React Native

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';


export default function PaiementEchec({ route, navigation }) {
  const { id: numeroTransaction } = route.params || {};

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: 'Paiement échoué' });

    if (!numeroTransaction || numeroTransaction.trim() === '') {
      setMessage('Aucune référence de transaction fournie.');
      setLoading(false);
      return;
    }

    const fetchTransactionEchec = async () => {
      try {
        setLoading(true);
        
        const res = await fetch(`https://rouah.net/api/paiement-echec.php?id=${numeroTransaction}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          throw new Error(`Erreur HTTP ${res.status}`);
        }

        const responseData = await res.json();


        // Traitement selon la structure de réponse
        if (responseData.success === true) {
          // Transaction trouvée et traitée
          if (responseData.data) {
            setTransaction(responseData.data);
          }
          
          if (responseData.redirect === 'succes') {
            // Transaction déjà en succès, rediriger
            Alert.alert(
              'Transaction déjà réussie',
              'Cette transaction a déjà été validée avec succès.',
              [
                {
                  text: 'Voir le reçu',
                  onPress: () => navigation.replace('PaiementSucces', { id: numeroTransaction })
                }
              ]
            );
            return;
          }
          
          setMessage(responseData.message || 'Transaction annulée avec succès');
          
        } else if (responseData.success === false) {
          // Transaction en échec ou autre erreur
          if (responseData.data) {
            setTransaction(responseData.data);
          }
          
          if (responseData.redirect === 'echec') {
            setMessage(responseData.message || 'Transaction déjà en échec');
          } else {
            setMessage(responseData.message || 'Erreur lors du traitement');
          }
          
          // Si c'est une erreur 404
          if (responseData.message?.includes('introuvable')) {
            setMessage('Transaction non trouvée dans notre système.');
          }
          
        } else {
          // Format de réponse inattendu
          setMessage('Réponse inattendue du serveur');
        }

      } catch (err) {
        console.error('Erreur détaillée:', err);
        setError(err.message);
        setMessage('Erreur technique. Vérifiez votre connexion et réessayez.');
        
        Alert.alert(
          'Erreur de connexion',
          'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
          [
            { text: 'Annuler', style: 'cancel' }
          ]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionEchec();
  }, [numeroTransaction]);




  // Formatage de la date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return new Date().toLocaleString('fr-FR');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['bottom', 'left', 'right']}>
        <ActivityIndicator size="large" color="#dc3545" />
        <Text style={styles.loadingText}>Vérification de la transaction...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom', 'left', 'right']}>
      <View style={styles.card}>
        <Ionicons name="close-circle" size={100} color="#dc3545" style={styles.icon} />

        <Text style={styles.title}>Paiement échoué</Text>
        <Text style={styles.subtitle}>
          Votre paiement n'a pas pu être finalisé.
        </Text>

        <View style={styles.alert}>
          <Text style={styles.alertText}>
            {message || 'La transaction a été interrompue ou refusée.'}
          </Text>
        </View>

        {transaction && (
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Référence :</Text>
              <Text style={styles.value}>{transaction.numero_transaction}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Statut :</Text>
              <Text style={[styles.value, { color: '#dc3545', fontWeight: 'bold' }]}>
                {transaction.etat_transaction || 'Échec'}
              </Text>
            </View>

            {transaction.date_transaction && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Date :</Text>
                <Text style={styles.value}>
                  {formatDate(transaction.date_transaction)}
                </Text>
              </View>
            )}

            {transaction.montant_total && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Montant :</Text>
                <Text style={styles.value}>
                  {Number(transaction.montant_total).toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
            )}

            {transaction.mode_reglement && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Mode :</Text>
                <Text style={styles.value}>{transaction.mode_reglement}</Text>
              </View>
            )}
          </View>
        )}

        {error && (
          <View style={[styles.alert, { backgroundColor: '#fff3cd', borderColor: '#ffeeba' }]}>
            <Text style={[styles.alertText, { color: '#856404' }]}>
              {error}
            </Text>
          </View>
        )}


        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => { navigation.navigate('Bienvenue'); }}
        >
          <Text style={styles.btnOutlineText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8d7da',
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f8d7da',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    alignItems: 'center',
    width: '100%',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
    textAlign: 'center',
  },
  alert: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c2c7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  alertText: {
    color: '#842029',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  label: {
    fontWeight: '600',
    color: '#495057',
    fontSize: 14,
  },
  value: {
    fontWeight: '500',
    color: '#212529',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
    marginLeft: 10,
  },
  btnPrimary: {
    backgroundColor: '#0d6efd',
    borderRadius: 10,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: '#6c757d',
    borderRadius: 10,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#6c757d',
    fontSize: 17,
    fontWeight: '600',
  },
});
