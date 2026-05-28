/**
 * AsistenciaScreen — diseño bold/impactante
 *
 * Estados: 🟢 PRESENTE  🔴 AUSENTE  🟡 JUSTIFICADA  🔵 INJUSTIFICADA
 * Params:  asignacionId, materiaNombre, periodoNumero
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | 'INJUSTIFICADA';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const API_URL = 'https://notafacil-backend-539h.onrender.com';
const ESTADOS: EstadoAsistencia[] = ['PRESENTE', 'AUSENTE', 'JUSTIFICADA', 'INJUSTIFICADA'];

const ESTADO_CONFIG: Record<EstadoAsistencia, { label: string; bg: string }> = {
  PRESENTE:      { label: 'P', bg: '#059669' },
  AUSENTE:       { label: 'A', bg: '#DC2626' },
  JUSTIFICADA:   { label: 'J', bg: '#D97706' },
  INJUSTIFICADA: { label: 'I', bg: '#2563EB' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = await SecureStore.getItemAsync('accessToken');
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AsistenciaScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { asignacionId, materiaNombre, periodoNumero } = (route.params || {}) as any;

  const [fechaISO, setFechaISO] = useState(toISO(new Date()));
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [registros, setRegistros] = useState<Record<string, EstadoAsistencia>>({});
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(true);
  const [loadingAsistencia, setLoadingAsistencia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [yaGuardado, setYaGuardado] = useState(false);

  // ── Carga inicial de estudiantes ─────────────────────────────────────────

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoadingEstudiantes(true);
        const res = await apiFetch(`/api/notas/estudiantes/${asignacionId}`);
        if (!res.ok) throw new Error('Error cargando estudiantes');
        const data: Estudiante[] = await res.json();
        setEstudiantes(data);
        const inicial: Record<string, EstadoAsistencia> = {};
        data.forEach((e) => { inicial[e.id] = 'PRESENTE'; });
        setRegistros(inicial);
      } catch {
        Alert.alert('Error', 'No se pudieron cargar los estudiantes');
      } finally {
        setLoadingEstudiantes(false);
      }
    };
    cargar();
  }, [asignacionId]);

  // ── Carga asistencia existente al cambiar fecha ──────────────────────────

  useEffect(() => {
    if (estudiantes.length === 0) return;
    const cargarAsistencia = async () => {
      try {
        setLoadingAsistencia(true);
        const res = await apiFetch(
          `/api/asistencia?asignacionId=${asignacionId}&fecha=${fechaISO}`,
        );
        if (res.ok) {
          const data: Array<{ estudianteId: string; estado: EstadoAsistencia }> = await res.json();
          if (data.length > 0) {
            const cargado: Record<string, EstadoAsistencia> = {};
            estudiantes.forEach((e) => { cargado[e.id] = 'PRESENTE'; });
            data.forEach((r) => { cargado[r.estudianteId] = r.estado; });
            setRegistros(cargado);
            setYaGuardado(true);
          } else {
            const fresco: Record<string, EstadoAsistencia> = {};
            estudiantes.forEach((e) => { fresco[e.id] = 'PRESENTE'; });
            setRegistros(fresco);
            setYaGuardado(false);
          }
        }
      } catch (error) {
        console.error('Error cargando asistencia:', error);
      } finally {
        setLoadingAsistencia(false);
      }
    };
    cargarAsistencia();
  }, [fechaISO, estudiantes]);

  // ── Cambiar estado (ciclo) ────────────────────────────────────────────────

  const toggleEstado = useCallback((estudianteId: string) => {
    setRegistros((prev) => {
      const actual = prev[estudianteId] || 'PRESENTE';
      const idx = ESTADOS.indexOf(actual);
      const siguiente = ESTADOS[(idx + 1) % ESTADOS.length];
      return { ...prev, [estudianteId]: siguiente };
    });
    setYaGuardado(false);
  }, []);

  // ── Marcar todos ──────────────────────────────────────────────────────────

  const marcarTodos = (estado: EstadoAsistencia) => {
    const nuevo: Record<string, EstadoAsistencia> = {};
    estudiantes.forEach((e) => { nuevo[e.id] = estado; });
    setRegistros(nuevo);
    setYaGuardado(false);
  };

  // ── Guardar ───────────────────────────────────────────────────────────────

  const guardar = async () => {
    try {
      setSaving(true);
      const listaRegistros = estudiantes.map((e) => ({
        estudianteId: e.id,
        estado: registros[e.id] || 'PRESENTE',
      }));
      const res = await apiFetch('/api/asistencia/guardar', {
        method: 'POST',
        body: JSON.stringify({ asignacionId, fecha: fechaISO, registros: listaRegistros }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || 'Error al guardar');
      }
      setYaGuardado(true);
      Alert.alert('✓ Guardado', `Asistencia del ${formatFecha(fechaISO)} guardada correctamente.`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar. Verifica tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  // ── Cambiar fecha ─────────────────────────────────────────────────────────

  const cambiarFecha = (dias: number) => {
    const [y, m, d] = fechaISO.split('-').map(Number);
    const nueva = new Date(y, m - 1, d + dias);
    if (nueva > new Date()) {
      Alert.alert('', 'No puedes registrar asistencia de fechas futuras');
      return;
    }
    setFechaISO(toISO(nueva));
  };

  // ── Conteos ───────────────────────────────────────────────────────────────

  const conteos = estudiantes.reduce(
    (acc, e) => {
      const estado = registros[e.id] || 'PRESENTE';
      acc[estado]++;
      return acc;
    },
    { PRESENTE: 0, AUSENTE: 0, JUSTIFICADA: 0, INJUSTIFICADA: 0 } as Record<EstadoAsistencia, number>,
  );

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loadingEstudiantes) {
    return (
      <View style={styles.loadingWrap}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando estudiantes...</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ── Header personalizado ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerMateria} numberOfLines={1}>{materiaNombre}</Text>
          <Text style={styles.headerSub}>Control de Asistencia</Text>
        </View>
        <View style={styles.periodoBadge}>
          <Text style={styles.periodoText}>P{periodoNumero}</Text>
        </View>
      </View>

      {/* ── Selector de fecha ── */}
      <View style={styles.fechaRow}>
        <TouchableOpacity style={styles.fechaBtn} onPress={() => cambiarFecha(-1)}>
          <Ionicons name="chevron-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.fechaCentro}>
          <Text style={styles.fechaTexto}>{formatFecha(fechaISO)}</Text>
          {yaGuardado && <Text style={styles.guardadoBadge}>✓ Guardada</Text>}
        </View>
        <TouchableOpacity style={styles.fechaBtn} onPress={() => cambiarFecha(1)}>
          <Ionicons name="chevron-forward" size={22} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* ── Tarjetas de estadísticas ── */}
      <View style={styles.statRow}>
        {ESTADOS.map((estado) => (
          <TouchableOpacity
            key={estado}
            style={[styles.statCard, { backgroundColor: ESTADO_CONFIG[estado].bg }]}
            onPress={() => marcarTodos(estado)}
            activeOpacity={0.8}
          >
            <Text style={styles.statNum}>{conteos[estado]}</Text>
            <Text style={styles.statLabel}>{ESTADO_CONFIG[estado].label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Marcar todos ── */}
      <View style={styles.marcarRow}>
        <Text style={styles.marcarLabel}>Marcar todos</Text>
        <View style={styles.marcarBtns}>
          {ESTADOS.map((estado) => (
            <TouchableOpacity
              key={estado}
              style={[styles.marcarBtn, { backgroundColor: ESTADO_CONFIG[estado].bg }]}
              onPress={() => marcarTodos(estado)}
            >
              <Text style={styles.marcarBtnText}>{ESTADO_CONFIG[estado].label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Lista de estudiantes ── */}
      {loadingAsistencia ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#0F172A" />
        </View>
      ) : (
        <FlatList
          data={estudiantes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listaPadding}
          renderItem={({ item: est, index: idx }) => {
            const estado = registros[est.id] || 'PRESENTE';
            const config = ESTADO_CONFIG[estado];
            return (
              <TouchableOpacity
                style={styles.estudianteRow}
                onPress={() => toggleEstado(est.id)}
                activeOpacity={0.75}
              >
                <View style={styles.numCircle}>
                  <Text style={styles.numText}>{idx + 1}</Text>
                </View>
                <View style={styles.estudianteInfo}>
                  <Text style={styles.estudianteNombre}>
                    {(est.apellido + ' ' + est.nombre).toUpperCase()}
                  </Text>
                  <Text style={styles.estudianteDoc}>{est.numeroDocumento}</Text>
                </View>
                <View style={[styles.estadoBtn, { backgroundColor: config.bg }]}>
                  <Text style={styles.estadoBtnText}>{config.label}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      {/* ── Botón guardar ── */}
      <View style={styles.footerBar}>
        <TouchableOpacity
          style={[styles.guardarBtn, saving && styles.guardarBtnDisabled]}
          onPress={guardar}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.guardarBtnText}>
              {yaGuardado ? '↺  Actualizar Asistencia' : '✓  Guardar Asistencia'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const HEADER_PT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 52;

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  loadingText: { marginTop: 12, color: '#94A3B8', fontSize: 15 },

  // ── Header ──
  header: {
    backgroundColor: '#0F172A',
    paddingTop: HEADER_PT,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerContent: { flex: 1 },
  headerMateria: { color: '#FFFFFF', fontWeight: '800', fontSize: 17, letterSpacing: -0.3 },
  headerSub: { color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 1, fontWeight: '500' },
  periodoBadge: {
    backgroundColor: '#2563EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  periodoText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // ── Selector de fecha ──
  fechaRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  fechaBtn: { padding: 8 },
  fechaCentro: { flex: 1, alignItems: 'center' },
  fechaTexto: { fontSize: 15, fontWeight: '700', color: '#0F172A', textTransform: 'capitalize' },
  guardadoBadge: { fontSize: 11, color: '#059669', fontWeight: '700', marginTop: 2 },

  // ── Stat cards ──
  statRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  statCard: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 30, fontWeight: '900', lineHeight: 34 },
  statLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },

  // ── Marcar todos ──
  marcarRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  marcarLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', flex: 1 },
  marcarBtns: { flexDirection: 'row', gap: 8 },
  marcarBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  marcarBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // ── Lista ──
  listaPadding: { paddingHorizontal: 12, paddingTop: 10 },

  estudianteRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginBottom: 8, elevation: 2,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 4,
    borderWidth: 1, borderColor: '#E8EEF4',
  },
  numCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  numText: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  estudianteInfo: { flex: 1, marginLeft: 10 },
  estudianteNombre: { fontSize: 13, fontWeight: '700', color: '#0F172A', letterSpacing: 0.2 },
  estudianteDoc: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  // ── Botón de estado ──
  estadoBtn: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
  },
  estadoBtnText: { color: '#fff', fontWeight: '900', fontSize: 18 },

  // ── Footer ──
  footerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 12,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
  },
  guardarBtn: {
    backgroundColor: '#0F172A', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  guardarBtnDisabled: { opacity: 0.5 },
  guardarBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
});
