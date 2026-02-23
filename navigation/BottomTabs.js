import React, { useState, useEffect,useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Accueil from "../screens/accueil";
import { GlobalContext } from '../global/GlobalState';
import TableauBord from '../screens/gestion-tableau-bord';
import GestionCours from '../screens/gestion-cours';
import GestionAbonnement from '../screens/gestion-abonnement';
import GestionMatiere from '../screens/gestion-matiere';
import GestionNiveau from '../screens/gestion-niveau';

const Tab = createBottomTabNavigator();

const CustomHeader = () => {
  return (
    <View style={styles.headerLeft}>
      <Image 
        source={require('../assets/logo-original.png')} 
        resizeMode="contain" 
        style={styles.avatarImg} 
      />
      <Text style={styles.headerTitle}>Rouah</Text>
    </View>
  );
};

export default function BottomTabs() {

  const [user] = useContext(GlobalContext);



  return (
    <Tab.Navigator
      initialRouteName="Accueil"
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: '#fa4447',
        tabBarInactiveTintColor: '#414d63',
        headerLeft: () => <CustomHeader />,
        headerRight: () => (
          <View style={{ flexDirection: 'row' }}>
            

            <TouchableOpacity 
              onPress={() => navigation.navigate('Menu principal')}
              style={styles.logoutButton2}
            >
              <Icon name="apps" size={24} color="#414d63" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Déconnexion')}
              style={styles.logoutButton}
            >
              <Icon name="logout" size={24} color="#414d63" />
            </TouchableOpacity>
          </View>
        ),
      })}
    >
      <Tab.Screen
        name="Accueil"
        component={TableauBord}
        options={{
          headerTitle: '',
          tabBarLabel: "Accueil",
          tabBarIcon: ({ color }) => (
            <Icon name="home" color={color} size={26} />
          ),
        }}
      />

      <Tab.Screen
        name="Niveaux"
        component={GestionNiveau}
        options={{
          headerTitle: '',
          tabBarIcon: ({ color }) => <Icon name="list-alt" color={color} size={26} />,
        }}
      />

<Tab.Screen
  name="Publier"
  component={GestionAbonnement}
  options={({ route }) => ({
    headerTitle: '',
    tabBarLabel: '',
    tabBarButton: (props) => {
      const isFocused = props.accessibilityState?.selected;

      return (
        <TouchableOpacity
          {...props}
          style={styles.tabBarButtonContainer}
        >
          <View style={[
            styles.mainActionButton,
            isFocused && styles.mainActionButtonActive
          ]}>
            <Icon name="add" size={30} color="#fff" />
          </View>
        </TouchableOpacity>
      );
    },
  })}
/>

      <Tab.Screen
        name="Matières"
        component={GestionMatiere}
        options={{
          headerTitle: '',
          tabBarIcon: ({ color }) => <Icon name="collections" color={color} size={26} />,
        }}
      />

      <Tab.Screen
        name="Cours"
        component={GestionCours}
        options={{
          headerTitle: '',
          tabBarIcon: ({ color }) => <Icon name="account-balance" color={color} size={26} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  headerLeftSpacer: {
    width: 16,
  },
  headerTitle: {
    color: '#414d63',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  logoutButton: {
    marginRight: 16,
    padding: 8,
  },
  logoutButton2: {
    marginRight: 3,
    padding: 8,
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'gray',
  },
  tabBarButtonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    top: -15,
  },
  mainActionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  mainActionButtonActive: {
    backgroundColor: '#fa4447',
    shadowColor: '#fa4447',
  },
  tabBar: {
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    borderRadius: 15,
    height: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
    elevation: 5,
    backgroundColor: '#fff',
  },
  // badge
  badgeContainer: {
  position: 'absolute',
  right: -2,
  top: -2,
  backgroundColor: '#fa4447',
  borderRadius: 8,
  minWidth: 16,
  height: 16,
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 2,
},
badgeText: {
  color: '#fff',
  fontSize: 9,
  fontWeight: 'bold',
},

});