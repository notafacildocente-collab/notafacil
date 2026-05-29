import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface Periodo {
  id: string;
  numero: number;
  cerrado: boolean;
  fechaInicio?: string;
  fechaFin?: string;
}

export default function EstudianteBoletinScreen({ navigation }: any) {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodoActivo, setPeriodoActivo] = useState<Periodo | null>(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<Periodo | null>(null);
  const [boletin, setBoletin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBoletin, setLoadingBoletin] = useState(false);

  useEffect(() => { cargarPeriodos(); }, []);

  const cargarPeriodos = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/estudiante/periodos');
      if (res.ok) {
        const data: Periodo[] = await res.json();
        setPeriodos(data);
        // Período activo = el abierto (no cerrado)
        const activo = data.find(p => !p.cerrado) || null;
        setPeriodoActivo(activo);
        // Seleccionar automáticamente el período activo (o el último cerrado)
        const inicial = activo || data.filter(p => p.cerrado).sort((a, b) => b.numero - a.numero)[0];
        if (inicial) seleccionarPeriodo(inicial, activo);
      }
    } catch (e: any) {
      if (e.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudieron cargar los períodos');
    } finally { setLoading(false); }
  };

  /** Un período es "futuro" si su número es mayor al período activo */
  const esFuturo = (p: Periodo, activo: Periodo | null): boolean => {
    if (!activo) return false;           // sin período activo → todos accesibles
    return p.numero > activo.numero;
  };

  const seleccionarPeriodo = async (periodo: Periodo, activo?: Periodo | null) => {
    const pa = activo !== undefined ? activo : periodoActivo;
    if (esFuturo(periodo, pa)) return;   // bloqueado — no hace nada

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
    } catch (e: any) {
      if (e.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo conectar al servidor');
    } finally { setLoadingBoletin(false); }
  };

  const getEstado = (p: Periodo, pa: Periodo | null) => {
    if (esFuturo(p, pa)) return 'futuro';
    if (!p.cerrado) return 'activo';
    return 'cerrado';
  };

  if (loading) {
    return (
      <View style={styles.flex}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitulo}>Boletín</Text>
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTxt}>Cargando períodos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header interno */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitulo}>Boletín de Calificaciones</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {/* Selector de períodos */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodosRow}>
          {periodos.map((p) => {
            const estado = getEstado(p, periodoActivo);
            const seleccionado = periodoSeleccionado?.id === p.id;
            const futuro = estado === 'futuro';

            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.chip,
                  seleccionado && styles.chipSel,
                  estado === 'activo' && styles.chipActivo,
                  futuro && styles.chipFuturo,
                ]}
                onPress={() => seleccionarPeriodo(p)}
                disabled={futuro}
                activeOpacity={futuro ? 1 : 0.75}
              >
                <Text style={[
                  styles.chipTxt,
                  seleccionado && styles.chipTxtSel,
                  futuro && styles.chipTxtFuturo,
                ]}>
                  Período {p.numero}
                </Text>
                <Text style={[
                  styles.chipTag,
                  estado === 'activo' && { color: Colors.success },
                  estado === 'cerrado' && { color: Colors.text3 },
                  futuro && { color: Colors.text3 },
                ]}>
                  {futuro ? 'Próximo' : estado === 'activo' ? 'En curso' : 'Finalizado'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loadingBoletin && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingTxt}>Cargando boletín...</Text>
          </View>
        )}

        {boletin && !loadingBoletin && (
          <>
            {/* Resumen promedio */}
            <View style={[
              styles.resumen,
              { backgroundColor: boletin.aprobado ? Colors.success : Colors.danger },
            ]}>
              <Text style={styles.resumenLabel}>
                Período {boletin.periodo}{periodoActivo && !periodoSeleccionado?.cerrado ? ' · En curso' : ''}
              </Text>
              <Text style={styles.resumenPromedio}>{boletin.promedioGeneral.toFixed(1)}</Text>
              <Text style={styles.resumenEstado}>
                {boletin.promedioGeneral === 0
                  ? 'Sin notas registradas aún'
                  : boletin.aprobado ? '✓ Promedio aprobado' : '✗ Promedio reprobado'}
              </Text>
            </View>

            {/* Tabla de notas */}
            {boletin.materias.length > 0 && (
              <View style={styles.tabla}>
                <View style={styles.tablaHeader}>
                  <Text style={[styles.thTxt, { flex: 2, textAlign: 'left' }]}>Materia</Text>
                  <Text style={styles.thTxt}>Nota</Text>
                </View>
                {boletin.materias.map((m: any, idx: number) => (
                  <View key={m.materiaId} style={[styles.tablaFila, idx % 2 === 0 && styles.filaPar]}>
                    <Text style={[styles.tdTxt, { flex: 2, fontWeight: Typography.semibold }]} numberOfLines={1}>
                      {m.materia}
                    </Text>
                    <Text style={[
                      styles.tdTxt,
                      styles.tdFinal,
                      { color: m.notaFinal === 0 ? Colors.text3 : m.notaFinal >= 3 ? Colors.success : Colors.danger },
                    ]}>
                      {m.notaFinal === 0 ? '—' : m.notaFinal.toFixed(1)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {boletin.materias.length === 0 && (
              <View style={styles.sinDatos}>
                <Ionicons name="document-outline" size={40} color={Colors.text3} />
                <Text style={styles.sinDatosTxt}>No hay notas registradas para este período</Text>
              </View>
            )}
          </>
        )}

        {!periodoSeleccionado && !loadingBoletin && (
          <View style={styles.sinDatos}>
            <Text style={styles.sinDatosTxt}>Selecciona un período para ver el boletín</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },

  header: {
    backgroundColor: '#2D5FA8', paddingTop: 52, paddingBottom: 18,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18, marginRight: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitulo: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },

  body: { padding: Spacing.lg },
  loadingTxt: { color: Colors.text3, marginTop: Spacing.md },

  // Chips de período
  periodosRow: { marginBottom: Spacing.lg },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    marginRight: 10, alignItems: 'center', minWidth: 100,
  },
  chipSel:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipActivo: { borderColor: Colors.success, borderWidth: 2 },
  chipFuturo: { opacity: 0.38 },
  chipTxt:    { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.text1 },
  chipTxtSel: { color: '#fff' },
  chipTxtFuturo: { color: Colors.text3 },
  chipTag:    { fontSize: 10, fontWeight: Typography.semibold, marginTop: 3 },

  // Resumen
  resumen: { borderRadius: Radius.lg, padding: 24, alignItems: 'center', marginBottom: Spacing.lg },
  resumenLabel:   { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.semibold, opacity: 0.85 },
  resumenPromedio:{ color: '#fff', fontSize: 52, fontWeight: Typography.extrabold, lineHeight: 60 },
  resumenEstado:  { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.semibold, marginTop: 4 },

  // Tabla
  tabla: { backgroundColor: Colors.surface, borderRadius: Radius.lg, overflow: 'hidden', elevation: 2 },
  tablaHeader: {
    flexDirection: 'row', backgroundColor: Colors.primary,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  thTxt: { flex: 1, color: '#fff', fontWeight: Typography.bold, fontSize: 11, textAlign: 'center' },
  tablaFila: { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 14, backgroundColor: Colors.surface },
  filaPar:   { backgroundColor: Colors.bg },
  tdTxt:     { flex: 1, fontSize: 13, textAlign: 'center', color: Colors.text1 },
  tdFinal:   { fontWeight: Typography.extrabold, fontSize: 15 },

  sinDatos:    { alignItems: 'center', paddingTop: 40, gap: 12 },
  sinDatosTxt: { fontSize: Typography.base, color: Colors.text3, textAlign: 'center', fontStyle: 'italic' },
});
