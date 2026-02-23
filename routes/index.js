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
import NotificationManager from '../navigation/NotificationManager';
import { navigationRef } from '../navigation/NotificationManager';
import PaiementInitial from '../screens/paiement-initial';
import Informations from '../screens/informations';
import Ecoles from '../screens/complet-ecoles';
import Certificats from '../screens/complet-certificats';
import TableauBord from '../screens/gestion-tableau-bord';
import GestionCours from '../screens/gestion-cours';
import GestionAbonnement from '../screens/gestion-abonnement';
import GestionMatiere from '../screens/gestion-matiere';
import GestionNiveau from '../screens/gestion-niveau';
import CodeUnique from '../screens/code-unique';
import PaiementSucces from '../screens/paiement-succes';
import PaiementEchec from '../screens/paiement-echec';
import RegistreControle from '../screens/registre-controle';
import Abonnement from '../screens/abonnement';
import GestionVersets from '../screens/gestion-verset';
import GestionRegistres from '../screens/gestion-registre';
import GestionUtilisateurs from '../screens/gestion-utilisateur';
import Versions from '../screens/version';
import Stages from '../screens/complet-stages';
import DemandeStage from '../screens/demande-stage';
import DemandeStageComplet from '../screens/demande-stage-complet';
import Manuel from '../screens/menu-manuel';
import RetrouveCodeAbonnement from '../screens/retrouve-code';
import RetrouveAcces from '../screens/retrouve-acces';
import Clauses from '../screens/clauses';
import Notifications from '../screens/notifications';
import DiplomeInfo from '../screens/diplome-info';

const Stack = createNativeStackNavigator();

const linking = {
  prefixes: [
    'rouah://',
    'https://rouah.net',
    'https://www.rouah.net'
  ],
  config: {
    screens: {
      'PaiementInitial': 'transaction/initial/:id',
      'PaiementSucces': 'transaction/succes/:id',
      'PaiementEchec': 'transaction/echec/:id',
      'Bienvenue': 'app/bienvenue',
    },
  },
};


const Routes = () => {
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
       <NotificationManager />
 
      <Stack.Navigator initialRouteName="Bienvenue">
        
          <Stack.Screen name='Bienvenue' component={Bienvenue} options={{ headerShown: false }} />
          <Stack.Screen name='Accueil' component={Accueil} options={{ headerShown: false }} />
          <Stack.Screen name='Connexion' component={Connexion} options={{headerShown: false}}/>
          <Stack.Screen name='Inscription' component={Inscription} options={{headerShown: true}} />
          <Stack.Screen name='Profil' component={Profil} options={{headerShown: true}}/>
          <Stack.Screen name='Menu principal' component={MenuPrincipal} options={{headerShown: true}}/>
          <Stack.Screen name='BottomTabs' component={BottomTabs} options={{ headerShown: false }}/>
          <Stack.Screen name='Code unique' component={CodeUnique} options={{headerShown: true}}/>
          <Stack.Screen name="Informations" component={Informations} options={{headerShown: true}}/>
          <Stack.Screen name="Retrouve mes acces" component={RetrouveAcces} options={{headerShown: true}}/>
          <Stack.Screen name="Ecoles" component={Ecoles} options={{headerShown: true}}/>
          <Stack.Screen name="Certificats" component={Certificats} options={{headerShown: true}}/>
          <Stack.Screen name="Stages" component={Stages} options={{headerShown: true}}/>
          <Stack.Screen name="Demande de stage" component={DemandeStage} options={{headerShown: true}}/>
          <Stack.Screen name="Ma demande de stage" component={DemandeStageComplet} options={{headerShown: true}}/>
          <Stack.Screen name="Tableau de bord" component={TableauBord} options={{headerShown: true}}/>
          <Stack.Screen name="Gestion des cours" component={GestionCours} options={{headerShown: true}}/>
          <Stack.Screen name="Gestion des abonnements" component={GestionAbonnement} options={{headerShown: true}}/>
          <Stack.Screen name="Gestion des matieres" component={GestionMatiere} options={{headerShown: true}}/>
          <Stack.Screen name="Gestion des niveaux" component={GestionNiveau} options={{headerShown: true}}/>
          <Stack.Screen name="Gestion des versets" component={GestionVersets} options={{headerShown: true}}/>
          <Stack.Screen name="Gestion du registre" component={GestionRegistres} options={{headerShown: true}}/>
          <Stack.Screen name="Gestion des utilisateurs" component={GestionUtilisateurs} options={{headerShown: true}}/>
          <Stack.Screen name='PaiementInitial' component={PaiementInitial} options={{headerShown: false}}/>
          <Stack.Screen name="PaiementSucces" component={PaiementSucces} options={{headerShown: false}}/>
          <Stack.Screen name="PaiementEchec" component={PaiementEchec} options={{headerShown: false}}/>
          <Stack.Screen name="Registre de controle" component={RegistreControle} options={{headerShown: true}}/>
          <Stack.Screen name="Abonnement" component={Abonnement} options={{headerShown: true}}/>
          <Stack.Screen name="DiplomeInfo" component={DiplomeInfo} options={{headerShown: true}}/>
          <Stack.Screen name="Versions" component={Versions} options={{headerShown: true}}/>
          <Stack.Screen name="Menu" component={Manuel} options={{headerShown: true}}/>
          <Stack.Screen name="Retrouver mon code" component={RetrouveCodeAbonnement} options={{headerShown: true}}/>
          <Stack.Screen name="Clauses" component={Clauses} options={{headerShown: true}}/>
          <Stack.Screen name="Notifications" component={Notifications} options={{headerShown: false}}/>
          <Stack.Screen name='Déconnexion' component={Deconnexion} options={{headerShown: false}}/>   
                

      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default Routes