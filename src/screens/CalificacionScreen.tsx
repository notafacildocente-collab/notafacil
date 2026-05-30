import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  StyleSheet, Platform, StatusBar, Image, Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '../services/api';
import { offlineQueue } from '../services/offlineQueue';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import OfflineBanner from '../components/OfflineBanner';

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

const HEADER_PT = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 52;

export default function CalificacionScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { asignacionId, periodoId, materiaNombre, periodoNumero, materiaId } = (route.params || {}) as any;
  const { isOnline, pendingCount, isSyncing, syncNow, refreshPending } = useNetworkStatus();

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
  const [modalTelefono, setModalTelefono] = useState(false);
  const [telefonoInput, setTelefonoInput] = useState('');
  const [guardandoTelefono, setGuardandoTelefono] = useState(false);
  // ── Scanner de planilla ──
  const [scannerVisible, setScannerVisible] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [extraccionesIA, setExtraccionesIA] = useState<Array<{
    estudianteId: string; desempenoId: string; valor: number;
    estudianteNombre: string; desempenoNombre: string;
    guardada?: boolean; error?: string;
    notaExistente?: number | null;   // null = no existe, número = ya tiene nota
    seleccionada: boolean;           // checkbox del profe
  }>>([]);
  const [guardandoScan, setGuardandoScan] = useState(false);

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
      setLoadingNotas(true);
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
      const payload = {
        asignacionId,
        desempenoId: desempenoSeleccionado.id,
        estudianteId: estudianteActivo.id,
        valor,
        descripcion: descripcionInput.trim() || undefined,
        creadoOffline: !isOnline,
      };

      // Intentar guardar en servidor; si falla por red → cola offline
      try {
        const res = await apiFetch('/api/notas', { method: 'POST', body: JSON.stringify(payload) });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any).message || 'Error al guardar');
        }
        const notaNueva: any = await res.json();
        setNotas((prev) => [{ ...notaNueva, valor: parseFloat(String(notaNueva.valor)) }, ...prev]);
        setValorInput(''); setDescripcionInput(''); setSugerenciaIA(null); setImagenesIA([]); setModalVisible(false);
        if (notaNueva.waLink) {
          Alert.alert(
            '✅ Nota guardada',
            `¿Enviar notificación a acudiente de ${estudianteActivo?.apellido} ${estudianteActivo?.nombre}?`,
            [
              { text: 'No', style: 'cancel' },
              { text: '📱 Enviar WhatsApp', onPress: () => Linking.openURL(notaNueva.waLink).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp')) },
            ],
          );
        }
      } catch (netErr: any) {
        if (netErr.message === 'Sesión vencida') throw netErr;
        // Error de red → guardar localmente con ID temporal
        const tempId = `offline-${Date.now()}`;
        setNotas((prev) => [{ id: tempId, estudianteId: estudianteActivo.id, desempenoId: desempenoSeleccionado.id, asignacionId, valor, descripcion: descripcionInput.trim(), createdAt: new Date().toISOString() }, ...prev]);
        await offlineQueue.add({ tipo: 'NOTA', method: 'POST', url: '/api/notas', body: { ...payload, creadoOffline: true } });
        await refreshPending();
        setValorInput(''); setDescripcionInput(''); setSugerenciaIA(null); setImagenesIA([]); setModalVisible(false);
        Alert.alert('📥 Guardado sin conexión', 'La nota se guardó localmente y se enviará al servidor cuando recuperes internet.');
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
    } catch {
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
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso requerido', 'Necesitamos acceso a la galería.');
          return;
        }
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
    if (!desempenoSeleccionado || imagenesIA.length === 0) return;
    try {
      setCalificandoIA(true);
      setSugerenciaIA(null);
      const res = await apiFetch('/api/notas/calificar-ia', {
        method: 'POST',
        body: JSON.stringify({ asignacionId, desempenoId: desempenoSeleccionado.id, imagenes: imagenesIA }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || 'Error al calificar con IA');
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
        throw new Error((err as any).message || 'Error al guardar');
      }
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
      <View style={styles.loadingWrap}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (estudiantes.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Text style={{ color: '#475569', fontSize: 15, marginBottom: 20 }}>No hay estudiantes en este curso</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#2D5FA8', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Escáner de planilla ──────────────────────────────────────────────────
  const abrirScanner = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a la cámara para escanear la planilla.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      base64: true,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const base64 = asset.base64 || '';
    if (!base64) { Alert.alert('Error', 'No se pudo obtener la imagen'); return; }

    try {
      setEscaneando(true);
      setScannerVisible(true);
      setExtraccionesIA([]);

      const estudiantesInfo = estudiantes.map(e => ({ id: e.id, nombre: e.nombre, apellido: e.apellido }));
      const desempenosInfo = desempenos.map(d => ({ id: d.id, nombre: d.nombre, orden: d.orden }));

      // 1️⃣ IA extrae notas de la imagen
      const res = await apiFetch('/api/notas/scan-planilla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagen: { base64, mimeType: 'image/jpeg' },
          estudiantesInfo,
          desempenosInfo,
          asignacionId,
        }),
      });

      if (!res.ok) throw new Error('Error al escanear');
      const { extracciones } = await res.json();

      if (!extracciones || extracciones.length === 0) {
        Alert.alert('Sin resultados', 'La IA no encontró notas legibles. Asegúrate que la planilla esté bien iluminada y enfocada.');
        setScannerVisible(false);
        return;
      }

      // 2️⃣ Verificar cuáles estudiantes ya tienen nota para ese desempeño
      //    Consultar notas actuales de cada estudiante único encontrado
      const idsUnicos = [...new Set(extracciones.map((e: any) => e.estudianteId as string))];
      const notasPorEstudiante: Record<string, { desempenoId: string; valor: number }[]> = {};

      await Promise.all(idsUnicos.map(async (estId) => {
        try {
          const r = await apiFetch(`/api/notas?asignacionId=${asignacionId}&estudianteId=${estId}`);
          if (r.ok) {
            const data: any[] = await r.json();
            notasPorEstudiante[estId] = data.map(n => ({
              desempenoId: n.desempenoId,
              valor: parseFloat(n.valor),
            }));
          }
        } catch { /* si falla, asumimos sin nota existente */ }
      }));

      // 3️⃣ Marcar cada extracción: ¿ya tiene nota? ¿es nueva?
      const conEstado = extracciones.map((e: any) => {
        const notasEst = notasPorEstudiante[e.estudianteId] || [];
        const existente = notasEst.find(n => n.desempenoId === e.desempenoId);
        return {
          ...e,
          notaExistente: existente ? existente.valor : null,
          // Nuevas: seleccionadas por defecto ✓
          // Ya tienen nota: desmarcadas por defecto (profe decide si reemplazar)
          seleccionada: existente == null,
          guardada: false,
          error: undefined,
        };
      });

      setExtraccionesIA(conEstado);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo escanear la planilla');
      setScannerVisible(false);
    } finally {
      setEscaneando(false);
    }
  };

  const guardarTodasLasNotas = async () => {
    const seleccionadas = extraccionesIA.filter(e => e.seleccionada && !e.guardada);
    if (seleccionadas.length === 0) {
      Alert.alert('Nada seleccionado', 'Marca al menos una nota para guardar.');
      return;
    }
    try {
      setGuardandoScan(true);
      let ok = 0; let fail = 0;
      const actualizadas = [...extraccionesIA];

      for (let i = 0; i < actualizadas.length; i++) {
        const e = actualizadas[i];
        if (!e.seleccionada || e.guardada) continue;
        try {
          const res = await apiFetch('/api/notas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              asignacionId,
              desempenoId: e.desempenoId,
              estudianteId: e.estudianteId,
              valor: e.valor,
              creadoOffline: false,
            }),
          });
          if (res.ok) { actualizadas[i] = { ...e, guardada: true }; ok++; }
          else { actualizadas[i] = { ...e, error: 'Error al guardar' }; fail++; }
        } catch { actualizadas[i] = { ...e, error: 'Sin conexión' }; fail++; }
        setExtraccionesIA([...actualizadas]);
      }
      Alert.alert(
        ok > 0 ? '✓ Notas guardadas' : 'Sin cambios',
        `${ok} nota${ok !== 1 ? 's' : ''} guardada${ok !== 1 ? 's' : ''} correctamente${fail > 0 ? `\n⚠️ ${fail} con error` : ''}.`,
        [{ text: 'Listo', onPress: () => { if (fail === 0) { setScannerVisible(false); setExtraccionesIA([]); } } }],
      );
    } finally {
      setGuardandoScan(false);
    }
  };

  const notaFinal = calcularNotaFinal();
  const aprobado = notaFinal >= 3.0;
  const colorFinal = notaFinal === 0 ? '#94A3B8' : aprobado ? '#10b981' : '#ef4444';

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <OfflineBanner isOnline={isOnline} pendingCount={pendingCount} isSyncing={isSyncing} onSync={syncNow} />

      {/* ── Header claro ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerMateria} numberOfLines={1}>{materiaNombre}</Text>
          <Text style={styles.headerSub}>Calificar · P{periodoNumero}</Text>
        </View>
        <TouchableOpacity
          style={styles.scanBtn}
          onPress={abrirScanner}
          activeOpacity={0.75}
        >
          <Ionicons name="scan-outline" size={22} color="#2D5FA8" />
        </TouchableOpacity>
      </View>

      {/* ── Búsqueda ── */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={17} color="#94A3B8" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar estudiante..."
          placeholderTextColor="#94A3B8"
          value={busquedaEst}
          onChangeText={setBusquedaEst}
        />
        {busquedaEst.length > 0 && (
          <TouchableOpacity onPress={() => setBusquedaEst('')} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Chips de estudiantes ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContainer}
      >
        {estudiantes
          .filter((e) =>
            busquedaEst.trim() === '' ||
            `${e.apellido} ${e.nombre}`.toLowerCase().includes(busquedaEst.toLowerCase()),
          )
          .map((est) => {
            const activo = est.id === estudianteActivo?.id;
            return (
              <TouchableOpacity
                key={est.id}
                style={[styles.chip, activo && styles.chipActivo]}
                onPress={() => setEstudianteActivo(est)}
              >
                <Text style={[styles.chipText, activo && styles.chipTextActivo]} numberOfLines={1}>
                  {est.apellido} {est.nombre}
                </Text>
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollPadding}>

        {/* ── Tarjeta del estudiante + botón IA ── */}
        <View style={styles.estudianteCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.estudianteNombre}>
              {estudianteActivo?.apellido} {estudianteActivo?.nombre}
            </Text>
            <View style={styles.estudianteDocRow}>
              <Text style={styles.estudianteDoc}>{estudianteActivo?.numeroDocumento}</Text>
              <TouchableOpacity
                style={styles.telefonoBtn}
                onPress={() => {
                  setTelefonoInput(estudianteActivo?.telefonoAcudiente || '');
                  setModalTelefono(true);
                }}
              >
                <Text style={styles.telefonoBtnText}>
                  {estudianteActivo?.telefonoAcudiente
                    ? `📱 ${estudianteActivo.telefonoAcudiente}`
                    : '📱 + Tel'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>

          {/* Anillo de nota final (outline) */}
          <View style={[styles.notaFinalRing, { borderColor: colorFinal }]}>
            <Text style={styles.notaFinalLabel}>Final</Text>
            <Text style={[styles.notaFinalValor, { color: colorFinal }]}>
              {notaFinal === 0 ? '—' : notaFinal.toFixed(1)}
            </Text>
          </View>
        </View>

        {/* ── Loading notas ── */}
        {loadingNotas && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
            <ActivityIndicator size="small" color="#1E3A5F" />
            <Text style={{ marginLeft: 8, color: '#475569', fontSize: 14 }}>Cargando notas...</Text>
          </View>
        )}

        {/* ── Tarjetas de desempeños ── */}
        {!loadingNotas && desempenos.map((desempeno, desempenoIdx) => {
          const { promedio, cantidad } = calcularPromedio(desempeno.id);
          const notasDesempeno = notas.filter((n) => n.desempenoId === desempeno.id);
          const colorPromedio = promedio === 0 ? '#94A3B8' : promedio >= 3.0 ? '#10b981' : '#ef4444';

          return (
            <View key={desempeno.id} style={styles.desempenoCard}>
              {/* Encabezado claro */}
              <View style={styles.desempenoHeaderRow}>
                <View>
                  <Text style={styles.desempenoTitulo}>Desempeño {desempenoIdx + 1}</Text>
                  {desempeno.nombre ? (
                    <Text style={styles.desempenoNombre} numberOfLines={1}>{desempeno.nombre}</Text>
                  ) : null}
                </View>
                <View style={styles.promedioWrap}>
                  <Text style={styles.promedioCountTxt}>{cantidad} nota{cantidad !== 1 ? 's' : ''}</Text>
                  <Text style={[styles.promedioValorTxt, { color: colorPromedio }]}>
                    {promedio > 0 ? promedio.toFixed(1) : '—'}
                  </Text>
                </View>
              </View>

              {/* Body */}
              <View style={styles.desempenoBody}>
                {notasDesempeno.length === 0 ? (
                  <Text style={styles.sinNotas}>Sin notas registradas</Text>
                ) : (
                  notasDesempeno.map((nota, nIdx) => (
                    <View
                      key={nota.id}
                      style={[
                        styles.notaFila,
                        nIdx < notasDesempeno.length - 1 && styles.notaFilaSeparador,
                      ]}
                    >
                      {/* Descripción + fecha (izquierda) */}
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.notaDescripcion} numberOfLines={2}>
                          {nota.descripcion || 'Sin descripción'}
                        </Text>
                        <Text style={styles.notaFecha}>
                          {new Date(nota.createdAt).toLocaleDateString('es-CO')}
                        </Text>
                      </View>
                      {/* Valor (derecha) */}
                      <Text style={[styles.notaValor, { color: nota.valor >= 3.0 ? '#10b981' : '#ef4444' }]}>
                        {nota.valor.toFixed(1)}
                      </Text>
                      {/* Eliminar */}
                      <TouchableOpacity
                        style={styles.eliminarBtn}
                        onPress={() => handleEliminarNota(nota)}
                      >
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}

                <TouchableOpacity style={styles.agregarBtn} onPress={() => abrirModal(desempeno)}>
                  <Text style={styles.agregarBtnText}>+ Agregar nota</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Modal agregar nota ── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitulo}>
              Desempeño {desempenos.indexOf(desempenoSeleccionado!) + 1}
              {desempenoSeleccionado?.nombre ? ` — ${desempenoSeleccionado.nombre}` : ''}
            </Text>
            <Text style={styles.modalSubtitulo}>
              {estudianteActivo?.apellido} {estudianteActivo?.nombre}
            </Text>

            {/* Botón IA en modal */}
            <TouchableOpacity
              style={[styles.botonIA, (imagenesIA.length >= 2 || calificandoIA || saving) && styles.botonDisabled]}
              onPress={agregarImagenIA}
              disabled={imagenesIA.length >= 2 || calificandoIA || saving}
            >
              <Ionicons name="camera-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.botonIAText}>
                {imagenesIA.length === 0
                  ? 'Calificar con IA'
                  : imagenesIA.length === 1
                  ? 'Agregar reverso (opcional)'
                  : '✓ 2 imágenes listas'}
              </Text>
            </TouchableOpacity>

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

            {sugerenciaIA && (
              <View style={styles.sugerenciaCard}>
                <View style={styles.sugerenciaHeader}>
                  <Text style={styles.sugerenciaLabel}>NOTA SUGERIDA POR IA</Text>
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
              {descripcionSugerida ? 'Descripción (compartida con el grupo)' : 'Descripción (opcional)'}
            </Text>
            {loadingDescripcion ? (
              <ActivityIndicator size="small" color="#1E3A5F" style={{ marginVertical: 8 }} />
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
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.botonGuardarText}>Guardar</Text>
                }
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
            <Text style={styles.modalSubtitulo}>
              {estudianteActivo?.apellido} {estudianteActivo?.nombre}
            </Text>
            <Text style={styles.inputLabel}>Número de WhatsApp (ej: 3001234567)</Text>
            <TextInput
              style={styles.input}
              placeholder="3001234567"
              keyboardType="phone-pad"
              value={telefonoInput}
              onChangeText={setTelefonoInput}
              maxLength={15}
            />
            <Text style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
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
                  onPress={() => setTelefonoInput('')}
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

      {/* ── Modal escáner de planilla ── */}
      <Modal visible={scannerVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          {/* Header */}
          <View style={{ backgroundColor: '#2D5FA8', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => { setScannerVisible(false); setExtraccionesIA([]); }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>Escáner de Planilla · IA</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>
                {escaneando ? 'Analizando imagen...' : `${extraccionesIA.filter(e => e.seleccionada).length} seleccionada${extraccionesIA.filter(e => e.seleccionada).length !== 1 ? 's' : ''} de ${extraccionesIA.length}`}
              </Text>
            </View>
          </View>

          {escaneando ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32 }}>
              <ActivityIndicator size="large" color="#2D5FA8" />
              <Text style={{ fontSize: 16, color: '#475569', textAlign: 'center', lineHeight: 24 }}>
                La IA está leyendo las notas de tu planilla y verificando cuáles ya están registradas...{'\n'}Esto toma unos segundos.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {extraccionesIA.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
                  <Ionicons name="document-text-outline" size={52} color="#94A3B8" />
                  <Text style={{ color: '#94A3B8', fontSize: 15, textAlign: 'center' }}>No se encontraron notas en la imagen</Text>
                </View>
              ) : (
                <>
                  {/* Leyenda */}
                  <View style={{ backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' }}>
                    <Text style={{ fontSize: 13, color: '#1D4ED8', fontWeight: '700', marginBottom: 4 }}>📋 Revisa antes de guardar</Text>
                    <Text style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 18 }}>
                      ✅ <Text style={{ fontWeight: '700' }}>Verde</Text> = nota nueva (marcada para guardar){'\n'}
                      ⚠️ <Text style={{ fontWeight: '700' }}>Naranja</Text> = ya tiene nota manual — desmarcada por defecto{'\n'}
                      Toca el checkbox para incluir o excluir cada nota.
                    </Text>
                  </View>

                  {/* Contadores */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    <View style={{ flex: 1, backgroundColor: '#DCFCE7', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#16A34A' }}>
                        {extraccionesIA.filter(e => e.notaExistente == null).length}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#15803D', marginTop: 2 }}>Notas nuevas</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#D97706' }}>
                        {extraccionesIA.filter(e => e.notaExistente != null).length}
                      </Text>
                      <Text style={{ fontSize: 11, color: '#92400E', marginTop: 2 }}>Ya tienen nota</Text>
                    </View>
                  </View>

                  {/* Lista de extracciones */}
                  {extraccionesIA.map((e, i) => {
                    const esExistente = e.notaExistente != null;
                    const bgColor = e.guardada ? '#F0FDF4' : e.error ? '#FEF2F2' : esExistente ? '#FFFBEB' : '#FFFFFF';
                    const borderColor = e.guardada ? '#86EFAC' : e.error ? '#FCA5A5' : esExistente ? '#FCD34D' : '#E2E8F0';
                    return (
                      <TouchableOpacity
                        key={i}
                        style={{ backgroundColor: bgColor, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: e.seleccionada ? (esExistente ? '#F59E0B' : '#2D5FA8') : borderColor, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                        onPress={() => {
                          if (e.guardada) return;
                          const upd = [...extraccionesIA];
                          upd[i] = { ...upd[i], seleccionada: !upd[i].seleccionada };
                          setExtraccionesIA(upd);
                        }}
                        activeOpacity={0.75}
                        disabled={!!e.guardada}
                      >
                        {/* Checkbox */}
                        <View style={{
                          width: 24, height: 24, borderRadius: 6,
                          borderWidth: 2,
                          borderColor: e.guardada ? '#16A34A' : e.seleccionada ? (esExistente ? '#F59E0B' : '#2D5FA8') : '#CBD5E1',
                          backgroundColor: e.guardada ? '#16A34A' : e.seleccionada ? (esExistente ? '#F59E0B' : '#2D5FA8') : '#fff',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          {(e.seleccionada || e.guardada) && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>

                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }} numberOfLines={1}>
                            {e.estudianteNombre}
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{e.desempenoNombre}</Text>
                          {esExistente && (
                            <Text style={{ fontSize: 11, color: '#92400E', marginTop: 3, fontWeight: '600' }}>
                              ⚠️ Ya tiene nota: {e.notaExistente!.toFixed(1)} → reemplazar con {e.valor.toFixed(1)}
                            </Text>
                          )}
                          {e.error && <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>❌ {e.error}</Text>}
                          {e.guardada && <Text style={{ fontSize: 11, color: '#16A34A', marginTop: 2, fontWeight: '600' }}>✓ Guardada</Text>}
                        </View>

                        {/* Nota badge */}
                        <View style={{ backgroundColor: e.valor >= 3 ? '#DCFCE7' : '#FEE2E2', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                          <Text style={{ fontSize: 18, fontWeight: '800', color: e.valor >= 3 ? '#16A34A' : '#DC2626' }}>
                            {e.valor.toFixed(1)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  <View style={{ height: 16 }} />
                </>
              )}
            </ScrollView>
          )}

          {/* Botón guardar seleccionadas */}
          {!escaneando && extraccionesIA.filter(e => e.seleccionada && !e.guardada).length > 0 && (
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
              <TouchableOpacity
                style={{ backgroundColor: guardandoScan ? '#94A3B8' : '#2D5FA8', borderRadius: 12, paddingVertical: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 }}
                onPress={guardarTodasLasNotas}
                disabled={guardandoScan}
              >
                {guardandoScan
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="cloud-upload-outline" size={20} color="#fff" />}
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                  {guardandoScan
                    ? 'Guardando...'
                    : `Guardar ${extraccionesIA.filter(e => e.seleccionada && !e.guardada).length} nota${extraccionesIA.filter(e => e.seleccionada && !e.guardada).length !== 1 ? 's' : ''} seleccionadas`}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F0F4F9' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F4F9' },
  loadingText: { marginTop: 12, color: '#475569', fontSize: 15 },

  // ── Header claro ──
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: HEADER_PT,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  scanBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  headerContent: { flex: 1 },
  headerMateria: { color: '#0F172A', fontWeight: '700', fontSize: 17 },
  headerSub: { color: '#475569', fontSize: 12, marginTop: 2, fontWeight: '500' },

  // ── Búsqueda ──
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },

  // ── Chips ──
  chipScroll: {
    maxHeight: 52, backgroundColor: '#FFFFFF',
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  chipContainer: { paddingHorizontal: 12, paddingVertical: 9, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#CBD5E1',
  },
  chipActivo: { backgroundColor: '#2D5FA8', borderColor: '#2D5FA8' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  chipTextActivo: { color: '#FFFFFF', fontWeight: '700' },

  // ── Scroll ──
  scrollContent: { flex: 1 },
  scrollPadding: { padding: 14 },

  // ── Tarjeta estudiante ──
  estudianteCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', elevation: 2,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6,
  },
  estudianteNombre: { fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  estudianteDocRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  estudianteDoc: { fontSize: 12, color: '#94A3B8' },
  telefonoBtn: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE',
  },
  telefonoBtnText: { fontSize: 11, color: '#2D5FA8', fontWeight: '600' },

  // ── Anillo nota final (outline) ──
  notaFinalRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 12,
  },
  notaFinalLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  notaFinalValor: { fontSize: 26, fontWeight: '800', lineHeight: 30 },

  // ── Tarjeta desempeño ──
  desempenoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0', elevation: 1, overflow: 'hidden',
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3,
  },
  desempenoHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  desempenoTitulo: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  desempenoNombre: { fontSize: 11, color: '#475569', marginTop: 1, maxWidth: 180 },
  promedioWrap: { alignItems: 'flex-end' },
  promedioCountTxt: { fontSize: 10, color: '#94A3B8', fontWeight: '500' },
  promedioValorTxt: { fontSize: 20, fontWeight: '800', lineHeight: 24 },
  desempenoBody: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 10 },

  sinNotas: {
    fontSize: 13, color: '#94A3B8', paddingVertical: 10,
    fontStyle: 'italic', textAlign: 'center',
  },

  // ── Fila de nota: [desc+fecha] [valor] [eliminar] ──
  notaFila: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
  },
  notaFilaSeparador: {
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC',
  },
  notaDescripcion: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  notaFecha: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  notaValor: { fontSize: 18, fontWeight: '800', minWidth: 36, textAlign: 'right', marginRight: 6 },
  eliminarBtn: { padding: 4 },

  agregarBtn: {
    backgroundColor: '#2D5FA8', borderRadius: 10, paddingVertical: 11,
    alignItems: 'center', marginTop: 10,
  },
  agregarBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  // ── Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitulo: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  modalSubtitulo: { fontSize: 13, color: '#475569', marginBottom: 16, fontWeight: '600' },

  botonIA: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#2D5FA8', borderRadius: 10,
    paddingVertical: 11, marginBottom: 8,
  },
  botonIAText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  thumbnailsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, paddingHorizontal: 4 },
  thumbnailContainer: { alignItems: 'center', position: 'relative' },
  thumbnail: { width: 68, height: 68, borderRadius: 8, borderWidth: 1.5, borderColor: '#2D5FA8' },
  thumbnailRemove: {
    position: 'absolute', top: -7, right: -7,
    backgroundColor: '#DC2626', borderRadius: 10,
    width: 20, height: 20, justifyContent: 'center', alignItems: 'center',
  },
  thumbnailRemoveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  thumbnailLabel: { fontSize: 10, color: '#2D5FA8', fontWeight: '600', marginTop: 4 },
  botonAnalizar: {
    flex: 1, backgroundColor: '#2D5FA8', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center', minHeight: 68,
  },
  botonAnalizarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  sugerenciaCard: {
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    borderRadius: 10, padding: 12, marginBottom: 12,
  },
  sugerenciaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sugerenciaLabel: { fontSize: 10, fontWeight: '800', color: '#2D5FA8', letterSpacing: 0.6 },
  sugerenciaNota: { fontSize: 28, fontWeight: '900' },
  sugerenciaRazonamiento: { fontSize: 13, color: '#475569', lineHeight: 18, marginBottom: 10 },
  botonAceptarIA: { backgroundColor: '#2D5FA8', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  botonAceptarIAText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  inputSugerida: { borderColor: '#2D5FA8', backgroundColor: '#EFF6FF' },

  modalBotones: { flexDirection: 'row', gap: 12, marginTop: 24 },
  botonModal: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  botonCancelar: { backgroundColor: '#F8FAFC' },
  botonCancelarText: { color: '#475569', fontWeight: '600', fontSize: 15 },
  botonGuardar: { backgroundColor: '#2D5FA8' },
  botonGuardarText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  botonDisabled: { opacity: 0.55 },
});
