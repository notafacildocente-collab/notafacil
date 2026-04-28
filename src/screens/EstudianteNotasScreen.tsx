import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { apiFetch } from '../services/api';

interface Desempeno {
  nombre: string;
  porcentaje: number;
  promedio: number;
  cantidadNotas: number;
}

interface NotaMateria {
  materiaId: string;
  materia: string;
  desempenos: Desempeno[];
  notaFinal: number;
}

export default function EstudianteNotasScreen() {
  const [notas, setNotas] = useState<NotaMateria[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);

  useEffect(() => {
    cargarNotas();
  }, []);

  const cargarNotas = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/estudiante/notas');
      if (res.ok) {
        setNotas(await res.json());
      } else {
        Alert.alert('Error', 'No se pudieron cargar las notas');
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
        <Text style={styles.loadingText}>Cargando notas...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titulo}>Mis Notas — Período Actual</Text>

      {notas.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay notas registradas aún</Text>
        </View>
      ) : (
        notas.map((materia) => {
          const abierta = expandida === materia.materiaId;
          const aprobado = materia.notaFinal >= 3.0;

          return (
            <TouchableOpacity
              key={materia.materiaId}
              style={styles.materiaCard}
              onPress={() => setExpandida(abierta ? null : materia.materiaId)}
            >
              <View style={styles.materiaHeader}>
                <View style={styles.materiaInfo}>
                  <Text style={styles.materiaNombre}>{materia.materia}</Text>
                  <Text style={styles.materiaSubtitulo}>
                    {abierta ? 'Toca para cerrar' : 'Toca para ver detalle'}
                  </Text>
                </View>
                <View style={[styles.notaBadge, { backgroundColor: aprobado ? '#10b981' : '#ef4444' }]}>
                  <Text style={styles.notaBadgeText}>{materia.notaFinal.toFixed(1)}</Text>
                </View>
              </View>

              {abierta && (
                <View style={styles.desempenosContainer}>
                  {materia.desempenos.map((d) => (
                    <View key={d.nombre} style={styles.desempenoFila}>
                      <View style={styles.desempenoInfo}>
                        <Text style={styles.desempenoNombre}>{d.nombre}</Text>
                        <Text style={styles.desempenoPeso}>{d.porcentaje}% — {d.cantidadNotas} nota{d.cantidadNotas !== 1 ? 's' : ''}</Text>
                      </View>
                      <Text style={[
                        styles.desempenoPromedio,
                        { color: d.promedio === 0 ? '#9ca3af' : d.promedio >= 3 ? '#10b981' : '#ef4444' }
                      ]}>
                        {d.promedio.toFixed(1)}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.separador} />
                  <View style={styles.totalFila}>
                    <Text style={styles.totalLabel}>Nota Final</Text>
                    <Text style={[styles.totalValor, { color: aprobado ? '#10b981' : '#ef4444' }]}>
                      {materia.notaFinal.toFixed(1)}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })
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
  materiaCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 10, elevation: 2,
  },
  materiaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  materiaInfo: { flex: 1 },
  materiaNombre: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  materiaSubtitulo: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  notaBadge: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 54 },
  notaBadgeText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  desempenosContainer: { marginTop: 14 },
  desempenoFila: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  desempenoInfo: { flex: 1 },
  desempenoNombre: { fontSize: 13, fontWeight: '600', color: '#374151' },
  desempenoPeso: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  desempenoPromedio: { fontSize: 20, fontWeight: '800' },
  separador: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  totalFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  totalValor: { fontSize: 24, fontWeight: '800' },
});