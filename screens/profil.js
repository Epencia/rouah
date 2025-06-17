import React, {useState, useContext} from 'react';
import { StyleSheet, Text, View, SafeAreaView,TextInput, Image, ScrollView,TouchableOpacity,Dimensions } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { GlobalContext } from '../global/GlobalState';
import { useHeaderHeight } from '@react-navigation/elements';
import * as ImagePicker from 'expo-image-picker';




const screenHeight = Dimensions.get("window").height; // Récupérez la hauteur de l'écran


export default function Profil({navigation}) {

    const headerHeight = useHeaderHeight();

  // Calculer la hauteur restante
  const remainingHeight = screenHeight - headerHeight;

    const [user, setUser] = useContext(GlobalContext);
    
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);

    const [login, setLogin] = useState((user && user[0] && user[0].login) || '');
    const [mdp, setMdp] = useState((user && user[0] && user[0].mdp) || '');
    const [email, setEmail] = useState((user && user[0] && user[0].email) || '');
    const [telephone, setTelephone] = useState((user && user[0] && user[0].telephone) || '');

    // images
    const [photo, setPhoto] = useState(null);
    const [TypePhoto, setTypePhoto] = useState('');


    const [selectedImage, setSelectedImage] = useState(null);
    const [selectedImageExtension, setSelectedImageExtension] = useState('');
    const [selectedImageBlob, setSelectedImageBlob] = useState(null);

    // autre
  
    
    // upload image

    const selectImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
          base64: true,
        allowsEditing: false,
         aspect: [4, 3],
        });
    
        if (!result.canceled) {
          setSelectedImage(result);
          const uriParts = result.assets[0].uri.split('.');
            const extension = uriParts[uriParts.length - 1];
            setSelectedImageExtension(`image/${extension}`);
        }
      };


    
    

	// 
	const ValidationProfil = () =>{

    // code

    const photo = selectedImage ? selectedImage.assets[0].base64 : null;

    

		fetch('https://adores.cloud/api/profil.php',{
			method:'post',
			headers:{
				'Content-Type': 'multipart/form-data',
			},
			body:JSON.stringify({
				// we will pass our input data to server
				matricule: (user && user.length > 0 && user[0].matricule) ? user[0].matricule : '',
				login: login,
                mdp : mdp,
                email : email,
                telephone : telephone,
                photo : photo,
                TypePhoto : selectedImageExtension,
			})
			
		})
		.then((response) => response.json())
		 .then((responseJson)=>{
      Alert.alert("Message",responseJson);
		 })
		 .catch((error)=>{
		 Alert.alert("Erreur",error);
		 });
		
	}

  // in

    return (

      <View style={{backgroundColor:'white' }}> 
        <ScrollView contentContainerStyle={{paddingBottom: 100,flexGrow: 1,justifyContent: 'center',minHeight: remainingHeight}}>

               
                
                <View style={{ alignSelf: "center" }}>

                <View style={styles.profileImage}>
        {selectedImage ? (
            <Image
                source={{ uri: selectedImage.assets[0].uri }}
                style={styles.image}
                resizeMode="center"
            />
        ) : (
            // Affichez l'image existante ou un logo par défaut
            user?.[0]?.photo64 ? (
                <Image
                    source={{ uri: `data:${user[0].type};base64,${user[0].photo64}` }}
                    style={styles.image}
                    resizeMode="center" 
                />
            ) : (
                <Image source={require("../assets/user.jpg")} style={styles.image} resizeMode="center" />
            ))
        }
    </View>

                    
                    <View style={styles.active}></View>
                    <View style={styles.add}>
                    <TouchableOpacity onPress={selectImage}>
                        <Ionicons name="add" size={48} color="#DFD8C8" style={{ marginTop: 6, marginLeft: 2 }}></Ionicons>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={[styles.text, { fontWeight: 300, fontSize: 32 }]}>{Array.isArray(user) && user.length > 0 ? user[0].nom_prenom || '' : ''}</Text>
                    <Text style={[styles.text, { color: "black", fontSize: 16 }]}>{Array.isArray(user) && user.length > 0 ? user[0].role || '' : ''}</Text>
                </View>
              
        
                <View style={styles.form}>

          <View>
            <Text style={styles.inputLabel}>Nom d'utilisateur</Text>
            <TextInput 
          label="Nom utilisateur" 
          variant="standard" 
          defaultValue={login}
          style={[styles.input, { height:44}]}
          onChangeText={(val) => setLogin(val)} />
          </View>
       
          
        

          <View>
            <Text style={styles.inputLabel}>Mot de passe</Text>
          <TextInput 
          label="Mot de passe" 
          variant="standard" 
          defaultValue={mdp}
          style={[styles.input, { height:44}]}
          onChangeText={(val) => setMdp(val)}
           />
       </View> 

       
       <View>
            <Text style={styles.inputLabel}>Email</Text>
          <TextInput 
          label="Email" 
          variant="standard" 
          defaultValue={email}
          style={[styles.input, { height:44}]}
          onChangeText={(val) => setEmail(val)}
           />
           </View>



           <View>
            <Text style={styles.inputLabel}>Téléphone</Text>
          <TextInput 
          label="Téléphone" 
          variant="standard" 
          defaultValue={telephone}
          style={[styles.input, { height:44}]}
          onChangeText={(val) => setTelephone(val)}
           />
           </View>



        
    
        
        
      </View>


     


            </ScrollView>

<View style={styles.overlay}>
<TouchableOpacity
  onPress={ValidationProfil}
  style={{ flex: 1, paddingHorizontal: 4 }}>
  <View style={styles.btn}>
    <Text style={styles.btnText}>Modifier</Text>
  </View>
</TouchableOpacity>
</View>

</View>
      
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center", // Centrage vertical
        alignItems: "center", // Centrage horizontal
        minHeight: screenHeight, // Ajustez la hauteur minimale à la hauteur de l'écran
        backgroundColor: "white",
      },
    text: {
        //fontFamily: "HelveticaNeue",
        color: "black",
        textAlign:"center"
    },
    image: {
        flex: 1,
        height: undefined,
        width: undefined
    },

    subText: {
        fontSize: 10,
        color: "#AEB5BC",
        textTransform: "uppercase",
        fontWeight: "500"
    },
    profileImage: {
        width: 200,
        height: 200,
        borderRadius: 100,
        overflow: "hidden",
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#0099cc', // Couleur du cercle
    },
    active: {
        backgroundColor: "#34FFB9",
        position: "absolute",
        bottom: 28,
        left: 10,
        padding: 4,
        height: 20,
        width: 20,
        borderRadius: 10
    },
    add: {
        backgroundColor: "#41444B",
        position: "absolute",
        bottom: 0,
        right: 0,
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: "center",
        justifyContent: "center"
    },
    infoContainer: {
        alignSelf: "center",
        alignItems: "center",
        marginTop: 1,
    },
    statsContainer: {
        flexDirection: "row",
        alignSelf: "center",
        marginTop: 32
    },
    statsBox: {
        alignItems: "center",
        flex: 1
    },

    userInfoSection: {
        //paddingHorizontal: 30,
        //marginBottom: 25,
        marginTop: 20,
      },

      row: {
        flexDirection: 'row',
        marginBottom: 10,
      },
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
      btnText: {
        fontSize: 16,
        lineHeight: 26,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 0.45,
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
      },

        /** Input */
  inputLabel: {
    fontSize: 15,
    //fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  inputControl: {
    height: 44,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
      form: {
        paddingHorizontal: 16,
        marginTop:25
      },
      input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    marginBottom: 15,
  },
});