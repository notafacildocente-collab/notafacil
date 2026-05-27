import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Share,
} from 'react-native';
import { apiFetch } from '../services/api';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
}

export default function ReporteScreen({ route, navigation }: any) {
  const {
    asignacionId, materiaId, materiaNombre,
    periodoId, periodoNumero, cursoId,
  } = route.params || {};

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState<string | null>(null);

  useEffect(() => { cargarEstudiantes(); }, []);

  const cargarEstudiantes = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/notas/estudiantes/${asignacionId}`);
      if (!res.ok) throw new Error('Error');
      setEstudiantes(await res.json());
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const generarYCompartir = async (est: Estudiante) => {
    if (generando) return;
    setGenerando(est.id);
    try {
      const res = await apiFetch('/api/reporte/generar', {
        method: 'POST',
        body: JSON.stringify({ estudianteId: est.id, periodoId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al generar');
      }
      const { url } = await res.json();

      const mensaje =
        `*Reporte de ${est.nombre} ${est.apellido}*\n` +
        `Período ${periodoNumero}\n\n` +
        `Le compartimos el reporte académico de su hijo/a. ` +
        `Puede ver las notas, lo que falta por sacar y cómo va el período en este link:\n\n` +
        `${url}\n\n` +
        `_Este link es personal y privado, por favor no lo comparta._\n\n` +
        `NotaFácil Docente`;

      // Compartir abre el menú nativo del celular (WhatsApp, mensajes, copiar, etc.)
      await Share.share({ message: mensaje });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo generar el reporte');
    } finally {
      setGenerando(null);
    }
  };

  const verEnNavegador = async (est: Estudiante) => {
    if (generando) return;
    setGenerando(est.id);
    try {
      const res = await apiFetch('/api/reporte/generar', {
        method: 'POST',
        body: JSON.stringify({ estudianteId: est.id, periodoId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al generar');
      }
      const { url } = await res.json();
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo abrir el reporte');
    } finally {
      setGenerando(null);
    }
  };

  const irAConfigurar = () => {
    navigation.navigate('ConfigurarDesempenos', {
      materiaId, materiaNombre, periodoId, periodoNumero,
    });
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
        <Text style={styles.headerSub}>Período {periodoNumero} · {estudiantes.length} estudiantes</Text>
      </View>

      <TouchableOpacity style={styles.configBtn} onPress={irAConfigurar}>
        <Text style={styles.configTxt}>⚙️  Configurar # de notas por desempeño</Text>
        <Text style={styles.configHint}>
          Para que los padres vean cuántas notas faltan y proyecciones
        </Text>
      </TouchableOpacity>

      <FlatList
        data={estudiantes}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 12, paddingTop: 0 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>
                  {item.nombre.charAt(0)}{item.apellido.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.estNombre}>{item.apellido}, {item.nombre}</Text>
                <Text style={styles.estDoc}>Doc: {item.numeroDocumento}</Text>
              </View>
            </View>
            <View style={styles.cardBotones}>
              <TouchableOpacity
                style={[styles.btn, styles.btnVer]}
                onPress={() => verEnNavegador(item)}
                disabled={!!generando}
              >
                {generando === item.id ? (
                  <ActivityIndicator size="small" color="#1a3a6b" />
                ) : (
                  <Text style={styles.btnVerTxt}>👁  Ver reporte</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnEnviar]}
                onPress={() => generarYCompartir(item)}
                disabled={!!generando}
              >
                {generando === item.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.btnEnviarTxt}>📤  Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: '#6b7280' }}>Sin estudiantes en este curso</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  header: { backgroundColor: '#1a3a6b', padding: 16 },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 18 },
  headerSub: { color: '#93c5fd', fontSize: 13, marginTop: 2 },
  configBtn: {
    backgroundColor: '#fffbeb', margin: 12, borderRadius: 10,
    padding: 14, borderLeftWidth: 4, borderLeftColor: '#f59e0b',
  },
  configTxt: { color: '#92400e', fontWeight: '700', fontSize: 14 },
  configHint: { color: '#78350f', fontSize: 12, marginTop: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    marginBottom: 10, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#dbeafe',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarTxt: { color: '#1a3a6b', fontWeight: '700', fontSize: 14 },
  estNombre: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  estDoc: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  cardBotones: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  btnVer: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  btnVerTxt: { color: '#1a3a6b', fontWeight: '700', fontSize: 13 },
  btnEnviar: { backgroundColor: '#059669' },
  btnEnviarTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
