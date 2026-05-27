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
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerLabel}>Bienvenida</Text>
            <Text style={styles.headerNombre} numberOfLines={1}>{nombre || 'Profesora'}</Text>
          </View>
          <View style={styles.headerAcciones}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Horario')}>
              <Text style={styles.headerBtnText}>Horario</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, styles.headerBtnSalir]} onPress={cerrarSesion}>
              <Text style={styles.headerBtnText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{materias.length}</Text>
            <Text style={styles.statLabel}>materias</Text>
          </View>
          {periodoInfo && (
            <View style={[styles.statItem, styles.statItemActive]}>
              <Text style={[styles.statNum, styles.statNumActive]}>P{periodoInfo.numero}</Text>
              <Text style={[styles.statLabel, styles.statLabelActive]}>período activo</Text>
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
          ListHeaderComponent={
            <Text style={styles.seccionLabel}>MIS MATERIAS</Text>
          }
          ListFooterComponent={() =>
            cursoId && periodoInfo ? (
              <TouchableOpacity
                style={styles.botonBoletin}
                onPress={() => navigation.navigate('Boletin', { cursoId, periodoId: periodoInfo.id, periodoNumero: periodoInfo.numero })}
              >
                <Text style={styles.botonBoletinTexto}>Ver Boletín del Curso</Text>
                <Text style={styles.botonBoletinFlecha}>→</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                  <Text style={styles.cardIconText}>{item.nombre.charAt(0)}</Text>
                </View>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardNombre}>{item.nombre}</Text>
                  <Text style={styles.cardCodigo}>{item.codigo}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.btnGrid}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'calificar' })}
                >
                  <Text style={[styles.btnText, styles.btnTextPrimary]}>Calificar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnSuccess]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'asistencia' })}
                >
                  <Text style={[styles.btnText, styles.btnTextSuccess]}>Asistencia</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnNeutral]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'planilla' })}
                >
                  <Text style={[styles.btnText, styles.btnTextNeutral]}>Planilla</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnIA]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'calificarIA' })}
                >
                  <Text style={[styles.btnText, styles.btnTextIA]}>Calif. con IA</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.btnRiesgo}
                onPress={() => navigation.navigate('SeleccionarPeriodo', { materiaId: item.id, materiaNombre: item.nombre, modo: 'riesgoIA' })}
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

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 20,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  headerInfo: { flex: 1 },
  headerLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500', letterSpacing: 0.5 },
  headerNombre: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginTop: 1 },
  headerAcciones: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerBtnSalir: { backgroundColor: 'rgba(220,38,38,0.25)' },
  headerBtnText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7,
  },
  statItemActive: { backgroundColor: 'rgba(37,99,235,0.3)' },
  statNum: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  statNumActive: { color: '#93C5FD' },
  statLabel: { fontSize: 12, color: '#64748B' },
  statLabelActive: { color: '#BFDBFE' },

  // ── Lista ───────────────────────────────────────────────────────────────────
  lista: { padding: 16, paddingBottom: 40 },
  seccionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1.2, textTransform: 'uppercase',
    marginBottom: 12,
  },

  // ── Vacío ───────────────────────────────────────────────────────────────────
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  retryBtn: {
    backgroundColor: '#1E3A5F', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },

  // ── Tarjeta ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardIconText: { fontSize: 18, fontWeight: '800', color: '#2563EB' },
  cardTitleWrap: { flex: 1 },
  cardNombre: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardCodigo: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 12 },

  // ── Botones 2×2 ─────────────────────────────────────────────────────────────
  btnGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  btn: {
    width: '47.5%',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnText: { fontSize: 13, fontWeight: '600' },

  btnPrimary:     { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  btnTextPrimary: { color: '#2563EB' },

  btnSuccess:     { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  btnTextSuccess: { color: '#16A34A' },

  btnNeutral:     { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  btnTextNeutral: { color: '#475569' },

  btnIA:          { backgroundColor: '#FDF4FF', borderColor: '#E9D5FF' },
  btnTextIA:      { color: '#7C3AED' },

  // ── Riesgo (full width) ─────────────────────────────────────────────────────
  btnRiesgo: {
    paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE',
    alignItems: 'center',
  },
  btnRiesgoText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },

  // ── Boletín footer ──────────────────────────────────────────────────────────
  botonBoletin: {
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  botonBoletinTexto: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  botonBoletinFlecha: { color: '#93C5FD', fontSize: 20, fontWeight: '600' },
});
