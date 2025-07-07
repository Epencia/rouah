import React, { useState, useContext, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { GlobalContext } from '../global/GlobalState';

export default function Accueil() {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;

  // variables
  const [user] = useContext(GlobalContext);
  const [annonce, setAnnonce] = useState([]);
  const [BarData, setBarData] = useState([]);
  const [PieData, setPieData] = useState([]);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    const delay = 10000;
    getAnnonces();
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

  // Composant de légende
  const renderLegend = () => (
    <View style={styles.legendContainer}>
      {PieData.map((item, index) => (
        <View key={index} style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: item.color }]} />
          <Text style={styles.legendText}>
            {item.label}: {((item.value / total) * 100).toFixed(1)}%
          </Text>
        </View>
      ))}
    </View>
  );

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
          <Text style={styles.statValue}>{user?.solde || 0}</Text>
          <Text style={styles.statLabel}>Solde</Text>
        </View>
        <View style={styles.statCard}>
          {annonce > 0 && (
            <Text style={styles.statValue}>{annonce || 0}</Text>
          )}
          <Text style={styles.statLabel}>Annonces</Text>
        </View>
        <View style={styles.statCard}>
          {PieData  && (
          <Text style={styles.statValue}>{PieData.find(item => item.label === "Revenu")?.value || 0}</Text>
           )}
          <Text style={styles.statLabel}>Revenus</Text>
        </View>
      </View>

      {/* Graphique en barres */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Graphe d'évolution des publications</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={BarData}
            width={Math.max(chartWidth, BarData.length * 50)}
            height={220}
            barWidth={22}
            frontColor="#fa4447"
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={0}
            spacing={20}
          />
        </ScrollView>
      </View>

      {/* Graphique en camembert avec légende */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Répartitions financières</Text>
        <View style={styles.pieChartContainer}>
          <PieChart
            data={PieData}
            showText
            textColor="black"
            radius={70}
            textSize={12}
            focusOnPress
            showValuesAsLabels
            showTextBackground
            textBackgroundRadius={15}
            centerLabelComponent={() => (
              <View style={styles.centerLabel}>
                <Text style={styles.centerLabelText}>Total</Text>
                <Text style={styles.centerLabelValue}>{total}</Text>
              </View>
            )}
          />
          {renderLegend()}
        </View>
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
  }
});