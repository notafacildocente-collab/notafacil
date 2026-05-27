import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { apiFetch } from '../services/api';
import { exportarBoletinPDF, exportarBoletinIndividualPDF } from '../services/exportarPDF';

const CELDA_NOMBRE = 160;
const CELDA_NOTA = 52;
const CELDA_FALTAS = 38;
const CELDA_PROM = 58;
const CELDA_PUESTO = 38;
const CELDA_PDF = 38;

export default function BoletinScreen() {
  const route = useRoute();
  const { cursoId, periodoId, periodoNumero, cursoNombre } = (route.params || {}) as any;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generandoPDF, setGenerandoPDF] = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/notas/boletin?cursoId=${cursoId}&periodoId=${periodoId}`);
      if (!res.ok) throw new Error('Error');
      setData(await res.json());
    } catch {
      Alert.alert('Error', 'No se pudo cargar el boletín');
    } finally {
      setLoading(false);
    }
  };

  const handlePDFIndividual = async (est: any) => {
    try {
      setGenerandoPDF(est.estudianteId);
      const res = await apiFetch(
        `/api/notas/boletin-individual/${est.estudianteId}?periodoId=${periodoId}&cursoId=${cursoId}`,
      );
      if (!res.ok) throw new Error('Error al obtener datos');
      const boletinData = await res.json();
      await exportarBoletinIndividualPDF(boletinData, est.puesto);
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudo generar el PDF individual');
      }
    } finally {
      setGenerandoPDF(null);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a3a6b" />
      <Text style={styles.loadingTxt}>Generando boletín...</Text>
    </View>
  );

  if (!data || !data.estudiantes?.length) return (
    <View style={styles.center}>
      <Text style={{ color: '#6b7280' }}>Sin datos para este período</Text>
    </View>
  );

  const { materias, estudiantes } = data;

  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitulo}>Boletín · Período {periodoNumero}</Text>
          <Text style={styles.headerSub}>{cursoNombre || 'Consolidado del Curso'}</Text>
        </View>
        <View style={styles.leyenda}>
          <Text style={[styles.leyendaTxt, { color: '#ef4444' }]}>● Pierde</Text>
          <Text style={[styles.leyendaTxt, { color: '#10b981' }]}>● Aprueba</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Encabezado */}
          <View style={styles.fila}>
            <Text style={[styles.enc, { width: CELDA_PUESTO }]}>#</Text>
            <Text style={[styles.enc, styles.encNombre, { width: CELDA_NOMBRE }]}>Estudiante</Text>
            {materias.map((m: any) => (
              <Text key={m.id} style={[styles.enc, { width: CELDA_NOTA }]} numberOfLines={2}>
                {(m.codigo || m.nombre.slice(0, 4).toUpperCase()).replace(/-\d+$/, '')}
              </Text>
            ))}
            <Text style={[styles.enc, { width: CELDA_FALTAS, color: '#b45309' }]}>F</Text>
            <Text style={[styles.enc, { width: CELDA_PROM, backgroundColor: '#dcfce7', color: '#065f46' }]}>Prom.</Text>
            <Text style={[styles.enc, { width: CELDA_PDF, backgroundColor: '#faf5ff', color: '#7c3aed' }]}>PDF</Text>
          </View>

          {/* Filas estudiantes */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {estudiantes.map((est: any, idx: number) => (
              <View key={est.estudianteId} style={[styles.fila, idx % 2 === 0 && styles.filaPar]}>
                {/* Puesto */}
                <Text style={[styles.celda, styles.puestoTxt, { width: CELDA_PUESTO }]}>{est.puesto}°</Text>
                {/* Nombre */}
                <Text style={[styles.celda, styles.celdaNombre, { width: CELDA_NOMBRE }]} numberOfLines={1}>
                  {est.nombre}
                </Text>
                {/* Notas por materia */}
                {materias.map((m: any) => {
                  const nota = est.notasPorMateria[m.id] || 0;
                  const pierde = nota > 0 && nota < 3.0;
                  return (
                    <Text key={m.id} style={[
                      styles.celda, { width: CELDA_NOTA, textAlign: 'center' },
                      pierde && styles.notaRoja,
                      nota === 0 && styles.notaVacia,
                    ]}>
                      {nota === 0 ? '—' : nota.toFixed(1)}
                    </Text>
                  );
                })}
                {/* Faltas */}
                <Text style={[styles.celda, styles.faltasTxt, { width: CELDA_FALTAS },
                  (est.totalFaltas || 0) > 0 && { color: '#b45309', fontWeight: '700' }
                ]}>
                  {est.totalFaltas || 0}
                </Text>
                {/* Promedio */}
                <Text style={[styles.celda, styles.promTxt, { width: CELDA_PROM },
                  est.promedio > 0 && est.promedio < 3 && styles.notaRoja,
                  est.promedio === 0 && styles.notaVacia,
                ]}>
                  {est.promedio === 0 ? '—' : est.promedio.toFixed(1)}
                </Text>
                {/* PDF Individual */}
                <TouchableOpacity
                  style={[styles.celda, styles.pdfBtn, { width: CELDA_PDF }]}
                  onPress={() => handlePDFIndividual(est)}
                  disabled={generandoPDF === est.estudianteId}
                >
                  {generandoPDF === est.estudianteId
                    ? <ActivityIndicator size="small" color="#7c3aed" />
                    : <Text style={{ fontSize: 16 }}>📄</Text>
                  }
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.exportBtn}
        onPress={() => exportarBoletinPDF(periodoNumero, cursoNombre, data.materias, data.estudiantes)}
      >
        <Text style={styles.exportTxt}>📄 Exportar PDF</Text>
      </TouchableOpacity>

      {/* Resumen */}
      <View style={styles.resumenBar}>
        <Text style={styles.resumenTxt}>
          {estudiantes.length} estudiantes · {materias.length} materias ·{' '}
          {estudiantes.filter((e: any) =>
            Object.values(e.notasPorMateria).some((n: any) => n > 0 && n < 3.0)
          ).length} con pérdidas
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingTxt: { marginTop: 12, color: '#6b7280' },
  headerBar: {
    backgroundColor: '#1a3a6b', paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerTitulo: { color: '#fff', fontWeight: '700', fontSize: 16 },
  headerSub: { color: '#93c5fd', fontSize: 12, marginTop: 2 },
  leyenda: { alignItems: 'flex-end', gap: 3 },
  leyendaTxt: { fontSize: 11, fontWeight: '600' },
  fila: {
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', backgroundColor: '#fff',
  },
  filaPar: { backgroundColor: '#f9fafb' },
  enc: {
    paddingVertical: 9, paddingHorizontal: 3, textAlign: 'center',
    fontSize: 11, fontWeight: '700', color: '#1a3a6b', backgroundColor: '#eff6ff',
    borderRightWidth: 1, borderRightColor: '#bfdbfe',
  },
  encNombre: { textAlign: 'left', paddingLeft: 10 },
  celda: { paddingVertical: 9, paddingHorizontal: 3, fontSize: 12, color: '#1f2937' },
  celdaNombre: { fontWeight: '500', color: '#111827', paddingLeft: 10 },
  puestoTxt: { textAlign: 'center', color: '#6b7280', fontWeight: '700', fontSize: 11 },
  notaRoja: { color: '#ef4444', fontWeight: '700' },
  notaVacia: { color: '#d1d5db' },
  faltasTxt: { textAlign: 'center', color: '#9ca3af' },
  promTxt: { textAlign: 'center', fontWeight: '800', fontSize: 13, color: '#059669' },
  pdfBtn: { justifyContent: 'center', alignItems: 'center', paddingVertical: 9 },
  exportBtn: {
    backgroundColor: '#1a3a6b', marginHorizontal: 12, marginVertical: 6,
    paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  exportTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  resumenBar: { backgroundColor: '#1a3a6b', paddingVertical: 8, alignItems: 'center' },
  resumenTxt: { color: '#93c5fd', fontSize: 11 },
});
