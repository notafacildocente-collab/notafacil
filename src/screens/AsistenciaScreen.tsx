/**
 * AsistenciaScreen
 *
 * Permite al profesor registrar la asistencia de todos los estudiantes
 * de una clase en una fecha específica.
 *
 * Estados posibles por estudiante:
 *   🟢 PRESENTE  🔴 AUSENTE  🟡 F. JUSTIFICADA  🔵 F. INJUSTIFICADA
 *
 * Params de navegación: asignacionId, materiaNombre, periodoNumero
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoAsistencia = 'PRESENTE' | 'AUSENTE' | 'JUSTIFICADA' | 'INJUSTIFICADA';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
}

interface RegistroLocal {
  estudianteId: string;
  estado: EstadoAsistencia;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const API_URL = 'https://notafacil-backend-production.up.railway.app';

const ESTADOS: EstadoAsistencia[] = ['PRESENTE', 'AUSENTE', 'JUSTIFICADA', 'INJUSTIFICADA'];

const ESTADO_CONFIG: Record<EstadoAsistencia, { label: string; color: string; bg: string }> = {
  PRESENTE:     { label: 'P', color: '#fff', bg: '#10b981' },
  AUSENTE:      { label: 'A', color: '#fff', bg: '#ef4444' },
  JUSTIFICADA:  { label: 'J', color: '#fff', bg: '#f59e0b' },
  INJUSTIFICADA:{ label: 'I', color: '#fff', bg: '#3b82f6' },
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

/** Formatea Date a 'YYYY-MM-DD' */
function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Formatea 'YYYY-MM-DD' a texto legible en español */
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

  // Fecha seleccionada (default: hoy)
  const [fechaISO, setFechaISO] = useState(toISO(new Date()));

  // Datos
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [registros, setRegistros] = useState<Record<string, EstadoAsistencia>>({});

  // Estado de UI
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

        // Inicializar todos como PRESENTE por defecto
        const inicial: Record<string, EstadoAsistencia> = {};
        data.forEach((e) => { inicial[e.id] = 'PRESENTE'; });
        setRegistros(inicial);
      } catch (error) {
        Alert.alert('Error', 'No se pudieron cargar los estudiantes');
      } finally {
        setLoadingEstudiantes(false);
      }
    };
    cargar();
  }, [asignacionId]);

  // ── Carga asistencia existente cuando cambia la fecha ───────────────────

  useEffect(() => {
    if (estudiantes.length === 0) return;

    const cargarAsistencia = async () => {
      try {
        setLoadingAsistencia(true);
        const res = await apiFetch(
          `/api/asistencia?asignacionId=${asignacionId}&fecha=${fechaISO}`,
        );

        if (res.ok) {
          const data: Array<{ estudianteId: string; estado: EstadoAsistencia }> =
            await res.json();

          if (data.length > 0) {
            // Hay asistencia guardada para esta fecha — cargarla
            const cargado: Record<string, EstadoAsistencia> = {};
            // Empezar con PRESENTE para todos
            estudiantes.forEach((e) => { cargado[e.id] = 'PRESENTE'; });
            // Sobrescribir con los valores guardados
            data.forEach((r) => { cargado[r.estudianteId] = r.estado; });
            setRegistros(cargado);
            setYaGuardado(true);
          } else {
            // Sin asistencia guardada — resetear a PRESENTE
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

  // ── Cambiar estado de un estudiante (ciclo: P→A→T→E→P) ─────────────────

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

  // ── Guardar asistencia ────────────────────────────────────────────────────

  const guardar = async () => {
    try {
      setSaving(true);

      const listaRegistros = estudiantes.map((e) => ({
        estudianteId: e.id,
        estado: registros[e.id] || 'PRESENTE',
      }));

      const res = await apiFetch('/api/asistencia/guardar', {
        method: 'POST',
        body: JSON.stringify({
          asignacionId,
          fecha: fechaISO,
          registros: listaRegistros,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
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
    // No permitir fechas futuras
    if (nueva > new Date()) {
      Alert.alert('', 'No puedes registrar asistencia de fechas futuras');
      return;
    }
    setFechaISO(toISO(nueva));
  };

  // ── Conteos para el resumen ───────────────────────────────────────────────

  const conteos = estudiantes.reduce(
    (acc, e) => {
      const estado = registros[e.id] || 'PRESENTE';
      acc[estado]++;
      return acc;
    },
    { PRESENTE: 0, AUSENTE: 0, JUSTIFICADA: 0, INJUSTIFICADA: 0 } as Record<EstadoAsistencia, number>,
  );

  // ── Loading inicial ───────────────────────────────────────────────────────

  if (loadingEstudiantes) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={styles.loadingText}>Cargando estudiantes...</Text>
      </View>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.flex}>

      {/* ── Barra superior: materia y período ── */}
      <View style={styles.headerBar}>
        <Text style={styles.headerMateria} numberOfLines={1}>{materiaNombre}</Text>
        <Text style={styles.headerPeriodo}>Período {periodoNumero}</Text>
      </View>

      {/* ── Selector de fecha ── */}
      <View style={styles.fechaRow}>
        <TouchableOpacity style={styles.fechaBtn} onPress={() => cambiarFecha(-1)}>
          <Text style={styles.fechaBtnText}>‹</Text>
        </TouchableOpacity>

        <View style={styles.fechaCentro}>
          <Text style={styles.fechaTexto}>{formatFecha(fechaISO)}</Text>
          {yaGuardado && (
            <Text style={styles.guardadoBadge}>✓ Guardada</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.fechaBtn}
          onPress={() => cambiarFecha(1)}
        >
          <Text style={styles.fechaBtnText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── Resumen de conteos ── */}
      <View style={styles.resumenRow}>
        {(Object.entries(conteos) as [EstadoAsistencia, number][]).map(([estado, n]) => (
          <View key={estado} style={[styles.resumenItem, { backgroundColor: ESTADO_CONFIG[estado].bg }]}>
            <Text style={styles.resumenNumero}>{n}</Text>
            <Text style={styles.resumenLabel}>{estado}</Text>
          </View>
        ))}
      </View>

      {/* ── Botones de marcar todos ── */}
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
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#1a3a6b" />
        </View>
      ) : (
        <ScrollView style={styles.lista} contentContainerStyle={styles.listaPadding}>
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
                {/* Número */}
                <Text style={styles.numero}>{idx + 1}</Text>

                {/* Nombre y documento */}
                <View style={styles.estudianteInfo}>
                  <Text style={styles.estudianteNombre}>
                    {est.apellido}, {est.nombre}
                  </Text>
                  <Text style={styles.estudianteDoc}>{est.numeroDocumento}</Text>
                </View>

                {/* Botón de estado — tap para cambiar */}
                <View style={[styles.estadoBtn, { backgroundColor: config.bg }]}>
                  <Text style={styles.estadoBtnText}>{config.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── Botón guardar (flotante en la parte inferior) ── */}
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
              {yaGuardado ? '↺ Actualizar Asistencia' : '✓ Guardar Asistencia'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 15 },

  // Header
  headerBar: {
    backgroundColor: '#1a3a6b', paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerMateria: { color: '#fff', fontWeight: '700', fontSize: 16, flex: 1 },
  headerPeriodo: { color: '#93c5fd', fontSize: 14 },

  // Selector de fecha
  fechaRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  fechaBtn: { padding: 8 },
  fechaBtnText: { fontSize: 28, color: '#1a3a6b', fontWeight: '700', lineHeight: 32 },
  fechaCentro: { flex: 1, alignItems: 'center' },
  fechaTexto: { fontSize: 14, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  guardadoBadge: { fontSize: 11, color: '#10b981', fontWeight: '600', marginTop: 2 },

  // Resumen
  resumenRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  resumenItem: {
    flex: 1, borderRadius: 8, paddingVertical: 6, alignItems: 'center',
  },
  resumenNumero: { color: '#fff', fontSize: 20, fontWeight: '800' },
  resumenLabel: { color: '#fff', fontSize: 9, fontWeight: '600', marginTop: 1 },

  // Marcar todos
  marcarTodosRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  marcarTodosLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  marcarBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6,
  },
  marcarBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Lista
  lista: { flex: 1 },
  listaPadding: { paddingHorizontal: 12, paddingTop: 8 },

  // Fila de estudiante
  estudianteRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 12,
    marginBottom: 6, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 2,
  },
  numero: { fontSize: 13, color: '#9ca3af', fontWeight: '600', width: 24 },
  estudianteInfo: { flex: 1, marginLeft: 8 },
  estudianteNombre: { fontSize: 14, fontWeight: '600', color: '#111827' },
  estudianteDoc: { fontSize: 11, color: '#6b7280', marginTop: 1 },

  // Botón de estado
  estadoBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  estadoBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Footer con botón guardar
  footerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 12,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  guardarBtn: {
    backgroundColor: '#1a3a6b', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  guardarBtnDisabled: { opacity: 0.6 },
  guardarBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
