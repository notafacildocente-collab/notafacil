import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { offlineQueue } from '../services/offlineQueue';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import OfflineBanner from '../components/OfflineBanner';

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
  PRESENTE:      { label: 'P', bg: '#10b981' },
  AUSENTE:       { label: 'A', bg: '#ef4444' },
  JUSTIFICADA:   { label: 'J', bg: '#f59e0b' },
  INJUSTIFICADA: { label: 'I', bg: '#3b82f6' },
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

  const { isOnline, pendingCount, isSyncing, syncNow, refreshPending } = useNetworkStatus();
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
      const payload = { asignacionId, fecha: fechaISO, registros: listaRegistros };

      if (!isOnline) {
        await offlineQueue.add({ tipo: 'ASISTENCIA', method: 'POST', url: '/api/asistencia/guardar', body: payload });
        await refreshPending();
        setYaGuardado(true);
        Alert.alert('📥 Guardado sin internet', 'La asistencia se sincronizará automáticamente al reconectarte.');
        return;
      }

      const res = await apiFetch('/api/asistencia/guardar', {
        method: 'POST',
        body: JSON.stringify(payload),
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
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={styles.loadingText}>Cargando estudiantes...</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.flex}>
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} onSync={syncNow} />

      {/* ── Barra de contexto (materia + periodo) ── */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{materiaNombre}</Text>
        <View style={styles.periodoPill}>
          <Text style={styles.periodoText}>Periodo {periodoNumero}</Text>
        </View>
      </View>

      {/* ── Selector de fecha ── */}
      <View style={styles.fechaRow}>
        <TouchableOpacity onPress={() => cambiarFecha(-1)} style={styles.fechaNavBtn}>
          <Text style={styles.fechaNavChar}>‹</Text>
        </TouchableOpacity>
        <View style={styles.fechaCentro}>
          <Text style={styles.fechaTexto}>{formatFecha(fechaISO)}</Text>
          {yaGuardado && <Text style={styles.guardadoTexto}>✓ Asistencia guardada</Text>}
        </View>
        <TouchableOpacity onPress={() => cambiarFecha(1)} style={styles.fechaNavBtn}>
          <Text style={styles.fechaNavChar}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Resumen de conteos ── */}
      <View style={styles.resumenRow}>
        {ESTADOS.map((estado) => (
          <View
            key={estado}
            style={[styles.resumenItem, { backgroundColor: ESTADO_CONFIG[estado].bg + '22' }]}
          >
            <Text style={[styles.resumenNum, { color: ESTADO_CONFIG[estado].bg }]}>
              {conteos[estado]}
            </Text>
            <Text style={[styles.resumenLabel, { color: ESTADO_CONFIG[estado].bg }]}>
              {ESTADO_CONFIG[estado].label}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Marcar todos ── */}
      <View style={styles.marcarTodosRow}>
        <Text style={styles.marcarTodosLabel}>Marcar todos:</Text>
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

      {/* ── Lista de estudiantes ── */}
      {loadingAsistencia ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="small" color="#1a3a6b" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.listaContenido}>
          {estudiantes.map((est, idx) => {
            const estado = registros[est.id] || 'PRESENTE';
            const config = ESTADO_CONFIG[estado];
            return (
              <TouchableOpacity
                key={est.id}
                style={styles.estudianteRow}
                onPress={() => toggleEstado(est.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.numTexto}>{idx + 1}.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nombreTexto}>{est.apellido} {est.nombre}</Text>
                  <Text style={styles.docTexto}>{est.numeroDocumento}</Text>
                </View>
                <View style={[styles.estadoBtn, { backgroundColor: config.bg }]}>
                  <Text style={styles.estadoBtnText}>{config.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* ── Botón guardar ── */}
      <View style={styles.footerWrap}>
        <TouchableOpacity
          style={[styles.guardarBtn, saving && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.guardarBtnText}>
                {yaGuardado ? '↺  Actualizar Asistencia' : '✓  Guardar Asistencia'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingWrap: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC',
  },
  loadingText: { marginTop: 12, color: '#475569', fontSize: 15 },

  // ── Barra de contexto ──
  headerBar: {
    backgroundColor: '#2D5FA8',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF', fontSize: 15, fontWeight: '700', flex: 1,
  },
  periodoPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10,
  },
  periodoText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },

  // ── Selector de fecha ──
  fechaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  fechaNavBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  fechaNavChar: { fontSize: 28, color: '#475569', lineHeight: 32 },
  fechaCentro: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  fechaTexto: {
    fontSize: 14, fontWeight: '600', color: '#0F172A',
    textTransform: 'capitalize', textAlign: 'center',
  },
  guardadoTexto: {
    fontSize: 11, color: '#10b981', fontWeight: '600', marginTop: 2, textAlign: 'center',
  },

  // ── Resumen ──
  resumenRow: {
    flexDirection: 'row',
    paddingHorizontal: 10, paddingVertical: 8,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  resumenItem: {
    flex: 1, borderRadius: 8, paddingVertical: 6, alignItems: 'center',
  },
  resumenNum: { fontSize: 20, fontWeight: '700' },
  resumenLabel: { fontSize: 11, fontWeight: '700', marginTop: 1 },

  // ── Marcar todos ──
  marcarTodosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  marcarTodosLabel: { fontSize: 12, color: '#475569', fontWeight: '600' },
  marcarBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6,
  },
  marcarBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },

  // ── Lista ──
  listaContenido: { paddingHorizontal: 10, paddingTop: 8 },
  estudianteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 6,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  numTexto: {
    width: 26, fontSize: 13, color: '#94A3B8', fontWeight: '500', marginRight: 6,
  },
  nombreTexto: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  docTexto: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  // ── Botón de estado ──
  estadoBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  estadoBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  // ── Footer ──
  footerWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  guardarBtn: {
    backgroundColor: '#2D5FA8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  guardarBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
