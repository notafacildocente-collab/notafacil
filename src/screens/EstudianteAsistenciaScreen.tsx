import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { apiFetch } from '../services/api';

export default function EstudianteAsistenciaScreen() {
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarAsistencia();
  }, []);

  const cargarAsistencia = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/estudiante/asistencia');
      if (res.ok) {
        setAsistencia(await res.json());
      } else {
        Alert.alert('Error', 'No se pudo cargar la asistencia');
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudo conectar al servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={styles.loadingText}>Cargando asistencia...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Mi Asistencia — Período Actual</Text>

      {asistencia.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay registros de asistencia aún</Text>
        </View>
      ) : (
        asistencia.map((item, idx) => (
          <View key={idx} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.materia}>{item.materia}</Text>
              <View style={[
                styles.porcentajeBadge,
                { backgroundColor: item.porcentaje >= 80 ? '#10b981' : item.porcentaje >= 60 ? '#f59e0b' : '#ef4444' }
              ]}>
                <Text style={styles.porcentajeText}>{item.porcentaje}%</Text>
              </View>
            </View>

            {/* Barra de progreso */}
            <View style={styles.barraFondo}>
              <View style={[
                styles.barraRelleno,
                {
                  width: `${item.porcentaje}%` as any,
                  backgroundColor: item.porcentaje >= 80 ? '#10b981' : item.porcentaje >= 60 ? '#f59e0b' : '#ef4444',
                }
              ]} />
            </View>

            {/* Conteos */}
            <View style={styles.conteosRow}>
              <View style={styles.conteoItem}>
                <Text style={styles.conteoNumero}>{item.PRESENTE}</Text>
                <Text style={styles.conteoLabel}>Presente</Text>
              </View>
              <View style={styles.conteoItem}>
                <Text style={[styles.conteoNumero, { color: '#ef4444' }]}>{item.AUSENTE}</Text>
                <Text style={styles.conteoLabel}>Ausente</Text>
              </View>
              <View style={styles.conteoItem}>
                <Text style={[styles.conteoNumero, { color: '#f59e0b' }]}>{item.TARDE}</Text>
                <Text style={styles.conteoLabel}>Tarde</Text>
              </View>
              <View style={styles.conteoItem}>
                <Text style={[styles.conteoNumero, { color: '#3b82f6' }]}>{item.EXCUSADO}</Text>
                <Text style={styles.conteoLabel}>Excusado</Text>
              </View>
            </View>
          </View>
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  titulo: { fontSize: 18, fontWeight: '700', color: '#1a3a6b', marginBottom: 16 },
  emptyText: { fontSize: 15, color: '#9ca3af', fontStyle: 'italic' },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  materia: { fontSize: 15, fontWeight: '700', color: '#1f2937', flex: 1 },
  porcentajeBadge: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12,
  },
  porcentajeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  barraFondo: {
    height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginBottom: 12,
  },
  barraRelleno: { height: 8, borderRadius: 4 },
  conteosRow: { flexDirection: 'row', justifyContent: 'space-around' },
  conteoItem: { alignItems: 'center' },
  conteoNumero: { fontSize: 20, fontWeight: '800', color: '#10b981' },
  conteoLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
});