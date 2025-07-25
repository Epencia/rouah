import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const MultiLineChart = () => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;

  // Données pour les trois lignes avec 12 points pour les mois
  const line1Data = [
    { value: 860, label: 'Jan' },
    { value: 1000, label: 'Fév' },
    { value: 1140, label: 'Mar' },
    { value: 1060, label: 'Avr' },
    { value: 1060, label: 'Mai' },
    { value: 1070, label: 'Juin' },
    { value: 1110, label: 'Juil' },
    { value: 1330, label: 'Août' },
    { value: 2210, label: 'Sep' },
    { value: 7830, label: 'Oct' },
    { value: 2478, label: 'Nov' },
    { value: 2000, label: 'Déc' },
  ];

  const line2Data = [
    { value: 1600, label: 'Jan' },
    { value: 1650, label: 'Fév' },
    { value: 1700, label: 'Mar' },
    { value: 1700, label: 'Avr' },
    { value: 1900, label: 'Mai' },
    { value: 2000, label: 'Juin' },
    { value: 2700, label: 'Juil' },
    { value: 4000, label: 'Août' },
    { value: 5000, label: 'Sep' },
    { value: 6000, label: 'Oct' },
    { value: 7000, label: 'Nov' },
    { value: 6500, label: 'Déc' },
  ];

  const line3Data = [
    { value: 300, label: 'Jan' },
    { value: 500, label: 'Fév' },
    { value: 700, label: 'Mar' },
    { value: 2000, label: 'Avr' },
    { value: 5000, label: 'Mai' },
    { value: 6000, label: 'Juin' },
    { value: 4000, label: 'Juil' },
    { value: 1000, label: 'Août' },
    { value: 200, label: 'Sep' },
    { value: 100, label: 'Oct' },
    { value: 150, label: 'Nov' },
    { value: 100, label: 'Déc' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Graphique Multi-Lignes</Text>
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          width={chartWidth}
          height={300}
          data={line1Data}
          data2={line2Data}
          data3={line3Data}
          color1="red"
          color2="green"
          color3="blue"
          dataPointsColor1="red"
          dataPointsColor2="green"
          dataPointsColor3="blue"
          dataPointsRadius={6}
          textColor1="red"
          textColor2="green"
          textColor3="blue"
          textFontSize={12}
          textShiftY={-10}
          textShiftX={-5}
          noOfSections={5}
          yAxisThickness={1}
          xAxisThickness={1}
          yAxisTextStyle={{ color: '#666', fontSize: 12 }}
          xAxisLabelTextStyle={{ color: '#666', fontSize: 12, textAlign: 'center' }}
          yAxisLabelWidth={50}
          maxValue={8000}
          stepValue={1600}
          showVerticalLines
          verticalLinesColor="rgba(0,0,0,0.1)"
          rulesColor="rgba(0,0,0,0.1)"
          initialSpacing={30}
          spacing={30}
          curved
          isAnimated
          animationDuration={800}
          showReferenceLine1
          referenceLine1Position={5000}
          referenceLine1Config={{
            color: 'gray',
            dashWidth: 2,
            dashGap: 3,
          }}
          pointerConfig={{
            pointerStripHeight: 200,
            pointerStripColor: 'lightgray',
            pointerStripWidth: 2,
            pointerColor: 'lightgray',
            radius: 6,
            pointerLabelWidth: 100,
            pointerLabelHeight: 90,
            activatePointersOnLongPress: true,
            autoAdjustPointerLabelPosition: true,
          }}
        />
      </View>

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'red' }]} />
          <Text style={styles.legendText}>Dataset 1</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'green' }]} />
          <Text style={styles.legendText}>Dataset 2</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'blue' }]} />
          <Text style={styles.legendText}>Dataset 3</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 15,
    height: 15,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#333',
  },
});

export default MultiLineChart;