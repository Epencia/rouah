import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';

export default function Accueil () {

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40; // Réduit la largeur pour éviter le débordement

  // Données pour les graphiques

  const barData = [
    {value: 20, label: 'Lundi'},
    {value: 45, label: 'Mardi'},
    {value: 28, label: 'Mercredi'},
    {value: 80, label: 'Jeudi'},
    {value: 99, label: 'Vendredi'},
    {value: 43, label: 'Samedi'},
    {value: 60, label: 'Dimanche'}
  ];

  const pieData = [
    {value: 2150, color: 'rgba(131, 167, 234, 1)', label: 'Produit A'},
    {value: 2800, color: '#F00', label: 'Produit B'},
    {value: 5270, color: 'green', label: 'Produit C'}
  ];

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
          <Text style={styles.statValue}>1,245</Text>
          <Text style={styles.statLabel}>Annonces</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>$12,345</Text>
          <Text style={styles.statLabel}>Revenus</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>89%</Text>
          <Text style={styles.statLabel}>Retraits</Text>
        </View>
      </View>

      {/* Graphiques avec des dimensions contrôlées */}
 

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Ventes hebdomadaires</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <BarChart
            data={barData}
            width={Math.max(chartWidth, barData.length * 50)} // Ajustement dynamique
            height={220}
            barWidth={22}
            frontColor="#6200ee"
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={0}
            spacing={20}
          />
        </ScrollView>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Répartition des produits</Text>
        <View style={styles.pieChartWrapper}>
          <PieChart
            data={pieData}
            showText
            textColor="black"
            radius={80}
            textSize={12}
            focusOnPress
            showValuesAsLabels
            showTextBackground
            textBackgroundRadius={15}
            centerLabelComponent={() => (
              <Text style={{fontSize: 16}}>Total</Text>
            )}
          />
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    justifyContent: 'space-around'
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  activeTab: {
    backgroundColor: '#6200ee'
  },
  tabText: {
    color: '#333',
    fontWeight: '500'
  },
  activeTabText: {
    color: '#fff'
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
    color: '#6200ee'
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
    overflow: 'hidden' // Empêche le débordement
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10
  }
});