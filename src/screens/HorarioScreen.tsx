import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { apiFetch } from '../services/api';
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

const COLORES: Record<string, string> = {
  'Matemáticas':       '#1a3a6b',
  'Lenguaje':          '#059669',
  'Ciencias Naturales':'#0891b2',
  'Ciencias Sociales': '#7c3aed',
  'Ética':             '#b45309',
  'Religión':          '#be185d',
  'Artística':         '#c2410c',
  'Educación Física':  '#15803d',
  'Inglés':            '#1d4ed8',
};

export default function HorarioScreen() {
  const hoy = new Date().getDay();
  const diaInicial = hoy === 0 || hoy === 6 ? 1 : hoy;
  const [diaActivo, setDiaActivo] = useState(diaInicial);
  const [horario, setHorario] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarHorario();
  }, [diaActivo]);

  const cargarHorario = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/notas/horario?dia=${diaActivo}`);
      if (!res.ok) throw new Error('Error cargando horario');
      const data = await res.json();
      setHorario(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el horario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.flex}>
      {/* Selector de días */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diasScroll}>
        {[1, 2, 3, 4, 5].map((dia) => (
          <TouchableOpacity
            key={dia}
            style={[styles.diaBtn, diaActivo === dia && styles.diaBtnActivo]}
            onPress={() => setDiaActivo(dia)}
          >
            <Text style={[styles.diaBtnText, diaActivo === dia && styles.diaBtnTextActivo]}>
              {DIAS[dia]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1a3a6b" />
        </View>
      ) : horario.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Sin clases este día</Text>
        </View>
      ) : (
        <ScrollView style={styles.lista} contentContainerStyle={styles.listaPadding}>
          {horario.map((bloque, idx) => (
            <View key={idx} style={[styles.bloque, { borderLeftColor: COLORES[bloque.materia] || '#1a3a6b' }]}>
              <View style={styles.horaBox}>
                <Text style={styles.horaInicio}>{bloque.horaInicio}</Text>
                <Text style={styles.horaLinea}>|</Text>
                <Text style={styles.horaFin}>{bloque.horaFin}</Text>
              </View>
              <View style={styles.bloqueInfo}>
                <Text style={[styles.bloqueMateria, { color: COLORES[bloque.materia] || '#1a3a6b' }]}>
                  {bloque.materia}
                </Text>
                <Text style={styles.bloqueCurso}>{bloque.curso}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6b7280' },
  diasScroll: {
    backgroundColor: '#1a3a6b', maxHeight: 52,
  },
  diaBtn: {
    paddingHorizontal: 20, paddingVertical: 14,
  },
  diaBtnActivo: { borderBottomWidth: 3, borderBottomColor: '#f59e0b' },
  diaBtnText: { color: '#93c5fd', fontWeight: '600', fontSize: 14 },
  diaBtnTextActivo: { color: '#fff' },
  lista: { flex: 1 },
  listaPadding: { padding: 16 },
  bloque: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    borderLeftWidth: 5, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3,
  },
  horaBox: { alignItems: 'center', marginRight: 16, minWidth: 50 },
  horaInicio: { fontSize: 13, fontWeight: '700', color: '#1f2937' },
  horaLinea: { fontSize: 10, color: '#9ca3af' },
  horaFin: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  bloqueInfo: { flex: 1 },
  bloqueMateria: { fontSize: 15, fontWeight: '700' },
  bloqueCurso: { fontSize: 12, color: '#6b7280', marginTop: 2 },
});