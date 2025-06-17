import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MapScreen from './MapScreen';
import MembersScreen from './MembersScreen';
import ZonesScreen from './ZonesScreen';
import AlertsScreen from './AlertsScreen';
import { styles } from './styles';

const DashboardScreen = () => {
  const [activeTab, setActiveTab] = useState('map');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Famille Martin</Text>
          <Text style={styles.subtitle}>4 membres connectés</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Dernière mise à jour</Text>
            <Text style={styles.time}>{currentTime.toLocaleTimeString()}</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton}>
            <MaterialIcons name="settings" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>Carte</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.activeTab]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.activeTabText]}>Membres</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'zones' && styles.activeTab]}
          onPress={() => setActiveTab('zones')}
        >
          <Text style={[styles.tabText, activeTab === 'zones' && styles.activeTabText]}>Zones</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
          onPress={() => setActiveTab('alerts')}
        >
          <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>Alertes</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Tab content */}
      <ScrollView style={styles.content}>
        {activeTab === 'map' && <MapScreen />}
        {activeTab === 'members' && <MembersScreen />}
        {activeTab === 'zones' && <ZonesScreen />}
        {activeTab === 'alerts' && <AlertsScreen />}
      </ScrollView>
    </View>
  );
};

export default DashboardScreen;