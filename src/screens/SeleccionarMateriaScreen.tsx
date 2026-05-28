import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../services/api';
import { cerrarSesionGlobal } from '../services/auth';

interface Materia {
  id: string;
  nombre: string;
  codigo: string;
  asignacionId: string;
}

/** Elige el ícono Ionicons según el nombre de la materia */
function iconoMateria(nombre: string): keyof typeof Ionicons.glyphMap {
  const n = nombre.toLowerCase();
  if (n.includes('tecnolog') || n.includes('inform') || n.includes('sistem')) return 'settings-outline';
  if (n.includes('mat') || n.includes('álgebra') || n.includes('algebra') || n.includes('cálculo')) return 'calculator-outline';
  if (n.includes('lengua') || n.includes('liter') || n.includes('español') || n.includes('lectura')) return 'book-outline';
  if (n.includes('ciencia') || n.includes('biolog') || n.includes('quím') || n.includes('física')) return 'flask-outline';
  if (n.includes('social') || n.includes('histor') || n.includes('geograf')) return 'earth-outline';
  if (n.includes('arte') || n.includes('música') || n.includes('dibujo')) return 'color-palette-outline';
  if (n.includes('educa') || n.includes('deport') || n.includes('física')) return 'fitness-outline';
  if (n.includes('inglés') || n.includes('ingles') || n.includes('idioma')) return 'language-outline';
  if (n.includes('ética') || n.includes('etica') || n.includes('religion') || n.includes('religión')) return 'heart-outline';
  return 'school-outline';
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
      if (rol === 'RECTOR') { navigation.replace('Rector'); return; }
      if (rol !== 'PROFESOR') { Alert.alert('Acceso restringido', 'Esta aplicación es exclusiva para profesores.'); return; }
      await cargarMaterias();
    };
    iniciar();
    const unsubscribe = navigation.addListener('focus', () => {
      if (rolRef.current === 'PROFESOR') cargarMaterias();
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
        if (data.length > 0) {
          const resPer = await apiFetch('/api/notas/periodos');
          if (resPer.ok) {
            const periodos = await resPer.json();
            if (periodos.length > 0) {
              const periodo = periodos.find((p: any) => !p.cerrado) || periodos[periodos.length - 1];
              setPeriodoInfo({ id: periodo.id, numero: periodo.numero });
              const resAsig = await apiFetch(`/api/notas/asignacion?materiaId=${data[0].id}&periodoId=${periodo.id}`);
              if (resAsig.ok) { const asig = await resAsig.json(); setCursoId(asig.cursoId); }
            }
          }
        }
      } else {
        Alert.alert('Error', 'No se pudieron cargar las materias');
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo conectar al servidor');
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

  const primerNombre = nombre ? nombre.split(' ')[0] : 'Profesora';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando materias...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <Ionicons name="person" size={30} color="#FFFFFF" />
          </View>

          {/* Bienvenida + acciones */}
          <View style={styles.headerCenter}>
            <Text style={styles.headerBienvenida}>Bienvenida, {primerNombre}</Text>
          </View>

          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Horario')}>
              <Text style={styles.headerBtnText}>Horario</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={cerrarSesion}>
              <Text style={styles.headerBtnText}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chips de estadísticas */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{materias.length} materias</Text>
          </View>
          {periodoInfo && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>P{periodoInfo.numero} período activo</Text>
            </View>
          )}
        </View>
      </View>

      {/* LISTA */}
      {materias.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Sin materias asignadas</Text>
          <Text style={styles.emptyDesc}>Contacta al rector para que te asigne materias.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={cargarMaterias}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={materias}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() =>
            cursoId && periodoInfo ? (
              <TouchableOpacity
                style={styles.botonBoletin}
                onPress={() => navigation.navigate('Boletin', {
                  cursoId,
                  periodoId: periodoInfo.id,
                  periodoNumero: periodoInfo.numero,
                })}
              >
                <Text style={styles.botonBoletinTexto}>Ver Boletín del Curso</Text>
                <Ionicons name="chevron-forward" size={18} color="#64748B" />
              </TouchableOpacity>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {/* Cabecera de la tarjeta */}
              <View style={styles.cardHeader}>
                <View style={styles.cardIconWrap}>
                  <Ionicons name={iconoMateria(item.nombre)} size={22} color="#1E3A5F" />
                </View>
                <Text style={styles.cardNombre}>{item.nombre}</Text>
              </View>

              {/* Fila 1: Calificar + Asistencia */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnAzul]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', {
                    materiaId: item.id, materiaNombre: item.nombre, modo: 'calificar',
                  })}
                >
                  <Text style={styles.btnTextBlanco}>Calificar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnAzulClaro]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', {
                    materiaId: item.id, materiaNombre: item.nombre, modo: 'asistencia',
                  })}
                >
                  <Text style={styles.btnTextBlanco}>Asistencia</Text>
                </TouchableOpacity>
              </View>

              {/* Fila 2: Planilla + Calif. con IA */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGris]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', {
                    materiaId: item.id, materiaNombre: item.nombre, modo: 'planilla',
                  })}
                >
                  <Text style={styles.btnTextGris}>Planilla</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnRosa]}
                  onPress={() => navigation.navigate('SeleccionarPeriodo', {
                    materiaId: item.id, materiaNombre: item.nombre, modo: 'calificarIA',
                  })}
                >
                  <Text style={styles.btnTextBlanco}>Calif. con IA</Text>
                </TouchableOpacity>
              </View>

              {/* Fila 3: Análisis de Riesgo IA (ancho completo) */}
              <TouchableOpacity
                style={styles.btnRiesgo}
                onPress={() => navigation.navigate('SeleccionarPeriodo', {
                  materiaId: item.id, materiaNombre: item.nombre, modo: 'riesgoIA',
                })}
              >
                <Text style={styles.btnRiesgoText}>Análisis de Riesgo IA</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: { flex: 1, backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, color: '#94A3B8', fontSize: 15 },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerCenter: { flex: 1 },
  headerBienvenida: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerBtns: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  headerBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // ── Chips ────────────────────────────────────────────────────────────────────
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },

  // ── Lista ───────────────────────────────────────────────────────────────────
  lista: { padding: 16, paddingBottom: 32 },

  // ── Vacío ───────────────────────────────────────────────────────────────────
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  retryBtn: { backgroundColor: '#1E3A5F', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#FFFFFF', fontWeight: '600' },

  // ── Tarjeta ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardNombre: { fontSize: 17, fontWeight: '700', color: '#0F172A', flex: 1 },

  // ── Filas de botones ─────────────────────────────────────────────────────────
  btnRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  btn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnAzul:       { backgroundColor: '#2563EB' },
  btnAzulClaro:  { backgroundColor: '#0EA5E9' },
  btnGris:       { backgroundColor: '#E2E8F0' },
  btnRosa:       { backgroundColor: '#F43F5E' },

  btnTextBlanco: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  btnTextGris:   { color: '#475569', fontWeight: '700', fontSize: 13 },

  // ── Riesgo (ancho completo) ──────────────────────────────────────────────────
  btnRiesgo: {
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
  },
  btnRiesgoText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  // ── Boletín footer ──────────────────────────────────────────────────────────
  botonBoletin: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  botonBoletinTexto: { color: '#0F172A', fontWeight: '700', fontSize: 15 },
});
