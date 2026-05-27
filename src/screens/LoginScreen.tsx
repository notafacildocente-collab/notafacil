import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert, Image,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://notafacil-backend-539h.onrender.com';

export default function LoginScreen({ onLogin, navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [colegio, setColegio] = useState<{ nombre: string; logoUrl: string | null }>({
    nombre: 'NotaFacil',
    logoUrl: null,
  });

  useEffect(() => {
    cargarConfig();
  }, []);

  const cargarConfig = async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_URL}/api/auth/config`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        setColegio(data);
      }
    } catch (error) {
      console.log('Config no disponible, usando valores por defecto');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Error', data.message || 'Credenciales incorrectas');
        return;
      }

      await SecureStore.setItemAsync('accessToken', data.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      await SecureStore.setItemAsync('usuarioId', data.usuarioId);
      await SecureStore.setItemAsync('rol', data.rol);
      await SecureStore.setItemAsync('nombre', data.nombre);

      if (onLogin) onLogin();
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        {colegio.logoUrl ? (
          <Image
            source={{ uri: colegio.logoUrl }}
            style={styles.logoImagen}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.logoCircle}>
            <Text style={styles.logoTextoFallback}>NF</Text>
          </View>
        )}
        <Text style={styles.schoolName}>{colegio.nombre}</Text>
        <Text style={styles.appName}>NotaFacil Docente</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Iniciar Sesion</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electronico"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Contrasena"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Ingresar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recuperarBtn}
          onPress={() => navigation && navigation.navigate('RecuperarPassword')}
        >
          <Text style={styles.recuperarTexto}>Olvide mi contrasena</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Mocoa, Putumayo - Colombia</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a6b', justifyContent: 'center', alignItems: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoImagen: { width: 100, height: 100, borderRadius: 50, marginBottom: 12, borderWidth: 4, borderColor: '#f59e0b' },
  logoCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 4, borderColor: '#f59e0b' },
  logoTextoFallback: { fontSize: 32, fontWeight: 'bold', color: '#1a3a6b' },
  schoolName: { fontSize: 15, color: '#cbd5e1', textAlign: 'center', marginBottom: 4, fontWeight: '600' },
  appName: { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 8 },
  title: { fontSize: 20, fontWeight: '600', color: '#1a3a6b', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 14, color: '#1f2937', backgroundColor: '#f9fafb' },
  button: { backgroundColor: '#1a3a6b', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  recuperarBtn: { alignItems: 'center', marginTop: 16 },
  recuperarTexto: { color: '#1a3a6b', fontSize: 13, fontWeight: '600' },
  footer: { marginTop: 24, color: '#94a3b8', fontSize: 12 },
});
