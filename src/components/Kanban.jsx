import { useEffect, useState } from 'react';
import { database } from '../api';
import { Plus, Calendar, Clock, CheckCircle2, RotateCcw, Play, X, Filter } from 'lucide-react';

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
        className="bg-zinc-900 hover:bg-zinc-800 text-sky-400 border border-zinc-800 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all cursor-pointer h-10"
      >
        <Play className="w-3 h-3 mr-1.5 fill-current stroke-[2.5]" /> Rutina Inicio
      </button>
    );
  }

  if (paso >= PASOS_RUTINA.length) {
    return (
      <div className="bg-emerald-950/20 border border-emerald-900 px-3 py-1.5 rounded-xl flex items-center gap-3 h-10 text-left">
        <span className="text-emerald-400 font-black text-[9px] uppercase tracking-wider">⚡ RUTINA OK</span>
        <button onClick={reiniciar} className="text-zinc-500 hover:text-zinc-300 cursor-pointer">
          <RotateCcw className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl flex items-center justify-between gap-3 shadow-md max-w-sm h-10 text-left">
      <div className="min-w-0 flex-1">
        <span className="text-[7px] font-black text-sky-400 uppercase tracking-widest block leading-none">
          PASO {paso + 1}/{PASOS_RUTINA.length}
        </span>
        <p className="text-[10px] font-bold text-zinc-100 uppercase tracking-tight truncate leading-tight mt-0.5" title={PASOS_RUTINA[paso]}>
          {PASOS_RUTINA[paso]}
        </p>
      </div>
      <button 
        onClick={avanzar}
        className="bg-sky-400 hover:bg-sky-500 text-zinc-950 p-1.5 rounded-lg transition-all cursor-pointer flex-shrink-0"
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
    const data = await database.obtenerSeccion('pendientes');
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const filtradas = data.filter(t => {
      const tipoLower = (t.Tipo || '').toLowerCase().trim();
      const esValido = tipoLower === 'trabajo' || tipoLower === 'casa';
      if (!esValido) return false;

      if ((t.Status || '').trim().toUpperCase() === 'PROGRAMADO') {
        const fechaDespertar = parseFechaSheets(t.Fecha);
        if (fechaDespertar > hoy) return false;
      }
      
      return true;
    }).map((t, idx) => {
      // Si la tarea tiene prioridad asignada en la hoja la usa, si no, usa el orden de carga
      const prioridadNum = t.Prioridad && !isNaN(parseInt(t.Prioridad, 10)) ? parseInt(t.Prioridad, 10) : idx + 1;
      if ((t.Status || '').trim().toUpperCase() === 'PROGRAMADO') {
        return { ...t, Status: 'Por Hacer', Prioridad: prioridadNum };
      }
      return { ...t, Prioridad: prioridadNum };
    });

    // Ordenar inicialmente por Prioridad dentro de cada grupo
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
    // Mantener el orden visual respetando la columna Prioridad
    resultado.sort((a, b) => (a.Prioridad || 0) - (b.Prioridad || 0));
    setTareasFiltradas(resultado);
  }, [tareas, filtoEntorno]);

  const manejarDragStart = (e, tareaTexto) => {
    e.dataTransfer.setData('texto-tarea', tareaTexto);
  };

  /*
  // -------------------------------------------------------------------------
  // CÓDIGO ANTERIOR: MANEJAR DROP DIRECTO
  // -------------------------------------------------------------------------
  const manejarDrop = async (e, nuevoStatus) => {
    e.preventDefault();
    const tareaTexto = e.dataTransfer.getData('texto-tarea');
    if (!tareaTexto) return;

    setTareas(prev => prev.map(t => 
      t.Tarea === tareaTexto ? { ...t, Status: nuevoStatus } : t
    ));

    await database.guardarDatos('statusKanban', { tareaTexto, nuevoStatus });
  };
  */

  // 🎯 NUEVO: MANEJO DE DROP CON REORDENAMIENTO Y REASIGNACIÓN DE PRIORIDADES
  const manejarDropContenedor = async (e, nuevoStatus, targetTareaTexto = null) => {
    e.preventDefault();
    setTarjetaTargetId(null);
    const tareaTexto = e.dataTransfer.getData('texto-tarea');
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
        // Si no cayó sobre otra tarjeta, se coloca al final del estado destino
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

      // 4. Persistir estado y prioridades en Google Sheets de forma asíncrona
      const tareasActualizadasConPrioridad = resultadoFinal
        .filter(t => (t.Status || '').toLowerCase().trim() === nuevoStatus.toLowerCase().trim())
        .map(t => ({ tareaTexto: t.Tarea, prioridad: t.Prioridad, status: t.Status }));

      database.guardarDatos('reordenarPrioridadesKanban', { 
        nuevoStatus, 
        tareasConPrioridad: tareasActualizadasConPrioridad 
      }).catch(() => {});

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

    // La nueva tarea toma la prioridad máxima dentro de "Por Hacer"
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

    await database.guardarDatos('guardarTarea', { datos });
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

    await database.guardarDatos('modificarTarea', { 
      datos: {
        tareaOriginal: tareaOriginal, 
        nuevaTarea: nuevaTarea, 
        nuevoStatus: nuevoStatus, 
        nuevaFecha: fechaFinal, 
        nuevoTipo: editTipo 
      }
    });
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

    await database.guardarDatos('statusKanban', { tareaTexto, nuevoStatus });
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
    return <p className="text-xs font-black uppercase tracking-wider text-slate-500 animate-pulse text-left">Actualizando...</p>;
  }

  return (
    <div className="space-y-6 text-left relative">
      
      <div className="flex justify-between items-end border-b border-zinc-800 pb-4">
        <div>
          <h2 className="text-2xl font-black text-sky-400 tracking-tighter uppercase italic">Tablero Kanban Global</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">
            Gestión Unificada de Actividades
          </p>
        </div>
        
        <div className="flex gap-2 items-center">
          <RutinaControl />
          <button 
            onClick={() => setMostrarModalNuevo(true)}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg transition-all cursor-pointer h-10"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Nueva Tarea
          </button>
        </div>
      </div>

      {/* 🎯 SECCIÓN DE FILTROS SUPERIORES */}
      <div className="flex gap-2 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800/40 items-center">
        <span className="text-[9px] font-black uppercase text-zinc-500 px-2 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Entorno:
        </span>
        <button
          onClick={() => setFiltroEntorno('Todos')}
          className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtoEntorno === 'Todos' ? 'bg-sky-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-slate-200 border border-zinc-800'}`}
        >
          Todos ({tareas.length})
        </button>
        <button
          onClick={() => setFiltroEntorno('Trabajo')}
          className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtoEntorno === 'Trabajo' ? 'bg-violet-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-violet-400 border border-zinc-800'}`}
        >
          Trabajo ({tareas.filter(t => (t.Tipo || "").toLowerCase().trim() === 'trabajo').length})
        </button>
        <button
          onClick={() => setFiltroEntorno('Casa')}
          className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtoEntorno === 'Casa' ? 'bg-amber-600 text-white shadow-md' : 'bg-zinc-900 text-zinc-400 hover:text-amber-400 border border-zinc-800'}`}
        >
          Casa ({tareas.filter(t => (t.Tipo || "").toLowerCase().trim() === 'casa').length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* COLUMNA: POR HACER */}
        <div 
          onDragOver={(e) => e.preventDefault()} 
          onDrop={(e) => manejarDropContenedor(e, 'Por Hacer')} 
          className="bg-zinc-900/40 border border-zinc-800/60 p-4 rounded-2xl min-h-[450px]"
        >
          <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center tracking-wider italic"><Clock className="w-3.5 h-3.5 mr-2 text-slate-500" /> Por Hacer</h3>
          <div className="space-y-3">
            {filtrarPorColumna('Por Hacer').map((task, i) => (
              <Tarjeta 
                key={i} 
                task={task} 
                onDragStart={manejarDragStart} 
                onDragOverCard={(e) => manejarDragOverCard(e, task.Tarea)}
                onDragLeaveCard={() => setTarjetaTargetId(null)}
                onDropCard={(e) => manejarDropContenedor(e, 'Por Hacer', task.Tarea)}
                isTarget={tarjetaTargetId === task.Tarea}
                onClick={() => abrirModalEdicion(task)} 
              />
            ))}
          </div>
        </div>

        {/* COLUMNA: EN PROCESO */}
        <div 
          onDragOver={(e) => e.preventDefault()} 
          onDrop={(e) => manejarDropContenedor(e, 'En Proceso')} 
          className="bg-blue-950/10 border border-blue-950/40 p-4 rounded-2xl min-h-[450px]"
        >
          <h3 className="text-xs font-black uppercase text-blue-400 mb-4 flex items-center tracking-wider italic"><Activity className="w-3.5 h-3.5 mr-2 text-blue-500" /> En Proceso</h3>
          <div className="space-y-3">
            {filtrarPorColumna('En Proceso').map((task, i) => (
              <Tarjeta 
                key={i} 
                task={task} 
                onDragStart={manejarDragStart} 
                onDragOverCard={(e) => manejarDragOverCard(e, task.Tarea)}
                onDragLeaveCard={() => setTarjetaTargetId(null)}
                onDropCard={(e) => manejarDropContenedor(e, 'En Proceso', task.Tarea)}
                isTarget={tarjetaTargetId === task.Tarea}
                onClick={() => abrirModalEdicion(task)} 
              />
            ))}
          </div>
        </div>

        {/* COLUMNA: HECHO */}
        <div 
          onDragOver={(e) => e.preventDefault()} 
          onDrop={(e) => manejarDropContenedor(e, 'Hecho')} 
          className="bg-emerald-950/10 border border-emerald-950/30 p-4 rounded-2xl min-h-[450px]"
        >
          <h3 className="text-xs font-black uppercase text-emerald-400 mb-4 flex items-center tracking-wider italic"><CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Hecho</h3>
          <div className="space-y-3">
            {filtrarPorColumna('Hecho').map((task, i) => (
              <Tarjeta 
                key={i} 
                task={task} 
                onDragStart={manejarDragStart} 
                onDragOverCard={(e) => manejarDragOverCard(e, task.Tarea)}
                onDragLeaveCard={() => setTarjetaTargetId(null)}
                onDropCard={(e) => manejarDropContenedor(e, 'Hecho', task.Tarea)}
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left">
            <div className="bg-zinc-800 p-4 text-slate-200 font-black uppercase text-[10px] tracking-widest flex justify-between items-center border-b border-zinc-700/50">
              <span>Nueva Tarea General</span>
              <button onClick={() => setMostrarModalNuevo(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={ejecutarGuardarTarea} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Descripción</label>
                <input 
                  type="text" 
                  required
                  value={nuevaTareaTexto}
                  onChange={(e) => setNuevaTareaTexto(e.target.value)}
                  placeholder="Ej. Escribir instrucción o pendiente..." 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-bold uppercase outline-none text-slate-200 focus:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-2">Clasificación de Entorno</label>
                <select 
                  value={nuevoTipo}
                  onChange={(e) => setNuevoTipo(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-bold uppercase outline-none text-slate-300 focus:border-zinc-700"
                >
                  <option value="Trabajo">TRABAJO</option>
                  <option value="Casa">CASA</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={guardando}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 rounded-lg text-[10px] font-black uppercase shadow-lg disabled:opacity-50 cursor-pointer mt-2"
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
          <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left border-t-4 ${editTipo.toLowerCase() === 'trabajo' ? 'border-t-violet-600' : 'border-t-amber-600'}`}>
            <form onSubmit={ejecutarModificarTarea} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black text-slate-200 uppercase tracking-tighter italic">Editar Tarea</h4>
                <button type="button" onClick={() => setMostrarModalEditar(false)} className="text-slate-500 hover:text-slate-300 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Descripción de la Tarea</label>
              <input 
                type="text" 
                required
                value={editTareaTexto}
                onChange={(e) => setEditTareaTexto(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-bold uppercase outline-none text-slate-200 focus:border-zinc-700 mb-4"
              />

              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Cambiar Entorno</label>
              <select 
                value={editTipo}
                onChange={(e) => setEditTipo(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-bold uppercase outline-none text-slate-300 focus:border-zinc-700 mb-4"
              >
                <option value="Trabajo">Trabajo</option>
                <option value="Casa">Casa</option>
              </select>
              
              <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Estatus actual</label>
              <select 
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-bold uppercase outline-none text-slate-300 focus:border-zinc-700 mb-4"
              >
                <option value="Por Hacer">Por Hacer</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Hecho">Hecho</option>
                <option value="Bullet">Bullet</option>
                <option value="Programado">Pausar (Snooze)</option>

              </select>

              {editStatus === 'Programado' && (
                <div className="mb-6 animate-fadeIn">
                  <label className="block text-[9px] font-black uppercase text-amber-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> ¿Qué día deseas que despierte la tarea?
                  </label>
                  <input 
                    type="date"
                    required
                    value={editFechaSnooze}
                    onChange={(e) => setEditFechaSnooze(e.target.value)}
                    className="w-full bg-zinc-950 border border-amber-900/40 rounded-lg p-2.5 text-xs font-bold font-mono text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button 
                  type="submit" 
                  disabled={guardando}
                  className={`w-full ${editTipo.toLowerCase() === 'trabajo' ? 'bg-violet-600 hover:bg-violet-700' : 'bg-amber-600 hover:bg-amber-700'} text-white py-3 rounded-lg text-[10px] font-black uppercase shadow-lg disabled:opacity-50 cursor-pointer`}
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>

                <div className="flex gap-2 mt-1">
                  <button 
                    type="button"
                    disabled={guardando}
                    onClick={ejecutarArchivarTarea}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-emerald-400 py-2.5 rounded-lg text-[10px] font-black uppercase flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Archivar
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setMostrarModalEditar(false)} 
                    className="flex-1 text-[10px] font-black uppercase text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// 🎯 SUBCOMPONENTE TARJETA CON SOPORTE DE REORDENAMIENTO INTERNO
// =========================================================================
function Tarjeta({ task, onDragStart, onDragOverCard, onDragLeaveCard, onDropCard, isTarget, onClick }) {
  const esTrabajo = (task.Tipo || "").toLowerCase().trim() === 'trabajo';
  
  const estiloEntornoTarjeta = esTrabajo 
    ? "bg-violet-950/20 border-violet-900/50 hover:border-violet-700/80 text-violet-100 shadow-[0_4px_12px_rgba(139,92,246,0.03)]" 
    : "bg-amber-950/20 border-amber-900/50 hover:border-amber-700/80 text-amber-100 shadow-[0_4px_12px_rgba(245,158,11,0.03)]";

  const estiloIconoCalendario = esTrabajo ? "text-violet-500/70" : "text-amber-500/70";

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.Tarea)}
      onDragOver={onDragOverCard}
      onDragLeave={onDragLeaveCard}
      onDrop={onDropCard}
      onClick={onClick}
      className={`border p-3 rounded-xl shadow-md cursor-grab active:cursor-grabbing transition-all duration-200 group ${estiloEntornoTarjeta} ${
        isTarget ? 'border-t-4 border-t-sky-400 bg-sky-950/30' : ''
      }`}
    >
      <p className="text-[11px] font-bold uppercase leading-snug tracking-tight pointer-events-none">
        {task.Tarea || 'SIN DESCRIPCIÓN'}
      </p>
      
      <div className="flex justify-between items-center mt-3 pt-1.5 border-t border-zinc-800/20 text-zinc-500 font-bold text-[8px] tracking-widest uppercase pointer-events-none">
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