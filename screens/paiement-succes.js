// PaiementSucces.js - Écran succès en React Native

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';


export default function PaiementSucces({ route, navigation }) {
  const { id: numeroTransaction } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transaction, setTransaction] = useState(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  
  

  useEffect(() => {
    navigation.setOptions({ title: 'Paiement réussi' });
    
    if (!numeroTransaction || numeroTransaction.trim() === '') {
      Alert.alert('Erreur', 'Transaction non spécifiée', [
        { text: 'OK', onPress: () => navigation.navigate('Bienvenue') },
      ]);
      return;
    }

    
   const fetchAndValidateTransaction = async () => {
  try {
    const res = await fetch(`https://rouah.net/api/paiement-succes.php?id=${numeroTransaction}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) throw new Error('Erreur réseau');

    const data = await res.json();

    if (!data.success) {
      throw new Error('Transaction introuvable');
    }

    // ⚠️ IMPORTANT: Les données de la transaction sont dans data.data
    const transactionData = data.data;
    setTransaction(transactionData);

    // Vérifier l'état de la transaction dans data.data
    if (transactionData.etat_transaction === 'Succes') {
      setLoading(false);
      // Afficher un message de succès
      Alert.alert('Succès', 'Votre paiement a été confirmé avec succès !');
      return;
    }

    // Déjà Échec → rediriger vers échec
    if (transactionData.etat_transaction === 'Echec') {
      navigation.replace('PaiementEchec', { id: numeroTransaction });
      return;
    }

  } catch (err) {
    console.error(err);
    setError('Erreur lors de la validation du paiement.');
  } finally {
    setLoading(false);
  }
};

    fetchAndValidateTransaction();
  }, [numeroTransaction, navigation]);

  const generateAndShareReceipt = async () => {
  if (!transaction) {
    Alert.alert('Erreur', 'Aucune transaction à générer');
    return;
  }

  setPdfGenerating(true);

  try {
    // Vérifier si le partage est disponible
    const isSharingAvailable = await Sharing.isAvailableAsync();
    
    if (!isSharingAvailable) {
      Alert.alert(
        'Non disponible', 
        'Le partage de fichiers n\'est pas disponible sur cet appareil.'
      );
      return;
    }

    // Formater la date correctement
    const formatDate = (dateString) => {
      if (!dateString) return '—';
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (e) {
        return dateString;
      }
    };

    // Formater le montant
    const formatAmount = (amount) => {
      if (!amount) return '0';
      return Number(amount).toLocaleString('fr-FR');
    };

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Helvetica', 'Arial', sans-serif;
              padding: 30px;
              background: #f8f9fa;
              min-height: 100vh;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .receipt {
              max-width: 600px;
              width: 100%;
              background: white;
              border-radius: 20px;
              padding: 40px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            h1 {
              text-align: center;
              color: #2c3e50;
              font-size: 28px;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e9ecef;
            }
            .success-icon {
              text-align: center;
              font-size: 60px;
              margin-bottom: 20px;
            }
            .info-grid {
              background: #f8f9fa;
              border-radius: 15px;
              padding: 25px;
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 1px solid #dee2e6;
            }
            .info-row:last-child {
              border-bottom: none;
              margin-bottom: 0;
              padding-bottom: 0;
            }
            .info-label {
              width: 120px;
              font-weight: 600;
              color: #495057;
            }
            .info-value {
              flex: 1;
              color: #212529;
            }
            .amount {
              text-align: center;
              margin: 30px 0;
              padding: 30px;
              background: linear-gradient(135deg, #28a745, #20c997);
              border-radius: 15px;
              color: white;
            }
            .amount-number {
              font-size: 42px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .amount-label {
              font-size: 14px;
              opacity: 0.9;
            }
            .footer {
              text-align: center;
              color: #6c757d;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #dee2e6;
            }
            .footer img {
              width: 100px;
              height: auto;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="success-icon">✅</div>
            <h1>Reçu de Paiement</h1>
            
            <div class="info-grid">
              <div class="info-row">
                <span class="info-label">N° Transaction</span>
                <span class="info-value"><strong>${transaction.numero_transaction || '—'}</strong></span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Type</span>
                <span class="info-value">${transaction.type_transaction || 'Abonnement'}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Date</span>
                <span class="info-value">${formatDate(transaction.date_transaction)}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">Mode</span>
                <span class="info-value">${transaction.mode_reglement || 'Wave'}</span>
              </div>
              
              ${transaction.motif_transaction ? `
              <div class="info-row">
                <span class="info-label">Motif</span>
                <span class="info-value">${transaction.motif_transaction}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="amount">
              <div class="amount-number">${formatAmount(transaction.montant_total)} FCFA</div>
              <div class="amount-label">Montant total payé</div>
            </div>
            
            <div class="footer">
              <p>Ce reçu est généré automatiquement par Rouah.net</p>
              <p>${new Date().toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('Génération du PDF...');
    
    // Générer le PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    console.log('PDF généré avec succès:', uri);

    // Vérifier que le fichier existe
    if (!uri) {
      throw new Error('Le PDF n\'a pas été généré correctement');
    }

    // Partager le PDF
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Reçu de paiement',
      UTI: 'com.adobe.pdf',
    });

  } catch (err) {
    console.error('Erreur détaillée:', err);
    
    let errorMessage = 'Impossible de générer le reçu PDF.';
    
    if (err.message) {
      errorMessage += `\n${err.message}`;
    }
    
    Alert.alert(
      'Erreur', 
      errorMessage,
      [
        { text: 'OK' },
        { 
          text: 'Réessayer', 
          onPress: generateAndShareReceipt 
        }
      ]
    );
  } finally {
    setPdfGenerating(false);
  }
};
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#28a745" />
      </SafeAreaView>
    );
  }

  if (error || !transaction) {
    return (
      <SafeAreaView style={styles.container} edges={['top','bottom', 'left', 'right']}>
        <Text style={styles.errorText}>{error || 'Transaction non trouvée'}</Text>
        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => navigation.navigate('Bienvenue')}
        >
          <Text style={styles.btnOutlineText}>Retour à l'accueil</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Ionicons name="checkmark-circle" size={100} color="#28a745" style={styles.icon} />

          <Text style={styles.title}>Paiement Réussi</Text>

          <View style={styles.infoBox}>
            <View style={styles.row}>
              <Text style={styles.label}>N° Transaction :</Text>
              <Text style={styles.value}>{transaction.numero_transaction}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Type :</Text>
              <Text style={styles.value}>{transaction.type_transaction || '—'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Date :</Text>
              <Text style={styles.value}>
                {new Date(transaction.date_transaction).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Mode :</Text>
              <Text style={styles.value}>{transaction.mode_reglement || '—'}</Text>
            </View>
          </View>

          <Text style={styles.amount}>
            + {Number(transaction.montant_total || 0).toLocaleString('fr-FR')} FCFA
          </Text>

          <TouchableOpacity
            style={[styles.btnPrimary, pdfGenerating && { opacity: 0.7 }]}
            onPress={generateAndShareReceipt}
            disabled={pdfGenerating}
          >
            {pdfGenerating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnText}>Imprimer / Partager le reçu</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => navigation.navigate('Bienvenue')}
          >
            <Text style={styles.btnOutlineText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  row: {
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
    textAlign: 'right',
    flexShrink: 1,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#28a745',
    marginBottom: 32,
  },
  btnPrimary: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
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
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 24,
  },
});