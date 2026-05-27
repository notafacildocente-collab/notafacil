import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function exportarBoletinIndividualPDF(data: any, puesto?: number) {
  const { estudiante, colegio, periodo, curso, materias, promedio, totalFaltas } = data;

  const logoHtml = colegio.logoUrl
    ? `<img src="${colegio.logoUrl}" style="height:64px;object-fit:contain;border-radius:6px;" />`
    : `<div style="width:64px;height:64px;background:#1a3a6b;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;color:white;font-weight:900;">${(colegio.colegioNombre || 'C').charAt(0)}</div>`;

  const promColor = promedio >= 3.0 ? '#059669' : '#dc2626';
  const materiasConNota = materias.filter((m: any) => m.notaFinal > 0);

  const filasMaterias = materiasConNota.map((m: any) => {
    const notaColor = m.notaFinal < 3.0 ? '#dc2626' : '#059669';
    const detalle = m.desempenos?.length
      ? m.desempenos.map((d: any) => `<small style="color:#6b7280;">${d.nombre}: <b>${d.promedio.toFixed(1)}</b></small>`).join(' &nbsp;·&nbsp; ')
      : '<small style="color:#d1d5db;">Sin notas detalladas</small>';
    return `<tr>
      <td style="padding:9px 12px;font-size:13px;border-bottom:1px solid #e5e7eb;">${m.nombre}</td>
      <td style="text-align:center;padding:9px 8px;font-size:16px;font-weight:900;color:${notaColor};border-bottom:1px solid #e5e7eb;">${m.notaFinal.toFixed(1)}</td>
      <td style="padding:9px 10px;border-bottom:1px solid #e5e7eb;line-height:1.6;">${detalle}</td>
    </tr>`;
  }).join('');

  const fecha = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  const aprueba = promedio >= 3.0;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 28px 32px; color: #1f2937; background: #fff; }
  .header { display: flex; align-items: center; gap: 18px; padding-bottom: 18px; border-bottom: 3px solid #1a3a6b; margin-bottom: 22px; }
  .school-block { flex: 1; }
  .school-name { font-size: 19px; font-weight: 900; color: #1a3a6b; line-height: 1.2; }
  .school-meta { font-size: 11px; color: #6b7280; margin-top: 5px; }
  .doc-badge { background: #f0f4ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 4px 10px; font-size: 11px; color: #1a3a6b; font-weight: 700; }
  .student-box { background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 100%); border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
  .student-name { font-size: 18px; font-weight: 900; color: #1a3a6b; }
  .student-meta { font-size: 12px; color: #4b5563; margin-top: 4px; }
  .student-meta span { margin-right: 12px; }
  .puesto-badge { background: #1a3a6b; color: white; border-radius: 50%; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; flex-direction: column; }
  .puesto-num { font-size: 20px; font-weight: 900; line-height: 1; }
  .puesto-lbl { font-size: 9px; font-weight: 700; opacity: 0.8; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #1a3a6b; color: white; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 700; }
  thead th:nth-child(2) { text-align: center; width: 80px; }
  .resumen-box { display: flex; gap: 16px; margin-bottom: 28px; }
  .resumen-card { flex: 1; border-radius: 12px; padding: 14px 18px; border: 2px solid; }
  .resumen-prom { border-color: ${promColor}; background: ${aprueba ? '#f0fdf4' : '#fef2f2'}; }
  .resumen-faltas { border-color: ${totalFaltas > 3 ? '#f59e0b' : '#d1d5db'}; background: ${totalFaltas > 3 ? '#fffbeb' : '#f9fafb'}; }
  .resumen-label { font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 4px; }
  .resumen-valor { font-size: 28px; font-weight: 900; }
  .resumen-sub { font-size: 11px; color: #9ca3af; margin-top: 3px; }
  .sigs { display: flex; justify-content: space-around; padding-top: 28px; margin-top: 36px; border-top: 1px solid #e5e7eb; }
  .sig { text-align: center; }
  .sig-space { height: 48px; }
  .sig-line { border-top: 1px solid #374151; padding-top: 6px; font-size: 11px; color: #6b7280; min-width: 160px; }
  .footer { margin-top: 18px; text-align: center; font-size: 10px; color: #9ca3af; padding-top: 10px; border-top: 1px solid #f3f4f6; }
</style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="school-block">
      <div class="school-name">${colegio.colegioNombre || 'Institución Educativa'}</div>
      <div class="school-meta">
        ${colegio.ciudad ? colegio.ciudad + ' &nbsp;·&nbsp; ' : ''}
        ${colegio.regimenEvaluacion ? 'Régimen: ' + colegio.regimenEvaluacion + ' &nbsp;·&nbsp; ' : ''}
        Boletín de Notas · Período ${periodo.numero || ''}
      </div>
      <div style="margin-top:6px;">
        <span class="doc-badge">Período ${periodo.numero || '?'}</span>
        <span class="doc-badge" style="margin-left:8px;">${(periodo.fechaInicio || '').slice(0, 10)} – ${(periodo.fechaFin || '').slice(0, 10)}</span>
      </div>
    </div>
  </div>

  <div class="student-box">
    <div>
      <div class="student-name">${estudiante.apellido}, ${estudiante.nombre}</div>
      <div class="student-meta">
        <span>📋 Doc: ${estudiante.numeroDocumento}</span>
        <span>🏫 Curso: ${curso.nombre || '—'}</span>
      </div>
    </div>
    ${puesto ? `<div class="puesto-badge"><span class="puesto-num">${puesto}°</span><span class="puesto-lbl">PUESTO</span></div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Materia</th>
        <th>Nota</th>
        <th>Detalle por desempeño</th>
      </tr>
    </thead>
    <tbody>
      ${filasMaterias || '<tr><td colspan="3" style="text-align:center;padding:16px;color:#9ca3af;">Sin notas registradas en este período</td></tr>'}
    </tbody>
  </table>

  <div class="resumen-box">
    <div class="resumen-card resumen-prom">
      <div class="resumen-label">Promedio General</div>
      <div class="resumen-valor" style="color:${promColor};">${promedio.toFixed(1)}</div>
      <div class="resumen-sub">${aprueba ? '✅ Aprueba el período' : '⚠️ En riesgo de pérdida'}</div>
    </div>
    <div class="resumen-card resumen-faltas">
      <div class="resumen-label">Total Inasistencias</div>
      <div class="resumen-valor" style="color:${totalFaltas > 3 ? '#f59e0b' : '#6b7280'};">${totalFaltas}</div>
      <div class="resumen-sub">${totalFaltas === 0 ? '✅ Asistencia perfecta' : totalFaltas > 3 ? '⚠️ Inasistencias altas' : 'Asistencia regular'}</div>
    </div>
  </div>

  <div class="sigs">
    <div class="sig"><div class="sig-space"></div><div class="sig-line">Director(a) de Grupo</div></div>
    <div class="sig"><div class="sig-space"></div><div class="sig-line">Rector(a)</div></div>
    <div class="sig"><div class="sig-space"></div><div class="sig-line">Firma del Acudiente</div></div>
  </div>

  <div class="footer">
    NotaFácil · Sistema de Gestión Académica · Generado el ${fecha}
  </div>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Boletín ${estudiante.apellido} ${estudiante.nombre} P${periodo.numero || ''}`,
  });
}

export async function exportarPlanillaPDF(
  materiaNombre: string,
  periodoNumero: number,
  planilla: any[],
) {
  if (!planilla.length) return;

  const desempenos = planilla[0].desempenos;
  const maxNotas = desempenos.map((_: any, di: number) =>
    Math.max(...planilla.map((est: any) => est.desempenos[di]?.notas?.length || 0), 1)
  );

  // Nombres de actividades
  const nombresPorD = desempenos.map((_: any, di: number) =>
    Array.from({ length: maxNotas[di] }, (_: any, ni: number) => {
      for (const est of planilla) {
        const n = est.desempenos[di]?.notas?.[ni];
        if (n?.descripcion) return n.descripcion;
      }
      return `Act ${ni + 1}`;
    })
  );

  const encabezadoNotas = desempenos.map((d: any, di: number) => {
    const cols = nombresPorD[di].map((nom: string) =>
      `<th style="font-size:9px;padding:4px 2px;background:#dbeafe;">${nom}</th>`
    ).join('');
    return cols + `<th style="font-size:9px;padding:4px 2px;background:#e0f2fe;">Prom</th>`;
  }).join('');

  const encD = desempenos.map((d: any, di: number) =>
    `<th colspan="${maxNotas[di] + 1}" style="background:#1a3a6b;color:white;padding:5px;">D${di + 1}</th>`
  ).join('');

  const filas = planilla.map((est: any, idx: number) => {
    const notasHtml = est.desempenos.map((d: any, di: number) => {
      const cols = Array.from({ length: maxNotas[di] }, (_: any, ni: number) => {
        const val = d.notas?.[ni]?.valor ?? null;
        const color = val !== null && val < 3 ? 'color:#ef4444;font-weight:bold;' : '';
        return `<td style="text-align:center;padding:3px;font-size:11px;${color}">${val === null ? '—' : val.toFixed(1)}</td>`;
      }).join('');
      const promColor = d.promedio > 0 && d.promedio < 3 ? 'color:#ef4444;font-weight:bold;' : 'color:#059669;';
      return cols + `<td style="text-align:center;padding:3px;font-size:11px;background:#f0f9ff;${promColor}">${d.promedio === 0 ? '—' : d.promedio.toFixed(1)}</td>`;
    }).join('');

    const faltasColor = (est.totalFaltas || 0) > 0 ? 'color:#b45309;font-weight:bold;' : 'color:#9ca3af;';
    const finalColor = est.notaFinal > 0 && est.notaFinal < 3 ? 'color:#ef4444;font-weight:bold;' : 'color:#059669;font-weight:bold;';
    const bg = idx % 2 === 0 ? '#fff' : '#f9fafb';

    return `<tr style="background:${bg};">
      <td style="padding:4px 8px;font-size:11px;">${est.nombre}</td>
      ${notasHtml}
      <td style="text-align:center;padding:3px;font-size:11px;${faltasColor}">${est.totalFaltas || 0}</td>
      <td style="text-align:center;padding:3px;font-size:12px;${finalColor}">${est.notaFinal === 0 ? '—' : est.notaFinal.toFixed(1)}</td>
    </tr>`;
  }).join('');

  const html = `
    <html><head><style>
      body { font-family: Arial, sans-serif; margin: 12px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #e5e7eb; }
      h2 { color: #1a3a6b; margin-bottom: 4px; }
    </style></head>
    <body>
      <h2>${materiaNombre} — Período ${periodoNumero}</h2>
      <p style="font-size:11px;color:#6b7280;">Generado: ${new Date().toLocaleDateString('es-CO')}</p>
      <table>
        <thead>
          <tr>
            <th rowspan="2" style="background:#1a3a6b;color:white;padding:6px;">Estudiante</th>
            ${encD}
            <th rowspan="2" style="background:#fef3c7;color:#b45309;padding:6px;">F</th>
            <th rowspan="2" style="background:#dcfce7;color:#065f46;padding:6px;">Final</th>
          </tr>
          <tr>${encabezadoNotas}</tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </body></html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Planilla ${materiaNombre}` });
}

export async function exportarBoletinPDF(
  periodoNumero: number,
  cursoNombre: string,
  materias: any[],
  estudiantes: any[],
) {
  const encMaterias = materias.map((m: any) =>
    `<th style="font-size:9px;padding:4px 2px;background:#dbeafe;writing-mode:vertical-rl;transform:rotate(180deg);height:70px;">${(m.codigo || m.nombre.slice(0,4).toUpperCase()).replace(/-\d+$/, '')}</th>`
  ).join('');

  const filas = estudiantes.map((est: any, idx: number) => {
    const notasHtml = materias.map((m: any) => {
      const nota = est.notasPorMateria[m.id] || 0;
      const color = nota > 0 && nota < 3 ? 'color:#ef4444;font-weight:bold;' : nota === 0 ? 'color:#d1d5db;' : 'color:#059669;';
      return `<td style="text-align:center;padding:3px;font-size:11px;${color}">${nota === 0 ? '—' : nota.toFixed(1)}</td>`;
    }).join('');

    const promColor = est.promedio > 0 && est.promedio < 3 ? 'color:#ef4444;font-weight:bold;' : 'color:#059669;font-weight:bold;';
    const bg = idx % 2 === 0 ? '#fff' : '#f9fafb';

    return `<tr style="background:${bg};">
      <td style="padding:3px 4px;font-size:10px;font-weight:bold;">${est.puesto}°</td>
      <td style="padding:3px 8px;font-size:11px;">${est.nombre}</td>
      ${notasHtml}
      <td style="text-align:center;padding:3px;font-size:11px;color:${(est.totalFaltas||0)>0?'#b45309':'#9ca3af'};font-weight:bold;">${est.totalFaltas || 0}</td>
      <td style="text-align:center;padding:3px;font-size:12px;${promColor}">${est.promedio === 0 ? '—' : est.promedio.toFixed(1)}</td>
    </tr>`;
  }).join('');

  const html = `
    <html><head><style>
      body { font-family: Arial, sans-serif; margin: 12px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #e5e7eb; }
      h2 { color: #1a3a6b; margin-bottom: 4px; }
    </style></head>
    <body>
      <h2>Boletín del Curso — Período ${periodoNumero}</h2>
      <p style="font-size:11px;color:#6b7280;">${cursoNombre || ''} · ${new Date().toLocaleDateString('es-CO')}</p>
      <table>
        <thead>
          <tr>
            <th style="background:#1a3a6b;color:white;padding:6px;">#</th>
            <th style="background:#1a3a6b;color:white;padding:6px;">Estudiante</th>
            ${encMaterias}
            <th style="background:#fef3c7;color:#b45309;padding:6px;">F</th>
            <th style="background:#dcfce7;color:#065f46;padding:6px;">Prom.</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </body></html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Boletín Período ${periodoNumero}` });
}
