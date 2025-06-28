import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Animated, Vibration, ScrollView } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import * as Sensors from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import * as Battery from 'expo-battery';
import { LinearGradient } from 'expo-linear-gradient';

export default function DetecteurParanormal() {
  // États
  const [hasPermission, setHasPermission] = useState(null);
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ghostDetected, setGhostDetected] = useState(false);
  const [ghostLevel, setGhostLevel] = useState(0);
  const [detectionType, setDetectionType] = useState(null);
  const [emfLevel, setEmfLevel] = useState(0);
  const [tempAnomaly, setTempAnomaly] = useState(null);
  const [evpDetected, setEvpDetected] = useState(false);
  const [ionLevel, setIonLevel] = useState(0);
  const [history, setHistory] = useState([]);
  const [batteryLevel, setBatteryLevel] = useState(0);

  // Références
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef(null);
  const scanInterval = useRef(null);
  const historyScrollRef = useRef(null);
  const batterySubscription = useRef(null);

  // Configuration des théories
  const THEORIES = {
    EMF: {
      name: "Champs Électromagnétiques",
      description: "Fluctuations anormales du champ magnétique",
      icon: "wifi",
      levels: [
        { level: 0, label: "Normal", color: "#4CAF50", threshold: 0 },
        { level: 1, label: "Faible", color: "#8BC34A", threshold: 100 },
        { level: 2, label: "Modéré", color: "#FFEB3B", threshold: 200 },
        { level: 3, label: "Élevé", color: "#FF9800", threshold: 350 },
        { level: 4, label: "Dangereux", color: "#F44336", threshold: 500 },
        { level: 5, label: "Extrême!", color: "#9C27B0", threshold: 750 }
      ]
    },
    THERMAL: {
      name: "Anomalies Thermiques",
      description: "Variations de température inexpliquées",
      icon: "thermometer",
      levels: [
        { level: 0, label: "Stable", color: "#2196F3" },
        { level: 1, label: "Fluctuation", color: "#FF9800" },
        { level: 2, label: "Anomalie!", color: "#F44336" }
      ]
    },
    EVP: {
      name: "Voix Électroniques",
      description: "Phénomènes auditifs paranormaux",
      icon: "microphone",
      levels: [
        { level: 0, label: "Silence", color: "#9E9E9E" },
        { level: 1, label: "Détection!", color: "#673AB7" }
      ]
    },
    ION: {
      name: "Activité Ionique",
      description: "Concentration anormale d'ions",
      icon: "atom",
      levels: [
        { level: 0, label: "Normal", color: "#2196F3" },
        { level: 1, label: "Élevée", color: "#FF9800" },
        { level: 2, label: "Dangereuse!", color: "#F44336" }
      ]
    }
  };

  // Effets initiaux
  useEffect(() => {
    const init = async () => {
      await getPermissions();
      await startBatteryMonitoring();
    };
    init();
    return () => {
      stopAllSensors();
      if (batterySubscription.current) {
        batterySubscription.current.remove();
      }
    };
  }, []);

  const getPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
  };

  const startBatteryMonitoring = async () => {
    const level = await Battery.getBatteryLevelAsync();
    setBatteryLevel(Math.floor(level * 100));
    
    batterySubscription.current = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryLevel(Math.floor(batteryLevel * 100));
    });
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkTempAnomaly = (temp) => {
    const anomalyThreshold = batteryLevel > 80 || batteryLevel < 20;
    
    if (anomalyThreshold) {
      setTempAnomaly(batteryLevel);
      triggerDetection('THERMAL', 1);
    }
  };

  const simulateDetections = () => {
    // EMF
    const emfSpike = Math.random() > 0.95;
    if (emfSpike) {
      const level = Math.min(5, Math.floor(Math.random() * 6));
      setEmfLevel(THEORIES.EMF.levels[level].threshold + Math.random() * 50);
      triggerDetection('EMF', level);
    }

    // EVP
    if (Math.random() > 0.96) {
      setEvpDetected(true);
      triggerDetection('EVP', 1);
      setTimeout(() => setEvpDetected(false), 3000);
    }

    // Ions
    if (Math.random() > 0.93) {
      const level = Math.floor(Math.random() * 3);
      setIonLevel(level);
      triggerDetection('ION', level);
    }
  };

  const triggerDetection = (type, level) => {
    setDetectionType(type);
    setGhostLevel(level * 33);
    setGhostDetected(true);
    
    // Feedback haptique
    Haptics.notificationAsync(
      level > 2 ? 
      Haptics.NotificationFeedbackType.Error :
      Haptics.NotificationFeedbackType.Warning
    );
    
    Vibration.vibrate(level > 2 ? 1000 : 500);
    
    // Ajout à l'historique
    const newEntry = {
      type,
      level,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      theory: THEORIES[type].name,
      message: `${THEORIES[type].levels[level].label} - ${THEORIES[type].description}`,
      color: THEORIES[type].levels[level].color
    };
    
    setHistory(prev => [newEntry, ...prev.slice(0, 19)]);
    
    setTimeout(() => {
      setGhostDetected(false);
      setDetectionType(null);
    }, 5000);
  };

  const startScan = async () => {
    setIsScanning(true);
    startPulseAnimation();
    
    // Capteurs réels
    Sensors.Magnetometer.setUpdateInterval(800);
    const magSub = Sensors.Magnetometer.addListener(({ x, y, z }) => {
      const total = Math.sqrt(x**2 + y**2 + z**2);
      setEmfLevel(total);
    });
    
    // Simulation d'activités
    scanInterval.current = setInterval(simulateDetections, 2500);
    
    return () => magSub.remove();
  };

  const stopAllSensors = () => {
    setIsScanning(false);
    setGhostDetected(false);
    clearInterval(scanInterval.current);
    Sensors.Magnetometer.removeAllListeners();
    pulseAnim.stopAnimation();
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleTorch = () => {
    setTorch(current => !current);
  };

  const renderSensorGauge = (type, value, max) => {
    const theory = THEORIES[type];
    const level = theory.levels.find(l => l.level === value) || theory.levels[0];
    
    return (
      <View style={styles.gaugeContainer}>
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)']}
          style={styles.gaugeBackground}
        >
          <View style={styles.gaugeHeader}>
            <MaterialCommunityIcons name={theory.icon} size={20} color={level.color} />
            <Text style={[styles.gaugeTitle, { color: level.color }]}>
              {theory.name.toUpperCase()}
            </Text>
          </View>
          
          <Svg height="80" width="100%">
            {/* Jauge circulaire */}
            <Circle
              cx="50%"
              cy="40"
              r="30"
              stroke="#333"
              strokeWidth="6"
              fill="none"
            />
            <Circle
              cx="50%"
              cy="40"
              r="30"
              stroke={level.color}
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${(value / max) * 188}, 188`}
              rotation="-90"
              origin="50%, 40"
            />
            <SvgText
              x="50%"
              y="45"
              fill={level.color}
              fontSize="20"
              fontWeight="bold"
              textAnchor="middle"
            >
              {value}
            </SvgText>
          </Svg>
          
          <Text style={[styles.gaugeLabel, { color: level.color }]}>
            {level.label}
          </Text>
        </LinearGradient>
      </View>
    );
  };

  const renderDetectionAlert = () => (
    <Animated.View style={[
      styles.detectionAlert,
      { 
        transform: [{ scale: pulseAnim }],
        borderColor: THEORIES[detectionType]?.levels[ghostLevel/33]?.color || '#00BCD4'
      }
    ]}>
      <LinearGradient
        colors={['rgba(0,0,0,0.9)', 'rgba(20,20,20,0.8)']}
        style={styles.alertBackground}
      >
        <Text style={styles.alertTitle}>
          {THEORIES[detectionType]?.name.toUpperCase()}
        </Text>
        
        <View style={styles.alertLevelContainer}>
          <Text style={styles.alertLevel}>
            NIVEAU {ghostLevel}%
          </Text>
          <View style={[
            styles.alertLevelBar,
            { 
              width: `${ghostLevel}%`,
              backgroundColor: THEORIES[detectionType]?.levels[ghostLevel/33]?.color
            }
          ]}/>
        </View>
        
        <Svg height="180" width="180">
          <G rotation="-90" origin="90, 90">
            <Circle cx="90" cy="90" r="80" fill="rgba(0,0,0,0.3)" stroke="#333" strokeWidth="2" />
            {[0, 1, 2, 3, 4].map(i => (
              <Circle 
                key={i}
                cx="90" 
                cy="90" 
                r={80 - i*15} 
                stroke={`rgba(0, ${200 - i*40}, 255, ${0.3 - i*0.05})`} 
                strokeWidth="1" 
                fill="none" 
              />
            ))}
          </G>
          <Line x1="20" y1="20" x2="160" y2="160" stroke="red" strokeWidth="2" strokeDasharray="5,3" />
          <Line x1="160" y1="20" x2="20" y2="160" stroke="red" strokeWidth="2" strokeDasharray="5,3" />
        </Svg>
        
        <Text style={styles.alertDescription}>
          {THEORIES[detectionType]?.description}
        </Text>
        
        <View style={styles.alertFooter}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={20} 
            color={THEORIES[detectionType]?.levels[ghostLevel/33]?.color} 
          />
          <Text style={[
            styles.alertFooterText,
            { color: THEORIES[detectionType]?.levels[ghostLevel/33]?.color }
          ]}>
            {new Date().toLocaleTimeString()}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera-off" size={80} color="#5E35B1" />
        <Text style={styles.permissionText}>
          L'application nécessite l'accès à la caméra et aux capteurs pour fonctionner correctement
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={getPermissions}
        >
          <Text style={styles.permissionButtonText}>AUTORISER LES PERMISSIONS</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#5E35B1" />
        <Text style={styles.permissionText}>Initialisation des capteurs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        enableTorch={torch}
        zoom={0}
      />
      
      <LinearGradient
        colors={['rgba(0,0,0,0.7)', 'transparent']}
        style={styles.headerGradient}
      />
      
      <View style={styles.overlay}>
        {/* Barre d'état supérieure */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name="battery" size={18} color="#FFF" />
            <Text style={styles.statusText}>{batteryLevel}%</Text>
          </View>
          <Text style={styles.statusTime}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.statusItem}>
            <MaterialCommunityIcons name={torch ? "flashlight" : "flashlight-off"} size={18} color="#FFF" />
            <Text style={styles.statusText}>{torch ? "ON" : "OFF"}</Text>
          </View>
        </View>

        {/* Jauges des capteurs */}
        <View style={styles.gaugesContainer}>
          {renderSensorGauge('EMF', Math.floor(emfLevel / 150), 5)}
          {renderSensorGauge('THERMAL', tempAnomaly ? 1 + Math.floor(Math.random() * 2) : 0, 2)}
          {renderSensorGauge('ION', ionLevel, 2)}
        </View>

        {/* Détection active */}
        {ghostDetected && renderDetectionAlert()}

        {/* Historique */}
        {history.length > 0 && (
          <View style={styles.historyPanel}>
            <Text style={styles.panelTitle}>HISTORIQUE DES DÉTECTIONS</Text>
            <ScrollView
              ref={historyScrollRef}
              style={styles.historyScroll}
              contentContainerStyle={styles.historyContent}
              showsVerticalScrollIndicator={false}
            >
              {history.map((item, index) => (
                <View key={index} style={[
                  styles.historyCard,
                  { borderLeftColor: item.color }
                ]}>
                  <View style={styles.historyCardHeader}>
                    <Text style={[
                      styles.historyCardType,
                      { color: item.color }
                    ]}>
                      {item.theory}
                    </Text>
                    <Text style={styles.historyCardTime}>
                      {item.timestamp}
                    </Text>
                  </View>
                  <Text style={styles.historyCardMessage}>
                    {item.message}
                  </Text>
                  <View style={styles.historyCardLevel}>
                    <View style={[
                      styles.levelBadge,
                      { backgroundColor: item.color }
                    ]}>
                      <Text style={styles.levelBadgeText}>
                        NIVEAU {item.level}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Contrôles */}
        <View style={styles.controlsPanel}>
          <TouchableOpacity 
            style={[
              styles.controlButton,
              styles.flipButton,
              { backgroundColor: 'rgba(94, 53, 177, 0.7)' }
            ]}
            onPress={toggleCameraFacing}
          >
            <MaterialCommunityIcons 
              name="camera-flip" 
              size={28} 
              color="#FFF" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.mainButton,
              isScanning ? styles.stopButton : styles.scanButton
            ]}
            onPress={isScanning ? stopAllSensors : startScan}
          >
            <MaterialCommunityIcons 
              name={isScanning ? "stop" : "radar"} 
              size={32} 
              color="#FFF" 
            />
            <Text style={styles.mainButtonText}>
              {isScanning ? "ARRÊTER" : "SCANNER"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.controlButton,
              styles.torchButton,
              { backgroundColor: torch ? 'rgba(255, 152, 0, 0.7)' : 'rgba(33, 150, 243, 0.7)' }
            ]}
            onPress={toggleTorch}
          >
            <MaterialCommunityIcons 
              name={torch ? "flashlight" : "flashlight-off"} 
              size={28} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.footerGradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#121212',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 25,
    color: '#EEE',
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#5E35B1',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 5,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  footerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
    zIndex: 1,
  },
  overlay: {
    flex: 1,
    zIndex: 2,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 5,
    fontWeight: '500',
  },
  statusTime: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gaugesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  gaugeContainer: {
    width: '30%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
  },
  gaugeBackground: {
    padding: 10,
    alignItems: 'center',
  },
  gaugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  gaugeTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  detectionAlert: {
    position: 'absolute',
    top: '25%',
    alignSelf: 'center',
    width: '85%',
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 10,
  },
  alertBackground: {
    padding: 20,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
    textAlign: 'center',
  },
  alertLevelContainer: {
    width: '100%',
    marginBottom: 15,
  },
  alertLevel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
    textAlign: 'center',
  },
  alertLevelBar: {
    height: 4,
    borderRadius: 2,
  },
  alertDescription: {
    fontSize: 14,
    color: '#EEE',
    marginTop: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  alertFooterText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  historyPanel: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 10,
    maxHeight: 200,
  },
  panelTitle: {
    color: '#9C27B0',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 8,
  },
  historyScroll: {
    paddingHorizontal: 10,
  },
  historyContent: {
    paddingBottom: 15,
  },
  historyCard: {
    backgroundColor: 'rgba(50, 50, 50, 0.6)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  historyCardType: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyCardTime: {
    fontSize: 12,
    color: '#AAA',
  },
  historyCardMessage: {
    fontSize: 12,
    color: '#EEE',
    marginBottom: 5,
  },
  historyCardLevel: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  levelBadge: {
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  levelBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: 'bold',
  },
  controlsPanel: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  flipButton: {
    backgroundColor: 'rgba(94, 53, 177, 0.7)',
  },
  torchButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.7)',
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
  },
  scanButton: {
    backgroundColor: '#8E24AA',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  mainButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
});