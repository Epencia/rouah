import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { styles } from './styles';

const ZonesScreen = () => {
  const safeZones = [
    { id: 1, name: "Maison", address: "123 Rue de la Paix, Neuilly", radius: 100 },
    { id: 2, name: "École", address: "Lycée Saint-Louis, Paris", radius: 50 },
    { id: 3, name: "Bureau", address: "Tour Eiffel, Paris 8ème", radius: 200 },
  ];

  const familyMembers = [
    {
      id: 1,
      name: "Papa",
      avatar: require("../../../assets/logo.png"),
      safeZones: ["Maison", "Bureau"],
    },
    {
      id: 2,
      name: "Maman",
      avatar: require("../../../assets/logo.png"),
      safeZones: ["Maison"],
    },
    {
      id: 3,
      name: "Emma",
      avatar: require("../../../assets/logo.png"),
      safeZones: ["École", "Maison"],
    },
    {
      id: 4,
      name: "Lucas",
      avatar: require("../../../assets/logo.png"),
      safeZones: [],
    },
  ];

  return (
    <View style={styles.tabContent}>
      <View style={styles.zonesHeader}>
        <View>
          <Text style={styles.sectionHeader}>Zones de sécurité</Text>
          <Text style={styles.sectionSubheader}>Gérez les zones où vos proches sont en sécurité</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <MaterialIcons name="add" size={20} color="white" />
          <Text style={styles.addButtonText}>Ajouter une zone</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={safeZones}
        renderItem={({ item }) => (
          <View style={styles.zoneCard}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="shield" size={20} color="#16a34a" />
              <Text style={styles.cardTitle}>{item.name}</Text>
            </View>
            
            <View style={styles.zoneDetails}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
                <Text style={styles.detailText}>{item.address}</Text>
              </View>
              <View style={styles.detailRow}>
                <View style={styles.zoneRadiusIndicator}>
                  <View style={[styles.zoneRadiusDot, { borderColor: '#16a34a' }]} />
                </View>
                <Text style={styles.detailText}>Rayon: {item.radius}m</Text>
              </View>
            </View>
            
            <View style={styles.membersInZone}>
              <Text style={styles.sectionTitle}>Membres dans cette zone:</Text>
              <View style={styles.memberAvatars}>
                {familyMembers
                  .filter(member => member.safeZones.includes(item.name))
                  .map(member => (
                    <Image 
                      key={member.id} 
                      source={member.avatar} 
                      style={styles.memberAvatar} 
                    />
                  ))}
              </View>
            </View>
            
            <View style={styles.zoneActions}>
              <TouchableOpacity style={styles.zoneActionButton}>
                <Text style={styles.zoneActionText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.zoneActionButton, styles.deleteButton]}>
                <Text style={[styles.zoneActionText, styles.deleteButtonText]}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.zonesList}
      />
    </View>
  );
};

export default ZonesScreen;