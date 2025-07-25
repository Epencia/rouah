import React, {  useState, useContext } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  View,Alert,
  Text,Linking,
  TextInput,ScrollView,
  TouchableOpacity,Image,StatusBar
} from 'react-native';
import { GlobalContext } from '../global/GlobalState';



export default function PaiementInitial({navigation})  {
        // variables

    // GLOBAL
    const [user] = useContext(GlobalContext);

     //VARIABLE
  const [MontantEnvoye, setMontantEnvoye] = useState('');
  const [MontantRecu, setMontantRecu] = useState('');
  const feePercentage = 2;

  const calculateReceivedAmount = (sentAmount) => {
    const fee = (sentAmount * feePercentage) / 100;
    return (sentAmount - fee).toFixed(0);
  };

  const calculateSentAmount = (receivedAmount) => {
    return (receivedAmount / (1 - feePercentage / 100)).toFixed(0);
  };

    const [isSubmitting, setIsSubmitting] = useState(false); // Add a state to track form submission
    const [errors, setErrors] = useState({}); // Add a state to hold the error messages
    
  // PHP MYSQL

  const handlePress = async () => {

    if (!MontantEnvoye || !MontantRecu) {
      setErrors({
        // Update error state with appropriate error messages
        MontantEnvoye: !MontantEnvoye ? 'Le champ Montant envoyé est requis' : '',
        MontantRecu: !MontantRecu ? 'Le champ Montant reçu est requis' : '',
      });
      return;
    }

    setIsSubmitting(true); // Set submitting state to true while sending the data


    // algo
    fetch(`https://rouah.net/api/paiement-initial.php`,{
      method:'POST',
      header:{
        'Accept': 'application/json',
        'Content-type': 'application/json'
      },
      body:JSON.stringify({
        // we will pass our input data to server
                utilisateur_id: user.matricule,
                MontantEnvoye : MontantEnvoye,
                MontantRecu : MontantRecu,
        
      })
    })
    .then((response) => response.json())
     .then((responseJson)=>{
      if (typeof responseJson === 'string' && responseJson.startsWith('http')) {
        Linking.openURL(responseJson);
    } else {
        Alert.alert("Message",responseJson);
    }
      setIsSubmitting(false);
      setMontantEnvoye('');
      setMontantRecu('');
     })
     .catch((error)=>{
      Alert.alert("Erreur",error);
      setIsSubmitting(false);
     });

  };
  // fin

  return (
    <SafeAreaView style={styles.container}>
        <StatusBar backgroundColor="white" barStyle="dark-content" />

    <ScrollView style={styles.form}>

    <View style={styles.userContainer}>

<View style={styles.userInfo}>
<Text style={styles.userName}>CONSIGNES</Text>
<Text style={styles.userCode}>Pour le rechargement, veuillez saisir le montant (envoyé ou reçu) et vous serez redirigé vers votre compte Wave.</Text>

</View>

</View>

<View style={styles.profileImage}>

<Image
alt=""
source={require("../assets/images/wave.png")}
style={styles.image}
resizeMode="center"
/>

</View> 
      

    <Text style={styles.label}>Montant envoyé * :</Text>
    <TextInput 
    style={[
      styles.input,
      errors.MontantEnvoye && styles.inputError,
    ]}
    label="Montant envoyé*" 
    variant="standard"
    keyboardType="numeric"
    placeholder="Saisir le montant à envoyer"
    maxLength={10}
    onChangeText={(text) => {
          setMontantEnvoye(text);
          setMontantRecu(calculateReceivedAmount(parseFloat(text) || 0));
        }}
    errorText={errors.MontantEnvoye}
    value={MontantEnvoye}
     />
      {errors.MontantEnvoye && (
          <Text style={styles.errorText}>{errors.MontantEnvoye}</Text>
        )}


<Text style={styles.label}>Montant reçu * :</Text>
    <TextInput 
    style={[
      styles.input,
      errors.MontantRecu && styles.inputError,
    ]}
       label="Montant reçu" 
       variant="standard" 
       keyboardType="numeric"
       placeholder="Saisir le montant reçu"
       maxLength={10}
       onChangeText={(text) => {
          setMontantRecu(text);
          setMontantEnvoye(calculateSentAmount(parseFloat(text) || 0));
        }}
       errorText={errors.MontantRecu} 
       value={MontantRecu}
    />
     {errors.MontantRecu && (
          <Text style={styles.errorText}>{errors.MontantRecu}</Text>
        )}


    <Text style={styles.note}>Frais  = {feePercentage}%</Text>
    
      <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Valider</Text>
        </TouchableOpacity>

   




      </ScrollView>
    </SafeAreaView>
  )
  
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  inputError: {
    borderColor: 'red', // Couleur de bordure rouge en cas d'erreur
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
    marginTop:-10
  },
  button: {
    marginTop:20,
    backgroundColor: '#fa4447',
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
  pickerContainer: {
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 16,
  },
  picker: {
    height: 40,
  },
  profileImage: {
    width: 150,
    height: 150,
    //borderRadius: 75,
    overflow: "hidden",
    marginTop: 1,
    borderWidth: 1,
    borderColor: 'gray', // Couleur du cercle
},
image: {
  flex: 1,
  height: undefined,
  width: undefined,
},
profileImageContainer: {
  flex: 1, // Utilisez flex pour aligner au centre
      justifyContent: 'center', // Alignez verticalement au centre
      alignItems: 'center', // Alignez horizontalement au centre
      backgroundColor: '#fff',
    },
    userContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ccc',
      backgroundColor: 'white',
      marginBottom: 5,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 18,
      fontWeight: 'bold',
      textAlign: 'center'
    },
    userCode: {
      fontSize: 14,
      color: 'black',
      textAlign: 'justify',
    },
    image: {
      flex: 1,
      height: undefined,
      width: undefined
  },
  profileImage: {
      width: 150,
    height: 125,
    marginBottom: 20,
    borderRadius: 10,
    //borderWidth: 1,
    borderColor: '#ccc',
    overflow: "hidden",
    alignSelf: "center",
  },
});