import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View, Image, TextInput, TouchableOpacity, Text, StatusBar, Alert,ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons ,Feather} from '@expo/vector-icons';
import HTML from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';

export default function RegistreControle({navigation}) {

  const [searchText, setSearchText] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);

  const { width: windowWidth } = useWindowDimensions();

  const ignoredDomTags = ['o:p','v:shape','v:shapetype','u1:p','font','color'];

  // liste
const handleSearch = async () => {
  
    if (!searchText) {
        setErrors({
          // Update error state with appropriate error messages
          searchText: !searchText ? 'Veuillez renseigner obligatoirement ce champ' : '',
        });
        return;
      }

    setIsSubmitting(true);

 try {
  const response = await fetch(`https://adores.cloud/api/registre-controle.php`, {
     method:'POST',
      headers:{
          'Accept': 'application/json',
          'Content-type': 'application/json'
      },
      body:JSON.stringify({matricule: searchText,}),
  });
  const result = await response.json();
  setMessage(result);
  setIsSubmitting(false);
} catch (error) {
  setError(error);
  setIsSubmitting(false);
}
}
// liste



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <View style={styles.container2}>

        <Image
          source={require("../assets/logo.png")}
          style={styles.logo}
        />
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { borderColor: errors.searchText ? 'red' : '#0A84FF' }]}>
            <Feather name="search" size={24} color="gray" style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Saisir l'identifiant ou le matricule"
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
                if (text) {
                  setErrors({ searchText: '' });
                }
              }}
            />
          </View>
        </View>
        {errors.searchText ? (
          <Text style={{ color: 'red', marginTop: -25, marginBottom: 10 }}>{errors.searchText}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity style={styles.button} onPress={handleSearch}>
            <Text style={styles.buttonText}>Rechercher</Text>
          </TouchableOpacity>
        </View>
        {/* Jauge */}
        {isSubmitting && (
           <ActivityIndicator size="large" color="blue" />
        )}
        {/* Display Thoughts of the Day */}
        <View style={styles.thoughtsContainer}>
  {message ? (
    <HTML 
      source={{ html: message }} 
      contentWidth={windowWidth} 
      ignoredDomTags={ignoredDomTags}
    />
  ) : null}
</View>

      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
  },
  container2: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
  },
  horizontalContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',  // Alignement à droite
    alignItems: 'center',  // Alignement vertical au centre
    position: 'absolute',
    top: 10,
    right: 10,
    width: '80%',  // Ajustez la largeur selon vos besoins
    zIndex:999
  },
  appButton: {
    marginLeft: 10,  // Espacement entre les boutons si nécessaire
  },
  appButton3: {
    paddingHorizontal: 20,  // Espacement horizontal pour le premier bouton
  },
  appButton2: {
    marginLeft: 10,  // Espacement entre les boutons si nécessaire
  },
  logo: {
    width: 150,
    height: 125,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0A84FF',
    width: '100%',
  },
  searchIcon: {
    padding: 8,
  },
  input: {
    flex: 1,
    height: 40,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
    width: 120,
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize:13
  },
  thoughtsContainer: {
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thoughtsText: {
    color: '#0A84FF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  thoughtsContent: {
    color: 'gray',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonClose: {
    backgroundColor: '#2196F3',
  },
  button2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
    width: 190,
    marginRight: 10,
    marginBottom: 10,
  },
  buttonText2: {
    color: '#fff',
    textAlign: 'center',
  },
  profileImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: -20,
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'gray',
  },
});
