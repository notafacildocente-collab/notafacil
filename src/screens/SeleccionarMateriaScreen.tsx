import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../services/api';
import { cerrarSesionGlobal } from '../services/auth';

interface Materia {
  id: string;
  nombre: string;
  codigo: string;
  asignacionId: string;
}

function iconoMateria(nombre: string): keyof typeof Ionicons.glyphMap {
  const n = nombre.toLowerCase();
  if (n.includes('tecnolog') || n.includes('inform') || n.includes('sistem')) return 'settings-outline';
  if (n.includes('mat') || n.includes('álgebra') || n.includes('algebra') || n.includes('cálculo')) return 'calculator-outline';
  if (n.includes('lengua') || n.includes('liter') || n.includes('español') || n.includes('lectura')) return 'book-outline';
  if (n.includes('ciencia') || n.includes('biolog') || n.includes('quím') || n.includes('física')) return 'flask-outline';
  if (n.includes('social') || n.includes('histor') || n.includes('geograf')) return 'earth-outline';
  if (n.includes('arte') || n.includes('música') || n.includes('dibujo')) return 'color-palette-outline';
  if (n.includes('educa') || n.includes('deport')) return 'fitness-outline';
  if (n.includes('inglés') || n.includes('ingles') || n.includes('idioma')) return 'language-outline';
  if (n.includes('ética') || n.includes('etica') || n.includes('religion') || n.includes('religión')) return 'heart-outline';
  return 'school-outline';
}

export default function SeleccionarMateriaScreen({ navigation }: any) {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [periodoInfo, setPeriodoInfo] = useState<{ id: string; numero: number } | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const rolRef = useRef<string | null>(null);

  useEffect(() => {
    const iniciar = async () => {
      const rol = await SecureStore.getItemAsync('rol');
      rolRef.current = rol;
      if (rol === 'RECTOR') { navigation.replace('Rector'); return; }
      if (rol !== 'PROFESOR') { Alert.alert('Acceso restringido', 'Esta aplicación es exclusiva para profesores.'); return; }
      await Promise.all([cargarMaterias(), cargarFotoPerfil()]);
    };
    iniciar();
    const unsubscribe = navigation.addListener('focus', () => {
      if (rolRef.current === 'PROFESOR') cargarMaterias();
    });
    return unsubscribe;
  }, [navigation]);

  const cargarFotoPerfil = async () => {
    try {
      const res = await apiFetch('/api/auth/perfil/foto');
      if (res.ok) {
        const data = await res.json();
        if (data.fotoUrl) setFotoUrl(data.fotoUrl);
      }
    } catch {
      // silencioso
    }
  };

  const cargarMaterias = async () => {
    try {
      setLoading(true);
      const nombreGuardado = await SecureStore.getItemAsync('nombre');
      if (nombreGuardado) setNombre(nombreGuardado);

      const response = await apiFetch('/api/notas/mis-materias');
      if (response.ok) {
        const data = await response.json();
        setMaterias(data);
        if (data.length > 0) {
          const resPer = await apiFetch('/api/notas/periodos');
          if (resPer.ok) {
            const periodos = await resPer.json();
            if (periodos.length > 0) {
              const periodo = periodos.find((p: any) => !p.cerrado) || periodos[periodos.length - 1];
              setPeriodoInfo({ id: periodo.id, numero: periodo.numero });
              const resAsig = await apiFetch(`/api/notas/asignacion?materiaId=${data[0].id}&periodoId=${periodo.id}`);
              if (resAsig.ok) { const asig = await resAsig.json(); setCursoId(asig.cursoId); }
            }
          }
        }
      } else {
        Alert.alert('Error', 'No se pudieron cargar las materias');
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo conectar al servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]?.base64) return;

    const asset = result.assets[0];
    const fotoBase64 = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;

    try {
      setSubiendoFoto(true);
      const res = await apiFetch('/api/auth/perfil/foto', {
        method: 'PUT',
        body: JSON.stringify({ fotoBase64 }),
      });
      if (res.ok) {
        setFotoUrl(fotoBase64);
      } else {
        Alert.alert('Error', 'No se pudo guardar la foto');
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo conectar al servidor');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Está seguro que desea salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => cerrarSesionGlobal() },
    ]);
  };

  const primerNombre = nombre ? nombre.split(' ')[0] : 'Profesora';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando materias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* Avatar — toca para cambiar foto */}
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handleCambiarFoto}
            disabled={subiendoFoto}
            activeOpacity={0.8}
          >
            {subiendoFoto ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : fotoUrl ? (
              <Image source={{ uri: fotoUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={30} color="#FFFFFF" />
            )}
            {/* Ícono de cámara pequeño */}
            {!subiendoFoto && (
              <View style={styles.camaraIcon}>
                <Ionicons name="camera" size={10} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerBienvenida}>Bienvenida, {primerNombre}</Text>
          </View>

          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Horario')}>
              <Text style={styles.headerBtnText}>Horario</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={cerrarSesion}>
              <Text style={styles.headerBtnText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{materias.length} materias</Text>
          </View>
          {periodoInfo && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>P{periodoInfo.numero} período activo</Text>
            </View>
          )}
        </View>
      </View>

      {/* LISTA */}
      {materias.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Sin materias asignadas</Text>
          <Text style={styles.emptyDesc}>Contacta al rector para que te asigne materias.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={cargarMaterias}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={materias}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() =>
            cursoId && periodoInfo ? (
              <TouchableOpacity
                style={styles.botonBoletin}
                onPress={() => navigation.navigate('Boletin', {
                  cursoId,
                  periodoId: periodoInfo.id,
                  periodoNumero: periodoInfo.numero,
                })}
              >
                <Text style={styles.botonBoletinTexto}>Ver Boletín del Curso</Text>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name={iconoMateria(item.nombre)} size={22} color="#1E3A5F" />
                </View>
                <Text style={styles.cardNombre}>{item.nombre}</Text>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnAzul]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', {
                    materiaId: item.id, materiaNombre: item.nombre, modo: 'calificar',
                  })}
                >
                  <Text style={styles.btnTextBlanco}>Calificar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnAzulClaro]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', {
                    materiaId: item.id, materiaNombre: item.nombre, modo: 'asistencia',
                  })}
                >
                  <Text style={styles.btnTextBlanco}>Asistencia</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGris]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', {
                    materiaId: item.id, materiaNombre: item.nombre, modo: 'planilla',
                  })}
                >
                  <Text style={styles.btnTextGris}>Planilla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnRosa]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', {
                    materiaId: item.id, materiaNombre: item.nombre, modo: 'calificarIA',
                  })}
                >
                  <Text style={styles.btnTextBlanco}>Calif. con IA</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.btnRiesgo}
                onPress={() => navigation.navigate('SeleccionarPeriodo', {
                  materiaId: item.id, materiaNombre: item.nombre, modo: 'riesgoIA',
                })}
              >
                <Text style={styles.btnRiesgoText}>Análisis de Riesgo IA</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: { flex: 1, backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, color: '#94A3B8', fontSize: 15 },

  header: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },

  avatarWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  camaraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#2563EB',
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#1E3A5F',
  },

  headerCenter: { flex: 1 },
  headerBienvenida: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.2 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  headerBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  chipText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },

  lista: { padding: 16, paddingBottom: 32 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: '#1E3A5F', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, padding: 16,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
  },
  cardNombre: { fontSize: 17, fontWeight: '700', color: '#0F172A', flex: 1 },

  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  btnAzul:      { backgroundColor: '#2563EB' },
  btnAzulClaro: { backgroundColor: '#0EA5E9' },
  btnGris:      { backgroundColor: '#E2E8F0' },
  btnRosa:      { backgroundColor: '#F43F5E' },

  btnTextBlanco: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  btnTextGris:   { color: '#475569', fontWeight: '700', fontSize: 13 },

  btnRiesgo: {
    paddingVertical: 11, borderRadius: 10,
    backgroundColor: '#7C3AED', alignItems: 'center',
  },
  btnRiesgoText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  botonBoletin: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 4,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  botonBoletinTexto: { color: '#0F172A', fontWeight: '700', fontSize: 15 },
});
