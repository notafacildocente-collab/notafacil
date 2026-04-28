import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiFetch } from '../services/api';

export default function CambiarPasswordScreen() {
  const navigation = useNavigation();
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCambiar = async () => {
    if (!passwordActual || !passwordNueva || !confirmar) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (passwordNueva !== confirmar) {
      Alert.alert('Error', 'Las contraseñas nuevas no coinciden');
      return;
    }
    if (passwordNueva.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch('/api/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify({ passwordActual, passwordNueva }),
      });
      if (res.ok) {
        Alert.alert('Éxito', 'Contraseña actualizada correctamente', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.message || 'No se pudo actualizar la contraseña');
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudo conectar al servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Cambiar Contraseña</Text>

      <Text style={styles.label}>Contraseña actual</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={passwordActual}
        onChangeText={setPasswordActual}
        placeholder="Contraseña actual"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>Contraseña nueva</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={passwordNueva}
        onChangeText={setPasswordNueva}
        placeholder="Mínimo 8 caracteres"
        placeholderTextColor="#9ca3af"
      />

      <Text style={styles.label}>Confirmar contraseña nueva</Text>
      <TextInput
        style={styles.input}
        secureTextEntry
        value={confirmar}
        onChangeText={setConfirmar}
        placeholder="Repite la contraseña nueva"
        placeholderTextColor="#9ca3af"
      />

      <TouchableOpacity
        style={[styles.boton, loading && styles.botonDisabled]}
        onPress={handleCambiar}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botonTexto}>Actualizar Contraseña</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 24 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#1a3a6b', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 8, padding: 14, fontSize: 15, color: '#111827',
  },
  boton: {
    backgroundColor: '#1a3a6b', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 32,
  },
  botonDisabled: { opacity: 0.6 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
});