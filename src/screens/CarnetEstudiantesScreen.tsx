import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiFetch } from '../services/api';

const API_URL = 'https://notafacil-backend-539h.onrender.com';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
}

interface ColegioConfig {
  nombre: string;
  logoUrl: string | null;
  ciudad: string;
  rectorNombre: string;
}

export default function CarnetEstudiantesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { asignacionId, cursoNombre } = (route.params || {}) as any;

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [colegio, setColegio] = useState<ColegioConfig>({
    nombre: 'Institución Educativa', logoUrl: null, ciudad: '', rectorNombre: '',
  });

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const [resEst, resCfg] = await Promise.all([
        apiFetch(`/api/notas/estudiantes/${asignacionId}`),
        fetch(`${API_URL}/api/auth/config`),
      ]);
      if (!resEst.ok) throw new Error('Error estudiantes');
      const data: Estudiante[] = await resEst.json();
      const ordenados = [...data].sort((a, b) =>
        `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es'),
      );
      setEstudiantes(ordenados);
      // Seleccionar todos por defecto
      setSeleccionados(new Set(ordenados.map((e) => e.id)));
      if (resCfg.ok) setColegio(await resCfg.json());
    } catch {
      Alert.alert('Error', 'No se pudo cargar la lista de estudiantes');
    } finally {
      setLoading(false);
    }
  }, [asignacionId]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleEstudiante = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (seleccionados.size === estudiantes.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(estudiantes.map((e) => e.id)));
    }
  };

  const generarPDF = async () => {
    const lista = estudiantes.filter((e) => seleccionados.has(e.id));
    if (lista.length === 0) {
      Alert.alert('Sin selección', 'Selecciona al menos un estudiante.');
      return;
    }
    try {
      setGenerando(true);

      const fechaExpedicion = new Date().toLocaleDateString('es-CO', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      const logoHtml = colegio.logoUrl
        ? `<img src="${colegio.logoUrl}" class="escudo" />`
        : `<div class="escudo-placeholder">${colegio.nombre.charAt(0)}</div>`;

      const siluetaHtml = `
        <svg viewBox="0 0 60 80" width="60" height="80" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="30" cy="22" rx="14" ry="14" fill="#b0bec5"/>
          <path d="M4,75 Q4,48 30,48 Q56,48 56,75 Z" fill="#b0bec5"/>
        </svg>`;

      const carnetesHtml = lista.map((est) => {
        const codigo = est.numeroDocumento.slice(-5).padStart(5, '0');
        const qrData = encodeURIComponent(`TI-${est.numeroDocumento}|${est.apellido} ${est.nombre}`);
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=72x72&data=${qrData}`;

        return `
        <div class="carnet-wrap">
          <!-- FRENTE -->
          <div class="carnet frente">
            <div class="frente-fondo"></div>
            <div class="frente-foto">${siluetaHtml}</div>
            <div class="frente-contenido">
              <div class="inst-nombre">${colegio.nombre.toUpperCase()}</div>
              <div class="carnet-titulo">CARNET ESTUDIANTIL</div>
              <div class="separador"></div>
              <div class="campo"><span class="campo-label">NOMBRES:</span> ${est.nombre.toUpperCase()}</div>
              <div class="campo"><span class="campo-label">APELLIDOS:</span> ${est.apellido.toUpperCase()}</div>
              <div class="campo"><span class="campo-label">IDENT:</span> TI - ${est.numeroDocumento}</div>
              <div class="campo"><span class="campo-label">GRADO:</span> ${cursoNombre || '—'}</div>
              <div class="campo"><span class="campo-label">CÓDIGO:</span> ${codigo}</div>
            </div>
            <div class="frente-escudo">${logoHtml}</div>
          </div>

          <!-- REVERSO -->
          <div class="carnet reverso">
            <div class="reverso-top">
              <img src="${qrUrl}" class="qr" />
            </div>
            <div class="reverso-doc">TI - ${est.numeroDocumento}</div>
            <div class="reverso-firma-linea"></div>
            <div class="reverso-rector">${colegio.rectorNombre || 'Director(a)'}</div>
            <div class="reverso-cargo">Rector(a)</div>
            <div class="reverso-texto">
              Este carnet es personal e intransferible y acredita al
              portador como estudiante de la institución.
            </div>
            <div class="reverso-fecha">Fecha de expedición: ${fechaExpedicion}</div>
          </div>
        </div>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; padding: 12px; }

  /* ── Grid de carnets: 2 por fila (frente+reverso) ── */
  .carnet-wrap {
    display: inline-flex;
    gap: 6px;
    margin: 6px;
    page-break-inside: avoid;
    vertical-align: top;
  }

  /* Dimensiones tarjeta crédito: 85.6 × 54 mm */
  .carnet {
    width: 242px;
    height: 153px;
    border-radius: 10px;
    overflow: hidden;
    position: relative;
    border: 1px solid #ccc;
    box-shadow: 0 1px 4px rgba(0,0,0,0.15);
  }

  /* ── FRENTE ── */
  .frente { background: #fff; display: flex; align-items: stretch; }

  .frente-fondo {
    position: absolute; left: 0; top: 0; bottom: 0; width: 72px;
    background: linear-gradient(160deg, #1E3A5F 60%, #2563EB 100%);
    border-radius: 10px 0 0 10px;
  }
  .frente-foto {
    position: absolute; left: 6px; top: 50%;
    transform: translateY(-50%);
    z-index: 2;
  }
  .frente-foto svg { opacity: 0.85; }

  .frente-contenido {
    margin-left: 76px;
    padding: 8px 8px 8px 4px;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .inst-nombre {
    font-size: 7.5px; font-weight: 900; color: #1E3A5F;
    line-height: 1.2; margin-bottom: 2px;
    text-transform: uppercase;
  }
  .carnet-titulo {
    font-size: 7px; font-weight: 700; color: #2563EB;
    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
  }
  .separador {
    height: 1px; background: #E2E8F0; margin-bottom: 4px;
  }
  .campo { font-size: 7px; color: #0F172A; margin-bottom: 2.5px; line-height: 1.3; }
  .campo-label { font-weight: 700; color: #475569; }

  .frente-escudo {
    position: absolute; bottom: 6px; right: 6px;
    width: 36px; height: 36px;
  }
  .frente-escudo .escudo { width: 36px; height: 36px; object-fit: contain; }
  .escudo-placeholder {
    width: 36px; height: 36px; background: #1E3A5F; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 16px; font-weight: 900;
  }

  /* ── REVERSO ── */
  .reverso {
    background: #F8FAFC;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 8px;
    text-align: center;
  }
  .reverso-top { display: flex; justify-content: flex-end; width: 100%; margin-bottom: 2px; }
  .qr { width: 54px; height: 54px; }
  .reverso-doc { font-size: 7px; color: #64748B; margin-bottom: 8px; }
  .reverso-firma-linea {
    width: 110px; border-top: 1px solid #334155;
    margin-bottom: 3px;
  }
  .reverso-rector { font-size: 7.5px; font-weight: 700; color: #0F172A; }
  .reverso-cargo { font-size: 7px; color: #64748B; margin-bottom: 6px; }
  .reverso-texto {
    font-size: 6.5px; color: #475569; line-height: 1.4;
    max-width: 200px; margin-bottom: 4px;
  }
  .reverso-fecha { font-size: 6.5px; color: #64748B; font-style: italic; }

  @media print {
    body { padding: 0; }
    .carnet-wrap { page-break-inside: avoid; }
  }
</style>
</head>
<body>
${carnetesHtml}
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Carnets - ${lista.length} estudiante${lista.length !== 1 ? 's' : ''}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF de carnets');
    } finally {
      setGenerando(false);
    }
  };

  const todosSeleccionados = seleccionados.size === estudiantes.length && estudiantes.length > 0;
  const algunoSeleccionado = seleccionados.size > 0;

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Cargando estudiantes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextos}>
          <Text style={styles.headerTitulo}>Carnets de Estudiantes</Text>
          <Text style={styles.headerSub}>{seleccionados.size} de {estudiantes.length} seleccionados</Text>
        </View>
        <TouchableOpacity
          style={[styles.imprimirBtn, (!algunoSeleccionado || generando) && { opacity: 0.5 }]}
          onPress={generarPDF}
          disabled={!algunoSeleccionado || generando}
        >
          {generando
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <>
                <Ionicons name="print-outline" size={16} color="#FFFFFF" />
                <Text style={styles.imprimirBtnTxt}>Imprimir</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* Barra seleccionar todos */}
      <TouchableOpacity style={styles.barraSeleccion} onPress={toggleTodos}>
        <View style={[styles.checkbox, todosSeleccionados && styles.checkboxActivo]}>
          {todosSeleccionados && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
        <Text style={styles.barraSeleccionTxt}>
          {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
        </Text>
        <Text style={styles.barraSeleccionCount}>{estudiantes.length} estudiantes</Text>
      </TouchableOpacity>

      {/* Lista */}
      <FlatList
        data={estudiantes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const activo = seleccionados.has(item.id);
          return (
            <TouchableOpacity
              style={[styles.fila, activo && styles.filaActiva, index % 2 === 1 && styles.filaPar]}
              onPress={() => toggleEstudiante(item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, activo && styles.checkboxActivo]}>
                {activo && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.filaNumero}>
                <Text style={styles.filaNumeroTxt}>{index + 1}</Text>
              </View>
              <View style={styles.filaInfo}>
                <Text style={styles.filaNombre} numberOfLines={1}>
                  {item.apellido} {item.nombre}
                </Text>
                <Text style={styles.filaDoc}>Doc: {item.numeroDocumento}</Text>
              </View>
              <View style={styles.filaCarnetPreview}>
                <Ionicons name="id-card-outline" size={20} color={activo ? '#2563EB' : '#CBD5E1'} />
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Pie */}
      {algunoSeleccionado && (
        <View style={styles.pie}>
          <TouchableOpacity
            style={[styles.pieBtn, generando && { opacity: 0.6 }]}
            onPress={generarPDF}
            disabled={generando}
          >
            {generando ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.pieBtnTxt}>Generando PDF...</Text>
              </>
            ) : (
              <>
                <Ionicons name="print-outline" size={18} color="#FFFFFF" />
                <Text style={styles.pieBtnTxt}>
                  Imprimir {seleccionados.size} carnet{seleccionados.size !== 1 ? 's' : ''}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#64748B', fontSize: 15 },

  header: {
    backgroundColor: '#1E3A5F',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTextos: { flex: 1 },
  headerTitulo: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#93C5FD', marginTop: 2 },
  imprimirBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#2563EB', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 20,
  },
  imprimirBtnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  barraSeleccion: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  barraSeleccionTxt: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  barraSeleccionCount: { fontSize: 13, color: '#94A3B8' },

  lista: { paddingBottom: 100 },

  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  filaPar: { backgroundColor: '#FAFAFA' },
  filaActiva: { backgroundColor: '#EFF6FF' },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#CBD5E1',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActivo: { backgroundColor: '#2563EB', borderColor: '#2563EB' },

  filaNumero: {
    width: 28, alignItems: 'center',
  },
  filaNumeroTxt: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },

  filaInfo: { flex: 1 },
  filaNombre: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  filaDoc: { fontSize: 11, color: '#64748B', marginTop: 2 },

  filaCarnetPreview: { width: 32, alignItems: 'center' },

  pie: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  pieBtn: {
    backgroundColor: '#1E3A5F', borderRadius: 14,
    paddingVertical: 15, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  pieBtnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
