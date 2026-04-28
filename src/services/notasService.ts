/**
 * Notas Service
 * Operaciones relacionadas a notas
 */

import axios from 'axios';
import { Nota } from '../types/models';

const API_BASE_URL = 'https://notafacil-backend-production.up.railway.app/api';
export const notasService = {
  /**
   * Obtener notas del servidor
   */
  async obtenerNotas(estudianteId: string, periodoId: string): Promise<Nota[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/notas?estudianteId=${estudianteId}&periodoId=${periodoId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching notas:', error);
      return [];
    }
  },

  /**
   * Crear nota en servidor
   */
  async crearNota(nota: Nota): Promise<Nota> {
    try {
      const response = await axios.post(`${API_BASE_URL}/notas`, nota);
      return response.data;
    } catch (error) {
      console.error('Error creating nota:', error);
      throw error;
    }
  },

  /**
   * Actualizar nota en servidor
   */
  async actualizarNota(notaId: string, nota: Partial<Nota>): Promise<Nota> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/notas/${notaId}`, nota);
      return response.data;
    } catch (error) {
      console.error('Error updating nota:', error);
      throw error;
    }
  },

  /**
   * Eliminar nota del servidor
   */
  async eliminarNota(notaId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/notas/${notaId}`);
    } catch (error) {
      console.error('Error deleting nota:', error);
      throw error;
    }
  },
};
