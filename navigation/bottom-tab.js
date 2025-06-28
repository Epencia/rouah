import React, { useEffect, useState, useContext } from "react";
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { GlobalContext } from '../global/GlobalState';
import Menu from "../screens/menu";
import Accueil from "../screens/accueil";
import Geolocalisation from "../screens/geolocalisation";
import AlerteSOS from "../screens/alerte-sos";
import AppStore from "../screens/app-store";

const Tab = createBottomTabNavigator();

const CustomHeader = ({ navigation }) => {
  const [user, setUser] = useContext(GlobalContext);
  const [count, setCount] = useState(0); // Initialiser comme nombre, pas tableau

  useEffect(() => {
    // Redirection si user est invalide
    if (!user || (typeof user === 'object' && Object.keys(user).length === 0)) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Connexion' }],
      });
      return;
    }

    // Mettre à jour les notifications
    const updateData = () => {
      getNombreNotification();
    };
    updateData();
    const intervalId = setInterval(updateData, 1000);
    return () => clearInterval(intervalId);
  }, [user, navigation]);

  // Récupérer le nombre de notifications
  const getNombreNotification = () => {
    if (!user?.id) return;

    fetch(`https://adores.cloud/api/nombre-notification.php?id=${user.id}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((result) => {
        // Assumer que result est un nombre ou un objet avec un champ
        const notificationCount = typeof result === 'number' ? result : result?.count || 0;
        setCount(notificationCount);
      })
      .catch((error) => {
        console.error('Erreur notification:', error);
      });
  };

  return (
    <View style={styles.headerContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center',marginRight:80 }}>
        <Image source={require('../assets/logo.png')} style={styles.avatarImg} />
        <Text style={styles.headerTitle}>Adorès</Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>

        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Icon name="notifications" size={24} color="#414d63" style={styles.icon} />
          {count > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationText}>{count}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Déconnexion')}>
          <Icon name="logout" size={24} color="#414d63" style={styles.icon} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Profil')}>
          <View style={styles.avatar}>
            {user?.photo64 ? (
              <Image
                source={{ uri: `data:${user.type};base64,${user.photo64}` }}
                style={styles.avatarImg}
              />
            ) : (
              <Image source={require('../assets/user.jpg')} style={styles.avatarImg} />
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function BottomTabs({navigation}) {
  return (
    <Tab.Navigator
      initialRouteName="Accueil"
      screenOptions={{
        tabBarActiveTintColor: '#1F41BB',
        tabBarInactiveTintColor: '#414d63',
      }}
    >
      <Tab.Screen
        name="Accueil"
        component={Accueil}
        options={({ navigation }) => ({
          tabBarIcon: ({ color }) => <Icon name="home" color={color} size={28} />,
          headerTitle: () => <CustomHeader navigation={navigation} />,
          headerShown: true,
        })}
      />
      <Tab.Screen
        name="Dangers"
        component={AlerteSOS}
        options={({ navigation }) => ({
          tabBarLabel: 'Dangers',
          tabBarIcon: ({ color }) => <Icon name="flash-on" color={color} size={28} />,
          headerTitle: () => <CustomHeader navigation={navigation} />,
          headerShown: true,
        })}
      />
      <Tab.Screen
        name="Outils"
        component={AppStore}
        options={({ navigation }) => ({
          tabBarLabel: 'Outils',
          tabBarIcon: ({ color }) => <Icon name="install-desktop" color={color} size={28} />,
          headerTitle: () => <CustomHeader navigation={navigation} />,
          headerShown: true,
        })}
      />
      <Tab.Screen
        name="Recherche"
        component={Geolocalisation}
        options={({ navigation }) => ({
          tabBarLabel: 'Recherche',
          tabBarIcon: ({ color }) => <Icon name="search" color={color} size={28} />,
          headerTitle: () => <CustomHeader navigation={navigation} />,
          headerShown: true,
        })}
      />
      <Tab.Screen
        name="Espace"
        component={Menu}
        options={({ navigation }) => ({
          tabBarLabel: 'Espace',
          tabBarIcon: ({ color }) => <Icon name="apps" color={color} size={28} />,
          headerTitle: () => <CustomHeader navigation={navigation} />,
          headerShown: true,
        })}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  headerTitle: {
    color: '#414d63',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  icon: {
    marginHorizontal: 10,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: 5,
    backgroundColor: 'red',
    borderRadius: 50,
    width: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    color: 'white',
    fontSize: 8,
  },
  avatar: {
    position: 'relative',
  },
  avatarImg: {
    width: 30,
    height: 30,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'gray',
  },
});