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

import LoginScreen from './screens/LoginScreen';
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
import RecuperarPasswordScreen from './screens/RecuperarPasswordScreen';
import SplashScreen from './screens/SplashScreen';
import ReporteScreen from './screens/ReporteScreen';
import ConfigurarDesempenosScreen from './screens/ConfigurarDesempenosScreen';
import CalificarIAScreen from './screens/CalificarIAScreen';
import RiesgoScreen from './screens/RiesgoScreen';
import ListadoEstudiantesScreen from './screens/ListadoEstudiantesScreen';
import RetirosScreen from './screens/RetirosScreen';
import MateriaDetalleScreen from './screens/MateriaDetalleScreen';
import CarnetEstudiantesScreen from './screens/CarnetEstudiantesScreen';

const Stack = createNativeStackNavigator();

function App() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSignedIn, setIsSignedIn] = React.useState(false);
  const appState = React.useRef(AppState.currentState);

  const checkToken = async () => {
    const token = await SecureStore.getItemAsync('accessToken');
    const refreshToken = await SecureStore.getItemAsync('refreshToken');
    setIsSignedIn(!!token && !!refreshToken);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('usuarioId');
    await SecureStore.deleteItemAsync('rol');
    await SecureStore.deleteItemAsync('nombre');
    setIsSignedIn(false);
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

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: true, headerTitleAlign: 'center' }}>
            {isSignedIn ? (
              <>
                <Stack.Screen name="SeleccionarMateria" component={SeleccionarMateriaScreen} options={{ title: 'Mis Materias', headerBackVisible: false }} />
                <Stack.Screen name="SeleccionarPeriodo" component={SeleccionarPeriodoScreen} options={{ title: 'Seleccionar Periodo' }} />
                <Stack.Screen name="Calificacion" component={CalificacionScreen} options={{ title: 'Calificar por Desempeños', headerBackVisible: true }} />
                <Stack.Screen name="Asistencia" component={AsistenciaScreen} options={{ title: 'Control de Asistencia', headerBackVisible: true }} />
                <Stack.Screen name="Planilla" component={PlanillaScreen} options={{ title: 'Malla por Grupos', headerBackVisible: true }} />
                <Stack.Screen name="Horario" component={HorarioScreen} options={{ title: 'Mi Horario', headerBackVisible: true }} />
                <Stack.Screen name="AsignacionesProfesor" component={AsignacionesProfesorScreen} options={{ title: 'Asignaciones', headerBackVisible: true }} />
                <Stack.Screen name="CambiarPassword" component={CambiarPasswordScreen} options={{ title: 'Cambiar Contrasena', headerBackVisible: true }} />
                <Stack.Screen name="Boletin" component={BoletinScreen} options={{ title: 'Boletín del Curso', headerBackVisible: true }} />
                <Stack.Screen name="Reporte" component={ReporteScreen} options={{ title: 'Reporte a padres', headerBackVisible: true }} />
                <Stack.Screen name="CalificarIA" component={CalificarIAScreen} options={{ title: 'Calificar con IA', headerBackVisible: true, headerStyle: { backgroundColor: '#7c3aed' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }} />
                <Stack.Screen name="ConfigurarDesempenos" component={ConfigurarDesempenosScreen} options={{ title: 'Configurar Desempeños', headerBackVisible: true }} />
                <Stack.Screen name="Rector" component={RectorScreen} options={{ title: 'Panel Rector', headerBackVisible: false }} />
                <Stack.Screen name="Riesgo" component={RiesgoScreen} options={{ title: 'Riesgo Académico', headerBackVisible: true, headerStyle: { backgroundColor: '#7c3aed' }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '700' } }} />
                <Stack.Screen name="Listado" component={ListadoEstudiantesScreen} options={{ headerShown: false }} />
                <Stack.Screen name="Retiros" component={RetirosScreen} options={{ headerShown: false }} />
                <Stack.Screen name="MateriaDetalle" component={MateriaDetalleScreen} options={{ headerShown: false }} />
                <Stack.Screen name="CarnetEstudiantes" component={CarnetEstudiantesScreen} options={{ headerShown: false }} />
              </>
            ) : (
              <>
                <Stack.Screen name="Login" options={{ headerShown: false }}>
                  {(props) => <LoginScreen {...props} onLogin={() => setIsSignedIn(true)} />}
                </Stack.Screen>
                <Stack.Screen name="RecuperarPassword" component={RecuperarPasswordScreen} options={{ title: 'Recuperar Contrasena' }} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </PersistGate>
    </Provider>
  );
}

export default App;
