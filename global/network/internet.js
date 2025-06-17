import { NetInfo } from '@react-native-community/netinfo';

export const ConnexionInternet = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected;
  } catch (error) {
    //console.error("Erreur de vérification de connexion:", error);
    return false;
  }
};