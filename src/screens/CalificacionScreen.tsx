import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  StyleSheet, Platform, Image, Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../services/api';

interface Estudiante {
  id: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
  telefonoAcudiente?: string | null;
}

interface Desempeno {
  id: string;
  nombre: string;
  porcentaje: number;
  orden: number;
}

interface Nota {
  id: string;
  estudianteId: string;
  desempenoId: string;
  asignacionId: string;
  valor: number;
  descripcion: string;
  createdAt: string;
}

interface SugerenciaIA {
  notaSugerida: number;
  razonamiento: string;
}

export default function CalificacionScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { asignacionId, periodoId, materiaNombre, periodoNumero, materiaId } = (route.params || {}) as any;

  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [desempenos, setDesempenos] = useState<Desempeno[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [estudianteActivo, setEstudianteActivo] = useState<Estudiante | null>(null);
  const [loadingInicial, setLoadingInicial] = useState(true);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [desempenoSeleccionado, setDesempenoSeleccionado] = useState<Desempeno | null>(null);
  const [valorInput, setValorInput] = useState('');
  const [descripcionInput, setDescripcionInput] = useState('');
  const [descripcionSugerida, setDescripcionSugerida] = useState<string | null>(null);
  const [loadingDescripcion, setLoadingDescripcion] = useState(false);
  const [busquedaEst, setBusquedaEst] = useState('');
  const [calificandoIA, setCalificandoIA] = useState(false);
  const [sugerenciaIA, setSugerenciaIA] = useState<SugerenciaIA | null>(null);
  const [imagenesIA, setImagenesIA] = useState<Array<{base64: string; mimeType: string}>>([]);
  // Teléfono acudiente
  const [modalTelefono, setModalTelefono] = useState(false);
  const [telefonoInput, setTelefonoInput] = useState('');
  const [guardandoTelefono, setGuardandoTelefono] = useState(false);

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setLoadingInicial(true);
        const [resEst, resDes] = await Promise.all([
          apiFetch(`/api/notas/estudiantes/${asignacionId}`),
          apiFetch(`/api/notas/desempenos/${periodoId}?materiaId=${materiaId}`),
        ]);

        if (!resEst.ok) throw new Error('Error cargando estudiantes');
        if (!resDes.ok) throw new Error('Error cargando desempeños');

        const [dataEst, dataDes]: [Estudiante[], any[]] = await Promise.all([
          resEst.json(),
          resDes.json(),
        ]);

        setEstudiantes(dataEst);
        setDesempenos(dataDes.map((d: any) => ({ ...d, porcentaje: parseFloat(String(d.porcentaje)) })));
        if (dataEst.length > 0) setEstudianteActivo(dataEst[0]);
      } catch (error: any) {
        if (error.message !== 'Sesión vencida') {
          Alert.alert('Error', 'No se pudieron cargar los datos');
        }
      } finally {
        setLoadingInicial(false);
      }
    };
    if (asignacionId && periodoId) cargarDatosIniciales();
  }, [asignacionId, periodoId]);

  const cargarNotas = useCallback(async (estudianteId: string) => {
    try {
      const res = await apiFetch(`/api/notas?asignacionId=${asignacionId}&estudianteId=${estudianteId}`);
      if (res.ok) {
        const data: Nota[] = await res.json();
        setNotas(data.map((n) => ({ ...n, valor: parseFloat(String(n.valor)) })));
      }
    } catch (error) {
      console.error('Error cargando notas:', error);
    } finally {
      setLoadingNotas(false);
    }
  }, [asignacionId]);

  useEffect(() => {
    if (estudianteActivo) cargarNotas(estudianteActivo.id);
    else setNotas([]);
  }, [estudianteActivo, cargarNotas]);

  const calcularPromedio = (desempenoId: string): { promedio: number; cantidad: number } => {
    const notasDesempeno = notas.filter((n) => n.desempenoId === desempenoId);
    if (notasDesempeno.length === 0) return { promedio: 0, cantidad: 0 };
    const suma = notasDesempeno.reduce((acc, n) => acc + n.valor, 0);
    return { promedio: Math.round((suma / notasDesempeno.length) * 10) / 10, cantidad: notasDesempeno.length };
  };

  const calcularNotaFinal = (): number => {
    const desempenosActivos = desempenos.filter(d => calcularPromedio(d.id).promedio > 0);
    if (desempenosActivos.length === 0) return 0;
    const suma = desempenosActivos.reduce((acc, d) => acc + calcularPromedio(d.id).promedio, 0);
    return Math.round((suma / desempenosActivos.length) * 10) / 10;
  };

  const handleAgregarNota = async () => {
    if (!valorInput.trim() || !estudianteActivo || !desempenoSeleccionado) {
      Alert.alert('Error', 'Ingresa el valor de la nota');
      return;
    }
    const valorLimpio = valorInput.replace(',', '.').trim();
    if (!/^\d+(\.\d+)?$/.test(valorLimpio)) {
      Alert.alert('Error', 'La nota debe ser un número. Ejemplo: 4.5');
      return;
    }
    const valor = parseFloat(valorLimpio);
    if (valor < 1.0) { Alert.alert('Nota muy baja', 'La nota mínima es 1.0'); return; }
    if (valor > 5.0) { Alert.alert('Nota muy alta', 'La nota máxima es 5.0'); return; }

    try {
      setSaving(true);
      const res = await apiFetch('/api/notas', {
        method: 'POST',
        body: JSON.stringify({
          asignacionId,
          desempenoId: desempenoSeleccionado.id,
          estudianteId: estudianteActivo.id,
          valor,
          descripcion: descripcionInput.trim() || undefined,
          creadoOffline: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
      }
      const notaNueva: any = await res.json();
      setNotas((prev) => [{ ...notaNueva, valor: parseFloat(String(notaNueva.valor)) }, ...prev]);
      setValorInput('');
      setDescripcionInput('');
      setSugerenciaIA(null);
      setImagenesIA([]);
      setModalVisible(false);
      // Notificación WhatsApp si el acudiente tiene teléfono registrado
      if (notaNueva.waLink) {
        Alert.alert(
          '✅ Nota guardada',
          `¿Enviar notificación a acudiente de ${estudianteActivo?.nombre}?`,
          [
            { text: 'No', style: 'cancel' },
            {
              text: '📱 Enviar WhatsApp',
              onPress: () => Linking.openURL(notaNueva.waLink).catch(() => {
                Alert.alert('Error', 'No se pudo abrir WhatsApp');
              }),
            },
          ],
        );
      }
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error', error.message || 'No se pudo guardar la nota');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarNota = (nota: Nota) => {
    Alert.alert('Eliminar nota', `¿Eliminar la nota ${nota.valor.toFixed(1)}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            const res = await apiFetch(`/api/notas/${nota.id}`, { method: 'DELETE' });
            if (res.ok || res.status === 204) {
              setNotas((prev) => prev.filter((n) => n.id !== nota.id));
            }
          } catch (error: any) {
            if (error.message !== 'Sesión vencida') {
              Alert.alert('Error', 'No se pudo eliminar la nota');
            }
          }
        },
      },
    ]);
  };

  const abrirModal = async (desempeno: Desempeno) => {
    setDesempenoSeleccionado(desempeno);
    setValorInput('');
    setSugerenciaIA(null);
    setImagenesIA([]);
    setDescripcionSugerida(null);
    setModalVisible(true);

    const notasActuales = notas.filter((n) => n.desempenoId === desempeno.id);
    const posicion = notasActuales.length;

    try {
      setLoadingDescripcion(true);
      const res = await apiFetch(
        `/api/notas/descripcion-sugerida?asignacionId=${asignacionId}&desempenoId=${desempeno.id}&posicion=${posicion}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.descripcion) {
          setDescripcionSugerida(data.descripcion);
          setDescripcionInput(data.descripcion);
        } else {
          setDescripcionInput('');
        }
      }
    } catch (_) {
      setDescripcionInput('');
    } finally {
      setLoadingDescripcion(false);
    }
  };

  const agregarImagenIA = async () => {
    if (imagenesIA.length >= 2) {
      Alert.alert('Máximo 2 imágenes', 'Ya tienes las 2 páginas del examen agregadas.');
      return;
    }
    Alert.alert(
      imagenesIA.length === 0 ? 'Agregar imagen del examen' : 'Agregar reverso del examen',
      '¿Cómo quieres obtener la imagen?',
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
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
          base64: true,
        });
      }
      if (result.canceled || !result.assets?.[0]?.base64) return;
      const asset = result.assets[0];
      setImagenesIA((prev) => [...prev, { base64: asset.base64!, mimeType: asset.mimeType || 'image/jpeg' }]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la imagen');
    }
  };

  const analizarConIA = async () => {
    if (!desempenoSeleccionado || imagenesIA.length === 0) return;
    try {
      setCalificandoIA(true);
      setSugerenciaIA(null);
      const res = await apiFetch('/api/notas/calificar-ia', {
        method: 'POST',
        body: JSON.stringify({
          asignacionId,
          desempenoId: desempenoSeleccionado.id,
          imagenes: imagenesIA,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al calificar con IA');
      }
      const data: SugerenciaIA = await res.json();
      setSugerenciaIA(data);
      setValorInput(data.notaSugerida.toFixed(1));
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') {
        Alert.alert('Error IA', error.message || 'No se pudo calificar con IA');
      }
    } finally {
      setCalificandoIA(false);
    }
  };

  const handleGuardarTelefono = async () => {
    if (!estudianteActivo) return;
    try {
      setGuardandoTelefono(true);
      const tel = telefonoInput.trim() || null;
      const res = await apiFetch(`/api/notas/estudiantes/${estudianteActivo.id}/telefono`, {
        method: 'PUT',
        body: JSON.stringify({ telefonoAcudiente: tel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Error al guardar');
      }
      // Actualizar estado local
      setEstudiantes((prev) =>
        prev.map((e) => e.id === estudianteActivo.id ? { ...e, telefonoAcudiente: tel } : e),
      );
      setEstudianteActivo((prev) => prev ? { ...prev, telefonoAcudiente: tel } : prev);
      setModalTelefono(false);
      Alert.alert(tel ? '✅ Teléfono guardado' : '✅ Teléfono eliminado', '');
    } catch (error: any) {
      if (error.message !== 'Sesión vencida') Alert.alert('Error', error.message || 'No se pudo guardar');
    } finally {
      setGuardandoTelefono(false);
    }
  };

  if (loadingInicial) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1a3a6b" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (estudiantes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No hay estudiantes en este curso</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const notaFinal = calcularNotaFinal();
  const aprobado = notaFinal >= 3.0;

  return (
    <View style={styles.flex}>
      <View style={styles.headerBar}>
        <Text style={styles.headerMateria}>{materiaNombre}</Text>
        <Text style={styles.headerPeriodo}>Periodo {periodoNumero}</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar estudiante..."
          placeholderTextColor="#9ca3af"
          value={busquedaEst}
          onChangeText={setBusquedaEst}
          clearButtonMode="while-editing"
        />
        {busquedaEst.length > 0 && (
          <TouchableOpacity style={styles.searchClear} onPress={() => setBusquedaEst('')}>
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipContainer}>
        {estudiantes
          .filter((e) => busquedaEst.trim() === '' || `${e.nombre} ${e.apellido}`.toLowerCase().includes(busquedaEst.toLowerCase()))
          .map((est) => {
          const activo = est.id === estudianteActivo?.id;
          return (
            <TouchableOpacity key={est.id} style={[styles.chip, activo && styles.chipActivo]} onPress={() => setEstudianteActivo(est)}>
              <Text style={[styles.chipText, activo && styles.chipTextActivo]} numberOfLines={1}>
                {est.nombre} {est.apellido}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>


      {/* Botón Calificar con IA — acceso rápido */}
      <TouchableOpacity
        style={styles.bannerIA}
        onPress={() => (navigation as any).navigate('CalificarIA', { asignacionId, materiaId, materiaNombre, periodoId, periodoNumero })}
        activeOpacity={0.85}
      >
        <Text style={styles.bannerIAText}>📷 Calificar con IA</Text>
        <Ionicons name="chevron-forward" size={16} color="#2563EB" />
      </TouchableOpacity>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollPadding}>
        <View style={styles.estudianteCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.estudianteNombre}>{estudianteActivo?.nombre} {estudianteActivo?.apellido}</Text>
            <View style={styles.estudianteDocRow}>
              <Text style={styles.estudianteDoc}>{estudianteActivo?.numeroDocumento}</Text>
              <TouchableOpacity
                style={styles.telefonoBtn}
                onPress={() => { setTelefonoInput(estudianteActivo?.telefonoAcudiente || ''); setModalTelefono(true); }}
              >
                <Text style={styles.telefonoBtnText}>
                  {estudianteActivo?.telefonoAcudiente ? `📱 ${estudianteActivo.telefonoAcudiente}` : '📱 + Teléfono'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.notaFinalBadge, { backgroundColor: aprobado ? '#10b981' : '#ef4444' }]}>
            <Text style={styles.notaFinalLabel}>Final</Text>
            <Text style={styles.notaFinalValor}>{notaFinal.toFixed(1)}</Text>
          </View>
        </View>

        {loadingNotas && (
          <View style={styles.notasLoading}>
            <ActivityIndicator size="small" color="#1a3a6b" />
            <Text style={styles.notasLoadingText}>Cargando notas...</Text>
          </View>
        )}

        {!loadingNotas && desempenos.map((desempeno, desempenoIdx) => {
          const { promedio, cantidad } = calcularPromedio(desempeno.id);
          const notasDesempeno = notas.filter((n) => n.desempenoId === desempeno.id);
          const colorPromedio = promedio === 0 ? '#94a3b8' : promedio >= 3.0 ? '#10b981' : '#ef4444';

          return (
            <View key={desempeno.id} style={styles.desempenoCard}>
              <View style={styles.desempenoHeader}>
                <View style={styles.desempenoInfo}>
                  <Text style={styles.desempenoNumero}>Desempeño {desempenoIdx + 1}</Text>
                </View>
                <View style={styles.promedioBox}>
                  <Text style={styles.promedioLabel}>{cantidad} nota{cantidad !== 1 ? 's' : ''}</Text>
                  <Text style={[styles.promedioValor, { color: colorPromedio }]}>{promedio.toFixed(1)}</Text>
                </View>
              </View>

              {notasDesempeno.length === 0 ? (
                <Text style={styles.sinNotas}>Sin notas ingresadas</Text>
              ) : (
                notasDesempeno.map((nota) => (
                  <View key={nota.id} style={styles.notaFila}>
                    <View style={styles.notaValorBox}>
                      <Text style={[styles.notaValor, { color: nota.valor >= 3.0 ? '#10b981' : '#ef4444' }]}>
                        {nota.valor.toFixed(1)}
                      </Text>
                    </View>
                    <View style={styles.notaDetalle}>
                      <Text style={styles.notaDescripcion} numberOfLines={1}>{nota.descripcion || '—'}</Text>
                      <Text style={styles.notaFecha}>{new Date(nota.createdAt).toLocaleDateString('es-CO')}</Text>
                    </View>
                    <TouchableOpacity style={styles.eliminarBtn} onPress={() => handleEliminarNota(nota)}>
                      <Text style={styles.eliminarIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <TouchableOpacity style={styles.agregarBtn} onPress={() => abrirModal(desempeno)}>
                <Text style={styles.agregarBtnText}>+ Agregar nota</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitulo}>
              Desempeño {desempenos.indexOf(desempenoSeleccionado!) + 1} — {desempenoSeleccionado?.nombre}
            </Text>
            <Text style={styles.modalSubtitulo}>{estudianteActivo?.nombre} {estudianteActivo?.apellido}</Text>

            {/* Botón agregar imagen para IA */}
            <TouchableOpacity
              style={[styles.botonIA, (imagenesIA.length >= 2 || calificandoIA || saving) && styles.botonDisabled]}
              onPress={agregarImagenIA}
              disabled={imagenesIA.length >= 2 || calificandoIA || saving}
            >
              <Text style={styles.botonIAText}>
                {imagenesIA.length === 0
                  ? '📷 Calificar con IA'
                  : imagenesIA.length === 1
                  ? '📷 Agregar reverso (opcional)'
                  : '✓ 2 imágenes listas'}
              </Text>
            </TouchableOpacity>

            {/* Miniaturas + botón analizar */}
            {imagenesIA.length > 0 && (
              <View style={styles.thumbnailsRow}>
                {imagenesIA.map((img, idx) => (
                  <View key={idx} style={styles.thumbnailContainer}>
                    <Image
                      source={{ uri: `data:${img.mimeType};base64,${img.base64}` }}
                      style={styles.thumbnail}
                    />
                    <TouchableOpacity
                      style={styles.thumbnailRemove}
                      onPress={() => setImagenesIA((prev) => prev.filter((_, i) => i !== idx))}
                      disabled={calificandoIA}
                    >
                      <Text style={styles.thumbnailRemoveText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={styles.thumbnailLabel}>{idx === 0 ? 'Frente' : 'Reverso'}</Text>
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.botonAnalizar, calificandoIA && styles.botonDisabled]}
                  onPress={analizarConIA}
                  disabled={calificandoIA || saving}
                >
                  {calificandoIA ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.botonAnalizarText}>{'Analizar\ncon IA'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Sugerencia de la IA */}
            {sugerenciaIA && (
              <View style={styles.sugerenciaCard}>
                <View style={styles.sugerenciaHeader}>
                  <Text style={styles.sugerenciaLabel}>Nota sugerida por IA</Text>
                  <Text style={[styles.sugerenciaNota, { color: sugerenciaIA.notaSugerida >= 3.0 ? '#10b981' : '#ef4444' }]}>
                    {sugerenciaIA.notaSugerida.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.sugerenciaRazonamiento}>{sugerenciaIA.razonamiento}</Text>
                <TouchableOpacity
                  style={styles.botonAceptarIA}
                  onPress={() => setValorInput(sugerenciaIA.notaSugerida.toFixed(1))}
                >
                  <Text style={styles.botonAceptarIAText}>Aceptar nota</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.inputLabel}>Nota (1.0 – 5.0) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 4.5"
              keyboardType="decimal-pad"
              value={valorInput}
              onChangeText={setValorInput}
            />

            <Text style={styles.inputLabel}>
              Descripción{descripcionSugerida ? ' (compartida con el grupo)' : ' (opcional)'}
            </Text>
            {loadingDescripcion ? (
              <ActivityIndicator size="small" color="#1a3a6b" style={{ marginVertical: 8 }} />
            ) : (
              <TextInput
                style={[styles.input, styles.inputMultiline, descripcionSugerida && styles.inputSugerida]}
                placeholder="Ej: Taller de Valores, Evaluación oral..."
                multiline
                numberOfLines={3}
                value={descripcionInput}
                onChangeText={setDescripcionInput}
              />
            )}

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.botonModal, styles.botonCancelar]}
                onPress={() => { setModalVisible(false); setSugerenciaIA(null); setImagenesIA([]); }}
                disabled={saving}
              >
                <Text style={styles.botonCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botonModal, styles.botonGuardar, saving && styles.botonDisabled]}
                onPress={handleAgregarNota}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.botonGuardarText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal teléfono acudiente ── */}
      <Modal visible={modalTelefono} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 24 }]}>
            <Text style={styles.modalTitulo}>📱 Teléfono del Acudiente</Text>
            <Text style={styles.modalSubtitulo}>{estudianteActivo?.nombre} {estudianteActivo?.apellido}</Text>
            <Text style={styles.inputLabel}>Número de WhatsApp (ej: 3001234567)</Text>
            <TextInput
              style={styles.input}
              placeholder="3001234567"
              keyboardType="phone-pad"
              value={telefonoInput}
              onChangeText={setTelefonoInput}
              maxLength={15}
            />
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
              Al registrar el teléfono, recibirás opción de enviar WhatsApp al guardar cada nota.
            </Text>
            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={[styles.botonModal, styles.botonCancelar]}
                onPress={() => setModalTelefono(false)}
                disabled={guardandoTelefono}
              >
                <Text style={styles.botonCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              {telefonoInput.trim() !== '' && estudianteActivo?.telefonoAcudiente && (
                <TouchableOpacity
                  style={[styles.botonModal, { backgroundColor: '#fee2e2' }]}
                  onPress={() => { setTelefonoInput(''); }}
                  disabled={guardandoTelefono}
                >
                  <Text style={{ color: '#dc2626', fontWeight: '600' }}>Quitar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.botonModal, styles.botonGuardar, guardandoTelefono && styles.botonDisabled]}
                onPress={handleGuardarTelefono}
                disabled={guardandoTelefono}
              >
                {guardandoTelefono
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.botonGuardarText}>Guardar</Text>
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
  flex: { flex: 1, backgroundColor: '#F1F5F9' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: '#64748B' },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 20 },
  retryBtn: { backgroundColor: '#1E3A5F', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },

  headerBar: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerMateria: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, flex: 1 },
  headerPeriodo: { color: '#93C5FD', fontSize: 13 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7, fontSize: 14, color: '#0F172A',
  },
  searchClear: { marginLeft: 8, padding: 4 },
  searchClearText: { color: '#94A3B8', fontSize: 16, fontWeight: '700' },

  chipScroll: { maxHeight: 52, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  chipContainer: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  chipActivo: { backgroundColor: '#1E3A5F', borderColor: '#1E3A5F' },
  chipText: { fontSize: 13, color: '#475569' },
  chipTextActivo: { color: '#FFFFFF', fontWeight: '600' },

  bannerIA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#BFDBFE',
  },
  bannerIAText: { color: '#1E3A5F', fontWeight: '700', fontSize: 14 },

  scrollContent: { flex: 1 },
  scrollPadding: { padding: 16 },

  estudianteCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', elevation: 1,
  },
  estudianteNombre: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  estudianteDocRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 3 },
  estudianteDoc: { fontSize: 12, color: '#94A3B8' },
  telefonoBtn: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE',
  },
  telefonoBtnText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
  notaFinalBadge: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  notaFinalLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  notaFinalValor: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', lineHeight: 32 },

  notasLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  notasLoadingText: { marginLeft: 8, color: '#64748B', fontSize: 14 },

  desempenoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#1E3A5F',
    borderWidth: 1, borderColor: '#E2E8F0', elevation: 1,
  },
  desempenoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  desempenoInfo: { flex: 1 },
  desempenoNumero: { fontSize: 16, fontWeight: '800', color: '#1E3A5F', marginBottom: 2 },
  desempenoNombre: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  desempenoPorcentaje: { fontSize: 12, color: '#64748B', marginTop: 2 },
  promedioBox: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#F8FAFC', borderRadius: 8, minWidth: 70,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  promedioLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  promedioValor: { fontSize: 26, fontWeight: '800', marginTop: 2 },
  sinNotas: { fontSize: 13, color: '#94A3B8', paddingVertical: 8 },
  notaFila: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6,
    backgroundColor: '#F8FAFC', borderRadius: 8,
    borderLeftWidth: 3, borderLeftColor: '#E2E8F0',
  },
  notaValorBox: { marginRight: 12 },
  notaValor: { fontSize: 20, fontWeight: '800' },
  notaDetalle: { flex: 1 },
  notaDescripcion: { fontSize: 13, color: '#374151', fontWeight: '500' },
  notaFecha: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  eliminarBtn: { padding: 6 },
  eliminarIcon: { fontSize: 15, color: '#DC2626', fontWeight: '700' },
  agregarBtn: { backgroundColor: '#1E3A5F', borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginTop: 6 },
  agregarBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitulo: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  modalSubtitulo: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  botonIA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#2563EB',
    borderRadius: 10, paddingVertical: 11, marginBottom: 8, gap: 8,
  },
  botonIAText: { color: '#1E3A5F', fontWeight: '700', fontSize: 14 },
  thumbnailsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingHorizontal: 4 },
  thumbnailContainer: { alignItems: 'center', position: 'relative' },
  thumbnail: { width: 68, height: 68, borderRadius: 8, borderWidth: 1.5, borderColor: '#2563EB' },
  thumbnailRemove: {
    position: 'absolute', top: -7, right: -7,
    backgroundColor: '#DC2626', borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  thumbnailRemoveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  thumbnailLabel: { fontSize: 10, color: '#2563EB', fontWeight: '600', marginTop: 4 },
  botonAnalizar: {
    flex: 1, backgroundColor: '#1E3A5F', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minHeight: 68,
  },
  botonAnalizarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  sugerenciaCard: {
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  sugerenciaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sugerenciaLabel: { fontSize: 11, fontWeight: '700', color: '#1E3A5F', textTransform: 'uppercase', letterSpacing: 0.5 },
  sugerenciaNota: { fontSize: 28, fontWeight: '800' },
  sugerenciaRazonamiento: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 10 },
  botonAceptarIA: { backgroundColor: '#1E3A5F', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  botonAceptarIAText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  inputSugerida: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
  actitudinalSeccion: { margin: 12, marginTop: 4, backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#BBF7D0', overflow: 'hidden' },
  actitudinalProm: { color: '#BBF7D0', fontWeight: '700', fontSize: 16 },
  notasLista: { paddingHorizontal: 12, paddingTop: 8 },
  notaItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#DCFCE7' },
  notaDesc: { color: '#166534', fontSize: 13, flex: 1 },
  modalBotones: { flexDirection: 'row', gap: 12, marginTop: 24 },
  botonModal: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  botonCancelar: { backgroundColor: '#F1F5F9' },
  botonCancelarText: { color: '#475569', fontWeight: '600', fontSize: 15 },
  botonGuardar: { backgroundColor: '#1E3A5F' },
  botonGuardarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  botonDisabled: { opacity: 0.6 },
});
