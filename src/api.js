
/*
const API_URL = "https://script.google.com/macros/s/AKfycbzqXRsm-q8Bq2pZ5-ykFmKeHSk2f6elBAISDlXlKaMIjm1_-urQqw1XAKxkrJBaaQ3m-g/exec"

export const database = {
  // Para leer cualquier pestaña (proyectos, pendientes, gases, etc.)
  obtenerSeccion: async (seccion) => {
    try {
      const response = await fetch(`${API_URL}?accion=${seccion}`);
      return await response.json();
    } catch (error) {
      console.error("Error leyendo sección " + seccion, error);
      return [];
    }
  },
  
  // Para mandar escrituras o modificaciones (Calibrado Seguro)
  guardarDatos: async (accion, datos) => {
    try {
      // Modificamos el cuerpo para que siempre envíe la propiedad 'datos' estructurada
      // Si 'datos' ya es un objeto con subpropiedades, viaja limpio. Si no, lo empaqueta.
      const cuerpoPeticion = {
        accion: accion,
        datos: datos && datos.datos ? datos.datos : datos
      };

      // Cambiamos a un POST estándar sin 'no-cors' usando text/plain para saltar el bloqueo de CORS de Google
      const response = await fetch(API_URL, {
        method: "POST",
        mode: "cors", 
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(cuerpoPeticion)
      });
      
      if (!response.ok) return false;
      const resJson = await response.json();
      return resJson.resultado || true;
    } catch (error) {
      console.error("Error en ejecución POST:", error);
      return false;
    }
  }
};

*/

// =========================================================================
// 🟢 CLIENTE BASE SUPABASE (Fallback de seguridad)
// =========================================================================
export { supabase } from './supabase';

// Mock inofensivo por si algún componente legacy sigue importando `database`
export const database = {
  obtenerSeccion: async () => [],
  guardarDatos: async () => true
};


