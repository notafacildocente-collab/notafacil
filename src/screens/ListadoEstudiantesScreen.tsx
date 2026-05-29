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

      // Intentar obtener desempeños reales
      let desempenos: Array<{ id: string; nombre: string }> = [];
      try {
        const res = await apiFetch(`/api/notas/desempenos/${periodoId}?materiaId=${materiaId}`);
        if (res.ok) desempenos = await res.json();
      } catch { /* fallback */ }

      // Si no hay datos, usar 3 desempeños genéricos
      if (desempenos.length === 0) {
        desempenos = [
          { id: '1', nombre: 'Desempeño 1' },
          { id: '2', nombre: 'Desempeño 2' },
          { id: '3', nombre: 'Desempeño 3' },
        ];
      }

      const subCols = ['Taller', 'W/Clase', 'Eval'];
      const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
      const fechaCorta = new Date().toLocaleDateString('es-CO');

      const logoHtml = colegio.logoUrl
        ? `<img src="${colegio.logoUrl}" style="height:64px;width:64px;object-fit:contain;" />`
        : `<div style="width:64px;height:64px;background:#1a3a6b;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;color:white;font-weight:900;">${colegio.nombre.charAt(0)}</div>`;

      // Encabezado fila 1: D1, D2... (colspan = 3 subcols + 1 prom)
      const th1 = desempenos.map((d, i) =>
        `<th colspan="${subCols.length + 1}" class="dHead">D${i + 1}</th>`,
      ).join('');

      // Encabezado fila 2: subcols + Prom por cada desempeño
      const th2 = desempenos.map((d) =>
        subCols.map((s) => `<th class="subH">${s}</th>`).join('') +
        `<th class="subH promH">Prom</th>`,
      ).join('');

      // Descripción de desempeños (fila 3 como thead)
      const th3 = desempenos.map((d) =>
        `<th colspan="${subCols.length + 1}" class="dDesc">${d.nombre || ''}</th>`,
      ).join('');

      // Filas de estudiantes — todo en blanco
      const filas = estudiantes.map((est, idx) => {
        const celdas = desempenos.map(() =>
          subCols.map(() => '<td class="cBlank"></td>').join('') +
          '<td class="cBlankProm"></td>',
        ).join('');
        return `
          <tr class="${idx % 2 === 0 ? 'par' : 'impar'}">
            <td class="num">${idx + 1}</td>
            <td class="nombre">${((est.apellido || '') + ' ' + (est.nombre || '')).toUpperCase().trim()}</td>
            ${celdas}
            <td class="cBlank"></td>
          </tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: A4 landscape; margin: 14px 20px; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 9px;
    color: #000;
    background: #fff;
  }

  /* ── Encabezado doc ── */
  .docHeader {
    display: flex; align-items: center; gap: 12px;
    border-bottom: 3px solid #1a3a6b;
    padding-bottom: 10px; margin-bottom: 8px;
  }
  .colegioInfo { flex: 1; }
  .colegioNombre { font-size: 13px; font-weight: 900; color: #1a3a6b; text-transform: uppercase; }
  .colegioSub { font-size: 8px; color: #555; margin-top: 2px; }
  .docTitulo { text-align: right; min-width: 140px; }
  .docTitulo h2 { font-size: 11px; font-weight: 900; color: #1a3a6b; text-transform: uppercase; }
  .docTitulo p  { font-size: 8px; color: #555; margin-top: 2px; }

  /* ── Meta ── */
  .meta {
    display: flex; gap: 16px; margin-bottom: 8px;
    background: #f5f7fa; border: 1px solid #dde1ea;
    border-radius: 5px; padding: 6px 12px;
  }
  .metaItem { flex: 1; }
  .metaLabel { font-size: 7px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.4px; }
  .metaValor { font-size: 10px; font-weight: 700; color: #1a3a6b; margin-top: 1px; }

  /* ── Tabla ── */
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #bbb; text-align: center; vertical-align: middle; overflow: hidden; }

  /* Encabezado D1, D2... */
  .dHead {
    background: #1a3a6b; color: #fff;
    font-size: 10px; font-weight: 900;
    padding: 4px 2px;
  }
  /* Sub-encabezados Taller/Clase/Eval */
  .subH {
    background: #dbeafe; color: #1e40af;
    font-size: 7px; font-weight: 700;
    padding: 3px 2px; white-space: nowrap;
  }
  .promH { background: #e0f2fe; color: #0369a1; }

  /* Descripción desempeño */
  .dDesc {
    background: #eff6ff; color: #1e40af;
    font-size: 7px; padding: 2px 4px;
    text-align: left; white-space: normal; line-height: 1.3;
  }

  /* Columnas fijas */
  th.thNum, td.num  { width: 22px; font-size: 8px; color: #777; background: #f8fafc; }
  th.thNombre { background: #1a3a6b; color: #fff; font-size: 9px; font-weight: 700; text-align: left; padding-left: 4px; }
  td.nombre { text-align: left; padding-left: 4px; font-weight: 700; font-size: 8px; white-space: nowrap; overflow: hidden; }
  th.thF, td.cBlank { background: #fef3c7; }
  .thF { background: #fef3c7; color: #92400e; font-size: 9px; font-weight: 700; }

  /* Filas */
  tr.par  td { background: #fff; }
  tr.impar td { background: #f8fafc; }
  td.cBlank { min-width: 30px; height: 18px; }
  td.cBlankProm { min-width: 30px; height: 18px; background: #e0f2fe; }

  /* Pie */
  .footer { margin-top: 10px; display: flex; justify-content: space-between; font-size: 7px; color: #888; border-top: 1px solid #ddd; padding-top: 6px; }
</style>
</head>
<body>

  <!-- Encabezado -->
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

  <!-- Meta -->
  <div class="meta">
    <div class="metaItem"><div class="metaLabel">Materia</div><div class="metaValor">${materiaNombre || '—'}</div></div>
    <div class="metaItem"><div class="metaLabel">Período</div><div class="metaValor">Período ${periodoNumero}</div></div>
    <div class="metaItem"><div class="metaLabel">Estudiantes</div><div class="metaValor">${estudiantes.length}</div></div>
    <div class="metaItem"><div class="metaLabel">Desempeños</div><div class="metaValor">${desempenos.length} (${subCols.length} cols c/u)</div></div>
    <div class="metaItem"><div class="metaLabel">Fecha</div><div class="metaValor">${fecha}</div></div>
  </div>

  <!-- Tabla -->
  <table>
    <thead>
      <tr>
        <th class="thNum" rowspan="3">#</th>
        <th class="thNombre" rowspan="3" style="min-width:120px;text-align:left;padding-left:4px;">Estudiante</th>
        ${th1}
        <th class="thF" rowspan="3">F</th>
      </tr>
      <tr>${th2}</tr>
      <tr>${th3}</tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <!-- Pie -->
  <div class="footer">
    <span>NotaFácil Docente · ${colegio.nombre}</span>
    <span>Planilla en blanco generada: ${fecha}</span>
  </div>

</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Planilla ${materiaNombre} - Período ${periodoNumero}`,
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
              <Text style={{ fontWeight: '800' }}>Planilla en Blanco</Text> — cuadrícula por desempeños para llenar a mano
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
