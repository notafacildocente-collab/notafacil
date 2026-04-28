import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { apiFetch } from '../services/api';

interface Periodo {
  id: string;
  numero: number;
  cerrado: boolean;
}

export default function EstudianteBoletinScreen() {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoActivo, setPeriodoActivo] = useState<Periodo | null>(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<Periodo | null>(null);
  const [boletin, setBoletin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBoletin, setLoadingBoletin] = useState(false);

  useEffect(() => {
    cargarPeriodos();
  }, []);

  const cargarPeriodos = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/estudiante/periodos');
      if (res.ok) {
        const data: Periodo[] = await res.json();
        setPeriodos(data);
        // El período activo es el abierto con menor número
        const abiertos = data.filter(p => !p.cerrado).sort((a, b) => a.numero - b.numero);
        const activo = abiertos.length > 0 ? abiertos[0] : null;
        if (activo) setPeriodoActivo(activo);
        if (activo) setPeriodoActivo(activo);
        // Seleccionar automáticamente el último período cerrado
        const cerrados = data.filter(p => p.cerrado);
        if (cerrados.length > 0) seleccionarPeriodo(cerrados[cerrados.length - 1], activo);
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudieron cargar los períodos');
      }
    } finally {
      setLoading(false);
    }
  };

  const seleccionarPeriodo = async (periodo: Periodo, activo?: Periodo | null) => {
    const periodoActivoActual = activo !== undefined ? activo : periodoActivo;

    // Período futuro — no ha iniciado
    if (!periodo.cerrado && periodo.id !== periodoActivoActual?.id) {
      Alert.alert('No disponible', `El Período ${periodo.numero} aún no ha iniciado.`);
      return;
    }

    // Período actual — abierto
    if (!periodo.cerrado && periodo.id === periodoActivoActual?.id) {
      Alert.alert(
        `Período ${periodo.numero} — En curso`,
        'Este período está actualmente en curso. El boletín estará disponible cuando finalice.',
      );
      return;
    }

    // Período cerrado — mostrar boletín
    try {
      setPeriodoSeleccionado(periodo);
      setLoadingBoletin(true);
      setBoletin(null);
      const res = await apiFetch(`/api/estudiante/boletin/${periodo.id}`);
      if (res.ok) {
        setBoletin(await res.json());
      } else {
        Alert.alert('Error', 'No se pudo cargar el boletín');
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudo conectar al servidor');
      }
    } finally {
      setLoadingBoletin(false);
    }
  };

  const getEstadoPeriodo = (periodo: Periodo) => {
    if (periodo.cerrado) return 'cerrado';
    if (periodo.id === periodoActivo?.id) return 'activo';
    return 'futuro';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={styles.loadingText}>Cargando períodos...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Boletín de Calificaciones</Text>

      {/* Selector de períodos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodosScroll}>
        {periodos.map((p) => {
          const estado = getEstadoPeriodo(p);
          const seleccionado = periodoSeleccionado?.id === p.id;

          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.periodoChip,
                seleccionado && styles.periodoChipSeleccionado,
                estado === 'activo' && styles.periodoChipActivo,
                estado === 'futuro' && styles.periodoChipFuturo,
              ]}
              onPress={() => seleccionarPeriodo(p)}
            >
              <Text style={[
                styles.periodoChipText,
                seleccionado && styles.periodoChipTextSeleccionado,
                estado === 'futuro' && styles.periodoChipTextFuturo,
              ]}>
                Período {p.numero}
              </Text>
              <Text style={[
                styles.periodoChipTag,
                estado === 'activo' && { color: '#10b981' },
                estado === 'futuro' && { color: '#9ca3af' },
                estado === 'cerrado' && { color: '#6b7280' },
              ]}>
                {estado === 'cerrado' ? 'Finalizado' : estado === 'activo' ? 'En curso' : 'Próximo'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loadingBoletin && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a3a6b" />
          <Text style={styles.loadingText}>Cargando boletín...</Text>
        </View>
      )}

      {boletin && !loadingBoletin && (
        <View>
          <View style={[
            styles.resumenCard,
            { backgroundColor: boletin.aprobado ? '#10b981' : '#ef4444' }
          ]}>
            <Text style={styles.resumenTitulo}>Período {boletin.periodo}</Text>
            <Text style={styles.resumenPromedio}>{boletin.promedioGeneral.toFixed(1)}</Text>
            <Text style={styles.resumenEstado}>
              {boletin.aprobado ? '✓ Promedio aprobado' : '✗ Promedio reprobado'}
            </Text>
          </View>

          <View style={styles.tabla}>
            <View style={styles.tablaHeader}>
              <Text style={[styles.tablaHeaderText, { flex: 2 }]}>Materia</Text>
              <Text style={styles.tablaHeaderText}>Cog</Text>
              <Text style={styles.tablaHeaderText}>Pro</Text>
              <Text style={styles.tablaHeaderText}>Act</Text>
              <Text style={styles.tablaHeaderText}>Final</Text>
            </View>

            {boletin.materias.map((m: any, idx: number) => (
              <View key={m.materiaId} style={[styles.tablaFila, idx % 2 === 0 && styles.tablaFilaPar]}>
                <Text style={[styles.tablaCelda, { flex: 2, fontWeight: '600' }]} numberOfLines={1}>
                  {m.materia}
                </Text>
                {m.desempenos.map((d: any) => (
                  <Text
                    key={d.nombre}
                    style={[
                      styles.tablaCelda,
                      { color: d.promedio >= 3 ? '#059669' : d.promedio === 0 ? '#9ca3af' : '#ef4444' }
                    ]}
                  >
                    {d.promedio.toFixed(1)}
                  </Text>
                ))}
                <Text style={[
                  styles.tablaCelda,
                  styles.tablaFinal,
                  { color: m.notaFinal >= 3 ? '#059669' : '#ef4444' }
                ]}>
                  {m.notaFinal.toFixed(1)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!periodoSeleccionado && !loadingBoletin && (
        <View style={styles.centerPadding}>
          <Text style={styles.emptyText}>Selecciona un período finalizado para ver el boletín</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerPadding: { alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  titulo: { fontSize: 18, fontWeight: '700', color: '#1a3a6b', marginBottom: 16 },
  emptyText: { fontSize: 15, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center' },
  periodosScroll: { marginBottom: 20 },
  periodoChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    marginRight: 10, alignItems: 'center', minWidth: 100,
  },
  periodoChipSeleccionado: { backgroundColor: '#1a3a6b', borderColor: '#1a3a6b' },
  periodoChipActivo: { borderColor: '#10b981', borderWidth: 2 },
  periodoChipFuturo: { opacity: 0.4 },
  periodoChipText: { fontSize: 13, fontWeight: '700', color: '#374151' },
  periodoChipTextSeleccionado: { color: '#fff' },
  periodoChipTextFuturo: { color: '#9ca3af' },
  periodoChipTag: { fontSize: 10, fontWeight: '600', marginTop: 3 },
  resumenCard: {
    borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20,
  },
  resumenTitulo: { color: '#fff', fontSize: 14, fontWeight: '600', opacity: 0.9 },
  resumenPromedio: { color: '#fff', fontSize: 52, fontWeight: '800', lineHeight: 60 },
  resumenEstado: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 4 },
  tabla: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2 },
  tablaHeader: {
    flexDirection: 'row', backgroundColor: '#1a3a6b',
    paddingVertical: 10, paddingHorizontal: 12,
  },
  tablaHeaderText: {
    flex: 1, color: '#fff', fontWeight: '700',
    fontSize: 11, textAlign: 'center',
  },
  tablaFila: {
    flexDirection: 'row', paddingVertical: 10,
    paddingHorizontal: 12, backgroundColor: '#fff',
  },
  tablaFilaPar: { backgroundColor: '#f9fafb' },
  tablaCelda: { flex: 1, fontSize: 12, textAlign: 'center', color: '#374151' },
  tablaFinal: { fontWeight: '800', fontSize: 13 },
});