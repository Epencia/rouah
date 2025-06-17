import React , {useEffect, useState, useContext , useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity, TextInput,ActivityIndicator } from 'react-native';
import { GlobalContext } from '../global/GlobalState';
import { MaterialCommunityIcons,Feather } from '@expo/vector-icons';



export default function Formations({navigation,route}) {

  const item = route?.params?.item;

    // liste des categories
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [user, setUser] = useContext(GlobalContext);
  
    const [refreshing, setRefreshing] = useState(false);
    const handleRefresh = () => {
      setRefreshing(true); // Indiquer que le rafraîchissement est en cours
      getFormations(); // Appeler la fonction de récupération des données
      setRefreshing(false); // Indiquer que le rafraîchissement est terminé
    };

  
   // toogle
 const [expandedItems, setExpandedItems] = useState([]);
 const toggleItem = (itemId) => {
   if (expandedItems.includes(itemId)) {
     setExpandedItems(expandedItems.filter(id => id !== itemId));
   } else {
     setExpandedItems([...expandedItems, itemId]);
   }
 };
  
  useEffect(()=>{
    
    navigation.setOptions({ title: item.titre });

  // Exécuter la fonction avec cache
const delay = 10000; // Définir le délai à 1 minute
getFormations(); 
// Définir un intervalle pour exécuter la fonction sans cache toutes les 1 minute
const intervalId = setInterval(getFormations2, delay);
// Nettoyer l'intervalle lorsque le composant est démonté ou lorsque l'effet se réexécute
return () => clearInterval(intervalId);
  },[])
  
  

  const getFormations = async () => {
    setIsLoading(true);
   try {
    const response = await fetch(`https://adores.cloud/api/liste-formation.php?categorie=${item.code}`, {
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
  
  // In des mobile money
  const getFormations2 = async () => {
   try {
    const response = await fetch(`https://adores.cloud/api/liste-formation.php?categorie=${item.code}`, {
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
        item.titre_formation.toLowerCase().includes(searchTerm.toLowerCase())||
        item.prix_formation.toLowerCase().includes(searchTerm.toLowerCase())||
        item.NombreVideo.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.diplome.toLowerCase().includes(searchTerm.toLowerCase())   
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
    <View style={styles.container}>


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
        keyExtractor={(item) => item.id_formation}
        renderItem={({item}) => (
          <View style={styles.experienceItem}>
        <TouchableOpacity onPress={() => toggleItem(item.id_formation)}>
                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>    
                       {item.photo64 ? (
            <Image
alt=""
resizeMode="cover"
source={{ uri: `data:${item.type};base64,${item.photo64.toString('base64')}` }}
style={styles.videoThumbnail}
/>
) : (
<Image
alt=""
resizeMode="cover"
source={require("../assets/user.jpg")}
style={styles.videoThumbnail}
/>
  )}
      

      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.titre_formation}</Text>
        <Text style={styles.videoChannel} numberOfLines={1}>Nombre de vidéos : {item.NombreVideo}</Text>
        <Text style={styles.videoViews} numberOfLines={1}>Diplôme : {item.diplome}</Text>
      </View>

      </View>
          
      {expandedItems.includes(item.id_formation) && (
          
          <View>
            <View style={{marginBottom:20}}></View>
            <TouchableOpacity
              style={styles.followButton} onPress={() => navigation.navigate('Details formation',{item})}>
              <Text style={styles.followButtonText}>Obtenir un certificat</Text>
            </TouchableOpacity>
            <View style={{marginBottom:10}}></View>
            <TouchableOpacity
              style={styles.followButton2} onPress={() => navigation.navigate('Videos',{item})}>
              <Text style={styles.followButtonText2}>Suivre les vidéos</Text>
            </TouchableOpacity>
          </View>
          )}
    </TouchableOpacity>
    </View>

      )}/>


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
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
  videoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderRadius: 8, // Bordures arrondies
    borderWidth: 1,
    borderColor: '#ccc',
    padding:10,
  },
  videoThumbnail: {
    width: 88,
    height: 88,
    borderRadius: 12,
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  videoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  videoChannel: {
    fontSize: 15,
    color: 'gray',
    marginBottom: 3,
  },
  videoViews: {
    fontSize: 14,
    color: 'gray',
  },
  experienceItem: {
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    padding:10,
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
});
