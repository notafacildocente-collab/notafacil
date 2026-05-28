import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://notafacil-backend-539h.onrender.com';

export default function RecuperarPasswordScreen() {
  const navigation = useNavigation();
  const [paso, setPaso] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [verPass, setVerPass] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);

  const handleSolicitarCodigo = async () => {
    if (!email.trim()) {
      Alert.alert('Campo requerido', 'Ingresa tu correo electrónico');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/auth/recuperar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.message || 'No se pudo enviar el código');
        return;
      }
      Alert.alert(
        'Código enviado',
        'Si el correo está registrado, recibirás un código de 6 dígitos en tu bandeja de entrada.',
      );
      setPaso('codigo');
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!codigo || !passwordNueva || !confirmar) {
      Alert.alert('Campos requeridos', 'Completa todos los campos');
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
        Alert.alert('¡Contraseña actualizada!', 'Ya puedes iniciar sesión con tu nueva contraseña.', [
          { text: 'Ingresar', onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json().catch(() => ({}));
        Alert.alert('Error', err.message || 'Código incorrecto o expirado');
      }
    } catch {
      Alert.alert('Error de conexión', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      {/* Burbuja decorativa */}
      <View style={[styles.burbuja, { width: 200, height: 200, top: -60, right: -60, opacity: 0.1 }]} />
      <View style={[styles.burbuja, { width: 140, height: 140, bottom: 60, left: -40, opacity: 0.08 }]} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Encabezado */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
            <Text style={styles.backTexto}>Volver</Text>
          </TouchableOpacity>

          {/* Card */}
          <View style={styles.card}>
            {/* Ícono */}
            <View style={styles.iconoWrap}>
              <Ionicons name="lock-open-outline" size={32} color="#FFFFFF" />
            </View>

            <Text style={styles.titulo}>Recuperar contraseña</Text>

            {paso === 'email' ? (
              <>
                <Text style={styles.descripcion}>
                  Ingresa tu correo y te enviaremos un código de verificación de 6 dígitos.
                </Text>

                <View style={styles.inputWrap}>
                  <Ionicons name="mail-outline" size={17} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="tu.correo@colegio.edu.co"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.boton, loading && styles.botonDisabled]}
                  onPress={handleSolicitarCodigo}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.botonTexto}>Enviar código</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.descripcion}>
                  Ingresa el código enviado a{'\n'}
                  <Text style={styles.emailResaltado}>{email}</Text>
                </Text>

                {/* Código */}
                <View style={styles.inputWrap}>
                  <Ionicons name="keypad-outline" size={17} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={codigo}
                    onChangeText={setCodigo}
                    placeholder="Código de 6 dígitos"
                    placeholderTextColor="#94A3B8"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>

                {/* Nueva contraseña */}
                <View style={styles.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={17} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={passwordNueva}
                    onChangeText={setPasswordNueva}
                    placeholder="Nueva contraseña"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!verPass}
                  />
                  <TouchableOpacity onPress={() => setVerPass(!verPass)} style={styles.eyeBtn}>
                    <Ionicons name={verPass ? 'eye-outline' : 'eye-off-outline'} size={17} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Confirmar */}
                <View style={styles.inputWrap}>
                  <Ionicons name="checkmark-circle-outline" size={17} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={confirmar}
                    onChangeText={setConfirmar}
                    placeholder="Confirmar contraseña"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!verConfirmar}
                  />
                  <TouchableOpacity onPress={() => setVerConfirmar(!verConfirmar)} style={styles.eyeBtn}>
                    <Ionicons name={verConfirmar ? 'eye-outline' : 'eye-off-outline'} size={17} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.boton, loading && styles.botonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.botonTexto}>Actualizar contraseña</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={styles.volverBtn} onPress={() => setPaso('email')}>
                  <Ionicons name="arrow-back-outline" size={14} color="#2563EB" />
                  <Text style={styles.volverTexto}> Cambiar correo</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.footer}>El código expira en 15 minutos</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: '#1E3A5F' },
  burbuja: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 6,
  },
  backTexto: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },

  iconoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },

  titulo: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emailResaltado: {
    color: '#2563EB',
    fontWeight: '700',
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 12,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 13,
  },
  eyeBtn: { paddingLeft: 8, paddingVertical: 4 },

  boton: {
    backgroundColor: '#2563EB',
    borderRadius: 50,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  botonDisabled: { opacity: 0.6 },
  botonTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  volverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  volverTexto: { color: '#2563EB', fontWeight: '600', fontSize: 13 },

  footer: {
    marginTop: 20,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
  },
});
