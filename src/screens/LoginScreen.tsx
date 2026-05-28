import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert, Image,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://notafacil-backend-539h.onrender.com';

export default function LoginScreen({ onLogin, navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [colegio, setColegio] = useState<{ nombre: string; logoUrl: string | null }>({
    nombre: 'NotaFácil',
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
    } catch {
      // usa valores por defecto
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Por favor completa todos los campos');
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = Array.isArray(data.message) ? data.message[0] : (data.message || 'Credenciales incorrectas');
        Alert.alert('Error de acceso', msg);
        return;
      }

      await SecureStore.setItemAsync('accessToken', data.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      await SecureStore.setItemAsync('usuarioId', data.usuarioId);
      await SecureStore.setItemAsync('rol', data.rol);
      await SecureStore.setItemAsync('nombre', data.nombre);

      if (onLogin) onLogin();
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      {/* Burbujas decorativas */}
      <View style={[styles.burbuja, { width: 280, height: 280, top: -80, left: -80, opacity: 0.12 }]} />
      <View style={[styles.burbuja, { width: 200, height: 200, top: 60, right: -60, opacity: 0.08 }]} />
      <View style={[styles.burbuja, { width: 160, height: 160, bottom: 80, left: -40, opacity: 0.1 }]} />
      <View style={[styles.burbuja, { width: 120, height: 120, bottom: 160, right: 30, opacity: 0.07 }]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Card */}
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoWrap}>
              {colegio.logoUrl ? (
                <Image
                  source={{ uri: colegio.logoUrl }}
                  style={styles.logoImagen}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.logoCircle}>
                  <Ionicons name="school" size={38} color="#FFFFFF" />
                </View>
              )}
            </View>

            <Text style={styles.schoolName}>{colegio.nombre}</Text>
            <Text style={styles.appName}>NotaFácil Docente</Text>

            <View style={styles.divider} />

            {/* Email */}
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                editable={!loading}
              />
            </View>

            {/* Password */}
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Contraseña"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!verPassword}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setVerPassword(!verPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={verPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>

            {/* Botón ingresar */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Ingresar</Text>
              )}
            </TouchableOpacity>

            {/* Olvidé contraseña */}
            <TouchableOpacity
              style={styles.recuperarBtn}
              onPress={() => navigation && navigation.navigate('RecuperarPassword')}
            >
              <Text style={styles.recuperarTexto}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>Mocoa, Putumayo · Colombia</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: {
    flex: 1,
    backgroundColor: '#1E3A5F',
  },
  burbuja: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  // Card
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },

  // Logo
  logoWrap: {
    marginBottom: 14,
  },
  logoImagen: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },

  schoolName: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },

  // Inputs
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 13,
  },
  eyeBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },

  // Button
  button: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.4,
  },

  // Recuperar
  recuperarBtn: {
    marginTop: 18,
    paddingVertical: 4,
  },
  recuperarTexto: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },

  // Footer
  footer: {
    marginTop: 28,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
