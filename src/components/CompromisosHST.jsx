import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { AlertTriangle, Calendar, CheckCircle2, User, Filter, X, ExternalLink, Clock, Plus, Trash2 } from 'lucide-react';

// --- COMPONENTE: LÍNEA DE TIEMPO VISUAL ESTILO TIMELINE ---
function GanttDashboard({ acuerdos, parseFecha, hoy, alHacerClickItem }) {
  const tareasActivas = acuerdos
    .filter(item => {
      const statusUpper = (item.Status || "").trim().toUpperCase();
      return statusUpper !== 'HECHO' && statusUpper !== 'TERMINADO';
    })
    .map(item => ({
      ...item,
      fechaFinObj: parseFecha(item['Fecha compromiso'])
    }))
    .sort((a, b) => a.fechaFinObj - b.fechaFinObj);

  if (tareasActivas.length === 0) return null;

  let fechaBase = new Date(hoy);
  if (tareasActivas[0].fechaFinObj < fechaBase) {
    fechaBase = new Date(tareasActivas[0].fechaFinObj);
    fechaBase.setDate(fechaBase.getDate() - 2);
  }

  const bloquesTimeline = tareasActivas.map((item, idx) => {
    const fechaInicioObj = idx === 0 ? new Date(fechaBase) : new Date(tareasActivas[idx - 1].fechaFinObj);
    
    if (fechaInicioObj >= item.fechaFinObj) {
      fechaInicioObj.setTime(item.fechaFinObj.getTime() - (1 * 24 * 60 * 60 * 1000));
    }

    const duracionDias = Math.ceil((item.fechaFinObj.getTime() - fechaInicioObj.getTime()) / (1000 * 60 * 60 * 24));
    const diasRestantes = Math.ceil((item.fechaFinObj.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    return {
      ...item,
      fechaInicioObj,
      duracionDias,
      diasRestantes
    };
  });

  const totalDiasLinea = bloquesTimeline.reduce((acc, b) => acc + b.duracionDias, 0);

  return (
    <div className="bg-theme-bg p-6 rounded-2xl border border-theme-border/80 mb-6 shadow-inner text-left">
      <div className="flex items-center gap-2 mb-8">
        <div className="w-2 h-2 rounded-full bg-theme-accent shadow-sm" />
        <h3 className="text-xs font-black uppercase text-theme-text/60 tracking-wider italic">
          Timeline
        </h3>
      </div>

      <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-theme-border scrollbar-track-transparent">
        <div className="min-w-[1100px] flex items-start relative py-4 px-2">
          {bloquesTimeline.map((item, idx) => {
            const esVencido = item.diasRestantes < 0;
            const textoLimpio = (item.Acciones || "").replace(/\[(.*?)\]/, "").trim();
            const anchoPorcentaje = (item.duracionDias / totalDiasLinea) * 100;

            let colorBloque = "bg-theme-bg border-theme-border text-theme-accent hover:border-theme-accent";
            let colorTextoComite = "text-theme-accent";
            
            const origen = (item.Tema || "").trim().toUpperCase();
            if (esVencido) {
              colorBloque = "bg-theme-casa/10 border-theme-casa text-theme-casa hover:bg-theme-casa/20 animate-pulse";
              colorTextoComite = "text-theme-casa";
            } else if (origen.includes("TECNOVIGILANCIA") || origen === "CTV") {
              colorBloque = "bg-theme-accent/10 border-theme-accent/60 text-theme-accent hover:bg-theme-accent/20";
              colorTextoComite = "text-theme-accent";
            } else if (origen.includes("BIOMÉDICA") || origen.includes("BIOMEDICA") || origen === "UHTV") {
              colorBloque = "bg-theme-trabajo/10 border-theme-trabajo/60 text-theme-trabajo hover:bg-theme-trabajo/20";
              colorTextoComite = "text-theme-trabajo";
            } else if (origen.includes("COMPRA")) {
              colorBloque = "bg-theme-casa/10 border-theme-casa/60 text-theme-casa hover:bg-theme-casa/20";
              colorTextoComite = "text-theme-casa";
            }

            return (
              <div 
                key={idx}
                className="flex flex-col flex-1"
                style={{ width: `${Math.max(anchoPorcentaje, 16)}%`, minWidth: '180px' }}
              >
                <div className="mb-3 px-2 flex flex-col items-center text-center">
                  <span className="text-[9px] font-black text-theme-text/80 tracking-tighter uppercase bg-theme-bg border border-theme-border px-2 py-0.5 rounded-md">
                    {item['Fecha compromiso']}
                  </span>
                  <span className={`text-[8px] font-bold mt-1 uppercase tracking-tight ${esVencido ? 'text-theme-casa' : 'text-theme-text/50'}`}>
                    {esVencido ? `Vencido hace ${Math.abs(item.diasRestantes)}d` : `Faltan ${item.diasRestantes}d`}
                  </span>
                </div>

                <div 
                  onClick={() => alHacerClickItem(item)}
                  className={`relative h-10 border flex items-center justify-center cursor-pointer transition-all duration-200 shadow-sm mx-0.5 rounded-xl text-center group ${colorBloque}`}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest pointer-events-none truncate px-2">
                    {item.duracionDias} {item.duracionDias === 1 ? 'Día' : 'Días'}
                  </span>
                  
                  {idx < bloquesTimeline.length - 1 && (
                    <div className="absolute -right-1.5 top-1/2 transform -translate-y-1/2 text-theme-text/40 font-bold text-xs z-20 pointer-events-none group-hover:text-theme-text transition-colors">
                      ➔
                    </div>
                  )}
                </div>

                <div className="mt-3 px-3 text-center flex flex-col items-center">
                  <span className={`text-[8px] font-extrabold uppercase tracking-widest mb-1 ${colorTextoComite}`}>
                    {item.Tema ? item.Tema.replace('COMITE DE ', '').substring(0, 12) : 'ACUERDO'}
                  </span>
                  <p 
                    onClick={() => alHacerClickItem(item)}
                    className="text-[10px] font-black uppercase text-theme-text leading-snug tracking-tight line-clamp-2 cursor-pointer hover:text-theme-accent transition-colors"
                    title={textoLimpio}
                  >
                    {textoLimpio}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Proyectos() {
  const [acuerdos, setAcuerdos] = useState([]);
  const [acuerdosFiltrados, setAcuerdosFiltrados] = useState([]);
  const [comitesDisponibles, setComitesDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtroActivo, setFiltroActivo] = useState('Todos');

  // Control de Modal de Edición
  const [mostrarModal, setMostrarModal] = useState(false);
  const [acuerdoSeleccionado, setAcuerdoSeleccionado] = useState(null);
  const [nuevoStatus, setNuevoStatus] = useState('PENDIENTE');
  const [textoAcuerdoEditado, setTextoAcuerdoEditado] = useState('');
  const [temaEditado, setTemaEditado] = useState('');
  const [responsableEditado, setResponsableEditado] = useState('');
  const [fechaEditada, setFechaEditada] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Control de Modal de Creación
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
  const [formNuevo, setFormNuevo] = useState({
    acciones: '',
    tema: 'CTV',
    responsable: 'Jefe de Biomédica',
    fecha_compromiso: '',
    status: 'PENDIENTE'
  });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const cargarAcuerdos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('minutas_compromisos')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      const formateados = (data || []).map(row => ({
        id: row.id,
        Acciones: row.acciones,
        Status: row.status,
        Tema: row.tema,
        Responsable: row.responsable,
        'Fecha compromiso': row.fecha_compromiso
      }));

      setAcuerdos(formateados);
      
      const temasUnicos = [...new Set(formateados
        .map(item => (item.Tema || "").trim())
        .filter(tema => tema !== "")
      )];
      setComitesDisponibles(temasUnicos);
    } catch (err) {
      console.error("Error al cargar compromisos desde Supabase:", err);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarAcuerdos();
  }, []);

  useEffect(() => {
    const datosVisibles = acuerdos.filter(item => (item.Status || "").trim().toUpperCase() !== 'TERMINADO');

    if (filtroActivo === 'Todos') {
      setAcuerdosFiltrados(datosVisibles);
    } else {
      setAcuerdosFiltrados(datosVisibles.filter(item => 
        (item.Tema || "").trim().toUpperCase() === filtroActivo.toUpperCase()
      ));
    }
  }, [acuerdos, filtroActivo]);

  const parseFecha = (str) => {
    if (!str || (!str.includes('/') && !str.includes('-'))) return new Date(2099, 1, 1);
    const partes = str.includes('-') ? str.split('-') : str.split('/');
    if (partes[0].length === 4) {
      return new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
    }
    return new Date(parseInt(partes[2], 10), parseInt(partes[1], 10) - 1, parseInt(partes[0], 10));
  };

  const abrirEdicion = (item) => {
    setAcuerdoSeleccionado(item);
    setNuevoStatus(item.Status || 'PENDIENTE');
    setTextoAcuerdoEditado(item.Acciones || '');
    setTemaEditado(item.Tema || 'CTV');
    setResponsableEditado(item.Responsable || 'Jefe de Biomédica');
    
    // Normalizar fecha para el input type="date"
    const fechaObj = parseFecha(item['Fecha compromiso']);
    const a = fechaObj.getFullYear();
    const m = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const d = String(fechaObj.getDate()).padStart(2, '0');
    setFechaEditada(`${a}-${m}-${d}`);

    setMostrarModal(true);
  };

  const ejecutarActualizarEstatus = async (e) => {
    e.preventDefault();
    if (!acuerdoSeleccionado) return;

    setGuardando(true);
    
    // Reconstruir fecha en formato DD/MM/YYYY
    let fechaGuardar = acuerdoSeleccionado['Fecha compromiso'];
    if (fechaEditada && fechaEditada.includes('-')) {
      const [a, m, d] = fechaEditada.split('-');
      fechaGuardar = `${d}/${m}/${a}`;
    }

    setAcuerdos(prev => prev.map(item => 
      item.id === acuerdoSeleccionado.id 
        ? { 
            ...item, 
            Acciones: textoAcuerdoEditado, 
            Status: nuevoStatus,
            Tema: temaEditado,
            Responsable: responsableEditado,
            'Fecha compromiso': fechaGuardar
          } 
        : item
    ));

    try {
      const { error } = await supabase
        .from('minutas_compromisos')
        .update({
          acciones: textoAcuerdoEditado,
          status: nuevoStatus,
          tema: temaEditado,
          responsable: responsableEditado,
          fecha_compromiso: fechaGuardar
        })
        .eq('id', acuerdoSeleccionado.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error al actualizar compromiso en Supabase:", error);
    }
    setMostrarModal(false);
    setAcuerdoSeleccionado(null);
    setGuardando(false);
    cargarAcuerdos();
  };

  const ejecutarCrearCompromiso = async (e) => {
    e.preventDefault();
    if (!formNuevo.acciones.trim() || !formNuevo.fecha_compromiso) return alert("Completa los campos obligatorios");

    setGuardando(true);

    const [a, m, d] = formNuevo.fecha_compromiso.split('-');
    const fechaFormatoDDMM = `${d}/${m}/${a}`;

    const payload = {
      acciones: formNuevo.acciones.trim(),
      status: formNuevo.status,
      tema: formNuevo.tema.trim().toUpperCase(),
      responsable: formNuevo.responsable.trim(),
      fecha_compromiso: fechaFormatoDDMM
    };

    try {
      const { error } = await supabase.from('minutas_compromisos').insert([payload]);
      if (error) throw error;

      setFormNuevo({
        acciones: '',
        tema: 'CTV',
        responsable: 'Jefe de Biomédica',
        fecha_compromiso: '',
        status: 'PENDIENTE'
      });
      setMostrarModalCrear(false);
      await cargarAcuerdos();
    } catch (err) {
      console.error("Error al crear compromiso en Supabase:", err);
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarEliminarCompromiso = async () => {
    if (!acuerdoSeleccionado) return;
    if (!window.confirm("¿Deseas eliminar definitivamente este compromiso?")) return;

    setGuardando(true);

    try {
      const { error } = await supabase
        .from('minutas_compromisos')
        .delete()
        .eq('id', acuerdoSeleccionado.id);

      if (error) throw error;

      setAcuerdos(prev => prev.filter(item => item.id !== acuerdoSeleccionado.id));
      setMostrarModal(false);
      setAcuerdoSeleccionado(null);
    } catch (err) {
      console.error("Error al eliminar compromiso en Supabase:", err);
    } finally {
      setGuardando(false);
      cargarAcuerdos();
    }
  };

  const obtenerCriticos = () => {
    return acuerdosFiltrados.filter(item => {
      const fVal = parseFecha(item['Fecha compromiso']);
      const statusUpper = (item.Status || "").trim().toUpperCase();
      return fVal <= hoy && statusUpper !== 'HECHO';
    });
  };

  const obtenerProximos = () => {
    return acuerdosFiltrados.filter(item => {
      const fVal = parseFecha(item['Fecha compromiso']);
      const statusUpper = (item.Status || "").trim().toUpperCase();
      return fVal > hoy && statusUpper !== 'HECHO';
    });
  };

  const obtenerHistorial = () => {
    return acuerdosFiltrados.filter(item => (item.Status || "").trim().toUpperCase() === 'HECHO');
  };

  if (cargando) {
    return <p className="text-xs font-black uppercase tracking-wider text-theme-text/50 animate-pulse text-left">Actualizando...</p>;
  }

  const totalCriticosGeneral = acuerdos.filter(item => {
    const fVal = parseFecha(item['Fecha compromiso']);
    const statusUpper = (item.Status || "").trim().toUpperCase();
    return fVal <= hoy && statusUpper !== 'HECHO' && statusUpper !== 'TERMINADO';
  }).length;

  return (
    <div className="space-y-6 text-left relative font-mono">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-theme-border pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-black text-theme-accent tracking-tighter uppercase italic">Seguimiento de Minutas</h2>
          <p className="text-[10px] font-bold text-theme-text/60 uppercase tracking-widest mt-1 italic">Dashboard de Acuerdos / Compromisos</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setMostrarModalCrear(true)}
            className="bg-theme-accent hover:opacity-90 text-theme-bg px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Nuevo Compromiso
          </button>
          
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-tighter text-theme-bg ${totalCriticosGeneral > 0 ? 'bg-theme-casa animate-pulse' : 'bg-theme-trabajo'}`}>
            {totalCriticosGeneral} Vencidos
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 bg-theme-bg p-2 rounded-xl border border-theme-border/40 items-center">
        <span className="text-[9px] font-black uppercase text-theme-text/60 px-2 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filtrar:
        </span>
        <button
          onClick={() => setFiltroActivo('Todos')}
          className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtroActivo === 'Todos' ? 'bg-theme-accent text-theme-bg shadow-md' : 'bg-theme-bg text-theme-text/70 hover:text-theme-text border border-theme-border'}`}
        >
          Todos
        </button>
        {comitesDisponibles.map((comite) => (
          <button
            key={comite}
            onClick={() => setFiltroActivo(comite)}
            className={`text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer ${filtroActivo === comite ? 'bg-theme-accent text-theme-bg shadow-md' : 'bg-theme-bg text-theme-text/70 hover:text-theme-text border border-theme-border'}`}
          >
            {comite.replace('COMITE DE ', '').replace('DEPARTAMENTO DE ', '').replace('UNIDAD DE ', '')}
          </button>
        ))}
      </div>

      {/* TIMELINE VISUAL */}
      <GanttDashboard
        acuerdos={acuerdosFiltrados} 
        parseFecha={parseFecha} 
        hoy={hoy} 
        alHacerClickItem={abrirEdicion} 
      />

      {/* Bloques del Dashboard */}
      <div className="space-y-8">
        <div className="bg-theme-bg p-5 rounded-2xl border border-theme-casa/40">
          <h3 className="text-xs font-black uppercase text-theme-casa mb-4 flex items-center tracking-wider italic"><AlertTriangle className="w-4 h-4 mr-2" /> Acciones Críticas (Vencidas)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {obtenerCriticos().length > 0 ? obtenerCriticos().map((item, i) => <TarjetaAcuerdo key={i} item={item} esVencido={true} onClick={() => abrirEdicion(item)} />) : <p className="text-xs font-bold text-theme-text/50 uppercase italic col-span-full p-2">Sin acuerdos vencidos en esta sección.</p>}
          </div>
        </div>

        <div className="bg-theme-bg p-5 rounded-2xl border border-theme-border">
          <h3 className="text-xs font-black uppercase text-theme-accent mb-4 flex items-center tracking-wider italic"><Calendar className="w-4 h-4 mr-2" /> Próximos Compromisos (En Curso)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {obtenerProximos().length > 0 ? obtenerProximos().map((item, i) => <TarjetaAcuerdo key={i} item={item} esVencido={false} onClick={() => abrirEdicion(item)} />) : <p className="text-xs font-bold text-theme-text/50 uppercase italic col-span-full p-2">No hay compromisos futuros programados.</p>}
          </div>
        </div>

        <div className="bg-theme-bg/50 p-5 rounded-2xl border border-dashed border-theme-border">
          <h3 className="text-xs font-black uppercase text-theme-text/40 mb-4 flex items-center tracking-wider italic"><CheckCircle2 className="w-4 h-4 mr-2" /> Historial de Acuerdos Concluidos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {obtenerHistorial().length > 0 ? obtenerHistorial().map((item, i) => <TarjetaAcuerdo key={i} item={item} esHecho={true} onClick={() => abrirEdicion(item)} />) : <p className="text-xs font-bold text-theme-text/40 uppercase italic col-span-full p-2">Sin registros archivados.</p>}
          </div>
        </div>
      </div>

      {/* MODAL 1: NUEVO COMPROMISO */}
      {mostrarModalCrear && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-bg border border-theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-left border-t-4 border-t-theme-accent">
            <form onSubmit={ejecutarCrearCompromiso} className="p-6 space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-sm font-black text-theme-text uppercase tracking-tighter italic flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-theme-accent" /> Registrar Compromiso
                </h4>
                <button type="button" onClick={() => setMostrarModalCrear(false)} className="text-theme-text/50 hover:text-theme-text cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">
                  Acción / Acuerdo (Puedes incluir [Nota_Obsidian])
                </label>
                <textarea 
                  required
                  rows={3}
                  value={formNuevo.acciones}
                  onChange={(e) => setFormNuevo(prev => ({ ...prev, acciones: e.target.value }))}
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-xs font-bold text-theme-text uppercase leading-snug outline-none focus:border-theme-accent resize-none"
                  placeholder="Ej. Capacitación de bombas de infusión [PNO-01_Capacitacion]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">Comité / Tema</label>
                  <input
                    type="text"
                    required
                    list="lista-temas-sugeridos"
                    value={formNuevo.tema}
                    onChange={(e) => setFormNuevo(prev => ({ ...prev, tema: e.target.value }))}
                    placeholder="Ej. CTV, UHTV"
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase text-theme-text outline-none focus:border-theme-accent"
                  />
                  <datalist id="lista-temas-sugeridos">
                    {comitesDisponibles.map((t, idx) => <option key={idx} value={t} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">Responsable</label>
                  <input
                    type="text"
                    required
                    value={formNuevo.responsable}
                    onChange={(e) => setFormNuevo(prev => ({ ...prev, responsable: e.target.value }))}
                    placeholder="Ej. Jefe de Biomédica"
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold text-theme-text outline-none focus:border-theme-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">Fecha Compromiso</label>
                  <input
                    type="date"
                    required
                    value={formNuevo.fecha_compromiso}
                    onChange={(e) => setFormNuevo(prev => ({ ...prev, fecha_compromiso: e.target.value }))}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold text-theme-text outline-none focus:border-theme-accent"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">Estatus Inicial</label>
                  <select 
                    value={formNuevo.status}
                    onChange={(e) => setFormNuevo(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent cursor-pointer"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="HECHO">HECHO</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setMostrarModalCrear(false)} 
                  className="flex-1 text-[10px] font-black uppercase text-theme-text/60 hover:text-theme-text cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={guardando}
                  className="flex-1 bg-theme-accent hover:opacity-90 text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {guardando ? 'Guardando...' : 'Crear Compromiso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDITAR COMPROMISO & ELIMINAR */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-bg border border-theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-left border-t-4 border-t-theme-accent">
            <form onSubmit={ejecutarActualizarEstatus} className="p-6 space-y-4">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-sm font-black text-theme-text uppercase tracking-tighter italic">Editar Compromiso</h4>
                <button type="button" onClick={() => setMostrarModal(false)} className="text-theme-text/50 hover:text-theme-text cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div>
                <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">Texto del Acuerdo / Nota Obsidian entre [ ]</label>
                <textarea 
                  value={textoAcuerdoEditado}
                  onChange={(e) => setTextoAcuerdoEditado(e.target.value)}
                  rows={3}
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-xs font-bold text-theme-text uppercase leading-snug outline-none focus:border-theme-accent resize-none"
                  placeholder="Escribe el compromiso aquí... [nombre_nota_obsidian]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">Comité / Tema</label>
                  <input
                    type="text"
                    value={temaEditado}
                    onChange={(e) => setTemaEditado(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase text-theme-text outline-none focus:border-theme-accent"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">Responsable</label>
                  <input
                    type="text"
                    value={responsableEditado}
                    onChange={(e) => setResponsableEditado(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold text-theme-text outline-none focus:border-theme-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">Fecha Compromiso</label>
                  <input
                    type="date"
                    value={fechaEditada}
                    onChange={(e) => setFechaEditada(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold text-theme-text outline-none focus:border-theme-accent"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase text-theme-text/60 tracking-wider mb-1">Estatus en Minuta</label>
                  <select 
                    value={nuevoStatus}
                    onChange={(e) => setNuevoStatus(e.target.value)}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent cursor-pointer"
                  >
                    <option value="PENDIENTE">PENDIENTE</option>
                    <option value="HECHO">HECHO (Mover a Historial)</option>
                    <option value="TERMINADO">TERMINADO (Archivar y Ocultar)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={ejecutarEliminarCompromiso}
                  title="Eliminar acuerdo permanentemente"
                  className="p-3 bg-theme-bg border border-theme-border text-theme-text/40 hover:text-red-400 hover:border-red-400/50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button 
                  type="button" 
                  onClick={() => setMostrarModal(false)} 
                  className="flex-1 text-[10px] font-black uppercase text-theme-text/60 hover:text-theme-text cursor-pointer"
                >
                  Cancelar
                </button>

                <button 
                  type="submit" 
                  disabled={guardando}
                  className="flex-1 bg-theme-accent hover:opacity-90 text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {guardando ? 'Sincronizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Subcomponente TarjetaAcuerdo
function TarjetaAcuerdo({ item, esVencido, esHecho, onClick }) {
  let badgeColor = "bg-theme-bg text-theme-text/70 border-theme-border";
  const origen = (item.Tema || "").trim().toUpperCase();
  if (origen.includes("TECNOVIGILANCIA") || origen === "CTV") badgeColor = "bg-theme-accent/10 text-theme-accent border-theme-accent/40";
  else if (origen.includes("BIOMÉDICA") || origen.includes("BIOMEDICA") || origen === "UHTV") badgeColor = "bg-theme-trabajo/10 text-theme-trabajo border-theme-trabajo/40";
  else if (origen.includes("COMPRA")) badgeColor = "bg-theme-casa/10 text-theme-casa border-theme-casa/40";

  const NOMBRE_VAULT = "Obsidian"; 

  const textoOriginal = item.Acciones || "";
  const matchCorchetes = textoOriginal.match(/\[(.*?)\]/);
  const nombreArchivoObsidian = matchCorchetes ? matchCorchetes[1].trim() : null;
  const textoLimpioParaMostrar = textoOriginal.replace(/\[(.*?)\]/, "").trim();

  const urlObsidian = nombreArchivoObsidian 
    ? `obsidian://open?vault=${encodeURIComponent(NOMBRE_VAULT)}&file=${encodeURIComponent(nombreArchivoObsidian)}`
    : null;

  let estiloFondoTarjeta = "border-theme-border/80";
  if (esHecho) {
    estiloFondoTarjeta = "opacity-40 saturate-50 border-theme-border";
  } else if (esVencido) {
    estiloFondoTarjeta = "border-l-4 border-l-theme-casa border-theme-casa/40 bg-theme-casa/5";
  } else if (urlObsidian) {
    estiloFondoTarjeta = "border-theme-accent/60 bg-theme-accent/5 hover:border-theme-accent shadow-md";
  }

  const manejarClickObsidian = (e) => {
    e.stopPropagation(); 
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-theme-bg border p-4 rounded-xl shadow-md flex flex-col justify-between group min-h-[140px] cursor-pointer hover:border-theme-border/80 transition-all duration-300 ${estiloFondoTarjeta}`}
    >
      <div>
        <div className="flex justify-between items-start mb-3 gap-2">
          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${badgeColor}`}>{item.Tema}</span>
          
          <div className="flex items-center gap-1.5">
            {urlObsidian && (
              <a 
                href={urlObsidian} 
                onClick={manejarClickObsidian}
                title={`Abrir nota "${nombreArchivoObsidian}" en Obsidian`}
                className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded border bg-theme-accent text-theme-bg border-theme-accent hover:opacity-80 transition-all duration-200"
              >
                OBSIDIAN <ExternalLink className="w-2 h-2" />
              </a>
            )}

            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
              esHecho ? 'bg-theme-trabajo/20 text-theme-trabajo border-theme-trabajo/40' : (esVencido ? 'bg-theme-casa/20 text-theme-casa border-theme-casa/40' : 'bg-theme-bg text-theme-text/60 border-theme-border')
            }`}>{item.Status}</span>
          </div>
        </div>
        <p className="text-[11px] text-theme-text font-medium leading-snug uppercase tracking-tight line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
          {textoLimpioParaMostrar}
        </p>
      </div>
      
      <div className="flex justify-between items-center mt-4 pt-2 border-t border-theme-border/40 text-theme-text/60 font-bold text-[9px]">
        <span className="italic text-theme-text/70 flex items-center gap-1">
          <User className="w-3 h-3 text-theme-text/40" /> {item.Responsable || 'BIOMÉDICA'}
        </span>
        <span className={`flex items-center gap-1 font-black ${esVencido ? 'text-theme-casa' : 'text-theme-text'}`}>
          <Calendar className="w-3 h-3 text-theme-text/50" /> {item['Fecha compromiso']}
        </span>
      </div>
    </div>
  );
}