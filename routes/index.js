import React from 'react'
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Profil from '../screens/profil';
import Connexion from '../screens/connexion';
import Inscription from '../screens/inscription';
import Bienvenue from '../screens/bienvenue';
import MenuPrincipal from '../screens/menu-principal';
import Accueil from '../screens/accueil';
import Deconnexion from '../screens/deconnexion';
import Notifications from '../screens/notification';
import BottomTabs from '../navigation/bottom-tab';
import Gemini from '../screens/gemini';
import LoginUser from '../screens/login-user';
import LoginPass from '../screens/login-pass';
import ListeAnnonce from '../screens/liste-annonce';
import Annonces from '../screens/annonces';
import NotificationManager from '../navigation/NotificationManager';
import { navigationRef } from '../navigation/NotificationManager';
import AnnonceDetails from '../screens/details-annonce';
import EditionAnnonce from '../screens/edition-annonce';
import SignalAlerte from '../screens/alerte-signal';
import EditionAlerte from '../screens/edition-alerte';
import ListeContact from '../screens/liste-contact';
import Geolocalisation from '../screens/geolocalisation';
import AlerteSOS from '../screens/alerte-sos';
import ZoneDangereuse from '../screens/zone-dangereuse';
import DetecteurVitesse from '../screens/detecteur-vitesse';
import DetecteurParanormal from '../screens/detecteur-paranormal';
import DetecteurMagnetique from '../screens/detecteur-magnetique';
import SuiviFamille from '../screens/suivi-famille';



const Stack = createNativeStackNavigator();

const Routes = () => {
  return (
    <NavigationContainer ref={navigationRef}>
       <NotificationManager />

      <Stack.Navigator initialRouteName="Bienvenue">
        
          <Stack.Screen name='Bienvenue' component={Bienvenue} options={{ headerShown: false }} />
          <Stack.Screen name='Gemini' component={Gemini} options={{ headerShown: true }} />
          <Stack.Screen name='Accueil' component={Accueil} options={{ headerShown: false }} />
          <Stack.Screen name='Connexion' component={Connexion} options={{headerShown: true}}/>
          <Stack.Screen name='Inscription' component={Inscription} options={{headerShown: true}} />
          <Stack.Screen name='Profil' component={Profil} options={{headerShown: true}}/>
          <Stack.Screen name='Menu principal' component={MenuPrincipal} options={{headerShown: true}}/>
          <Stack.Screen name='Notifications' component={Notifications} options={{headerShown: true}}/>
          <Stack.Screen name='BottomTabs' component={BottomTabs} options={{ headerShown: false }}/>
          <Stack.Screen name='Login user' component={LoginUser} options={{headerShown: true}}/>
          <Stack.Screen name='Login pass' component={LoginPass} options={{headerShown: true}}/>
          <Stack.Screen name="Edition d'annonce" component={EditionAnnonce} options={{headerShown: true}}/>
          <Stack.Screen name="Liste des annonces" component={ListeAnnonce} options={{headerShown: true}}/>
          <Stack.Screen name="Annonces" component={Annonces} options={{headerShown: true}}/>
          <Stack.Screen name="Details d'annonce" component={AnnonceDetails} options={{headerShown: true}}/>
          <Stack.Screen name="Signal d'alerte" component={SignalAlerte} />
          <Stack.Screen name='Zones dangereuses' component={ZoneDangereuse} options={{headerShown: true}}/>
          <Stack.Screen name="Edition d'alerte" component={EditionAlerte} options={{headerShown: true}}/>
          <Stack.Screen name='Alerte SOS' component={AlerteSOS} options={{headerShown: true}}/>
          <Stack.Screen name='Geolocalisation' component={Geolocalisation} options={{ headerShown: true }}/>
          <Stack.Screen name='Contacts' component={ListeContact} options={{headerShown: true}}/>
          <Stack.Screen name='Detecteur magnetique' component={DetecteurMagnetique} options={{headerShown: true}}/>
          <Stack.Screen name='Detecteur paranormal' component={DetecteurParanormal} options={{headerShown: true}}/>
          <Stack.Screen name='Detecteur de vitesse' component={DetecteurVitesse} options={{headerShown: true}}/>
          <Stack.Screen name='Suivi' component={SuiviFamille} options={{headerShown: true}}/>
          <Stack.Screen name='Déconnexion' component={Deconnexion} options={{headerShown: true}}/>
          

      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default Routes