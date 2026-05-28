import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
  const navigation = useNavigation();
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
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
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
  flex:        { flex: 1, backgroundColor: '#0D0A1A' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D0A1A' },
  loadingTxt:  { marginTop: 12, color: '#A89FC0' },
  headerBar:   { backgroundColor: '#150F2A', paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 2, borderBottomColor: '#7C3AED' },
  backBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitulo:{ color: '#F5F0FF', fontWeight: '700', fontSize: 16 },
  headerSub:   { color: '#A89FC0', fontSize: 12, marginTop: 2 },
  leyenda:     { alignItems: 'flex-end', gap: 3 },
  leyendaTxt:  { fontSize: 11, fontWeight: '600' },
  // Tabla
  fila:        { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.07)', backgroundColor: '#1C1435' },
  filaPar:     { backgroundColor: '#150F2A' },
  enc:         { paddingVertical: 9, paddingHorizontal: 3, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9F67F5', backgroundColor: '#231A40', borderRightWidth: 0.5, borderRightColor: 'rgba(124,58,237,0.3)' },
  encNombre:   { textAlign: 'left', paddingLeft: 10 },
  celda:       { paddingVertical: 9, paddingHorizontal: 3, fontSize: 12, color: '#F5F0FF' },
  celdaNombre: { fontWeight: '500', color: '#F5F0FF', paddingLeft: 10 },
  puestoTxt:   { textAlign: 'center', color: '#A89FC0', fontWeight: '700', fontSize: 11 },
  notaRoja:    { color: '#F87171', fontWeight: '700' },
  notaVacia:   { color: '#5A5070' },
  faltasTxt:   { textAlign: 'center', color: '#A89FC0' },
  promTxt:     { textAlign: 'center', fontWeight: '800', fontSize: 13, color: '#10B981' },
  pdfBtn:      { justifyContent: 'center', alignItems: 'center', paddingVertical: 9 },
  exportBtn:   { backgroundColor: '#7C3AED', marginHorizontal: 12, marginVertical: 6, paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  exportTxt:   { color: '#F5F0FF', fontWeight: '700', fontSize: 14 },
  resumenBar:  { backgroundColor: '#150F2A', paddingVertical: 10, alignItems: 'center', borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)' },
  resumenTxt:  { color: '#5A5070', fontSize: 11 },
});
