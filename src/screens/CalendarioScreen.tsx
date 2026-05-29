import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

type TipoEvento = 'REUNION' | 'BOLETIN' | 'FESTIVO' | 'IZADA' | 'OTRO';

interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoEvento;
  fecha: string;
  creadoPorNombre: string;
}

const TIPOS_EVENTO: { key: TipoEvento; label: string; icon: any; color: string; bg: string }[] = [
  { key: 'REUNION',  label: 'Reunión',          icon: 'people-outline',       color: '#2563EB', bg: '#DBEAFE' },
  { key: 'BOLETIN',  label: 'Entrega Boletín',  icon: 'document-text-outline',color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'FESTIVO',  label: 'Festivo',           icon: 'calendar-outline',     color: '#D97706', bg: '#FEF3C7' },
  { key: 'IZADA',    label: 'Izada de Bandera',  icon: 'flag-outline',         color: '#059669', bg: '#D1FAE5' },
  { key: 'OTRO',     label: 'Otro',              icon: 'ellipsis-horizontal-outline', color: '#64748B', bg: '#F1F5F9' },
];

function EventoTipoChip({ tipo }: { tipo: TipoEvento }) {
  const t = TIPOS_EVENTO.find(t => t.key === tipo)!;
  return (
    <View style={[styles.tipoChip, { backgroundColor: t.bg }]}>
      <Ionicons name={t.icon} size={11} color={t.color} />
      <Text style={[styles.tipoChipTxt, { color: t.color }]}>{t.label}</Text>
    </View>
  );
}

function formatFechaEvento(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function CalendarioScreen() {
  const navigation = useNavigation();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [rol, setRol] = useState('');
  const [modal, setModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [tipoSel, setTipoSel] = useState<TipoEvento>('REUNION');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync('rol').then(r => setRol(r || ''));
    cargar();
  }, []);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/calendario');
      if (res.ok) setEventos(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const guardar = async () => {
    if (!titulo.trim()) { Alert.alert('', 'Escribe un título para el evento'); return; }
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { Alert.alert('', 'Ingresa la fecha en formato AAAA-MM-DD'); return; }
    try {
      setGuardando(true);
      const res = await apiFetch('/api/calendario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim(), descripcion: descripcion.trim(), tipo: tipoSel, fecha }),
      });
      if (res.ok) {
        setModal(false);
        setTitulo(''); setDescripcion(''); setTipoSel('REUNION');
        setFecha(new Date().toISOString().slice(0, 10));
        Alert.alert('✓ Evento creado', 'Se envió notificación push a todos los usuarios.');
        cargar();
      } else {
        Alert.alert('Error', 'No se pudo crear el evento');
      }
    } catch { Alert.alert('Error', 'No se pudo conectar'); }
    finally { setGuardando(false); }
  };

  const eliminar = (id: string) => {
    Alert.alert('Eliminar evento', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          await apiFetch(`/api/calendario/${id}`, { method: 'DELETE' });
          setEventos(prev => prev.filter(e => e.id !== id));
        },
      },
    ]);
  };

  const esRector = rol === 'RECTOR';

  // Agrupar eventos: próximos y pasados
  const hoy = new Date().toISOString().slice(0, 10);
  const proximos = eventos.filter(e => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pasados  = eventos.filter(e => e.fecha < hoy).sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSub}>Institución Educativa</Text>
          <Text style={styles.headerTitulo}>Calendario Académico</Text>
        </View>
        {esRector && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setModal(true)}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista} showsVerticalScrollIndicator={false}>

          {proximos.length > 0 && (
            <>
              <Text style={styles.seccionLabel}>PRÓXIMOS EVENTOS</Text>
              {proximos.map(e => (
                <View key={e.id} style={[styles.card, styles.cardProximo]}>
                  <View style={styles.cardLeft}>
                    <EventoTipoChip tipo={e.tipo} />
                    <Text style={styles.cardTitulo}>{e.titulo}</Text>
                    <Text style={styles.cardFecha}>{formatFechaEvento(e.fecha)}</Text>
                    {e.descripcion ? <Text style={styles.cardDesc}>{e.descripcion}</Text> : null}
                  </View>
                  {esRector && (
                    <TouchableOpacity style={styles.delBtn} onPress={() => eliminar(e.id)}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </>
          )}

          {pasados.length > 0 && (
            <>
              <Text style={[styles.seccionLabel, { marginTop: 20 }]}>EVENTOS PASADOS</Text>
              {pasados.map(e => (
                <View key={e.id} style={[styles.card, styles.cardPasado]}>
                  <View style={styles.cardLeft}>
                    <EventoTipoChip tipo={e.tipo} />
                    <Text style={[styles.cardTitulo, { color: Colors.text2 }]}>{e.titulo}</Text>
                    <Text style={styles.cardFecha}>{formatFechaEvento(e.fecha)}</Text>
                  </View>
                  {esRector && (
                    <TouchableOpacity style={styles.delBtn} onPress={() => eliminar(e.id)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.text3} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </>
          )}

          {eventos.length === 0 && (
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={52} color={Colors.text3} />
              <Text style={styles.emptyTxt}>No hay eventos en el calendario</Text>
              {esRector && (
                <TouchableOpacity style={styles.addBtnEmpty} onPress={() => setModal(true)}>
                  <Text style={styles.addBtnEmptyTxt}>+ Crear primer evento</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Modal nuevo evento */}
      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitulo}>Nuevo Evento</Text>

              <Text style={styles.modalLabel}>Título *</Text>
              <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} placeholder="Ej: Reunión de padres de familia" />

              <Text style={styles.modalLabel}>Tipo</Text>
              <View style={styles.tiposGrid}>
                {TIPOS_EVENTO.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.tipoOpt, tipoSel === t.key && { backgroundColor: t.bg, borderColor: t.color }]}
                    onPress={() => setTipoSel(t.key)}
                  >
                    <Ionicons name={t.icon} size={16} color={tipoSel === t.key ? t.color : Colors.text3} />
                    <Text style={[styles.tipoOptTxt, tipoSel === t.key && { color: t.color }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Fecha (AAAA-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={fecha}
                onChangeText={setFecha}
                placeholder="2026-08-15"
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={styles.modalLabel}>Descripción (opcional)</Text>
              <TextInput
                style={[styles.input, { minHeight: 70 }]}
                value={descripcion}
                onChangeText={setDescripcion}
                placeholder="Detalle del evento..."
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.pushNote}>
                📱 Se enviará una notificación push a todos los usuarios al crear este evento.
              </Text>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => setModal(false)}>
                  <Text style={styles.btnCancelarTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnGuardar, guardando && { opacity: 0.6 }]} onPress={guardar} disabled={guardando}>
                  {guardando ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnGuardarTxt}>Crear Evento</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, paddingTop: 60 },
  header: { backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn:{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  headerSub:   { color: 'rgba(255,255,255,0.65)', fontSize: Typography.xs, fontWeight: Typography.semibold },
  headerTitulo:{ color: '#fff', fontSize: Typography.md, fontWeight: Typography.extrabold },
  lista: { padding: Spacing.lg },
  seccionLabel: { fontSize: 11, fontWeight: Typography.bold, color: Colors.text3, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'flex-start',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardProximo:  { borderLeftWidth: 4, borderLeftColor: Colors.primary },
  cardPasado:   { opacity: 0.6 },
  cardLeft:     { flex: 1 },
  cardTitulo:   { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text1, marginTop: 6, marginBottom: 2 },
  cardFecha:    { fontSize: Typography.xs, color: Colors.text2, marginBottom: 4, textTransform: 'capitalize' },
  cardDesc:     { fontSize: Typography.xs, color: Colors.text2, lineHeight: 17 },
  tipoChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  tipoChipTxt:  { fontSize: 10, fontWeight: Typography.bold },
  delBtn:       { padding: 4, marginLeft: 8 },
  emptyTxt:     { color: Colors.text3, fontSize: Typography.base, marginTop: 14, textAlign: 'center' },
  addBtnEmpty:  { marginTop: 18, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: Radius.md },
  addBtnEmptyTxt:{ color: '#fff', fontWeight: Typography.bold },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:     { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Spacing.xl, paddingBottom: 40 },
  modalTitulo:  { fontSize: Typography.lg, fontWeight: Typography.extrabold, color: Colors.text1, marginBottom: Spacing.md },
  modalLabel:   { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.text2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  input:        { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, fontSize: Typography.base, color: Colors.text1, backgroundColor: Colors.bg },
  tiposGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipoOpt:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bg },
  tipoOptTxt:   { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.text2 },
  pushNote:     { fontSize: 11, color: Colors.text3, marginTop: Spacing.md, lineHeight: 16 },
  modalBtns:    { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  btnCancelar:  { flex: 1, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border },
  btnCancelarTxt:{ color: Colors.text2, fontWeight: Typography.bold },
  btnGuardar:   { flex: 1, borderRadius: Radius.md, paddingVertical: 13, alignItems: 'center', backgroundColor: Colors.primary },
  btnGuardarTxt: { color: '#fff', fontWeight: Typography.bold },
});
