import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Profil from '../screens/profil';
import Connexion from '../screens/connexion';
import Inscription from '../screens/inscription';
import Bienvenue from '../screens/bienvenue';
import MenuPrincipal from '../screens/menu-principal';
import Accueil from '../screens/accueil';
import Deconnexion from '../screens/deconnexion';
import BottomTabs from '../navigation/BottomTabs';
import Gemini from '../screens/gemini';
import LoginUser from '../screens/login-user';
import LoginPass from '../screens/login-pass';
import ListeAnnonce from '../screens/liste-annonce';
import Annonces from '../screens/annonces';
import NotificationManager from '../navigation/NotificationManager';
import { navigationRef } from '../navigation/NotificationManager';
import AnnonceDetails from '../screens/details-annonce';
import EditionAnnonce from '../screens/edition-annonce';
import ListeContact from '../screens/liste-contact';
import PaiementInitial from '../screens/paiement-initial';
import EditionBoutique from '../screens/edition-boutique';
import ZoneBoutique from '../screens/zone-boutique';
import BadgeCommercial from '../screens/badge-commercial';
import Categories from '../screens/liste-categorie';
import Partenaires from '../screens/liste-partenaire';
import CatalogueArticle from '../screens/catalogue-article';
import Informations from '../screens/informations';
import AvisRecherche from '../screens/avis-recherche';
import MonCatalogueArticle from '../screens/edition-article';
import Outils from '../screens/outils';
import CodeMarchand from '../screens/code-marchand';
import Publicites from '../screens/publicites';
import Caisses from '../screens/caisses';




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
          <Stack.Screen name='BottomTabs' component={BottomTabs} options={{ headerShown: false }}/>
          <Stack.Screen name='Login user' component={LoginUser} options={{headerShown: true}}/>
          <Stack.Screen name='Login pass' component={LoginPass} options={{headerShown: true}}/>
          <Stack.Screen name="Edition d'annonce" component={EditionAnnonce} options={{headerShown: true}}/>
          <Stack.Screen name="Avis de recherche" component={AvisRecherche} options={{headerShown: true}}/>
          <Stack.Screen name="Publicites" component={Publicites} options={{headerShown: true}}/>
          <Stack.Screen name="Mes annonces" component={ListeAnnonce} options={{headerShown: true}}/>
          <Stack.Screen name="Annonces" component={Annonces} options={{headerShown: true}}/>
          <Stack.Screen name="Details d'annonce" component={AnnonceDetails} options={{headerShown: true}}/>
          <Stack.Screen name="Edition de zone" component={EditionBoutique} options={{headerShown: true}}/>
          <Stack.Screen name='Zones marchandes' component={ZoneBoutique} options={{ headerShown: true }}/>
          <Stack.Screen name='Contacts' component={ListeContact} options={{headerShown: true}}/>
          <Stack.Screen name='Paiement UVE' component={PaiementInitial} options={{headerShown: true}}/>
          <Stack.Screen name='Code marchand' component={CodeMarchand} options={{headerShown: true}}/>
          <Stack.Screen name="Badge commercial" component={BadgeCommercial} options={{headerShown: true}}/>
          <Stack.Screen name="Categories" component={Categories} options={{headerShown: true}}/>
          <Stack.Screen name="Partenaires" component={Partenaires} options={{headerShown: true}}/>
          <Stack.Screen name="Articles" component={CatalogueArticle} options={{headerShown: true}}/>
          <Stack.Screen name="Caisses" component={Caisses} options={{headerShown: true}}/>
          <Stack.Screen name="Mes articles" component={MonCatalogueArticle} options={{headerShown: true}}/>
          <Stack.Screen name="Informations" component={Informations} options={{headerShown: true}}/>
          <Stack.Screen name="Outils" component={Outils} options={{headerShown: true}}/>
          <Stack.Screen name='Déconnexion' component={Deconnexion} options={{headerShown: true}}/>          

      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default Routes