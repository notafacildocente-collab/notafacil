import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput, StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

type TipoObs = 'COMPORTAMIENTO' | 'ACADEMICO' | 'CITACION' | 'COMPROMISO';
type EstadoObs = 'PENDIENTE' | 'RESUELTO';

interface Observacion {
  id: string;
  tipo: TipoObs;
  descripcion: string;
  estado: EstadoObs;
  fecha: string;
  profesorNombre: string;
  createdAt: string;
}

const TIPOS: { key: TipoObs; label: string; icon: any; color: string; bg: string }[] = [
  { key: 'COMPORTAMIENTO', label: 'Comportamiento', icon: 'alert-circle-outline', color: '#DC2626', bg: '#FEE2E2' },
  { key: 'ACADEMICO',      label: 'Académico',       icon: 'book-outline',         color: '#2563EB', bg: '#DBEAFE' },
  { key: 'CITACION',       label: 'Citación',        icon: 'people-outline',       color: '#D97706', bg: '#FEF3C7' },
  { key: 'COMPROMISO',     label: 'Compromiso',      icon: 'checkmark-circle-outline', color: '#059669', bg: '#D1FAE5' },
];

function TipoChip({ tipo }: { tipo: TipoObs }) {
  const t = TIPOS.find(t => t.key === tipo)!;
  return (
    <View style={[styles.tipoChip, { backgroundColor: t.bg }]}>
      <Ionicons name={t.icon} size={12} color={t.color} />
      <Text style={[styles.tipoChipTxt, { color: t.color }]}>{t.label}</Text>
    </View>
  );
}

export default function ObservacionesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { estudianteId, estudianteNombre } = (route.params || {}) as any;

  const [obs, setObs] = useState<Observacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNueva, setModalNueva] = useState(false);
  const [tipoSel, setTipoSel] = useState<TipoObs>('COMPORTAMIENTO');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/observaciones/estudiante/${estudianteId}`);
      if (res.ok) setObs(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [estudianteId]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async () => {
    if (!descripcion.trim()) { Alert.alert('', 'Escribe una descripción'); return; }
    try {
      setGuardando(true);
      const res = await apiFetch('/api/observaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudianteId,
          tipo: tipoSel,
          descripcion: descripcion.trim(),
          fecha: new Date().toISOString().slice(0, 10),
        }),
      });
      if (res.ok) {
        setModalNueva(false);
        setDescripcion('');
        setTipoSel('COMPORTAMIENTO');
        cargar();
      }
    } catch { Alert.alert('Error', 'No se pudo guardar'); }
    finally { setGuardando(false); }
  };

  const toggleEstado = async (o: Observacion) => {
    const nuevo = o.estado === 'PENDIENTE' ? 'RESUELTO' : 'PENDIENTE';
    try {
      await apiFetch(`/api/observaciones/${o.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevo }),
      });
      setObs(prev => prev.map(x => x.id === o.id ? { ...x, estado: nuevo } : x));
    } catch { Alert.alert('Error', 'No se pudo actualizar'); }
  };

  const eliminar = (id: string) => {
    Alert.alert('Eliminar observación', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await apiFetch(`/api/observaciones/${id}`, { method: 'DELETE' });
          setObs(prev => prev.filter(o => o.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>Observador del Estudiante</Text>
          <Text style={styles.headerNombre} numberOfLines={1}>{estudianteNombre}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalNueva(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : obs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color={Colors.text3} />
          <Text style={styles.emptyTxt}>Sin observaciones registradas</Text>
          <TouchableOpacity style={styles.addBtnEmpty} onPress={() => setModalNueva(true)}>
            <Text style={styles.addBtnEmptyTxt}>+ Agregar primera observación</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista}>
          {obs.map(o => (
            <View key={o.id} style={[styles.card, o.estado === 'RESUELTO' && styles.cardResuelto]}>
              <View style={styles.cardTop}>
                <TipoChip tipo={o.tipo} />
                <Text style={styles.fecha}>{o.fecha?.slice(0, 10)}</Text>
              </View>
              <Text style={styles.desc}>{o.descripcion}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.profesor}>{o.profesorNombre}</Text>
                <View style={styles.cardAcciones}>
                  <TouchableOpacity
                    style={[styles.estadoBtn, o.estado === 'RESUELTO' ? styles.estadoBtnResuelto : styles.estadoBtnPendiente]}
                    onPress={() => toggleEstado(o)}
                  >
                    <Ionicons name={o.estado === 'RESUELTO' ? 'checkmark-circle' : 'time-outline'} size={13} color="#fff" />
                    <Text style={styles.estadoBtnTxt}>{o.estado === 'RESUELTO' ? 'Resuelto' : 'Pendiente'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => eliminar(o.id)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Modal nueva observación */}
      <Modal visible={modalNueva} transparent animationType="slide" onRequestClose={() => setModalNueva(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitulo}>Nueva Observación</Text>

            <Text style={styles.modalLabel}>Tipo</Text>
            <View style={styles.tiposGrid}>
              {TIPOS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tipoOpt, tipoSel === t.key && { backgroundColor: t.bg, borderColor: t.color }]}
                  onPress={() => setTipoSel(t.key)}
                >
                  <Ionicons name={t.icon} size={18} color={tipoSel === t.key ? t.color : Colors.text3} />
                  <Text style={[styles.tipoOptTxt, tipoSel === t.key && { color: t.color }]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Descripción</Text>
            <TextInput
              style={styles.textarea}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Describe la situación, acuerdo o compromiso..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => { setModalNueva(false); setDescripcion(''); }}>
                <Text style={styles.btnCancelarTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnGuardar, guardando && { opacity: 0.6 }]} onPress={guardar} disabled={guardando}>
                {guardando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnGuardarTxt}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  header: { backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  addBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerSub:    { color: 'rgba(255,255,255,0.65)', fontSize: Typography.xs, fontWeight: Typography.semibold },
  headerNombre: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.extrabold },
  lista: { padding: Spacing.lg },
  emptyTxt:       { color: Colors.text3, fontSize: Typography.base, marginTop: Spacing.md, textAlign: 'center' },
  addBtnEmpty:    { marginTop: Spacing.lg, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.md },
  addBtnEmptyTxt: { color: '#fff', fontWeight: Typography.bold },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardResuelto: { opacity: 0.7 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tipoChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  tipoChipTxt:{ fontSize: 11, fontWeight: Typography.bold },
  fecha:      { fontSize: Typography.xs, color: Colors.text3 },
  desc:       { fontSize: Typography.sm, color: Colors.text1, lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profesor:   { fontSize: 11, color: Colors.text3, flex: 1 },
  cardAcciones: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  estadoBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  estadoBtnPendiente: { backgroundColor: Colors.warning },
  estadoBtnResuelto:  { backgroundColor: Colors.success },
  estadoBtnTxt:       { color: '#fff', fontSize: 11, fontWeight: Typography.bold },
  delBtn: { padding: 4 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 36 },
  modalTitulo:  { fontSize: Typography.lg, fontWeight: Typography.extrabold, color: Colors.text1, marginBottom: Spacing.lg },
  modalLabel:   { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.text2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 12 },
  tiposGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoOpt:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg },
  tipoOptTxt:   { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.text2 },
  textarea:     { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Typography.base, color: Colors.text1, backgroundColor: Colors.bg, minHeight: 100 },
  modalBtns:    { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  btnCancelar:  { flex: 1, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  btnCancelarTxt: { color: Colors.text2, fontWeight: Typography.bold },
  btnGuardar:   { flex: 1, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', backgroundColor: Colors.primary },
  btnGuardarTxt:{ color: '#fff', fontWeight: Typography.bold },
});
