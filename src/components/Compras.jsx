import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import { X, Star, Trash2, Pencil, History, RotateCcw, Search } from 'lucide-react';

export default function Compras() {
  const [compras, setCompras] = useState([]);
  const [comprasArchivadas, setComprasArchivadas] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  // Modales
  const [modalWishlist, setModalWishlist] = useState(false);
  const [modalStatus, setModalStatus] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [inputWishlist, setInputWishlist] = useState("");
  
  // Control de edición
  const [idAEditar, setIdAEditar] = useState(null);
  const [articuloOriginal, setArticuloOriginal] = useState("");
  const [nuevoArticuloTexto, setNuevoArticuloTexto] = useState("");
  const [statusActualEditar, setStatusActualEditar] = useState("");
  const [nuevoStatus, setNuevoStatus] = useState("");
  const [nuevoProveedor, setNuevoProveedor] = useState("");
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

    let data = [];
    try {
      const { data: dataSupabase, error } = await supabase
        .from('compras')
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      data = (dataSupabase || []).map(row => ({
        id: row.id,
        'Artículo / Servicio': row.articulo_servicio,
        Status: row.status,
        Proveedor: row.proveedor || '',
        'Requiere Pago': row.requiere_pago
      }));
    } catch (err) {
      console.error('Error al cargar compras desde Supabase:', err);
    }
    
    // Separar activas y archivadas
    const validos = data.filter(item => {
      const st = item.Status || "";
      return !st.includes("Concluido") && st !== "";
    });

    const archivadas = data.filter(item => {
      const st = item.Status || "";
      return st.includes("Concluido");
    });

    validos.sort((a, b) => {
      const indexA = configEstados.findIndex(e => (a.Status || "").includes(e.nombre));
      const indexB = configEstados.findIndex(e => (b.Status || "").includes(e.nombre));
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    setCompras(validos);
    setComprasArchivadas(archivadas);
    setCargando(false);
  };

  useEffect(() => {
    cargarCompras();
  }, []);

  const proveedoresSugeridos = useMemo(() => {
    const lista = [...compras, ...comprasArchivadas]
      .map(item => (item.Proveedor || '').trim())
      .filter(p => p.length > 0 && p !== '---');
    return Array.from(new Set(lista)).sort();
  }, [compras, comprasArchivadas]);

  const abrirModalStatus = (item) => {
    setIdAEditar(item.id);
    setArticuloOriginal(item['Artículo / Servicio']);
    setNuevoArticuloTexto(item['Artículo / Servicio'] || '');
    setStatusActualEditar(item.Status || '');
    setNuevoStatus((item.Status || '').split(' - ')[0].trim());
    setNuevoProveedor(item.Proveedor === '---' ? '' : (item.Proveedor || ''));
    setModalStatus(true);
  };

  const ejecutarGuardarWishlist = async () => {
    if (!inputWishlist.trim()) return alert("Escribe el nombre del artículo");
    setGuardando(true);
    
    try {
      const { error } = await supabase
        .from('compras')
        .insert([{
          articulo_servicio: inputWishlist.trim(),
          status: 'Wishlist',
          proveedor: '',
          requiere_pago: 'NO'
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error al guardar en Wishlist en Supabase:', err);
    }
    
    setInputWishlist("");
    setModalWishlist(false);
    setGuardando(false);
    cargarCompras();
  };

  const ejecutarCambioStatus = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!nuevoArticuloTexto.trim()) return alert("El nombre del artículo no puede estar vacío");
    setGuardando(true);
    
    try {
      let query = supabase.from('compras').update({ 
        articulo_servicio: nuevoArticuloTexto.trim(),
        status: nuevoStatus,
        proveedor: nuevoProveedor.trim()
      });

      if (idAEditar) {
        query = query.eq('id', idAEditar);
      } else {
        query = query.eq('articulo_servicio', articuloOriginal);
      }

      const { error } = await query;
      if (error) throw error;
    } catch (err) {
      console.error('Error al actualizar compra en Supabase:', err);
    }

    setModalStatus(false);
    setGuardando(false);
    cargarCompras();
  };

  const ejecutarRestaurarCompra = async (item) => {
    try {
      const { error } = await supabase
        .from('compras')
        .update({ status: 'Wishlist' })
        .eq('id', item.id);

      if (error) throw error;
      cargarCompras();
    } catch (err) {
      console.error('Error al restaurar compra:', err);
    }
  };

  const ejecutarEliminarCompra = async (idEliminar = null, textoEliminar = null) => {
    const targetId = idEliminar || idAEditar;
    const targetTexto = textoEliminar || nuevoArticuloTexto || articuloOriginal;

    if (!targetId && !targetTexto) return;
    if (!window.confirm(`¿Seguro que deseas eliminar definitivamente "${targetTexto}"?`)) return;

    setGuardando(true);

    try {
      let query = supabase.from('compras').delete();
      if (targetId) {
        query = query.eq('id', targetId);
      } else {
        query = query.eq('articulo_servicio', targetTexto);
      }

      const { error } = await query;
      if (error) throw error;

      if (modalStatus) setModalStatus(false);
      cargarCompras();
    } catch (err) {
      console.error('Error al eliminar compra en Supabase:', err);
    } finally {
      setGuardando(false);
    }
  };
  
  if (cargando) {
    return <p className="text-xs font-black uppercase tracking-wider text-theme-text/50 animate-pulse text-left p-4">Actualizando...</p>;
  }

  const listaWishlist = compras.filter(item => (item.Status || "").includes("Wishlist"));
  const listaPagos = compras.filter(item => !item.Status.includes("Wishlist") && item['Requiere Pago'] === 'SÍ');
  const listaTramites = compras.filter(item => !item.Status.includes("Wishlist") && item['Requiere Pago'] !== 'SÍ');

  const archivadasFiltradas = comprasArchivadas.filter(item => 
    (item['Artículo / Servicio'] || '').toLowerCase().includes(busquedaHistorial.toLowerCase()) ||
    (item.Proveedor || '').toLowerCase().includes(busquedaHistorial.toLowerCase())
  );

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
        <div className="flex gap-3">
          <button 
            onClick={() => setModalHistorial(true)} 
            className="bg-theme-bg hover:opacity-80 text-theme-text/70 border border-theme-border px-3.5 py-2 rounded-lg flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            <History className="w-3.5 h-3.5" /> Historial ({comprasArchivadas.length})
          </button>
          
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

      {/* Agrupadores de Status */}
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

      {/* Grid del Dashboard */}
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
                      onClick={() => abrirModalStatus(item)}
                      className="border-b border-theme-border/40 hover:bg-theme-border/10 cursor-pointer transition-colors"
                    >
                      <td className="p-3 text-[11px] font-bold text-theme-text uppercase italic">
                        <div>{item['Artículo / Servicio']}</div>
                        {item.Proveedor && (
                          <div className="text-[8px] font-mono text-theme-text/40 normal-case mt-0.5">{item.Proveedor}</div>
                        )}
                      </td>
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
                      onClick={() => abrirModalStatus(item)}
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

        {/* Columna Derecha: Trámites en Curso */}
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
                      onClick={() => abrirModalStatus(item)}
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

      {/* MODAL: HISTORIAL DE ARCHIVADOS / CONCLUIDOS */}
      {modalHistorial && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[75] flex items-center justify-center p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-left border border-theme-border flex flex-col max-h-[85vh]">
            
            <div className="bg-theme-bg p-4 text-theme-text font-black uppercase text-xs tracking-wider flex justify-between items-center border-b border-theme-border">
              <div className="flex items-center gap-2 text-theme-accent">
                <History className="w-4 h-4" /> Historial de Compras Archivadas ({comprasArchivadas.length})
              </div>
              <button onClick={() => setModalHistorial(false)} className="cursor-pointer text-theme-text/50 hover:text-theme-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-theme-border/40 bg-theme-border/5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text/40" />
                <input
                  type="text"
                  value={busquedaHistorial}
                  onChange={(e) => setBusquedaHistorial(e.target.value)}
                  placeholder="Buscar en historial por artículo o proveedor..."
                  className="w-full bg-theme-bg border border-theme-border rounded-lg pl-9 pr-3 py-2 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {archivadasFiltradas.length > 0 ? archivadasFiltradas.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3 bg-theme-border/10 border border-theme-border/40 rounded-xl flex justify-between items-center gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase text-theme-text truncate leading-tight">
                      {item['Artículo / Servicio']}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-theme-text/50 uppercase font-bold">
                      <span>Proveedor: {item.Proveedor || 'Sin proveedor'}</span>
                      <span>•</span>
                      <span className="text-theme-accent">{item.Status}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => ejecutarRestaurarCompra(item)}
                      title="Restaurar a Wishlist"
                      className="px-2.5 py-1.5 bg-theme-bg hover:opacity-80 border border-theme-border text-theme-accent text-[9px] font-black uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <RotateCcw className="w-3 h-3" /> Restaurar
                    </button>
                    
                    <button
                      onClick={() => ejecutarEliminarCompra(item.id, item['Artículo / Servicio'])}
                      title="Eliminar permanentemente"
                      className="p-1.5 text-theme-text/40 hover:text-red-400 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-theme-text/40 text-xs font-bold uppercase">
                  No hay registros archivados que coincidan
                </div>
              )}
            </div>

            <div className="p-3 border-t border-theme-border/40 bg-theme-border/5 text-right">
              <button 
                onClick={() => setModalHistorial(false)}
                className="px-4 py-1.5 text-[10px] font-black uppercase text-theme-text/60 hover:text-theme-text cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

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

      {/* MODAL: EDITAR DETALLES, STATUS, PROVEEDOR & ELIMINAR */}
      {modalStatus && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 text-left">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-theme-border border-t-8 border-t-theme-accent">
            <form onSubmit={ejecutarCambioStatus} className="p-6 space-y-4">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5 text-theme-accent font-black text-xs uppercase tracking-wider">
                  <Pencil className="w-3.5 h-3.5" /> Modificar Compra
                </div>
                <button type="button" onClick={() => setModalStatus(false)} className="cursor-pointer text-theme-text/50 hover:text-theme-text">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Artículo / Servicio</label>
                <input 
                  type="text"
                  required
                  value={nuevoArticuloTexto}
                  onChange={(e) => setNuevoArticuloTexto(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                />
              </div>
              
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Estatus Administrativo</label>
                <select 
                  value={nuevoStatus}
                  onChange={(e) => setNuevoStatus(e.target.value)}
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
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
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">
                  Proveedor Asignado {proveedoresSugeridos.length > 0 && <span className="text-theme-accent font-bold">({proveedoresSugeridos.length} en historial)</span>}
                </label>
                <input 
                  type="text"
                  list="lista-proveedores-sugeridos"
                  value={nuevoProveedor}
                  onChange={(e) => setNuevoProveedor(e.target.value)}
                  placeholder="Escribe o selecciona proveedor..."
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                />
                <datalist id="lista-proveedores-sugeridos">
                  {proveedoresSugeridos.map((prov, i) => (
                    <option key={i} value={prov} />
                  ))}
                </datalist>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => ejecutarEliminarCompra(idAEditar, nuevoArticuloTexto)}
                  title="Eliminar compra de la base de datos"
                  className="p-3 bg-theme-bg border border-theme-border text-theme-text/40 hover:text-red-400 hover:border-red-400/50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button 
                  type="button" 
                  onClick={() => setModalStatus(false)} 
                  className="flex-1 text-[10px] font-black uppercase text-theme-text/60 hover:text-theme-text cursor-pointer"
                >
                  Cancelar
                </button>

                <button 
                  type="submit" 
                  disabled={guardando}
                  className="flex-1 bg-theme-accent hover:opacity-90 text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}