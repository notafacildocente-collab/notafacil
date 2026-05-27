import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { apiFetch } from '../services/api';
const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

// Paleta de acento única — se escoge por índice al renderizar
const ACENTO_COLORES = [
  '#1E3A5F', '#2563EB', '#0369A1', '#047857', '#374151',
];

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
          {horario.map((bloque, idx) => {
            const acento = ACENTO_COLORES[idx % ACENTO_COLORES.length];
            return (
              <View key={idx} style={[styles.bloque, { borderLeftColor: acento }]}>
                <View style={styles.horaBox}>
                  <Text style={styles.horaInicio}>{bloque.horaInicio}</Text>
                  <Text style={styles.horaLinea}>·</Text>
                  <Text style={styles.horaFin}>{bloque.horaFin}</Text>
                </View>
                <View style={styles.bloqueInfo}>
                  <Text style={[styles.bloqueMateria, { color: acento }]}>{bloque.materia}</Text>
                  <Text style={styles.bloqueCurso}>{bloque.curso}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F1F5F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#64748B' },

  diasScroll: { backgroundColor: '#1E3A5F', maxHeight: 52 },
  diaBtn: { paddingHorizontal: 18, paddingVertical: 14 },
  diaBtnActivo: { borderBottomWidth: 3, borderBottomColor: '#2563EB' },
  diaBtnText: { color: '#93C5FD', fontWeight: '500', fontSize: 13 },
  diaBtnTextActivo: { color: '#FFFFFF', fontWeight: '700' },

  lista: { flex: 1 },
  listaPadding: { padding: 16 },

  bloque: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  horaBox: { alignItems: 'center', marginRight: 16, minWidth: 50 },
  horaInicio: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  horaLinea: { fontSize: 12, color: '#CBD5E1', marginVertical: 1 },
  horaFin: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  bloqueInfo: { flex: 1 },
  bloqueMateria: { fontSize: 14, fontWeight: '700' },
  bloqueCurso: { fontSize: 12, color: '#64748B', marginTop: 3 },
});