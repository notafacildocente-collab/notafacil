import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { apiFetch } from '../services/api';

interface Asignacion {
  id: string;
  materia: string;
  curso: string;
  periodo: number;
  activa: boolean;
}

interface Materia {
  id: string;
  nombre: string;
}

interface Curso {
  id: string;
  nombre: string;
}

interface Periodo {
  id: string;
  numero: number;
  cerrado: boolean;
}

export default function AsignacionesProfesorScreen() {
  const route = useRoute();
  const { profesor } = (route.params || {}) as any;

  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Selección múltiple
  const [materiasSeleccionadas, setMateriasSeleccionadas] = useState<string[]>([]);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [periodosSeleccionados, setPeriodosSeleccionados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resAsg, resMat, resCur, resPer] = await Promise.all([
        apiFetch(`/api/rector/profesores/${profesor.id}/asignaciones`),
        apiFetch('/api/rector/materias'),
        apiFetch('/api/rector/cursos'),
        apiFetch('/api/rector/periodos'),
      ]);

      if (resAsg.ok) setAsignaciones(await resAsg.json());
      if (resMat.ok) setMaterias((await resMat.json()).filter((m: Materia) => m.nombre !== 'General'));
      if (resCur.ok) setCursos(await resCur.json());
      if (resPer.ok) setPeriodos(await resPer.json());
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudieron cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMateria = (id: string) => {
    setMateriasSeleccionadas(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const togglePeriodo = (id: string) => {
    setPeriodosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const seleccionarTodasMaterias = () => {
    if (materiasSeleccionadas.length === materias.length) {
      setMateriasSeleccionadas([]);
    } else {
      setMateriasSeleccionadas(materias.map(m => m.id));
    }
  };

  const seleccionarTodosPeriodos = () => {
    if (periodosSeleccionados.length === periodos.length) {
      setPeriodosSeleccionados([]);
    } else {
      setPeriodosSeleccionados(periodos.map(p => p.id));
    }
  };

  const handleAsignar = async () => {
    if (materiasSeleccionadas.length === 0 || !cursoSeleccionado || periodosSeleccionados.length === 0) {
      Alert.alert('Error', 'Seleccione al menos una materia, un curso y un período');
      return;
    }
    try {
      setGuardando(true);
      let exitosos = 0;

      for (const materiaId of materiasSeleccionadas) {
        for (const periodoId of periodosSeleccionados) {
          const res = await apiFetch(`/api/rector/profesores/${profesor.id}/asignar`, {
            method: 'POST',
            body: JSON.stringify({ materiaId, cursoId: cursoSeleccionado, periodoId }),
          });
          if (res.ok) exitosos++;
        }
      }

      Alert.alert('Éxito', `${exitosos} asignaciones creadas correctamente`);
      setMostrarFormulario(false);
      setMateriasSeleccionadas([]);
      setCursoSeleccionado('');
      setPeriodosSeleccionados([]);
      cargarDatos();
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudo conectar al servidor');
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = async (asignacion: Asignacion) => {
    Alert.alert(
      'Quitar asignación',
      `¿Quitar a ${profesor.nombre} de ${asignacion.materia} - ${asignacion.curso}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiFetch(`/api/rector/asignaciones/${asignacion.id}/desactivar`, {
                method: 'PUT',
              });
              if (res.ok) {
                Alert.alert('Éxito', 'Asignación removida');
                cargarDatos();
              }
            } catch (error: any) {
              if (error.message !== 'Sesión vencida') {
                Alert.alert('Error', 'No se pudo remover la asignación');
              }
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a6b" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerNombre}>{profesor.nombre}</Text>
        <Text style={styles.headerEmail}>{profesor.email}</Text>
      </View>

      <TouchableOpacity
        style={styles.agregarBtn}
        onPress={() => setMostrarFormulario(!mostrarFormulario)}
      >
        <Text style={styles.agregarBtnText}>
          {mostrarFormulario ? '✕ Cancelar' : '+ Asignar Materias'}
        </Text>
      </TouchableOpacity>

      {mostrarFormulario && (
        <View style={styles.formulario}>
          <Text style={styles.formularioTitulo}>Nueva Asignación</Text>

          {/* Materias */}
          <View style={styles.seccionHeader}>
            <Text style={styles.inputLabel}>
              Materias ({materiasSeleccionadas.length} seleccionadas)
            </Text>
            <TouchableOpacity onPress={seleccionarTodasMaterias}>
              <Text style={styles.seleccionarTodo}>
                {materiasSeleccionadas.length === materias.length ? 'Quitar todas' : 'Todas'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipsGrid}>
            {materias.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, materiasSeleccionadas.includes(m.id) && styles.chipActivo]}
                onPress={() => toggleMateria(m.id)}
              >
                <Text style={[styles.chipText, materiasSeleccionadas.includes(m.id) && styles.chipTextActivo]}>
                  {m.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Curso */}
          <Text style={styles.inputLabel}>Curso</Text>
          <View style={styles.chipsGrid}>
            {cursos.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, cursoSeleccionado === c.id && styles.chipActivo]}
                onPress={() => setCursoSeleccionado(c.id)}
              >
                <Text style={[styles.chipText, cursoSeleccionado === c.id && styles.chipTextActivo]}>
                  {c.nombre}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Períodos */}
          <View style={styles.seccionHeader}>
            <Text style={styles.inputLabel}>
              Períodos ({periodosSeleccionados.length} seleccionados)
            </Text>
            <TouchableOpacity onPress={seleccionarTodosPeriodos}>
              <Text style={styles.seleccionarTodo}>
                {periodosSeleccionados.length === periodos.length ? 'Quitar todos' : 'Todos'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chipsGrid}>
            {periodos.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.chip, periodosSeleccionados.includes(p.id) && styles.chipActivo]}
                onPress={() => togglePeriodo(p.id)}
              >
                <Text style={[styles.chipText, periodosSeleccionados.includes(p.id) && styles.chipTextActivo]}>
                  Período {p.numero}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.guardarBtn, guardando && styles.guardarBtnDisabled]}
            onPress={handleAsignar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.guardarBtnText}>
                Guardar {materiasSeleccionadas.length > 0 ? `(${materiasSeleccionadas.length} materias × ${periodosSeleccionados.length} períodos)` : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.seccionTitulo}>
        Asignaciones ({asignaciones.length})
      </Text>

      {asignaciones.map((asg) => (
        <View key={asg.id} style={styles.asignacionCard}>
          <View style={styles.asignacionInfo}>
            <Text style={styles.asignacionMateria}>{asg.materia}</Text>
            <Text style={styles.asignacionDetalle}>{asg.curso}</Text>
          </View>
          <TouchableOpacity
            style={styles.quitarBtn}
            onPress={() => handleDesactivar(asg)}
          >
            <Text style={styles.quitarBtnText}>Quitar</Text>
          </TouchableOpacity>
        </View>
      ))}

      {asignaciones.length === 0 && (
        <Text style={styles.sinAsignaciones}>Sin asignaciones activas</Text>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#1a3a6b', borderRadius: 12,
    padding: 16, marginBottom: 16,
  },
  headerNombre: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerEmail: { fontSize: 13, color: '#93c5fd', marginTop: 4 },
  agregarBtn: {
    backgroundColor: '#7c3aed', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginBottom: 16,
  },
  agregarBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  formulario: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 16, marginBottom: 16, elevation: 2,
  },
  formularioTitulo: { fontSize: 16, fontWeight: '700', color: '#1a3a6b', marginBottom: 12 },
  seccionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 12, marginBottom: 8,
  },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  seleccionarTodo: { fontSize: 12, color: '#7c3aed', fontWeight: '700' },
  chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0',
  },
  chipActivo: { backgroundColor: '#1a3a6b', borderColor: '#1a3a6b' },
  chipText: { fontSize: 13, color: '#475569' },
  chipTextActivo: { color: '#fff', fontWeight: '600' },
  guardarBtn: {
    backgroundColor: '#1a3a6b', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center', marginTop: 16,
  },
  guardarBtnDisabled: { opacity: 0.6 },
  guardarBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  seccionTitulo: { fontSize: 15, fontWeight: '700', color: '#1a3a6b', marginBottom: 10 },
  asignacionCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    marginBottom: 8, elevation: 1, flexDirection: 'row', alignItems: 'center',
  },
  asignacionInfo: { flex: 1 },
  asignacionMateria: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  asignacionDetalle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  quitarBtn: {
    backgroundColor: '#fee2e2', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 8,
  },
  quitarBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  sinAsignaciones: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', marginTop: 20 },
});