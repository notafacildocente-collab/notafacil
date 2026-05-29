import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert, TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { exportarPlanillaPDF } from '../services/exportarPDF';
import { apiFetch } from '../services/api';

const CELDA_NOMBRE = 165;
const CELDA_NOTA = 58;
const CELDA_FALTAS = 40;
const CELDA_FINAL = 60;
const CELDA_PROM = 58;

export default function PlanillaScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { asignacionId, periodoId, materiaNombre, periodoNumero } = (route.params || {}) as any;
  const [planilla, setPlanilla] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargar(); }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/notas/planilla?asignacionId=${asignacionId}&periodoId=${periodoId}`);
      if (!res.ok) throw new Error('Error');
      setPlanilla(await res.json());
    } catch { Alert.alert('Error', 'No se pudo cargar la planilla'); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a3a6b" />
      <Text style={styles.loadingText}>Cargando planilla...</Text>
    </View>
  );

  if (planilla.length === 0) return <View style={styles.center}><Text style={{color:'#6b7280'}}>Sin datos</Text></View>;

  const desempenos = planilla[0].desempenos;
  const maxNotas = desempenos.map((_:any, di:number) =>
    Math.max(...planilla.map((est:any) => est.desempenos[di]?.notas?.length || 0), 1)
  );
  const nombresPorD = desempenos.map((_:any, di:number) => {
    return Array.from({length: maxNotas[di]}, (_:any, ni:number) => {
      for (const est of planilla) {
        const n = est.desempenos[di]?.notas?.[ni];
        if (n?.descripcion) return n.descripcion;
      }
      return `Act ${ni+1}`;
    });
  });

  return (
    <View style={styles.flex}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerSubtitle}>Malla por Grupos</Text>
          <Text style={styles.headerMateria} numberOfLines={1}>{materiaNombre}</Text>
        </View>
        <Text style={styles.headerPeriodo}>P{periodoNumero}</Text>
      </View>

      <TouchableOpacity
        style={styles.exportBtn}
        onPress={() => exportarPlanillaPDF(materiaNombre, periodoNumero, planilla)}
      >
        <Text style={styles.exportTxt}>📄 Exportar PDF</Text>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Fila 1 — D1 D2 D3 F Final */}
          <View style={styles.fila}>
            <View style={[styles.encCell, {width: CELDA_NOMBRE}]}><Text style={styles.encTxt}>Estudiante</Text></View>
            {desempenos.map((d:any, di:number) => (
              <View key={di} style={[styles.encCell, styles.encD, {width: CELDA_NOTA*maxNotas[di]+CELDA_PROM}]}>
                <Text style={styles.encDTxt}>{`D${di+1}`}</Text>
              </View>
            ))}
            <View style={[styles.encCell, {width: CELDA_FALTAS, backgroundColor:'#fef3c7'}]}><Text style={[styles.encTxt,{color:'#b45309'}]}>F</Text></View>
            <View style={[styles.encCell, {width: CELDA_FINAL, backgroundColor:'#dcfce7'}]}><Text style={[styles.encTxt,{color:'#065f46'}]}>Final</Text></View>
          </View>

          {/* Fila 2 — nombres actividades */}
          <View style={[styles.fila, {backgroundColor:'#f1f5f9'}]}>
            <View style={{width: CELDA_NOMBRE}}/>
            {desempenos.map((_:any, di:number) => (
              <View key={di} style={{flexDirection:'row'}}>
                {nombresPorD[di].map((nom:string, ni:number) => (
                  <View key={ni} style={[styles.subEncCell, {width: CELDA_NOTA}]}>
                    <Text style={styles.subEncTxt} numberOfLines={2}>{nom}</Text>
                  </View>
                ))}
                <View style={[styles.subEncCell, {width: CELDA_PROM, backgroundColor:'#e0f2fe'}]}>
                  <Text style={[styles.subEncTxt, {color:'#0369a1'}]}>Prom</Text>
                </View>
              </View>
            ))}
            <View style={{width: CELDA_FALTAS}}/>
            <View style={{width: CELDA_FINAL}}/>
          </View>

          {/* Filas estudiantes */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {planilla.map((est:any, idx:number) => (
              <View key={est.estudianteId} style={[styles.fila, idx%2===0 && styles.filaPar]}>
                <Text style={[styles.celdaNombre, {width: CELDA_NOMBRE}]} numberOfLines={1}>{est.nombre}</Text>
                {est.desempenos.map((d:any, di:number) => (
                  <View key={di} style={{flexDirection:'row'}}>
                    {Array.from({length: maxNotas[di]}).map((_:any, ni:number) => {
                      const val = d.notas?.[ni]?.valor ?? null;
                      return (
                        <View key={ni} style={[styles.celdaView, {width: CELDA_NOTA}]}>
                          <Text style={[styles.notaTxt, val===null&&styles.notaVacia, val!==null&&val<3&&styles.notaRoja]}>
                            {val===null ? '—' : val.toFixed(1)}
                          </Text>
                        </View>
                      );
                    })}
                    <View style={[styles.celdaView, {width: CELDA_PROM, backgroundColor:'#f0f9ff'}]}>
                      <Text style={[styles.promTxt, d.promedio===0&&styles.notaVacia, d.promedio>0&&d.promedio<3&&styles.notaRoja]}>
                        {d.promedio===0 ? '—' : d.promedio.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                ))}
                <View style={[styles.celdaView, {width: CELDA_FALTAS}]}>
                  <Text style={[styles.faltasTxt, (est.totalFaltas||0)>0&&{color:'#b45309'}]}>{est.totalFaltas||0}</Text>
                </View>
                <View style={[styles.celdaView, {width: CELDA_FINAL}]}>
                  <Text style={[styles.finalTxt, est.notaFinal===0&&styles.notaVacia, est.notaFinal>0&&est.notaFinal<3&&styles.notaRoja]}>
                    {est.notaFinal===0 ? '—' : est.notaFinal.toFixed(1)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={styles.resumenBar}>
        <Text style={styles.resumenTxt}>{planilla.length} estudiantes · {desempenos.length} desempeños</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  flex:        { flex: 1, backgroundColor: '#F8FAFC' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loadingText: { marginTop: 12, color: '#475569' },

  headerBar:    { backgroundColor: '#2D5FA8', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  backBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerSubtitle:{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 1 },
  headerMateria:{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  headerPeriodo:{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600' },

  // Tabla — texto siempre oscuro sobre blanco/gris claro
  fila:    { flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 0.5, borderBottomColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
  filaPar: { backgroundColor: '#F8FAFC' },

  // Headers de tabla
  encCell:   { paddingVertical: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', borderRightWidth: 1, borderRightColor: '#BFDBFE' },
  encTxt:    { fontSize: 12, fontWeight: '700', color: '#1E40AF', textAlign: 'center' },     // azul oscuro — visible
  encD:      { backgroundColor: '#DBEAFE' },
  encDTxt:   { fontSize: 13, fontWeight: '800', color: '#1E40AF' },                           // azul oscuro — visible
  encDSub:   { fontSize: 9, color: '#3B82F6', marginTop: 1 },

  subEncCell: { paddingVertical: 5, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  subEncTxt:  { fontSize: 9, color: '#334155', textAlign: 'center', fontWeight: '600' },      // gris oscuro — visible

  // Celdas de datos — texto SIEMPRE oscuro
  celdaNombre: { paddingVertical: 11, paddingLeft: 10, paddingRight: 4, fontSize: 12, fontWeight: '500', color: '#0F172A', textAlignVertical: 'center' },
  celdaView:   { paddingVertical: 11, paddingHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
  notaTxt:     { fontSize: 12, fontWeight: '600', color: '#059669' },
  notaVacia:   { color: '#CBD5E1', fontWeight: '400' },
  notaRoja:    { color: '#DC2626', fontWeight: '700' },
  promTxt:     { fontSize: 13, fontWeight: '700', color: '#0369A1' },
  faltasTxt:   { fontSize: 12, fontWeight: '700', color: '#64748B' },
  finalTxt:    { fontSize: 14, fontWeight: '800', color: '#059669' },

  exportBtn: { backgroundColor: '#2D5FA8', marginHorizontal: 12, marginVertical: 8, paddingVertical: 12, borderRadius: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  exportTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

  resumenBar: { backgroundColor: '#2D5FA8', paddingVertical: 10, alignItems: 'center' },
  resumenTxt: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
});
