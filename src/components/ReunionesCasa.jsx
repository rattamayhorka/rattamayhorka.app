import { useEffect, useState } from 'react';
import { database } from '../api';
import { X, Calendar, MapPin, Clock, Trash2 } from 'lucide-react';

export default function ReunionesCasa() {
  const [reuniones, setReuniones] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Modales y Formulario
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [reunionSeleccionada, setReunionSeleccionada] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [formData, setFormData] = useState({
    comite: '',
    fecha: '',
    hora: '',
    lugar: ''
  });

  const parseFecha = (str) => {
    if (!str || !str.includes('/')) return new Date(2099, 1, 1);
    const p = str.split('/');
    return new Date(p[2], p[1] - 1, p[0]);
  };

  const cargarReuniones = async () => {
    setCargando(true);
    // Cambiado para hacer match con el doGet de la casa
    const data = await database.obtenerSeccion('reuniones_casa');
    setReuniones(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargarReuniones();
  }, []);

  const manejarCambioInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const ejecutarGuardarReunion = async (e) => {
    e.preventDefault();
    if (!formData.comite || !formData.fecha || !formData.hora || !formData.lugar) return;

    setGuardando(true);
    const fechaFormateada = formData.fecha.split('-').reverse().join('/');
    const payload = {
      comite: formData.comite,
      fecha: fechaFormateada,
      hora: formData.hora,
      lugar: formData.lugar
    };

    // Cambiado a la acción de inserción de citas de la casa
    await database.guardarDatos('guardarReunion_Casa', { datos: payload });

    setFormData({ comite: '', fecha: '', hora: '', lugar: '' });
    setModalAbierto(false);
    setGuardando(false);
    cargarReuniones();
  };

  const ejecutarEliminarReunion = async () => {
    if (!reunionSeleccionada) return;
    setGuardando(true);

    const nombreComite = reunionSeleccionada['Comité / Evento'];

    // Modificación optimista local
    setReuniones(prev => prev.filter(item => item['Comité / Evento'] !== nombreComite));
    setModalEliminar(false);

    // Cambiado a la acción de eliminación física de la casa
    await database.guardarDatos('eliminarReunion_Casa', { 
      comite: nombreComite 
    });

    setReunionSeleccionada(null);
    setGuardando(false);
    cargarReuniones();
  };

  const abrirConfirmacionEliminar = (item) => {
    setReunionSeleccionada(item);
    setModalEliminar(true);
  };

  if (cargando) {
    return <p className="text-xs font-black uppercase tracking-wider text-slate-500 animate-pulse text-left p-4">Actualizando...</p>;
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diaSemana = hoy.getDay();
  const diasHastaDomingoEstaSemana = diaSemana === 0 ? 0 : 7 - diaSemana;
  let fechaLimite = new Date(hoy);

  if (diaSemana >= 1 && diaSemana <= 3) {
    fechaLimite.setDate(hoy.getDate() + diasHastaDomingoEstaSemana);
  } else {
    fechaLimite.setDate(hoy.getDate() + diasHastaDomingoEstaSemana + 7);
  }
  fechaLimite.setHours(23, 59, 59, 999);

  const pendientesCronograma = reuniones.filter(item => {
    if (item.Status === "Concluido" || !item['Comité / Evento']) return false;
    const fechaObj = parseFecha(item.Fecha);
    return fechaObj >= hoy && fechaObj <= fechaLimite;
  });

  let swimmingEvents = 0;
  reuniones.forEach(item => {
    if (item.Status !== "Concluido" && item['Comité / Evento']) {
      const fechaObj = parseFecha(item.Fecha);
      if (fechaObj.getTime() === hoy.getTime()) {
        swimmingEvents++;
      }
    }
  });

  const grupos = {};
  pendientesCronograma.forEach(item => {
    const fecha = item.Fecha;
    if (!grupos[fecha]) grupos[fecha] = [];
    grupos[fecha].push(item);
  });

  const fechasOrdenadas = Object.keys(grupos).sort((a, b) => parseFecha(a) - parseFecha(b));

  return (
    <div className="space-y-8 text-left font-mono">
      
      {/* Encabezado */}
      <div className="mb-8 border-b border-zinc-800 pb-4 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-amber-400 tracking-tighter uppercase italic">Future LOG </h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Cronograma de eventos - Casa</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setModalAbierto(true)} 
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-4 py-2 rounded-lg shadow-lg flex items-center text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            Nuevo evento
          </button>
          
          <div className={`px-4 py-2 rounded-lg shadow-sm text-xs font-black uppercase italic tracking-tighter border ${
            swimmingEvents > 0 ? 'text-red-400 bg-red-950/80 border-red-900 animate-pulse' : 'text-amber-400 bg-amber-950/40 border-amber-900/40'
          }`}>
            {swimmingEvents} Eventos para Hoy
          </div>
        </div>
      </div>

      {/* RENDERIZADO DEL CRONOGRAMA */}
      <div className="space-y-10 relative pl-4">
        {fechasOrdenadas.length > 0 ? (
          fechasOrdenadas.map(fecha => {
            const items = grupos[fecha];
            const fechaObj = parseFecha(fecha);
            const diffTime = fechaObj - hoy;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let tituloFecha = fecha;
            let bgDia = "bg-zinc-800 text-slate-300 border-zinc-700";
            let colorDia = "text-amber-400";

            if (diffDays === 0) { 
              tituloFecha = "HOY"; bgDia = "bg-red-950 text-red-400 border-red-900"; colorDia = "text-red-400"; 
            } else if (diffDays === 1) { 
              tituloFecha = "MAÑANA"; bgDia = "bg-amber-950 text-amber-400 border-amber-900"; colorDia = "text-amber-400"; 
            }

            return (
              <div key={fecha} className="relative pl-8 border-l-2 border-zinc-800">
                <div className={`absolute -left-[13px] top-0 h-6 w-6 rounded-full ${bgDia} flex items-center justify-center shadow-md border text-[11px]`}>
                  <Calendar className="w-3 h-3" />
                </div>
                
                <h3 className={`text-xs font-black uppercase tracking-widest ${colorDia} mb-6 italic`}>
                  {tituloFecha} — {fecha}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((item, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => abrirConfirmacionEliminar(item)}
                      className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl shadow-sm flex flex-col justify-between cursor-pointer group hover:border-red-900/60 transition-all duration-200"
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-amber-400 uppercase italic bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/30 w-fit flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {item.Hora}
                          </span>
                          <Trash2 className="w-3.5 h-3.5 text-zinc-700 group-hover:text-red-400 transition-colors" />
                        </div>
                        <h4 className="text-sm font-black text-slate-200 uppercase mt-3 mb-4 tracking-tight leading-snug">
                          {item['Comité / Evento']}
                        </h4>
                      </div>
                      <div className="flex items-center text-zinc-400 font-bold italic border-t border-zinc-800/60 pt-3 text-[9px] uppercase tracking-tighter">
                        <MapPin className="w-3 h-3 text-zinc-500 mr-1.5 flex-shrink-0" />
                        <span className="truncate">{item['Lugar / Link']}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-20 text-center text-zinc-500 font-bold uppercase border-2 border-dashed border-zinc-800 rounded-xl max-w-xl mx-auto text-xs italic">
            Sin citas agendadas para este período.
          </div>
        )}
      </div>

      {/* MODAL 1: REGISTRAR REUNIÓN */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-zinc-800">
            <div className="bg-zinc-950 p-4 text-slate-50 font-black uppercase text-xs italic tracking-widest flex justify-between border-b border-zinc-800">
              Registrar Convocatoria Casa
              <button onClick={() => setModalAbierto(false)} className="cursor-pointer text-zinc-500 hover:text-slate-300"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={ejecutarGuardarReunion} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">Nombre de la Cita / Evento</label>
                <input type="text" name="comite" required value={formData.comite} onChange={manejarCambioInput} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-500 outline-none uppercase font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">Fecha</label>
                  <input type="date" name="fecha" required value={formData.fecha} onChange={manejarCambioInput} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-500 outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">Hora</label>
                  <input type="time" name="hora" required value={formData.hora} onChange={manejarCambioInput} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-500 outline-none font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-zinc-400 mb-1">Lugar o Ubicación</label>
                <input type="text" name="lugar" required value={formData.lugar} onChange={manejarCambioInput} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-slate-200 focus:border-amber-500 outline-none uppercase font-bold" />
              </div>
              <button type="submit" disabled={guardando} className="w-full bg-amber-500 text-slate-950 font-black uppercase text-[10px] py-3 rounded-lg hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-50">
                {guardando ? 'Registrando...' : 'Guardar en Agenda Casa'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMACIÓN DE ELIMINACIÓN */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden border border-zinc-800 border-t-8 border-t-rose-600 text-center p-6">
            <h4 className="text-sm font-black text-slate-100 uppercase tracking-tighter italic mb-2">¿Eliminar Cita?</h4>
            <p className="text-[11px] font-bold text-zinc-400 uppercase bg-zinc-950 p-3 rounded-lg border border-zinc-800 mb-6 leading-normal">
              {reunionSeleccionada?.['Comité / Evento']}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setModalEliminar(false); setReunionSeleccionada(null); }} className="flex-1 text-[10px] font-black uppercase text-zinc-400 hover:text-slate-200 cursor-pointer">Cancelar</button>
              <button 
                onClick={ejecutarEliminarReunion}
                disabled={guardando}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-slate-100 py-2.5 rounded-lg text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50"
              >
                {guardando ? 'Borrando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}