import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';

const MapScreen = () => {
  const [selectedMember, setSelectedMember] = useState(null);

  // Family members data
  const familyMembers = [
    {
      id: 1,
      name: "Papa",
      avatar: require("../../../assets/logo.png"),
      status: "En déplacement",
      location: "Bureau - Paris 8ème",
      coordinates: { lat: 48.8738, lng: 2.295 },
      battery: 85,
      speed: 0,
      lastUpdate: "Il y a 2 min",
      isOnline: true,
      safeZones: ["Maison", "Bureau"],
    },
    {
      id: 2,
      name: "Maman",
      avatar: require("../../../assets/logo.png"),
      status: "À la maison",
      location: "Maison - Neuilly",
      coordinates: { lat: 48.8848, lng: 2.2685 },
      battery: 92,
      speed: 0,
      lastUpdate: "Il y a 1 min",
      isOnline: true,
      safeZones: ["Maison"],
    },
    {
      id: 3,
      name: "Emma",
      avatar: require("../../../assets/logo.png"),
      status: "À l'école",
      location: "Lycée Saint-Louis",
      coordinates: { lat: 48.8566, lng: 2.3522 },
      battery: 45,
      speed: 0,
      lastUpdate: "Il y a 5 min",
      isOnline: true,
      safeZones: ["École", "Maison"],
    },
    {
      id: 4,
      name: "Lucas",
      avatar: require("../../../assets/logo.png"),
      status: "En route",
      location: "Avenue des Champs-Élysées",
      coordinates: { lat: 48.8698, lng: 2.3076 },
      battery: 23,
      speed: 35,
      lastUpdate: "Il y a 30 sec",
      isOnline: true,
      safeZones: [],
    },
  ];

  // Alerts
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

  const getStatusColor = (status) => {
    switch (status) {
      case "À la maison":
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case "À l'école":
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case "En déplacement":
        return { backgroundColor: '#fef9c3', color: '#854d0e' };
      case "En route":
        return { backgroundColor: '#f3e8ff', color: '#6b21a8' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const getBatteryColor = (battery) => {
    if (battery > 50) return '#16a34a';
    if (battery > 20) return '#ea580c';
    return '#dc2626';
  };

  return (
    <View style={styles.tabContent}>
      <View style={styles.mapContainer}>
        {/* Main map view */}
        <View style={styles.mapCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#3b82f6" />
            <Text style={styles.cardTitle}>Localisation en temps réel</Text>
          </View>
          <View style={styles.mapView}>
            {/* Map placeholder */}
            <View style={styles.mapPlaceholder}>
              <MaterialCommunityIcons name="map-marker" size={48} color="#3b82f6" />
              <Text style={styles.mapPlaceholderTitle}>Carte interactive</Text>
              <Text style={styles.mapPlaceholderText}>Localisation des membres en temps réel</Text>
            </View>
            
            {/* Member markers */}
            {familyMembers.map((member, index) => (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.memberMarker,
                  { 
                    backgroundColor: member.isOnline ? '#16a34a' : '#9ca3af',
                    top: `${20 + index * 15}%`,
                    left: `${30 + index * 20}%`,
                  }
                ]}
                onPress={() => setSelectedMember(member)}
              >
                <Text style={styles.markerInitial}>{member.name[0]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Side panel */}
        <View style={styles.sidePanel}>
          {/* Selected member */}
          {selectedMember && (
            <View style={styles.memberInfoCard}>
              <Text style={styles.memberName}>{selectedMember.name}</Text>
              <View style={[styles.statusBadge, getStatusColor(selectedMember.status)]}>
                <Text style={styles.statusBadgeText}>{selectedMember.status}</Text>
              </View>
              
              <View style={styles.memberDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{selectedMember.location}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="battery" size={16} color={getBatteryColor(selectedMember.battery)} />
                  <Text style={styles.detailText}>{selectedMember.battery}%</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="speedometer" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{selectedMember.speed} km/h</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="clock" size={16} color="#6b7280" />
                  <Text style={styles.detailText}>{selectedMember.lastUpdate}</Text>
                </View>
              </View>
            </View>
          )}
          
          {/* Recent alerts */}
          <View style={styles.alertsCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="alert" size={20} color="#dc2626" />
              <Text style={styles.cardTitle}>Alertes récentes</Text>
            </View>
            <View style={styles.alertsList}>
              {alerts.slice(0, 3).map(alert => (
                <View key={alert.id} style={styles.alertItem}>
                  <MaterialCommunityIcons name={alert.icon} size={18} color={alert.color} />
                  <View style={styles.alertContent}>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <Text style={styles.alertTime}>{alert.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default MapScreen;