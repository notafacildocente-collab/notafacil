import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { apiFetch } from '../services/api';

interface Desempeno {
  id: string;
  nombre: string;
  notasPlaneadas: number | null;
  porcentaje: number;
  orden: number | null;
}

export default function ConfigurarDesempenosScreen({ route, navigation }: any) {
  const { materiaId, materiaNombre, periodoId, periodoNumero } = route.params || {};
  const [desempenos, setDesempenos] = useState<Desempeno[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(
        `/api/notas/desempenos/${periodoId}?materiaId=${materiaId}`,
      );
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      setDesempenos(data);
      const inicial: Record<string, string> = {};
      data.forEach((d: Desempeno) => {
        inicial[d.id] = d.notasPlaneadas != null ? String(d.notasPlaneadas) : '';
      });
      setValores(inicial);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los desempeños');
    } finally {
      setLoading(false);
    }
  };

  const guardar = async () => {
    // Validar
    for (const d of desempenos) {
      const v = valores[d.id];
      if (!v || v.trim() === '') {
        Alert.alert('Faltan datos', `Indica cuántas notas planeas en "${d.nombre}"`);
        return;
      }
      const n = parseInt(v);
      if (isNaN(n) || n < 1 || n > 50) {
        Alert.alert('Valor inválido', `"${d.nombre}": debe ser un número entre 1 y 50`);
        return;
      }
    }

    setGuardando(true);
    try {
      // Guardar cada desempeño
      for (const d of desempenos) {
        const n = parseInt(valores[d.id]);
        if (d.notasPlaneadas === n) continue; // no cambió
        const res = await apiFetch(`/api/notas/desempenos/${d.id}/notas-planeadas`, {
          method: 'PUT',
          body: JSON.stringify({ notasPlaneadas: n }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Error al guardar');
        }
      }
      Alert.alert('✅ Guardado', 'La configuración se guardó correctamente.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{materiaNombre}</Text>
        <Text style={styles.headerSub}>Período {periodoNumero}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.info}>
          <Text style={styles.infoTitle}>¿Cuántas notas piensas poner?</Text>
          <Text style={styles.infoText}>
            Esta información se usa para que la app pueda decirle a los padres cuántas
            notas faltan y cuál es el mínimo que su hijo necesita para pasar.
          </Text>
        </View>

        {desempenos.map((d) => (
          <View key={d.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.desNombre}>{d.nombre}</Text>
              <Text style={styles.desMeta}>Peso: {Number(d.porcentaje).toFixed(0)}%</Text>
            </View>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              maxLength={2}
              placeholder="0"
              value={valores[d.id] || ''}
              onChangeText={(t) => setValores({ ...valores, [d.id]: t.replace(/[^0-9]/g, '') })}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.guardarBtn, guardando && { opacity: 0.6 }]}
          onPress={guardar}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.guardarTxt}>Guardar configuración</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#1a3a6b', padding: 16 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerSub: { color: '#93c5fd', fontSize: 13, marginTop: 2 },
  info: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 14,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#1a3a6b',
  },
  infoTitle: { color: '#1a3a6b', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  infoText: { color: '#374151', fontSize: 13, lineHeight: 18 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center',
    elevation: 1,
  },
  desNombre: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  desMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  input: {
    width: 64, height: 48, borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 8, fontSize: 18, fontWeight: '700',
    textAlign: 'center', backgroundColor: '#f9fafb', color: '#1f2937',
  },
  guardarBtn: {
    backgroundColor: '#1a3a6b', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16, elevation: 2,
  },
  guardarTxt: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
