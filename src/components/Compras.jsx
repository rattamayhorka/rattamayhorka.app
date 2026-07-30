import { useEffect, useState } from 'react';
import { database } from '../api';
import { X, Star } from 'lucide-react';

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Modales
  const [modalWishlist, setModalWishlist] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const [inputWishlist, setInputWishlist] = useState("");
  
  // Control de edición
  const [articuloAEditar, setArticuloAEditar] = useState("");
  const [statusActualEditar, setStatusActualEditar] = useState("");
  const [nuevoStatus, setNuevoStatus] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Configuración de Estados y Colores idéntica a tu HTML
  const configEstados = [
    { nombre: "Por Cotizar Biomedica", color: "bg-red-500", texto: "text-red-400" },
    { nombre: "Por Cotizar Compras", color: "bg-red-500", texto: "text-red-400" },
    { nombre: "Por Autorizar", color: "bg-orange-500", texto: "text-orange-400" },
    { nombre: "Por hacer Requisicion", color: "bg-amber-500", texto: "text-amber-400" },
    { nombre: "En espera de OC", color: "bg-yellow-500", texto: "text-yellow-400" },
    { nombre: "En espera de Material", color: "bg-sky-500", texto: "text-sky-400" },
    { nombre: "Por hacer Recepcion en SIHO", color: "bg-indigo-500", texto: "text-indigo-400" },
    { nombre: "Por entregar a CxP", color: "bg-emerald-500", texto: "text-emerald-400" }
  ];

  const cargarCompras = async () => {
    setCargando(true);
    const data = await database.obtenerSeccion('compras');
    
    // Clasificación y ordenamiento idéntico a tu función fetchCompras()
    const validos = data.filter(item => {
      const st = item.Status || "";
      return !st.includes("Concluido") && st !== "";
    });

    validos.sort((a, b) => {
      const indexA = configEstados.findIndex(e => (a.Status || "").includes(e.nombre));
      const indexB = configEstados.findIndex(e => (b.Status || "").includes(e.nombre));
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    setCompras(validos);
    setCargando(false);
  };

  useEffect(() => {
    cargarCompras();
  }, []);

  const abrirModalStatus = (articulo, status) => {
    setArticuloAEditar(articulo);
    setStatusActualEditar(status);
    setNuevoStatus(status.split(' - ')[0].trim());
    setModalStatus(true);
  };

  const ejecutarGuardarWishlist = async () => {
    if (!inputWishlist.trim()) return alert("Escribe el nombre del artículo");
    setGuardando(true);
    
    // CORRECCIÓN: La acción exacta en code.gs es 'guardarWishlist' 
    // y el parámetro que lee tu script en la raíz es 'articulo'
    await database.guardarDatos('guardarWishlist', { 
      articulo: inputWishlist 
    });
    
    setInputWishlist("");
    setModalWishlist(false);
    setGuardando(false);
    cargarCompras();
  };
  const ejecutarCambioStatus = async () => {
    setGuardando(true);
    
    // Modificación optimista local instantánea en pantalla
    setCompras(prev => prev.map(item => 
      item['Artículo / Servicio'] === articuloAEditar ? { ...item, Status: nuevoStatus } : item
    ).filter(item => !item.Status.includes("Concluido")));

    // CORRECCIÓN: La acción exacta en code.gs es 'statusCompra'
    // y lee directamente 'articulo' y 'nuevoStatus' del JSON
    await database.guardarDatos('statusCompra', { 
      articulo: articuloAEditar, 
      nuevoStatus: nuevoStatus 
    });

    setModalStatus(false);
    setGuardando(false);
    cargarCompras();
  };
  
  if (cargando) {
    return <p className="text-xs font-black uppercase tracking-wider text-slate-500 animate-pulse text-left p-4">Actualizando...</p>;
  }

  // Filtrados de tus tres bloques visuales
  const listaWishlist = compras.filter(item => (item.Status || "").includes("Wishlist"));
  const listaPagos = compras.filter(item => !item.Status.includes("Wishlist") && item['Requiere Pago'] === 'SÍ');
  const listaTramites = compras.filter(item => !item.Status.includes("Wishlist") && item['Requiere Pago'] !== 'SÍ');

  // Conteo para los agrupadores superiores
  let conteoEstados = {};
  configEstados.forEach(e => conteoEstados[e.nombre] = 0);
  listaTramites.forEach(item => {
    configEstados.forEach(e => {
      if ((item.Status || "").includes(e.nombre)) conteoEstados[e.nombre]++;
    });
  });

  return (
    <div className="space-y-6 text-left">
      
      {/* Encabezado */}
      <div className="mb-8 border-b border-zinc-800 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic text-slate-50">Control de Compras</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setModalWishlist(true)} 
            className="bg-sky-400 hover:bg-sky-500 text-slate-950 px-4 py-2 rounded-lg shadow-lg flex items-center text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            Agregar Compra Pend.
          </button>
          <div className="px-4 py-2 rounded-lg shadow-sm text-xs font-black uppercase text-sky-400 bg-sky-950/40 border border-sky-900 italic tracking-tighter">
            {listaTramites.length} Trámites en Curso
          </div>
        </div>
      </div>

      {/* Agrupadores de Status (Píldoras superiores dinámicas) */}
      <div className="flex flex-wrap gap-2 mb-8">
        {configEstados.map(e => {
          if (conteoEstados[e.nombre] > 0) {
            return (
              <div key={e.nombre} className="flex items-center bg-zinc-900 border border-zinc-800 rounded px-2 py-1 shadow-sm">
                <span className="text-[8px] font-black uppercase text-zinc-400 mr-2">{e.nombre}</span>
                <span className={`text-xs font-black ${e.texto}`}>{conteoEstados[e.nombre]}</span>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Grid del Dashboard original */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Wishlist y Esperando Pago */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* Bloque Wishlist */}
          <div>
            <h3 className="text-lg font-black text-slate-50 uppercase italic tracking-tighter mb-4">Wishlist</h3>
            <div className="bg-zinc-900 shadow-lg rounded-xl overflow-hidden border border-zinc-800">
              <table className="w-full text-left">
                <tbody>
                  {listaWishlist.length > 0 ? listaWishlist.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => abrirModalStatus(item['Artículo / Servicio'], item.Status)}
                      className="border-b border-zinc-800 hover:bg-zinc-800/60 cursor-pointer transition-colors"
                    >
                      <td className="p-3 text-[11px] font-bold text-slate-200 uppercase italic">{item['Artículo / Servicio']}</td>
                    </tr>
                  )) : (
                    <tr><td className="p-4 text-[10px] text-zinc-500 uppercase font-bold italic">Lista vacía</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloque Esperando Pago */}
          <div>
            <h3 className="text-lg font-black text-sky-400 uppercase italic tracking-tighter mb-4 flex items-center">
              Esperando Pago
            </h3>
            <div className="bg-zinc-950 shadow-lg rounded-xl overflow-hidden border border-zinc-800">
              <table className="w-full text-left">
                <tbody>
                  {listaPagos.length > 0 ? listaPagos.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => abrirModalStatus(item['Artículo / Servicio'], item.Status)}
                      className="border-b border-zinc-800 hover:bg-zinc-800/60 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        <div className="text-[11px] font-black text-sky-400 uppercase leading-none">{item['Artículo / Servicio']}</div>
                        <div className="text-[8px] font-bold text-zinc-400 uppercase mt-1 italic tracking-widest">{item.Status}</div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td className="p-4 text-[10px] text-zinc-600 uppercase font-bold italic">Sin pagos pendientes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Columna Derecha Grande: Trámites en Curso */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-black text-slate-50 uppercase italic tracking-tighter mb-4">Trámites en Curso</h3>
          <div className="bg-zinc-900 shadow-2xl rounded-xl overflow-hidden border border-zinc-800">
            <table className="w-full">
              <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase tracking-widest font-bold border-b border-zinc-800">
                <tr>
                  <th className="p-4 w-1/3 text-left">Artículo / Servicio</th>
                  <th className="p-4 w-2/3 text-left">Estatus Administrativo</th>
                </tr>
              </thead>
              <tbody>
                {listaTramites.length > 0 ? listaTramites.map((item, idx) => {
                  const statusActual = item.Status || "";
                  let index = configEstados.findIndex(e => statusActual.includes(e.nombre));
                  const config = index !== -1 ? configEstados[index] : { color: "bg-zinc-600", texto: "text-zinc-400" };
                  const progreso = index === -1 ? 5 : ((index + 1) / configEstados.length) * 100;

                  return (
                    <tr 
                      key={idx} 
                      onClick={() => abrirModalStatus(item['Artículo / Servicio'], statusActual)}
                      className="hover:bg-zinc-800/60 border-b border-zinc-800 cursor-pointer transition-colors text-left"
                    >
                      <td className="p-4 border-r border-zinc-800">
                        <div className="text-sm font-black text-slate-50 uppercase leading-tight tracking-tighter">{item['Artículo / Servicio']}</div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase mt-1 italic tracking-widest">{item.Proveedor || '---'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase">
                            <span className={`${config.texto} italic`}>{statusActual}</span>
                            <span className="text-zinc-400">{Math.round(progreso)}%</span>
                          </div>
                          <div className="w-full bg-zinc-950 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                            <div className={`${config.color} h-full transition-all duration-1000 shadow-inner`} style={{ width: `${progreso}%` }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colspan="2" className="p-10 text-center text-zinc-500 font-bold uppercase text-xs">Sin trámites activos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL: AGREGAR A WISHLIST */}
      {modalWishlist && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left border border-zinc-800">
            <div className="bg-zinc-950 p-4 text-slate-50 font-black uppercase text-[10px] tracking-widest flex justify-between border-b border-zinc-800">
              Añadir a Wishlist
              <button onClick={() => setModalWishlist(false)} className="cursor-pointer text-zinc-500 hover:text-slate-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-[9px] font-black uppercase text-zinc-400 mb-2">¿Qué equipo o servicio se necesita?</label>
              <input 
                type="text" 
                value={inputWishlist}
                onChange={(e) => setInputWishlist(e.target.value)}
                placeholder="Ej. Monitor de Signos Vitales" 
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-bold text-slate-50 uppercase outline-none focus:border-sky-400 mb-6"
              />
              <button 
                onClick={ejecutarGuardarWishlist} 
                disabled={guardando}
                className="w-full bg-sky-400 hover:bg-sky-500 text-slate-950 py-3 rounded-lg text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar en Lista'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR STATUS */}
      {modalStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 text-left">
          <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-zinc-800 border-t-8 border-t-sky-400">
            <div className="p-6">
              <h4 className="text-sm font-black text-slate-50 uppercase mb-4 tracking-tighter italic">{articuloAEditar}</h4>
              <select 
                value={nuevoStatus}
                onChange={(e) => setNuevoStatus(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm font-bold text-slate-50 uppercase outline-none focus:border-sky-400 mb-6"
              >
                <option value="Wishlist">Wishlist</option>
                <option value="Por Cotizar Biomedica">Por Cotizar Biomedica</option>
                <option value="Por Cotizar Compras">Por Cotizar Compras</option>
                <option value="Por Autorizar">Por Autorizar</option>
                <option value="Por hacer Requisicion">Por hacer Requisicion</option>
                <option value="En espera de OC">En espera de OC</option>
                <option value="En espera de Material">En espera de Material</option>
                <option value="Por hacer Recepcion en SIHO">Por hacer Recepcion en SIHO</option>
                <option value="Por entregar a CxP">Por entregar a CxP</option>
                <option value="Concluido">Concluido (Archivar)</option>
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => setModalStatus(false)} className="flex-1 text-[10px] font-black uppercase text-zinc-400 hover:text-slate-50 cursor-pointer">Cancelar</button>
                <button 
                  onClick={ejecutarCambioStatus} 
                  disabled={guardando}
                  className="flex-1 bg-sky-400 hover:bg-sky-500 text-slate-950 py-3 rounded-lg text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}