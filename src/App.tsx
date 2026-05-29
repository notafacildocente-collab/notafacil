import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import * as SecureStore from 'expo-secure-store';

import store, { persistor } from './store/redux';
import { initializeDatabase } from './services/watermelonDB';
import { syncService } from './services/sync';
import { registrarCerrarSesion } from './services/auth';

// ── Pantallas generales ──────────────────────────────────────────────────────
import LoginScreen from './screens/LoginScreen';
import SplashScreen from './screens/SplashScreen';
import RecuperarPasswordScreen from './screens/RecuperarPasswordScreen';

// ── Pantallas de profesor / rector ───────────────────────────────────────────
import SeleccionarMateriaScreen from './screens/SeleccionarMateriaScreen';
import SeleccionarPeriodoScreen from './screens/SeleccionarPeriodoScreen';
import CalificacionScreen from './screens/CalificacionScreen';
import AsistenciaScreen from './screens/AsistenciaScreen';
import PlanillaScreen from './screens/PlanillaScreen';
import HorarioScreen from './screens/HorarioScreen';
import AsignacionesProfesorScreen from './screens/AsignacionesProfesorScreen';
import CambiarPasswordScreen from './screens/CambiarPasswordScreen';
import BoletinScreen from './screens/BoletinScreen';
import RectorScreen from './screens/RectorScreen';
import ReporteScreen from './screens/ReporteScreen';
import ConfigurarDesempenosScreen from './screens/ConfigurarDesempenosScreen';
import CalificarIAScreen from './screens/CalificarIAScreen';
import ListadoEstudiantesScreen from './screens/ListadoEstudiantesScreen';
import RetirosScreen from './screens/RetirosScreen';
import MateriaDetalleScreen from './screens/MateriaDetalleScreen';
import CarnetEstudiantesScreen from './screens/CarnetEstudiantesScreen';

// ── Pantallas de estudiante ───────────────────────────────────────────────────
import EstudianteScreen from './screens/EstudianteScreen';
import EstudianteNotasScreen from './screens/EstudianteNotasScreen';
import EstudianteHorarioScreen from './screens/EstudianteHorarioScreen';
import EstudianteAsistenciaScreen from './screens/EstudianteAsistenciaScreen';
import EstudianteBoletinScreen from './screens/EstudianteBoletinScreen';

const Stack = createNativeStackNavigator();

function App() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const [rol, setRol] = React.useState<string>('');
  const appState = React.useRef(AppState.currentState);

  const checkToken = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    const rolGuardado = await SecureStore.getItemAsync('rol') || '';
    setIsSignedIn(!!token && !!refreshToken);
    setRol(rolGuardado);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('usuarioId');
    await SecureStore.deleteItemAsync('rol');
    await SecureStore.deleteItemAsync('nombre');
    setIsSignedIn(false);
    setRol('');
  };

  const handleLoginSuccess = async () => {
    const rolGuardado = await SecureStore.getItemAsync('rol') || '';
    setRol(rolGuardado);
    setIsSignedIn(true);
  };

  useEffect(() => {
    registrarCerrarSesion(logout);
  }, []);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        await initializeDatabase();
        await checkToken();
        const token = await SecureStore.getItemAsync('accessToken');
        if (token) syncService.startBackgroundSync();
      } catch (error) {
        console.error('Error inicializando app:', error);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
    const subscription = AppState.addEventListener('change', (state) => {
      if (appState.current.match(/inactive|background/) && state === 'active') {
        syncService.startBackgroundSync();
      }
      appState.current = state;
    });
    return () => subscription.remove();
  }, []);

  if (isLoading) return <SplashScreen />;

  const esEstudiante = isSignedIn && rol === 'ESTUDIANTE';
  const esRector    = isSignedIn && rol === 'RECTOR';
  const esProfesor  = isSignedIn && (rol === 'PROFESOR' || rol === 'COORDINADOR' || (!rol && isSignedIn));

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>

            {/* ── Sin sesión ── */}
            {!isSignedIn ? (
              <>
                <Stack.Screen name="Login" options={{ headerShown: false }}>
                  {(props) => <LoginScreen {...props} onLogin={handleLoginSuccess} />}
                </Stack.Screen>
                <Stack.Screen name="RecuperarPassword" component={RecuperarPasswordScreen} options={{ title: 'Recuperar Contraseña' }} />
              </>
            ) : esEstudiante ? (

              /* ── Panel Estudiante ── */
              <>
                <Stack.Screen name="EstudianteHome" component={EstudianteScreen} options={{ headerShown: false }} />
                <Stack.Screen name="EstudianteNotas" component={EstudianteNotasScreen} options={{ title: 'Mis Notas', headerBackVisible: true }} />
                <Stack.Screen name="EstudianteHorario" component={EstudianteHorarioScreen} options={{ title: 'Mi Horario', headerBackVisible: true }} />
                <Stack.Screen name="EstudianteAsistencia" component={EstudianteAsistenciaScreen} options={{ title: 'Mi Asistencia', headerBackVisible: true }} />
                <Stack.Screen name="EstudianteBoletin" component={EstudianteBoletinScreen} options={{ title: 'Boletín', headerBackVisible: true }} />
              </>

            ) : esRector ? (

              /* ── Panel Rector (inicia en RectorScreen) ── */
              <>
                <Stack.Screen name="Rector" component={RectorScreen} options={{ headerShown: false }} />
                <Stack.Screen name="SeleccionarMateria" component={SeleccionarMateriaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="SeleccionarPeriodo" component={SeleccionarPeriodoScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Calificacion" component={CalificacionScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Asistencia" component={AsistenciaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Planilla" component={PlanillaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Horario" component={HorarioScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AsignacionesProfesor" component={AsignacionesProfesorScreen} options={{ title: 'Asignaciones', headerBackVisible: true }} />
                <Stack.Screen name="CambiarPassword" component={CambiarPasswordScreen} options={{ title: 'Cambiar Contraseña', headerBackVisible: true }} />
                <Stack.Screen name="Boletin" component={BoletinScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Reporte" component={ReporteScreen} options={{ title: 'Reporte a padres', headerBackVisible: true }} />
                <Stack.Screen name="CalificarIA" component={CalificarIAScreen} options={{ title: 'Calificar con IA', headerBackVisible: true, headerStyle: { backgroundColor: '#7c3aed' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }} />
                <Stack.Screen name="ConfigurarDesempenos" component={ConfigurarDesempenosScreen} options={{ title: 'Configurar Desempeños', headerBackVisible: true }} />
                <Stack.Screen name="Listado" component={ListadoEstudiantesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Retiros" component={RetirosScreen} options={{ headerShown: false }} />
                <Stack.Screen name="MateriaDetalle" component={MateriaDetalleScreen} options={{ headerShown: false }} />
                <Stack.Screen name="CarnetEstudiantes" component={CarnetEstudiantesScreen} options={{ headerShown: false }} />
              </>

            ) : (

              /* ── Panel Profesor (default) ── */
              <>
                <Stack.Screen name="SeleccionarMateria" component={SeleccionarMateriaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="SeleccionarPeriodo" component={SeleccionarPeriodoScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Calificacion" component={CalificacionScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Asistencia" component={AsistenciaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Planilla" component={PlanillaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Horario" component={HorarioScreen} options={{ headerShown: false }} />
                <Stack.Screen name="AsignacionesProfesor" component={AsignacionesProfesorScreen} options={{ title: 'Asignaciones', headerBackVisible: true }} />
                <Stack.Screen name="CambiarPassword" component={CambiarPasswordScreen} options={{ title: 'Cambiar Contraseña', headerBackVisible: true }} />
                <Stack.Screen name="Boletin" component={BoletinScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Reporte" component={ReporteScreen} options={{ title: 'Reporte a padres', headerBackVisible: true }} />
                <Stack.Screen name="CalificarIA" component={CalificarIAScreen} options={{ title: 'Calificar con IA', headerBackVisible: true, headerStyle: { backgroundColor: '#7c3aed' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }} />
                <Stack.Screen name="ConfigurarDesempenos" component={ConfigurarDesempenosScreen} options={{ title: 'Configurar Desempeños', headerBackVisible: true }} />
                <Stack.Screen name="Rector" component={RectorScreen} options={{ title: 'Panel Rector', headerBackVisible: false }} />
                <Stack.Screen name="Listado" component={ListadoEstudiantesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Retiros" component={RetirosScreen} options={{ headerShown: false }} />
                <Stack.Screen name="MateriaDetalle" component={MateriaDetalleScreen} options={{ headerShown: false }} />
                <Stack.Screen name="CarnetEstudiantes" component={CarnetEstudiantesScreen} options={{ headerShown: false }} />
              </>
            )}

          </Stack.Navigator>
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
}

export default App;
