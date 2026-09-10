import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { 
  Send, Loader2, Trash2, Edit2, X, 
  ArrowUpRight, Clock, Calendar, 
  DollarSign, CheckSquare, MessageSquare, Lightbulb,
  CornerDownLeft, Sparkles, Filter, Terminal, Database, HelpCircle, Columns3
} from 'lucide-react';

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
  if (diaSemana === 0 || diaSemana === 6) return 'Casa';

  let horaNum = 9;
  if (horaStr && horaStr.includes(':')) {
    const partesHora = horaStr.split(':');
    horaNum = parseInt(partesHora[0], 10) + (parseInt(partesHora[1], 10) / 60);
  }

  return (horaNum >= 8.0 && horaNum <= 17.0) ? 'Trabajo' : 'Casa';
};

const parsearLineaTerminal = (texto) => {
  const t = texto.trim();

  if (t.startsWith('$')) {
    const sinSimbolo = t.substring(1).trim();
    let concepto = 'Gasto no especificado';
    let monto = '0.00';

    if (sinSimbolo.includes(';') || sinSimbolo.includes(',')) {
      const sep = sinSimbolo.includes(';') ? ';' : ',';
      const partes = sinSimbolo.split(sep);
      concepto = partes[0].trim() || 'Gasto';
      monto = partes[1]?.trim() || '0.00';
    } else {
      const matchMonto = sinSimbolo.match(/(\d+(\.\d+)?)/);
      if (matchMonto) {
        monto = matchMonto[0];
        concepto = sinSimbolo.replace(matchMonto[0], '').trim() || 'Gasto';
      } else {
        concepto = sinSimbolo;
      }
    }

    return {
      tipo: 'finanzas',
      etiqueta: 'Gasto Corriente',
      icono: DollarSign,
      color: 'text-theme-casa',
      bgTag: 'bg-theme-casa/10 border-theme-casa/20 text-theme-casa',
      cardStyle: 'border-l-4 border-l-theme-casa hover:border-theme-casa/60 bg-theme-casa/[0.03]',
      titulo: concepto,
      metadato: `$${parseFloat(monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      formateado: `[FINANZAS] > ${concepto} : $${monto}`,
      colorClase: 'text-theme-casa font-mono font-bold',
      conceptoLimpio: concepto,
      montoLimpio: monto
    };
  } else if (t.startsWith('.')) {
    const contenidoCompleto = t.substring(1).trim();
    let limpio = contenidoCompleto;
    let horaExtraida = '';

    if (contenidoCompleto.includes(';')) {
      const partes = contenidoCompleto.split(';');
      limpio = partes[0].trim();
      horaExtraida = partes[1].trim();
    }

    return {
      tipo: 'tarea',
      etiqueta: 'Pendiente',
      icono: CheckSquare,
      color: 'text-theme-accent',
      bgTag: 'bg-theme-accent/10 border-theme-accent/20 text-theme-accent',
      cardStyle: 'border-l-4 border-l-theme-accent hover:border-theme-accent/60 bg-theme-accent/[0.03]',
      titulo: limpio,
      metadato: horaExtraida ? `${horaExtraida} hrs` : null,
      formateado: `[PENDIENTE] . ${limpio} ${horaExtraida ? `[Hora: ${horaExtraida}]` : ''}`,
      colorClase: 'text-theme-accent font-semibold',
      textoLimpioSinPunto: limpio,
      hora: horaExtraida
    };
  } else if (t.startsWith('#')) {
    const contenidoCompleto = t.substring(1).trim();
    const partes = contenidoCompleto.split(';');

    const comite = partes[0] ? partes[0].trim() : 'Evento sin título';
    const fechaTexto = partes[1] ? partes[1].trim() : '';
    const horaTexto = partes[2] ? partes[2].trim() : '09:00';
    const lugarTexto = partes[3] ? partes[3].trim() : 'General';

    const fechaObj = parsearFechaTexto(fechaTexto);
    const diaNum = String(fechaObj.getDate()).padStart(2, '0');
    const mesNum = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const añoNum = fechaObj.getFullYear();
    const fechaFormateada = `${diaNum}/${mesNum}/${añoNum}`;
    const tipoCalculado = determinarTipoEvento(fechaObj, horaTexto);
    const esCasa = tipoCalculado === 'Casa';

    return {
      tipo: 'evento',
      etiqueta: `Evento (${tipoCalculado})`,
      icono: Calendar,
      color: esCasa ? 'text-theme-casa' : 'text-theme-trabajo',
      bgTag: esCasa 
        ? 'bg-theme-casa/10 border-theme-casa/20 text-theme-casa' 
        : 'bg-theme-trabajo/10 border-theme-trabajo/20 text-theme-trabajo',
      cardStyle: esCasa
        ? 'border-l-4 border-l-theme-casa hover:border-theme-casa/60 bg-theme-casa/[0.03]'
        : 'border-l-4 border-l-theme-trabajo hover:border-theme-trabajo/60 bg-theme-trabajo/[0.03]',
      titulo: comite,
      metadato: `${fechaFormateada} • ${horaTexto}`,
      formateado: `[FUTURE_LOG] # ${comite.toUpperCase()} | ${fechaFormateada} @ ${horaTexto} (${tipoCalculado})`,
      colorClase: esCasa ? 'text-theme-casa font-bold' : 'text-theme-trabajo font-bold',
      comite,
      fechaFormateada,
      hora: horaTexto,
      lugar: lugarTexto,
      tipoEvento: tipoCalculado
    };
  } else if (t.startsWith('!')) {
    return {
      tipo: 'idea',
      etiqueta: 'Idea / Insight',
      icono: Lightbulb,
      color: 'text-amber-400',
      bgTag: 'bg-amber-400/10 border-amber-400/20 text-amber-400',
      cardStyle: 'border-l-4 border-l-amber-400 hover:border-amber-400/60 bg-amber-400/[0.03]',
      titulo: t.substring(1).trim(),
      metadato: null,
      formateado: `[IDEA] ! ${t.substring(1).trim()}`,
      colorClase: 'text-theme-accent font-bold italic'
    };
  }

  return {
    tipo: 'nota',
    etiqueta: 'Nota / Bitácora',
    icono: MessageSquare,
    color: 'text-theme-text/70',
    bgTag: 'bg-theme-border/20 border-theme-border/40 text-theme-text/70',
    cardStyle: 'border-l-4 border-l-theme-border/70 hover:border-theme-border bg-theme-border/[0.04]',
    titulo: t.startsWith('-') ? t.substring(1).trim() : t,
    metadato: null,
    formateado: `[NOTA] >> ${t.startsWith('-') ? t.substring(1).trim() : t}`,
    colorClase: 'text-theme-text/70 italic'
  };
};

export default function Bullet({ refreshTrigger }) {
  const [logs, setLogs] = useState([]);
  const [nuevoComando, setNuevoComando] = useState('');
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('TODOS');
  const [modoEdicion, setModoEdicion] = useState(false);
  const [notaAEditar, setNotaAEditar] = useState(null);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const detectorActivo = parsearLineaTerminal(nuevoComando || ' ');

  const cargarLogs = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('kanban')
        .select('*')
        .ilike('status', 'Bullet')
        .order('id', { ascending: true });

      if (error) throw error;

      const formateados = (data || []).map((item, idx) => {
        const textoOriginal = item.tarea || item.Tarea || '';
        const fecha = item.fecha || item.Fecha || '---';
        const hora = item.hora || item.Hora || '';
        
        let stringDeAnalisis = textoOriginal;
        if (hora) {
          stringDeAnalisis = `${textoOriginal}; ${hora}`;
        }
        const analisis = parsearLineaTerminal(stringDeAnalisis);

        return {
          id: item.id || idx,
          rawId: item.id,
          textoOriginal,
          fecha,
          ...analisis
        };
      });

      setLogs(formateados);
    } catch (e) {
      console.error('Error al sincronizar bitácora:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLogs();
  }, [refreshTrigger]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [nuevoComando]);

  const ejecutarRegistro = async () => {
    if (!nuevoComando.trim() || enviando) return;
    setEnviando(true);

    const comandoCrudo = nuevoComando.trim();
    const analisis = parsearLineaTerminal(comandoCrudo);
    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

    try {
      if (modoEdicion && notaAEditar) {
        const { error } = await supabase
          .from('kanban')
          .update({
            tarea: comandoCrudo,
            status: 'Bullet',
            fecha: fechaFormateada,
            tipo: 'BulletJournal'
          })
          .eq('id', notaAEditar.rawId);

        if (error) throw error;

        setLogs(prev => prev.map(item => 
          item.rawId === notaAEditar.rawId 
            ? { ...item, textoOriginal: comandoCrudo, ...analisis }
            : item
        ));
        setModoEdicion(false);
        setNotaAEditar(null);
      } else {
        if (analisis.tipo === 'finanzas') {
          await supabase.from('transacciones').insert([{
            fecha: fechaFormateada,
            importe: parseFloat(analisis.montoLimpio) || 0,
            descripcion: analisis.conceptoLimpio.toUpperCase(),
            metodo_pago: 'Efectivo',
            rubro: 'Extras'
          }]);

          const { data: insertado, error } = await supabase.from('kanban').insert([{
            tarea: comandoCrudo,
            status: 'Bullet',
            fecha: fechaFormateada,
            tipo: 'BulletJournal',
            prioridad: 1
          }]).select().single();

          if (error) throw error;

          setLogs(prev => [...prev, {
            id: insertado ? insertado.id : Date.now(),
            rawId: insertado ? insertado.id : Date.now(),
            textoOriginal: comandoCrudo,
            fecha: fechaFormateada,
            ...analisis
          }]);
        } 
        // =========================================================================
        // 🟢 MODIFICACIÓN TAREA DIRECTA (.): Va directo a Kanban sin pasar por Bullet
        // =========================================================================
        else if (analisis.tipo === 'tarea') {
          const cadenaSinPuntoConHora = analisis.hora 
            ? `${analisis.textoLimpioSinPunto}; ${analisis.hora}` 
            : analisis.textoLimpioSinPunto;

          // 1. Guarda directo en Kanban como 'Por Hacer'
          const { error } = await supabase.from('kanban').insert([{
            tarea: cadenaSinPuntoConHora,
            status: 'Por Hacer',
            fecha: fechaFormateada,
            tipo: 'Trabajo',
            prioridad: 99
          }]);

          if (error) throw error;

          /* 🔴 ANTERIOR: También se guardaba como 'Bullet' y se agregaba a logs para mostrarse en esta pantalla
          const { data: insertado, error: errBullet } = await supabase.from('kanban').insert([{
            tarea: comandoCrudo,
            status: 'Bullet',
            fecha: fechaFormateada,
            tipo: 'BulletJournal',
            prioridad: 1
          }]).select().single();

          if (errBullet) throw errBullet;

          setLogs(prev => [...prev, {
            id: insertado ? insertado.id : Date.now(),
            rawId: insertado ? insertado.id : Date.now(),
            textoOriginal: comandoCrudo,
            fecha: fechaFormateada,
            ...analisis
          }]);
          */
        } 
        // =========================================================================
        else if (analisis.tipo === 'evento') {
          await supabase.from('reuniones').insert([{
            comite: analisis.comite.toUpperCase(),
            tipo_recurrencia: 'unica',
            fecha: analisis.fechaFormateada,
            hora: analisis.hora,
            lugar: analisis.lugar,
            tipo: analisis.tipoEvento
          }]);

          const { data: insertado, error } = await supabase.from('kanban').insert([{
            tarea: comandoCrudo,
            status: 'Bullet',
            fecha: fechaFormateada,
            tipo: 'BulletJournal',
            prioridad: 1
          }]).select().single();

          if (error) throw error;

          setLogs(prev => [...prev, {
            id: insertado ? insertado.id : Date.now(),
            rawId: insertado ? insertado.id : Date.now(),
            textoOriginal: comandoCrudo,
            fecha: fechaFormateada,
            ...analisis
          }]);
        } else {
          // Notas e ideas
          const { data: insertado, error } = await supabase.from('kanban').insert([{
            tarea: comandoCrudo,
            status: 'Bullet',
            fecha: fechaFormateada,
            tipo: 'BulletJournal',
            prioridad: 1
          }]).select().single();

          if (error) throw error;

          setLogs(prev => [...prev, {
            id: insertado ? insertado.id : Date.now(),
            rawId: insertado ? insertado.id : Date.now(),
            textoOriginal: comandoCrudo,
            fecha: fechaFormateada,
            ...analisis
          }]);
        }
      }

      setNuevoComando('');
    } catch (err) {
      console.error('Error al guardar el registro:', err);
    } finally {
      setEnviando(false);
    }
  };

  const enviarAKanban = async (item) => {
    setLogs(prev => prev.filter(l => l.rawId !== item.rawId));
    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;
    const tareaLimpia = item.hora && !item.textoLimpioSinPunto.includes(';')
      ? `${item.textoLimpioSinPunto}; ${item.hora}`
      : item.textoLimpioSinPunto;

    try {
      await supabase.from('kanban').update({
        tarea: tareaLimpia,
        status: 'Por Hacer',
        fecha: item.fecha !== '---' ? item.fecha : fechaFormateada,
        tipo: 'Trabajo'
      }).eq('id', item.rawId);
    } catch (err) {
      console.error('Error al mandar a Kanban:', err);
    }
  };

  const eliminarRegistro = async (item) => {
    if (!window.confirm("¿Seguro que deseas eliminar este log?")) return;
    setLogs(prev => prev.filter(l => l.rawId !== item.rawId));
    try {
      await supabase.from('kanban').delete().eq('id', item.rawId);
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const manejarTeclado = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      ejecutarRegistro();
    }
  };

  const logsFiltrados = logs.filter(log => {
    if (filtroTipo === 'TODOS') return true;
    return log.tipo === filtroTipo;
  });

  return (
    <div className="flex flex-col h-[calc(100dvh-4.5rem)] w-full bg-theme-bg text-theme-text rounded-2xl border border-theme-border shadow-2xl overflow-hidden font-mono text-left">
      
      {/* 🟢 HEADER DE CONTROL SUPERIOR */}
      <header className="px-5 py-3 border-b border-theme-border bg-theme-bg/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-theme-accent animate-pulse" />
          <h2 className="text-xs font-black uppercase tracking-wider text-theme-text">
            Feed de Registro Central
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded-md bg-theme-border/20 text-theme-text/60 font-bold">
            {logsFiltrados.length} entradas
          </span>
        </div>

        {/* Barra de Filtros Segmentados */}
        <div className="flex items-center gap-1 bg-theme-bg border border-theme-border p-1 rounded-xl text-xs">
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'tarea', label: 'Tareas' },
            { id: 'finanzas', label: 'Finanzas' },
            { id: 'evento', label: 'Eventos' },
            { id: 'idea', label: 'Ideas' },
            { id: 'nota', label: 'Notas' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFiltroTipo(tab.id)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filtroTipo === tab.id
                  ? 'bg-theme-accent text-theme-bg shadow-sm'
                  : 'text-theme-text/50 hover:text-theme-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* 🟢 FEED DE CONTENIDO PRINCIPAL */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-2.5 bg-theme-bg">
        {cargando ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-theme-text/40">
            <Loader2 className="w-5 h-5 animate-spin text-theme-accent" />
            <span className="text-xs font-bold uppercase tracking-wider">Cargando bitácora...</span>
          </div>
        ) : logsFiltrados.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-theme-text/30 gap-2">
            <Sparkles className="w-7 h-7 opacity-40 stroke-[1.5]" />
            <p className="text-xs uppercase font-bold">No hay registros guardados en esta categoría.</p>
          </div>
        ) : (
          logsFiltrados.map((item, idx) => {
            const IconoEntidad = item.icono;
            const separadorFecha = idx === 0 || logsFiltrados[idx - 1].fecha !== item.fecha;

            return (
              <div key={item.rawId || idx} className="space-y-2">
                {separadorFecha && (
                  <div className="flex items-center gap-3 pt-4 pb-1">
                    <span className="text-[10px] font-black text-theme-accent tracking-widest uppercase">
                      FECHA: {item.fecha}
                    </span>
                    <div className="flex-1 border-t border-theme-border/40" />
                  </div>
                )}

                <article className={`group relative flex items-center justify-between gap-4 p-3.5 border border-theme-border/40 hover:border-theme-border rounded-xl transition-all duration-150 ${item.cardStyle}`}>
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-xl border flex-shrink-0 flex items-center justify-center ${item.bgTag}`}>
                      <IconoEntidad className="w-5 h-5 stroke-[2.2]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-xs font-bold text-theme-text tracking-normal break-words leading-relaxed">
                          {item.titulo}
                        </span>
                        {item.metadato && (
                          <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded bg-theme-border/20 text-theme-text border border-theme-border/50 flex-shrink-0">
                            {item.metadato}
                          </span>
                        )}
                      </div>
                      <span className={`text-[9px] uppercase tracking-wider font-black block mt-0.5 ${item.color}`}>
                        {item.etiqueta}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {item.tipo === 'tarea' && (
                      <button
                        onClick={() => enviarAKanban(item)}
                        className="px-2.5 py-1 text-[10px] font-black uppercase text-theme-accent bg-theme-accent/10 hover:bg-theme-accent/20 border border-theme-accent/30 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        Kanban <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setModoEdicion(true);
                        setNotaAEditar(item);
                        setNuevoComando(item.textoOriginal);
                        textareaRef.current?.focus();
                      }}
                      className="p-1.5 text-theme-text/50 hover:text-theme-text hover:bg-theme-border/20 rounded-lg transition-colors cursor-pointer"
                      title="Modificar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => eliminarRegistro(item)}
                      className="p-1.5 text-theme-text/50 hover:text-theme-casa hover:bg-theme-casa/10 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              </div>
            );
          })
        )}
      </main>

      {/* 🟢 INPUT DOCK INFERIOR INTELIGENTE */}
      <footer className="p-4 border-t border-theme-border bg-theme-bg space-y-3 flex-shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto text-xs no-scrollbar select-none">
          <span className="text-[10px] font-black text-theme-text/50 uppercase tracking-wider mr-1 flex items-center gap-1 flex-shrink-0">
            Plantillas:
          </span>
          {[
            { tag: '$ Gasto', snippet: '$ Despensa; 450', color: 'hover:border-theme-casa hover:text-theme-casa' },
            { tag: '• Tarea', snippet: '. Revisar contratos; 11:00', color: 'hover:border-theme-accent hover:text-theme-accent' },
            { tag: '# Evento', snippet: '# Demo producto; 28-jul; 15:00; Sala B', color: 'hover:border-theme-trabajo hover:text-theme-trabajo' },
            { tag: '! Idea', snippet: '! Nueva función de automatización', color: 'hover:border-amber-400 hover:text-amber-400' },
            { tag: '- Nota', snippet: '- Se acordó entrega para el martes', color: 'hover:border-theme-border hover:text-theme-text' }
          ].map(p => (
            <button
              key={p.tag}
              type="button"
              onClick={() => {
                setNuevoComando(p.snippet);
                textareaRef.current?.focus();
              }}
              className={`px-2.5 py-1 rounded-lg bg-theme-bg border border-theme-border text-theme-text/70 text-[10px] font-bold uppercase transition-all cursor-pointer flex-shrink-0 ${p.color}`}
            >
              {p.tag}
            </button>
          ))}
        </div>

        {modoEdicion && (
          <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400">
            <span className="text-[10px] font-black uppercase">Editando registro existente...</span>
            <button onClick={() => { setModoEdicion(false); setNuevoComando(''); }} className="hover:opacity-70 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-3 bg-theme-bg border border-theme-border focus-within:border-theme-accent rounded-xl p-2.5 transition-all">
          <div className={`p-2.5 rounded-xl border ${detectorActivo.bgTag} transition-colors flex-shrink-0 flex items-center justify-center`}>
            <detectorActivo.icono className="w-5 h-5 stroke-[2.2]" />
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={nuevoComando}
            onChange={(e) => setNuevoComando(e.target.value)}
            onKeyDown={manejarTeclado}
            placeholder="Escribe algo rápido ($ gasto, . tarea, # evento, ! idea, - nota)... [Ctrl + Enter]"
            className="w-full bg-transparent resize-none outline-none border-none text-xs font-bold text-theme-text placeholder-theme-text/40 leading-relaxed max-h-44 font-mono"
            disabled={enviando}
          />

          <button
            type="button"
            onClick={ejecutarRegistro}
            disabled={!nuevoComando.trim() || enviando}
            className="p-2.5 rounded-xl bg-theme-accent hover:opacity-90 text-theme-bg disabled:opacity-30 transition-all flex items-center justify-center flex-shrink-0 cursor-pointer shadow-sm"
            title="Guardar (Ctrl + Enter)"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4 stroke-[2.5]" />}
          </button>
        </div>
      </footer>

    </div>
  );
}