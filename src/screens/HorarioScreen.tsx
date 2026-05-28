import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../services/api';
import { Colors, Typography, Spacing, Radius, materiaColor } from '../theme';
import { useNavigation } from '@react-navigation/native';

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const DIAS_CORTO = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

export default function HorarioScreen() {
  const navigation = useNavigation();
  const hoy = new Date().getDay();
  const diaInicial = hoy === 0 || hoy === 6 ? 1 : hoy;
  const [diaActivo, setDiaActivo] = useState(diaInicial);
  const [horario, setHorario]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { cargarHorario(); }, [diaActivo]);

  const cargarHorario = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/notas/horario?dia=${diaActivo}`);
      if (!res.ok) throw new Error('Error');
      setHorario(await res.json());
    } catch { Alert.alert('Error', 'No se pudo cargar el horario'); }
    finally   { setLoading(false); }
  };

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <View style={styles.header}>
        <View style={styles.headerTopLine} />
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={Colors.text1} />
        </TouchableOpacity>
        <Text style={styles.headerLabel}>DOCENTE</Text>
        <Text style={styles.headerTitle}>Mi Horario</Text>
        <Text style={styles.headerSub}>{DIAS[diaActivo]}</Text>
      </View>

      {/* Selector de días */}
      <View style={styles.diasRow}>
        {[1, 2, 3, 4, 5].map((dia) => (
          <TouchableOpacity key={dia} style={[styles.diaBtn, diaActivo === dia && styles.diaBtnActivo]} onPress={() => setDiaActivo(dia)} activeOpacity={0.75}>
            <Text style={[styles.diaBtnText, diaActivo === dia && styles.diaBtnTextActivo]}>{DIAS_CORTO[dia]}</Text>
            {diaActivo === dia && <View style={styles.diaDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Cargando horario...</Text>
        </View>
      ) : horario.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="calendar-outline" size={32} color={Colors.text3} /></View>
          <Text style={styles.emptyText}>Sin clases este día</Text>
        </View>
      ) : (
        <ScrollView style={styles.lista} contentContainerStyle={styles.listaPadding} showsVerticalScrollIndicator={false}>
          {horario.map((bloque, idx) => {
            const color = materiaColor(idx);
            return (
              <View key={idx} style={styles.bloque}>
                <View style={[styles.bloqueBar, { backgroundColor: color }]} />
                <View style={styles.horaBox}>
                  <Text style={styles.horaInicio}>{bloque.horaInicio}</Text>
                  <View style={styles.horaLinea} />
                  <Text style={styles.horaFin}>{bloque.horaFin}</Text>
                </View>
                <View style={styles.bloqueInfo}>
                  <Text style={[styles.bloqueMateria, { color }]} numberOfLines={1}>{bloque.materia}</Text>
                  <Text style={styles.bloqueCurso}>{bloque.curso}</Text>
                  {bloque.salon && <View style={styles.salonBadge}><Ionicons name="location-outline" size={10} color={Colors.text3} /><Text style={styles.salonText}>{bloque.salon}</Text></View>}
                </View>
                <View style={[styles.indexBadge, { backgroundColor: `${color}18`, borderColor: `${color}30` }]}>
                  <Text style={[styles.indexText, { color }]}>{idx + 1}</Text>
                </View>
              </View>
            );
          })}
          <View style={{ height: Spacing.huge }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex:           { flex: 1, backgroundColor: Colors.bg },
  header:         { backgroundColor: Colors.surface, paddingTop: 52, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.xl, borderBottomWidth: 0.5, borderBottomColor: Colors.borderSoft, overflow: 'hidden' },
  backBtn:        { position: 'absolute', top: 52, left: Spacing.xl, width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  headerTopLine:  { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.accent },
  headerLabel:    { fontSize: Typography.xs, color: Colors.accent2, letterSpacing: Typography.widest, marginBottom: 2 },
  headerTitle:    { fontSize: Typography.xxl, fontWeight: Typography.black, color: Colors.text1 },
  headerSub:      { fontSize: Typography.sm, color: Colors.text2, marginTop: 2 },
  diasRow:        { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 0.5, borderBottomColor: Colors.borderSoft, paddingHorizontal: Spacing.lg, paddingBottom: 0 },
  diaBtn:         { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, position: 'relative' },
  diaBtnActivo:   {},
  diaBtnText:     { fontSize: Typography.sm, fontWeight: Typography.medium, color: Colors.text3 },
  diaBtnTextActivo:{ color: Colors.accent2, fontWeight: Typography.bold },
  diaDot:         { position: 'absolute', bottom: 0, width: 20, height: 2, backgroundColor: Colors.accent, borderRadius: 1 },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  emptyIcon:      { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.borderSoft, alignItems: 'center', justifyContent: 'center' },
  emptyText:      { fontSize: Typography.base, color: Colors.text2, fontWeight: Typography.medium },
  loadingText:    { color: Colors.text2, fontSize: Typography.sm },
  lista:          { flex: 1 },
  listaPadding:   { padding: Spacing.lg },
  bloque:         { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 0.5, borderColor: Colors.borderSoft, overflow: 'hidden' },
  bloqueBar:      { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 0 },
  horaBox:        { alignItems: 'center', minWidth: 52, paddingLeft: Spacing.xs },
  horaInicio:     { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.text1 },
  horaLinea:      { width: 1, height: 12, backgroundColor: Colors.borderSoft, marginVertical: 3 },
  horaFin:        { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.text2 },
  bloqueInfo:     { flex: 1 },
  bloqueMateria:  { fontSize: Typography.base, fontWeight: Typography.bold, marginBottom: 3 },
  bloqueCurso:    { fontSize: Typography.xs, color: Colors.text2 },
  salonBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  salonText:      { fontSize: Typography.xs, color: Colors.text3 },
  indexBadge:     { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5 },
  indexText:      { fontSize: Typography.xs, fontWeight: Typography.black },
});
