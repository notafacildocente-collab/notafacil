import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../services/api';
import { cerrarSesionGlobal } from '../services/auth';

export default function EstudianteScreen({ navigation }: any) {
  const [nombre, setNombre] = useState('');
  const [curso, setCurso] = useState('');
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<any>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const nombreGuardado = await SecureStore.getItemAsync('nombre');
      if (nombreGuardado) setNombre(nombreGuardado);

      const resPerfil = await apiFetch('/api/estudiante/perfil');
      if (resPerfil.ok) {
        const perfil = await resPerfil.json();
        setNombre(`${perfil.nombre} ${perfil.apellido}`);
        setCurso(perfil.curso);
      }

      const res = await apiFetch('/api/estudiante/notas');
      if (res.ok) {
        const notas = await res.json();
        const aprobadas = notas.filter((n: any) => n.notaFinal >= 3.0).length;
        const promedio = notas.length > 0
          ? Math.round((notas.reduce((a: number, n: any) => a + n.notaFinal, 0) / notas.length) * 10) / 10
          : 0;
        setResumen({ totalMaterias: notas.length, aprobadas, promedio });
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', 'No se pudieron cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Está seguro que desea salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => cerrarSesionGlobal() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bienvenido,</Text>
        <Text style={styles.nombre}>{nombre}</Text>
        {curso ? <Text style={styles.curso}>{curso}</Text> : null}
        </View>
        <TouchableOpacity style={styles.salirBtn} onPress={cerrarSesion}>
          <Text style={styles.salirBtnText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Resumen */}
      {resumen && (
        <View style={styles.resumenRow}>
          <View style={styles.resumenCard}>
            <Text style={styles.resumenNumero}>{resumen.totalMaterias}</Text>
            <Text style={styles.resumenLabel}>Materias</Text>
          </View>
          <View style={styles.resumenCard}>
            <Text style={styles.resumenNumero}>{resumen.aprobadas}</Text>
            <Text style={styles.resumenLabel}>Aprobadas</Text>
          </View>
          <View style={[styles.resumenCard, { backgroundColor: resumen.promedio >= 3 ? '#10b981' : '#ef4444' }]}>
            <Text style={[styles.resumenNumero, { color: '#fff' }]}>{resumen.promedio.toFixed(1)}</Text>
            <Text style={[styles.resumenLabel, { color: '#fff' }]}>Promedio</Text>
          </View>
        </View>
      )}

      {/* Opciones */}
      <Text style={styles.seccionTitulo}>¿Qué deseas ver?</Text>

      <View style={styles.opcionesGrid}>
        <TouchableOpacity
          style={[styles.opcionCard, { backgroundColor: '#1a3a6b' }]}
          onPress={() => navigation.navigate('EstudianteNotas')}
        >
          <Text style={styles.opcionIcono}>📊</Text>
          <Text style={styles.opcionTitulo}>Mis Notas</Text>
          <Text style={styles.opcionSubtitulo}>Ver calificaciones por materia</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.opcionCard, { backgroundColor: '#059669' }]}
          onPress={() => navigation.navigate('EstudianteHorario')}
        >
          <Text style={styles.opcionIcono}>📅</Text>
          <Text style={styles.opcionTitulo}>Mi Horario</Text>
          <Text style={styles.opcionSubtitulo}>Ver clases del día</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.opcionCard, { backgroundColor: '#7c3aed' }]}
          onPress={() => navigation.navigate('EstudianteAsistencia')}
        >
          <Text style={styles.opcionIcono}>✓</Text>
          <Text style={styles.opcionTitulo}>Asistencia</Text>
          <Text style={styles.opcionSubtitulo}>Ver mis faltas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.opcionCard, { backgroundColor: '#b45309' }]}
          onPress={() => navigation.navigate('EstudianteBoletin')}
        >
          <Text style={styles.opcionIcono}>📄</Text>
          <Text style={styles.opcionTitulo}>Boletín</Text>
          <Text style={styles.opcionSubtitulo}>Resumen del período</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  header: {
    backgroundColor: '#1a3a6b', borderRadius: 12, padding: 16,
    marginBottom: 16, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { fontSize: 13, color: '#94a3b8' },
  nombre: { fontSize: 15, fontWeight: '700', color: '#fff' },
  salirBtn: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  salirBtnText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  salirBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  resumenRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  resumenCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    padding: 14, alignItems: 'center', elevation: 2,
  },
  resumenNumero: { fontSize: 24, fontWeight: '800', color: '#1a3a6b' },
  resumenLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, fontWeight: '600' },
  seccionTitulo: { fontSize: 16, fontWeight: '700', color: '#1a3a6b', marginBottom: 12 },
  opcionesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  opcionCard: {
    width: '47%', borderRadius: 16, padding: 20,
    elevation: 3,
  },
  opcionIcono: { fontSize: 32, marginBottom: 8 },
  opcionTitulo: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  opcionSubtitulo: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
curso: { fontSize: 12, color: '#93c5fd', marginTop: 2 },
});