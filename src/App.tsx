import React, { useEffect, Suspense } from 'react';
import { AppState, Platform, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

import store, { persistor } from './store/redux';
import { syncService } from './services/sync';
import { registrarCerrarSesion } from './services/auth';

// ── Pantallas generales ──────────────────────────────────────────────────────
import LoginScreen from './screens/LoginScreen';
import SplashScreen from './screens/SplashScreen';
import RecuperarPasswordScreen from './screens/RecuperarPasswordScreen';

// ── Pantallas base (cargan siempre) ──────────────────────────────────────────
import SeleccionarMateriaScreen from './screens/SeleccionarMateriaScreen';
import RectorScreen from './screens/RectorScreen';
import EstudianteScreen from './screens/EstudianteScreen';

// ── Pantallas lazy (cargan solo cuando se navega a ellas) ────────────────────
const SeleccionarPeriodoScreen = React.lazy(() => import('./screens/SeleccionarPeriodoScreen'));
const CalificacionScreen       = React.lazy(() => import('./screens/CalificacionScreen'));
const AsistenciaScreen         = React.lazy(() => import('./screens/AsistenciaScreen'));
const PlanillaScreen           = React.lazy(() => import('./screens/PlanillaScreen'));
const HorarioScreen            = React.lazy(() => import('./screens/HorarioScreen'));
const AsignacionesProfesorScreen = React.lazy(() => import('./screens/AsignacionesProfesorScreen'));
const CambiarPasswordScreen    = React.lazy(() => import('./screens/CambiarPasswordScreen'));
const BoletinScreen            = React.lazy(() => import('./screens/BoletinScreen'));
const ReporteScreen            = React.lazy(() => import('./screens/ReporteScreen'));
const ConfigurarDesempenosScreen = React.lazy(() => import('./screens/ConfigurarDesempenosScreen'));
const CalificarIAScreen        = React.lazy(() => import('./screens/CalificarIAScreen'));
const ListadoEstudiantesScreen = React.lazy(() => import('./screens/ListadoEstudiantesScreen'));
const RetirosScreen            = React.lazy(() => import('./screens/RetirosScreen'));
const MateriaDetalleScreen     = React.lazy(() => import('./screens/MateriaDetalleScreen'));
const CarnetEstudiantesScreen  = React.lazy(() => import('./screens/CarnetEstudiantesScreen'));
const ObservacionesScreen      = React.lazy(() => import('./screens/ObservacionesScreen'));
const CalendarioScreen         = React.lazy(() => import('./screens/CalendarioScreen'));
const EstudianteNotasScreen    = React.lazy(() => import('./screens/EstudianteNotasScreen'));
const EstudianteHorarioScreen  = React.lazy(() => import('./screens/EstudianteHorarioScreen'));
const EstudianteAsistenciaScreen = React.lazy(() => import('./screens/EstudianteAsistenciaScreen'));
const EstudianteBoletinScreen  = React.lazy(() => import('./screens/EstudianteBoletinScreen'));

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

  // ── Registrar push token al iniciar sesión ──────────────────────────────────
  useEffect(() => {
    if (!isSignedIn) return;
    const registrarPushToken = async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'c13ff982-c4aa-48e7-adac-1c3c212a5584',
        });
        const token = tokenData.data;
        if (token) {
          const { apiFetch: fetch2 } = await import('./services/api');
          await fetch2('/api/calendario/push-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
        }
        if (Platform.OS === 'android') {
          Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
          });
        }
      } catch { /* best effort */ }
    };
    registrarPushToken();
  }, [isSignedIn]);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Despertar Render (duerme tras 15 min sin uso) — fire and forget
        fetch('https://notafacil-backend-539h.onrender.com/api/auth/config').catch(() => {});

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
          <Suspense fallback={<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#2D5FA8" /></View>}>
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
                <Stack.Screen name="EstudianteNotas" component={EstudianteNotasScreen} options={{ headerShown: false }} />
                <Stack.Screen name="EstudianteHorario" component={EstudianteHorarioScreen} options={{ headerShown: false }} />
                <Stack.Screen name="EstudianteAsistencia" component={EstudianteAsistenciaScreen} options={{ headerShown: false }} />
                <Stack.Screen name="EstudianteBoletin" component={EstudianteBoletinScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Calendario" component={CalendarioScreen} options={{ headerShown: false }} />
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
                <Stack.Screen name="Observaciones" component={ObservacionesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Calendario" component={CalendarioScreen} options={{ headerShown: false }} />
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
                <Stack.Screen name="Observaciones" component={ObservacionesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Calendario" component={CalendarioScreen} options={{ headerShown: false }} />
              </>
            )}

          </Stack.Navigator>
          </Suspense>
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
}

export default App;
