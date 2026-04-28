import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
