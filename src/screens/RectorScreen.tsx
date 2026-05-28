import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Image, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    Alert.alert('Cerrar sesión', '¿Está seguro que desea salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => cerrarSesionGlobal() },
    ]);
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
      if (resLogo.ok) {
        const logoData = await resLogo.json();
        setLogoActual(logoData.logoUrl);
      }
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
              const res = await apiFetch(`/api/rector/periodos/${periodo.id}/abrir`, { method: 'PUT' });
              if (res.ok) {
                Alert.alert('Éxito', `Período ${periodo.numero} abierto correctamente`);
                cargarDatos();
              } else {
                const err = await res.json().catch(() => ({}));
                Alert.alert('Error', err.message || 'No se pudo abrir el período');
              }
            } catch (error: any) {
              if (error.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo conectar al servidor');
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
              const res = await apiFetch(`/api/rector/periodos/${periodo.id}/cerrar`, { method: 'PUT' });
              if (res.ok) {
                Alert.alert('Éxito', `Período ${periodo.numero} cerrado correctamente`);
                cargarDatos();
              } else {
                Alert.alert('Error', 'No se pudo cerrar el período');
              }
            } catch (error: any) {
              if (error.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo conectar al servidor');
            } finally {
              setAccionando(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando panel rector...</Text>
      </View>
    );
  }

  const periodoActivoNum = resumen?.periodoActivo?.replace(/\D/g, '') || '—';

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitulo}>Panel Rector</Text>
        <TouchableOpacity style={styles.botonSalir} onPress={cerrarSesion}>
          <Text style={styles.botonSalirTexto}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* ── Estadísticas ──────────────────────────────────────────────────── */}
        {resumen && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{resumen.totalProfesores}</Text>
              <Text style={styles.statLabel}>Profesores</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNum}>{resumen.totalCursos}</Text>
              <Text style={styles.statLabel}>Cursos</Text>
            </View>
            <View style={[styles.statCard, styles.statCardActivo]}>
              <Text style={styles.statNumActivo}>Período{'\n'}Activo: {periodoActivoNum}</Text>
              <Text style={styles.statLabelActivo}>Período Activo</Text>
            </View>
          </View>
        )}

        {/* ── Configuración de Institución ──────────────────────────────────── */}
        <Text style={styles.seccionTitulo}>Configuración de Institución</Text>
        <View style={styles.card}>
          {logoActual ? (
            <Image source={{ uri: logoActual }} style={styles.logoImg} resizeMode="contain" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Ionicons name="school-outline" size={56} color="#CBD5E1" />
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
              : <Text style={styles.logoBtnText}>📷 Actualizar Logo</Text>
            }
          </TouchableOpacity>
          <Text style={styles.logoHint}>El logo aparecerá en los boletines individuales PDF</Text>
        </View>

        {/* ── Gestión de Períodos ───────────────────────────────────────────── */}
        <Text style={styles.seccionTitulo}>Gestión de Períodos</Text>
        {periodos.map((periodo) => (
          <View key={periodo.id} style={styles.card}>
            <View style={styles.periodoTop}>
              <View>
                <Text style={styles.periodoNombre}>Período {periodo.numero}</Text>
                <Text style={styles.periodoFechas}>
                  {periodo.fechaInicio?.slice(0, 10)} → {periodo.fechaFin?.slice(0, 10)}
                </Text>
              </View>
              <View style={[styles.badge, periodo.cerrado ? styles.badgeCerrado : styles.badgeAbierto]}>
                <Text style={styles.badgeText}>{periodo.cerrado ? 'Cerrado' : 'Abierto'}</Text>
              </View>
            </View>

            {periodo.cerrado ? (
              <TouchableOpacity
                style={[styles.periodoBtn, styles.periodoBtnAbrir]}
                onPress={() => handleAbrirPeriodo(periodo)}
                disabled={accionando}
              >
                <Text style={styles.periodoBtnText}>Abrir Período</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.periodoBtn, styles.periodoBtnCerrar]}
                onPress={() => handleCerrarPeriodo(periodo)}
                disabled={accionando}
              >
                <Text style={styles.periodoBtnText}>Cerrar Período</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* ── Directorio de Docentes ────────────────────────────────────────── */}
        <Text style={styles.seccionTitulo}>Directorio de Docentes</Text>
        {profesores.map((profesor) => (
          <TouchableOpacity
            key={profesor.id}
            style={[styles.card, styles.profesorCard]}
            onPress={() => navigation.navigate('AsignacionesProfesor', { profesor })}
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
            <View style={styles.verPerfilBtn}>
              <Text style={styles.verPerfilTexto}>Ver Perfil</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: { flex: 1, backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, color: '#94A3B8', fontSize: 15 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitulo: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  botonSalir: {
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  botonSalirTexto: { color: '#F87171', fontWeight: '700', fontSize: 13 },

  container: { flex: 1, padding: 16 },

  // ── Estadísticas ──────────────────────────────────────────────────────────
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14,
    padding: 14, alignItems: 'center',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  statCardActivo: { backgroundColor: '#1E3A5F' },
  statNum: { fontSize: 28, fontWeight: '800', color: '#2563EB' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '600' },
  statNumActivo: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', lineHeight: 20 },
  statLabelActivo: { fontSize: 11, color: '#93C5FD', marginTop: 4, fontWeight: '600' },

  // ── Sección título ────────────────────────────────────────────────────────
  seccionTitulo: {
    fontSize: 18, fontWeight: '800', color: '#0F172A',
    marginBottom: 12, marginTop: 4,
  },

  // ── Card base ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },

  // ── Logo ──────────────────────────────────────────────────────────────────
  logoImg: { width: '100%', height: 180, marginBottom: 16 },
  logoPlaceholder: { alignItems: 'center', paddingVertical: 28, marginBottom: 12 },
  logoPlaceholderText: { fontSize: 13, color: '#94A3B8', marginTop: 8 },
  logoBtn: {
    backgroundColor: '#1E3A5F', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center', marginBottom: 10,
  },
  logoBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  logoHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },

  // ── Período ───────────────────────────────────────────────────────────────
  periodoTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  periodoNombre: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  periodoFechas: { fontSize: 13, color: '#64748B' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  badgeAbierto: { backgroundColor: '#22C55E' },
  badgeCerrado: { backgroundColor: '#EF4444' },
  badgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  periodoBtn: {
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  periodoBtnAbrir: { backgroundColor: '#16A34A' },
  periodoBtnCerrar: { backgroundColor: '#DC2626' },
  periodoBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // ── Profesor ──────────────────────────────────────────────────────────────
  profesorCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profesorAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center',
  },
  profesorAvatarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 18 },
  profesorInfo: { flex: 1 },
  profesorNombre: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  profesorEmail: { fontSize: 12, color: '#64748B', marginTop: 2 },
  verPerfilBtn: {
    borderWidth: 1.5, borderColor: '#CBD5E1',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  verPerfilTexto: { color: '#475569', fontWeight: '600', fontSize: 13 },
});
