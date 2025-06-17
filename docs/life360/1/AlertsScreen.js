import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';

const AlertsScreen = () => {
  const alerts = [
    {
      id: 1,
      type: "arrival",
      member: "Emma",
      message: "Emma est arrivée à l'École",
      time: "Il y a 15 min",
      icon: "map-pin",
      color: "#16a34a",
    },
    {
      id: 2,
      type: "battery",
      member: "Lucas",
      message: "Batterie faible de Lucas (23%)",
      time: "Il y a 5 min",
      icon: "battery",
      color: "#ea580c",
    },
    {
      id: 3,
      type: "speed",
      member: "Lucas",
      message: "Lucas roule à 35 km/h",
      time: "Il y a 1 min",
      icon: "navigation",
      color: "#2563eb",
    },
  ];

  return (
    <View style={styles.tabContent}>
      <View style={styles.alertsHeader}>
        <Text style={styles.sectionHeader}>Centre d'alertes</Text>
        <Text style={styles.sectionSubheader}>Toutes les notifications et alertes de sécurité</Text>
      </View>
      
      <FlatList
        data={alerts}
        renderItem={({ item }) => (
          <View style={styles.alertCard}>
            <View style={styles.alertIconContainer}>
              <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
            </View>
            <View style={styles.alertContent}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertMessage}>{item.message}</Text>
                <Text style={styles.alertTime}>{item.time}</Text>
              </View>
              <Text style={styles.alertMember}>Membre: {item.member}</Text>
            </View>
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.alertsListContainer}
      />
      
      <View style={styles.settingsCard}>
        <Text style={styles.cardTitle}>Paramètres d'alertes</Text>
        <View style={styles.settingsGrid}>
          <View style={styles.settingItem}>
            <Text style={styles.settingTitle}>Alertes d'arrivée/départ</Text>
            <Text style={styles.settingDescription}>
              Recevoir des notifications quand un membre arrive ou quitte une zone
            </Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingTitle}>Alertes de batterie faible</Text>
            <Text style={styles.settingDescription}>
              Notification quand la batterie d'un membre est faible
            </Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingTitle}>Alertes de vitesse</Text>
            <Text style={styles.settingDescription}>
              Notification en cas de conduite rapide
            </Text>
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingTitle}>Alertes d'urgence</Text>
            <Text style={styles.settingDescription}>
              Notifications critiques et bouton SOS
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default AlertsScreen;