import React, { useEffect, useContext } from "react";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import Accueil from "../screens/accueil";
import EditionAnnonce from "../screens/edition-annonce";
import MenuPrincipal from '../screens/menu-principal';
import Annonces from "../screens/annonces";
import SuiviFamille from "../screens/suivi-famille";

const Tab = createBottomTabNavigator();

const CustomHeader = () => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        <Image source={require('../assets/logo-original.png')} resizeMode="contain" style={styles.avatarImg} />
        <Text style={styles.headerTitle}>Rouah</Text>
      </View>
    </View>
  );
};

export default function BottomTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Accueil"
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: '#fa4447',
        tabBarInactiveTintColor: '#414d63',
        headerTitle: () => <CustomHeader />,
        headerRight: () => (
          <TouchableOpacity 
            onPress={() => navigation.navigate('Déconnexion')}
            style={styles.logoutButton}
          >
            <Icon name="logout" size={24} color="#414d63" />
          </TouchableOpacity>
        ),
      })}
    >
      {/* Vos écrans Tab.Screen restent inchangés */}
      <Tab.Screen
        name="Accueil"
        component={Accueil}
        options={{
          tabBarIcon: ({ color }) => <Icon name="home" color={color} size={26} />,
        }}
      />

      <Tab.Screen
        name="Annonces"
        component={Annonces}
        options={{
          tabBarIcon: ({ color }) => <Icon name="list-alt" color={color} size={26} />,
        }}
      />

      <Tab.Screen
        name="Publier"
        component={EditionAnnonce}
        options={({ navigation }) => ({
          tabBarLabel: '',
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              style={styles.tabBarButtonContainer}
              onPress={() => navigation.navigate('Publier')}
            >
              <View style={[
                styles.mainActionButton,
                props.accessibilityState?.selected && styles.mainActionButtonActive
              ]}>
                <Icon name="add" size={30} color="#fff" />
              </View>
            </TouchableOpacity>
          ),
        })}
      />

      <Tab.Screen
        name="Sécurité"
        component={SuiviFamille}
        options={{
          tabBarIcon: ({ color }) => <Icon name="collections" color={color} size={26} />,
        }}
      />

      <Tab.Screen
        name="Services"
        component={MenuPrincipal}
        options={{
          tabBarIcon: ({ color }) => <Icon name="apps" color={color} size={26} />,
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
    elevation: 6,
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
});