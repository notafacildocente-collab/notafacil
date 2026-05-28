import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity, StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../services/api';

interface EstudiantePlanilla {
  estudianteId: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
  notaFinal: number;
  faltasTotales: number;
}

export default function ListadoEstudiantesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { asignacionId, periodoId, materiaNombre, periodoNumero, cursoId } = (route.params || {}) as any;

  const [estudiantes, setEstudiantes] = useState<EstudiantePlanilla[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/notas/planilla?asignacionId=${asignacionId}&periodoId=${periodoId}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      // Ordenar por apellido + nombre
      const ordenados = [...data].sort((a: any, b: any) =>
        `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es'),
      );
      setEstudiantes(ordenados);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el listado de estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const colorNota = (nota: number) => {
    if (nota === 0) return '#94A3B8';
    return nota >= 3.0 ? '#16A34A' : '#DC2626';
  };

  const aprobados = estudiantes.filter((e) => e.notaFinal >= 3.0 && e.notaFinal > 0).length;
  const reprobados = estudiantes.filter((e) => e.notaFinal > 0 && e.notaFinal < 3.0).length;
  const sinNota = estudiantes.filter((e) => e.notaFinal === 0).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Cargando listado...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextos}>
          <Text style={styles.headerMateria} numberOfLines={1}>{materiaNombre}</Text>
          <Text style={styles.headerSub}>Listado de Estudiantes · Período {periodoNumero}</Text>
        </View>
      </View>

      {/* Resumen */}
      <View style={styles.resumenRow}>
        <View style={styles.resumenCard}>
          <Text style={styles.resumenNum}>{estudiantes.length}</Text>
          <Text style={styles.resumenLabel}>Total</Text>
        </View>
        <View style={[styles.resumenCard, { borderTopColor: '#16A34A' }]}>
          <Text style={[styles.resumenNum, { color: '#16A34A' }]}>{aprobados}</Text>
          <Text style={styles.resumenLabel}>Aprobados</Text>
        </View>
        <View style={[styles.resumenCard, { borderTopColor: '#DC2626' }]}>
          <Text style={[styles.resumenNum, { color: '#DC2626' }]}>{reprobados}</Text>
          <Text style={styles.resumenLabel}>Reprobados</Text>
        </View>
        <View style={[styles.resumenCard, { borderTopColor: '#94A3B8' }]}>
          <Text style={[styles.resumenNum, { color: '#94A3B8' }]}>{sinNota}</Text>
          <Text style={styles.resumenLabel}>Sin nota</Text>
        </View>
      </View>

      {/* Tabla */}
      <ScrollView style={styles.scrollOuter} showsVerticalScrollIndicator={false}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabla}>
            {/* Encabezado de tabla */}
            <View style={styles.tablaHeader}>
              <Text style={[styles.thCell, { width: 36 }]}>#</Text>
              <Text style={[styles.thCell, { width: 70 }]}>CÓDIGO</Text>
              <Text style={[styles.thCell, { width: 170 }]}>APELLIDOS</Text>
              <Text style={[styles.thCell, { width: 140 }]}>NOMBRES</Text>
              <Text style={[styles.thCell, { width: 56, textAlign: 'center' }]}>NOTA</Text>
              <Text style={[styles.thCell, { width: 56, textAlign: 'center' }]}>FALTAS</Text>
            </View>

            {/* Filas */}
            {estudiantes.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyText}>No hay estudiantes registrados</Text>
              </View>
            ) : (
              estudiantes.map((est, idx) => {
                const [apellidos, ...restoNombre] = est.apellido
                  ? [est.apellido.toUpperCase(), est.nombre.toUpperCase()]
                  : [est.nombre.toUpperCase().split(' ').slice(0, 2).join(' '), est.nombre.toUpperCase().split(' ').slice(2).join(' ')];
                const filaPar = idx % 2 === 0;

                return (
                  <View key={est.estudianteId} style={[styles.fila, filaPar ? styles.filaPar : styles.filaImpar]}>
                    <Text style={[styles.tdCell, { width: 36, color: '#64748B' }]}>{idx + 1}</Text>
                    <Text style={[styles.tdCell, { width: 70, color: '#64748B' }]}>{est.numeroDocumento}</Text>
                    <Text style={[styles.tdCell, { width: 170, fontWeight: '600', color: '#0F172A' }]} numberOfLines={1}>
                      {est.apellido?.toUpperCase() || '—'}
                    </Text>
                    <Text style={[styles.tdCell, { width: 140, color: '#374151' }]} numberOfLines={1}>
                      {est.nombre?.toUpperCase() || '—'}
                    </Text>
                    <View style={[styles.tdCell, { width: 56, alignItems: 'center' }]}>
                      {est.notaFinal > 0 ? (
                        <Text style={[styles.notaValor, { color: colorNota(est.notaFinal) }]}>
                          {est.notaFinal.toFixed(1)}
                        </Text>
                      ) : (
                        <Text style={styles.sinNota}>—</Text>
                      )}
                    </View>
                    <View style={[styles.tdCell, { width: 56, alignItems: 'center' }]}>
                      <Text style={{ fontSize: 13, color: est.faltasTotales > 0 ? '#DC2626' : '#94A3B8', fontWeight: '600' }}>
                        {est.faltasTotales || 0}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 15 },

  // Header
  header: {
    backgroundColor: '#1E3A5F',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTextos: { flex: 1 },
  headerMateria: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#93C5FD', marginTop: 2 },

  // Resumen
  resumenRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  resumenCard: {
    flex: 1, alignItems: 'center',
    borderTopWidth: 3, borderTopColor: '#1E3A5F',
    paddingTop: 8,
  },
  resumenNum: { fontSize: 22, fontWeight: '800', color: '#1E3A5F' },
  resumenLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },

  // Tabla
  scrollOuter: { flex: 1 },
  tabla: { margin: 12, backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },

  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },

  fila: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  filaPar: { backgroundColor: '#FFFFFF' },
  filaImpar: { backgroundColor: '#F8FAFC' },

  tdCell: { fontSize: 13, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center' },

  notaValor: { fontSize: 14, fontWeight: '800' },
  sinNota: { fontSize: 13, color: '#CBD5E1' },

  emptyRow: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14 },
});
