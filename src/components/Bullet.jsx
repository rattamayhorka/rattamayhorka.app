import { useEffect, useState, useRef } from 'react';
import { database } from '../api'; // Usa tu API existente
import { Send, Terminal, Database, Loader2, Sparkles, Trash2, Edit2, X, Columns3 } from 'lucide-react';

// =========================================================================
// 🧠 ayudador: PARSER DE FECHA Y DÍA/HORA PARA CLASIFICACIÓN (CASA / TRABAJO)
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

  // 1. Sábado (6) o Domingo (0) -> Casa automáticamente
  if (diaSemana === 0 || diaSemana === 6) {
    return 'Casa';
  }

  // 2. Lunes a Viernes -> Evaluar Horario (08:00 a 17:00 = Trabajo)
  let horaNum = 9; // Valor por defecto
  if (horaStr && horaStr.includes(':')) {
    const partesHora = horaStr.split(':');
    horaNum = parseInt(partesHora[0], 10) + (parseInt(partesHora[1], 10) / 60);
  }

  if (horaNum >= 8.0 && horaNum <= 17.0) {
    return 'Trabajo';
  } else {
    return 'Casa';
  }
};

// =========================================================================
// 🎛️ PARSER DE SINTAXIS BULLET JOURNAL (Rapid Logging)
// =========================================================================
const parsearLineaTerminal = (texto) => {
  const t = texto.trim();

  if (t.startsWith('$')) {
    const sinSimbolo = t.substring(1).trim();

    // 🟢 SOPORTE PARA SEPARADOR CON ';' Y ','
    const partes = sinSimbolo.includes(';') ? sinSimbolo.split(';') : sinSimbolo.split(',');
    const concepto = partes[0] || 'Gasto sin concepto';
    const monto = partes[1] ? `$${partes[1].trim()}` : '$0.00';
    return {
      tipo: 'finanzas',
      icono: '💸',
      colorClase: 'text-theme-casa font-mono font-bold',
      formateado: `[FINANZAS] > ${concepto} : ${monto}`,
      conceptoLimpio: concepto,
      montoLimpio: partes[1] ? partes[1].trim() : '0.00'
    };
  } else if (t.startsWith('-')) {
    const contenido = t.substring(1).trim();
    return {
      tipo: 'nota',
      icono: '📝',
      colorClase: 'text-theme-text/70 italic',
      formateado: `[NOTA] >> ${contenido}`
    };
  } else if (t.startsWith('.')) {

    // 🟢 SOPORTE EXTRAER TIEMPO EN TAREAS (.) CON ';'
    const contenidoCompleto = t.substring(1).trim();
    let limpio = contenidoCompleto;
    let horaExtraida = "";

    if (contenidoCompleto.includes(';')) {
      const partes = contenidoCompleto.split(';');
      limpio = partes[0].trim();
      horaExtraida = partes[1].trim();
    }

    return {
      tipo: 'tarea',
      icono: '⚡',
      colorClase: 'text-theme-accent font-semibold',
      formateado: `[PENDIENTE] . ${limpio} ${horaExtraida ? `[Hora: ${horaExtraida}]` : ''}`,
      textoLimpioSinPunto: limpio,
      hora: horaExtraida
    };
  } else if (t.startsWith('#')) {
    
    // 🟢 NUEVO PARSER ESTRUCTURADO DE EVENTOS FUTURELOG (# evento;28jul;10:00;lugar)
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
      tipo: 'evento',
      icono: '📅',
      colorClase: tipoCalculado === 'Casa' ? 'text-theme-casa font-bold' : 'text-theme-trabajo font-bold',
      formateado: `[FUTURE_LOG] # ${comite.toUpperCase()} | ${fechaFormateadaDDMMYYYY} @ ${horaTexto} (${tipoCalculado})`,
      comite,
      fechaFormateada: fechaFormateadaDDMMYYYY,
      hora: horaTexto,
      lugar: lugarTexto,
      tipoEvento: tipoCalculado
    };
  } 
  // 🟢 DETECCIÓN DE IDEAS CON '!'
  else if (t.startsWith('!')) {
    const contenido = t.substring(1).trim();
    return {
      tipo: 'idea',
      icono: '💡',
      colorClase: 'text-theme-accent font-bold italic',
      formateado: `[IDEA] ! ${contenido}`
    };
  }

  return {
    tipo: 'plano',
    icono: '›',
    colorClase: 'text-theme-text/80',
    formateado: t
  };
};

export default function Bullet({ refreshTrigger }) {
  const [logs, setLogs] = useState([]);
  const [nuevoComando, setNuevoComando] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // 🟢 AGREGADO: ESTADO PARA FILTRAR EL HISTÓRICO DE LOGS
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  
  // ✏️ Estados para control de Edición In-Place
  const [modoEdicion, setModoEdicion] = useState(false);
  const [notaAEditar, setNotaAEditar] = useState(null);

  // 🛠️ REPOSITORIO DE REF DE CONTENEDOR PARA SCROLL LOCAL EN TABLET
  const scrollContainerRef = useRef(null);
  const bottomTerminalRef = useRef(null);
  const textareaRef = useRef(null);

  const cargarHistoricoTerminal = async () => {
    setCargando(true);
    try {
      const data = await database.obtenerSeccion('pendientes');
      
      const logsFiltrados = data.filter(item => {
        const statusLower = (item.Status || '').trim().toLowerCase();
        return statusLower === 'bullet';
      });

      const parseados = logsFiltrados.map((item, idx) => {
        const textoOriginal = item.Tarea || "";
        const fecha = item.Fecha || "---";
        const hora = item.Hora || "";
        const tipoOriginal = item.Tipo || "Trabajo";
        
        let stringDeAnalisis = textoOriginal;
        if (hora) {
          stringDeAnalisis = `${textoOriginal}; ${hora}`;
        }

        const analisis = parsearLineaTerminal(stringDeAnalisis);

        return {
          id: idx,
          textoOriginal,
          fecha,
          tipoOriginal,
          ...analisis
        };
      });

      setLogs(parseados);
    } catch (e) {
      console.error("Error al sincronizar con la terminal:", e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarHistoricoTerminal();
  }, [refreshTrigger]);

  // ANTERIOR SCROLL HACIA ABAJO COMENTADO (Causaba salto vertical completo de pantalla en tablets)
  /*
  useEffect(() => {
    bottomTerminalRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);
  */

  // 🛠️ NUEVO SCROLL CONTENIDO EXCLUSIVAMENTE AL CONTENEDOR INTERNO
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // 📐 Ajustar altura de la caja de texto dinámicamente al escribir
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [nuevoComando]);

  const enviarComandoTerminal = async () => {
    if (!nuevoComando.trim() || enviando) return;

    setEnviando(true);
    const comandoCrudo = nuevoComando.trim();
    const analisis = parsearLineaTerminal(comandoCrudo);

    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

    try {
      if (modoEdicion && notaAEditar) {
        await database.guardarDatos('modificarTarea', {
          datos: {
            tareaOriginal: notaAEditar.textoOriginal,
            nuevaTarea: comandoCrudo,
            nuevoStatus: 'Bullet',
            nuevaFecha: fechaFormateada,
            nuevoTipo: 'BulletJournal'
          }
        });
        
        setLogs(prev => prev.map(item => 
          item.textoOriginal === notaAEditar.textoOriginal 
            ? { ...item, textoOriginal: comandoCrudo, ...analisis } 
            : item
        ));
        cancelarEdicion();
      } else {
        // 🟢 FINANZAS SIN RUBRO ASIGNADO POR DEFECTO
        if (analisis.tipo === 'finanzas') {
          const payloadFinanzas = {
            fecha: fechaFormateada,
            importe: parseFloat(analisis.montoLimpio) || 0,
            descripcion: analisis.conceptoLimpio.toUpperCase(),
            metodo_pago: "Efectivo",
            rubro: "" // Se deja vacío sin rubro por defecto para definir a mano después
          };
          await database.guardarDatos('guardarTransaccion', payloadFinanzas);
        } 
        // 🟢 SI ES TAREA (INICIA CON .) ENVÍA A KANBAN
        else if (analisis.tipo === 'tarea') {
          const cadenaSinPuntoConHora = analisis.hora 
            ? `${analisis.textoLimpioSinPunto}; ${analisis.hora}` 
            : analisis.textoLimpioSinPunto;

          await database.guardarDatos('guardarTarea', {
            datos: {
              tarea: cadenaSinPuntoConHora, // Sin punto inicial
              status: 'Por Hacer', // Va a Kanban directamente
              fecha: fechaFormateada,
              tipo: 'Trabajo' // Se fuerza a Trabajo para Kanban
            }
          });
        } 
        // 🟢 CORRECCIÓN EVENTO: ESCRIBE DIRECTO A LA PESTAÑA REUNIONES (FUTURELOG)
        else if (analisis.tipo === 'evento') {
          const payloadReunion = {
            comite: analisis.comite.toUpperCase(),
            fecha: analisis.fechaFormateada,
            hora: analisis.hora,
            lugar: analisis.lugar,
            tipo: analisis.tipoEvento
          };

          await database.guardarDatos('guardarReunion', { datos: payloadReunion });
        } 
        else {
          // 🔴 COMPORTAMIENTO NORMAL PARA NOTAS E IDEAS (!) (SE GUARDAN COMO BULLET EN PENDIENTES)
          const nuevoLogOptimo = {
            id: Date.now(),
            textoOriginal: comandoCrudo,
            fecha: fechaFormateada,
            ...analisis
          };
          setLogs(prev => [...prev, nuevoLogOptimo]);

          await database.guardarDatos('guardarTarea', {
            datos: {
              tarea: comandoCrudo,
              status: 'Bullet', 
              fecha: fechaFormateada,
              tipo: 'BulletJournal'
            }
          });
        }
      }
      setNuevoComando('');
    } catch (err) {
      console.error("Error al enviar comando:", err);
    } finally {
      setEnviando(false);
    }
  };

  // 📋 ENVIAR TAREA AL KANBAN
  const enviarAKanban = async (item) => {
    // 1. Remoción visual optimista inmediata de la pantalla Bullet
    setLogs(prev => prev.filter(l => l.textoOriginal !== item.textoOriginal));

    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

    const nuevaTareaLimpia = item.hora && !item.textoLimpioSinPunto.includes(';')
      ? `${item.textoLimpioSinPunto}; ${item.hora}`
      : item.textoLimpioSinPunto;

    try {
      await database.guardarDatos('modificarTarea', {
        datos: {
          tareaOriginal: item.textoOriginal,
          nuevaTarea: nuevaTareaLimpia,
          nuevoStatus: 'Por Hacer',
          nuevaFecha: item.fecha !== '---' ? item.fecha : fechaFormateada,
          nuevoTipo: 'Trabajo'
        }
      });
    } catch (err) {
      console.error("Error al transferir al Kanban:", err);
    }
  };

  const eliminarNota = async (item) => {
    if (!window.confirm("¿Seguro que deseas eliminar este log?")) return;
    
    setLogs(prev => prev.filter(l => l.textoOriginal !== item.textoOriginal));

    try {
      await database.guardarDatos('statusKanban', {
        tareaTexto: item.textoOriginal,
        nuevoStatus: 'Terminado'
      });
    } catch (err) {
      console.error("Error al archivar/eliminar:", err);
    }
  };

  const iniciarEdicion = (item) => {
    setModoEdicion(true);
    setNotaAEditar(item);
    setNuevoComando(item.textoOriginal);
    textareaRef.current?.focus();
  };

  const cancelarEdicion = () => {
    setModoEdicion(false);
    setNotaAEditar(null);
    setNuevoComando('');
  };

  const manejarTeclado = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      enviarComandoTerminal();
    }
  };

  // 🟢 AGREGADO: FILTRADO ACTIVO DE LOGS SEGÚN LA SELECCIÓN
  const logsVisibles = logs.filter(log => {
    if (filtroTipo === 'TODOS') return true;
    return log.tipo === filtroTipo;
  });

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] md:h-[calc(100dvh-2rem)] xl:h-[calc(100dvh-4.5rem)] w-full bg-theme-bg font-mono text-xs text-theme-text rounded-2xl border border-theme-border overflow-hidden shadow-xl">

      {/* 📊 BARRA DE ESTADO SUPERIOR CON FILTROS INTERACTIVOS */}
      <div className="flex-shrink-0 bg-theme-bg border-b border-theme-border/40 select-none px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-theme-accent" />
          <span className="font-black tracking-widest text-[9px] text-theme-text/50">CORE://RAPID_LOG</span>
        </div>

        {/* 🟢 NUEVA SECCIÓN DE BOTONES DE FILTRO (INCLUYE OPCIÓN [TODOS] Y [BULLET]) */}
        <div className="flex items-center gap-2 text-[9px] flex-wrap">
          <button
            onClick={() => setFiltroTipo('TODOS')}
            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold ${
              filtroTipo === 'TODOS'
                ? 'bg-theme-accent text-theme-bg border border-theme-border'
                : 'text-theme-text/50 hover:text-theme-text'
            }`}
          >
            [TODOS]
          </button>

          <button
            onClick={() => setFiltroTipo('finanzas')}
            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
              filtroTipo === 'finanzas'
                ? 'bg-theme-casa text-theme-bg border border-theme-casa'
                : 'text-theme-text/50 hover:text-theme-casa'
            }`}
          >
            <b className="text-theme-casa">$</b> Finanzas
          </button>

          <button
            onClick={() => setFiltroTipo('nota')}
            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
              filtroTipo === 'nota'
                ? 'bg-theme-border text-theme-bg border border-theme-border'
                : 'text-theme-text/50 hover:text-theme-text'
            }`}
          >
            <b className="text-theme-text/70">-</b> Nota
          </button>

          <button
            onClick={() => setFiltroTipo('evento')}
            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
              filtroTipo === 'evento'
                ? 'bg-theme-trabajo text-theme-bg border border-theme-trabajo'
                : 'text-theme-text/50 hover:text-theme-trabajo'
            }`}
          >
            <b className="text-theme-trabajo">#</b> Evento
          </button>

          <button
            onClick={() => setFiltroTipo('idea')}
            className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
              filtroTipo === 'idea'
                ? 'bg-theme-accent text-theme-bg border border-theme-accent'
                : 'text-theme-text/50 hover:text-theme-accent'
            }`}
          >
            <b className="text-theme-accent">!</b> Idea
          </button>        
        </div>
      </div>

      {/* 📺 SCREEN DE LOGS CON REF ASIGNADO PARA SCROLL INTERNO */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-theme-bg scrollbar-none px-4 py-4 space-y-2 min-h-0">
        {cargando ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-theme-text/40">
            <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />
            <span className="text-[9px] uppercase tracking-widest font-bold">Cargando bitácora activa...</span>
          </div>
        ) : logsVisibles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-theme-text/40 gap-1 italic">
            <Sparkles className="w-3.5 h-3.5 text-theme-border/40" />
            <p>{filtroTipo === 'TODOS' ? 'La consola de Rapid Logging está vacía.' : `No hay registros del tipo [${filtroTipo.toUpperCase()}].`}</p>
          </div>
        ) : (
          logsVisibles.map((item, idx) => {
            const mostrarSeparador = idx === 0 || logsVisibles[idx - 1].fecha !== item.fecha;

            return (
              <div key={idx} className="space-y-2">
                {mostrarSeparador && (
                  <div className="flex items-center gap-2 pt-3 pb-1 select-none">
                    <span className="text-theme-accent font-bold tracking-widest text-[9px]">
                      DATE://{item.fecha}
                    </span>
                    <div className="flex-1 border-b border-dashed border-theme-border/30" />
                  </div>
                )}
                
                <div className="group flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 py-0.5 border-b border-theme-border/10 hover:bg-theme-border/10 px-3 rounded transition-all relative">
                  <div className="flex items-start gap-2.5 flex-1 pr-24">
                    <span className="text-theme-text/40 select-none text-[9px] mt-0.5">{item.icono}</span>
                    <div className={`${item.colorClase} break-all whitespace-pre-wrap leading-relaxed`}>
                      {item.formateado}
                    </div>
                  </div>

                  {/* Controles del Hover */}
                  <div className="flex items-center gap-3 text-[8px] text-theme-text/50 font-mono select-none flex-shrink-0 self-end sm:self-auto">
                    {/*<div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-all mr-1">*/}
                    {/* BLOQUE NUEVO: TOTALMENTE VISIBLE EN TABLET / CELULAR Y CON HOVER EN ESCRITORIO */}
                  <div className="opacity-100 xl:opacity-0 xl:group-hover:opacity-100 flex items-center gap-1.5 transition-all mr-1">
                    {item.tipo === 'tarea' && (
                      <button 
                        onClick={() => enviarAKanban(item)}
                        className="p-1 text-theme-accent bg-theme-border/10 md:bg-transparent md:text-theme-text/70 hover:text-theme-accent hover:bg-theme-border/20 rounded cursor-pointer flex items-center gap-1"
                        title="Mandar al Kanban como Por Hacer"
                      >
                        <Columns3 className="w-3.5 h-3.5" />
                        <span className="text-[8px] uppercase font-bold">A Kanban</span>
                      </button>
                    )}

                    <button 
                      onClick={() => iniciarEdicion(item)}
                      className="p-1 text-theme-accent bg-theme-border/10 md:bg-transparent md:text-theme-text/70 hover:text-theme-accent hover:bg-theme-border/20 rounded cursor-pointer"
                      title="Editar nota en prompt"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => eliminarNota(item)}
                      className="p-1 text-theme-casa bg-theme-border/10 md:bg-transparent md:text-theme-text/70 hover:text-theme-casa hover:bg-theme-border/20 rounded cursor-pointer"
                      title="Eliminar de Sheets"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                    <span className="uppercase">{item.tipo === 'evento' && item.hora ? `[${item.hora}]` : `[*]` }</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomTerminalRef} />
      </div>

      {/* 📥 CHAT INPUT BOTTOM */}
      <div className="flex-shrink-0 bg-theme-bg border-t border-theme-border/40 p-3">
        {modoEdicion && (
          <div className="flex items-center justify-between bg-theme-accent/10 border border-theme-accent/30 rounded-lg px-3 py-1 mb-2 text-[10px] text-theme-accent font-mono">
            <span>✏️ Editando registro anterior. Los cambios reemplazarán la línea seleccionada.</span>
            <button onClick={cancelarEdicion} className="text-theme-accent/70 hover:text-theme-accent cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-3">
          <div className={`flex-1 border rounded-lg p-2 transition-all flex items-start ${modoEdicion ? 'bg-theme-accent/5 border-theme-accent/50 focus-within:border-theme-accent' : 'bg-theme-bg border-theme-border/60 focus-within:border-theme-border'}`}>
            <span className="font-black select-none mr-2 mt-0.5 text-theme-accent">
              {modoEdicion ? 'edit:~#' : 'bunker:~#'}
            </span>
            
            <textarea
              ref={textareaRef}
              rows={1}
              value={nuevoComando}
              onChange={(e) => setNuevoComando(e.target.value)}
              onKeyDown={manejarTeclado}
              placeholder={modoEdicion ? "Modifica el comando y presiona Ctrl + Enter..." : "Escribe... ($ gasto;monto / . tarea;10:00 / # evento;28jul;10:00 / ! idea) [Ctrl+Enter]"}
              className="flex-1 bg-transparent resize-none outline-none border-none text-theme-text placeholder-theme-text/30 font-mono text-xs leading-relaxed min-h-[18px] max-h-[180px] mt-0.5"
              disabled={enviando}
              style={{ overflowY: 'auto' }}
            />
          </div>

          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {modoEdicion && (
              <button
                onClick={cancelarEdicion}
                className="bg-theme-bg hover:opacity-80 text-theme-text/50 hover:text-theme-text border border-theme-border p-2.5 rounded-lg h-9 w-9 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            )}
            
            <button
              onClick={enviarComandoTerminal}
              disabled={!nuevoComando.trim() || enviando}
              className="bg-theme-bg hover:opacity-90 text-theme-accent border border-theme-border hover:border-theme-accent p-2.5 rounded-lg h-9 w-9 flex items-center justify-center cursor-pointer disabled:opacity-30"
              title={modoEdicion ? "Guardar cambios" : "Enviar (Ctrl + Enter)"}
            >
              {enviando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 stroke-[2]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}