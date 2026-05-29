import React, { useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Animated,
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
    titulo: 'Calificar por Desempeños',
    descripcion: 'Registrar y editar notas por desempeño',
    color: '#2D5FA8',
    bg: '#EFF6FF',
    modo: 'calificar',
  },
  {
    id: 'asistencia',
    icono: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
    titulo: 'Control de Asistencia',
    descripcion: 'Registrar presencia, fallas y tardanzas',
    color: '#0EA5E9',
    bg: '#F0F9FF',
    modo: 'asistencia',
  },
  {
    id: 'planilla',
    icono: 'grid-outline' as keyof typeof Ionicons.glyphMap,
    titulo: 'Malla por Grupos',
    descripcion: 'Ver tabla completa de notas y exportar PDF',
    color: '#475569',
    bg: '#F8FAFC',
    modo: 'planilla',
  },
];

export default function MateriaDetalleScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { materiaId, materiaNombre } = (route.params || {}) as any;

  const icono = iconoMateria(materiaNombre || '');

  // ── Animación VIP ──
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.15)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.025, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 850, useNativeDriver: true }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.35, duration: 1100, useNativeDriver: false }),
        Animated.timing(glowOpacity, { toValue: 0.15, duration: 1100, useNativeDriver: false }),
      ]),
    ).start();
  }, []);

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

        {/* ── EVALUAR CON IA — VIP ── */}
        <Text style={[styles.seccionLabel, { marginTop: 20, color: '#7C3AED' }]}>⭐ INTELIGENCIA ARTIFICIAL</Text>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.iaVipCard}
            activeOpacity={0.85}
            onPress={() => (navigation as any).navigate('SeleccionarPeriodo', {
              materiaId,
              materiaNombre,
              modo: 'calificarIA',
            })}
          >
            {/* Glow animado */}
            <Animated.View style={[styles.iaVipGlow, { opacity: glowOpacity }]} />

            {/* Badge VIP */}
            <View style={styles.iaVipBadge}>
              <Text style={styles.iaVipBadgeTxt}>✦ VIP</Text>
            </View>

            {/* Ícono */}
            <View style={styles.iaVipIconWrap}>
              <Ionicons name="sparkles" size={30} color="#FCD34D" />
            </View>

            {/* Textos */}
            <View style={{ flex: 1 }}>
              <Text style={styles.iaVipTitulo}>Evaluar con IA</Text>
              <Text style={styles.iaVipDesc}>
                Fotografía el examen · la IA califica{'\n'}y genera el razonamiento automáticamente
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#2D5FA8',
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
  accionDesc: { fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 17 },

  // ── Botón VIP Evaluar con IA ──
  iaVipCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: '#5B21B6',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 10,
  },
  iaVipGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#A78BFA',
    borderRadius: 18,
  },
  iaVipBadge: {
    position: 'absolute', top: 10, right: 12,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 10,
  },
  iaVipBadgeTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 10, letterSpacing: 0.8 },
  iaVipIconWrap: {
    width: 58, height: 58, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  iaVipTitulo: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 5 },
  iaVipDesc: { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 17 },
});
