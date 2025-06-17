import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Vibration, Alert, Animated, Easing } from 'react-native';
import { Accelerometer } from 'expo-sensors';
// L'importation de 'Audio' de 'expo-av' a été retirée

const LIE_THRESHOLD = 1.5; // Seuil de secousses pour détecter un "mensonge" (ajustez si besoin)
const VIBRATION_DURATION = 500; // Durée de la vibration en ms

export default function LieDetectorSimulator() {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [subscription, setSubscription] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lieDetected, setLieDetected] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [responseState, setResponseState] = useState("idle"); // 'idle', 'asking', 'answering', 'answered'

  const questions = [
    "Avez-vous déjà mangé des frites au petit-déjeuner ?",
    "Pensez-vous être la personne la plus drôle de votre groupe d'amis ?",
    "Avez-vous déjà dit à quelqu'un que vous étiez en route alors que vous veniez de vous lever ?",
    "Prétendez-vous aimer un plat que vous détestez en réalité ?",
    "Avez-vous déjà utilisé une brosse à dents qui n'était pas la vôtre ?",
    "Est-ce que le chocolat est meilleur que la vanille ?", // Question neutre/opinion
    "Aimez-vous le temps pluvieux ?", // Question neutre/opinion
  ];

  const [questionIndex, setQuestionIndex] = useState(0);

  // --- Sons --- (Ces états ont été retirés)
  // const [soundAlarm, setSoundAlarm] = useState();
  // const [soundTension, setSoundTension] = useState();
  // const [soundBeep, setSoundBeep] = useState();

  // --- Animations ---
  const shakeGaugeValue = useRef(new Animated.Value(0)).current; // Pour la jauge de nervosité

  // Les useEffect liés au chargement et à la lecture des sons ont été retirés
  /*
  useEffect(() => {
    const loadSounds = async () => {
      try {
        const { sound: alarm } = await Audio.Sound.createAsync(
          require('./assets/alarm.mp3')
        );
        setSoundAlarm(alarm);

        const { sound: tension } = await Audio.Sound.createAsync(
          require('./assets/tension_music.mp3'),
          { isLooping: true, volume: 0.2 }
        );
        setSoundTension(tension);

        const { sound: beep } = await Audio.Sound.createAsync(
          require('./assets/beep.mp3')
        );
        setSoundBeep(beep);

      } catch (error) {
        console.warn("Erreur lors du chargement des sons:", error);
      }
    };

    loadSounds();

    return () => {
      soundAlarm && soundAlarm.unloadAsync();
      soundTension && soundTension.unloadAsync();
      soundBeep && soundBeep.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (isDetecting && soundTension) {
      soundTension.playAsync().catch(e => console.log("Erreur lecture tension:", e));
    } else if (soundTension) {
      soundTension.stopAsync().catch(e => console.log("Erreur arrêt tension:", e));
      soundTension.setPositionAsync(0);
    }
  }, [isDetecting, soundTension]);

  useEffect(() => {
    if (lieDetected && soundAlarm) {
      soundAlarm.replayAsync().catch(e => console.log("Erreur lecture alarme:", e));
      soundTension && soundTension.stopAsync().catch(e => console.log("Erreur arrêt tension:", e));
    }
  }, [lieDetected, soundAlarm, soundTension]);
  */

  // Fonction pour calculer l'intensité du mouvement
  const calculateShakeMagnitude = (x, y, z) => {
    const adjustedZ = z - 1;
    return Math.sqrt(x * x + y * y + adjustedZ * adjustedZ);
  };

  // Démarrer l'écoute de l'accéléromètre
  const _subscribe = () => {
    setSubscription(
      Accelerometer.addListener(accelerometerData => {
        setData(accelerometerData);
      })
    );
    Accelerometer.setUpdateInterval(100); // Mettre à jour toutes les 100ms
  };

  // Arrêter l'écoute
  const _unsubscribe = () => {
    subscription && subscription.remove();
    setSubscription(null);
  };

  useEffect(() => {
    return () => _unsubscribe(); // Nettoyage lors du démontage du composant
  }, [subscription]);

  // Logique de détection de mensonge et animation de la jauge
  useEffect(() => {
    if (isDetecting) {
      const magnitude = calculateShakeMagnitude(data.x, data.y, data.z);

      // Animer la jauge en fonction de la magnitude (normalisée entre 0 et 1)
      Animated.timing(shakeGaugeValue, {
          toValue: Math.min(magnitude / LIE_THRESHOLD, 1),
          duration: 100,
          easing: Easing.linear,
          useNativeDriver: false,
      }).start();

      if (magnitude > LIE_THRESHOLD) {
        setLieDetected(true);
        Vibration.vibrate(VIBRATION_DURATION);
        setIsDetecting(false);
        _unsubscribe();
      }
    } else {
        // Réinitialiser la jauge quand la détection n'est pas active
        Animated.timing(shakeGaugeValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }
  }, [data, isDetecting, shakeGaugeValue]);

  const startTest = () => {
    setLieDetected(false);
    setIsDetecting(false);
    setResponseState("asking");
    setQuestionIndex(0);
    setCurrentQuestion(questions[0]);
    _unsubscribe();
  };

  const askNextQuestion = () => {
    if (questionIndex < questions.length - 1) {
      setQuestionIndex(prevIndex => prevIndex + 1);
      setCurrentQuestion(questions[questionIndex + 1]);
      setResponseState("asking");
      setLieDetected(false);
      setIsDetecting(false);
      _unsubscribe();
    } else {
      Alert.alert("Test Terminé", "Toutes les questions ont été posées !");
      setResponseState("idle");
      setCurrentQuestion("");
      _unsubscribe();
    }
  };

  const startAnswering = () => {
    setResponseState("answering");
    // soundBeep && soundBeep.replayAsync().catch(e => console.log("Erreur lecture bip:", e)); // Cette ligne a été retirée
    _subscribe(); // Commencer à détecter les secousses
    setLieDetected(false);
    setIsDetecting(true); // Activer le drapeau de détection
  };

  const stopAnswering = () => {
    setResponseState("answered");
    setIsDetecting(false); // Arrêter la détection
    _unsubscribe(); // Arrêter d'écouter les secousses
  };

  // --- Messages personnalisés et humour ---
  const getResultComment = () => {
    if (lieDetected) {
        const lieMessages = [
            "ALERTE ROUGE ! Le détecteur hurle au loup !",
            "Mmmh, je crois que quelqu'un a des choses à cacher...",
            "Votre téléphone est scandalisé ! Mensonge détecté !",
            "Tension maximale ! La vérité s'est fait la malle...",
            "Les ondes confirment : histoire tordue en vue !"
        ];
        return lieMessages[Math.floor(Math.random() * lieMessages.length)];
    }
    if (responseState === 'answered' && !lieDetected) {
        const truthMessages = [
            "Véridique ! Vous êtes aussi transparent(e) que de l'eau de roche !",
            "Test de vérité passé avec succès ! Continuez comme ça.",
            "Rien à signaler, votre conscience est claire comme du cristal !",
            "La vérité est sortie ! Bravo l'honnêteté !",
            "Verdict : Absolument sincère !"
        ];
        return truthMessages[Math.floor(Math.random() * truthMessages.length)];
    }
    // Pour les autres états, retournez le message de statut générique
    switch (responseState) {
      case "idle":
        return "Prêt à démarrer l'interrogatoire...";
      case "asking":
        return "Lisez attentivement la question ci-dessous.";
      case "answering":
        return "Concentrez-vous... Ne bougez pas trop !";
      default:
        return "";
    }
  };

  const getBackgroundColor = () => {
    if (lieDetected) return '#FF6347';
    if (responseState === 'answering') return '#FFD700';
    return '#E0FFFF';
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.title}>Simulateur de Vérité Ultime</Text>

      <View style={styles.questionBox}>
        {responseState === "idle" ? (
          <Text style={styles.questionText}>Appuyez sur "Commencer le test" pour découvrir la vérité.</Text>
        ) : (
          <Text style={styles.questionText}>Question {questionIndex + 1}/{questions.length} :</Text>
        )}
        <Text style={styles.currentQuestion}>{currentQuestion}</Text>
      </View>

      <Text style={styles.statusMessage}>{getResultComment()}</Text>

      {/* Jauge de Nervosité */}
      {(responseState === 'answering' || responseState === 'answered') && !lieDetected && (
        <View style={styles.gaugeContainer}>
            <Animated.View
                style={[
                    styles.gaugeBar,
                    {
                        width: shakeGaugeValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                        }),
                        backgroundColor: shakeGaugeValue.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: ['#4CAF50', '#FFC107', '#F44336'],
                        }),
                    },
                ]}
            />
        </View>
      )}

      {lieDetected ? (
        <TouchableOpacity style={styles.button} onPress={startTest}>
          <Text style={styles.buttonText}>Recommencer l'enquête</Text>
        </TouchableOpacity>
      ) : (
        <>
          {responseState === "idle" && (
            <TouchableOpacity style={styles.button} onPress={startTest}>
              <Text style={styles.buttonText}>Commencer le test</Text>
            </TouchableOpacity>
          )}

          {responseState === "asking" && (
            <TouchableOpacity style={styles.button} onPress={startAnswering}>
              <Text style={styles.buttonText}>J'ai compris, je réponds !</Text>
            </TouchableOpacity>
          )}

          {responseState === "answering" && (
            <TouchableOpacity style={styles.button} onPress={stopAnswering}>
              <Text style={styles.buttonText}>J'ai fini de répondre</Text>
            </TouchableOpacity>
          )}

          {responseState === "answered" && (
            <TouchableOpacity style={styles.button} onPress={askNextQuestion}
              disabled={questionIndex >= questions.length - 1}
            >
              <Text style={styles.buttonText}>Question suivante</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Optionnel: Affichage des données brutes de l'accéléromètre pour le débogage */}
      {/*
      <Text style={styles.dataText}>
        x: {data.x.toFixed(2)} y: {data.y.toFixed(2)} z: {data.z.toFixed(2)}
      </Text>
      <Text style={styles.dataText}>
        Magnitude: {calculateShakeMagnitude(data.x, data.y, data.z).toFixed(2)}
      </Text>
      */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#E0FFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
    textAlign: 'center',
  },
  questionBox: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 25,
    marginBottom: 30,
    width: '90%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  questionText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  currentQuestion: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007bff',
    textAlign: 'center',
  },
  statusMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  gaugeContainer: {
    width: '80%',
    height: 20,
    backgroundColor: '#ccc',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 10,
  },
  gaugeBar: {
    height: '100%',
    borderRadius: 10,
  },
  dataText: {
    marginTop: 10,
    fontSize: 14,
    color: '#555',
  },
});