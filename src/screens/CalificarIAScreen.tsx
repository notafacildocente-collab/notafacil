import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  StyleSheet, Platform, Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../services/api';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
}

interface Desempeno {
  id: string;
  nombre: string;
  porcentaje: number;
  orden: number;
}

export default function CalificarIAScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { asignacionId, periodoId, materiaNombre, periodoNumero, materiaId } = (route.params || {}) as any;

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [desempenos, setDesempenos] = useState<Desempeno[]>([]);
  const [loadingInicial, setLoadingInicial] = useState(true);

  // Paso 1
  const [desempenoSeleccionado, setDesempenoSeleccionado] = useState<Desempeno | null>(null);
  const [imagenesIA, setImagenesIA] = useState<Array<{ base64: string; mimeType: string }>>([]);

  // Paso 2 - resultados IA
  const [analizando, setAnalizando] = useState(false);
  const [resultadoIA, setResultadoIA] = useState<{
    estudianteDetectado: string | null;
    notaSugerida: number;
    razonamiento: string;
  } | null>(null);

  // Confirmación
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<Estudiante | null>(null);
  const [busquedaEst, setBusquedaEst] = useState('');
  const [valorNota, setValorNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [modalEstudiante, setModalEstudiante] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoadingInicial(true);
      const [resEst, resDes] = await Promise.all([
        apiFetch(`/api/notas/estudiantes/${asignacionId}`),
        apiFetch(`/api/notas/desempenos/${periodoId}?materiaId=${materiaId}`),
      ]);
      if (resEst.ok) setEstudiantes(await resEst.json());
      if (resDes.ok) {
        const data = await resDes.json();
        setDesempenos(data.map((d: any) => ({ ...d, porcentaje: parseFloat(String(d.porcentaje)) })));
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoadingInicial(false);
    }
  };

  const agregarImagen = async () => {
    if (imagenesIA.length >= 2) {
      Alert.alert('Máximo 2 imágenes', 'Ya tienes las 2 páginas del examen.');
      return;
    }
    Alert.alert(
      imagenesIA.length === 0 ? 'Foto del examen' : 'Foto del reverso',
      '¿Cómo obtienes la imagen?',
      [
        { text: 'Cámara', onPress: () => capturarImagen('camera') },
        { text: 'Galería', onPress: () => capturarImagen('gallery') },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  const capturarImagen = async (fuente: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (fuente === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.'); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
      }
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      setImagenesIA((prev) => [...prev, { base64: asset.base64!, mimeType: asset.mimeType || 'image/jpeg' }]);
    } catch {
      Alert.alert('Error', 'No se pudo obtener la imagen');
    }
  };

  const analizarConIA = async () => {
    if (!desempenoSeleccionado) {
      Alert.alert('Selecciona desempeño', 'Primero elige el desempeño a calificar.');
      return;
    }
    if (imagenesIA.length === 0) {
      Alert.alert('Sin imagen', 'Agrega al menos una foto del examen.');
      return;
    }
    try {
      setAnalizando(true);
      setResultadoIA(null);
      const res = await apiFetch('/api/notas/detectar-ia', {
        method: 'POST',
        body: JSON.stringify({ asignacionId, imagenes: imagenesIA }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error IA');
      }
      const data = await res.json();
      setResultadoIA(data);
      setValorNota(data.notaSugerida.toFixed(1));

      // Auto-match nombre detectado con lista de estudiantes
      if (data.estudianteDetectado) {
        const nombreIA = data.estudianteDetectado.toLowerCase();
        const match = estudiantes.find((e) => {
          const nombreCompleto = `${e.nombre} ${e.apellido}`.toLowerCase();
          return (
            nombreCompleto.includes(nombreIA) ||
            nombreIA.includes(e.nombre.toLowerCase()) ||
            nombreIA.includes(e.apellido.toLowerCase())
          );
        });
        if (match) setEstudianteSeleccionado(match);
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') Alert.alert('Error IA', error.message || 'No se pudo analizar');
    } finally {
      setAnalizando(false);
    }
  };

  const guardarNota = async () => {
    if (!estudianteSeleccionado) { Alert.alert('Falta estudiante', 'Selecciona el estudiante.'); return; }
    if (!desempenoSeleccionado) { Alert.alert('Falta desempeño', 'Selecciona el desempeño.'); return; }
    const valorLimpio = valorNota.replace(',', '.').trim();
    if (!/^\d+(\.\d+)?$/.test(valorLimpio)) { Alert.alert('Nota inválida', 'Ingresa un número. Ej: 4.5'); return; }
    const valor = parseFloat(valorLimpio);
    if (valor < 1.0 || valor > 5.0) { Alert.alert('Nota inválida', 'La nota debe estar entre 1.0 y 5.0'); return; }

    try {
      setGuardando(true);
      const res = await apiFetch('/api/notas', {
        method: 'POST',
        body: JSON.stringify({
          asignacionId,
          desempenoId: desempenoSeleccionado.id,
          estudianteId: estudianteSeleccionado.id,
          valor,
          descripcion: `IA: ${resultadoIA?.razonamiento?.slice(0, 80) || 'Calificado con IA'}`,
          creadoOffline: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
      }
      Alert.alert(
        '✅ Nota guardada',
        `${estudianteSeleccionado.nombre} ${estudianteSeleccionado.apellido}\nNota: ${valor.toFixed(1)}\n\n¿Calificar otro examen?`,
        [
          {
            text: 'Sí, continuar',
            onPress: () => {
              setResultadoIA(null);
              setImagenesIA([]);
              setEstudianteSeleccionado(null);
              setValorNota('');
            },
          },
          { text: 'Terminar', onPress: () => (navigation as any).goBack() },
        ],
      );
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') Alert.alert('Error', error.message || 'No se pudo guardar la nota');
    } finally {
      setGuardando(false);
    }
  };

  const estudiantesFiltrados = busquedaEst.trim()
    ? estudiantes.filter((e) =>
        `${e.nombre} ${e.apellido}`.toLowerCase().includes(busquedaEst.toLowerCase()),
      )
    : estudiantes;

  if (loadingInicial) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.headerBar}>
        <Text style={styles.headerMateria}>{materiaNombre}</Text>
        <Text style={styles.headerPeriodo}>Periodo {periodoNumero}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* PASO 1 — Desempeño */}
        <View style={styles.paso}>
          <Text style={styles.pasoLabel}>1. Desempeño a calificar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.desempenosRow}>
              {desempenos.map((d, idx) => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.desempenoChip, desempenoSeleccionado?.id === d.id && styles.desempenoChipActivo]}
                  onPress={() => setDesempenoSeleccionado(d)}
                >
                  <Text style={[styles.desempenoChipText, desempenoSeleccionado?.id === d.id && styles.desempenoChipTextActivo]}>
                    D{idx + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          {desempenoSeleccionado && (
            <Text style={styles.desempenoNombreInfo}>{desempenoSeleccionado.nombre}</Text>
          )}
        </View>

        {/* PASO 2 — Fotos */}
        <View style={styles.paso}>
          <Text style={styles.pasoLabel}>2. Foto del examen</Text>
          <View style={styles.fotosRow}>
            {imagenesIA.map((img, idx) => (
              <View key={idx} style={styles.fotoContainer}>
                <Image
                  source={{ uri: `data:${img.mimeType};base64,${img.base64}` }}
                  style={styles.fotoThumb}
                />
                <TouchableOpacity
                  style={styles.fotoRemove}
                  onPress={() => { setImagenesIA((prev) => prev.filter((_, i) => i !== idx)); setResultadoIA(null); }}
                >
                  <Text style={styles.fotoRemoveText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.fotoLabel}>{idx === 0 ? 'Frente' : 'Reverso'}</Text>
              </View>
            ))}
            {imagenesIA.length < 2 && (
              <TouchableOpacity style={styles.fotoAgregar} onPress={agregarImagen}>
                <Text style={styles.fotoAgregarIcon}>📷</Text>
                <Text style={styles.fotoAgregarText}>
                  {imagenesIA.length === 0 ? 'Agregar foto' : 'Agregar reverso'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Botón analizar */}
        {imagenesIA.length > 0 && !resultadoIA && (
          <TouchableOpacity
            style={[styles.botonAnalizar, (analizando || !desempenoSeleccionado) && styles.botonDisabled]}
            onPress={analizarConIA}
            disabled={analizando}
          >
            {analizando ? (
              <View style={styles.botonAnalizarInner}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.botonAnalizarText}> Analizando con IA...</Text>
              </View>
            ) : (
              <Text style={styles.botonAnalizarText}>🤖  Detectar nombre y Calificar</Text>
            )}
          </TouchableOpacity>
        )}

        {/* PASO 3 — Confirmación */}
        {resultadoIA && (
          <View style={styles.paso}>
            <Text style={styles.pasoLabel}>3. Confirmar y guardar</Text>

            {/* Resultado IA */}
            <View style={styles.resultadoCard}>
              <View style={styles.resultadoHeader}>
                <Text style={styles.resultadoLabel}>Nota sugerida por IA</Text>
                <Text style={[styles.resultadoNota, { color: resultadoIA.notaSugerida >= 3.0 ? '#10b981' : '#ef4444' }]}>
                  {resultadoIA.notaSugerida.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.resultadoRazonamiento}>{resultadoIA.razonamiento}</Text>
              {resultadoIA.estudianteDetectado ? (
                <View style={styles.detectadoBadge}>
                  <Text style={styles.detectadoText}>🔍 Detectado: {resultadoIA.estudianteDetectado}</Text>
                </View>
              ) : (
                <View style={[styles.detectadoBadge, { backgroundColor: '#fef3c7' }]}>
                  <Text style={[styles.detectadoText, { color: '#92400e' }]}>⚠️ No se detectó nombre, selecciónalo manualmente</Text>
                </View>
              )}
            </View>

            {/* Selector estudiante */}
            <Text style={styles.inputLabel}>Estudiante *</Text>
            <TouchableOpacity
              style={styles.selectorEstudiante}
              onPress={() => { setBusquedaEst(''); setModalEstudiante(true); }}
            >
              <Text style={estudianteSeleccionado ? styles.selectorTexto : styles.selectorPlaceholder}>
                {estudianteSeleccionado
                  ? `${estudianteSeleccionado.nombre} ${estudianteSeleccionado.apellido}`
                  : 'Toca para seleccionar estudiante'}
              </Text>
              <Text style={styles.selectorArrow}>›</Text>
            </TouchableOpacity>

            {/* Nota editable */}
            <Text style={styles.inputLabel}>Nota (editar si es necesario)</Text>
            <TextInput
              style={styles.inputNota}
              keyboardType="decimal-pad"
              value={valorNota}
              onChangeText={setValorNota}
              placeholder="Ej: 4.5"
            />

            <TouchableOpacity
              style={[styles.botonGuardar, guardando && styles.botonDisabled]}
              onPress={guardarNota}
              disabled={guardando}
            >
              {guardando
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.botonGuardarText}>💾  Guardar nota</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonRehacer}
              onPress={() => { setResultadoIA(null); setImagenesIA([]); setEstudianteSeleccionado(null); setValorNota(''); }}
            >
              <Text style={styles.botonRehacerText}>↩ Volver a fotografiar</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal selector de estudiante */}
      <Modal visible={modalEstudiante} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitulo}>Seleccionar estudiante</Text>
            <TextInput
              style={styles.modalBusqueda}
              placeholder="Buscar por nombre..."
              placeholderTextColor="#9ca3af"
              value={busquedaEst}
              onChangeText={setBusquedaEst}
              autoFocus
            />
            <ScrollView style={styles.modalLista}>
              {estudiantesFiltrados.map((est) => (
                <TouchableOpacity
                  key={est.id}
                  style={[styles.modalItem, estudianteSeleccionado?.id === est.id && styles.modalItemActivo]}
                  onPress={() => { setEstudianteSeleccionado(est); setModalEstudiante(false); }}
                >
                  <Text style={[styles.modalItemNombre, estudianteSeleccionado?.id === est.id && styles.modalItemNombreActivo]}>
                    {est.nombre} {est.apellido}
                  </Text>
                  <Text style={styles.modalItemDoc}>{est.numeroDocumento}</Text>
                </TouchableOpacity>
              ))}
              {estudiantesFiltrados.length === 0 && (
                <Text style={styles.modalVacio}>Sin resultados</Text>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelar} onPress={() => setModalEstudiante(false)}>
              <Text style={styles.modalCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  headerBar: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerMateria: { color: '#fff', fontWeight: '700', fontSize: 16, flex: 1 },
  headerPeriodo: { color: '#ddd6fe', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  paso: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  pasoLabel: { fontSize: 12, fontWeight: '700', color: '#7c3aed', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  desempenosRow: { flexDirection: 'row', gap: 8 },
  desempenoChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f5f3ff', borderWidth: 1.5, borderColor: '#a78bfa' },
  desempenoChipActivo: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  desempenoChipText: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },
  desempenoChipTextActivo: { color: '#fff' },
  desempenoNombreInfo: { fontSize: 13, color: '#4b5563', marginTop: 10, fontStyle: 'italic' },
  fotosRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' },
  fotoContainer: { alignItems: 'center', position: 'relative' },
  fotoThumb: { width: 96, height: 96, borderRadius: 10, borderWidth: 2, borderColor: '#7c3aed' },
  fotoRemove: { position: 'absolute', top: -9, right: -9, backgroundColor: '#ef4444', borderRadius: 12, width: 24, height: 24, justifyContent: 'center', alignItems: 'center' },
  fotoRemoveText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  fotoLabel: { fontSize: 11, color: '#7c3aed', fontWeight: '700', marginTop: 6 },
  fotoAgregar: { width: 96, height: 96, borderRadius: 10, borderWidth: 2, borderColor: '#a78bfa', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf5ff' },
  fotoAgregarIcon: { fontSize: 28 },
  fotoAgregarText: { fontSize: 11, color: '#7c3aed', fontWeight: '600', textAlign: 'center', marginTop: 4 },
  botonAnalizar: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  botonAnalizarInner: { flexDirection: 'row', alignItems: 'center' },
  botonAnalizarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  botonDisabled: { opacity: 0.5 },
  resultadoCard: { backgroundColor: '#faf5ff', borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: '#a78bfa', marginBottom: 14 },
  resultadoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  resultadoLabel: { fontSize: 11, fontWeight: '700', color: '#7c3aed', textTransform: 'uppercase' },
  resultadoNota: { fontSize: 40, fontWeight: '900' },
  resultadoRazonamiento: { fontSize: 13, color: '#4b5563', lineHeight: 19, marginBottom: 8 },
  detectadoBadge: { backgroundColor: '#ede9fe', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  detectadoText: { fontSize: 13, color: '#5b21b6', fontWeight: '600' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  selectorEstudiante: { borderWidth: 1.5, borderColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf5ff', marginBottom: 14 },
  selectorTexto: { fontSize: 15, color: '#111827', fontWeight: '600', flex: 1 },
  selectorPlaceholder: { fontSize: 14, color: '#9ca3af', flex: 1 },
  selectorArrow: { fontSize: 24, color: '#7c3aed', fontWeight: '700' },
  inputNota: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 22, fontWeight: '700', color: '#111827', backgroundColor: '#f9fafb', marginBottom: 16, textAlign: 'center' },
  botonGuardar: { backgroundColor: '#7c3aed', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginBottom: 10 },
  botonGuardarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  botonRehacer: { alignItems: 'center', paddingVertical: 10 },
  botonRehacerText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, maxHeight: '72%' },
  modalTitulo: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalBusqueda: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 12, backgroundColor: '#f9fafb', color: '#111827' },
  modalLista: { maxHeight: 320 },
  modalItem: { paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemActivo: { backgroundColor: '#f5f3ff', borderRadius: 8, paddingHorizontal: 8 },
  modalItemNombre: { fontSize: 15, color: '#111827', fontWeight: '500' },
  modalItemNombreActivo: { color: '#7c3aed', fontWeight: '700' },
  modalItemDoc: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  modalVacio: { textAlign: 'center', color: '#9ca3af', marginTop: 20, fontSize: 14 },
  modalCancelar: { marginTop: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8 },
  modalCancelarText: { color: '#475569', fontWeight: '600', fontSize: 15 },
});
