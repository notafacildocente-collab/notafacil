import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
  Modal, TextInput,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../services/api';

interface Retiro {
  id: string;
  nombreCompleto: string;
  numeroDocumento: string;
  retiroFecha: string;
  curso: string;
}

interface EstudianteActivo {
  id: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
}

export default function RetirosScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { cursoId, asignacionId } = (route.params || {}) as any;

  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal estado
  const [modalVisible, setModalVisible] = useState(false);
  const [estudiantesActivos, setEstudiantesActivos] = useState<EstudianteActivo[]>([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<EstudianteActivo | null>(null);
  const [fechaInput, setFechaInput] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/notas/retiros?cursoId=${cursoId}`);
      if (!res.ok) throw new Error('Error');
      setRetiros(await res.json());
    } catch {
      Alert.alert('Error', 'No se pudo cargar el listado de retiros');
    } finally {
      setLoading(false);
    }
  }, [cursoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirModal = async () => {
    setEstudianteSeleccionado(null);
    setBusqueda('');
    setFechaInput(new Date().toISOString().slice(0, 10));
    setModalVisible(true);
    try {
      setLoadingEstudiantes(true);
      const res = await apiFetch(`/api/notas/estudiantes/${asignacionId}`);
      if (!res.ok) throw new Error('Error');
      const data: EstudianteActivo[] = await res.json();
      setEstudiantesActivos(data);
    } catch {
      Alert.alert('Error', 'No se pudo cargar la lista de estudiantes');
      setModalVisible(false);
    } finally {
      setLoadingEstudiantes(false);
    }
  };

  const guardarRetiro = async () => {
    if (!estudianteSeleccionado) {
      Alert.alert('Selecciona un estudiante');
      return;
    }
    if (!fechaInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD');
      return;
    }
    try {
      setGuardando(true);
      const res = await apiFetch(`/api/notas/retiro/${estudianteSeleccionado.id}`, {
        method: 'PUT',
        body: JSON.stringify({ retiroFecha: fechaInput }),
      });
      if (!res.ok) throw new Error('Error');
      setModalVisible(false);
      await cargar();
    } catch {
      Alert.alert('Error', 'No se pudo registrar el retiro');
    } finally {
      setGuardando(false);
    }
  };

  const confirmarReactivar = (item: Retiro) => {
    Alert.alert(
      'Reactivar estudiante',
      `¿Reactivar a ${item.nombreCompleto}? Volverá a aparecer en calificación y asistencia.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reactivar', style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/api/notas/retiro/${item.id}`, {
                method: 'PUT',
                body: JSON.stringify({ retiroFecha: null }),
              });
              await cargar();
            } catch {
              Alert.alert('Error', 'No se pudo reactivar el estudiante');
            }
          },
        },
      ],
    );
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const estudiantesFiltrados = estudiantesActivos.filter((e) => {
    const q = busqueda.toLowerCase();
    return q === '' || `${e.apellido} ${e.nombre}`.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#7F1D1D" />
        <ActivityIndicator size="large" color="#DC2626" />
        <Text style={styles.loadingText}>Cargando retiros...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#7F1D1D" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextos}>
          <Text style={styles.headerTitulo}>Retiros de Estudiantes</Text>
          <Text style={styles.headerSub}>
            {retiros.length} retiro{retiros.length !== 1 ? 's' : ''} registrado{retiros.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={abrirModal}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Aviso */}
      <View style={styles.aviso}>
        <Ionicons name="information-circle-outline" size={18} color="#92400E" />
        <Text style={styles.avisoTexto}>
          Estudiantes retirados no aparecen en calificación ni asistencia.
          Toca <Text style={{ fontWeight: '800' }}>+</Text> para registrar un retiro.
        </Text>
      </View>

      {/* Lista de retiros */}
      {retiros.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="exit-outline" size={56} color="#CBD5E1" />
          <Text style={styles.emptyTitulo}>Sin retiros registrados</Text>
          <Text style={styles.emptyDesc}>No hay estudiantes retirados en este curso.</Text>
        </View>
      ) : (
        <FlatList
          data={retiros}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <View style={[styles.card, index % 2 === 0 ? styles.cardPar : styles.cardImpar]}>
              <View style={styles.numBadge}>
                <Text style={styles.numText}>{index + 1}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardNombre} numberOfLines={1}>{item.nombreCompleto}</Text>
                <Text style={styles.cardDoc}>Doc: {item.numeroDocumento}</Text>
                <View style={styles.fechaRow}>
                  <Ionicons name="calendar-outline" size={13} color="#DC2626" />
                  <Text style={styles.fechaTexto}>{formatFecha(item.retiroFecha)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.reactivarBtn} onPress={() => confirmarReactivar(item)}>
                <Ionicons name="person-add-outline" size={18} color="#16A34A" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* ── Modal registrar retiro ── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Registrar Retiro</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {loadingEstudiantes ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#DC2626" />
                <Text style={styles.modalLoadingTxt}>Cargando estudiantes...</Text>
              </View>
            ) : (
              <>
                {/* Paso 1: seleccionar estudiante */}
                {!estudianteSeleccionado ? (
                  <>
                    <Text style={styles.modalLabel}>Selecciona el estudiante</Text>
                    <View style={styles.busquedaWrap}>
                      <Ionicons name="search-outline" size={16} color="#94A3B8" />
                      <TextInput
                        style={styles.busquedaInput}
                        placeholder="Buscar por nombre..."
                        value={busqueda}
                        onChangeText={setBusqueda}
                        autoCapitalize="none"
                      />
                    </View>
                    <FlatList
                      data={estudiantesFiltrados}
                      keyExtractor={(e) => e.id}
                      style={styles.listaModal}
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={
                        <Text style={styles.listaVacia}>No se encontraron estudiantes</Text>
                      }
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.estudianteItem}
                          onPress={() => setEstudianteSeleccionado(item)}
                        >
                          <View style={styles.estudianteAvatar}>
                            <Text style={styles.estudianteAvatarTxt}>
                              {item.apellido.charAt(0)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.estudianteNombre}>
                              {item.apellido} {item.nombre}
                            </Text>
                            <Text style={styles.estudianteDoc}>Doc: {item.numeroDocumento}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                        </TouchableOpacity>
                      )}
                    />
                  </>
                ) : (
                  /* Paso 2: confirmar y poner fecha */
                  <>
                    {/* Estudiante seleccionado */}
                    <View style={styles.seleccionadoCard}>
                      <View style={styles.estudianteAvatar}>
                        <Text style={styles.estudianteAvatarTxt}>
                          {estudianteSeleccionado.apellido.charAt(0)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.seleccionadoNombre}>
                          {estudianteSeleccionado.apellido} {estudianteSeleccionado.nombre}
                        </Text>
                        <Text style={styles.estudianteDoc}>Doc: {estudianteSeleccionado.numeroDocumento}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setEstudianteSeleccionado(null)}>
                        <Text style={styles.cambiarTxt}>Cambiar</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.modalLabel, { marginTop: 16 }]}>Fecha de retiro</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="AAAA-MM-DD"
                      value={fechaInput}
                      onChangeText={setFechaInput}
                      keyboardType="numeric"
                    />

                    <View style={styles.modalBtns}>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnCancelar]}
                        onPress={() => setModalVisible(false)}
                      >
                        <Text style={styles.modalBtnCancelarTxt}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalBtn, styles.modalBtnGuardar, guardando && { opacity: 0.6 }]}
                        onPress={guardarRetiro}
                        disabled={guardando}
                      >
                        {guardando
                          ? <ActivityIndicator size="small" color="#FFFFFF" />
                          : <Text style={styles.modalBtnGuardarTxt}>Registrar retiro</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FEF2F2' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF2F2' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 15 },

  header: {
    backgroundColor: '#7F1D1D',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTextos: { flex: 1 },
  headerTitulo: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#FCA5A5', marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center',
  },

  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  avisoTexto: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },

  lista: { padding: 12, paddingBottom: 32 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  emptyTitulo: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: '#64748B', textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  cardPar: { backgroundColor: '#FFFFFF' },
  cardImpar: { backgroundColor: '#FFF5F5' },
  numBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#DC2626', justifyContent: 'center', alignItems: 'center',
  },
  numText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  cardInfo: { flex: 1 },
  cardNombre: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cardDoc: { fontSize: 11, color: '#64748B', marginTop: 2 },
  fechaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  fechaTexto: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  reactivarBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  modalLoading: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  modalLoadingTxt: { color: '#64748B', fontSize: 14 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },

  busquedaWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F1F5F9', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0',
  },
  busquedaInput: { flex: 1, fontSize: 14, color: '#0F172A' },

  listaModal: { maxHeight: 280 },
  listaVacia: { textAlign: 'center', color: '#94A3B8', fontSize: 14, paddingVertical: 20 },

  estudianteItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  estudianteAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center',
  },
  estudianteAvatarTxt: { fontWeight: '800', color: '#DC2626', fontSize: 15 },
  estudianteNombre: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  estudianteDoc: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  seleccionadoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FEF2F2', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#FECACA',
  },
  seleccionadoNombre: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  cambiarTxt: { fontSize: 13, fontWeight: '600', color: '#2563EB' },

  modalInput: {
    backgroundColor: '#F1F5F9', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  modalBtnCancelar: { backgroundColor: '#F1F5F9' },
  modalBtnCancelarTxt: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  modalBtnGuardar: { backgroundColor: '#DC2626' },
  modalBtnGuardarTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
