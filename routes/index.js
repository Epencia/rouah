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
import BadgeCommercial from '../screens/badge-commercial';
import CatalogueArticle from '../screens/catalogue-article';
import Informations from '../screens/informations';
import MonCatalogueArticle from '../screens/edition-article';
import CodeMarchand from '../screens/code-marchand';
import Caisses from '../screens/caisses';
import Licences from '../screens/licences';
import Chaines from '../screens/liste-chaine';
import CatalogueChaine from '../screens/cataogue-chaine';
import Cartes from '../screens/cartes';
import Videos from '../screens/videos';
import Recherche from '../screens/recherche';
import ArticleDetails from '../screens/details-article';
import CommandesClients from '../screens/commandes-clients';
import MesCommandes from '../screens/commandes-perso';
import MotPasseOublie from '../screens/mot-passe-oublie';
import Diplomes from '../screens/diplome';
import Factures from '../screens/facture';
import RecuCaisse from '../screens/recu-caisse';
import Outils from '../screens/outils';
import CarteVisite from '../screens/carte-visite';
import CurriculumVitae from '../screens/curriculum-vitae';
import Terminal from '../screens/terminal';
import Comptoir from '../screens/comptoir';
import Partenaires from '../screens/partenaire';
import Tendances from '../screens/tendance';
import Galerie from '../screens/galerie';
import Qrcode from '../screens/qrcode';


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
          <Stack.Screen name="Mes annonces" component={ListeAnnonce} options={{headerShown: true}}/>
          <Stack.Screen name="Annonces" component={Annonces} options={{headerShown: true}}/>
          <Stack.Screen name="Details d'annonce" component={AnnonceDetails} options={{headerShown: true}}/>
          <Stack.Screen name='Contacts' component={ListeContact} options={{headerShown: true}}/>
          <Stack.Screen name='Paiement UVE' component={PaiementInitial} options={{headerShown: true}}/>
          <Stack.Screen name='Code marchand' component={CodeMarchand} options={{headerShown: true}}/>
          <Stack.Screen name="Badge commercial" component={BadgeCommercial} options={{headerShown: true}}/>
          <Stack.Screen name="Chaines" component={Chaines} options={{headerShown: true}}/>
          <Stack.Screen name="Produits" component={CatalogueChaine} options={{headerShown: true}}/>
          <Stack.Screen name="Articles" component={CatalogueArticle} options={{headerShown: true}}/>
          <Stack.Screen name="Details d'article" component={ArticleDetails} options={{headerShown: true}}/>
          <Stack.Screen name="Caisses" component={Caisses} options={{headerShown: true}}/>
          <Stack.Screen name="Mes articles" component={MonCatalogueArticle} options={{headerShown: true}}/>
          <Stack.Screen name="Informations" component={Informations} options={{headerShown: true}}/>
          <Stack.Screen name="Partenaires" component={Partenaires} options={{headerShown: true}}/>
          <Stack.Screen name="Licences" component={Licences} options={{headerShown: true}}/>
          <Stack.Screen name="Cartes" component={Cartes} options={{headerShown: true}}/>
          <Stack.Screen name="Videos" component={Videos} options={{headerShown: true}}/>
          <Stack.Screen name="Je cherche" component={Recherche} options={{headerShown: true}}/>
          <Stack.Screen name="Commandes clients" component={CommandesClients} options={{headerShown: true}}/>
          <Stack.Screen name="Mes commandes" component={MesCommandes} options={{headerShown: true}}/>
          <Stack.Screen name="Mot de passe" component={MotPasseOublie} options={{headerShown: true}}/>
          <Stack.Screen name="Comptoir" component={Comptoir} options={{headerShown: false}}/>
          <Stack.Screen name="Diplomes" component={Diplomes} options={{headerShown: false}}/>
          <Stack.Screen name="Factures" component={Factures} options={{headerShown: true}}/>
          <Stack.Screen name="Recu de caisse" component={RecuCaisse} options={{headerShown: true}}/>
          <Stack.Screen name="Outils" component={Outils} options={{headerShown: true}}/>
          <Stack.Screen name="Carte de visite" component={CarteVisite} options={{headerShown: true}}/>
          <Stack.Screen name="Curriculum vitae" component={CurriculumVitae} options={{headerShown: true}}/>
          <Stack.Screen name="Terminal" component={Terminal} options={{headerShown: false}}/>
          <Stack.Screen name="Tendances" component={Tendances} options={{headerShown: true}}/>
           <Stack.Screen name="Galeries" component={Galerie} options={{headerShown: false}}/>
           <Stack.Screen name="QR Code" component={Qrcode} options={{headerShown: true}}/>
          <Stack.Screen name='Déconnexion' component={Deconnexion} options={{headerShown: true}}/>          

      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default Routes