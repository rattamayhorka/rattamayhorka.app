import { useState } from 'react';
// ==========================================
// 🔴 ANTERIOR: API de Google Apps Script
// import { database } from '../api';
// 🟢 NUEVO: Cliente oficial de Supabase
import { supabase } from '../supabase';
// ==========================================
import { CheckCircle2, AlertCircle, ArrowLeft, Terminal, Send, Database } from 'lucide-react';

// =========================================================================
// 🧠 HELPER: PARSER DE FECHA Y DÍA/HORA PARA CLASIFICACIÓN (CASA / TRABAJO)
// =========================================================================
const MESES_MAP = {
  ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, aug: 7, sep: 8, oct: 9, nov: 10, dic: 11, dec: 11
};

const parsearFechaTexto = (strFecha) => {
  const hoy = new Date();
  if (!strFecha || !strFecha.trim()) return hoy;

  const texto = strFecha.trim().toLowerCase();
  
  // Si viene como DD/MM o DD/MM/YYYY
  if (texto.includes('/') || texto.includes('-')) {
    const partes = texto.split(/[\/\-]/);
    const dia = parseInt(partes[0], 10) || hoy.getDate();
    const mes = (parseInt(partes[1], 10) - 1) ?? hoy.getMonth();
    const año = partes[2] ? parseInt(partes[2], 10) : hoy.getFullYear();
    return new Date(año, mes, dia);
  }

  // Si viene como "28jul" o "28-jul"
  const match = texto.match(/^(\d{1,2})\-?([a-z]{3})$/i);
  if (match) {
    const dia = parseInt(match[1], 10);
    const mesTexto = match[2].toLowerCase();
    const mes = MESES_MAP[mesTexto] !== undefined ? MESES_MAP[mesTexto] : hoy.getMonth();
    return new Date(hoy.getFullYear(), mes, dia);
  }

  return hoy;
};

const determinarTipoEvento = (fechaObj, horaStr) => {
  const diaSemana = fechaObj.getDay(); // 0 = Domingo, 6 = Sábado

  if (diaSemana === 0 || diaSemana === 6) {
    return 'Casa';
  }

  let horaNum = 9;
  if (horaStr && horaStr.includes(':')) {
    const partesHora = horaStr.split(':');
    horaNum = parseInt(partesHora[0], 10) + (parseInt(partesHora[1], 10) / 60);
  }

  return (horaNum >= 8.0 && horaNum <= 17.0) ? 'Trabajo' : 'Casa';
};

// =========================================================================
// 🎛️ PARSER LOCAL PARA PREVISUALIZAR EL TIPO DE BULLET MIENTRAS ESCRIBES
// =========================================================================
const parsearSintaxis = (texto) => {
  const t = texto.trim();

  // 🟢 FINANZAS ($): Soporta "$ comida;150", "$150 comida", "$ 300 uber"
  if (t.startsWith('$')) {
    let limpio = t.substring(1).trim();
    let concepto = 'Gasto no especificado';
    let monto = '0.00';

    if (limpio.includes(';') || limpio.includes(',')) {
      const sep = limpio.includes(';') ? ';' : ',';
      const partes = limpio.split(sep);
      concepto = partes[0].trim();
      monto = partes[1]?.trim() || '0.00';
    } else {
      // Extrae el primer número que encuentre como monto
      const matchMonto = limpio.match(/(\d+(\.\d+)?)/);
      if (matchMonto) {
        monto = matchMonto[0];
        concepto = limpio.replace(matchMonto[0], '').trim() || 'Gasto';
      } else {
        concepto = limpio;
      }
    }
    return { tipo: 'FINANZAS', icono: '💸', color: 'text-emerald-400', concepto, monto };
  }

  // 🟢 NOTAS (-)
  if (t.startsWith('-')) return { tipo: 'NOTA', icono: '📝', color: 'text-zinc-400' };

  // 🟢 TAREAS (.)
  if (t.startsWith('.')) {
    let limpio = t.substring(1).trim();
    let horaExtraida = "";
    if (limpio.includes(';')) {
      const partes = limpio.split(';');
      limpio = partes[0].trim();
      horaExtraida = partes[1].trim();
    }
    return { tipo: 'TAREA', icono: '⚡', color: 'text-sky-400', textoLimpio: limpio, hora: horaExtraida };
  }

  // 🟢 EVENTOS / FUTURELOG (#) - PARSER: # comite;fecha;hora;lugar
  if (t.startsWith('#')) {
    const contenidoCompleto = t.substring(1).trim();
    const partes = contenidoCompleto.split(';');

    const comite = partes[0] ? partes[0].trim() : 'Evento sin título';
    const fechaTexto = partes[1] ? partes[1].trim() : '';
    const horaTexto = partes[2] ? partes[2].trim() : '09:00';
    const lugarTexto = partes[3] ? partes[3].trim() : 'Pendiente';

    const fechaObj = parsearFechaTexto(fechaTexto);
    const diaNum = String(fechaObj.getDate()).padStart(2, '0');
    const mesNum = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const añoNum = fechaObj.getFullYear();
    const fechaFormateadaDDMMYYYY = `${diaNum}/${mesNum}/${añoNum}`;

    const tipoCalculado = determinarTipoEvento(fechaObj, horaTexto);

    return {
      tipo: 'EVENTO',
      icono: '📅',
      color: tipoCalculado === 'Casa' ? 'text-emerald-400' : 'text-fuchsia-400',
      comite,
      fechaFormateada: fechaFormateadaDDMMYYYY,
      hora: horaTexto,
      lugar: lugarTexto,
      tipoEvento: tipoCalculado
    };
  }

  // 🟢 IDEAS (!)
  if (t.startsWith('!')) return { tipo: 'IDEA', icono: '💡', color: 'text-yellow-300 font-bold' };

  return { tipo: 'REGISTRO PLANO', icono: '›', color: 'text-amber-200/90' };
};

export default function RegistroRapido() {
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const deteccion = parsearSintaxis(texto);

  const ejecutarGuardado = async (e) => {
    e.preventDefault();
    if (!texto.trim()) return;

    setGuardando(true);
    setMensaje(null);

    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

    try {
      // 1. TAREAS (.) -> KANBAN
      if (texto.trim().startsWith('.')) {
        const cadenaSinPuntoConHora = deteccion.hora 
          ? `${deteccion.textoLimpio}; ${deteccion.hora}` 
          : deteccion.textoLimpio;

        const payloadTarea = {
          tarea: cadenaSinPuntoConHora,
          status: "Por Hacer",
          fecha: fechaFormateada,
          tipo: "Trabajo",
          prioridad: 99
        };

        const { error } = await supabase.from('kanban').insert([payloadTarea]);
        if (error) throw error;
      } 
      // 2. FINANZAS ($) -> TABLA TRANSACCIONES
      else if (texto.trim().startsWith('$')) {
        const payloadFinanzas = {
          fecha: fechaFormateada,
          importe: parseFloat(deteccion.monto) || 0,
          descripcion: deteccion.concepto.toUpperCase(),
          tarjeta: "Efectivo", // 🟢 CORREGIDO: En tu base de datos la columna es 'tarjeta' (no 'metodo_pago')
          rubro: "Extras"
        };

        const { error } = await supabase.from('transacciones').insert([payloadFinanzas]);
        if (error) throw error;
      } 
      // 3. EVENTOS (#) -> TABLA REUNIONES (FUTURE LOG)
      else if (texto.trim().startsWith('#')) {
        const payloadReunion = {
          comite: deteccion.comite.toUpperCase(),
          tipo_recurrencia: 'unica',
          fecha: deteccion.fechaFormateada,
          hora: deteccion.hora,
          lugar: deteccion.lugar,
          tipo: deteccion.tipoEvento
        };

        const { error } = await supabase.from('reuniones').insert([payloadReunion]);
        if (error) throw error;
      } 
      // 4. NOTAS (-), IDEAS (!) O TEXTO PLANO -> TABLA KANBAN (STATUS: Bullet)
      else {
        const payloadGenerico = {
          tarea: texto.trim(),
          status: "Bullet",
          fecha: fechaFormateada,
          tipo: "BulletJournal",
          prioridad: 1
        };

        const { error } = await supabase.from('kanban').insert([payloadGenerico]);
        if (error) throw error;
      }
      
      setMensaje({ 
        tipo: 'success', 
        texto: `LOG [${deteccion.tipo}] REGISTRADO CORRECTAMENTE` 
      });
      setTexto(''); 
    } catch (err) {
      console.error("Error al registrar en Supabase:", err);
      setMensaje({ tipo: 'error', texto: `ERROR: ${err.message || 'No se pudo registrar'}` });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-mono flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* BARRA DE ESTADO SUPERIOR */}
        <div className="bg-zinc-900/60 border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-sky-400" />
            <span className="font-black text-[10px] tracking-widest text-zinc-400 uppercase">RAPID_LOG://TERMINAL</span>
          </div>
          <div className="flex items-center gap-1.5 text-[8px] text-emerald-500 font-bold tracking-widest">
            <Database className="w-3 h-3" />
            ONLINE
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* LEYENDA DE SINTAXIS */}
          <div className="grid grid-cols-5 gap-1 text-[8px] font-bold text-center bg-zinc-900/30 p-2 rounded-xl border border-zinc-900/80">
            <div className="text-emerald-400 bg-emerald-950/20 py-1 rounded"><b className="text-emerald-300">$</b> Gasto</div>
            <div className="text-zinc-400 bg-zinc-900/40 py-1 rounded"><b className="text-zinc-200">-</b> Nota</div>
            <div className="text-sky-400 bg-sky-950/20 py-1 rounded"><b className="text-sky-300">.</b> Tarea</div>
            <div className="text-fuchsia-400 bg-fuchsia-950/20 py-1 rounded"><b className="text-fuchsia-300">#</b> Evento</div>
            <div className="text-yellow-300 bg-yellow-950/20 py-1 rounded"><b className="text-yellow-200">!</b> Idea</div>
          </div>

          <form onSubmit={ejecutarGuardado} className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-[8px] font-black uppercase text-zinc-500 mb-1.5 px-1">
                <span>COMANDO / INPUT</span>
                {texto && (
                  <span className={`flex items-center gap-1 font-bold ${deteccion.color}`}>
                    <span>{deteccion.icono}</span> {deteccion.tipo}
                  </span>
                )}
              </div>
              
              <div className="bg-zinc-900/40 border border-zinc-800 focus-within:border-sky-500/50 rounded-xl p-3 flex items-start gap-2.5 transition-all">
                <span className="text-sky-400 font-bold select-none text-xs">bunker:~#</span>
                <textarea
                  rows={2}
                  autoFocus
                  required
                  value={texto}
                  onChange={(e) => {
                    setTexto(e.target.value);
                    if (mensaje) setMensaje(null);
                  }}
                  placeholder="Escribe... ($ gasto;monto / . tarea;10:00 / # evento;28jul;10:00 / ! idea)"
                  className="w-full bg-transparent resize-none outline-none text-xs font-mono text-zinc-100 placeholder-zinc-700 leading-relaxed"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={guardando || !texto.trim()}
              className="w-full bg-sky-500 hover:bg-sky-400 disabled:opacity-30 disabled:hover:bg-sky-500 text-zinc-950 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5 stroke-[3]" />
              {guardando ? 'EXECUTING...' : 'EJECUTAR LOG'}
            </button>
          </form>

          {mensaje && (
            <div className={`p-3 rounded-xl flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-wider border ${
              mensaje.tipo === 'success' 
                ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' 
                : 'bg-rose-950/20 border-rose-900/50 text-rose-400'
            }`}>
              {mensaje.tipo === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {mensaje.texto}
            </div>
          )}

          <div className="text-center pt-2 border-t border-zinc-900">
            <a href="/" className="text-[9px] text-zinc-600 hover:text-sky-400 uppercase tracking-widest transition-colors font-bold inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3 h-3" /> Volver al Panel Principal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}