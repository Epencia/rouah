import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const WaveEmitter = ({
  color = '#007bff',
  initialRadius = 50,
  maxRadius = Math.min(width, height) * 0.4, // Max size of the wave in pixels
  duration = 2000,
  numberOfWaves = 3,
  borderWidth = 2, // New prop for border width
  fillOpacity = 0.2 // New prop for fill opacity
}) => {
  const animatedValues = useRef(Array.from({ length: numberOfWaves }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const createAnimation = (animatedValue, delay) => {
      animatedValue.setValue(0); // Reset for restart
      return Animated.timing(animatedValue, {
        toValue: 1,
        duration: duration,
        easing: Easing.out(Easing.ease), // Smooth acceleration then deceleration
        delay: delay,
        useNativeDriver: true, // Use native driver for better performance
      });
    };

    const startAnimations = () => {
      const animations = animatedValues.map((val, index) =>
        createAnimation(val, (duration / numberOfWaves) * index)
      );

      // Run animations in parallel and loop them
      Animated.loop(
        Animated.parallel(animations)
      ).start();
    };

    startAnimations();

    // Cleanup animations on unmount
    return () => {
      animatedValues.forEach(val => val.stopAnimation());
    };
  }, [duration, numberOfWaves]);

  // Calculate the base size for the circles. All circles will start with this base size
  // and then be scaled up. We want maxRadius to be the effective final radius.
  const baseCircleDiameter = initialRadius * 2; // Start with diameter based on initialRadius

  return (
    <View style={styles.container}>
      {animatedValues.map((animatedValue, index) => {
        const scale = animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [1, maxRadius / initialRadius], // Scale from 1 (base size) to maxRadius / initialRadius
        });

        const opacity = animatedValue.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [1, 0.5, 0],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.waveCircle,
              {
                // Set initial size of the circle which will then be scaled
                width: baseCircleDiameter,
                height: baseCircleDiameter,
                borderRadius: baseCircleDiameter / 2, // Half of diameter for a perfect circle
                opacity: opacity,
                transform: [{ scale: scale }], // Apply scale transformation here
                borderColor: color, // Use prop for border color
                borderWidth: borderWidth, // Use prop for border width
                backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${fillOpacity})`, // Convert hex to rgba for fill
              },
            ]}
          />
        );
      })}
      {/* Optional: Add a central point to represent the user */}
      <View style={[styles.centerDot, { backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  waveCircle: {
    position: 'absolute',
  },
  centerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    zIndex: 1,
  },
});

export default WaveEmitter;