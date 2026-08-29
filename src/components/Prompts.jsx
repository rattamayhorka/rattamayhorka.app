import { useState, useEffect } from 'react';
import { database } from '../api';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Plus, 
  Search, 
  X, 
  SlidersHorizontal,
  FileText,
  Pencil,
  Trash2,
  RefreshCw
} from 'lucide-react';

const CATEGORIAS = ['Todas', 'Código', 'Gestión', 'Comunicación', 'Documentación'];

export default function Prompts() {
  const [prompts, setPrompts] = useState([]);
  const [cargando, setCargando] = useState(false);
  
  // Búsqueda y filtros
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  
  // Prompt activo y portapapeles
  const [promptActivo, setPromptActivo] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);

  // Modal para Crear / Editar
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formPrompt, setFormPrompt] = useState({
    id: '',
    titulo: '',
    categoria: 'Código',
    etiquetas: '',
    descripcion: '',
    plantilla: '',
    variables: ''
  });

  // Lectura directa desde Google Sheets
  const cargarPromptsDesdeSheets = async () => {
    setCargando(true);
    try {
      const data = await database.obtenerSeccion('prompts');
      if (data && Array.isArray(data)) {
        setPrompts(data);
        if (data.length > 0) {
          setPromptActivo(data[0]);
        } else {
          setPromptActivo(null);
        }
      }
    } catch (err) {
      console.error('Error al cargar prompts desde Sheets:', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPromptsDesdeSheets();
  }, []);

  const copiarAlPortapapeles = (texto, id) => {
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const abrirModalCrear = () => {
    setModoEdicion(false);
    setFormPrompt({
      id: Date.now().toString(),
      titulo: '',
      categoria: 'Código',
      etiquetas: '',
      descripcion: '',
      plantilla: '',
      variables: ''
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (item) => {
    setModoEdicion(true);
    setFormPrompt({
      id: item.id ? item.id.toString() : '',
      titulo: item.titulo || '',
      categoria: item.categoria || 'Código',
      etiquetas: item.etiquetas || '',
      descripcion: item.descripcion || '',
      plantilla: item.plantilla || '',
      variables: item.variables || ''
    });
    setModalAbierto(true);
  };

  const handleGuardarPrompt = async (e) => {
    e.preventDefault();
    if (!formPrompt.titulo.trim() || !formPrompt.plantilla.trim()) return;

    setGuardando(true);

    if (modoEdicion) {
      const actualizados = prompts.map(p => 
        p.id.toString() === formPrompt.id.toString() ? formPrompt : p
      );
      setPrompts(actualizados);
      if (promptActivo?.id?.toString() === formPrompt.id.toString()) {
        setPromptActivo(formPrompt);
      }

      try {
        await database.guardarDatos('modificarPrompt', { datos: formPrompt });
      } catch (err) {
        console.error('Error al actualizar en Sheets:', err);
      }
    } else {
      const nuevoItem = { ...formPrompt };
      setPrompts([nuevoItem, ...prompts]);
      setPromptActivo(nuevoItem);

      try {
        await database.guardarDatos('guardarPrompt', { datos: nuevoItem });
      } catch (err) {
        console.error('Error al guardar en Sheets:', err);
      }
    }

    setGuardando(false);
    setModalAbierto(false);
  };

  const handleEliminarPrompt = async (idAEliminar) => {
    if (!idAEliminar) return;
    if (!window.confirm('¿Seguro que deseas eliminar este prompt?')) return;

    const idStr = idAEliminar.toString();
    const actualizados = prompts.filter(p => p.id?.toString() !== idStr);
    setPrompts(actualizados);

    if (promptActivo?.id?.toString() === idStr) {
      setPromptActivo(actualizados.length > 0 ? actualizados[0] : null);
    }

    try {
      await database.guardarDatos('eliminarPrompt', { datos: { id: idStr } });
    } catch (err) {
      console.error('Error al eliminar en Sheets:', err);
    }
  };

  const promptsFiltrados = prompts.filter(p => {
    const coincideCategoria = categoriaSeleccionada === 'Todas' || p.categoria === categoriaSeleccionada;
    const coincideTexto = 
      (p.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.descripcion || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.etiquetas || '').toLowerCase().includes(busqueda.toLowerCase());
    return coincideCategoria && coincideTexto;
  });

  return (
    <div className="space-y-6 text-left font-mono">
      
      {/* Encabezado */}
      <div className="border-b border-theme-border/40 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-theme-accent mb-1">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Catálogo & Biblioteca</span>
          </div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic text-theme-text">Gestor de Prompts</h2>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={cargarPromptsDesdeSheets}
            title="Recargar desde Google Sheets"
            className="p-2.5 rounded-xl border border-theme-border bg-theme-bg text-theme-text/60 hover:text-theme-accent transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-theme-accent' : ''}`} />
          </button>

          <button 
            onClick={abrirModalCrear}
            className="bg-theme-accent hover:opacity-90 text-theme-bg px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Nuevo Prompt
          </button>
          
          <div className="px-3 py-2 rounded-xl text-xs font-black uppercase text-theme-accent bg-theme-bg border border-theme-border italic tracking-tighter">
            {prompts.length} Registrados
          </div>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-theme-text/40" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por título, etiquetas o contenido..."
            className="w-full bg-theme-bg border border-theme-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-theme-text font-bold uppercase tracking-wider outline-none focus:border-theme-accent transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoriaSeleccionada(cat)}
              className={`px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                categoriaSeleccionada === cat
                  ? 'bg-theme-accent text-theme-bg shadow-sm'
                  : 'bg-theme-bg border border-theme-border text-theme-text/60 hover:text-theme-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Lista */}
        <div className="lg:col-span-5 space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {cargando ? (
            <div className="p-8 text-center bg-theme-bg border border-theme-border rounded-xl">
              <p className="text-xs font-bold text-theme-text/40 uppercase">Cargando prompts desde Sheets...</p>
            </div>
          ) : promptsFiltrados.length > 0 ? (
            promptsFiltrados.map((item) => {
              const activo = promptActivo?.id?.toString() === item.id?.toString();
              return (
                <div
                  key={item.id}
                  onClick={() => setPromptActivo(item)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-left relative group ${
                    activo 
                      ? 'bg-theme-border/20 border-theme-accent shadow-md translate-x-1' 
                      : 'bg-theme-bg border-theme-border hover:border-theme-border/80 hover:bg-theme-border/10'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-theme-border/30 text-theme-accent border border-theme-border">
                      {item.categoria}
                    </span>
                    
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalEditar(item);
                        }}
                        title="Editar prompt"
                        className="text-theme-text/40 hover:text-theme-accent p-1 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminarPrompt(item.id);
                        }}
                        title="Eliminar prompt"
                        className="text-theme-text/40 hover:text-red-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copiarAlPortapapeles(item.plantilla, item.id);
                        }}
                        title="Copiar prompt directo"
                        className="text-theme-text/40 hover:text-theme-accent p-1 transition-colors ml-1"
                      >
                        {copiadoId === item.id ? <Check className="w-4 h-4 text-theme-trabajo" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-black text-theme-text uppercase leading-tight mb-1">
                    {item.titulo}
                  </h3>

                  <p className="text-[10px] text-theme-text/60 line-clamp-2 mb-3">
                    {item.descripcion}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {item.etiquetas && item.etiquetas.split(',').map((tag, idx) => (
                      <span key={idx} className="text-[8px] font-bold text-theme-text/40 bg-theme-border/10 px-1.5 py-0.5 rounded">
                        #{tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center bg-theme-bg border border-theme-border rounded-xl">
              <p className="text-xs font-bold text-theme-text/40 uppercase">No hay prompts registrados</p>
            </div>
          )}
        </div>

        {/* Columna Derecha: Detalle / Visualizador */}
        <div className="lg:col-span-7">
          {promptActivo ? (
            <div className="bg-theme-bg border border-theme-border rounded-2xl shadow-xl overflow-hidden flex flex-col">
              
              <div className="p-5 border-b border-theme-border/40 bg-theme-border/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-theme-accent">
                      {promptActivo.categoria}
                    </span>
                    <span className="text-theme-text/30">•</span>
                    <span className="text-[9px] font-bold text-theme-text/50 uppercase">
                      {promptActivo.etiquetas}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-theme-text uppercase tracking-tight">
                    {promptActivo.titulo}
                  </h3>
                  <p className="text-xs text-theme-text/60 mt-1">
                    {promptActivo.descripcion}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => abrirModalEditar(promptActivo)}
                    title="Editar este prompt"
                    className="p-2 rounded-xl border border-theme-border text-theme-text/60 hover:text-theme-accent hover:border-theme-accent transition-all cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleEliminarPrompt(promptActivo.id)}
                    title="Eliminar este prompt"
                    className="p-2 rounded-xl border border-theme-border text-theme-text/60 hover:text-red-400 hover:border-red-400/50 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => copiarAlPortapapeles(promptActivo.plantilla, promptActivo.id)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-md ${
                      copiadoId === promptActivo.id
                        ? 'bg-theme-trabajo text-theme-bg'
                        : 'bg-theme-accent text-theme-bg hover:opacity-90'
                    }`}
                  >
                    {copiadoId === promptActivo.id ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" /> ¡Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 stroke-[3]" /> Copiar
                      </>
                    )}
                  </button>
                </div>
              </div>

              {promptActivo.variables && (
                <div className="px-5 py-3 bg-theme-border/10 border-b border-theme-border/30 flex items-center gap-2 text-[10px]">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-theme-accent flex-shrink-0" />
                  <span className="font-black uppercase text-theme-text/60">Variables:</span>
                  <span className="text-theme-accent font-bold">{promptActivo.variables}</span>
                </div>
              )}

              <div className="p-5">
                <label className="block text-[9px] font-black uppercase text-theme-text/50 mb-2 tracking-wider">
                  Cuerpo del Prompt / Plantilla
                </label>
                <div className="relative">
                  <pre className="w-full bg-theme-border/15 border border-theme-border/60 rounded-xl p-4 text-xs text-theme-text font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto selection:bg-theme-accent selection:text-theme-bg">
                    {promptActivo.plantilla}
                  </pre>
                </div>
              </div>

              <div className="px-5 py-3 border-t border-theme-border/20 bg-theme-border/5 flex justify-between items-center text-[9px] text-theme-text/40 font-bold uppercase tracking-wider">
                <span>Tip: Modifica el texto en tu destino antes de enviar</span>
                <span>ID: #{promptActivo.id}</span>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center border border-theme-border rounded-2xl bg-theme-border/5">
              <FileText className="w-8 h-8 text-theme-text/30 mx-auto mb-2" />
              <p className="text-xs font-bold text-theme-text/50 uppercase">No hay ningún prompt seleccionado</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal: Crear / Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-left border border-theme-border border-t-4 border-t-theme-accent animate-fadeIn">
            
            <div className="p-4 border-b border-theme-border flex justify-between items-center">
              <div className="flex items-center gap-2 text-theme-accent">
                {modoEdicion ? <Pencil className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span className="font-black uppercase text-xs tracking-wider">
                  {modoEdicion ? 'Editar Prompt' : 'Guardar Nuevo Prompt'}
                </span>
              </div>
              <button 
                onClick={() => setModalAbierto(false)} 
                className="text-theme-text/50 hover:text-theme-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGuardarPrompt} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Título del Prompt</label>
                <input
                  type="text"
                  required
                  value={formPrompt.titulo}
                  onChange={(e) => setFormPrompt({ ...formPrompt, titulo: e.target.value })}
                  placeholder="Título descriptivo"
                  className="w-full bg-theme-bg border border-theme-border rounded-xl p-2.5 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Categoría</label>
                  <select
                    value={formPrompt.categoria}
                    onChange={(e) => setFormPrompt({ ...formPrompt, categoria: e.target.value })}
                    className="w-full bg-theme-bg border border-theme-border rounded-xl p-2.5 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                  >
                    <option value="Código">Código</option>
                    <option value="Gestión">Gestión</option>
                    <option value="Comunicación">Comunicación</option>
                    <option value="Documentación">Documentación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Etiquetas (separadas por coma)</label>
                  <input
                    type="text"
                    value={formPrompt.etiquetas}
                    onChange={(e) => setFormPrompt({ ...formPrompt, etiquetas: e.target.value })}
                    placeholder="Ej. Sheets, GAS, API"
                    className="w-full bg-theme-bg border border-theme-border rounded-xl p-2.5 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Descripción Breve</label>
                <input
                  type="text"
                  value={formPrompt.descripcion}
                  onChange={(e) => setFormPrompt({ ...formPrompt, descripcion: e.target.value })}
                  placeholder="Finalidad del prompt..."
                  className="w-full bg-theme-bg border border-theme-border rounded-xl p-2.5 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Plantilla / Texto del Prompt</label>
                <textarea
                  required
                  rows={4}
                  value={formPrompt.plantilla}
                  onChange={(e) => setFormPrompt({ ...formPrompt, plantilla: e.target.value })}
                  placeholder="Escribe el texto del prompt..."
                  className="w-full bg-theme-bg border border-theme-border rounded-xl p-3 text-xs font-mono text-theme-text outline-none focus:border-theme-accent"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Variables a reemplazar (Opcional)</label>
                <input
                  type="text"
                  value={formPrompt.variables}
                  onChange={(e) => setFormPrompt({ ...formPrompt, variables: e.target.value })}
                  placeholder="Ej. [PARAMETRO], [CODIGO]"
                  className="w-full bg-theme-bg border border-theme-border rounded-xl p-2.5 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 text-[10px] font-black uppercase text-theme-text/60 hover:text-theme-text cursor-pointer py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 bg-theme-accent hover:opacity-90 text-theme-bg py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50 tracking-wider"
                >
                  {guardando ? 'Guardando...' : (modoEdicion ? 'Actualizar Prompt' : 'Guardar Prompt')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}