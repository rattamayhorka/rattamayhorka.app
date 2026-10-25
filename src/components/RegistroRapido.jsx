import { useState } from 'react';
import { supabase } from '../supabase';
import { CheckCircle2, AlertCircle, ArrowLeft, Terminal, Send, Database, Building2, Home, Triangle, Users, Hourglass, Bike, Zap, Music, Scale } from 'lucide-react';

const MESES_MAP = {
  ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3, may: 4, jun: 5,
  jul: 6, ago: 7, aug: 7, sep: 8, oct: 9, nov: 10, dic: 11, dec: 11
};

const parsearFechaTexto = (strFecha) => {
  const hoy = new Date();
  if (!strFecha || !strFecha.trim()) return hoy;

  const texto = strFecha.trim().toLowerCase();
  
  if (texto.includes('/') || texto.includes('-')) {
    const partes = texto.split(/[\/\-]/);
    const dia = parseInt(partes[0], 10) || hoy.getDate();
    const mes = (parseInt(partes[1], 10) - 1) ?? hoy.getMonth();
    const año = partes[2] ? parseInt(partes[2], 10) : hoy.getFullYear();
    return new Date(año, mes, dia);
  }

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
  const diaSemana = fechaObj.getDay();

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
  const tLower = t.toLowerCase();

  // 🟢 0. DETECCIÓN DE PESO (Comandos: '#w', '#peso', 'w', 'peso', '{peso}')
  const esPrefijoPeso = 
    tLower.startsWith('#w ') || 
    tLower.startsWith('#peso ') || 
    tLower.startsWith('w ') || 
    tLower.startsWith('peso ') || 
    tLower.startsWith('{peso}') || 
    tLower.startsWith('{weight}');

  if (esPrefijoPeso) {
    let contenidoLimpio = t;
    if (tLower.startsWith('#w ')) contenidoLimpio = t.substring(3).trim();
    else if (tLower.startsWith('#peso ')) contenidoLimpio = t.substring(6).trim();
    else if (tLower.startsWith('w ')) contenidoLimpio = t.substring(2).trim();
    else if (tLower.startsWith('peso ')) contenidoLimpio = t.substring(5).trim();
    else if (tLower.startsWith('{peso}')) contenidoLimpio = t.substring(6).trim();
    else if (tLower.startsWith('{weight}')) contenidoLimpio = t.substring(8).trim();

    const matchPeso = contenidoLimpio.match(/(\d+(\.\d+)?)/);
    const valorPeso = matchPeso ? parseFloat(matchPeso[0]) : null;

    return {
      tipo: 'PESO',
      icono: Scale,
      color: 'text-teal-400 font-bold',
      formateado: `[PESO] ⚖ ${valorPeso ? valorPeso + ' kg' : ''}`
    };
  }

  // 🟢 1. FINANZAS ($)
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

  // 🟢 2. NOTAS (-)
  if (t.startsWith('-')) return { tipo: 'NOTA', icono: '📝', color: 'text-zinc-400' };

  // 🟢 3. TAREAS (.)
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

  // 🟢 4. EVENTOS (# con punto y coma o formato de fecha)
  if (t.startsWith('#') && (t.includes(';') || t.includes('-') || t.includes('/'))) {
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

  // 🟢 5. IDEAS (!)
  if (t.startsWith('!')) return { tipo: 'IDEA', icono: '💡', color: 'text-yellow-300 font-bold' };

  // =========================================================================
  // 🟢 DETECCIÓN DE TAGS: #tag y compatibilidad con {tag}
  // =========================================================================
  if (tLower.startsWith('#work') || tLower.startsWith('#trabajo') || tLower.startsWith('{work}') || tLower.startsWith('{trabajo}')) {
    return { tipo: 'WORK', icono: Building2, color: 'text-theme-trabajo font-bold' };
  }
  if (tLower.startsWith('#home') || tLower.startsWith('#casa') || tLower.startsWith('{home}') || tLower.startsWith('{casa}')) {
    return { tipo: 'HOME', icono: Home, color: 'text-theme-casa font-bold' };
  }
  if (tLower.startsWith('#wife') || tLower.startsWith('#vicky') || tLower.startsWith('{wife}') || tLower.startsWith('{vicky}')) {
    return { tipo: 'WIFE', icono: Triangle, color: 'text-pink-400 font-bold' };
  }
  if (tLower.startsWith('#fam') || tLower.startsWith('#familia') || tLower.startsWith('{fam}') || tLower.startsWith('{familia}')) {
    return { tipo: 'FAM', icono: Users, color: 'text-orange-400 font-bold' };
  }
  if (tLower.startsWith('#pakal') || tLower.startsWith('{pakal}')) {
    return { tipo: 'PAKAL', icono: 'P', color: 'text-cyan-400 font-black' };
  }
  if (tLower.startsWith('#me') || tLower.startsWith('{me}')) {
    return { tipo: 'ME', icono: Triangle, color: 'text-theme-accent font-bold' };
  }
  if (tLower.startsWith('#couple') || tLower.startsWith('#pareja') || tLower.startsWith('{couple}') || tLower.startsWith('{pareja}')) {
    return { tipo: 'COUPLE', icono: Hourglass, color: 'text-purple-400 font-bold' };
  }
  if (tLower.startsWith('#bike') || tLower.startsWith('#bici') || tLower.startsWith('{bike}') || tLower.startsWith('{bici}')) {
    return { tipo: 'BIKE', icono: Bike, color: 'text-lime-400 font-bold' };
  }
  if (tLower.startsWith('#fail') || tLower.startsWith('#falla') || tLower.startsWith('{fail}') || tLower.startsWith('{falla}')) {
    return { tipo: 'FAIL', icono: Zap, color: 'text-yellow-300 font-black' };
  }
  if (tLower.startsWith('#omega') || tLower.startsWith('#ohm') || tLower.startsWith('#proyecto') || tLower.startsWith('{omega}') || tLower.startsWith('{ohm}') || tLower.startsWith('{proyecto}')) {
    return { tipo: 'OMEGA', icono: 'Ω', color: 'text-indigo-400 font-bold' };
  }
  if (tLower.startsWith('#music') || tLower.startsWith('#musica') || tLower.startsWith('{music}') || tLower.startsWith('{musica}')) {
    return { tipo: 'MUSIC', icono: Music, color: 'text-fuchsia-400 font-semibold' };
  }
  if (tLower.startsWith('#bash') || tLower.startsWith('#pc') || tLower.startsWith('#code') || tLower.startsWith('{bash}') || tLower.startsWith('{pc}') || tLower.startsWith('{code}')) {
    return { tipo: 'BASH', icono: Terminal, color: 'text-emerald-400 font-bold' };
  }

  return { tipo: 'REGISTRO PLANO', icono: '›', color: 'text-amber-200/90' };
};

export default function RegistroRapido() {
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const deteccion = parsearSintaxis(texto);

  const insertarEjemplo = (ejemplo) => {
    setTexto(ejemplo);
  };

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
          metodo_pago: "Efectivo",
          rubro: "Extras"
        };

        const { error } = await supabase.from('transacciones').insert([payloadFinanzas]);
        if (error) throw error;
      } 
      // 3. EVENTOS (# con punto y coma) -> TABLA REUNIONES (FUTURE LOG)
      else if (texto.trim().startsWith('#') && (texto.includes(';') || texto.includes('-') || texto.includes('/'))) {
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
      // 4. NOTAS (-), IDEAS (!), PESO O HASHTAGS {#TAG} -> TABLA KANBAN (STATUS: Bullet)
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
          <div className="grid grid-cols-5 gap-1 text-[8px] font-bold text-center bg-zinc-900/30 p-2 rounded-2xl border border-zinc-900/80">
            <button type="button" onClick={() => insertarEjemplo('$ comida; 150')} className="text-emerald-400 bg-emerald-950/20 hover:bg-emerald-950/40 py-1 rounded cursor-pointer transition-all border-none">
              <b className="text-emerald-300">$</b> Gasto
            </button>
            <button type="button" onClick={() => insertarEjemplo('- Nota informativa')} className="text-zinc-400 bg-zinc-900/40 hover:bg-zinc-900/70 py-1 rounded cursor-pointer transition-all border-none">
              <b className="text-zinc-200">-</b> Nota
            </button>
            <button type="button" onClick={() => insertarEjemplo('. tarea pendiente; 10:00')} className="text-sky-400 bg-sky-950/20 hover:bg-sky-950/40 py-1 rounded cursor-pointer transition-all border-none">
              <b className="text-sky-300">.</b> Tarea
            </button>
            <button type="button" onClick={() => insertarEjemplo('# evento; 28-jul; 10:00; Lugar')} className="text-fuchsia-400 bg-fuchsia-950/20 hover:bg-fuchsia-950/40 py-1 rounded cursor-pointer transition-all border-none">
              <b className="text-fuchsia-300">#</b> Evento
            </button>
            <button type="button" onClick={() => insertarEjemplo('! idea a guardar')} className="text-yellow-300 bg-yellow-950/20 hover:bg-yellow-950/40 py-1 rounded cursor-pointer transition-all border-none">
              <b className="text-yellow-200">!</b> Idea
            </button>
          </div>

          <form onSubmit={ejecutarGuardado} className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-[8px] font-black uppercase text-zinc-500 mb-1.5 px-1">
                <span>COMANDO / INPUT</span>
                {texto && (
                  <span className={`flex items-center gap-1 font-bold ${deteccion.color}`}>
                    <span>{typeof deteccion.icono === 'string' ? deteccion.icono : '🏷️'}</span> {deteccion.tipo}
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
                  placeholder="Escribe... ($ gasto;monto / . tarea;10:00 / #work nota / #w 82.5)"
                  className="w-full bg-transparent resize-none outline-none text-xs font-mono text-zinc-100 placeholder-zinc-700 leading-relaxed"
                />
              </div>

              {/* GUÍA VISUAL PERMANENTE DE FORMATOS Y NUEVOS HASHTAGS {#TAG} */}
              <div className="mt-2 px-1 text-[8px] font-mono text-zinc-500 space-y-1">
                <div className="text-[7.5px] uppercase font-bold text-zinc-600 tracking-wider">Formatos y Hashtags:</div>
                <div className="flex flex-wrap gap-x-2 gap-y-1">
                  <span className={texto.startsWith('$') ? 'text-emerald-400 font-bold' : ''}><b>$</b> gasto</span>
                  <span className={texto.startsWith('.') ? 'text-sky-400 font-bold' : ''}><b>.</b> tarea</span>
                  <span className={texto.startsWith('#') && texto.includes(';') ? 'text-fuchsia-400 font-bold' : ''}><b>#</b> evento</span>
                  <span className={texto.toLowerCase().startsWith('#w ') || texto.toLowerCase().startsWith('w ') ? 'text-teal-400 font-bold' : ''}><b>#w</b> 82.5</span>
                  <span className={texto.toLowerCase().startsWith('#work') ? 'text-indigo-400 font-bold' : ''}><b>{'{#work}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#home') ? 'text-emerald-400 font-bold' : ''}><b>{'{#home}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#wife') ? 'text-pink-400 font-bold' : ''}><b>{'{#wife}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#fam') ? 'text-orange-400 font-bold' : ''}><b>{'{#fam}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#pakal') ? 'text-cyan-400 font-bold' : ''}><b>{'{#pakal}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#me') ? 'text-sky-400 font-bold' : ''}><b>{'{#me}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#couple') ? 'text-purple-400 font-bold' : ''}><b>{'{#couple}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#bike') ? 'text-lime-400 font-bold' : ''}><b>{'{#bike}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#fail') ? 'text-yellow-300 font-bold' : ''}><b>{'{#fail}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#omega') ? 'text-indigo-400 font-bold' : ''}><b>{'{#omega}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#music') ? 'text-fuchsia-400 font-bold' : ''}><b>{'{#music}'}</b></span>
                  <span className={texto.toLowerCase().startsWith('#bash') ? 'text-emerald-400 font-bold' : ''}><b>{'{#bash}'}</b></span>
                </div>
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