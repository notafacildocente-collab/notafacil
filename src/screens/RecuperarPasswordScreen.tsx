import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'https://notafacil-backend-539h.onrender.com';

export default function RecuperarPasswordScreen() {
  const navigation = useNavigation();
  const [paso, setPaso] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSolicitarCodigo = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresa tu email');
      return;
    }
    try {
      setLoading(true);
      await fetch(`${API_URL}/api/auth/recuperar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      Alert.alert('Código enviado', 'Si el email está registrado, recibirás un código de 6 dígitos.');
      setPaso('codigo');
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!codigo || !passwordNueva || !confirmar) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }
    if (passwordNueva !== confirmar) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (passwordNueva.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), codigo, passwordNueva }),
      });
      if (res.ok) {
        Alert.alert('Éxito', 'Contraseña actualizada. Ya puedes iniciar sesión.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.message || 'Código incorrecto o expirado');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Recuperar Contraseña</Text>

      {paso === 'email' ? (
        <>
          <Text style={styles.descripcion}>
            Ingresa tu email y te enviaremos un código de 6 dígitos.
          </Text>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="tu.correo@pioxii.edu.co"
            placeholderTextColor="#9ca3af"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.boton, loading && styles.botonDisabled]}
            onPress={handleSolicitarCodigo}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Enviar Código</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.descripcion}>
            Ingresa el código que recibiste en {email}
          </Text>
          <Text style={styles.label}>Código de 6 dígitos</Text>
          <TextInput
            style={styles.input}
            value={codigo}
            onChangeText={setCodigo}
            placeholder="123456"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Text style={styles.label}>Contraseña nueva</Text>
          <TextInput
            style={styles.input}
            value={passwordNueva}
            onChangeText={setPasswordNueva}
            placeholder="Mínimo 8 caracteres"
            placeholderTextColor="#9ca3af"
            secureTextEntry
          />
          <Text style={styles.label}>Confirmar contraseña</Text>
          <TextInput
            style={styles.input}
            value={confirmar}
            onChangeText={setConfirmar}
            placeholder="Repite la contraseña"
            placeholderTextColor="#9ca3af"
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.boton, loading && styles.botonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Actualizar Contraseña</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.volverBtn} onPress={() => setPaso('email')}>
            <Text style={styles.volverTexto}>← Cambiar email</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.cancelarBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelarTexto}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 24 },
  titulo: { fontSize: 22, fontWeight: '700', color: '#1a3a6b', marginBottom: 12 },
  descripcion: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 8, padding: 14, fontSize: 15, color: '#111827',
  },
  boton: {
    backgroundColor: '#1a3a6b', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  botonDisabled: { opacity: 0.6 },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  volverBtn: { alignItems: 'center', marginTop: 16 },
  volverTexto: { color: '#1a3a6b', fontWeight: '600', fontSize: 14 },
  cancelarBtn: { alignItems: 'center', marginTop: 20 },
  cancelarTexto: { color: '#6b7280', fontSize: 14 },
});
