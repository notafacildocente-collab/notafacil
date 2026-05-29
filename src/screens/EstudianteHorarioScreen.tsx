import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../services/api';
import { Colors, Typography, Spacing, Radius, materiaColor } from '../theme';

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const DIAS_CORTO = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

export default function EstudianteHorarioScreen() {
  const navigation = useNavigation();
  const hoy = new Date().getDay();
  const diaInicial = hoy === 0 || hoy === 6 ? 1 : hoy;
  const [diaActivo, setDiaActivo] = useState(diaInicial);
  const [horario, setHorario] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarHorario(); }, [diaActivo]);

  const cargarHorario = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/estudiante/horario?dia=${diaActivo}`);
      if (res.ok) setHorario(await res.json());
    } catch (e: any) {
      if (e.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo cargar el horario');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitulo}>Mi Horario</Text>
          <Text style={styles.headerSub}>{DIAS[diaActivo]}</Text>
        </View>
      </View>

      {/* Selector de días */}
      <View style={styles.diasRow}>
        {[1, 2, 3, 4, 5].map((dia) => (
          <TouchableOpacity
            key={dia}
            style={[styles.diaBtn, diaActivo === dia && styles.diaBtnActivo]}
            onPress={() => setDiaActivo(dia)}
            activeOpacity={0.75}
          >
            <Text style={[styles.diaBtnTxt, diaActivo === dia && styles.diaBtnTxtActivo]}>
              {DIAS_CORTO[dia]}
            </Text>
            {diaActivo === dia && <View style={styles.diaDot} />}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : horario.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="calendar-outline" size={40} color={Colors.text3} />
          <Text style={styles.emptyTxt}>Sin clases este día</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.lista} showsVerticalScrollIndicator={false}>
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
                  <Text style={styles.bloqueProfesor}>Prof. {bloque.profesor}</Text>
                </View>
              </View>
            );
          })}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  header: {
    backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: 14,
    paddingHorizontal: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitulo: { color: '#fff', fontSize: Typography.lg, fontWeight: Typography.extrabold },
  headerSub:    { color: 'rgba(255,255,255,0.65)', fontSize: Typography.xs, marginTop: 2, textTransform: 'capitalize' },
  diasRow: {
    flexDirection: 'row', backgroundColor: Colors.primary,
    borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.lg,
  },
  diaBtn:      { flex: 1, alignItems: 'center', paddingVertical: 12 },
  diaBtnActivo:{ borderBottomWidth: 0 },
  diaBtnTxt:   { fontSize: Typography.sm, fontWeight: Typography.semibold, color: 'rgba(255,255,255,0.55)' },
  diaBtnTxtActivo: { color: '#fff', fontWeight: Typography.extrabold },
  diaDot:      { width: 4, height: 4, borderRadius: 2, backgroundColor: '#F59E0B', marginTop: 4 },
  lista:       { padding: Spacing.lg },
  emptyTxt:    { fontSize: Typography.base, color: Colors.text3 },
  bloque: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  bloqueBar:    { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: Spacing.md },
  horaBox:      { alignItems: 'center', marginRight: Spacing.md, minWidth: 50 },
  horaInicio:   { fontSize: 13, fontWeight: Typography.bold, color: Colors.text1 },
  horaLinea:    { width: 1, height: 12, backgroundColor: Colors.border, marginVertical: 3 },
  horaFin:      { fontSize: 13, fontWeight: Typography.semibold, color: Colors.text3 },
  bloqueInfo:   { flex: 1 },
  bloqueMateria:{ fontSize: Typography.base, fontWeight: Typography.bold },
  bloqueProfesor:{ fontSize: Typography.xs, color: Colors.text3, marginTop: 3 },
});
