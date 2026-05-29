import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity, StatusBar,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiFetch } from '../services/api';

const API_URL = 'https://notafacil-backend-539h.onrender.com';

interface EstudiantePlanilla {
  estudianteId: string;
  nombre: string;
  apellido: string;
  numeroDocumento: string;
  notaFinal: number;
  faltasTotales: number;
}

export default function ListadoEstudiantesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { asignacionId, periodoId, materiaId, materiaNombre, periodoNumero } = (route.params || {}) as any;

  const [estudiantes, setEstudiantes] = useState<EstudiantePlanilla[]>([]);
  const [loading, setLoading] = useState(true);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [generandoPlanilla, setGenerandoPlanilla] = useState(false);
  const [colegio, setColegio] = useState<{ nombre: string; logoUrl: string | null }>({
    nombre: 'Institución Educativa',
    logoUrl: null,
  });

  useEffect(() => {
    Promise.all([cargar(), cargarColegio()]);
  }, []);

  const cargarColegio = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/config`);
      if (res.ok) setColegio(await res.json());
    } catch { /* silencioso */ }
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/notas/planilla?asignacionId=${asignacionId}&periodoId=${periodoId}`);
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      const ordenados = [...data].sort((a: any, b: any) =>
        `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es'),
      );
      setEstudiantes(ordenados);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el listado de estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const generarPDF = async () => {
    try {
      setGenerandoPDF(true);

      const fecha = new Date().toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });
      const fechaCorta = new Date().toLocaleDateString('es-CO');

      const logoHtml = colegio.logoUrl
        ? `<img src="${colegio.logoUrl}" style="height:80px;width:80px;object-fit:contain;" />`
        : `<div style="width:80px;height:80px;background:#1a3a6b;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:32px;color:white;font-weight:900;">${colegio.nombre.charAt(0)}</div>`;

      const filas = estudiantes.map((est, idx) => `
        <tr>
          <td class="num">${idx + 1}</td>
          <td class="estudiante">${((est.apellido || '') + ' ' + (est.nombre || '')).toUpperCase().trim()}</td>
          <td class="firma"></td>
        </tr>
      `).join('');

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    padding: 20px 28px;
    color: #000;
    background: #fff;
    font-size: 12px;
  }

  /* ── Encabezado ── */
  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 3px solid #1a3a6b;
    padding-bottom: 14px;
    margin-bottom: 14px;
  }
  .logo-wrap {
    flex-shrink: 0;
  }
  .colegio-info {
    flex: 1;
  }
  .colegio-nombre {
    font-size: 16px;
    font-weight: 900;
    color: #1a3a6b;
    text-transform: uppercase;
    line-height: 1.3;
  }
  .colegio-sub {
    font-size: 10px;
    color: #555;
    margin-top: 3px;
  }
  .doc-titulo {
    text-align: right;
    min-width: 160px;
  }
  .doc-titulo h2 {
    font-size: 13px;
    font-weight: 900;
    color: #1a3a6b;
    text-transform: uppercase;
  }
  .doc-titulo p {
    font-size: 10px;
    color: #555;
    margin-top: 2px;
  }

  /* ── Metadatos ── */
  .meta {
    display: flex;
    gap: 20px;
    margin-bottom: 14px;
    background: #f5f7fa;
    border: 1px solid #dde1ea;
    border-radius: 6px;
    padding: 8px 14px;
  }
  .meta-item {
    flex: 1;
  }
  .meta-label {
    font-size: 9px;
    font-weight: 700;
    color: #777;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .meta-valor {
    font-size: 12px;
    font-weight: 700;
    color: #1a3a6b;
    margin-top: 2px;
  }

  /* ── Tabla ── */
  table {
    width: 100%;
    border-collapse: collapse;
  }
  thead tr {
    background: #1a3a6b;
    color: #fff;
  }
  thead th {
    padding: 8px 10px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
  }
  thead th.num { width: 32px; text-align: center; }
  thead th.firma { width: 130px; }

  tbody tr:nth-child(even) { background: #f8f9fb; }
  tbody tr:nth-child(odd)  { background: #fff; }
  tbody td {
    padding: 7px 10px;
    font-size: 12px;
    border-bottom: 1px solid #e5e8ef;
    vertical-align: middle;
  }
  td.num { text-align: center; color: #777; font-size: 11px; }
  td.estudiante { font-weight: 700; }
  td.firma {
    border-bottom: 1px solid #000 !important;
    height: 28px;
  }

  /* ── Pie de página ── */
  .footer {
    margin-top: 24px;
    border-top: 1px solid #ccc;
    padding-top: 12px;
    display: flex;
    justify-content: space-between;
    font-size: 9px;
    color: #888;
  }
  .firma-docente {
    margin-top: 40px;
    text-align: center;
    border-top: 1px solid #333;
    padding-top: 6px;
    width: 220px;
    margin-left: auto;
    margin-right: auto;
    font-size: 11px;
    color: #333;
    font-weight: 700;
  }
</style>
</head>
<body>

  <!-- Encabezado -->
  <div class="header">
    <div class="logo-wrap">${logoHtml}</div>
    <div class="colegio-info">
      <div class="colegio-nombre">${colegio.nombre}</div>
      <div class="colegio-sub">MOCOA - PUTUMAYO</div>
    </div>
    <div class="doc-titulo">
      <h2>Lista de Estudiantes</h2>
      <p>${fechaCorta}</p>
    </div>
  </div>

  <!-- Metadatos -->
  <div class="meta">
    <div class="meta-item">
      <div class="meta-label">Materia</div>
      <div class="meta-valor">${materiaNombre || '—'}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Período</div>
      <div class="meta-valor">Período ${periodoNumero}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Total estudiantes</div>
      <div class="meta-valor">${estudiantes.length}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Fecha</div>
      <div class="meta-valor">${fecha}</div>
    </div>
  </div>

  <!-- Tabla -->
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Estudiante</th>
        <th class="firma">Firma</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>

  <!-- Firma docente -->
  <div class="firma-docente">Firma del Docente</div>

  <!-- Pie -->
  <div class="footer">
    <span>NotaFácil Docente · ${colegio.nombre}</span>
    <span>Generado: ${fecha}</span>
  </div>

</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Listado ${materiaNombre} - Período ${periodoNumero}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const generarPlanillaEnBlanco = async () => {
    try {
      setGenerandoPlanilla(true);

      // 3 desempeños fijos, 2 casillas en blanco c/u = 6 columnas de nota
      const NUM_D   = 3;
      const NUM_COL = 2;

      const fechaCorta = new Date().toLocaleDateString('es-CO');
      const fechaLarga = new Date().toLocaleDateString('es-CO', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });

      const logoHtml = colegio.logoUrl
        ? `<img src="${colegio.logoUrl}" style="height:56px;width:56px;object-fit:contain;" />`
        : `<div style="width:56px;height:56px;background:#1a3a6b;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;color:white;font-weight:900;">${colegio.nombre.charAt(0)}</div>`;

      // Encabezado: D1, D2, D3 — cada uno span 2
      const dHeaders = Array.from({ length: NUM_D }, (_, i) =>
        `<th colspan="${NUM_COL}" class="dHead">D${i + 1}</th>`,
      ).join('');

      // Sub-encabezado: 6 celdas azul vacías (sin texto)
      const subHeaders = Array.from({ length: NUM_D * NUM_COL }, () =>
        `<th class="subH"></th>`,
      ).join('');

      // Fila especial de TEMAS — antes del primer estudiante, para que la docente
      // escriba qué evalúa en cada casilla (queda en blanco color crema)
      const celdasTema = Array.from({ length: NUM_D * NUM_COL }, () =>
        `<td class="cTema"></td>`,
      ).join('');
      const filaTema = `
        <tr class="temaRow">
          <td class="num" style="font-size:7px;color:#b45309;font-weight:800;">✎</td>
          <td class="temaLabel">TEMA / ACTIVIDAD</td>
          ${celdasTema}
          <td class="cF" style="background:#fef3c7;"></td>
        </tr>`;

      // Filas de estudiantes: nombre COMPLETO siempre, sin recorte
      const filas = estudiantes.map((est, idx) => {
        const nombreCompleto = ((est.apellido || '') + ' ' + (est.nombre || '')).toUpperCase().trim();
        const celdas = Array.from({ length: NUM_D * NUM_COL }, () =>
          `<td class="cBlank"></td>`,
        ).join('');
        return `
          <tr class="${idx % 2 === 0 ? 'par' : 'impar'}">
            <td class="num">${idx + 1}</td>
            <td class="nombre">${nombreCompleto}</td>
            ${celdas}
            <td class="cF"></td>
          </tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 landscape; margin: 8px 12px; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; background: #fff; }

  /* ── Encabezado doc ── */
  .docHeader { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #1a3a6b; padding-bottom: 7px; margin-bottom: 6px; }
  .colegioInfo { flex: 1; }
  .colegioNombre { font-size: 14px; font-weight: 900; color: #1a3a6b; text-transform: uppercase; }
  .colegioSub { font-size: 8px; color: #555; margin-top: 2px; }
  .docTitulo { text-align: right; min-width: 140px; }
  .docTitulo h2 { font-size: 12px; font-weight: 900; color: #1a3a6b; text-transform: uppercase; }
  .docTitulo p  { font-size: 8px; color: #555; margin-top: 2px; }

  /* ── Meta ── */
  .meta { display: flex; gap: 12px; margin-bottom: 6px; background: #f5f7fa; border: 1px solid #dde1ea; border-radius: 5px; padding: 5px 12px; }
  .metaItem { flex: 1; }
  .metaLabel { font-size: 7px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.5px; }
  .metaValor { font-size: 11px; font-weight: 700; color: #1a3a6b; margin-top: 2px; min-height: 15px; border-bottom: 1.5px solid #94a3b8; }

  /* ── Tabla ── */
  table { width: 100%; border-collapse: collapse; table-layout: auto; }
  th, td { border: 1px solid #999; text-align: center; vertical-align: middle; }

  /* D1 D2 D3 */
  .dHead { background: #1a3a6b; color: #fff; font-size: 15px; font-weight: 900; padding: 7px 4px; letter-spacing: 1px; }

  /* Sub-encabezado azul claro */
  .subH { background: #dbeafe; height: 10px; padding: 0; border-bottom: 1px solid #93c5fd; }

  /* Número */
  th.thNum, td.num { width: 24px; font-size: 9px; color: #888; background: #f8fafc; }

  /* Columna nombre — NUNCA se recorta */
  th.thNombre {
    background: #1a3a6b; color: #fff; font-size: 11px; font-weight: 700;
    text-align: left; padding: 6px 8px; min-width: 200px;
  }
  td.nombre {
    text-align: left; padding: 3px 8px; font-weight: 800; font-size: 13px;
    white-space: normal; word-break: break-word; min-width: 200px; line-height: 1.3;
  }

  /* Casillas de nota en blanco */
  td.cBlank { height: 28px; min-width: 52px; background: #fff; }
  tr.impar td.cBlank { background: #f8fafc; }

  /* Fila de TEMA — crema intensa, la profe escribe el tema de cada casilla */
  tr.temaRow td { height: 34px; background: #fffbeb; border: 1px solid #fbbf24; }
  td.temaLabel {
    text-align: left; padding: 4px 8px; font-size: 9px; font-weight: 800;
    color: #92400e; background: #fef3c7; white-space: nowrap;
  }
  td.cTema { background: #fffbeb; min-width: 52px; height: 34px; }

  /* Alternado nombre */
  tr.par  td.nombre { background: #fff; }
  tr.impar td.nombre { background: #f0f4ff; }

  /* F — estrecha */
  th.thF { background: #fef3c7; color: #92400e; font-size: 9px; font-weight: 800; width: 20px; padding: 3px 0; }
  td.cF  { width: 20px; height: 28px; background: #fef9c3; border: 1px solid #fbbf24; }

  /* Pie */
  .footer { margin-top: 7px; display: flex; justify-content: space-between; font-size: 7px; color: #888; border-top: 1px solid #ddd; padding-top: 5px; }
</style>
</head>
<body>

  <div class="docHeader">
    <div>${logoHtml}</div>
    <div class="colegioInfo">
      <div class="colegioNombre">${colegio.nombre}</div>
      <div class="colegioSub">MOCOA - PUTUMAYO</div>
    </div>
    <div class="docTitulo">
      <h2>Planilla de Seguimiento</h2>
      <p>${fechaCorta}</p>
    </div>
  </div>

  <div class="meta">
    <div class="metaItem"><div class="metaLabel">Materia</div><div class="metaValor">&nbsp;</div></div>
    <div class="metaItem"><div class="metaLabel">Período</div><div class="metaValor">&nbsp;</div></div>
    <div class="metaItem"><div class="metaLabel">Estudiantes</div><div class="metaValor">${estudiantes.length}</div></div>
    <div class="metaItem"><div class="metaLabel">Desempeño</div><div class="metaValor">&nbsp;</div></div>
    <div class="metaItem"><div class="metaLabel">Fecha</div><div class="metaValor">&nbsp;</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="thNum" rowspan="2">#</th>
        <th class="thNombre" rowspan="2">Estudiante</th>
        ${dHeaders}
        <th class="thF" rowspan="2">F</th>
      </tr>
      <tr>${subHeaders}</tr>
    </thead>
    <tbody>
      ${filaTema}
      ${filas}
    </tbody>
  </table>

  <div class="footer">
    <span>NotaFácil Docente · ${colegio.nombre}</span>
    <span>Planilla generada: ${fechaLarga}</span>
  </div>

</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Planilla ${materiaNombre}`,
        UTI: 'com.adobe.pdf',
      });
    } catch {
      Alert.alert('Error', 'No se pudo generar la planilla en blanco');
    } finally {
      setGenerandoPlanilla(false);
    }
  };

  const colorNota = (nota: number) => {
    if (nota === 0) return '#94A3B8';
    return nota >= 3.0 ? '#16A34A' : '#DC2626';
  };

  const aprobados  = estudiantes.filter((e) => e.notaFinal >= 3.0 && e.notaFinal > 0).length;
  const reprobados = estudiantes.filter((e) => e.notaFinal > 0 && e.notaFinal < 3.0).length;
  const sinNota    = estudiantes.filter((e) => e.notaFinal === 0).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />
        <ActivityIndicator size="large" color="#1E3A5F" />
        <Text style={styles.loadingText}>Cargando listado...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A5F" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextos}>
          <Text style={styles.headerMateria} numberOfLines={1}>{materiaNombre}</Text>
          <Text style={styles.headerSub}>Listado · Período {periodoNumero}</Text>
        </View>
        <TouchableOpacity
          style={[styles.pdfBtn, generandoPDF && { opacity: 0.6 }]}
          onPress={generarPDF}
          disabled={generandoPDF}
        >
          {generandoPDF
            ? <ActivityIndicator size="small" color="#FFFFFF" />
            : <>
                <Ionicons name="print-outline" size={16} color="#FFFFFF" />
                <Text style={styles.pdfBtnText}>Imprimir</Text>
              </>
          }
        </TouchableOpacity>
      </View>

      {/* ── Resumen ── */}
      <View style={styles.resumenRow}>
        <View style={styles.resumenCard}>
          <Text style={styles.resumenNum}>{estudiantes.length}</Text>
          <Text style={styles.resumenLabel}>Total</Text>
        </View>
        <View style={[styles.resumenCard, { borderTopColor: '#16A34A' }]}>
          <Text style={[styles.resumenNum, { color: '#16A34A' }]}>{aprobados}</Text>
          <Text style={styles.resumenLabel}>Aprobados</Text>
        </View>
        <View style={[styles.resumenCard, { borderTopColor: '#DC2626' }]}>
          <Text style={[styles.resumenNum, { color: '#DC2626' }]}>{reprobados}</Text>
          <Text style={styles.resumenLabel}>Reprobados</Text>
        </View>
        <View style={[styles.resumenCard, { borderTopColor: '#94A3B8' }]}>
          <Text style={[styles.resumenNum, { color: '#94A3B8' }]}>{sinNota}</Text>
          <Text style={styles.resumenLabel}>Sin nota</Text>
        </View>
      </View>

      {/* ── Aviso PDF lista ── */}
      <TouchableOpacity style={styles.avisoImpresion} onPress={generarPDF} disabled={generandoPDF}>
        <Ionicons name="document-text-outline" size={18} color="#1E3A5F" />
        <Text style={styles.avisoTexto}>
          <Text style={{ fontWeight: '800' }}>Lista</Text> — PDF con nombres y columna de firmas
        </Text>
      </TouchableOpacity>

      {/* ── Planilla en Blanco ── */}
      <TouchableOpacity
        style={[styles.planillaBtn, generandoPlanilla && { opacity: 0.6 }]}
        onPress={generarPlanillaEnBlanco}
        disabled={generandoPlanilla}
      >
        {generandoPlanilla ? (
          <>
            <ActivityIndicator size="small" color="#065F46" />
            <Text style={styles.planillaBtnTxt}>Generando planilla...</Text>
          </>
        ) : (
          <>
            <Ionicons name="grid-outline" size={18} color="#065F46" />
            <Text style={styles.planillaBtnTxt}>
              <Text style={{ fontWeight: '800' }}>Planilla en Blanco</Text> — Cuadrícula por desempeños para calificar a mano
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* ── Tabla en pantalla ── */}
      <ScrollView style={styles.scrollOuter} showsVerticalScrollIndicator={false}>
        <View style={styles.tabla}>
          {/* Encabezado */}
          <View style={styles.tablaHeader}>
            <Text style={[styles.thCell, { width: 36 }]}>#</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>ESTUDIANTE</Text>
          </View>

          {estudiantes.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No hay estudiantes registrados</Text>
            </View>
          ) : (
            estudiantes.map((est, idx) => (
              <View key={est.estudianteId} style={[styles.fila, idx % 2 === 0 ? styles.filaPar : styles.filaImpar]}>
                <Text style={[styles.tdBase, { width: 36, color: '#94A3B8', textAlign: 'center' }]}>
                  {idx + 1}
                </Text>
                <Text style={[styles.tdBase, { flex: 1, fontWeight: '700', color: '#0F172A' }]} numberOfLines={1}>
                  {((est.apellido || '') + ' ' + (est.nombre || '')).toUpperCase().trim()}
                </Text>
              </View>
            ))
          )}
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: '#F8FAFC' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#475569', fontSize: 15 },

  header: {
    backgroundColor: '#2D5FA8',
    paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden',
  },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTextos:  { flex: 1 },
  headerMateria: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerSub:     { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  pdfBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)' },
  pdfBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },

  resumenRow:   { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  resumenCard:  { flex: 1, alignItems: 'center', borderTopWidth: 3, borderTopColor: '#2D5FA8', paddingTop: 8 },
  resumenNum:   { fontSize: 22, fontWeight: '800', color: '#2D5FA8' },
  resumenLabel: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2, textTransform: 'uppercase' },

  avisoImpresion: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EFF6FF', borderBottomWidth: 1, borderBottomColor: '#BFDBFE', paddingHorizontal: 16, paddingVertical: 10 },
  avisoTexto:     { fontSize: 12, color: '#1E40AF', flex: 1, lineHeight: 17 },
  planillaBtn:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#D1FAE5', borderBottomWidth: 1, borderBottomColor: '#6EE7B7', paddingHorizontal: 16, paddingVertical: 10 },
  planillaBtnTxt: { fontSize: 12, color: '#065F46', flex: 1, lineHeight: 17 },

  scrollOuter: { flex: 1 },

  tabla:       { margin: 12, backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  tablaHeader: { flexDirection: 'row', backgroundColor: '#2D5FA8', paddingVertical: 11, paddingHorizontal: 8 },
  thCell:      { fontSize: 12, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5, paddingHorizontal: 4 },

  // Filas — texto SIEMPRE oscuro y visible
  fila:      { flexDirection: 'row', paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0' },
  filaPar:   { backgroundColor: '#FFFFFF' },
  filaImpar: { backgroundColor: '#F8FAFC' },
  tdBase:    { fontSize: 13, paddingHorizontal: 4, color: '#0F172A' },  // negro pizarra — SIEMPRE visible

  emptyRow:  { padding: 24, alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 14 },
});
