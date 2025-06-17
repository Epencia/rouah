import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';

const MembersScreen = () => {
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
      <FlatList
        data={familyMembers}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={styles.memberHeader}>
              <Image source={item.avatar} style={styles.avatar} />
              <View style={styles.memberInfo}>
                <View style={styles.memberNameRow}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <View style={[
                    styles.onlineIndicator,
                    { backgroundColor: item.isOnline ? '#16a34a' : '#9ca3af' }
                  ]} />
                </View>
                <View style={[styles.statusBadge, getStatusColor(item.status)]}>
                  <Text style={styles.statusBadgeText}>{item.status}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.memberDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons 
                  name="battery" 
                  size={16} 
                  color={getBatteryColor(item.battery)} 
                />
                <Text style={styles.detailText}>Batterie: {item.battery}%</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="speedometer" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{item.speed} km/h</Text>
              </View>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="clock" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{item.lastUpdate}</Text>
              </View>
              
              {item.safeZones.length > 0 && (
                <View style={styles.safeZonesSection}>
                  <Text style={styles.sectionTitle}>Zones de sécurité:</Text>
                  <View style={styles.safeZonesList}>
                    {item.safeZones.map((zone, index) => (
                      <View key={index} style={styles.safeZoneBadge}>
                        <Text style={styles.safeZoneText}>{zone}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Localiser</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>Historique</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.membersList}
      />
    </View>
  );
};

export default MembersScreen;