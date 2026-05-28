import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

function iconoMateria(nombre: string): keyof typeof Ionicons.glyphMap {
  const n = nombre.toLowerCase();
  if (n.includes('tecnolog') || n.includes('inform') || n.includes('sistem')) return 'laptop-outline';
  if (n.includes('mat') || n.includes('álgebra') || n.includes('algebra') || n.includes('cálculo') || n.includes('calculo')) return 'infinite-outline';
  if (n.includes('lengua') || n.includes('liter') || n.includes('español') || n.includes('lectura') || n.includes('castella')) return 'book-outline';
  if (n.includes('artíst') || n.includes('artist') || n.includes('arte') || n.includes('dibujo') || n.includes('plást') || n.includes('plast')) return 'brush-outline';
  if (n.includes('música') || n.includes('musica')) return 'musical-notes-outline';
  if (n.includes('social') || n.includes('histor') || n.includes('geograf') || n.includes('civica') || n.includes('cívica')) return 'megaphone-outline';
  if (n.includes('educa') || n.includes('deport')) return 'walk-outline';
  if (n.includes('ciencia') || n.includes('biolog') || n.includes('quím') || n.includes('quim') || n.includes('físic') || n.includes('fisic')) return 'flask-outline';
  if (n.includes('inglés') || n.includes('ingles') || n.includes('idioma') || n.includes('frances') || n.includes('francés')) return 'language-outline';
  if (n.includes('ética') || n.includes('etica') || n.includes('conviv') || n.includes('moral')) return 'people-outline';
  if (n.includes('religion') || n.includes('religión') || n.includes('relig')) return 'hand-right-outline';
  return 'school-outline';
}

const ACCIONES = [
  {
    id: 'calificar',
    icono: 'create-outline' as keyof typeof Ionicons.glyphMap,
    titulo: 'Calificar',
    descripcion: 'Registrar y editar notas por desempeño',
    color: '#2563EB',
    bg: '#EFF6FF',
    modo: 'calificar',
  },
  {
    id: 'asistencia',
    icono: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
    titulo: 'Asistencia',
    descripcion: 'Registrar presencia, fallas y tardanzas',
    color: '#0EA5E9',
    bg: '#F0F9FF',
    modo: 'asistencia',
  },
  {
    id: 'planilla',
    icono: 'grid-outline' as keyof typeof Ionicons.glyphMap,
    titulo: 'Planilla de notas',
    descripcion: 'Ver tabla completa de notas y exportar PDF',
    color: '#475569',
    bg: '#F8FAFC',
    modo: 'planilla',
  },
  {
    id: 'riesgoIA',
    icono: 'analytics-outline' as keyof typeof Ionicons.glyphMap,
    titulo: 'Análisis de Riesgo IA',
    descripcion: 'Detectar estudiantes en riesgo académico',
    color: '#7C3AED',
    bg: '#F5F3FF',
    modo: 'riesgoIA',
  },
];

export default function MateriaDetalleScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { materiaId, materiaNombre } = (route.params || {}) as any;

  const icono = iconoMateria(materiaNombre || '');

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      {/* Header con identidad de la materia */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.iconoWrap}>
          <Ionicons name={icono} size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.materiaNombre}>{materiaNombre}</Text>
        <Text style={styles.headerSub}>Selecciona una acción</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>

        <Text style={styles.seccionLabel}>ACCIONES</Text>

        {ACCIONES.map((accion) => (
          <TouchableOpacity
            key={accion.id}
            style={styles.accionCard}
            activeOpacity={0.75}
            onPress={() => (navigation as any).navigate('SeleccionarPeriodo', {
              materiaId,
              materiaNombre,
              modo: accion.modo,
            })}
          >
            <View style={[styles.accionIconoWrap, { backgroundColor: accion.bg }]}>
              <Ionicons name={accion.icono} size={24} color={accion.color} />
            </View>
            <View style={styles.accionTextos}>
              <Text style={styles.accionTitulo}>{accion.titulo}</Text>
              <Text style={styles.accionDesc}>{accion.descripcion}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#1E3A5F',
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  iconoWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  materiaNombre: {
    fontSize: 20, fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', lineHeight: 26,
  },
  headerSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.55)',
    marginTop: 6, fontWeight: '500',
  },

  scroll: { flex: 1 },
  contenido: { padding: 20 },

  seccionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1.2, marginBottom: 12,
  },

  accionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  accionIconoWrap: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  accionTextos: { flex: 1 },
  accionTitulo: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  accionDesc: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 17 },
});
