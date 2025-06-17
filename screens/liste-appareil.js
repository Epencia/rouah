import {StyleSheet,View,FlatList,Image,Text,TouchableOpacity,TextInput,ActivityIndicator,ScrollView,Linking} from 'react-native';
import React , {useEffect, useState, useContext, useMemo } from 'react';
import { MaterialCommunityIcons,Feather } from '@expo/vector-icons';
import { GlobalContext } from '../global/GlobalState';
import { GlobalCarte } from '../global/GlobalCarte';
import { SafeAreaView } from 'react-native-safe-area-context';



export default function ListeAppareil({navigation,item}) {

  // liste des categories
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [user, setUser] = useContext(GlobalContext);
  const [carte, setCarte] = useContext(GlobalCarte);


  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = () => {
    setRefreshing(true); // Indiquer que le rafraîchissement est en cours
    getPartenaire(); // Appeler la fonction de récupération des données
    setRefreshing(false); // Indiquer que le rafraîchissement est terminé
  };

useEffect(()=>{
// Exécuter la fonction avec cache
const delay = 10000; // Définir le délai à 1 minute
getPartenaire(); 
// Définir un intervalle pour exécuter la fonction sans cache toutes les 1 minute
const intervalId = setInterval(getPartenaire2, delay);
// Nettoyer l'intervalle lorsque le composant est démonté ou lorsque l'effet se réexécute
return () => clearInterval(intervalId);
},[])


 // toogle
 const [expandedItems, setExpandedItems] = useState([]);
 const toggleItem = (itemId) => {
   if (expandedItems.includes(itemId)) {
     setExpandedItems(expandedItems.filter(id => id !== itemId));
   } else {
     setExpandedItems([...expandedItems, itemId]);
   }
 };



// liste
const getPartenaire = async () => {
  setIsLoading(true);
 try {
  const response = await fetch(`https://adores.cloud/api/liste-appareil.php?matricule=${user[0].matricule}`, {
    headers: {
      //'Cache-Control': 'no-cache',
    },
  });
  const newData = await response.json();
  setData(newData);
 setIsLoading(false);
} catch (error) {
  setIsLoading(false);
  setError(error);
}
}
// liste 
const getPartenaire2 = async () => {
 try {
  const response = await fetch(`https://adores.cloud/api/liste-appareil.php?matricule=${user[0].matricule}`, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  const newData = await response.json();
  setData(newData);
} catch (error) {
  setError(error);
}
}


  // api recherche
  const searchItems = useMemo(() => {
    return () => {
    const filteredData = data.filter(item =>
      item.titre_appareil.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference_appareil.toLowerCase().includes(searchTerm.toLowerCase()) 
    );
    return filteredData;
};
}, [data, searchTerm]);
// api recherche

// Erreur et Chargement --debut--
if (isLoading) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#5500dc" />
    </View>
  );
}

if (error) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center',backgroundColor:'white' }}>
      <MaterialCommunityIcons color="#266EF1" name="access-point-off" size={150}/>
      <Text style={{ fontSize: 18,marginRight:10,marginLeft:10,marginBottom:10}}>
      Pas de connexion internet !
      </Text>
      <TouchableOpacity onPress={handleRefresh} style={{ backgroundColor: '#0099cc',paddingVertical: 10,paddingHorizontal: 20,borderRadius: 5,}}>
        <Text style={{ color: 'white',fontSize: 16,fontWeight: 'bold',textAlign: 'center', }}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}
// Erreur et Chargement --fin--

return (
  <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

{data.length > 0 ? (
<View style={styles.searchBar}>
<Feather name="search" size={24} color="gray" style={styles.searchIcon} />
<TextInput
 style={styles.input}
 placeholder="Rechercher..."
 onChangeText={text => setSearchTerm(text)}
value={searchTerm}
/>
</View>
) : (
  <View style={{marginTop: 25, marginRight:15,marginLeft:15,
      elevation:5,backgroundColor:'white',borderRadius:6,marginBottom:5,
    }}>
    <Text style={{marginTop: 10, marginRight:15,marginLeft:15,
      marginBottom:15,color:'#888',textAlign:'center'
    }}>Aucune donnée disponible</Text>
    </View>
  )}

 

    <FlatList
       data={searchTerm ? searchItems() : data}
      keyExtractor={(item) => item.code_appareil}
      renderItem={({item}) => (
        <View style={styles.experienceItem}>
         
        <TouchableOpacity  onPress={() => navigation.navigate("Edition d'appareil", { item })}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <MaterialCommunityIcons style={styles.image} color="#0A84FF" name="laptop" size={50} />

        <View style={styles.textContainer}>
          <Text style={styles.text}>{item.titre_appareil? item.titre_appareil : "Aucun résultat"}</Text>
          <View style={styles.dataContainer}>
            <Text style={styles.dataText}>{item.reference_appareil ? item.reference_appareil : "Aucun résultat"}</Text>
          </View>
        </View>
        </View>

      </TouchableOpacity>
      </View>
      )}
    />

  </SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: 'white', // Fond blanc
  padding: 16,
},
searchBar: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 16,
  backgroundColor: 'white', // Fond blanc pour la barre de recherche
  borderRadius: 8,
  borderWidth: 1,
  borderColor: 'gray',
},
searchIcon: {
  padding: 8,
},
input: {
  flex: 1,
  height: 40,
},
listItem: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
  borderRadius: 8, // Bordures arrondies
  backgroundColor: 'white', // Fond gris clair
  padding: 16,
  borderWidth: 1,
  borderColor: '#ccc',
},
image: {
  width: 50,
  height: 50,
  borderRadius: 25,
  marginRight: 16,
},
textContainer: {
  flex: 1,
},
text: {
  fontSize: 16,
},
dataText: {
  fontSize: 14,
  color: 'gray',
},
dataContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
icon: {
  marginRight: 8,
},
followButton: {
  backgroundColor: '#007BFF',
  paddingVertical: 6,
  paddingHorizontal: 16,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
},
followingButton: {
  backgroundColor: '#ccc',
},
followButtonText: {
  color: 'white',
},
followingButtonText: {
  color: '#333',
},
experienceItem: {
  marginBottom: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ccc',
  padding:12,
},
followButton2: {
  backgroundColor: 'white',
  borderColor:'#007BFF',
  borderWidth:1,
  paddingVertical: 6,
  paddingHorizontal: 16,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
},
followButtonText2: {
  color: '#007BFF',
},
// OVERLAY
   overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  footer: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
    height: 50,
    //marginRight:10
  },
   button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    backgroundColor: '#3C64B1', // Couleur Hostinger / personnalisée
    borderColor: '#3C64B1',
    height: 50,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft:5
  },
});
