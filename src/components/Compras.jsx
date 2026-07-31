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

  // Configuración de Estados adaptada al Tema
  const configEstados = [
    { nombre: "Por Cotizar Biomedica", color: "bg-theme-casa", texto: "text-theme-casa" },
    { nombre: "Por Cotizar Compras", color: "bg-theme-casa", texto: "text-theme-casa" },
    { nombre: "Por Autorizar", color: "bg-theme-accent", texto: "text-theme-accent" },
    { nombre: "Por hacer Requisicion", color: "bg-theme-accent", texto: "text-theme-accent" },
    { nombre: "En espera de OC", color: "bg-theme-trabajo", texto: "text-theme-trabajo" },
    { nombre: "En espera de Material", color: "bg-theme-trabajo", texto: "text-theme-trabajo" },
    { nombre: "Por hacer Recepcion en SIHO", color: "bg-theme-text", texto: "text-theme-text" },
    { nombre: "Por entregar a CxP", color: "bg-theme-text", texto: "text-theme-text" }
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

    await database.guardarDatos('statusCompra', { 
      articulo: articuloAEditar, 
      nuevoStatus: nuevoStatus 
    });

    setModalStatus(false);
    setGuardando(false);
    cargarCompras();
  };
  
  if (cargando) {
    return <p className="text-xs font-black uppercase tracking-wider text-theme-text/50 animate-pulse text-left p-4">Actualizando...</p>;
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
      <div className="mb-8 border-b border-theme-border/40 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic text-theme-accent">Control de Compras</h2>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setModalWishlist(true)} 
            className="bg-theme-accent hover:opacity-90 text-theme-bg px-4 py-2 rounded-lg shadow-lg flex items-center text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            Agregar Compra Pend.
          </button>
          <div className="px-4 py-2 rounded-lg shadow-sm text-xs font-black uppercase text-theme-accent bg-theme-bg border border-theme-border italic tracking-tighter">
            {listaTramites.length} Trámites en Curso
          </div>
        </div>
      </div>

      {/* Agrupadores de Status (Píldoras superiores dinámicas) */}
      <div className="flex flex-wrap gap-2 mb-8">
        {configEstados.map(e => {
          if (conteoEstados[e.nombre] > 0) {
            return (
              <div key={e.nombre} className="flex items-center bg-theme-bg border border-theme-border rounded px-2 py-1 shadow-sm">
                <span className="text-[8px] font-black uppercase text-theme-text/60 mr-2">{e.nombre}</span>
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
            <h3 className="text-lg font-black text-theme-text uppercase italic tracking-tighter mb-4">Wishlist</h3>
            <div className="bg-theme-bg shadow-lg rounded-xl overflow-hidden border border-theme-border">
              <table className="w-full text-left">
                <tbody>
                  {listaWishlist.length > 0 ? listaWishlist.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => abrirModalStatus(item['Artículo / Servicio'], item.Status)}
                      className="border-b border-theme-border/40 hover:bg-theme-border/10 cursor-pointer transition-colors"
                    >
                      <td className="p-3 text-[11px] font-bold text-theme-text uppercase italic">{item['Artículo / Servicio']}</td>
                    </tr>
                  )) : (
                    <tr><td className="p-4 text-[10px] text-theme-text/50 uppercase font-bold italic">Lista vacía</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloque Esperando Pago */}
          <div>
            <h3 className="text-lg font-black text-theme-accent uppercase italic tracking-tighter mb-4 flex items-center">
              Esperando Pago
            </h3>
            <div className="bg-theme-bg shadow-lg rounded-xl overflow-hidden border border-theme-border">
              <table className="w-full text-left">
                <tbody>
                  {listaPagos.length > 0 ? listaPagos.map((item, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => abrirModalStatus(item['Artículo / Servicio'], item.Status)}
                      className="border-b border-theme-border/40 hover:bg-theme-border/10 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        <div className="text-[11px] font-black text-theme-accent uppercase leading-none">{item['Artículo / Servicio']}</div>
                        <div className="text-[8px] font-bold text-theme-text/60 uppercase mt-1 italic tracking-widest">{item.Status}</div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td className="p-4 text-[10px] text-theme-text/50 uppercase font-bold italic">Sin pagos pendientes</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Columna Derecha Grande: Trámites en Curso */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-black text-theme-text uppercase italic tracking-tighter mb-4">Trámites en Curso</h3>
          <div className="bg-theme-bg shadow-2xl rounded-xl overflow-hidden border border-theme-border">
            <table className="w-full">
              <thead className="bg-theme-bg text-theme-text/60 text-[10px] uppercase tracking-widest font-bold border-b border-theme-border">
                <tr>
                  <th className="p-4 w-1/3 text-left">Artículo / Servicio</th>
                  <th className="p-4 w-2/3 text-left">Estatus Administrativo</th>
                </tr>
              </thead>
              <tbody>
                {listaTramites.length > 0 ? listaTramites.map((item, idx) => {
                  const statusActual = item.Status || "";
                  let index = configEstados.findIndex(e => statusActual.includes(e.nombre));
                  const config = index !== -1 ? configEstados[index] : { color: "bg-theme-text/40", texto: "text-theme-text/50" };
                  const progreso = index === -1 ? 5 : ((index + 1) / configEstados.length) * 100;

                  return (
                    <tr 
                      key={idx} 
                      onClick={() => abrirModalStatus(item['Artículo / Servicio'], statusActual)}
                      className="hover:bg-theme-border/10 border-b border-theme-border/40 cursor-pointer transition-colors text-left"
                    >
                      <td className="p-4 border-r border-theme-border/40">
                        <div className="text-sm font-black text-theme-text uppercase leading-tight tracking-tighter">{item['Artículo / Servicio']}</div>
                        <div className="text-[9px] font-bold text-theme-text/60 uppercase mt-1 italic tracking-widest">{item.Proveedor || '---'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase">
                            <span className={`${config.texto} italic`}>{statusActual}</span>
                            <span className="text-theme-text/60">{Math.round(progreso)}%</span>
                          </div>
                          <div className="w-full bg-theme-bg rounded-full h-1.5 overflow-hidden border border-theme-border/60">
                            <div className={`${config.color} h-full transition-all duration-1000 shadow-inner`} style={{ width: `${progreso}%` }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan="2" className="p-10 text-center text-theme-text/50 font-bold uppercase text-xs">Sin trámites activos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL: AGREGAR A WISHLIST */}
      {modalWishlist && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left border border-theme-border">
            <div className="bg-theme-bg p-4 text-theme-text font-black uppercase text-[10px] tracking-widest flex justify-between border-b border-theme-border">
              Añadir a Wishlist
              <button onClick={() => setModalWishlist(false)} className="cursor-pointer text-theme-text/50 hover:text-theme-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-2">¿Qué equipo o servicio se necesita?</label>
              <input 
                type="text" 
                value={inputWishlist}
                onChange={(e) => setInputWishlist(e.target.value)}
                placeholder="Ej. Monitor de Signos Vitales" 
                className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold text-theme-text uppercase outline-none focus:border-theme-accent mb-6"
              />
              <button 
                onClick={ejecutarGuardarWishlist} 
                disabled={guardando}
                className="w-full bg-theme-accent hover:opacity-90 text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50"
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
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-theme-border border-t-8 border-t-theme-accent">
            <div className="p-6">
              <h4 className="text-sm font-black text-theme-text uppercase mb-4 tracking-tighter italic">{articuloAEditar}</h4>
              <select 
                value={nuevoStatus}
                onChange={(e) => setNuevoStatus(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold text-theme-text uppercase outline-none focus:border-theme-accent mb-6"
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
                <button type="button" onClick={() => setModalStatus(false)} className="flex-1 text-[10px] font-black uppercase text-theme-text/60 hover:text-theme-text cursor-pointer">Cancelar</button>
                <button 
                  onClick={ejecutarCambioStatus} 
                  disabled={guardando}
                  className="flex-1 bg-theme-accent hover:opacity-90 text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50"
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