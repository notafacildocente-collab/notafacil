import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

interface NotaMateria {
  materiaId: string;
  materia: string;
  desempenos: {
    id: string;
    nombre: string;
    notas: number[];
    promedio: number;
    cantidadNotas: number;
  }[];
  notaFinal: number;
}

export default function EstudianteNotasScreen({ navigation }: any) {
  const [notas, setNotas] = useState<NotaMateria[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);

  useEffect(() => { cargarNotas(); }, []);

  const cargarNotas = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/estudiante/notas');
      if (res.ok) setNotas(await res.json());
      else Alert.alert('Error', 'No se pudieron cargar las notas');
    } catch (e: any) {
      if (e.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo conectar');
    } finally { setLoading(false); }
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
            <Text style={styles.headerTitulo}>Mis Notas</Text>
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Cargando notas...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitulo}>Mis Notas</Text>
          <Text style={styles.headerSub}>Período actual</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.lista} showsVerticalScrollIndicator={false}>
        {notas.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="document-text-outline" size={48} color={Colors.text3} />
            <Text style={styles.emptyText}>No hay notas registradas aún</Text>
          </View>
        ) : (
          notas.map((materia) => {
            const abierta = expandida === materia.materiaId;
            const aprobado = materia.notaFinal >= 3.0;
            const sinNota = materia.notaFinal === 0;

            return (
              <TouchableOpacity
                key={materia.materiaId}
                style={styles.materiaCard}
                onPress={() => setExpandida(abierta ? null : materia.materiaId)}
                activeOpacity={0.78}
              >
                <View style={styles.materiaHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.materiaNombre}>{materia.materia}</Text>
                    <Text style={styles.materiaHint}>
                      {abierta ? 'Toca para cerrar' : `${materia.desempenos.length} desempeño${materia.desempenos.length !== 1 ? 's' : ''}`}
                    </Text>
                  </View>
                  <View style={[
                    styles.notaBadge,
                    sinNota ? styles.badgeSinNota : aprobado ? styles.badgeAprobado : styles.badgeReprobado,
                  ]}>
                    <Text style={styles.notaBadgeText}>
                      {sinNota ? '—' : materia.notaFinal.toFixed(1)}
                    </Text>
                  </View>
                </View>

                {abierta && (
                  <View style={styles.detalle}>
                    {materia.desempenos.map((d, idx) => (
                      <View key={d.id || `${d.nombre}-${idx}`} style={styles.desempenoFila}>
                        <Text style={styles.desempenoNombre}>{d.nombre}</Text>
                        {d.notas.length === 0 ? (
                          <Text style={styles.sinNota}>—</Text>
                        ) : (
                          <View style={styles.notasRow}>
                            {d.notas.map((v, i) => (
                              <View
                                key={i}
                                style={[
                                  styles.notaChip,
                                  v >= 3 ? styles.chipAprobado : styles.chipReprobado,
                                ]}
                              >
                                <Text style={styles.notaChipTxt}>{v.toFixed(1)}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}

                    <View style={styles.finalRow}>
                      <Text style={styles.finalLabel}>Nota Final</Text>
                      <Text style={[
                        styles.finalValor,
                        sinNota ? { color: Colors.text3 } : aprobado ? { color: Colors.success } : { color: Colors.danger },
                      ]}>
                        {sinNota ? '—' : materia.notaFinal.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
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
  headerSub:    { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },

  loadingText: { color: Colors.text3, marginTop: Spacing.md },
  emptyText:   { color: Colors.text3, fontSize: Typography.base, marginTop: Spacing.md, textAlign: 'center' },
  lista:       { padding: Spacing.lg },

  materiaCard: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  materiaHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  materiaNombre:  { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text1 },
  materiaHint:    { fontSize: Typography.xs, color: Colors.text3, marginTop: 2 },
  notaBadge:      { borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 8, minWidth: 54, alignItems: 'center' },
  badgeAprobado:  { backgroundColor: Colors.success },
  badgeReprobado: { backgroundColor: Colors.danger },
  badgeSinNota:   { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  notaBadgeText:  { color: '#fff', fontSize: 18, fontWeight: Typography.extrabold },

  // Detalle desempeños
  detalle: { marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md },
  desempenoFila: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border,
    gap: 10,
  },
  desempenoNombre: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.text1, flex: 1 },
  sinNota: { fontSize: Typography.base, color: Colors.text3, fontWeight: Typography.bold },
  notasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end', flex: 1 },
  notaChip:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipAprobado: { backgroundColor: Colors.successBg },
  chipReprobado:{ backgroundColor: Colors.dangerBg },
  notaChipTxt:  { fontSize: Typography.sm, fontWeight: Typography.extrabold, color: Colors.text1 },

  finalRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 6 },
  finalLabel:{ fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.text1 },
  finalValor:{ fontSize: 22, fontWeight: Typography.extrabold },
});
