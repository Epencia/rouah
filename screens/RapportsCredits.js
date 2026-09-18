// RapportsCredits.js
// Composant React Native pour le rapport de capacité de crédit
// THÈME : Couleurs WhatsApp + En-tête style RapportsScreen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Platform
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/Ionicons';

// NOUVEAUX IMPORTS POUR LE TÉLÉCHARGEMENT PDF
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const API_URL = 'https://rouah.net/api/api-rapport-credit.php';

const RapportsCredits = ({ 
  societeId,
  user,
  onClose,
  isModal = false
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false); // NOUVEAU : État pour le chargement du PDF
  const [refreshing, setRefreshing] = useState(false);
  const [months, setMonths] = useState(6);
  const [montant, setMontant] = useState('1000000');
  const [duree, setDuree] = useState('12');
  const [taux, setTaux] = useState('15');
  const [rapport, setRapport] = useState(null);
  const [error, setError] = useState(null);
  const [chartWidth, setChartWidth] = useState(Dimensions.get('window').width - 48);

  useEffect(() => {
    if (societeId) {
      generateRapport();
    }
  }, [societeId]);

  // Gestion du redimensionnement pour le graphique
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setChartWidth(window.width - 48);
    });
    return () => subscription?.remove();
  }, []);

  const generateRapport = async () => {
    if (!societeId) {
      Alert.alert('Erreur', 'Aucune société sélectionnée');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          societe_id: societeId,
          months: months,
          montant: parseFloat(montant) || 1000000,
          duree: parseInt(duree) || 12,
          taux: parseFloat(taux) || 15,
          export_pdf: false // Force le JSON pour l'affichage écran
        })
      });

      const data = await response.json();

      if (data.success) {
        setRapport(data.data);
      } else {
        setError(data.message || 'Erreur lors de la génération du rapport');
        Alert.alert('Erreur', data.message || 'Erreur lors de la génération du rapport');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur de connexion au serveur');
      Alert.alert('Erreur', 'Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

 // NOUVELLE FONCTION : Téléchargement du rapport en PDF (COMPATIBLE EXPO v54+)
const handleDownloadPDF = async () => {
  if (!societeId) return;
  
  setLoadingPdf(true);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        societe_id: societeId,
        months: months,
        montant: parseFloat(montant) || 1000000,
        duree: parseInt(duree) || 12,
        taux: parseFloat(taux) || 15,
        export_pdf: true
      })
    });

    if (!response.ok) throw new Error('Erreur réseau lors de la récupération du PDF');

    // Utiliser arrayBuffer au lieu de blob pour éviter le warning
    const arrayBuffer = await response.arrayBuffer();
    
    // Convertir en base64 manuellement
    const base64String = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    const filename = FileSystem.cacheDirectory + `rapport_credit_${societeId}_${Date.now()}.pdf`;
    
    // Écrire le fichier avec l'API legacy (compatible)
    await FileSystem.writeAsStringAsync(filename, base64String, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Ouvrir le menu de partage
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filename, {
        mimeType: 'application/pdf',
        dialogTitle: 'Enregistrer ou partager le rapport PDF',
      });
    } else {
      Alert.alert('Succès', `PDF sauvegardé : ${filename}`);
    }
  } catch (error) {
    console.error('Erreur PDF:', error);
    Alert.alert('Erreur', 'Impossible de générer ou télécharger le rapport PDF.');
  } finally {
    setLoadingPdf(false);
  }
};

  const onRefresh = async () => {
    setRefreshing(true);
    await generateRapport();
    setRefreshing(false);
  };

  const formatMoney = (value) => {
    if (value === undefined || value === null) return '0 FCFA';
    return Number(value).toLocaleString('fr-FR') + ' FCFA';
  };

  const formatPct = (value) => {
    if (value === undefined || value === null) return '0 %';
    return Number(value).toFixed(1) + ' %';
  };

  const getRiskColor = (riskClass) => {
    const colors = {
      success: '#00A884', // WhatsApp Green
      warning: '#FF9800', // WhatsApp Orange
      danger: '#EA4335',  // WhatsApp Red
      dark: '#111B21'     // WhatsApp Dark Text
    };
    return colors[riskClass] || '#54656F';
  };

  // Préparation des données pour le graphique
  const getChartData = () => {
    if (!rapport || !rapport.evolution_mensuelle || rapport.evolution_mensuelle.length === 0) {
      return { labels: [], data: [] };
    }

    const evolution = rapport.evolution_mensuelle;
    const labels = evolution.map((item) => {
      const mois = item.mois.substring(5);
      const moisNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      return moisNames[parseInt(mois) - 1] || mois;
    });

    const data = evolution.map((item) => {
      return item.ca / 1000000;
    });

    return { labels, data };
  };

  // Composant KPI Card
  const KPICard = ({ label, value, subValue, icon, color = '#00A884' }) => (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <View style={styles.kpiHeader}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Icon name={icon} size={22} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      {subValue && <Text style={styles.kpiSub}>{subValue}</Text>}
    </View>
  );

  // Composant Info Row
  const InfoRow = ({ label, value, bold = false, isHighlight = false }) => (
    <View style={[styles.infoRow, isHighlight && styles.infoRowHighlight]}>
      <Text style={[styles.infoLabel, isHighlight && { color: 'rgba(255,255,255,0.9)' }]}>{label}</Text>
      <Text style={[styles.infoValue, bold && styles.infoValueBold, isHighlight && { color: '#fff' }]}>{value}</Text>
    </View>
  );

  // Écran de chargement initial
  if (!loading && !rapport && !error) {
    return (
      <View style={styles.container}>
        <View style={[styles.rapportHeader, { backgroundColor: '#128C7E' }]}>
          <View style={styles.rapportHeaderLeft}>
            {onClose && (
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <Icon name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <Text style={styles.rapportHeaderTitle}>Rapport de capacité de crédit</Text>
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
            <Icon name="refresh-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={[styles.subHeader, { backgroundColor: '#075E54' }]}>
          <Text style={styles.subHeaderText}>Initialisation...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00A884" />
          <Text style={styles.loadingText}>Génération du rapport en cours...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header du Rapport (Style RapportsScreen) */}
      <View style={[styles.rapportHeader, { backgroundColor: '#075E54' }]}>
        <View style={styles.rapportHeaderLeft}>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          <Text style={styles.rapportHeaderTitle}>Rapport de capacité de crédit</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} disabled={refreshing}>
          <Icon name={refreshing ? "refresh" : "refresh-outline"} size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Formulaire */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            <Icon name="settings-outline" size={18} color="#00A884" /> Paramètres
          </Text>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.formLabel}>Période</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={months}
                  onValueChange={(itemValue) => setMonths(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="3 mois" value={3} />
                  <Picker.Item label="6 mois" value={6} />
                  <Picker.Item label="12 mois" value={12} />
                </Picker>
              </View>
            </View>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.formLabel}>Montant demandé</Text>
              <TextInput
                style={styles.input}
                value={montant}
                onChangeText={setMontant}
                keyboardType="numeric"
                placeholder="1 000 000"
                placeholderTextColor="#8696A0"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.formLabel}>Durée (mois)</Text>
              <TextInput
                style={styles.input}
                value={duree}
                onChangeText={setDuree}
                keyboardType="numeric"
                placeholder="12"
                placeholderTextColor="#8696A0"
              />
            </View>
            <View style={[styles.formGroup, styles.halfWidth]}>
              <Text style={styles.formLabel}>Taux annuel (%)</Text>
              <TextInput
                style={styles.input}
                value={taux}
                onChangeText={setTaux}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor="#8696A0"
              />
            </View>
          </View>

          {/* BOUTONS D'ACTION MODIFIÉS */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.generateButton, { flex: 1, backgroundColor: '#075E54' }]}
              onPress={generateRapport}
              disabled={loading || loadingPdf}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.generateButtonText}>
                  <Icon name="refresh" size={18} color="#fff" /> Mettre à jour
                </Text>
              )}
            </TouchableOpacity>

            {/* NOUVEAU : Bouton Télécharger PDF (affiché uniquement si un rapport existe) */}
            {rapport && (
              <TouchableOpacity
                style={[styles.generateButton, { flex: 1, backgroundColor: '#25D366' }]}
                onPress={handleDownloadPDF}
                disabled={loading || loadingPdf}
              >
                {loadingPdf ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.generateButtonText}>
                    <Icon name="document-text" size={18} color="#fff" /> Télécharger PDF
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Résultats */}
        {loading && !rapport && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00A884" />
            <Text style={styles.loadingText}>Génération du rapport...</Text>
          </View>
        )}

        {rapport && (
          <View style={styles.resultsContainer}>
            {/* Alert */}
            <View style={styles.alertWarning}>
              <Icon name="warning" size={16} color="#B8860B" />
              <Text style={styles.alertText}>
                Ce rapport est un outil d'aide à l'analyse. Les montants et scores sont des estimations.
              </Text>
            </View>

            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              <KPICard
                label="Chiffre d'affaires"
                value={formatMoney(rapport.indicateurs.ca_total)}
                subValue={formatMoney(rapport.indicateurs.ca_mensuel) + ' / mois'}
                icon="trending-up"
              />
              <KPICard
                label="Encaissements"
                value={formatMoney(rapport.indicateurs.encaissements)}
                subValue={formatPct(rapport.indicateurs.taux_encaissement) + ' du CA'}
                icon="cash"
                color="#00A884"
              />
            </View>

            <View style={styles.kpiRow}>
              <KPICard
                label="Marge brute"
                value={formatMoney(rapport.indicateurs.marge_brute)}
                subValue={formatPct(rapport.indicateurs.marge_pct) + ' du CA'}
                icon="stats-chart"
                color="#FF9800"
              />
              <KPICard
                label="Score Rouah"
                value={rapport.indicateurs.score + '/100'}
                subValue={'Risque ' + rapport.indicateurs.risque}
                icon="ribbon"
                color={getRiskColor(rapport.indicateurs.risque_class)}
              />
            </View>

            {/* Profil Société */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <Icon name="business" size={18} color="#00A884" /> Profil de la société
              </Text>
              <View style={styles.cardBody}>
                <InfoRow label="Nom" value={rapport.societe.nom || '—'} />
                <InfoRow label="Sigle" value={rapport.societe.sigle || '—'} />
                <InfoRow label="Téléphone" value={rapport.societe.telephone || '—'} />
                <InfoRow label="Email" value={rapport.societe.email || '—'} />
                <InfoRow label="Registre commerce" value={rapport.societe.registre_commerce || '—'} />
                <InfoRow label="Propriétaire" value={rapport.societe.proprietaire || '—'} />
                <InfoRow label="Date création" value={rapport.societe.date_creation || '—'} />
                <InfoRow label="Boutiques" value={rapport.societe.nb_boutiques?.toString() || '0'} />
              </View>
            </View>

            {/* Indicateurs financiers */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <Icon name="stats-chart" size={18} color="#00A884" /> Indicateurs financiers
              </Text>
              <View style={styles.cardBody}>
                <InfoRow label="CA total" value={formatMoney(rapport.indicateurs.ca_total)} bold />
                <InfoRow label="CA mensuel" value={formatMoney(rapport.indicateurs.ca_mensuel)} />
                <InfoRow label="Encaissements mensuels" value={formatMoney(rapport.indicateurs.encaissements_mensuels)} />
                <InfoRow label="Charges mensuelles" value={formatMoney(rapport.indicateurs.charges_mensuelles)} />
                <InfoRow label="Marge mensuelle" value={formatMoney(rapport.indicateurs.marge_mensuelle)} />
                <InfoRow label="Flux disponible" value={formatMoney(rapport.indicateurs.flux_disponible)} bold />
                <InfoRow label="Créances" value={formatMoney(rapport.indicateurs.creances)} />
                <InfoRow label="Stock (achat)" value={formatMoney(rapport.indicateurs.stock_achat)} />
                <InfoRow label="Clients actifs" value={rapport.indicateurs.nb_clients_actifs?.toString() || '0'} />
                <InfoRow label="Régularité" value={formatPct(rapport.indicateurs.regularite)} />
              </View>
            </View>

            {/* Graphique */}
            {rapport.evolution_mensuelle && rapport.evolution_mensuelle.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  <Icon name="bar-chart" size={18} color="#00A884" /> Évolution du CA mensuel
                </Text>
                <View style={styles.chartContainer}>
                  {(() => {
                    const chartData = getChartData();
                    if (chartData.labels.length === 0 || chartData.data.length === 0) {
                      return (
                        <View style={styles.noDataContainer}>
                          <Text style={styles.noDataText}>Aucune donnée disponible pour le graphique</Text>
                        </View>
                      );
                    }
                    return (
                      <>
                        <LineChart
                          data={{
                            labels: chartData.labels,
                            datasets: [{ data: chartData.data }]
                          }}
                          width={chartWidth}
                          height={200}
                          chartConfig={{
                            backgroundColor: '#ffffff',
                            backgroundGradientFrom: '#ffffff',
                            backgroundGradientTo: '#ffffff',
                            decimalPlaces: 1,
                            color: (opacity = 1) => `rgba(0, 168, 132, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(84, 101, 111, ${opacity})`,
                            style: { borderRadius: 16 },
                            propsForDots: {
                              r: '4',
                              strokeWidth: '2',
                              stroke: '#00A884'
                            }
                          }}
                          bezier
                          style={styles.chart}
                        />
                        <Text style={styles.chartNote}>CA en millions FCFA</Text>
                      </>
                    );
                  })()}
                </View>
              </View>
            )}

            {/* Capacité de remboursement */}
            <View style={[styles.card, styles.highlightCard]}>
              <Text style={[styles.cardTitle, { color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', borderBottomColor: 'rgba(255,255,255,0.2)' }]}>
                <Icon name="wallet" size={18} color="#fff" /> Capacité de remboursement
              </Text>
              <View style={[styles.cardBody, { borderColor: 'transparent' }]}>
                <InfoRow label="Flux disponible" value={formatMoney(rapport.indicateurs.flux_disponible)} bold isHighlight />
                <InfoRow label="Mensualité prudente max" value={formatMoney(rapport.indicateurs.mensualite_max)} isHighlight />
              </View>
            </View>

            {/* Simulation */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <Icon name="calculator" size={18} color="#00A884" /> Simulation demandée
              </Text>
              <View style={styles.cardBody}>
                <InfoRow label="Montant" value={formatMoney(rapport.parametres.montant_demande)} />
                <InfoRow label="Durée" value={rapport.parametres.duree + ' mois'} />
                <InfoRow label="Taux annuel" value={formatPct(rapport.parametres.taux)} />
                <InfoRow label="Mensualité estimée" value={formatMoney(rapport.indicateurs.mensualite_demande)} bold />
                <InfoRow label="Montant maximum" value={formatMoney(rapport.indicateurs.montant_max)} bold />
              </View>
            </View>

            {/* Score détaillé */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                <Icon name="speedometer" size={18} color="#00A884" /> Détail du score
              </Text>
              <View style={styles.cardBody}>
                <InfoRow label="Activité" value={formatPct(rapport.indicateurs.activite_score)} />
                <InfoRow label="Régularité" value={formatPct(rapport.indicateurs.regularite_score)} />
                <InfoRow label="Marge" value={formatPct(rapport.indicateurs.marge_score)} />
                <InfoRow label="Encaissement" value={formatPct(rapport.indicateurs.encaissement_score)} />
                <InfoRow label="Créances" value={formatPct(rapport.indicateurs.creance_score)} />
                <InfoRow label="Trésorerie" value={formatPct(rapport.indicateurs.tresorerie_score)} />
                <InfoRow label="Stock" value={formatPct(rapport.indicateurs.stock_score)} />
              </View>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              Rapport généré le {new Date().toLocaleDateString('fr-FR')} — Données Rouah
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ==================== STYLES (INTÉGRALEMENT CONSERVÉS) ====================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5', // WhatsApp Background
  },
  scrollView: {
    flex: 1,
  },
  
  // --- NOUVEAUX STYLES D'EN-TÊTE (Style RapportsScreen) ---
  rapportHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 46, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',backgroundColor:'#075E54'
  },
  rapportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rapportHeaderTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  subHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  subHeaderText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  // ---------------------------------------------------------

  formCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 14,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#111B21', // WhatsApp Primary Text
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#54656F', // WhatsApp Secondary Text
    marginBottom: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E9EDEF', // WhatsApp Border
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E9EDEF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#FFFFFF',
    color: '#111B21',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  generateButton: {
    backgroundColor: '#00A884', // WhatsApp Green
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#54656F',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  alertWarning: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  alertText: {
    color: '#B8860B',
    fontSize: 12,
    flex: 1,
    marginLeft: 8,
    lineHeight: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#54656F',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111B21',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 12,
    color: '#8696A0',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  highlightCard: {
    backgroundColor: '#00A884',
    borderWidth: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111B21',
    padding: 14,
    backgroundColor: '#F7F8FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDEF',
  },
  cardBody: {
    padding: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5',
  },
  infoRowHighlight: {
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  infoLabel: {
    fontSize: 14,
    color: '#54656F',
  },
  infoValue: {
    fontSize: 14,
    color: '#111B21',
  },
  infoValueBold: {
    fontWeight: 'bold',
  },
  chartContainer: {
    padding: 8,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  chartNote: {
    fontSize: 11,
    color: '#8696A0',
    marginTop: 4,
    textAlign: 'center',
  },
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#8696A0',
    textAlign: 'center',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8696A0',
    paddingVertical: 16,
  },
});

export default RapportsCredits;