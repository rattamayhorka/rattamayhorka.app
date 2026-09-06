import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { 
  FileText, Plus, Trash2, Save, Search, 
  Bold, Italic, Heading1, Heading2, List, 
  ListOrdered, CheckSquare, Code, Quote, 
  Eye, Edit3, Columns, Check, Loader2 
} from 'lucide-react';

export default function NotasMarkdown() {
  const [notas, setNotas] = useState([]);
  const [notaActiva, setNotaActiva] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  
  // Modos de visualización: 'split' (dividido), 'edit' (solo editor), 'preview' (solo vista previa)
  const [modoVista, setModoVista] = useState('split'); 
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  const textareaRef = useRef(null);
  const autoGuardadoRef = useRef(null);

  // Cargar notas desde Supabase al iniciar
  useEffect(() => {
    cargarNotas();
  }, []);

  const cargarNotas = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('notas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setNotas(data || []);
      if (data && data.length > 0) {
        seleccionarNota(data[0]);
      } else {
        crearNuevaNota();
      }
    } catch (err) {
      console.error('Error al cargar notas:', err.message);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarNota = (nota) => {
    setNotaActiva(nota);
    setTitulo(nota.titulo || '');
    setContenido(nota.contenido || '');
  };

  // Crear nueva nota
  const crearNuevaNota = async () => {
    const nueva = {
      titulo: 'Nota sin título',
      contenido: '# Nueva Nota\n\nEmpieza a escribir tus ideas aquí...',
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('notas')
        .insert([nueva])
        .select()
        .single();

      if (error) throw error;

      setNotas([data, ...notas]);
      seleccionarNota(data);
    } catch (err) {
      console.error('Error al crear nota:', err.message);
    }
  };

  // Eliminar nota
  const eliminarNota = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que deseas eliminar esta nota?')) return;

    try {
      const { error } = await supabase
        .from('notas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const filtradas = notas.filter(n => n.id !== id);
      setNotas(filtradas);
      if (notaActiva?.id === id) {
        if (filtradas.length > 0) seleccionarNota(filtradas[0]);
        else crearNuevaNota();
      }
    } catch (err) {
      console.error('Error al eliminar nota:', err.message);
    }
  };

  // Guardar en Supabase
  const guardarNota = async (nuevoTitulo = titulo, nuevoContenido = contenido) => {
    if (!notaActiva) return;
    setGuardando(true);

    try {
      const payload = {
        titulo: nuevoTitulo.trim() || 'Nota sin título',
        contenido: nuevoContenido,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notas')
        .update(payload)
        .eq('id', notaActiva.id)
        .select()
        .single();

      if (error) throw error;

      // Actualizar listado local
      setNotas(notas.map(n => (n.id === data.id ? data : n)));
      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 2000);
    } catch (err) {
      console.error('Error al guardar:', err.message);
    } finally {
      setGuardando(false);
    }
  };

  // Auto-guardado con Debounce (guarda tras 1.2 segundos de inactividad)
  const manejarCambioContenido = (e) => {
    const val = e.target.value;
    setContenido(val);

    if (autoGuardadoRef.current) clearTimeout(autoGuardadoRef.current);
    autoGuardadoRef.current = setTimeout(() => {
      guardarNota(titulo, val);
    }, 1200);
  };

  const manejarCambioTitulo = (e) => {
    const val = e.target.value;
    setTitulo(val);

    if (autoGuardadoRef.current) clearTimeout(autoGuardadoRef.current);
    autoGuardadoRef.current = setTimeout(() => {
      guardarNota(val, contenido);
    }, 1200);
  };

  // Inserción de comandos Markdown desde la barra de herramientas
  const insertarSintaxis = (antes, despues = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textoPrevio = textarea.value;
    const seleccionado = textoPrevio.substring(start, end);

    const reemplazo = antes + (seleccionado || 'texto') + despues;
    const nuevoTexto = textoPrevio.substring(0, start) + reemplazo + textoPrevio.substring(end);

    setContenido(nuevoTexto);
    guardarNota(titulo, nuevoTexto);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + antes.length, start + antes.length + (seleccionado ? seleccionado.length : 5));
    }, 50);
  };

  // Renderizador ligero de Markdown a HTML nativo
  const formatearMarkdown = (texto) => {
    if (!texto) return '';

    let html = texto
      // Escapar caracteres básicos
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Encabezados
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-theme-accent mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-theme-accent mt-5 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-theme-accent border-b border-theme-border/50 pb-2 mb-4">$1</h1>')
      // Negritas y Cursivas
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<b><i>$1</i></b>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-black text-theme-text">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="italic text-theme-text/90">$1</em>')
      // Citas
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-theme-accent pl-3 py-1 my-2 text-theme-text/70 italic bg-theme-border/10 rounded-r">$1</blockquote>')
      // Listas de tareas estilo Obsidian
      .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled class="accent-theme-accent rounded" /> <span>$1</span></div>')
      .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled class="accent-theme-accent rounded" /> <span class="line-through opacity-50">$1</span></div>')
      // Listas desordenadas
      .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      // Bloques de código
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-theme-bg p-3 rounded-lg border border-theme-border font-mono text-xs my-3 overflow-x-auto text-theme-accent"><code>$1</code></pre>')
      // Código en línea
      .replace(/`(.*?)`/gim, '<code class="bg-theme-bg border border-theme-border px-1.5 py-0.5 rounded font-mono text-xs text-theme-accent">$1</code>')
      // Separadores
      .replace(/^---$/gim, '<hr class="border-theme-border my-4" />')
      // Saltos de línea
      .replace(/\n\n/gim, '<br/><br/>')
      .replace(/\n/gim, '<br/>');

    return html;
  };

  const notasFiltradas = notas.filter(n => 
    (n.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (n.contenido || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-theme-bg text-theme-text border border-theme-border rounded-2xl overflow-hidden shadow-2xl font-mono">
      
      {/* PANEL LATERAL: Lista de Notas */}
      <aside className="w-72 bg-theme-card border-r border-theme-border flex flex-col flex-shrink-0">
        
        {/* Cabecera del panel */}
        <div className="p-4 border-b border-theme-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-theme-accent" />
            <span className="font-black text-sm uppercase tracking-wider">Vault / Notas</span>
          </div>
          <button 
            onClick={crearNuevaNota}
            className="p-1.5 bg-theme-accent text-theme-bg rounded-lg hover:opacity-90 transition-all shadow cursor-pointer"
            title="Nueva Nota"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Buscador */}
        <div className="p-3 border-b border-theme-border/50">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text/40" />
            <input 
              type="text"
              placeholder="Buscar notas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-theme-text placeholder:text-theme-text/40 outline-none focus:border-theme-accent"
            />
          </div>
        </div>

        {/* Lista de Archivos */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {cargando && (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-theme-accent" />
            </div>
          )}

          {!cargando && notasFiltradas.length === 0 && (
            <p className="text-[11px] text-center text-theme-text/40 py-8">No hay notas encontradas</p>
          )}

          {notasFiltradas.map((n) => {
            const activa = notaActiva?.id === n.id;
            return (
              <div
                key={n.id}
                onClick={() => seleccionarNota(n)}
                className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-left transition-all ${
                  activa 
                    ? 'bg-theme-accent/15 border border-theme-accent/30 text-theme-accent font-bold' 
                    : 'hover:bg-theme-border/20 text-theme-text/80'
                }`}
              >
                <div className="truncate pr-2">
                  <p className="text-xs truncate font-medium">{n.titulo || 'Sin título'}</p>
                  <span className="text-[9px] text-theme-text/40 block truncate">
                    {new Date(n.updated_at || n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={(e) => eliminarNota(n.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-opacity cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL: Editor y Vista Previa */}
      <main className="flex-1 flex flex-col min-w-0 bg-theme-bg">
        
        {/* Barra superior de herramientas y controles */}
        <header className="h-14 border-b border-theme-border px-4 flex items-center justify-between gap-4 bg-theme-card/50 backdrop-blur-sm">
          <input 
            type="text"
            value={titulo}
            onChange={manejarCambioTitulo}
            placeholder="Título del documento..."
            className="bg-transparent text-base font-black text-theme-text outline-none focus:border-b focus:border-theme-accent flex-1 max-w-md"
          />

          {/* Formato rápido */}
          <div className="hidden md:flex items-center gap-1 border-x border-theme-border/60 px-3">
            <button onClick={() => insertarSintaxis('**', '**')} className="p-1.5 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Negrita"><Bold className="w-4 h-4" /></button>
            <button onClick={() => insertarSintaxis('*', '*')} className="p-1.5 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Cursiva"><Italic className="w-4 h-4" /></button>
            <button onClick={() => insertarSintaxis('# ')} className="p-1.5 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Título 1"><Heading1 className="w-4 h-4" /></button>
            <button onClick={() => insertarSintaxis('## ')} className="p-1.5 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Título 2"><Heading2 className="w-4 h-4" /></button>
            <button onClick={() => insertarSintaxis('- ')} className="p-1.5 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Lista"><List className="w-4 h-4" /></button>
            <button onClick={() => insertarSintaxis('1. ')} className="p-1.5 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Lista numerada"><ListOrdered className="w-4 h-4" /></button>
            <button onClick={() => insertarSintaxis('- [ ] ')} className="p-1.5 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Checklist"><CheckSquare className="w-4 h-4" /></button>
            <button onClick={() => insertarSintaxis('> ')} className="p-1.5 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Cita"><Quote className="w-4 h-4" /></button>
            <button onClick={() => insertarSintaxis('```\n', '\n```')} className="p-1.5 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Código"><Code className="w-4 h-4" /></button>
          </div>

          {/* Selector de modo y Guardado */}
          <div className="flex items-center gap-2">
            <div className="flex bg-theme-bg border border-theme-border rounded-lg p-0.5">
              <button
                onClick={() => setModoVista('edit')}
                className={`p-1.5 rounded-md ${modoVista === 'edit' ? 'bg-theme-accent text-theme-bg shadow' : 'text-theme-text/60'}`}
                title="Solo Editor"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setModoVista('split')}
                className={`p-1.5 rounded-md ${modoVista === 'split' ? 'bg-theme-accent text-theme-bg shadow' : 'text-theme-text/60'}`}
                title="Vista Dividida"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setModoVista('preview')}
                className={`p-1.5 rounded-md ${modoVista === 'preview' ? 'bg-theme-accent text-theme-bg shadow' : 'text-theme-text/60'}`}
                title="Solo Previa"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => guardarNota()}
              disabled={guardando}
              className="flex items-center gap-1.5 bg-theme-accent hover:opacity-90 text-theme-bg px-3 py-1.5 rounded-lg text-xs font-black uppercase shadow transition-all cursor-pointer disabled:opacity-50"
            >
              {guardando ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : guardadoExitoso ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {guardando ? 'Guardando' : guardadoExitoso ? 'Listo' : 'Guardar'}
              </span>
            </button>
          </div>
        </header>

        {/* Zona de trabajo: Editor y/o Preview */}
        <div className="flex-1 flex overflow-hidden">
          {(modoVista === 'edit' || modoVista === 'split') && (
            <div className={`h-full flex flex-col ${modoVista === 'split' ? 'w-1/2 border-r border-theme-border' : 'w-full'}`}>
              <textarea
                ref={textareaRef}
                value={contenido}
                onChange={manejarCambioContenido}
                placeholder="Escribe en Markdown aquí..."
                className="w-full h-full p-6 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-theme-text placeholder:text-theme-text/30 overflow-y-auto"
                spellCheck="false"
              />
            </div>
          )}

          {(modoVista === 'preview' || modoVista === 'split') && (
            <div className={`h-full p-6 overflow-y-auto ${modoVista === 'split' ? 'w-1/2' : 'w-full'}`}>
              <div 
                className="max-w-none text-theme-text leading-relaxed text-sm"
                dangerouslySetInnerHTML={{ __html: formatearMarkdown(contenido) }}
              />
            </div>
          )}
        </div>

      </main>
    </div>
  );
}