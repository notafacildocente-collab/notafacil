import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { apiFetch } from '../services/api';

interface Periodo {
  id: string;
  numero: number;
  fechaInicio: string;
  fechaFin: string;
  cerrado: boolean;
}

export default function SeleccionarPeriodoScreen({ navigation, route }: any) {
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [navegando, setNavegando] = useState(false);
  const { materiaId, materiaNombre, modo = 'calificar' } = route.params || {};

  useEffect(() => {
    cargarPeriodos();
  }, []);

  const cargarPeriodos = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/notas/periodos');
      if (response.ok) {
        const data = await response.json();
        setPeriodos(data);
      } else {
        Alert.alert('Error', 'No se pudieron cargar los periodos');
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudo conectar al servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarPeriodo = async (periodo: Periodo) => {
    // Los modos 'reporte', 'calificarIA' y 'riesgoIA' permiten ver períodos cerrados
    if (periodo.cerrado && modo !== 'reporte' && modo !== 'calificarIA' && modo !== 'riesgoIA') {
      Alert.alert('Periodo cerrado', 'Este periodo no permite modificaciones.');
      return;
    }
    if (navegando) return;
    setNavegando(true);
    try {
      const response = await apiFetch(
        `/api/notas/asignacion?materiaId=${materiaId}&periodoId=${periodo.id}`,
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        Alert.alert('Sin asignacion', err.message || 'No tienes asignacion para este periodo.');
        return;
      }
      const { asignacionId, cursoId } = await response.json();
      const params = {
        asignacionId,
        materiaId,
        materiaNombre,
        periodoId: periodo.id,
        periodoNumero: periodo.numero,
        cursoId,
      };
      if (modo === 'asistencia') {
        navigation.navigate('Asistencia', params);
      } else if (modo === 'planilla') {
        navigation.navigate('Planilla', params);
      } else if (modo === 'reporte') {
        navigation.navigate('Reporte', params);
      } else if (modo === 'calificarIA') {
        navigation.navigate('CalificarIA', params);
      } else if (modo === 'riesgoIA') {
        navigation.navigate('Riesgo', { ...params, materiaNombre, periodoNumero: periodo.numero });
      } else {
        navigation.navigate('Calificacion', params);
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudo conectar al servidor.');
      }
    } finally {
      setNavegando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={styles.loadingText}>Cargando periodos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.materiaNombre}>{materiaNombre}</Text>
        <Text style={styles.subtitle}>Selecciona el periodo</Text>
      </View>
      {periodos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay periodos disponibles</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={cargarPeriodos}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={periodos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, item.cerrado && modo !== 'reporte' && modo !== 'calificarIA' && modo !== 'riesgoIA' && styles.cardCerrado]}
              onPress={() => handleSeleccionarPeriodo(item)}
              disabled={navegando}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.periodoNumero}>Periodo {item.numero}</Text>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.fechas}>
                  {item.fechaInicio?.slice(0, 10)} - {item.fechaFin?.slice(0, 10)}
                </Text>
                {item.cerrado && <Text style={styles.cerradoBadge}>Cerrado</Text>}
              </View>
              {navegando ? (
                <ActivityIndicator size="small" color="#1a3a6b" style={{ marginLeft: 8 }} />
              ) : (
                <Text style={styles.arrow}>›</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    marginBottom: 16,
    padding: 18,
    backgroundColor: '#1E3A5F',
    borderRadius: 14,
  },
  materiaNombre: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: '#93C5FD', marginTop: 4, letterSpacing: 0.3 },
  loadingText: { marginTop: 12, color: '#64748B' },
  emptyText: { fontSize: 15, color: '#64748B', marginBottom: 16 },
  retryBtn: {
    backgroundColor: '#1E3A5F', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardCerrado: { opacity: 0.55 },
  cardLeft: { flex: 1 },
  cardRight: { alignItems: 'flex-end', marginRight: 10 },
  periodoNumero: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  fechas: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  cerradoBadge: {
    fontSize: 11, fontWeight: '600', marginTop: 5,
    color: '#64748B', backgroundColor: '#F1F5F9',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  arrow: { fontSize: 22, color: '#94A3B8', fontWeight: '300' },
});
