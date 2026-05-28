import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar, Modal, TextInput,
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

export default function RetirosScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { cursoId } = (route.params || {}) as any;

  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [estudianteId, setEstudianteId] = useState('');
  const [estudianteNombre, setEstudianteNombre] = useState('');
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

  const confirmarEliminar = (item: Retiro) => {
    Alert.alert(
      'Quitar retiro',
      `¿Reactivar a ${item.nombreCompleto}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reactivar', style: 'destructive',
          onPress: () => marcarRetiro(item.id, null),
        },
      ],
    );
  };

  const marcarRetiro = async (id: string, fecha: string | null) => {
    try {
      setGuardando(true);
      const res = await apiFetch(`/api/notas/retiro/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ retiroFecha: fecha }),
      });
      if (!res.ok) throw new Error('Error');
      await cargar();
      setModalVisible(false);
      setFechaInput('');
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el retiro');
    } finally {
      setGuardando(false);
    }
  };

  const abrirModal = () => {
    setEstudianteId('');
    setEstudianteNombre('');
    setFechaInput(new Date().toISOString().slice(0, 10));
    setModalVisible(true);
  };

  const guardarNuevoRetiro = () => {
    if (!estudianteId.trim()) {
      Alert.alert('Falta dato', 'Ingresa el ID del estudiante');
      return;
    }
    if (!fechaInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Fecha inválida', 'Usa el formato AAAA-MM-DD');
      return;
    }
    marcarRetiro(estudianteId.trim(), fechaInput);
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
        <ActivityIndicator size="large" color="#1E3A5F" />
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
          <Text style={styles.headerSub}>{retiros.length} retiro{retiros.length !== 1 ? 's' : ''} registrado{retiros.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={abrirModal}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Aviso informativo */}
      <View style={styles.aviso}>
        <Ionicons name="information-circle-outline" size={18} color="#92400E" />
        <Text style={styles.avisoTexto}>
          Registro de estudiantes retirados del curso. Toca <Text style={{ fontWeight: '800' }}>+</Text> para registrar un retiro.
        </Text>
      </View>

      {/* Lista */}
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
              {/* Número */}
              <View style={styles.numBadge}>
                <Text style={styles.numText}>{index + 1}</Text>
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardNombre} numberOfLines={1}>{item.nombreCompleto}</Text>
                <Text style={styles.cardDoc}>Doc: {item.numeroDocumento}</Text>
                <View style={styles.fechaRow}>
                  <Ionicons name="calendar-outline" size={13} color="#DC2626" />
                  <Text style={styles.fechaTexto}>Retiro: {formatFecha(item.retiroFecha)}</Text>
                </View>
              </View>

              {/* Botón quitar */}
              <TouchableOpacity
                style={styles.reactivarBtn}
                onPress={() => confirmarEliminar(item)}
              >
                <Ionicons name="person-add-outline" size={18} color="#16A34A" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Modal registrar retiro */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitulo}>Registrar Retiro</Text>
            <Text style={styles.modalLabel}>ID del estudiante</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="UUID del estudiante"
              value={estudianteId}
              onChangeText={setEstudianteId}
              autoCapitalize="none"
            />
            <Text style={styles.modalLabel}>Fecha de retiro</Text>
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
                onPress={guardarNuevoRetiro}
                disabled={guardando}
              >
                {guardando
                  ? <ActivityIndicator size="small" color="#FFFFFF" />
                  : <Text style={styles.modalBtnGuardarTxt}>Registrar</Text>
                }
              </TouchableOpacity>
            </View>
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
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: '#DC2626',
    justifyContent: 'center', alignItems: 'center',
  },

  aviso: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1, borderBottomColor: '#FDE68A',
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
    backgroundColor: '#DCFCE7',
    justifyContent: 'center', alignItems: 'center',
  },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 20 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  modalInput: {
    backgroundColor: '#F1F5F9', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A', marginBottom: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  modalBtnCancelar: { backgroundColor: '#F1F5F9' },
  modalBtnCancelarTxt: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  modalBtnGuardar: { backgroundColor: '#DC2626' },
  modalBtnGuardarTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
