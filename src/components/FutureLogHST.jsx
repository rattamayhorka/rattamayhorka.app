import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { X, Calendar, MapPin, Clock, Trash2, Filter, Repeat, Edit2, Plus, Save } from 'lucide-react';

export default function Reuniones() {
  const [reunionesRaw, setReunionesRaw] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Estado para controlar el filtro Casa / Trabajo / Todos
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  // Modales y Formulario
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEdicion, setModalEdicion] = useState(false); // 🟢 NUEVO: Modal de edición completa
  const [reunionSeleccionada, setReunionSeleccionada] = useState(null);
  const [guardando, setGuardando] = useState(false);
  
  // Formulario para creación
  const [formData, setFormData] = useState({
    comite: '',
    tipo_recurrencia: 'unica', // 'unica' | 'mensual_dia' | 'mensual_rango' | 'semanal_dias'
    fecha: '',
    dia_mes: 24,
    dias_mes: '15,16,17,18,19',
    dias_semana: [1, 3, 5], // 1=Lun, 3=Mié, 5=Vie
    hora: '09:00',
    lugar: '',
    tipo: 'Trabajo'
  });

  // 🟢 Formulario para edición
  const [formEditData, setFormEditData] = useState({
    id: null,
    comite: '',
    tipo_recurrencia: 'unica',
    fecha: '',
    dia_mes: 24,
    dias_mes: '15,16,17,18,19',
    dias_semana: [1, 3, 5],
    hora: '09:00',
    lugar: '',
    tipo: 'Trabajo'
  });

  const cargarReuniones = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('reuniones')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;
      setReunionesRaw(data || []);
    } catch (err) {
      console.error('Error al cargar reuniones desde Supabase:', err);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarReuniones();
  }, []);

  const manejarCambioInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const manejarCambioEditInput = (e) => {
    const { name, value } = e.target;
    setFormEditData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDiaSemana = (diaNum, esEdicion = false) => {
    if (esEdicion) {
      setFormEditData(prev => {
        const existe = prev.dias_semana.includes(diaNum);
        const actualizados = existe 
          ? prev.dias_semana.filter(d => d !== diaNum)
          : [...prev.dias_semana, diaNum].sort();
        return { ...prev, dias_semana: actualizados };
      });
    } else {
      setFormData(prev => {
        const existe = prev.dias_semana.includes(diaNum);
        const actualizados = existe 
          ? prev.dias_semana.filter(d => d !== diaNum)
          : [...prev.dias_semana, diaNum].sort();
        return { ...prev, dias_semana: actualizados };
      });
    }
  };

  const ejecutarGuardarReunion = async (e) => {
    e.preventDefault();
    if (!formData.comite.trim() || !formData.hora) return;
    if (formData.tipo_recurrencia === 'unica' && !formData.fecha) return;

    setGuardando(true);
    
    const payload = {
      comite: formData.comite.trim(),
      tipo_recurrencia: formData.tipo_recurrencia,
      fecha: formData.tipo_recurrencia === 'unica' ? formData.fecha : null,
      dia_mes: formData.tipo_recurrencia === 'mensual_dia' ? parseInt(formData.dia_mes, 10) : null,
      dias_mes: formData.tipo_recurrencia === 'mensual_rango' ? formData.dias_mes : null,
      dias_semana: formData.tipo_recurrencia === 'semanal_dias' ? formData.dias_semana.join(',') : null,
      hora: formData.hora,
      lugar: formData.lugar.trim(),
      tipo: formData.tipo
    };

    try {
      const { error } = await supabase.from('reuniones').insert([payload]);
      if (error) throw error;
    } catch (err) {
      console.error('Error al guardar evento en Supabase:', err);
    }

    setFormData({
      comite: '',
      tipo_recurrencia: 'unica',
      fecha: '',
      dia_mes: 24,
      dias_mes: '15,16,17,18,19',
      dias_semana: [1, 3, 5],
      hora: '09:00',
      lugar: '',
      tipo: 'Trabajo'
    });
    
    setModalAbierto(false);
    setGuardando(false);
    cargarReuniones();
  };

  // 🟢 ABRIR MODAL DE EDICIÓN CARGANDO LA REGLA ORIGINAL DE SUPABASE
  const abrirEdicionReunion = (item) => {
    const reglaOriginal = reunionesRaw.find(r => r.id === item.rawId);
    if (!reglaOriginal) return;

    let fechaFormatoInput = '';
    if (reglaOriginal.fecha) {
      if (reglaOriginal.fecha.includes('/')) {
        const [d, m, a] = reglaOriginal.fecha.split('/');
        fechaFormatoInput = `${a}-${m}-${d}`;
      } else {
        fechaFormatoInput = reglaOriginal.fecha;
      }
    }

    const diasSemanaArr = reglaOriginal.dias_semana 
      ? reglaOriginal.dias_semana.split(',').map(n => parseInt(n.trim(), 10))
      : [1, 3, 5];

    setReunionSeleccionada(item);
    setFormEditData({
      id: reglaOriginal.id,
      comite: reglaOriginal.comite || '',
      tipo_recurrencia: reglaOriginal.tipo_recurrencia || 'unica',
      fecha: fechaFormatoInput,
      dia_mes: reglaOriginal.dia_mes || 24,
      dias_mes: reglaOriginal.dias_mes || '15,16,17,18,19',
      dias_semana: diasSemanaArr,
      hora: reglaOriginal.hora || '09:00',
      lugar: reglaOriginal.lugar || '',
      tipo: reglaOriginal.tipo || 'Trabajo'
    });

    setModalEdicion(true);
  };

  // 🟢 GUARDAR CAMBIOS DE EDICIÓN
  const ejecutarActualizarReunion = async (e) => {
    e.preventDefault();
    if (!formEditData.comite.trim() || !formEditData.hora) return;

    setGuardando(true);

    const payload = {
      comite: formEditData.comite.trim(),
      tipo_recurrencia: formEditData.tipo_recurrencia,
      fecha: formEditData.tipo_recurrencia === 'unica' ? formEditData.fecha : null,
      dia_mes: formEditData.tipo_recurrencia === 'mensual_dia' ? parseInt(formEditData.dia_mes, 10) : null,
      dias_mes: formEditData.tipo_recurrencia === 'mensual_rango' ? formEditData.dias_mes : null,
      dias_semana: formEditData.tipo_recurrencia === 'semanal_dias' ? formEditData.dias_semana.join(',') : null,
      hora: formEditData.hora,
      lugar: formEditData.lugar.trim(),
      tipo: formEditData.tipo
    };

    try {
      const { error } = await supabase
        .from('reuniones')
        .update(payload)
        .eq('id', formEditData.id);

      if (error) throw error;
      setModalEdicion(false);
      setReunionSeleccionada(null);
      await cargarReuniones();
    } catch (err) {
      console.error('Error al actualizar evento en Supabase:', err);
    } finally {
      setGuardando(false);
    }
  };

  // 🟢 ELIMINAR DIRECTAMENTE DESDE EL MODAL DE EDICIÓN
  const ejecutarEliminarReunion = async () => {
    if (!formEditData.id) return;
    if (!window.confirm(`¿Seguro que deseas eliminar "${formEditData.comite}"?`)) return;

    setGuardando(true);
    const idEliminar = formEditData.id;

    try {
      const { error } = await supabase
        .from('reuniones')
        .delete()
        .eq('id', idEliminar);

      if (error) throw error;
      setReunionesRaw(prev => prev.filter(item => item.id !== idEliminar));
      setModalEdicion(false);
      setReunionSeleccionada(null);
    } catch (err) {
      console.error('Error al eliminar evento en Supabase:', err);
    } finally {
      setGuardando(false);
      cargarReuniones();
    }
  };

  // -------------------------------------------------------------
  // ⚡ GENERADOR VIRTUAL DE INSTANCIAS (ENFOQUE 1)
  // -------------------------------------------------------------
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diaSemanaHoy = hoy.getDay();
  const diasHastaDomingo = diaSemanaHoy === 0 ? 0 : 7 - diaSemanaHoy;
  let fechaLimite = new Date(hoy);
  if (diaSemanaHoy >= 1 && diaSemanaHoy <= 3) {
    fechaLimite.setDate(hoy.getDate() + diasHastaDomingo);
  } else {
    fechaLimite.setDate(hoy.getDate() + diasHastaDomingo + 7);
  }
  fechaLimite.setHours(23, 59, 59, 999);

  const instanciasCronograma = [];
  const curr = new Date(hoy);

  while (curr <= fechaLimite) {
    const fechaISO = curr.toISOString().split('T')[0];
    const [a, m, d] = fechaISO.split('-');
    const fechaFormatoUI = `${d}/${m}/${a}`;
    const diaDelMes = curr.getDate();
    const diaDeSemana = curr.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb

    reunionesRaw.forEach(regla => {
      let aplica = false;

      if (regla.tipo_recurrencia === 'unica') {
        const fechaReglaNormalizada = regla.fecha?.includes('/')
          ? regla.fecha.split('/').reverse().join('-')
          : regla.fecha;
        if (fechaReglaNormalizada === fechaISO) aplica = true;
      } else if (regla.tipo_recurrencia === 'mensual_dia') {
        if (parseInt(regla.dia_mes, 10) === diaDelMes) aplica = true;
      } else if (regla.tipo_recurrencia === 'mensual_rango') {
        const diasArray = (regla.dias_mes || '').split(',').map(n => parseInt(n.trim(), 10));
        if (diasArray.includes(diaDelMes)) aplica = true;
      } else if (regla.tipo_recurrencia === 'semanal_dias') {
        const diasSemanaArray = (regla.dias_semana || '').split(',').map(n => parseInt(n.trim(), 10));
        if (diasSemanaArray.includes(diaDeSemana)) aplica = true;
      }

      if (aplica) {
        const coincideFiltro = filtroTipo === 'Todos' || 
          (regla.tipo || 'Trabajo').toLowerCase().trim() === filtroTipo.toLowerCase().trim();

        if (coincideFiltro) {
          instanciasCronograma.push({
            rawId: regla.id,
            'Comité / Evento': regla.comite,
            Fecha: fechaFormatoUI,
            fechaObj: new Date(curr),
            Hora: regla.hora,
            'Lugar / Link': regla.lugar,
            Tipo: regla.tipo,
            tipo_recurrencia: regla.tipo_recurrencia
          });
        }
      }
    });

    curr.setDate(curr.getDate() + 1);
  }

  const grupos = {};
  let eventosHoy = 0;

  instanciasCronograma.forEach(item => {
    const fecha = item.Fecha;
    if (!grupos[fecha]) grupos[fecha] = [];
    grupos[fecha].push(item);

    if (item.fechaObj.getTime() === hoy.getTime()) {
      eventosHoy++;
    }
  });

  const parseFechaUI = (str) => {
    const [d, m, a] = str.split('/');
    return new Date(a, m - 1, d);
  };

  const fechasOrdenadas = Object.keys(grupos).sort((a, b) => parseFechaUI(a) - parseFechaUI(b));

  if (cargando) {
    return <p className="text-xs font-black uppercase tracking-wider text-theme-text/50 animate-pulse text-left p-4">Actualizando...</p>;
  }

  return (
    <div className="space-y-8 text-left">
      
      {/* Encabezado */}
      <div className="mb-8 border-b border-theme-border/40 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black text-theme-accent tracking-tighter uppercase italic">Future LOG</h2>
          <p className="text-[10px] font-bold text-theme-text/60 uppercase tracking-widest mt-1 italic">
            Cronograma de eventos — {filtroTipo}
          </p>
        </div>

        {/* CONTROLES Y FILTRO EN LA PARTE SUPERIOR */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          
          {/* BARRA DE FILTROS */}
          <div className="bg-theme-bg p-1 rounded-xl border border-theme-border flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-theme-text/50 ml-2 mr-1" />
            {['Todos', 'Casa', 'Trabajo'].map(tipo => (
              <button
                key={tipo}
                type="button"
                onClick={() => setFiltroTipo(tipo)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filtroTipo === tipo
                    ? 'bg-theme-accent text-theme-bg shadow'
                    : 'text-theme-text/60 hover:text-theme-text hover:bg-theme-border/20'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setModalAbierto(true)} 
            className="bg-theme-accent hover:opacity-90 text-theme-bg px-4 py-2 rounded-lg shadow-lg flex items-center text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Nuevo evento
          </button>
          
          <div className={`px-4 py-2 rounded-lg shadow-sm text-xs font-black uppercase italic tracking-tighter border ${
            eventosHoy > 0 ? 'text-theme-casa bg-theme-casa/10 border-theme-casa animate-pulse' : 'text-theme-accent bg-theme-bg border-theme-border'
          }`}>
            {eventosHoy} Eventos para Hoy
          </div>
        </div>
      </div>

      {/* RENDERIZADO DEL CRONOGRAMA */}
      <div className="space-y-10 relative pl-4">
        {fechasOrdenadas.length > 0 ? (
          fechasOrdenadas.map(fecha => {
            const items = grupos[fecha];
            const fechaObj = parseFechaUI(fecha);
            const diffTime = fechaObj - hoy;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let tituloFecha = fecha;
            let bgDia = "bg-theme-bg text-theme-text border-theme-border";
            let colorDia = "text-theme-accent";

            if (diffDays === 0) { 
              tituloFecha = "HOY"; 
              bgDia = "bg-theme-casa/20 text-theme-casa border-theme-casa"; 
              colorDia = "text-theme-casa"; 
            } else if (diffDays === 1) { 
              tituloFecha = "MAÑANA"; 
              bgDia = "bg-theme-accent/20 text-theme-accent border-theme-accent"; 
              colorDia = "text-theme-accent"; 
            }

            return (
              <div key={fecha} className="relative pl-8 border-l-2 border-theme-border/40">
                <div className={`absolute -left-[13px] top-0 h-6 w-6 rounded-full ${bgDia} flex items-center justify-center shadow-md border text-[11px]`}>
                  <Calendar className="w-3 h-3" />
                </div>
                
                <h3 className={`text-xs font-black uppercase tracking-widest ${colorDia} mb-6 italic`}>
                  {tituloFecha} — {fecha}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item, idx) => {
                    const esCasa = (item.Tipo || 'Trabajo').toString().toUpperCase() === 'CASA';
                    const estiloTarjeta = esCasa
                      ? "bg-theme-bg border-theme-casa/50 hover:border-theme-casa"
                      : "bg-theme-bg border-theme-trabajo/50 hover:border-theme-trabajo";

                    const estiloHora = esCasa
                      ? "text-theme-casa bg-theme-casa/10 border-theme-casa/30"
                      : "text-theme-trabajo bg-theme-trabajo/10 border-theme-trabajo/30";

                    return (
                      <div 
                        key={idx} 
                        onClick={() => abrirEdicionReunion(item)} // 🟢 ABRE MODAL CON EDITAR Y ELIMINAR
                        className={`${estiloTarjeta} p-5 rounded-xl shadow-sm flex flex-col justify-between cursor-pointer group transition-all duration-200 border`}
                      >
                        <div>
                          <div className="flex justify-between items-center">
                            <span className={`text-[9px] font-black uppercase italic px-2 py-0.5 rounded border w-fit flex items-center gap-1 ${estiloHora}`}>
                              <Clock className="w-2.5 h-2.5" /> {item.Hora}
                            </span>

                            {item.tipo_recurrencia !== 'unica' && (
                              <span title="Evento recurrente" className="text-[8px] font-black uppercase text-theme-accent bg-theme-accent/10 px-1.5 py-0.5 rounded flex items-center gap-1 border border-theme-accent/20">
                                <Repeat className="w-2.5 h-2.5" /> Recurrente
                              </span>
                            )}
                            
                            <div className="flex items-center gap-1 text-theme-text/40 group-hover:text-theme-accent transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <h4 className="text-sm font-black text-theme-text uppercase mt-3 mb-4 tracking-tight leading-snug">
                            {item['Comité / Evento']}
                          </h4>
                        </div>
                        <div className="flex items-center text-theme-text/70 font-bold italic border-t border-theme-border/30 pt-3 text-[9px] uppercase tracking-tighter">
                          <MapPin className="w-3 h-3 text-theme-text/40 mr-1.5 flex-shrink-0" />
                          <span className="truncate">{item['Lugar / Link'] || 'Sin ubicación'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-20 text-center text-theme-text/50 font-bold uppercase border-2 border-dashed border-theme-border rounded-xl max-w-xl mx-auto text-xs italic">
            Sin eventos o pendientes programados para este período.
          </div>
        )}
      </div>

      {/* MODAL 1: REGISTRAR REUNIÓN / NUEVA REGLA */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-theme-border max-h-[90vh] flex flex-col">
            <div className="bg-theme-bg p-4 text-theme-text font-black uppercase text-xs italic tracking-widest flex justify-between border-b border-theme-border">
              Registrar Evento / Agenda
              <button onClick={() => setModalAbierto(false)} className="cursor-pointer text-theme-text/50 hover:text-theme-text"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={ejecutarGuardarReunion} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Selección Tipo (Casa / Trabajo) */}
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Entorno</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Trabajo', 'Casa'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tipo: t }))}
                      className={`py-2 rounded-lg text-xs font-black uppercase transition-all border cursor-pointer ${
                        formData.tipo === t
                          ? 'bg-theme-accent text-theme-bg border-theme-accent'
                          : 'bg-theme-bg text-theme-text/60 border-theme-border hover:text-theme-text'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Nombre del Evento o Pendiente</label>
                <input 
                  type="text" 
                  name="comite" 
                  required 
                  value={formData.comite} 
                  onChange={manejarCambioInput} 
                  placeholder="Ej. Pagar CFE, Sacar basura, Cita Médica"
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none uppercase font-bold" 
                />
              </div>

              {/* Selector de Frecuencia / Recurrencia */}
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Tipo de Frecuencia</label>
                <select
                  name="tipo_recurrencia"
                  value={formData.tipo_recurrencia}
                  onChange={manejarCambioInput}
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none uppercase font-bold"
                >
                  <option value="unica">Fecha Única (Cita / Pendiente puntual)</option>
                  <option value="mensual_dia">Día Fijo del Mes (ej. cada 24)</option>
                  <option value="mensual_rango">Mensual (Rango de días ej. 15 al 19)</option>
                  <option value="semanal_dias">Semanal (Días fijos ej. Lun, Mié, Vie)</option>
                </select>
              </div>

              {/* Render condicional según la frecuencia */}
              {formData.tipo_recurrencia === 'unica' && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    name="fecha" 
                    required 
                    value={formData.fecha} 
                    onChange={manejarCambioInput} 
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none font-bold" 
                  />
                </div>
              )}

              {formData.tipo_recurrencia === 'mensual_dia' && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-accent mb-1">Día del mes (1 al 31)</label>
                  <input 
                    type="number" 
                    name="dia_mes" 
                    min="1"
                    max="31"
                    required 
                    value={formData.dia_mes} 
                    onChange={manejarCambioInput} 
                    placeholder="24"
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none font-bold" 
                  />
                  <span className="text-[8px] text-theme-text/40 block mt-1">Se repetirá automáticamente el día {formData.dia_mes || 'X'} de cada mes.</span>
                </div>
              )}

              {formData.tipo_recurrencia === 'mensual_rango' && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-accent mb-1">Días del mes (separados por coma)</label>
                  <input 
                    type="text" 
                    name="dias_mes" 
                    required 
                    value={formData.dias_mes} 
                    onChange={manejarCambioInput} 
                    placeholder="15,16,17,18,19"
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none font-bold" 
                  />
                  <span className="text-[8px] text-theme-text/40 block mt-1">Aparecerá en el cronograma durante esos días de cada mes.</span>
                </div>
              )}

              {formData.tipo_recurrencia === 'semanal_dias' && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-accent mb-1.5">Días que se repite</label>
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      { id: 1, label: 'L' },
                      { id: 2, label: 'M' },
                      { id: 3, label: 'X' },
                      { id: 4, label: 'J' },
                      { id: 5, label: 'V' },
                      { id: 6, label: 'S' },
                      { id: 0, label: 'D' },
                    ].map(dia => {
                      const activo = formData.dias_semana.includes(dia.id);
                      return (
                        <button
                          key={dia.id}
                          type="button"
                          onClick={() => toggleDiaSemana(dia.id, false)}
                          className={`py-2 rounded-lg text-xs font-black transition-all border cursor-pointer ${
                            activo
                              ? 'bg-theme-accent text-theme-bg border-theme-accent'
                              : 'bg-theme-bg text-theme-text/50 border-theme-border hover:text-theme-text'
                          }`}
                        >
                          {dia.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Hora</label>
                <input 
                  type="time" 
                  name="hora" 
                  required 
                  value={formData.hora} 
                  onChange={manejarCambioInput} 
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none font-bold" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Lugar, Link o Referencia</label>
                <input 
                  type="text" 
                  name="lugar" 
                  value={formData.lugar} 
                  onChange={manejarCambioInput} 
                  placeholder="Ej. App Banco, Sala 1, Casa"
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none uppercase font-bold" 
                />
              </div>

              <button 
                type="submit" 
                disabled={guardando} 
                className="w-full bg-theme-accent text-theme-bg font-black uppercase text-[10px] py-3 rounded-lg hover:opacity-90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {guardando ? 'Registrando...' : 'Guardar en Agenda'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🟢 MODAL 2: GESTIÓN COMPLETA DE EVENTO (EDITAR O ELIMINAR) */}
      {modalEdicion && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-theme-border max-h-[90vh] flex flex-col">
            <div className="bg-theme-bg p-4 text-theme-text font-black uppercase text-xs italic tracking-widest flex justify-between border-b border-theme-border">
              <span>Modificar Evento</span>
              <button onClick={() => { setModalEdicion(false); setReunionSeleccionada(null); }} className="cursor-pointer text-theme-text/50 hover:text-theme-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={ejecutarActualizarReunion} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Selección Tipo (Casa / Trabajo) */}
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Entorno</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Trabajo', 'Casa'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormEditData(prev => ({ ...prev, tipo: t }))}
                      className={`py-2 rounded-lg text-xs font-black uppercase transition-all border cursor-pointer ${
                        formEditData.tipo === t
                          ? 'bg-theme-accent text-theme-bg border-theme-accent'
                          : 'bg-theme-bg text-theme-text/60 border-theme-border hover:text-theme-text'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Nombre del Evento</label>
                <input 
                  type="text" 
                  name="comite" 
                  required 
                  value={formEditData.comite} 
                  onChange={manejarCambioEditInput} 
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none uppercase font-bold" 
                />
              </div>

              {/* Selector de Frecuencia / Recurrencia */}
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Frecuencia</label>
                <select
                  name="tipo_recurrencia"
                  value={formEditData.tipo_recurrencia}
                  onChange={manejarCambioEditInput}
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none uppercase font-bold"
                >
                  <option value="unica">Fecha Única</option>
                  <option value="mensual_dia">Día Fijo del Mes</option>
                  <option value="mensual_rango">Mensual (Rango de días)</option>
                  <option value="semanal_dias">Semanal (Días fijos)</option>
                </select>
              </div>

              {/* Render condicional según la frecuencia */}
              {formEditData.tipo_recurrencia === 'unica' && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Fecha</label>
                  <input 
                    type="date" 
                    name="fecha" 
                    required 
                    value={formEditData.fecha} 
                    onChange={manejarCambioEditInput} 
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none font-bold" 
                  />
                </div>
              )}

              {formEditData.tipo_recurrencia === 'mensual_dia' && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-accent mb-1">Día del mes (1 al 31)</label>
                  <input 
                    type="number" 
                    name="dia_mes" 
                    min="1"
                    max="31"
                    required 
                    value={formEditData.dia_mes} 
                    onChange={manejarCambioEditInput} 
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none font-bold" 
                  />
                </div>
              )}

              {formEditData.tipo_recurrencia === 'mensual_rango' && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-accent mb-1">Días del mes (separados por coma)</label>
                  <input 
                    type="text" 
                    name="dias_mes" 
                    required 
                    value={formEditData.dias_mes} 
                    onChange={manejarCambioEditInput} 
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none font-bold" 
                  />
                </div>
              )}

              {formEditData.tipo_recurrencia === 'semanal_dias' && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-accent mb-1.5">Días que se repite</label>
                  <div className="grid grid-cols-7 gap-1">
                    {[
                      { id: 1, label: 'L' },
                      { id: 2, label: 'M' },
                      { id: 3, label: 'X' },
                      { id: 4, label: 'J' },
                      { id: 5, label: 'V' },
                      { id: 6, label: 'S' },
                      { id: 0, label: 'D' },
                    ].map(dia => {
                      const activo = formEditData.dias_semana.includes(dia.id);
                      return (
                        <button
                          key={dia.id}
                          type="button"
                          onClick={() => toggleDiaSemana(dia.id, true)}
                          className={`py-2 rounded-lg text-xs font-black transition-all border cursor-pointer ${
                            activo
                              ? 'bg-theme-accent text-theme-bg border-theme-accent'
                              : 'bg-theme-bg text-theme-text/50 border-theme-border hover:text-theme-text'
                          }`}
                        >
                          {dia.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Hora</label>
                  <input 
                    type="time" 
                    name="hora" 
                    required 
                    value={formEditData.hora} 
                    onChange={manejarCambioEditInput} 
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none font-bold" 
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Lugar / Link</label>
                  <input 
                    type="text" 
                    name="lugar" 
                    value={formEditData.lugar} 
                    onChange={manejarCambioEditInput} 
                    placeholder="Ej. Sala 1, Casa"
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs text-theme-text focus:border-theme-accent outline-none uppercase font-bold" 
                  />
                </div>
              </div>

              {/* Botonera de acciones: Eliminar | Cancelar | Guardar */}
              <div className="flex gap-2 pt-2 border-t border-theme-border/40">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={ejecutarEliminarReunion}
                  title="Eliminar evento permanentemente"
                  className="p-3 bg-theme-bg border border-theme-border text-theme-text/40 hover:text-theme-casa hover:border-theme-casa/50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button 
                  type="button" 
                  onClick={() => { setModalEdicion(false); setReunionSeleccionada(null); }} 
                  className="flex-1 text-[10px] font-black uppercase text-theme-text/60 hover:text-theme-text cursor-pointer"
                >
                  Cancelar
                </button>

                <button 
                  type="submit" 
                  disabled={guardando} 
                  className="flex-1 bg-theme-accent text-theme-bg font-black uppercase text-[10px] py-3 rounded-lg hover:opacity-90 shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {guardando ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}