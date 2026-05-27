import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { apiFetch } from '../services/api';

interface RiesgoEstudiante {
  estudianteId: string | null;
  nombre: string;
  nivel: 'ALTO' | 'MEDIO' | 'BAJO';
  razon: string;
  sugerencia: string;
  notaFinal: number;
  totalFaltas: number;
}

const NIVEL_CFG = {
  ALTO:  { color: '#dc2626', bg: '#fef2f2',  border: '#fca5a5', icon: '🔴', label: 'Riesgo Alto' },
  MEDIO: { color: '#d97706', bg: '#fffbeb',  border: '#fcd34d', icon: '🟡', label: 'Riesgo Medio' },
  BAJO:  { color: '#059669', bg: '#f0fdf4',  border: '#6ee7b7', icon: '🟢', label: 'Bajo Riesgo' },
};

export default function RiesgoScreen({ route }: any) {
  const { asignacionId, periodoId, materiaNombre, periodoNumero } = route.params || {};

  const [analisis, setAnalisis] = useState<RiesgoEstudiante[]>([]);
  const [loading, setLoading] = useState(false);
  const [cargado, setCargado] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/notas/analisis-riesgo/${asignacionId}?periodoId=${periodoId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al analizar');
      }
      const data: RiesgoEstudiante[] = await res.json();
      setAnalisis(data);
      setCargado(true);
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', error.message || 'No se pudo obtener el análisis de riesgo');
      }
    } finally {
      setLoading(false);
    }
  };

  const conteo = {
    ALTO:  analisis.filter((e) => e.nivel === 'ALTO').length,
    MEDIO: analisis.filter((e) => e.nivel === 'MEDIO').length,
    BAJO:  analisis.filter((e) => e.nivel === 'BAJO').length,
  };

  const datosOrdenados = [...analisis].sort((a, b) => {
    const order: Record<string, number> = { ALTO: 0, MEDIO: 1, BAJO: 2 };
    return order[a.nivel] - order[b.nivel];
  });

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{materiaNombre}</Text>
        <Text style={styles.headerSub}>Análisis de riesgo · Período {periodoNumero}</Text>
      </View>

      {/* Estado inicial */}
      {!cargado && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🤖</Text>
          <Text style={styles.emptyTitle}>Predicción de Riesgo con IA</Text>
          <Text style={styles.emptyDesc}>
            La inteligencia artificial analizará las notas y faltas de cada estudiante para identificar quiénes
            necesitan atención urgente antes del cierre del período.
          </Text>
          <View style={styles.featureRow}>
            <View style={styles.featureChip}><Text style={styles.featureChipText}>🔴 Riesgo Alto</Text></View>
            <View style={styles.featureChip}><Text style={styles.featureChipText}>🟡 Riesgo Medio</Text></View>
            <View style={styles.featureChip}><Text style={styles.featureChipText}>🟢 Bajo Riesgo</Text></View>
          </View>
          <TouchableOpacity style={styles.btnAnalizar} onPress={cargar}>
            <Text style={styles.btnAnalizarText}>✨ Analizar estudiantes</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Cargando */}
      {loading && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>La IA está analizando las notas...</Text>
          <Text style={styles.loadingSubText}>Esto puede tomar unos segundos</Text>
        </View>
      )}

      {/* Resultados */}
      {cargado && !loading && (
        <>
          {/* Resumen semáforo */}
          <View style={styles.resumenRow}>
            {(['ALTO', 'MEDIO', 'BAJO'] as const).map((nivel) => {
              const cfg = NIVEL_CFG[nivel];
              return (
                <View key={nivel} style={[styles.resumenCard, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                  <Text style={styles.resumenIcon}>{cfg.icon}</Text>
                  <Text style={[styles.resumenNum, { color: cfg.color }]}>{conteo[nivel]}</Text>
                  <Text style={styles.resumenLabel}>{cfg.label}</Text>
                </View>
              );
            })}
          </View>

          <FlatList
            data={datosOrdenados}
            keyExtractor={(item, idx) => item.estudianteId || String(idx)}
            contentContainerStyle={styles.lista}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const cfg = NIVEL_CFG[item.nivel];
              return (
                <View style={[styles.card, { borderLeftColor: cfg.color }]}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardIcon}>{cfg.icon}</Text>
                    <View style={styles.cardNombreWrap}>
                      <Text style={styles.cardNombre} numberOfLines={1}>{item.nombre}</Text>
                      <View style={[styles.nivelPill, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                        <Text style={[styles.nivelPillText, { color: cfg.color }]}>{cfg.label}</Text>
                      </View>
                    </View>
                    <View style={styles.cardMetrics}>
                      <Text style={[styles.metricNota, { color: item.notaFinal > 0 && item.notaFinal < 3 ? '#dc2626' : '#059669' }]}>
                        {item.notaFinal > 0 ? item.notaFinal.toFixed(1) : '—'}
                      </Text>
                      <Text style={styles.metricFaltas}>{item.totalFaltas}F</Text>
                    </View>
                  </View>

                  <Text style={styles.cardRazon}>{item.razon}</Text>

                  <View style={styles.sugerenciaBox}>
                    <Text style={styles.sugerenciaIcon}>💡</Text>
                    <Text style={styles.sugerenciaText}>{item.sugerencia}</Text>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              <TouchableOpacity style={styles.recargarBtn} onPress={cargar}>
                <Text style={styles.recargarText}>🔄 Actualizar análisis</Text>
              </TouchableOpacity>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F1F5F9' },

  header: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  headerSub: { color: '#93C5FD', fontSize: 12, marginTop: 3 },

  // Estado inicial
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 18 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 10, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  featureRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  featureChip: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE',
  },
  featureChipText: { fontSize: 12, color: '#1E3A5F', fontWeight: '600' },
  btnAnalizar: {
    backgroundColor: '#1E3A5F', paddingHorizontal: 36, paddingVertical: 14,
    borderRadius: 12, elevation: 2,
    shadowColor: '#1E3A5F', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6,
  },
  btnAnalizarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  // Cargando
  loadingState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 20, fontSize: 15, fontWeight: '600', color: '#1E3A5F' },
  loadingSubText: { marginTop: 6, fontSize: 13, color: '#94A3B8' },

  // Resumen semáforo
  resumenRow: { flexDirection: 'row', padding: 12, gap: 8 },
  resumenCard: {
    flex: 1, borderRadius: 12, padding: 10, alignItems: 'center',
    borderWidth: 1, elevation: 1,
  },
  resumenIcon: { fontSize: 20, marginBottom: 4 },
  resumenNum: { fontSize: 24, fontWeight: '800' },
  resumenLabel: { fontSize: 10, fontWeight: '600', color: '#64748B', textAlign: 'center', marginTop: 2 },

  // Lista
  lista: { paddingHorizontal: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardIcon: { fontSize: 18, marginRight: 10 },
  cardNombreWrap: { flex: 1 },
  cardNombre: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  nivelPill: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 8, borderWidth: 1, marginTop: 3,
  },
  nivelPillText: { fontSize: 10, fontWeight: '700' },
  cardMetrics: { alignItems: 'flex-end', minWidth: 44 },
  metricNota: { fontSize: 20, fontWeight: '800' },
  metricFaltas: { fontSize: 11, color: '#94A3B8' },

  cardRazon: { fontSize: 13, color: '#475569', marginBottom: 8, lineHeight: 18 },
  sugerenciaBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    alignItems: 'flex-start',
  },
  sugerenciaIcon: { fontSize: 13, marginTop: 1 },
  sugerenciaText: { flex: 1, fontSize: 12, color: '#1E3A5F', fontWeight: '500', lineHeight: 17 },

  recargarBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  recargarText: { color: '#475569', fontWeight: '600', fontSize: 13 },
});
