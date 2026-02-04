import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';

const API_URL = 'https://rouah.net/api/tendance.php';

const Tendances = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    monthly_best_worst: [],
    top10_best_selling: [],
    top10_cheapest: [],
    current_year: new Date().getFullYear()
  });

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API_URL}?action=all_dashboard_data`);
      
      if (response.data.success) {
        setDashboardData({
          ...response.data.data,
          current_year: response.data.current_year || new Date().getFullYear()
        });
      } else {
        console.error('Erreur API:', response.data.message);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // 1. Préparation des données pour le BarChart groupé (Meilleur vs Moins vendu)
  const prepareGroupedBarChartData = () => {
    const monthlyData = dashboardData.monthly_best_worst;
    
    if (!monthlyData || monthlyData.length === 0) {
      return [];
    }

    return monthlyData.map((item, index) => ({
      value: item.meilleur ? item.meilleur.quantite : 0,
      value2: item.pire ? item.pire.quantite : 0,
      label: item.nom_mois.substring(0, 3),
      labelTextStyle: { color: '#666', fontSize: 10 },
      frontColor: '#34a853', // Vert pour meilleur
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>
          {item.meilleur ? Math.round(item.meilleur.quantite) : 0}
        </Text>
      ),
      spacing: 10,
    }));
  };

  // 2. Préparation des données pour le BarChart horizontal (Top 10 ventes)
  const prepareHorizontalBarChartData = () => {
    const top10 = dashboardData.top10_best_selling;
    
    if (!top10 || top10.length === 0) {
      return [];
    }

    return top10.map((item, index) => ({
      value: item.quantite,
      label: item.produit.length > 20 ? 
        item.produit.substring(0, 17) + '...' : item.produit,
      frontColor: getColorByIndex(index),
      labelTextStyle: { color: '#333', fontSize: 12 },
      topLabelComponent: () => (
        <View style={styles.horizontalBarLabel}>
          <Text style={styles.horizontalBarValue}>{Math.round(item.quantite)}</Text>
          <Text style={styles.horizontalBarCurrency}>{item.devise}</Text>
        </View>
      ),
    })).reverse(); // Inverse pour afficher du plus grand au plus petit
  };

  // 3. Préparation des données pour le PieChart (Top 10 ventes)
  const preparePieChartData = () => {
    const top10 = dashboardData.top10_best_selling;
    
    if (!top10 || top10.length === 0) {
      return [];
    }

    const totalVentes = top10.reduce((sum, item) => sum + item.quantite, 0);
    
    return top10.map((item, index) => ({
      value: item.quantite,
      color: getColorByIndex(index),
      text: `${Math.round((item.quantite / totalVentes) * 100)}%`,
      label: item.produit.length > 12 ? 
        item.produit.substring(0, 9) + '...' : item.produit,
      focused: index === 0,
    }));
  };

  // 4. Préparation des données pour les produits moins chers (BarChart)
  const prepareCheapestProductsData = () => {
    const cheapest = dashboardData.top10_cheapest;
    
    if (!cheapest || cheapest.length === 0) {
      return [];
    }

    return cheapest.map((item, index) => ({
      value: item.prix,
      label: item.produit.length > 15 ? 
        item.produit.substring(0, 12) + '...' : item.produit,
      frontColor: '#FFD700', // Or pour les prix
      labelTextStyle: { color: '#333', fontSize: 10 },
      topLabelComponent: () => (
        <Text style={[styles.barTopLabel, { color: '#FF8C00' }]}>
          {item.prix} {item.devise}
        </Text>
      ),
      spacing: 8,
    }));
  };

  // Helper pour générer des couleurs
  const getColorByIndex = (index) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Chargement des tendances...</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    
      <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📊 Tendances des Ventes</Text>
          <Text style={styles.headerSubtitle}>
            Analyse {dashboardData.current_year} - Données en temps réel
          </Text>
        </View>

        {/* Section 1: Comparaison mensuelle (BarChart groupé) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              📈 Comparaison Mensuelle - Meilleur vs Moins Vendus
            </Text>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#34a853' }]} />
                <Text style={styles.legendText}>Meilleur produit</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ea4335' }]} />
                <Text style={styles.legendText}>Moins vendu</Text>
              </View>
            </View>
          </View>

          {dashboardData.monthly_best_worst.length > 0 ? (
            <View style={styles.chartWrapper}>
              <BarChart
                data={prepareGroupedBarChartData()}
                width={screenWidth - 60}
                height={220}
                barWidth={12}
                spacing={20}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={1}
                yAxisThickness={1}
                yAxisTextStyle={{ color: '#666', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#666', fontSize: 10 }}
                noOfSections={5}
                maxValue={Math.max(
                  ...dashboardData.monthly_best_worst
                    .map(item => item.meilleur ? item.meilleur.quantite : 0)
                    .concat([10])
                )}
                secondaryData={dashboardData.monthly_best_worst.map(item => ({
                  value: item.pire ? item.pire.quantite : 0
                }))}
                secondaryBarConfig={{
                  barWidth: 12,
                  frontColor: '#ea4335',
                }}
                showVerticalLines={false}
                showFractionalValues={false}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>📭 Aucune donnée de vente disponible</Text>
            </View>
          )}
        </View>

        {/* Section 2: Top 10 produits les plus vendus (BarChart horizontal) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              🏆 Top 10 - Produits les Plus Vendus
            </Text>
            <Text style={styles.sectionSubtitle}>
              Classement par nombre de ventes
            </Text>
          </View>

          {dashboardData.top10_best_selling.length > 0 ? (
            <View style={styles.chartWrapper}>
              <BarChart
                data={prepareHorizontalBarChartData()}
                horizontal
                width={screenWidth - 60}
                height={350}
                barWidth={20}
                spacing={15}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: '#333', fontSize: 12 }}
                noOfSections={4}
                maxValue={Math.max(
                  ...dashboardData.top10_best_selling.map(item => item.quantite)
                )}
                showFractionalValues={false}
                barBorderRadius={4}
                frontColor="lightgray"
                backgroundColor="transparent"
                labelWidth={120}
                isAnimated
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>📭 Aucun produit vendu cette année</Text>
            </View>
          )}
        </View>

        {/* Section 3: Répartition des ventes (PieChart) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              🥧 Répartition des Ventes - Top 10
            </Text>
            <Text style={styles.sectionSubtitle}>
              Pourcentage de ventes par produit
            </Text>
          </View>

          {dashboardData.top10_best_selling.length > 0 ? (
            <View style={styles.pieChartContainer}>
              <PieChart
                data={preparePieChartData()}
                donut
                showText
                textColor="black"
                radius={100}
                textSize={12}
                showTextBackground
                textBackgroundRadius={15}
                focusOnPress
                sectionAutoFocus
                innerRadius={60}
                innerCircleColor="#f8f9fa"
                centerLabelComponent={() => (
                  <View style={styles.pieCenterLabel}>
                    <Text style={styles.pieCenterTitle}>Top 10</Text>
                    <Text style={styles.pieCenterSubtitle}>Produits</Text>
                  </View>
                )}
              />
              
              {/* Légende des couleurs */}
              <View style={styles.pieLegendContainer}>
                {dashboardData.top10_best_selling.slice(0, 5).map((item, index) => (
                  <View key={item.id} style={styles.pieLegendItem}>
                    <View style={[styles.pieLegendDot, { backgroundColor: getColorByIndex(index) }]} />
                    <Text style={styles.pieLegendText} numberOfLines={1}>
                      {item.produit}
                    </Text>
                    <Text style={styles.pieLegendValue}>
                      {Math.round(item.quantite)} ventes
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>📭 Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        {/* Section 4: Top 10 produits les moins chers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              💰 Top 10 - Produits les Moins Chers
            </Text>
            <Text style={styles.sectionSubtitle}>
              Classement par prix croissant
            </Text>
          </View>

          {dashboardData.top10_cheapest.length > 0 ? (
            <View style={styles.chartWrapper}>
              <BarChart
                data={prepareCheapestProductsData()}
                width={screenWidth - 60}
                height={220}
                barWidth={14}
                spacing={15}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={1}
                yAxisThickness={1}
                yAxisTextStyle={{ color: '#666', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#666', fontSize: 10 }}
                noOfSections={4}
                maxValue={Math.max(
                  ...dashboardData.top10_cheapest.map(item => item.prix)
                )}
                showVerticalLines={false}
                showFractionalValues={false}
                barBorderRadius={4}
                isAnimated
                animationDuration={1500}
              />
              
              {/* Liste détaillée */}
              <View style={styles.cheapestList}>
                {dashboardData.top10_cheapest.map((product, index) => (
                  <View key={product.id} style={styles.cheapestItem}>
                    <View style={styles.cheapestRank}>
                      <Text style={styles.cheapestRankText}>#{index + 1}</Text>
                    </View>
                    <View style={styles.cheapestInfo}>
                      <Text style={styles.cheapestName}>{product.produit}</Text>
                      <Text style={styles.cheapestDetails}>
                        {product.ventes} ventes • {product.statut}
                      </Text>
                    </View>
                    <View style={styles.cheapestPrice}>
                      <Text style={styles.priceValue}>{product.prix}</Text>
                      <Text style={styles.priceCurrency}>{product.devise}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>📭 Aucun produit disponible</Text>
            </View>
          )}
        </View>

        {/* Footer avec statistiques */}
        <View style={styles.footer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {dashboardData.monthly_best_worst.length}
              </Text>
              <Text style={styles.statLabel}>Mois analysés</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {dashboardData.top10_best_selling.length}
              </Text>
              <Text style={styles.statLabel}>Top produits</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {dashboardData.top10_cheapest.length}
              </Text>
              <Text style={styles.statLabel}>Produits économiques</Text>
            </View>
          </View>
          
          <Text style={styles.footerText}>
            🔄 Dernière mise à jour: {new Date().toLocaleTimeString()}
          </Text>
          <Text style={styles.footerNote}>
            Tirez pour actualiser les données
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 15,
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  chartWrapper: {
    alignItems: 'center',
    marginTop: 10,
  },
  barTopLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 2,
  },
  horizontalBarLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 5,
  },
  horizontalBarValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  horizontalBarCurrency: {
    fontSize: 10,
    color: '#7f8c8d',
    marginLeft: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 15,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6c757d',
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pieChartContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  pieCenterLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  pieCenterSubtitle: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  pieLegendContainer: {
    marginTop: 20,
    width: '100%',
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  pieLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  pieLegendText: {
    flex: 1,
    fontSize: 12,
    color: '#2c3e50',
    marginRight: 10,
  },
  pieLegendValue: {
    fontSize: 11,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  cheapestList: {
    marginTop: 20,
    width: '100%',
  },
  cheapestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  cheapestRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cheapestRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cheapestInfo: {
    flex: 1,
  },
  cheapestName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  cheapestDetails: {
    fontSize: 11,
    color: '#7f8c8d',
  },
  cheapestPrice: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
  },
  priceCurrency: {
    fontSize: 10,
    color: '#2ecc71',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#7f8c8d',
    marginTop: 4,
    textAlign: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 5,
  },
  footerNote: {
    fontSize: 11,
    color: '#bdc3c7',
    marginTop: 3,
  },
});

export default Tendances;