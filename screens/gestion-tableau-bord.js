import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart
} from "react-native-chart-kit";

const { width, height } = Dimensions.get('window');

export default function TableauBord() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    general: null,
    cours: null,
    abonnements: null,
    transactions: null,
    utilisateurs: null,
    matieres: null,
    niveaux: null,
    activities: []
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardStats(),
        fetchCoursStats(),
        fetchAbonnementsStats(),
        fetchTransactionsStats(),
        fetchUtilisateursStats(),
        fetchMatieresStats(),
        fetchNiveauxStats(),
        fetchRecentActivities()
      ]);
    } catch (error) {
      console.error("Erreur chargement données:", error);
      Alert.alert("Erreur", "Impossible de charger les données");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('https://rouah.net/api/tableau-bord.php?action=dashboard');
      const data = await response.json();
      if (data.success) {
        setStats(prev => ({ ...prev, general: data.stats }));
      }
    } catch (error) {
      console.error("Erreur dashboard:", error);
    }
  };

  const fetchCoursStats = async () => {
    try {
      const response = await fetch('https://rouah.net/api/tableau-bord.php?action=cours_stats');
      const data = await response.json();
      if (data.success) {
        setStats(prev => ({ ...prev, cours: data }));
      }
    } catch (error) {
      console.error("Erreur cours stats:", error);
    }
  };

  const fetchAbonnementsStats = async () => {
    try {
      const response = await fetch('https://rouah.net/api/tableau-bord.php?action=abonnements_stats');
      const data = await response.json();
      if (data.success) {
        setStats(prev => ({ ...prev, abonnements: data }));
      }
    } catch (error) {
      console.error("Erreur abonnements stats:", error);
    }
  };

  const fetchTransactionsStats = async () => {
    try {
      const response = await fetch('https://rouah.net/api/tableau-bord.php?action=transactions_stats');
      const data = await response.json();
      if (data.success) {
        setStats(prev => ({ ...prev, transactions: data }));
      }
    } catch (error) {
      console.error("Erreur transactions stats:", error);
    }
  };

  const fetchUtilisateursStats = async () => {
    try {
      const response = await fetch('https://rouah.net/api/tableau-bord.php?action=utilisateurs_stats');
      const data = await response.json();
      if (data.success) {
        setStats(prev => ({ ...prev, utilisateurs: data }));
      }
    } catch (error) {
      console.error("Erreur utilisateurs stats:", error);
    }
  };

  const fetchMatieresStats = async () => {
    try {
      const response = await fetch('https://rouah.net/api/tableau-bord.php?action=matieres_stats');
      const data = await response.json();
      if (data.success) {
        setStats(prev => ({ ...prev, matieres: data }));
      }
    } catch (error) {
      console.error("Erreur matieres stats:", error);
    }
  };

  const fetchNiveauxStats = async () => {
    try {
      const response = await fetch('https://rouah.net/api/tableau-bord.php?action=niveaux_stats');
      const data = await response.json();
      if (data.success) {
        setStats(prev => ({ ...prev, niveaux: data }));
      }
    } catch (error) {
      console.error("Erreur niveaux stats:", error);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await fetch('https://rouah.net/api/tableau-bord.php?action=recent_activities');
      const data = await response.json();
      if (data.success) {
        setStats(prev => ({ ...prev, activities: data.activities }));
      }
    } catch (error) {
      console.error("Erreur activities:", error);
    }
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: "#fff",
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(52, 152, 219, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    style: {
      borderRadius: 16
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: '600',
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#3498db"
    }
  };

  const renderHeader = () => (
    <View
      style={styles.header}
    >
      <StatusBar barStyle="light-content" backgroundColor="#3498db" />
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>📊 Tableau de Bord</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSubtitle}>
        {new Date().toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
            📈 Vue d'ensemble
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cours' && styles.tabActive]}
          onPress={() => setActiveTab('cours')}
        >
          <Text style={[styles.tabText, activeTab === 'cours' && styles.tabTextActive]}>
            📚 Cours
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'abonnements' && styles.tabActive]}
          onPress={() => setActiveTab('abonnements')}
        >
          <Text style={[styles.tabText, activeTab === 'abonnements' && styles.tabTextActive]}>
            🎫 Abonnements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
            💰 Transactions
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'utilisateurs' && styles.tabActive]}
          onPress={() => setActiveTab('utilisateurs')}
        >
          <Text style={[styles.tabText, activeTab === 'utilisateurs' && styles.tabTextActive]}>
            👥 Utilisateurs
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderDashboardTab = () => {
    const g = stats.general;
    if (!g) return null;

    return (
      <View style={styles.tabContent}>
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={['#3498db', '#2980b9']}
            style={styles.statCard}
          >
            <Text style={styles.statCardIcon}>📚</Text>
            <Text style={styles.statCardValue}>{formatNumber(g.total_cours)}</Text>
            <Text style={styles.statCardLabel}>Cours</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#27ae60', '#229954']}
            style={styles.statCard}
          >
            <Text style={styles.statCardIcon}>🎯</Text>
            <Text style={styles.statCardValue}>{formatNumber(g.total_evaluations || 0)}</Text>
            <Text style={styles.statCardLabel}>Quiz</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#f39c12', '#e67e22']}
            style={styles.statCard}
          >
            <Text style={styles.statCardIcon}>👥</Text>
            <Text style={styles.statCardValue}>{formatNumber(g.total_utilisateurs)}</Text>
            <Text style={styles.statCardLabel}>Utilisateurs</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#e74c3c', '#c0392b']}
            style={styles.statCard}
          >
            <Text style={styles.statCardIcon}>🎫</Text>
            <Text style={styles.statCardValue}>{formatNumber(g.total_abonnements_actifs)}</Text>
            <Text style={styles.statCardLabel}>Abonnés</Text>
          </LinearGradient>
        </View>

        {/* Revenus et Visites */}
        <View style={styles.statsRow}>
          <View style={[styles.statsHalfCard, styles.revenuCard]}>
            <Text style={styles.statsHalfIcon}>💰</Text>
            <Text style={styles.statsHalfValue}>{formatNumber(g.revenus_mois || 0)} FCFA</Text>
            <Text style={styles.statsHalfLabel}>Revenus du mois</Text>
            <Text style={styles.statsHalfSub}>{formatNumber(g.transactions_mois || 0)} transactions</Text>
          </View>

          <View style={[styles.statsHalfCard, styles.visiteCard]}>
            <Text style={styles.statsHalfIcon}>👀</Text>
            <Text style={styles.statsHalfValue}>{formatNumber(g.visites_aujourdhui || 0)}</Text>
            <Text style={styles.statsHalfLabel}>Visites aujourd'hui</Text>
          </View>
        </View>

        {/* Graphiques */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Évolution des cours (30 jours)</Text>
          {stats.cours?.evolution_cours && stats.cours.evolution_cours.length > 0 ? (
            <LineChart
              data={{
                labels: stats.cours.evolution_cours.slice(-7).map(d => {
                  const date = new Date(d.date);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }),
                datasets: [{
                  data: stats.cours.evolution_cours.slice(-7).map(d => parseInt(d.total))
                }]
              }}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              formatYLabel={(y) => parseInt(y).toString()}
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        {/* Activités récentes */}
        <View style={styles.activitiesContainer}>
          <Text style={styles.sectionTitle}>🕐 Activités récentes</Text>
          {stats.activities && stats.activities.length > 0 ? (
            stats.activities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <Text style={styles.activityIcon}>{activity.icon}</Text>
                <View style={styles.activityContent}>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noActivityText}>Aucune activité récente</Text>
          )}
        </View>
      </View>
    );
  };

  const renderCoursTab = () => {
    const c = stats.cours;
    if (!c) return null;

    // Données pour le graphique par type
    const typeData = {
      labels: c.cours_par_type?.map(item => item.type) || [],
      datasets: [{
        data: c.cours_par_type?.map(item => parseInt(item.total)) || []
      }]
    };

    // Données pour le graphique par difficulté
    const difficulteColors = ['#27ae60', '#f39c12', '#e74c3c'];
    const pieData = c.cours_par_difficulte?.map((item, index) => ({
      name: item.difficulte || 'Non défini',
      population: parseInt(item.total),
      color: difficulteColors[index % difficulteColors.length],
      legendFontColor: '#2c3e50',
      legendFontSize: 12
    })) || [];

    return (
      <View style={styles.tabContent}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Cours par type</Text>
          {c.cours_par_type && c.cours_par_type.length > 0 ? (
            <BarChart
              data={typeData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
              showValuesOnTopOfBars
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Répartition par difficulté</Text>
          {pieData.length > 0 ? (
            <PieChart
              data={pieData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        {/* Top cours */}
        <View style={styles.topListContainer}>
          <Text style={styles.sectionTitle}>🏆 Top 5 cours les plus vus</Text>
          {c.top_cours && c.top_cours.length > 0 ? (
            c.top_cours.map((cours, index) => (
              <View key={index} style={styles.topListItem}>
                <View style={styles.topListRank}>
                  <Text style={styles.topListRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topListContent}>
                  <Text style={styles.topListTitle} numberOfLines={1}>
                    {cours.titre}
                  </Text>
                  <View style={styles.topListStats}>
                    <Text style={styles.topListStat}>👁️ {formatNumber(cours.vues)}</Text>
                    <Text style={styles.topListStat}>⬇️ {formatNumber(cours.telechargements)}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>Aucun cours disponible</Text>
          )}
        </View>
      </View>
    );
  };

  const renderAbonnementsTab = () => {
    const a = stats.abonnements;
    if (!a) return null;

    // Données pour le graphique des abonnements par type
    const pieData = a.abonnements_par_type?.map((item, index) => ({
      name: item.type,
      population: parseInt(item.total),
      color: index === 0 ? '#3498db' : index === 1 ? '#f39c12' : '#27ae60',
      legendFontColor: '#2c3e50',
      legendFontSize: 12
    })) || [];

    // Données pour le graphique des statuts
    const statutData = a.abonnements_par_statut?.map((item, index) => ({
      name: item.statut,
      population: parseInt(item.total),
      color: item.statut === 'actif' ? '#27ae60' : item.statut === 'expire' ? '#e74c3c' : '#f39c12',
      legendFontColor: '#2c3e50',
      legendFontSize: 12
    })) || [];

    return (
      <View style={styles.tabContent}>
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={['#27ae60', '#229954']}
            style={styles.statCardSmall}
          >
            <Text style={styles.statCardIconSmall}>✅</Text>
            <Text style={styles.statCardValueSmall}>
              {formatNumber(a.abonnements_par_statut?.find(s => s.statut === 'actif')?.total || 0)}
            </Text>
            <Text style={styles.statCardLabelSmall}>Actifs</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#e74c3c', '#c0392b']}
            style={styles.statCardSmall}
          >
            <Text style={styles.statCardIconSmall}>⚠️</Text>
            <Text style={styles.statCardValueSmall}>
              {formatNumber(a.abonnements_par_statut?.find(s => s.statut === 'expire')?.total || 0)}
            </Text>
            <Text style={styles.statCardLabelSmall}>Expirés</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#f39c12', '#e67e22']}
            style={styles.statCardSmall}
          >
            <Text style={styles.statCardIconSmall}>⏸️</Text>
            <Text style={styles.statCardValueSmall}>
              {formatNumber(a.abonnements_par_statut?.find(s => s.statut === 'suspendu')?.total || 0)}
            </Text>
            <Text style={styles.statCardLabelSmall}>Suspendus</Text>
          </LinearGradient>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Abonnements par type</Text>
          {pieData.length > 0 ? (
            <PieChart
              data={pieData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Statut des abonnements</Text>
          {statutData.length > 0 ? (
            <PieChart
              data={statutData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTransactionsTab = () => {
    const t = stats.transactions;
    if (!t) return null;

    // Données pour le graphique des transactions par type
    const typeLabels = t.transactions_par_type?.map(item => item.type_transaction) || [];
    const typeValues = t.transactions_par_type?.map(item => parseInt(item.total)) || [];

    // Données pour le graphique des modes de règlement
    const modePieData = t.transactions_par_mode?.map((item, index) => ({
      name: item.mode_reglement || 'Non spécifié',
      population: parseInt(item.total),
      color: `hsl(${index * 45}, 70%, 50%)`,
      legendFontColor: '#2c3e50',
      legendFontSize: 11
    })) || [];

    return (
      <View style={styles.tabContent}>
        <View style={styles.statsRow}>
          <View style={[styles.statsHalfCard, styles.revenuCard]}>
            <Text style={styles.statsHalfIcon}>💰</Text>
            <Text style={styles.statsHalfValue}>
              {formatNumber(t.evolution_transactions?.reduce((acc, curr) => acc + parseFloat(curr.montant_total || 0), 0) || 0)} FCFA
            </Text>
            <Text style={styles.statsHalfLabel}>Total transactions</Text>
          </View>

          <View style={[styles.statsHalfCard, styles.transactionCard]}>
            <Text style={styles.statsHalfIcon}>📊</Text>
            <Text style={styles.statsHalfValue}>
              {formatNumber(t.evolution_transactions?.reduce((acc, curr) => acc + parseInt(curr.total || 0), 0) || 0)}
            </Text>
            <Text style={styles.statsHalfLabel}>Total transactions</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Transactions par type</Text>
          {typeLabels.length > 0 ? (
            <BarChart
              data={{
                labels: typeLabels.map(l => l?.substring(0, 3) || ''),
                datasets: [{
                  data: typeValues
                }]
              }}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
              fromZero
              showValuesOnTopOfBars
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Modes de règlement</Text>
          {modePieData.length > 0 ? (
            <PieChart
              data={modePieData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderUtilisateursTab = () => {
    const u = stats.utilisateurs;
    if (!u) return null;

    // Données pour le graphique des rôles
    const rolePieData = u.utilisateurs_par_role?.map((item, index) => ({
      name: item.role || 'Non défini',
      population: parseInt(item.total),
      color: index === 0 ? '#3498db' : index === 1 ? '#e74c3c' : index === 2 ? '#f39c12' : '#27ae60',
      legendFontColor: '#2c3e50',
      legendFontSize: 11
    })) || [];

    return (
      <View style={styles.tabContent}>
        <View style={styles.statsGrid}>
          <LinearGradient
            colors={['#3498db', '#2980b9']}
            style={styles.statCardSmall}
          >
            <Text style={styles.statCardIconSmall}>👥</Text>
            <Text style={styles.statCardValueSmall}>
              {formatNumber(stats.general?.total_utilisateurs || 0)}
            </Text>
            <Text style={styles.statCardLabelSmall}>Total</Text>
          </LinearGradient>

          <LinearGradient
            colors={['#27ae60', '#229954']}
            style={styles.statCardSmall}
          >
            <Text style={styles.statCardIconSmall}>🎫</Text>
            <Text style={styles.statCardValueSmall}>
              {formatNumber(stats.general?.total_abonnements_actifs || 0)}
            </Text>
            <Text style={styles.statCardLabelSmall}>Abonnés</Text>
          </LinearGradient>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Répartition par rôle</Text>
          {rolePieData.length > 0 ? (
            <PieChart
              data={rolePieData}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>Aucune donnée disponible</Text>
            </View>
          )}
        </View>

        {/* Top utilisateurs */}
        <View style={styles.topListContainer}>
          <Text style={styles.sectionTitle}>🏆 Top 5 utilisateurs</Text>
          {u.top_utilisateurs && u.top_utilisateurs.length > 0 ? (
            u.top_utilisateurs.map((user, index) => (
              <View key={index} style={styles.topListItem}>
                <View style={styles.topListRank}>
                  <Text style={styles.topListRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topListContent}>
                  <Text style={styles.topListTitle} numberOfLines={1}>
                    {user.nom_prenom || 'Anonyme'}
                  </Text>
                  <Text style={styles.topListSub}>
                    {user.email || 'Email non renseigné'} • {user.nb_abonnements || 0} abonnement(s)
                  </Text>
                  {user.dernier_abonnement && (
                    <Text style={styles.topListDate}>
                      Dernier: {new Date(user.dernier_abonnement).toLocaleDateString('fr-FR')}
                    </Text>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>Aucun utilisateur</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {renderHeader()}
      {renderTabs()}
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'dashboard' && renderDashboardTab()}
        {activeTab === 'cours' && renderCoursTab()}
        {activeTab === 'abonnements' && renderAbonnementsTab()}
        {activeTab === 'transactions' && renderTransactionsTab()}
        {activeTab === 'utilisateurs' && renderUtilisateursTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#333',
    marginTop: 5,
    textTransform: 'capitalize',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  refreshButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#7f8c8d',
  },
  scrollView: {
    flex: 1,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  tabActive: {
    backgroundColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    width: (width - 50) / 2,
    padding: 20,
    borderRadius: 15,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statCardSmall: {
    width: (width - 50) / 3,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 2,
  },
  statCardIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  statCardIconSmall: {
    fontSize: 24,
    marginBottom: 5,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  statCardValueSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statCardLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  statCardLabelSmall: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statsHalfCard: {
    width: (width - 50) / 2,
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  revenuCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  visiteCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  transactionCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  statsHalfIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  statsHalfValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statsHalfLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 5,
  },
  statsHalfSub: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 3,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  activitiesContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 15,
    width: 40,
    textAlign: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  noActivityText: {
    fontSize: 14,
    color: '#95a5a6',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  topListContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  topListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topListRank: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topListRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7f8c8d',
  },
  topListContent: {
    flex: 1,
  },
  topListTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  topListSub: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  topListDate: {
    fontSize: 11,
    color: '#95a5a6',
  },
  topListStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  topListStat: {
    fontSize: 12,
    color: '#7f8c8d',
    marginRight: 15,
  },
});