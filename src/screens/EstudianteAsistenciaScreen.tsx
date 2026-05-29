import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

export default function EstudianteAsistenciaScreen() {
  const navigation = useNavigation();
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarAsistencia(); }, []);

  const cargarAsistencia = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/estudiante/asistencia');
      if (res.ok) setAsistencia(await res.json());
      else Alert.alert('Error', 'No se pudo cargar la asistencia');
    } catch (e: any) {
      if (e.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudo conectar');
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <View style={styles.flex}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Mi Asistencia</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingTxt}>Cargando asistencia...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Mi Asistencia</Text>
        <Text style={styles.headerSub}>Período actual</Text>
      </View>

      <ScrollView contentContainerStyle={styles.lista} showsVerticalScrollIndicator={false}>
        {asistencia.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={48} color={Colors.text3} />
            <Text style={styles.emptyTxt}>No hay registros de asistencia aún</Text>
          </View>
        ) : (
          asistencia.map((item, idx) => {
            const pct = item.porcentaje ?? 0;
            const color = pct >= 80 ? Colors.success : pct >= 60 ? Colors.warning : Colors.danger;
            return (
              <View key={idx} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.materiaNombre}>{item.materia}</Text>
                  <View style={[styles.badge, { backgroundColor: color }]}>
                    <Text style={styles.badgeTxt}>{pct}%</Text>
                  </View>
                </View>
                <View style={styles.barra}>
                  <View style={[styles.barraRelleno, { width: `${pct}%` as any, backgroundColor: color }]} />
                </View>
                <View style={styles.conteos}>
                  {[
                    { label: 'Presente', val: item.PRESENTE, color: Colors.success },
                    { label: 'Ausente',  val: item.AUSENTE,  color: Colors.danger },
                    { label: 'Tarde',    val: item.TARDE,    color: Colors.warning },
                    { label: 'Excusado', val: item.EXCUSADO, color: Colors.info },
                  ].map(c => (
                    <View key={c.label} style={styles.conteoItem}>
                      <Text style={[styles.conteoNum, { color: c.color }]}>{c.val ?? 0}</Text>
                      <Text style={styles.conteoLabel}>{c.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:   { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  header: {
    backgroundColor: Colors.primary, paddingTop: 52, paddingBottom: 18,
    paddingHorizontal: Spacing.xl,
  },
  backBtn: {
    position: 'absolute', top: 52, left: Spacing.lg,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitulo: { color: '#fff', fontSize: Typography.xl, fontWeight: Typography.extrabold, textAlign: 'center' },
  headerSub:    { color: 'rgba(255,255,255,0.65)', fontSize: Typography.xs, textAlign: 'center', marginTop: 4 },
  loadingTxt:   { color: Colors.text3, marginTop: Spacing.md },
  lista:        { padding: Spacing.lg },
  emptyTxt:     { color: Colors.text3, fontSize: Typography.base, marginTop: Spacing.md, textAlign: 'center' },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  materiaNombre:{ fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.text1, flex: 1 },
  badge:       { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
  badgeTxt:    { color: '#fff', fontSize: Typography.sm, fontWeight: Typography.extrabold },
  barra:       { height: 6, backgroundColor: Colors.border, borderRadius: 4, marginBottom: 14, overflow: 'hidden' },
  barraRelleno:{ height: '100%', borderRadius: 4 },
  conteos:     { flexDirection: 'row', justifyContent: 'space-around' },
  conteoItem:  { alignItems: 'center' },
  conteoNum:   { fontSize: 22, fontWeight: Typography.extrabold },
  conteoLabel: { fontSize: Typography.xs, color: Colors.text3, marginTop: 2 },
});
