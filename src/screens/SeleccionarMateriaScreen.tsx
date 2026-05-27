import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../services/api';
import { cerrarSesionGlobal } from '../services/auth';

interface Materia {
  id: string;
  nombre: string;
  codigo: string;
  asignacionId: string;
}

const COLORES_ACENTO = ['#1a3a6b', '#059669', '#7c3aed', '#D97757', '#dc2626', '#0891b2', '#d97706', '#be185d'];

export default function SeleccionarMateriaScreen({ navigation }: any) {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [periodoInfo, setPeriodoInfo] = useState<{ id: string; numero: number } | null>(null);
  const rolRef = useRef<string | null>(null);

  useEffect(() => {
    const iniciar = async () => {
      const rol = await SecureStore.getItemAsync('rol');
      rolRef.current = rol;
      if (rol === 'RECTOR') { navigation.replace('Rector'); return; }
      if (rol !== 'PROFESOR') { Alert.alert('Acceso restringido', 'Esta aplicación es exclusiva para profesores.'); return; }
      await cargarMaterias();
    };
    iniciar();
    const unsubscribe = navigation.addListener('focus', () => {
      if (rolRef.current === 'PROFESOR') cargarMaterias();
    });
    return unsubscribe;
  }, [navigation]);

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

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Está seguro que desea salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => cerrarSesionGlobal() },
    ]);
  };

  const iniciales = nombre
    ? nombre.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
    : 'P';

  if (loading && rolRef.current !== 'RECTOR' && rolRef.current !== 'ESTUDIANTE') {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0d2240" />
        <ActivityIndicator size="large" color="#D97757" />
        <Text style={styles.loadingText}>Cargando materias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#0d2240" />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerLabel}>Bienvenida</Text>
            <Text style={styles.headerNombre} numberOfLines={1}>{nombre || 'Profesora'}</Text>
          </View>
          <View style={styles.headerAcciones}>
            <TouchableOpacity style={styles.btnIcono} onPress={() => navigation.navigate('Horario')}>
              <Text style={styles.btnIconoEmoji}>🗓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnIcono, styles.btnSalir]} onPress={cerrarSesion}>
              <Text style={styles.btnIconoEmoji}>⏏</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <Text style={styles.statNum}>{materias.length}</Text>
            <Text style={styles.statLabel}>materias</Text>
          </View>
          {periodoInfo && (
            <View style={[styles.statBadge, styles.statBadgeAlt]}>
              <Text style={styles.statNum}>P{periodoInfo.numero}</Text>
              <Text style={styles.statLabel}>período activo</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── LISTA ── */}
      {materias.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>Sin materias asignadas</Text>
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
          ListHeaderComponent={<Text style={styles.seccionTitulo}>Mis materias</Text>}
          ListFooterComponent={() =>
            cursoId && periodoInfo ? (
              <TouchableOpacity
                style={styles.botonBoletin}
                onPress={() => navigation.navigate('Boletin', { cursoId, periodoId: periodoInfo.id, periodoNumero: periodoInfo.numero })}
              >
                <Text style={styles.botonBoletinIcon}>📋</Text>
                <Text style={styles.botonBoletinTexto}>Boletín del Curso</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item, index }) => {
            const acento = COLORES_ACENTO[index % COLORES_ACENTO.length];
            return (
              <View style={styles.card}>
                <View style={[styles.cardAccent, { backgroundColor: acento }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <View style={[styles.cardIconCircle, { backgroundColor: acento + '22' }]}>
                      <Text style={styles.cardIconText}>{item.nombre.charAt(0)}</Text>
                    </View>
                    <View style={styles.cardTitleInfo}>
                      <Text style={styles.materiaNombre}>{item.nombre}</Text>
                      <Text style={styles.materiaCodigo}>{item.codigo}</Text>
                    </View>
                  </View>

                  <View style={styles.btnGrid}>
                    <TouchableOpacity
                      style={[styles.btnAccion, { backgroundColor: '#1a3a6b' }]}
                      onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'calificar' })}
                    >
                      <Text style={styles.btnAccionIcon}>📝</Text>
                      <Text style={styles.btnAccionText}>Calificar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnAccion, { backgroundColor: '#059669' }]}
                      onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'asistencia' })}
                    >
                      <Text style={styles.btnAccionIcon}>✋</Text>
                      <Text style={styles.btnAccionText}>Asistencia</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnAccion, { backgroundColor: '#7c3aed' }]}
                      onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'planilla' })}
                    >
                      <Text style={styles.btnAccionIcon}>📊</Text>
                      <Text style={styles.btnAccionText}>Planilla</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnAccion, styles.btnIA]}
                      onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'calificarIA' })}
                    >
                      <Text style={styles.btnAccionIcon}>🤖</Text>
                      <Text style={styles.btnAccionText}>Calif. IA</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Botón Riesgo IA — fila completa */}
                  <TouchableOpacity
                    style={styles.btnRiesgo}
                    onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'riesgoIA' })}
                  >
                    <Text style={styles.btnAccionIcon}>🚦</Text>
                    <Text style={styles.btnRiesgoText}>Análisis de Riesgo IA</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#EEF2F7' },
  loadingContainer: { flex: 1, backgroundColor: '#0d2240', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, color: '#94a3b8', fontSize: 15 },

  // Header
  header: { backgroundColor: '#0d2240', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatarWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#D97757', justifyContent: 'center', alignItems: 'center',
    marginRight: 12, borderWidth: 2, borderColor: '#FCCCA8',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerInfo: { flex: 1 },
  headerLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  headerNombre: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 1 },
  headerAcciones: { flexDirection: 'row', gap: 8 },
  btnIcono: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center',
  },
  btnSalir: { backgroundColor: 'rgba(239,68,68,0.25)' },
  btnIconoEmoji: { fontSize: 18 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  statBadgeAlt: { backgroundColor: 'rgba(217,119,87,0.25)' },
  statNum: { fontSize: 14, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 12, color: '#94a3b8' },

  // Lista
  lista: { padding: 16, paddingBottom: 32 },
  seccionTitulo: { fontSize: 13, fontWeight: '700', color: '#64748b', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },

  // Vacío
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 20, textAlign: 'center' },
  retryBtn: { backgroundColor: '#1a3a6b', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },

  // Tarjeta
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 14,
    flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 4,
  },
  cardAccent: { width: 5 },
  cardBody: { flex: 1, padding: 16 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardIconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardIconText: { fontSize: 18, fontWeight: '800', color: '#1f2937' },
  cardTitleInfo: { flex: 1 },
  materiaNombre: { fontSize: 16, fontWeight: '700', color: '#111827' },
  materiaCodigo: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // Botones 2x2
  btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnAccion: {
    width: '47%', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  btnIA: { backgroundColor: '#D97757' },
  btnAccionIcon: { fontSize: 18, marginBottom: 3 },
  btnAccionText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Riesgo IA
  btnRiesgo: {
    marginTop: 8, borderRadius: 10, paddingVertical: 10,
    backgroundColor: '#4c1d95', flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  btnRiesgoText: { color: '#ddd6fe', fontWeight: '700', fontSize: 13 },

  // Boletín
  botonBoletin: {
    backgroundColor: '#0d2240', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 4, marginBottom: 8, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6,
  },
  botonBoletinIcon: { fontSize: 20 },
  botonBoletinTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
