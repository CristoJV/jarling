import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApplication } from '@/presentation/contexts/application-context';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function SettingsScreen() {
  const router = useRouter();
  const application = useApplication();
  const [populating, setPopulating] = useState(false);

  async function populateSampleData() {
    setPopulating(true);
    try {
      const result = await application.samples.populate.execute();
      Alert.alert(
        result.populated ? 'Datos de ejemplo añadidos' : 'Los datos ya existen',
        result.populated
          ? 'Se han creado una cuenta, tres targets, asignaciones y dos gastos usando las categorías predeterminadas.'
          : 'El conjunto de ejemplo no se ha duplicado.',
        [
          { text: 'Cerrar', style: 'cancel' },
          { text: 'Ver Budget', onPress: () => router.replace('/budget') },
        ],
      );
    } catch (cause) {
      Alert.alert('No se pudieron añadir los datos', domainErrorMessage(cause));
    } finally {
      setPopulating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Volver"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>DESARROLLO</Text>
          <Text style={styles.heading}>Datos de ejemplo</Text>
          <Text style={styles.description}>
            Añade una cuenta con 2.000 €, asignaciones, dos gastos y tres
            targets sobre las categorías predeterminadas para probar Budget,
            progreso y overspending. No elimina tus datos, no crea grupos
            adicionales y no duplica el conjunto.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={populating}
            onPress={() => void populateSampleData()}
            style={[styles.populateButton, populating && styles.disabled]}
          >
            <Text style={styles.populateButtonText}>
              {populating ? 'Añadiendo…' : 'Popular con datos de ejemplo'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f5',
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 14,
    borderBottomColor: '#dfe3dc',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#294d36',
    fontSize: 36,
    lineHeight: 38,
  },
  title: {
    color: '#18201a',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 620,
    padding: 24,
    backgroundColor: '#ffffff',
    borderColor: '#e1e5df',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  eyebrow: {
    color: '#687268',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heading: {
    color: '#253028',
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    color: '#687268',
    fontSize: 15,
    lineHeight: 22,
  },
  populateButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#294d36',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  populateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
});
