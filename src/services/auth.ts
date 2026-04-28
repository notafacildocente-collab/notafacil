let _cerrarSesion: () => void = () => {};

export function registrarCerrarSesion(fn: () => void) {
  _cerrarSesion = fn;
}

export function cerrarSesionGlobal() {
  _cerrarSesion();
}