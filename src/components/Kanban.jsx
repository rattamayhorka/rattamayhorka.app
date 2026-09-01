import { useEffect, useState, useRef } from 'react';
// ==========================================
// 🔴 ANTERIOR: API de Google Apps Script
// import { database } from '../api';
// 🟢 NUEVO: Cliente oficial de Supabase
import { supabase } from '../supabase';
// ==========================================
// 🔴 ANTERIOR: Sin icono de papelera
// import { Plus, Calendar, Clock, CheckCircle2, RotateCcw, Play, X, Filter } from 'lucide-react';
// 🟢 NUEVO: Importación con icono Trash2 agregado
import { Plus, Calendar, Clock, CheckCircle2, RotateCcw, Play, X, Filter, Trash2 } from 'lucide-react';

// =========================================================================
// 🚀 COMPONENTE INTERNO: RUTINA DE INICIO
// =========================================================================
function RutinaControl() {
  const [paso, setPaso] = useState(() => {
    const guardado = localStorage.getItem('bunker_paso_rutina');
    return guardado ? parseInt(guardado, 10) : -1;
  });

  useEffect(() => {
    localStorage.setItem('bunker_paso_rutina', paso.toString());
  }, [paso]);

  const avanzar = () => setPaso(p => p + 1);
  const reiniciar = () => setPaso(-1);

  if (paso === -1) {
    return (
      <button 
        onClick={avanzar}
        className="bg-theme-bg hover:opacity-80 text-theme-accent border border-theme-border px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all cursor-pointer h-10"
      >
        <Play className="w-3 h-3 mr-1.5 fill-current stroke-[2.5]" /> Rutina Inicio
      </button>
    );
  }

  if (paso >= PASOS_RUTINA.length) {
    return (
      <div className="bg-theme-bg/20 border border-theme-border px-3 py-1.5 rounded-xl flex items-center gap-3 h-10 text-left">
        <span className="text-theme-accent font-black text-[9px] uppercase tracking-wider">⚡ RUTINA OK</span>
        <button onClick={reiniciar} className="text-theme-text/60 hover:text-theme-text cursor-pointer">
          <RotateCcw className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-theme-bg border border-theme-border px-3 py-1 rounded-xl flex items-center justify-between gap-3 shadow-md max-w-sm h-10 text-left">
      <div className="min-w-0 flex-1">
        <span className="text-[7px] font-black text-theme-accent uppercase tracking-widest block leading-none">
          PASO {paso + 1}/{PASOS_RUTINA.length}
        </span>
        <p className="text-[10px] font-bold text-theme-text uppercase tracking-tight truncate leading-tight mt-0.5" title={PASOS_RUTINA[paso]}>
          {PASOS_RUTINA[paso]}
        </p>
      </div>
      <button 
        onClick={avanzar}
        className="bg-theme-accent hover:opacity-90 text-theme-bg p-1.5 rounded-lg transition-all cursor-pointer flex-shrink-0"
      >
        <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
      </button>
    </div>
  );
}

const PASOS_RUTINA = [
  "Ver correos nuevos en la bandeja de entrada",
  "Mover a carpetas correos sin seguimiento",
  "Revisar la carpeta de 'Pendientes de Correos'",
  "Revisar reportes abiertos en CMMS",
  "Revisar pendientes en CMMS",
  "Revisar Componente Compras en App",
  "Revisar Future LOG en App",
  "Revisar Mapa de proyectos"  
];

// =========================================================================
// 🔄 COMPONENTE CORE: KANBAN UNIFICADO CON FILTROS DINÁMICOS & REORDENAMIENTO
// =========================================================================
export default function Kanban({ refreshTrigger }) {
  const [tareas, setTareas] = useState([]);
  const [tareasFiltradas, setTareasFiltradas] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // 🎯 Estado: Filtro superior (Todos, Trabajo, Casa)
  const [filtoEntorno, setFiltroEntorno] = useState('Trabajo');

  // 🎯 Nuevo estado para resaltar la tarjeta objetivo durante el drag
  const [tarjetaTargetId, setTarjetaTargetId] = useState(null);

  // Modales
  const [mostrarModalNuevo, setMostrarModalNuevo] = useState(false);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);

  // ==========================================
  // 🟢 NUEVO: Estados para Modal de Papelera (Trash Bin)
  const [mostrarModalTrash, setMostrarModalTrash] = useState(false);
  const [tareasArchivadas, setTareasArchivadas] = useState([]);
  const [cargandoTrash, setCargandoTrash] = useState(false);
  // ==========================================

  // Formulario Nuevo
  const [nuevaTareaTexto, setNuevaTareaTexto] = useState('');
  const [nuevoTipo, setNuevoTipo] = useState('Trabajo');

  // Formulario Editar
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [editTareaTexto, setEditTareaTexto] = useState('');
  const [editStatus, setEditStatus] = useState('Por Hacer');
  const [editTipo, setEditTipo] = useState('Trabajo');
  const hoyISO = new Date().toISOString().split('T')[0];
  const [editFechaSnooze, setEditFechaSnooze] = useState(hoyISO);
  const [guardando, setGuardando] = useState(false);

  const parseFechaSheets = (str) => {
    if (!str || !str.includes('/')) return new Date(2099, 1, 1);
    const [dia, mes, anio] = str.split('/');
    return new Date(anio, mes - 1, dia);
  };

  const cargarTareas = async () => {
    setCargando(true);

    // ==========================================
    // 🔴 ANTERIOR: Lectura en Google Sheets
    // const data = await database.obtenerSeccion('pendientes');
    //
    // 🟢 NUEVO: Lectura directa desde PostgreSQL en Supabase
    let data = [];
    try {
      const { data: dataSupabase, error } = await supabase
        .from('kanban')
        .select('*')
        .order('prioridad', { ascending: true });

      if (error) throw error;

      // Mapeo seguro a la estructura que usa tu UI (PascalCase)
      data = (dataSupabase || []).map(row => ({
        id: row.id,
        Tarea: row.tarea,
        Status: row.status,
        Fecha: row.fecha,
        Tipo: row.tipo,
        Prioridad: row.prioridad
      }));
    } catch (err) {
      console.error('Error al cargar kanban desde Supabase:', err);
    }
    // ==========================================
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const filtradas = data.filter(t => {
      const tipoLower = (t.Tipo || '').toLowerCase().trim();
      const esValido = tipoLower === 'trabajo' || tipoLower === 'casa';
      if (!esValido) return false;

      // ==========================================
      // 🟢 NUEVO: Oculta elementos terminados/archivados del tablero activo
      const statusLower = (t.Status || '').toLowerCase().trim();
      if (statusLower === 'terminado' || statusLower === 'archivado') return false;
      // ==========================================

      if ((t.Status || '').trim().toUpperCase() === 'PROGRAMADO') {
        const fechaDespertar = parseFechaSheets(t.Fecha);
        if (fechaDespertar > hoy) return false;
      }
      
      return true;
    }).map((t, idx) => {
      const prioridadNum = t.Prioridad && !isNaN(parseInt(t.Prioridad, 10)) ? parseInt(t.Prioridad, 10) : idx + 1;
      if ((t.Status || '').trim().toUpperCase() === 'PROGRAMADO') {
        return { ...t, Status: 'Por Hacer', Prioridad: prioridadNum };
      }
      return { ...t, Prioridad: prioridadNum };
    });

    filtradas.sort((a, b) => (a.Prioridad || 0) - (b.Prioridad || 0));

    setTareas(filtradas);
    setCargando(false);
  };

  useEffect(() => {
    cargarTareas();
  }, [refreshTrigger]);

  // 🎯 EFECTO DE FILTRADO DINÁMICO SUPERIOR
  useEffect(() => {
    let resultado = [];
    if (filtoEntorno === 'Todos') {
      resultado = [...tareas];
    } else {
      resultado = tareas.filter(t => 
        (t.Tipo || "").toLowerCase().trim() === filtoEntorno.toLowerCase().trim()
      );
    }
    resultado.sort((a, b) => (a.Prioridad || 0) - (b.Prioridad || 0));
    setTareasFiltradas(resultado);
  }, [tareas, filtoEntorno]);

  // ==========================================
  // 🟢 NUEVAS FUNCIONES: GESTIÓN DE PAPELERA (TRASH BIN)
  // ==========================================
  const abrirPapelera = async () => {
    setMostrarModalTrash(true);
    setCargandoTrash(true);
    try {
      const { data, error } = await supabase
        .from('kanban')
        .select('*')
        .or('status.ilike.Terminado,status.ilike.Archivado')
        .order('id', { ascending: false });

      if (error) throw error;
      setTareasArchivadas(data || []);
    } catch (err) {
      console.error('Error al cargar elementos de la papelera:', err);
    } finally {
      setCargandoTrash(false);
    }
  };

  const vaciarPapelera = async () => {
    if (!window.confirm('¿Deseas eliminar definitivamente todos los registros de la papelera?')) return;

    setCargandoTrash(true);
    try {
      const { error } = await supabase
        .from('kanban')
        .delete()
        .or('status.ilike.Terminado,status.ilike.Archivado');

      if (error) throw error;
      setTareasArchivadas([]);
    } catch (err) {
      console.error('Error al vaciar papelera en Supabase:', err);
    } finally {
      setCargandoTrash(false);
    }
  };
  // ==========================================

  const manejarDragStart = (e, tareaTexto) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('texto-tarea', tareaTexto);
    }
  };

  // 🎯 MANEJO DE DROP CON REORDENAMIENTO Y REASIGNACIÓN DE PRIORIDADES
  const manejarDropContenedor = async (e, nuevoStatus, targetTareaTexto = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setTarjetaTargetId(null);
    const tareaTexto = (e && e.dataTransfer) ? e.dataTransfer.getData('texto-tarea') : null;
    if (!tareaTexto) return;

    setTareas(prevTareas => {
      const copia = [...prevTareas];
      const indexArrastrado = copia.findIndex(t => t.Tarea === tareaTexto);
      if (indexArrastrado === -1) return prevTareas;

      // 1. Extraemos el objeto arrastrado y actualizamos su estatus
      const [itemMover] = copia.splice(indexArrastrado, 1);
      itemMover.Status = nuevoStatus;

      // 2. Buscamos el punto de inserción dentro del estatus destino
      if (targetTareaTexto && targetTareaTexto !== tareaTexto) {
        const indexTarget = copia.findIndex(t => t.Tarea === targetTareaTexto);
        if (indexTarget !== -1) {
          copia.splice(indexTarget, 0, itemMover);
        } else {
          copia.push(itemMover);
        }
      } else {
        let ultimoIndiceStatus = -1;
        for (let i = 0; i < copia.length; i++) {
          if ((copia[i].Status || '').toLowerCase().trim() === nuevoStatus.toLowerCase().trim()) {
            ultimoIndiceStatus = i;
          }
        }
        if (ultimoIndiceStatus !== -1) {
          copia.splice(ultimoIndiceStatus + 1, 0, itemMover);
        } else {
          copia.push(itemMover);
        }
      }

      // 3. Normalizamos la prioridad (1, 2, 3...) para las tareas de ese estado
      let contador = 1;
      const resultadoFinal = copia.map(t => {
        if ((t.Status || '').toLowerCase().trim() === nuevoStatus.toLowerCase().trim()) {
          const itemConPrioridad = { ...t, Prioridad: contador };
          contador++;
          return itemConPrioridad;
        }
        return t;
      });

      // ==========================================
      // 🔴 ANTERIOR: Envío a Apps Script para reordenar en la hoja
      // const tareasActualizadasConPrioridad = resultadoFinal
      //   .filter(t => (t.Status || '').toLowerCase().trim() === nuevoStatus.toLowerCase().trim())
      //   .map(t => ({ tareaTexto: t.Tarea, prioridad: t.Prioridad, status: t.Status }));
      //
      // database.guardarDatos('reordenarPrioridadesKanban', { 
      //   nuevoStatus, 
      //   tareasConPrioridad: tareasActualizadasConPrioridad 
      // }).catch(() => {});
      //
      // 🟢 NUEVO: Actualización asíncrona por lote en Supabase
      (async () => {
        const tareasAActualizar = resultadoFinal.filter(
          t => (t.Status || '').toLowerCase().trim() === nuevoStatus.toLowerCase().trim()
        );

        for (const t of tareasAActualizar) {
          await supabase
            .from('kanban')
            .update({ status: t.Status, prioridad: t.Prioridad })
            .eq('tarea', t.Tarea);
        }
      })().catch(err => console.error('Error al sincronizar drag & drop en Supabase:', err));
      // ==========================================

      return resultadoFinal;
    });
  };

  const manejarDragOverCard = (e, targetTareaTexto) => {
    e.preventDefault();
    e.stopPropagation();
    if (tarjetaTargetId !== targetTareaTexto) {
      setTarjetaTargetId(targetTareaTexto);
    }
  };

  const ejecutarGuardarTarea = async (e) => {
    e.preventDefault();
    if (!nuevaTareaTexto.trim()) return;

    setGuardando(true);
    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

    const prioridadesPorHacer = tareas
      .filter(t => (t.Status || '').toLowerCase().trim() === 'por hacer')
      .map(t => t.Prioridad || 0);
    const nuevaPrioridad = prioridadesPorHacer.length > 0 ? Math.max(...prioridadesPorHacer) + 1 : 1;

    const datos = {
      tarea: nuevaTareaTexto.trim(),
      status: "Por Hacer",
      fecha: fechaFormateada,
      tipo: nuevoTipo,
      prioridad: nuevaPrioridad
    };

    setTareas(prev => [...prev, { Tarea: datos.tarea, Status: datos.status, Fecha: datos.fecha, Tipo: datos.tipo, Prioridad: datos.prioridad }]);
    setNuevaTareaTexto('');
    setMostrarModalNuevo(false);
    setGuardando(false);

    // ==========================================
    // 🔴 ANTERIOR: Guardado en Google Sheets
    // await database.guardarDatos('guardarTarea', { datos });
    //
    // 🟢 NUEVO: Inserción directa en tabla 'kanban' de Supabase
    try {
      await supabase.from('kanban').insert([datos]);
    } catch (err) {
      console.error('Error al insertar tarea en Supabase:', err);
    }
    // ==========================================
  };

  const ejecutarModificarTarea = async (e) => {
    e.preventDefault();
    if (!editTareaTexto.trim() || !tareaSeleccionada) return;

    setGuardando(true);

    let fechaFinal = tareaSeleccionada.Fecha;
    if (editStatus === 'Programado') {
      const [anio, mes, dia] = editFechaSnooze.split('-');
      fechaFinal = `${dia}/${mes}/${anio}`;
    }

    if (editStatus === 'Programado') {
      setTareas(prev => prev.filter(t => t.Tarea !== tareaSeleccionada.Tarea));
    } else {
      setTareas(prev => prev.map(t => 
        t.Tarea === tareaSeleccionada.Tarea 
          ? { ...t, Tarea: editTareaTexto.trim(), Status: editStatus, Fecha: fechaFinal, Tipo: editTipo } 
          : t
      ));
    }

    const tareaOriginal = tareaSeleccionada.Tarea;
    const nuevaTarea = editTareaTexto.trim();
    const nuevoStatus = editStatus;

    setMostrarModalEditar(false);
    setTareaSeleccionada(null);
    setGuardando(false);

    // ==========================================
    // 🔴 ANTERIOR: Modificación en Google Sheets
    // await database.guardarDatos('modificarTarea', { 
    //   datos: {
    //     tareaOriginal: tareaOriginal, 
    //     nuevaTarea: nuevaTarea, 
    //     nuevoStatus: nuevoStatus, 
    //     nuevaFecha: fechaFinal, 
    //     nuevoTipo: editTipo 
    //   }
    // });
    //
    // 🟢 NUEVO: Actualización directa por nombre o ID en Supabase
    try {
      await supabase
        .from('kanban')
        .update({
          tarea: nuevaTarea,
          status: nuevoStatus,
          fecha: fechaFinal,
          tipo: editTipo
        })
        .eq('tarea', tareaOriginal);
    } catch (err) {
      console.error('Error al modificar tarea en Supabase:', err);
    }
    // ==========================================
  };

  const ejecutarArchivarTarea = async () => {
    if (!tareaSeleccionada) return;

    setGuardando(true);
    const tareaTexto = tareaSeleccionada.Tarea;
    const nuevoStatus = "Terminado";

    setTareas(prev => prev.filter(t => t.Tarea !== tareaTexto));
    setMostrarModalEditar(false);
    setTareaSeleccionada(null);
    setGuardando(false);

    // ==========================================
    // 🔴 ANTERIOR: Cambio de estatus a 'Terminado' en Google Sheets
    // await database.guardarDatos('statusKanban', { tareaTexto, nuevoStatus });
    //
    // 🟢 NUEVO: Actualización de estatus en Supabase (o DELETE si no deseas conservar archivados)
    try {
      await supabase
        .from('kanban')
        .update({ status: nuevoStatus })
        .eq('tarea', tareaTexto);
    } catch (err) {
      console.error('Error al archivar tarea en Supabase:', err);
    }
    // ==========================================
  };

  const abrirModalEdicion = (task) => {
    setTareaSeleccionada(task);
    setEditTareaTexto(task.Tarea);
    setEditStatus(task.Status || 'Por Hacer');
    setEditTipo(task.Tipo || 'Trabajo');
    
    if (task.Fecha && task.Fecha.includes('/')) {
      const [d, m, a] = task.Fecha.split('/');
      setEditFechaSnooze(`${a}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    } else {
      const hoy = new Date();
      const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
      setEditFechaSnooze(hoyISO);
    }
    setMostrarModalEditar(true);
  };

  const filtrarPorColumna = (status) => {
    return tareasFiltradas
      .filter(t => (t.Status || "").toLowerCase().trim() === status.toLowerCase())
      .sort((a, b) => (a.Prioridad || 0) - (b.Prioridad || 0));
  };

  if (cargando) {
    return <p className="text-xs font-black uppercase tracking-wider text-theme-text/50 animate-pulse text-left">Actualizando...</p>;
  }

  return (
    <div className="space-y-6 text-left relative">
      
      <div className="flex justify-between items-end border-b border-theme-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-theme-accent tracking-tighter uppercase italic">Tablero Kanban Global</h2>
          <p className="text-[10px] font-bold text-theme-text/60 uppercase tracking-widest mt-1 italic">
            Gestión Unificada de Actividades
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <RutinaControl />
          
          {/* ========================================== */}
          {/* 🟢 NUEVO: Botón para abrir la Papelera de tareas archivadas */}
          <button 
            onClick={abrirPapelera}
            title="Ver tareas archivadas / terminadas"
            className="bg-theme-bg hover:opacity-80 text-theme-casa border border-theme-border px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg transition-all cursor-pointer h-10"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1 text-theme-casa" /> Papelera
          </button>
          {/* ========================================== */}

          <button 
            onClick={() => setMostrarModalNuevo(true)}
            className="bg-theme-border hover:opacity-80 text-theme-bg px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg transition-all cursor-pointer h-10"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* 🎯 SECCIÓN DE FILTROS SUPERIORES */}
      <div className="flex gap-2 bg-theme-bg p-2 rounded-xl border border-theme-border/40 items-center">
        <span className="text-[9px] font-black uppercase text-theme-text/60 px-2 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Entorno:
        </span>
        <button
          onClick={() => setFiltroEntorno('Todos')}
          className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtoEntorno === 'Todos' ? 'bg-theme-accent text-theme-bg shadow-md' : 'bg-theme-bg text-theme-text/70 hover:text-theme-text border border-theme-border'}`}
        >
          Todos ({tareas.length})
        </button>
        <button
          onClick={() => setFiltroEntorno('Trabajo')}
          className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtoEntorno === 'Trabajo' ? 'bg-theme-trabajo text-theme-bg shadow-md' : 'bg-theme-bg text-theme-text/70 hover:text-theme-trabajo border border-theme-border'}`}
        >
          Trabajo ({tareas.filter(t => (t.Tipo || "").toLowerCase().trim() === 'trabajo').length})
        </button>
        <button
          onClick={() => setFiltroEntorno('Casa')}
          className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtoEntorno === 'Casa' ? 'bg-theme-casa text-theme-bg shadow-md' : 'bg-theme-bg text-theme-text/70 hover:text-theme-casa border border-theme-border'}`}
        >
          Casa ({tareas.filter(t => (t.Tipo || "").toLowerCase().trim() === 'casa').length})
        </button>
      </div>
      
      {/* BLOQUE CON ATRIBUTOS DE DETECCIÓN TÁCTIL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COLUMNA: POR HACER */}
        <div 
          data-status="Por Hacer"
          onDragOver={(e) => e.preventDefault()} 
          onDrop={(e) => manejarDropContenedor(e, 'Por Hacer')} 
          className="bg-theme-bg border border-theme-border/60 p-4 rounded-2xl min-h-[450px]"
        >
          <h3 className="text-xs font-black uppercase text-theme-text/80 mb-4 flex items-center tracking-wider italic"><Clock className="w-3.5 h-3.5 mr-2 text-theme-text/50" /> Por Hacer</h3>
          <div className="space-y-3">
            {filtrarPorColumna('Por Hacer').map((task, i) => (
              <Tarjeta 
                key={i} 
                task={task} 
                onDragStart={manejarDragStart} 
                onDragOverCard={(e) => manejarDragOverCard(e, task.Tarea)}
                onDragLeaveCard={() => setTarjetaTargetId(null)}
                onDropCard={(e) => manejarDropContenedor(e, 'Por Hacer', task.Tarea)}
                onDropTouch={(tareaTexto, destinoStatus) => {
                  manejarDropContenedor({ preventDefault: () => {}, dataTransfer: { getData: () => tareaTexto } }, destinoStatus);
                }}
                isTarget={tarjetaTargetId === task.Tarea}
                onClick={() => abrirModalEdicion(task)} 
              />
            ))}
          </div>
        </div>

        {/* COLUMNA: EN PROCESO */}
        <div 
          data-status="En Proceso"
          onDragOver={(e) => e.preventDefault()} 
          onDrop={(e) => manejarDropContenedor(e, 'En Proceso')} 
          className="bg-theme-bg border border-theme-border/60 p-4 rounded-2xl min-h-[450px]"
        >
          <h3 className="text-xs font-black uppercase text-theme-accent mb-4 flex items-center tracking-wider italic"><Activity className="w-3.5 h-3.5 mr-2 text-theme-accent" /> En Proceso</h3>
          <div className="space-y-3">
            {filtrarPorColumna('En Proceso').map((task, i) => (
              <Tarjeta 
                key={i} 
                task={task} 
                onDragStart={manejarDragStart} 
                onDragOverCard={(e) => manejarDragOverCard(e, task.Tarea)}
                onDragLeaveCard={() => setTarjetaTargetId(null)}
                onDropCard={(e) => manejarDropContenedor(e, 'En Proceso', task.Tarea)}
                onDropTouch={(tareaTexto, destinoStatus) => {
                  manejarDropContenedor({ preventDefault: () => {}, dataTransfer: { getData: () => tareaTexto } }, destinoStatus);
                }}
                isTarget={tarjetaTargetId === task.Tarea}
                onClick={() => abrirModalEdicion(task)} 
              />
            ))}
          </div>
        </div>

        {/* COLUMNA: HECHO */}
        <div 
          data-status="Hecho"
          onDragOver={(e) => e.preventDefault()} 
          onDrop={(e) => manejarDropContenedor(e, 'Hecho')} 
          className="bg-theme-bg border border-theme-border/60 p-4 rounded-2xl min-h-[450px]"
        >
          <h3 className="text-xs font-black uppercase text-theme-accent mb-4 flex items-center tracking-wider italic"><CheckCircle2 className="w-3.5 h-3.5 mr-2 text-theme-accent" /> Hecho</h3>
          <div className="space-y-3">
            {filtrarPorColumna('Hecho').map((task, i) => (
              <Tarjeta 
                key={i} 
                task={task} 
                onDragStart={manejarDragStart} 
                onDragOverCard={(e) => manejarDragOverCard(e, task.Tarea)}
                onDragLeaveCard={() => setTarjetaTargetId(null)}
                onDropCard={(e) => manejarDropContenedor(e, 'Hecho', task.Tarea)}
                onDropTouch={(tareaTexto, destinoStatus) => {
                  manejarDropContenedor({ preventDefault: () => {}, dataTransfer: { getData: () => tareaTexto } }, destinoStatus);
                }}
                isTarget={tarjetaTargetId === task.Tarea}
                onClick={() => abrirModalEdicion(task)} 
              />
            ))}
          </div>
        </div>
      </div>

      {/* MODAL NUEVO */}
      {mostrarModalNuevo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-bg border border-theme-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left">
             <div className="bg-theme-bg p-4 text-theme-text font-black uppercase text-[10px] tracking-widest flex justify-between items-center border-b border-theme-border/50">
              <span>Nueva Tarea General</span>
               <button onClick={() => setMostrarModalNuevo(false)} className="text-theme-text/60 hover:text-theme-text cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={ejecutarGuardarTarea} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-2">Descripción</label>
                <input 
                  type="text" 
                  required
                  value={nuevaTareaTexto}
                  onChange={(e) => setNuevaTareaTexto(e.target.value)}
                  placeholder="Ej. Escribir instrucción o pendiente..." 
                   className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold uppercase outline-none text-theme-text focus:border-theme-accent"
                />
              </div>

              <div>
                 <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-2">Clasificación de Entorno</label>
                <select 
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value)}
                   className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold uppercase outline-none text-theme-text focus:border-theme-accent"
                >
                  <option value="Trabajo">TRABAJO</option>
                  <option value="Casa">CASA</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={guardando}
                 className="w-full bg-theme-accent hover:opacity-90 text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg disabled:opacity-50 cursor-pointer mt-2"
              >
                {guardando ? 'Guardando...' : 'Agregar Tarea'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {mostrarModalEditar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`bg-theme-bg border border-theme-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left border-t-4 ${editTipo.toLowerCase() === 'trabajo' ? 'border-t-theme-trabajo' : 'border-t-theme-casa'}`}>
            <form onSubmit={ejecutarModificarTarea} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black text-theme-text uppercase tracking-tighter italic">Editar Tarea</h4>
                <button type="button" onClick={() => setMostrarModalEditar(false)} className="text-theme-text/50 hover:text-theme-text cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              
              <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Descripción de la Tarea</label>
              <input 
                type="text" 
                required
                value={editTareaTexto}
                onChange={(e) => setEditTareaTexto(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold uppercase outline-none text-theme-text focus:border-theme-accent mb-4"
              />

              <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Cambiar Entorno</label>
              <select 
                value={editTipo}
                onChange={(e) => setEditTipo(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold uppercase outline-none text-theme-text focus:border-theme-accent mb-4"
              >
                <option value="Trabajo">Trabajo</option>
                <option value="Casa">Casa</option>
              </select>
              
              <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Estatus actual</label>
              <select 
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold uppercase outline-none text-theme-text focus:border-theme-accent mb-4"
              >
                <option value="Por Hacer">Por Hacer</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Hecho">Hecho</option>
                <option value="Bullet">Bullet</option>
                <option value="Programado">Pausar (Snooze)</option>
              </select>

              {editStatus === 'Programado' && (
                <div className="mb-6 animate-fadeIn">
                  <label className="block text-[9px] font-black uppercase text-theme-accent mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> ¿Qué día deseas que despierte la tarea?
                  </label>
                  <input 
                    type="date"
                    required
                    value={editFechaSnooze}
                    onChange={(e) => setEditFechaSnooze(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold font-mono text-theme-text outline-none focus:border-theme-accent"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button 
                  type="submit" 
                  disabled={guardando}
                  className={`w-full ${editTipo.toLowerCase() === 'trabajo' ? 'bg-theme-trabajo' : 'bg-theme-casa'} text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg disabled:opacity-50 cursor-pointer hover:opacity-90`}
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>

                <div className="flex gap-2 mt-1">
                  <button 
                    type="button" 
                    disabled={guardando}
                    onClick={ejecutarArchivarTarea}
                    className="flex-1 bg-theme-bg hover:opacity-80 border border-theme-border text-theme-accent py-2.5 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3 text-theme-accent" /> Archivar
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setMostrarModalEditar(false)} 
                    className="flex-1 text-[10px] font-black uppercase text-theme-text/50 hover:text-theme-text cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🟢 NUEVO: MODAL TRASH BIN (PAPELERA Y VACIADO DEFINITIVO) */}
      {/* ========================================== */}
      {mostrarModalTrash && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-bg border border-theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-left border-t-4 border-t-theme-casa">
            
            {/* Header del Modal */}
            <div className="bg-theme-bg p-4 text-theme-text font-black uppercase text-[10px] tracking-widest flex justify-between items-center border-b border-theme-border/50">
              <span className="flex items-center gap-1.5 text-theme-casa">
                <Trash2 className="w-4 h-4 text-theme-casa" /> Papelera de Tareas ({tareasArchivadas.length})
              </span>
              <button onClick={() => setMostrarModalTrash(false)} className="text-theme-text/60 hover:text-theme-text cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Listado de tareas archivadas */}
            <div className="p-4 max-h-72 overflow-y-auto space-y-2">
              {cargandoTrash ? (
                <p className="text-xs italic text-theme-text/50 text-center py-4">Cargando elementos...</p>
              ) : tareasArchivadas.length === 0 ? (
                <p className="text-xs italic text-theme-text/40 text-center py-6">La papelera está vacía.</p>
              ) : (
                tareasArchivadas.map((t) => (
                  <div key={t.id || t.tarea} className="p-2.5 bg-theme-border/10 border border-theme-border/30 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-bold text-theme-text line-through opacity-70 truncate mr-2">{t.tarea}</span>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-theme-border/50 text-theme-text/50 flex-shrink-0">
                      {t.tipo}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Acciones de pie de modal */}
            <div className="p-4 border-t border-theme-border/40 flex justify-end gap-2 bg-theme-bg">
              <button
                type="button"
                onClick={() => setMostrarModalTrash(false)}
                className="px-4 py-2 text-[10px] font-black uppercase text-theme-text/60 hover:text-theme-text cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={tareasArchivadas.length === 0 || cargandoTrash}
                onClick={vaciarPapelera}
                className="bg-theme-casa hover:opacity-90 text-theme-bg px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-30 cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Vaciar Papelera
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========================================== */}

    </div>
  );
}

// =========================================================================
// 🎯 SUBCOMPONENTE TARJETA OPTIMIZADO CON SOPORTE TÁCTIL GPU
// =========================================================================
function Tarjeta({ task, onDragStart, onDragOverCard, onDragLeaveCard, onDropCard, onDropTouch, isTarget, onClick }) {
  const cardRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const animFrameId = useRef(null);
  const isDraggingTouch = useRef(false);

  const esTrabajo = (task.Tipo || "").toLowerCase().trim() === 'trabajo';
 
  const estiloEntornoTarjeta = esTrabajo 
    ? "bg-theme-bg border-theme-trabajo/50 hover:border-theme-trabajo text-theme-text shadow-md"
    : "bg-theme-bg border-theme-casa/50 hover:border-theme-casa text-theme-text shadow-md";

  const estiloIconoCalendario = esTrabajo ? "text-theme-trabajo" : "text-theme-casa";

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isDraggingTouch.current = false;
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartPos.current.x;
    const deltaY = touch.clientY - touchStartPos.current.y;

    if (!isDraggingTouch.current && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isDraggingTouch.current = true;
      if (cardRef.current) {
        cardRef.current.style.zIndex = '9999';
        cardRef.current.style.opacity = '0.85';
        cardRef.current.style.willChange = 'transform';
      }
    }

    if (isDraggingTouch.current && cardRef.current) {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);

      animFrameId.current = requestAnimationFrame(() => {
        if (cardRef.current) {
          cardRef.current.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0px)`;
        }
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (animFrameId.current) cancelAnimationFrame(animFrameId.current);

    if (isDraggingTouch.current) {
      const touch = e.changedTouches[0];
      const card = cardRef.current;

      if (card) card.style.display = 'none';
      const elementoBajoDedo = document.elementFromPoint(touch.clientX, touch.clientY);
      if (card) card.style.display = '';

      if (card) {
        card.style.transform = '';
        card.style.zIndex = '';
        card.style.opacity = '';
        card.style.willChange = '';
      }

      if (elementoBajoDedo) {
        const contenedorColumna = elementoBajoDedo.closest('[data-status]');
        if (contenedorColumna) {
          const destinoStatus = contenedorColumna.getAttribute('data-status');
          if (destinoStatus && onDropTouch) {
            onDropTouch(task.Tarea, destinoStatus);
          }
        }
      }
      isDraggingTouch.current = false;
    }
  };

  return (
    <div
      ref={cardRef}
      draggable
      style={{ touchAction: 'none' }}
      onDragStart={(e) => onDragStart(e, task.Tarea)}
      onDragOver={onDragOverCard}
      onDragLeave={onDragLeaveCard}
      onDrop={onDropCard}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        if (!isDraggingTouch.current) onClick(e);
      }}
      className={`border p-3 rounded-xl shadow-md cursor-grab active:cursor-grabbing transition-shadow duration-200 group ${estiloEntornoTarjeta} ${
        isTarget ? 'border-t-4 border-t-theme-accent bg-theme-accent/10' : ''
      }`}
    >
      <p className="text-[11px] font-bold uppercase leading-snug tracking-tight pointer-events-none">
        {task.Tarea || 'SIN DESCRIPCIÓN'}
      </p>
      
      <div className="flex justify-between items-center mt-3 pt-1.5 border-t border-theme-border/20 text-theme-text/60 font-bold text-[8px] tracking-widest uppercase pointer-events-none">
        <span className="flex items-center italic">
          <Calendar className={`w-2.5 h-2.5 mr-1 ${estiloIconoCalendario}`} />
          {task.Fecha || '---'}
        </span>
        <span className="text-[7px] opacity-40 font-black">
          {esTrabajo ? 'TRABAJO' : 'CASA'}
        </span>
      </div>
    </div>
  );
}

function Activity(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}