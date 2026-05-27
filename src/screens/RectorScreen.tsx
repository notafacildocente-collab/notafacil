import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../services/api';
import { cerrarSesionGlobal } from '../services/auth';

interface Periodo {
  id: string;
  numero: number;
  cerrado: boolean;
  fechaInicio: string;
  fechaFin: string;
}

interface Profesor {
  id: string;
  nombre: string;
  email: string;
}

interface Resumen {
  totalProfesores: number;
  totalCursos: number;
  periodoActivo: string;
}

export default function RectorScreen({ navigation }: any) {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [accionando, setAccionando] = useState(false);
  const [logoActual, setLogoActual] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Está seguro que desea salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => cerrarSesionGlobal(),
        },
      ],
    );
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resPeriodos, resProfesores, resResumen, resLogo] = await Promise.all([
        apiFetch('/api/rector/periodos'),
        apiFetch('/api/rector/profesores'),
        apiFetch('/api/rector/reportes/resumen'),
        apiFetch('/api/rector/logo'),
      ]);

      if (resPeriodos.ok) setPeriodos(await resPeriodos.json());
      if (resProfesores.ok) setProfesores(await resProfesores.json());
      if (resResumen.ok) setResumen(await resResumen.json());
      if (resLogo.ok) { const logoData = await resLogo.json(); setLogoActual(logoData.logoUrl); }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudieron cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubirLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería de fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    const logoBase64 = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
    try {
      setLogoLoading(true);
      const res = await apiFetch('/api/rector/logo', {
        method: 'PUT',
        body: JSON.stringify({ logoBase64 }),
      });
      if (res.ok) {
        setLogoActual(logoBase64);
        Alert.alert('✅ Logo actualizado', 'El logo del colegio se actualizó correctamente.');
      } else {
        Alert.alert('Error', 'No se pudo actualizar el logo');
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo conectar al servidor');
    } finally {
      setLogoLoading(false);
    }
  };

  const handleAbrirPeriodo = async (periodo: Periodo) => {
    Alert.alert(
      'Abrir Período',
      `¿Abrir el Período ${periodo.numero}? Solo puede haber un período abierto a la vez.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Abrir',
          onPress: async () => {
            try {
              setAccionando(true);
              const res = await apiFetch(`/api/rector/periodos/${periodo.id}/abrir`, {
                method: 'PUT',
              });
              if (res.ok) {
                Alert.alert('Éxito', `Período ${periodo.numero} abierto correctamente`);
                cargarDatos();
              } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Error', err.message || 'No se pudo abrir el período');
              }
            } catch (error: any) {
              if (error.message !== 'Sesión vencida') {
                Alert.alert('Error', 'No se pudo conectar al servidor');
              }
            } finally {
              setAccionando(false);
            }
          },
        },
      ],
    );
  };

  const handleCerrarPeriodo = async (periodo: Periodo) => {
    Alert.alert(
      'Cerrar Período',
      `¿Cerrar el Período ${periodo.numero}? Los profesores no podrán ingresar más notas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar',
          style: 'destructive',
          onPress: async () => {
            try {
              setAccionando(true);
              const res = await apiFetch(`/api/rector/periodos/${periodo.id}/cerrar`, {
                method: 'PUT',
              });
              if (res.ok) {
                Alert.alert('Éxito', `Período ${periodo.numero} cerrado correctamente`);
                cargarDatos();
              } else {
                Alert.alert('Error', 'No se pudo cerrar el período');
              }
            } catch (error: any) {
              if (error.message !== 'Sesión vencida') {
                Alert.alert('Error', 'No se pudo conectar al servidor');
              }
            } finally {
              setAccionando(false);
            }
          },
        },
      ],
    );
  };

  const handleVerAsignaciones = (profesor: Profesor) => {
    navigation.navigate('AsignacionesProfesor', { profesor });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={styles.loadingText}>Cargando panel rector...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>

      {/* Header con salir */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitulo}>Panel Rector</Text>
        <TouchableOpacity style={styles.botonSalir} onPress={cerrarSesion}>
          <Text style={styles.botonSalirTexto}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      {resumen && (
        <View style={styles.resumenRow}>
          <View style={styles.resumenCard}>
            <Text style={styles.resumenNumero}>{resumen.totalProfesores}</Text>
            <Text style={styles.resumenLabel}>Profesores</Text>
          </View>
          <View style={styles.resumenCard}>
            <Text style={styles.resumenNumero}>{resumen.totalCursos}</Text>
            <Text style={styles.resumenLabel}>Cursos</Text>
          </View>
          <View style={[styles.resumenCard, { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' }]}>
            <Text style={[styles.resumenNumero, { color: '#FFFFFF', fontSize: 13 }]}>
              {resumen.periodoActivo}
            </Text>
            <Text style={[styles.resumenLabel, { color: '#93C5FD' }]}>Período Activo</Text>
          </View>
        </View>
      )}

      {/* Logo del colegio */}
      <Text style={styles.seccionTitulo}>Logo del Colegio</Text>
      <View style={styles.logoCard}>
        {logoActual ? (
          <Image source={{ uri: logoActual }} style={styles.logoPreview} resizeMode="contain" />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoPlaceholderIcon}>🏫</Text>
            <Text style={styles.logoPlaceholderText}>Sin logo</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.logoBtn, logoLoading && { opacity: 0.6 }]}
          onPress={handleSubirLogo}
          disabled={logoLoading}
        >
          {logoLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.logoBtnText}>📷 {logoActual ? 'Cambiar logo' : 'Subir logo'}</Text>
          }
        </TouchableOpacity>
        <Text style={styles.logoHint}>El logo aparecerá en los boletines individuales PDF</Text>
      </View>

      {/* Períodos */}
      <Text style={styles.seccionTitulo}>Períodos</Text>
      {periodos.map((periodo) => (
        <View key={periodo.id} style={styles.periodoCard}>
          <View style={styles.periodoInfo}>
            <Text style={styles.periodoNombre}>Período {periodo.numero}</Text>
            <View style={[
              styles.estadoBadge,
              { backgroundColor: periodo.cerrado ? '#ef4444' : '#10b981' }
            ]}>
              <Text style={styles.estadoBadgeText}>
                {periodo.cerrado ? 'Cerrado' : 'Abierto'}
              </Text>
            </View>
          </View>
          <Text style={styles.periodoFechas}>
            {periodo.fechaInicio?.slice(0, 10)} → {periodo.fechaFin?.slice(0, 10)}
          </Text>
          <View style={styles.periodoAcciones}>
            {periodo.cerrado ? (
              <TouchableOpacity
                style={[styles.accionBtn, styles.abrirBtn]}
                onPress={() => handleAbrirPeriodo(periodo)}
                disabled={accionando}
              >
                <Text style={styles.accionBtnText}>Abrir</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.accionBtn, styles.cerrarBtn]}
                onPress={() => handleCerrarPeriodo(periodo)}
                disabled={accionando}
              >
                <Text style={styles.accionBtnText}>Cerrar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      {/* Profesores */}
      <Text style={styles.seccionTitulo}>Profesores</Text>
      {profesores.map((profesor) => (
        <TouchableOpacity
          key={profesor.id}
          style={styles.profesorCard}
          onPress={() => handleVerAsignaciones(profesor)}
        >
          <View style={styles.profesorAvatar}>
            <Text style={styles.profesorAvatarText}>
              {profesor.nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profesorInfo}>
            <Text style={styles.profesorNombre}>{profesor.nombre}</Text>
            <Text style={styles.profesorEmail}>{profesor.email}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748B' },

  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  headerTitulo: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  botonSalir: {
    backgroundColor: 'rgba(220,38,38,0.1)', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
  },
  botonSalirTexto: { color: '#DC2626', fontWeight: '700', fontSize: 13 },

  resumenRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  resumenCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  resumenNumero: { fontSize: 24, fontWeight: '800', color: '#1E3A5F' },
  resumenLabel: { fontSize: 11, color: '#64748B', marginTop: 4, fontWeight: '600' },

  seccionTitulo: {
    fontSize: 12, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 10, marginTop: 8,
  },

  periodoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', elevation: 1,
  },
  periodoInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  periodoNombre: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  estadoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  estadoBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  periodoFechas: { fontSize: 12, color: '#94A3B8', marginBottom: 10 },
  periodoAcciones: { flexDirection: 'row', justifyContent: 'flex-end' },
  accionBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  abrirBtn: { backgroundColor: '#16A34A' },
  cerrarBtn: { backgroundColor: '#DC2626' },
  accionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  profesorCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0',
    elevation: 1, flexDirection: 'row', alignItems: 'center',
  },
  profesorAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  profesorAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  profesorInfo: { flex: 1 },
  profesorNombre: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  profesorEmail: { fontSize: 12, color: '#64748B', marginTop: 2 },
  arrow: { fontSize: 20, color: '#CBD5E1' },

  // Logo
  logoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
    marginBottom: 18, borderWidth: 1, borderColor: '#E2E8F0',
    elevation: 1, alignItems: 'center',
  },
  logoPreview: { width: 200, height: 120, marginBottom: 12 },
  logoPlaceholder: { alignItems: 'center', marginBottom: 12 },
  logoPlaceholderIcon: { fontSize: 36 },
  logoPlaceholderText: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  logoBtn: {
    backgroundColor: '#1E3A5F', paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 8, minWidth: 140, alignItems: 'center',
  },
  logoBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  logoHint: { fontSize: 11, color: '#94A3B8', marginTop: 8, textAlign: 'center' },
});