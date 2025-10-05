import React, {useEffect, useState, useMemo} from 'react';
import {SafeAreaView,StyleSheet,View,FlatList,Image,Text,ActivityIndicator,TouchableOpacity,Dimensions,TextInput} from 'react-native';
import { MaterialCommunityIcons ,Feather} from '@expo/vector-icons';

const screenWidth = Dimensions.get("window").width; // Récupérez la longueur de l'écran

export default function Categories({item,navigation}) {

// liste des categories
const [isLoading, setIsLoading] = useState(false);
const [data, setData] = useState([]);
const [error, setError] = useState(null);

const [searchTerm, setSearchTerm] = useState('');


const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = () => {
    setRefreshing(true); // Indiquer que le rafraîchissement est en cours
    fetchData(); // Appeler la fonction de récupération des données
    setRefreshing(false); // Indiquer que le rafraîchissement est terminé
  };


useEffect(() => {
   // Exécuter la fonction avec cache
   const delay = 10000; // Définir le délai à 1 minute
   fetchData(); 
   // Définir un intervalle pour exécuter la fonction sans cache toutes les 1 minute
   const intervalId = setInterval(fetchData2, delay);
   // Nettoyer l'intervalle lorsque le composant est démonté ou lorsque l'effet se réexécute
   return () => clearInterval(intervalId);
}, []);


// toutes les categories
const fetchData = async () => {
  setIsLoading(true);
 try {
  const response = await fetch(`https://rouah.net/api/liste-categorie.php`, {
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
// Rechercher par api
const fetchData2 = async () => {
 try {
  const response = await fetch(`https://rouah.net/api/liste-categorie.php`, {
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
// liste

  
 // api recherche
     
   const searchItems = useMemo(() => {
     return () => {
       const filteredData = data.filter(item =>
         item.titre_categorie.toLowerCase().includes(searchTerm.toLowerCase())
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
        keyExtractor={item=>item.categorie_id} 
        renderItem={({item}) => (
          <TouchableOpacity 
          style={styles.scrollableListItem} 
          onPress={() => navigation.navigate("Partenaires", { item })}>
      

      {item.photo64 ? (
  <Image
              style={styles.imageThumbnail}
              source={{ uri: `data:${item.type};base64,${item.photo64.toString('base64')}` }}
              
            />
) : (
  <Image
  style={styles.imageThumbnail}
  source={require("../assets/logo.png")}
  
/>
    )}





            <Text style={styles.DoctorCategorie}>{item.titre_categorie}</Text>
          </TouchableOpacity>
        )}
        //Setting the number of column
        numColumns={3}
        
      />
     



    </View>
  );
};
 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff', // Fond blanc
  },

  imageThumbnail: {
    width : 70,
    height : 70,
    borderRadius : 70/2,
    backgroundColor : '#C0C0C0',


  },

  DoctorCategorie : {
    fontSize : 12,
    paddingHorizontal : 15,
    padding : 5,
    color : '#1F41BB',
    textAlign : 'center',
    width : 100,
    fontWeight : 'bold',
   },

   scrollableListItem : {
    flexDirection : 'column',
    //paddingHorizontal : 15,
    paddingVertical : 15,
    backgroundColor : 'white',
    marginRight : 10,
    //marginLeft : 10,
    marginBottom: 10,
    alignItems: 'center',
    width: screenWidth / 3.4,
    borderRadius : 15,
    borderWidth:1,
    borderColor: '#ccc',
    
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


});