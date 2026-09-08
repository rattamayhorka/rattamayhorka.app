import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Trash2, Save, Search, 
  Bold, Italic, Heading1, Heading2, List, 
  CheckSquare, Eye, Edit3, Loader2, BookOpen, Check 
} from 'lucide-react';

export default function Notas({ refreshTrigger }) {
  const [notas, setNotas] = useState([]);
  const [notaActiva, setNotaActiva] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  
  // Modos de visualización en 1 sola columna:
  // 'live' = formateado y editable en tiempo real (Obsidian / Typora)
  // 'raw'  = código Markdown plano
  // 'read' = solo lectura
  const [modo, setModo] = useState('live');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  const editableRef = useRef(null);
  const textareaRef = useRef(null);
  const autoGuardadoRef = useRef(null);

  useEffect(() => {
    cargarNotas(false);
  }, [refreshTrigger]);

  // Sincronizar el contenedor en vivo cuando cambia la nota o el modo
  useEffect(() => {
    if (modo === 'live' && editableRef.current) {
      if (editableRef.current.innerText !== contenido) {
        editableRef.current.innerHTML = formatearMarkdownAHtml(contenido);
      }
    }
  }, [notaActiva?.id, modo]);

  // Cargar notas desde Supabase
  const cargarNotas = async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    try {
      const { data, error } = await supabase
        .from('notas')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const lista = data || [];
      setNotas(lista);
      if (lista.length > 0) {
        seleccionarNota(lista[0]);
      } else {
        crearNuevaNota();
      }
    } catch (err) {
      console.error('Error al sincronizar notas con Supabase:', err);
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  const seleccionarNota = (nota) => {
    setNotaActiva(nota);
    setTitulo(nota.titulo || '');
    setContenido(nota.contenido || '');
    if (editableRef.current) {
      editableRef.current.innerHTML = formatearMarkdownAHtml(nota.contenido || '');
    }
  };

  // Crear nueva nota en Supabase
  const crearNuevaNota = async () => {
    setGuardando(true);
    const nueva = {
      titulo: 'Nota sin título',
      contenido: '# Nueva Nota\n\nComienza a escribir aquí...',
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('notas')
        .insert([nueva])
        .select()
        .single();

      if (error) throw error;

      setNotas(prev => [data, ...prev]);
      seleccionarNota(data);
    } catch (err) {
      console.error('Error al crear nota en Supabase:', err);
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar nota de Supabase
  const eliminarNota = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('¿Seguro que deseas eliminar esta nota?')) return;

    try {
      const { error } = await supabase
        .from('notas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const restantes = notas.filter(n => n.id !== id);
      setNotas(restantes);
      if (notaActiva?.id === id) {
        if (restantes.length > 0) seleccionarNota(restantes[0]);
        else crearNuevaNota();
      }
    } catch (err) {
      console.error('Error al eliminar nota en Supabase:', err);
    }
  };

  // Guardar cambios en Supabase
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

      setNotas(prev => prev.map(n => (n.id === data.id ? data : n)));
      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 2000);
    } catch (err) {
      console.error('Error al guardar nota en Supabase:', err);
    } finally {
      setGuardando(false);
    }
  };

  // Auto-guardado con debounce
  const programarAutoGuardado = (t, c) => {
    if (autoGuardadoRef.current) clearTimeout(autoGuardadoRef.current);
    autoGuardadoRef.current = setTimeout(() => {
      guardarNota(t, c);
    }, 1200);
  };

  const manejarCambioTitulo = (e) => {
    const val = e.target.value;
    setTitulo(val);
    programarAutoGuardado(val, contenido);
  };

  const manejarCambioRaw = (e) => {
    const val = e.target.value;
    setContenido(val);
    programarAutoGuardado(titulo, val);
  };

  const manejarInputLive = () => {
    if (!editableRef.current) return;
    const nuevoTexto = editableRef.current.innerText;
    setContenido(nuevoTexto);
    programarAutoGuardado(titulo, nuevoTexto);
  };

  // Botones de formato
  const insertarSintaxis = (simbolo) => {
    if (modo === 'raw' && textareaRef.current) {
      const el = textareaRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const texto = el.value;
      const sel = texto.substring(start, end);
      const res = `${simbolo}${sel || 'texto'}${simbolo}`;
      const final = texto.substring(0, start) + res + texto.substring(end);
      setContenido(final);
      guardarNota(titulo, final);
    } else {
      const nuevo = contenido + `\n${simbolo} Texto`;
      setContenido(nuevo);
      if (editableRef.current) {
        editableRef.current.innerHTML = formatearMarkdownAHtml(nuevo);
      }
      guardarNota(titulo, nuevo);
    }
  };

  const formatearMarkdownAHtml = (texto) => {
    if (!texto) return '';
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-black text-theme-accent mt-3 mb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-black text-theme-accent mt-4 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-theme-accent border-b border-theme-border/60 pb-2 mb-3">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-theme-accent">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="italic text-theme-text/80">$1</em>')
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-2 border-theme-accent pl-3 py-1 my-2 italic bg-theme-border/10 rounded-r text-theme-text/70">$1</blockquote>')
      .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled class="rounded accent-theme-accent" /> <span>$1</span></div>')
      .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled class="rounded accent-theme-accent" /> <span class="line-through opacity-40">$1</span></div>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-theme-border/20 p-3 rounded font-mono text-xs my-2 overflow-x-auto text-theme-accent"><code>$1</code></pre>')
      .replace(/`(.*?)`/gim, '<code class="bg-theme-border/30 px-1.5 py-0.5 rounded font-mono text-xs text-theme-accent">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  const notasFiltradas = notas.filter(n => 
    (n.titulo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (n.contenido || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-theme-bg text-theme-text border border-theme-border rounded-2xl overflow-hidden shadow-2xl font-mono">
      
      {/* PANEL LATERAL: LISTA DE NOTAS */}
      <aside className="w-64 bg-theme-card border-r border-theme-border flex flex-col flex-shrink-0">
        <div className="p-3.5 border-b border-theme-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-theme-accent" />
            <span className="font-black text-xs uppercase tracking-wider">Vault</span>
          </div>
          <button 
            onClick={crearNuevaNota}
            className="p-1.5 bg-theme-accent text-theme-bg rounded-lg hover:opacity-90 transition-all cursor-pointer"
            title="Nueva Nota"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>

        <div className="p-2.5 border-b border-theme-border/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-theme-text/40" />
            <input 
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-theme-bg border border-theme-border rounded-lg pl-8 pr-2.5 py-1 text-xs text-theme-text outline-none focus:border-theme-accent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {cargando && (
            <div className="flex justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin text-theme-accent" />
            </div>
          )}

          {!cargando && notasFiltradas.length === 0 && (
            <p className="text-[10px] text-center text-theme-text/40 py-6">Sin notas</p>
          )}

          {notasFiltradas.map((n) => {
            const activa = notaActiva?.id === n.id;
            return (
              <div
                key={n.id}
                onClick={() => seleccionarNota(n)}
                className={`group flex items-center justify-between p-2 rounded-xl cursor-pointer text-left transition-all ${
                  activa 
                    ? 'bg-theme-accent/15 border border-theme-accent/30 text-theme-accent font-bold' 
                    : 'hover:bg-theme-border/20 text-theme-text/80'
                }`}
              >
                <div className="truncate pr-2">
                  <p className="text-xs truncate">{n.titulo || 'Sin título'}</p>
                  <span className="text-[8px] text-theme-text/40 block truncate">
                    {new Date(n.updated_at || n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={(e) => eliminarNota(n.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-opacity cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ÁREA DE EDICIÓN: 1 SOLA COLUMNA */}
      <main className="flex-1 flex flex-col min-w-0 bg-theme-bg">
        
        {/* BARRA SUPERIOR */}
        <header className="h-12 border-b border-theme-border px-4 flex items-center justify-between gap-3 bg-theme-card/30">
          <input 
            type="text"
            value={titulo}
            onChange={manejarCambioTitulo}
            placeholder="Título..."
            className="bg-transparent text-sm font-black text-theme-text outline-none focus:border-b focus:border-theme-accent flex-1 max-w-sm"
          />

          <div className="hidden sm:flex items-center gap-1">
            <button onClick={() => insertarSintaxis('**')} className="p-1 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Negrita"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertarSintaxis('*')} className="p-1 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Cursiva"><Italic className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertarSintaxis('# ')} className="p-1 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Encabezado"><Heading1 className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertarSintaxis('- ')} className="p-1 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Lista"><List className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertarSintaxis('- [ ] ')} className="p-1 hover:bg-theme-border/30 rounded text-theme-text/70 hover:text-theme-accent" title="Tarea"><CheckSquare className="w-3.5 h-3.5" /></button>
          </div>

          {/* CONMUTADOR DE VISTAS (EN LA MISMA COLUMNA) */}
          <div className="flex items-center gap-2">
            <div className="flex bg-theme-bg border border-theme-border rounded-lg p-0.5 text-[10px] font-bold">
              <button
                onClick={() => setModo('live')}
                className={`px-2.5 py-1 rounded-md transition-all ${modo === 'live' ? 'bg-theme-accent text-theme-bg shadow' : 'text-theme-text/60'}`}
                title="Modo editable con formato activo"
              >
                En Vivo
              </button>
              <button
                onClick={() => setModo('raw')}
                className={`px-2.5 py-1 rounded-md transition-all ${modo === 'raw' ? 'bg-theme-accent text-theme-bg shadow' : 'text-theme-text/60'}`}
                title="Modo Markdown plano"
              >
                Markdown
              </button>
              <button
                onClick={() => setModo('read')}
                className={`px-2 py-1 rounded-md transition-all ${modo === 'read' ? 'bg-theme-accent text-theme-bg shadow' : 'text-theme-text/60'}`}
                title="Solo lectura"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>

            <button
              onClick={() => guardarNota()}
              disabled={guardando}
              className="flex items-center gap-1.5 bg-theme-accent hover:opacity-90 text-theme-bg px-2.5 py-1 rounded-lg text-xs font-black uppercase shadow transition-all cursor-pointer disabled:opacity-50"
            >
              {guardando ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : guardadoExitoso ? (
                <Check className="w-3 h-3 stroke-[3]" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">
                {guardando ? '...' : guardadoExitoso ? 'OK' : 'Guardar'}
              </span>
            </button>
          </div>
        </header>

        {/* LIENZO ÚNICO */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-w-4xl w-full mx-auto">
          
          {/* 1. MODO EN VIVO (Formato interactivo editable) */}
          {modo === 'live' && (
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={manejarInputLive}
              className="outline-none min-h-[500px] leading-relaxed text-sm text-theme-text empty:before:content-['Escribe_aquí...'] empty:before:text-theme-text/30"
            />
          )}

          {/* 2. MODO RAW (Markdown plano) */}
          {modo === 'raw' && (
            <textarea
              ref={textareaRef}
              value={contenido}
              onChange={manejarCambioRaw}
              placeholder="Escribe en Markdown..."
              className="w-full h-full min-h-[500px] bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-theme-text placeholder:text-theme-text/30"
              spellCheck="false"
            />
          )}

          {/* 3. MODO SOLO LECTURA */}
          {modo === 'read' && (
            <div 
              className="min-h-[500px] leading-relaxed text-sm text-theme-text select-text"
              dangerouslySetInnerHTML={{ __html: formatearMarkdownAHtml(contenido) }}
            />
          )}

        </div>

      </main>
    </div>
  );
}