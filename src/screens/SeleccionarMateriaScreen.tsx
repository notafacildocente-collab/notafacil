import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../services/api';
import { cerrarSesionGlobal } from '../services/auth';

interface Materia {
  id: string;
  nombre: string;
  codigo: string;
  asignacionId: string;
}

export default function SeleccionarMateriaScreen({ navigation }: any) {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [periodoInfo, setPeriodoInfo] = useState<{ id: string; numero: number } | null>(null);
  const rolRef = useRef<string | null>(null);

  useEffect(() => {
    const iniciar = async () => {
      const rol = await SecureStore.getItemAsync('rol');
      rolRef.current = rol;

      if (rol === 'RECTOR') {
        navigation.replace('Rector');
        return;
      }
      if (rol !== 'PROFESOR') {
        Alert.alert('Acceso restringido', 'Esta aplicación es exclusiva para profesores.');
        return;
      }
      await cargarMaterias();
    };

    iniciar();

    const unsubscribe = navigation.addListener('focus', () => {
      if (rolRef.current === 'PROFESOR') {
        cargarMaterias();
      }
    });
    return unsubscribe;
  }, [navigation]);

  const cargarMaterias = async () => {
    try {
      setLoading(true);
      const nombreGuardado = await SecureStore.getItemAsync('nombre');
      if (nombreGuardado) setNombre(nombreGuardado);

      const response = await apiFetch('/api/notas/mis-materias');
      if (response.ok) {
        const data = await response.json();
        setMaterias(data);
        // Obtener cursoId y periodoId de la primera asignación para el boletín
        if (data.length > 0) {
          const resPer = await apiFetch('/api/notas/periodos');
          if (resPer.ok) {
            const periodos = await resPer.json();
            if (periodos.length > 0) {
              // Tomar el período abierto (cerrado = false), si no el de mayor número
              const periodo = periodos.find((p: any) => !p.cerrado) || periodos[periodos.length - 1];
              setPeriodoInfo({ id: periodo.id, numero: periodo.numero });
              // Obtener cursoId de la primera asignación
              const resAsig = await apiFetch(
                `/api/notas/asignacion?materiaId=${data[0].id}&periodoId=${periodo.id}`
              );
              if (resAsig.ok) {
                const asig = await resAsig.json();
                setCursoId(asig.cursoId);
              }
            }
          }
        }
      } else {
        Alert.alert('Error', 'No se pudieron cargar las materias');
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudo conectar al servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Está seguro que desea salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => cerrarSesionGlobal(),
        },
      ],
    );
  };

  if (loading && rolRef.current !== 'RECTOR' && rolRef.current !== 'ESTUDIANTE') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={styles.loadingText}>Cargando materias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bienvenida,</Text>
          <Text style={styles.nombre}>{nombre || 'Profesora'}</Text>
        </View>
        <View style={styles.headerBotones}>
          <TouchableOpacity
            style={styles.botonHorario}
            onPress={() => navigation.navigate('Horario')}
          >
            <Text style={styles.botonHorarioTexto}>Mi Horario</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botonSalir}
            onPress={cerrarSesion}
          >
            <Text style={styles.botonSalirTexto}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {materias.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay materias asignadas</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={cargarMaterias}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={materias}
          keyExtractor={(item) => item.id}
          ListFooterComponent={() =>
            cursoId && periodoInfo ? (
              <TouchableOpacity
                style={styles.botonBoletin}
                onPress={() =>
                  navigation.navigate('Boletin', {
                    cursoId,
                    periodoId: periodoInfo.id,
                    periodoNumero: periodoInfo.numero,
                  })
                }
              >
                <Text style={styles.botonBoletinTexto}>📋  Boletín del Curso</Text>
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.materiaNombre}>{item.nombre}</Text>
                  <Text style={styles.materiaCodigo}>{item.codigo}</Text>
                </View>
              </View>

              <View style={styles.cardBotones}>
                <TouchableOpacity
                  style={[styles.boton, styles.botonCalificar]}
                  onPress={() =>
                    navigation.navigate('SeleccionarPeriodo', {
                      materiaId: item.id,
                      materiaNombre: item.nombre,
                      modo: 'calificar',
                    })
                  }
                >
                  <Text style={styles.botonTexto}>Calificar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boton, styles.botonAsistencia]}
                  onPress={() =>
                    navigation.navigate('SeleccionarPeriodo', {
                      materiaId: item.id,
                      materiaNombre: item.nombre,
                      modo: 'asistencia',
                    })
                  }
                >
                  <Text style={styles.botonTexto}>Asistencia</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boton, styles.botonPlanilla]}
                  onPress={() =>
                    navigation.navigate('SeleccionarPeriodo', {
                      materiaId: item.id,
                      materiaNombre: item.nombre,
                      modo: 'planilla',
                    })
                  }
                >
                  <Text style={styles.botonTexto}>Planilla</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.boton, styles.botonCalificarIA]}
                  onPress={() =>
                    navigation.navigate('SeleccionarPeriodo', {
                      materiaId: item.id,
                      materiaNombre: item.nombre,
                      modo: 'calificarIA',
                    })
                  }
                >
                  <Text style={styles.botonTexto}>Calif. IA</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    marginBottom: 20, padding: 16, backgroundColor: '#1a3a6b',
    borderRadius: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { fontSize: 14, color: '#94a3b8' },
  nombre: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerBotones: { flexDirection: 'row', gap: 8 },
  botonHorario: {
    backgroundColor: '#f59e0b', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 8,
  },
  botonHorarioTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  botonSalir: {
    backgroundColor: '#ef4444', paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 8,
  },
  botonSalirTexto: { color: '#fff', fontWeight: '700', fontSize: 12 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  emptyText: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  retryBtn: { backgroundColor: '#1a3a6b', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  card: {
    backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 12, elevation: 2, overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, paddingBottom: 12,
  },
  cardInfo: { flex: 1 },
  materiaNombre: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  materiaCodigo: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  cardBotones: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  boton: {
    flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  botonCalificar: { backgroundColor: '#1a3a6b' },
  botonAsistencia: { backgroundColor: '#059669' },
  botonPlanilla: { backgroundColor: '#7c3aed' },
  botonCalificarIA: { backgroundColor: '#7c3aed' },
  botonTexto: { color: '#fff', fontWeight: '600', fontSize: 11 },
  botonBoletin: {
    backgroundColor: '#dc2626', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 8, marginBottom: 24, elevation: 3,
  },
  botonBoletinTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
