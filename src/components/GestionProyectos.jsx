import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  applyNodeChanges, 
  applyEdgeChanges, 
  addEdge,
  Handle,
  Position,
  NodeResizer,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '../supabase';
import { Layers, Trash2 } from 'lucide-react';

// =========================================================
// STYLES & THEME CONSTANTS (Obsidian Minimalist Aesthetic)
// =========================================================
const connectionLineStyle = { stroke: 'var(--color-theme-border)', strokeWidth: 1.5 };

const defaultEdgeOptions = {
  animated: false, 
  style: { 
    stroke: 'var(--color-theme-accent)',
    strokeWidth: 1.7,
  }, 
};

const OPCIONES_COLOR_GRUPO = [
  { id: 'purple',  nombre: 'Morado',    bg: 'bg-theme-bg', border: 'border-purple-500/80',  dot: 'bg-purple-500',  text: 'text-purple-400' },
  { id: 'blue',    nombre: 'Azul',      bg: 'bg-theme-bg', border: 'border-blue-500/80',    dot: 'bg-blue-500',    text: 'text-blue-400' },
  { id: 'emerald', nombre: 'Esmeralda', bg: 'bg-theme-bg', border: 'border-emerald-500/80', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  { id: 'amber',   nombre: 'Ámbar',     bg: 'bg-theme-bg', border: 'border-amber-500/80',   dot: 'bg-amber-500',   text: 'text-amber-400' },
  { id: 'rose',    nombre: 'Rosa',      bg: 'bg-theme-bg', border: 'border-rose-500/80',    dot: 'bg-rose-500',    text: 'text-rose-400' },
  { id: 'zinc',    nombre: 'Gris',      bg: 'bg-theme-bg', border: 'border-zinc-500/60',    dot: 'bg-zinc-400',    text: 'text-zinc-400' },
];

// =========================================================
// 1. NODO GRUPO
// =========================================================
function NodoGrupoExpandible(props) {
  const { id, data, selected } = props;
  const colorActual = OPCIONES_COLOR_GRUPO.find(c => c.id === data.color) || OPCIONES_COLOR_GRUPO[0];

  return (
    <div className={`w-full h-full border-[3px] rounded-2xl p-4 font-mono text-left relative min-w-[200px] min-h-[150px] transition-all duration-200 group/groupnode ${colorActual.bg} ${
      selected ? 'border-solid ring-1 ring-theme-text/20 ' + colorActual.border : colorActual.border + ' hover:brightness-125'
    }`}>  
      <NodeResizer 
        color="var(--color-theme-accent)" 
        minWidth={200} 
        minHeight={150} 
        isVisible={selected} 
        lineClassName="border-theme-accent/30"
        handleClassName="!w-3 !h-3 !bg-theme-bg !border !border-theme-accent !rounded-sm"
        onResizeEnd={(event, params) => {
          if (data.onResizeGrupo) {
            data.onResizeGrupo(id, params.width, params.height);
          }
        }}
      />

      <div className="opacity-0 group-hover/groupnode:opacity-100 transition-opacity duration-200">
        <Handle type="target" position={Position.Top} id="g-t-in" className="w-2 h-2 !bg-theme-border border-none z-50" />
        <Handle type="source" position={Position.Top} id="g-t-out" className="w-1.5 h-1.5 !bg-theme-accent border-none z-50" />
        <Handle type="target" position={Position.Bottom} id="g-b-in" className="w-2 h-2 !bg-theme-border border-none z-50" />
        <Handle type="source" position={Position.Bottom} id="g-b-out" className="w-1.5 h-1.5 !bg-theme-accent border-none z-50" />
        <Handle type="target" position={Position.Left} id="g-l-in" className="w-2 h-2 !bg-theme-border border-none z-50" />
        <Handle type="source" position={Position.Left} id="g-l-out" className="w-1.5 h-1.5 !bg-theme-accent border-none z-50" />
        <Handle type="target" position={Position.Right} id="g-r-in" className="w-2 h-2 !bg-theme-border border-none z-50" />
        <Handle type="source" position={Position.Right} id="g-r-out" className="w-1.5 h-1.5 !bg-theme-accent border-none z-50" />
      </div>

      <div className="absolute top-3 left-4 flex items-center gap-2 nodrag select-none z-50">
        <Layers className={`w-4 h-4 ${colorActual.text}`} />
        <span className="text-[12px] font-semibold tracking-wider text-theme-text uppercase bg-theme-bg/80 px-2 py-0.5 rounded border border-theme-border shadow-md">
          {data.label}
        </span>
      </div>

      <div className="absolute top-full left-4 pt-2 z-[100] nodrag pointer-events-none opacity-0 group-hover/groupnode:opacity-100 transition-opacity duration-150">
        <div className="bg-theme-bg border border-theme-border rounded-md shadow-2xl px-2.5 py-1.5 flex items-center gap-2 pointer-events-auto antialiased [transform:translateZ(0)]">
          <div className="flex items-center gap-1">
            {OPCIONES_COLOR_GRUPO.map((c) => (
              <button
                key={c.id}
                onClick={() => data.onCambiarColorGrupo && data.onCambiarColorGrupo(id, c.id)}
                className={`w-3 h-3 rounded-full ${c.dot} transition-transform hover:scale-125 cursor-pointer ${
                  (data.color || 'purple') === c.id ? 'ring-2 ring-theme-text scale-110' : 'opacity-60 hover:opacity-100'
                }`}
                title={c.nombre || `Color ${c.id}`}
              />
            ))}
          </div>
          <div className="w-[1px] h-3 bg-theme-border/60" />
          <button 
            onClick={() => data.onEliminarNodo && data.onEliminarNodo(id)} 
            className="text-theme-text/80 hover:text-theme-casa p-1 rounded transition-colors cursor-pointer flex items-center gap-1 font-mono"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-medium leading-none select-none">Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// 2. NODO NOTA/META
// =========================================================
function NodoMetaAutonomo(props) {
  const { id, data, selected } = props;
  
  let statusColor = 'border-2 border-theme-border bg-theme-bg text-theme-text';
  if (data.status === 'En Progreso') {
    statusColor = 'border-2 border-theme-accent/50 bg-theme-bg text-theme-accent';
  }
  if (data.status === 'Completado') {
    statusColor = 'border-2 border-theme-trabajo/50 bg-theme-bg text-theme-trabajo';
  }

  const handleClass = "w-1.5 h-1.5 !bg-theme-border !opacity-0 group-hover/node:!opacity-100 transition-opacity !cursor-crosshair before:content-[''] before:absolute before:w-6 before:h-6 before:bg-transparent before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:z-[80]";

  return (
    <div className={`border rounded-lg p-3 w-56 shadow-2xl font-mono text-left transition-all duration-200 relative group/node ${statusColor} ${selected ? 'ring-1 ring-theme-text border-theme-text shadow-2xl' : ''}`}>
      <Handle type="target" position={Position.Top} id="t" className={`${handleClass} z-[60]`} />
      <Handle type="source" position={Position.Top} id="t-o" className={`${handleClass} z-[60]`} />
      <Handle type="target" position={Position.Bottom} id="b" className={`${handleClass} z-[70]`} style={{ bottom: '-4px' }} />
      <Handle type="source" position={Position.Bottom} id="b-o" className={`${handleClass} z-[70]`} style={{ bottom: '-4px' }} />
      <Handle type="target" position={Position.Left} id="l" className={`${handleClass} z-[60]`} />
      <Handle type="source" position={Position.Left} id="l-o" className={`${handleClass} z-[60]`} />
      <Handle type="target" position={Position.Right} id="r" className={`${handleClass} z-[60]`} />
      <Handle type="source" position={Position.Right} id="r-o" className={`${handleClass} z-[60]`} />

      <div 
        className="min-w-0 cursor-text select-none"
        onDoubleClick={() => {
          const nuevoTexto = prompt("Editar contenido de la nota:", data.label);
          if (nuevoTexto && nuevoTexto.trim() && nuevoTexto.trim() !== data.label) {
            data.onEditarTexto && data.onEditarTexto(id, nuevoTexto.trim());
          }
        }}
      >
        <p className={`font-normal text-[13px] leading-snug tracking-wide break-words text-theme-text ${data.status === 'Completado' ? 'line-through opacity-50' : ''}`}>
          {data.label}
        </p>
      </div>

      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 z-[50] nodrag pointer-events-none opacity-0 group-hover/node:opacity-100 transition-all duration-150 ease-out">
        <div className="bg-theme-bg border border-theme-border rounded-md shadow-2xl px-2 py-1 flex items-center gap-1.5 backdrop-blur-md pointer-events-auto">
          <button onClick={() => data.onCambiarEstado && data.onCambiarEstado(id, 'Por Hacer')} className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${data.status === 'Por Hacer' ? 'bg-theme-border text-theme-bg' : 'text-theme-text/50 hover:text-theme-text'}`}>Nota</button>
          <button onClick={() => data.onCambiarEstado && data.onCambiarEstado(id, 'En Progreso')} className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${data.status === 'En Progreso' ? 'bg-theme-accent text-theme-bg' : 'text-theme-text/50 hover:text-theme-text'}`}>Progreso</button>
          <button onClick={() => data.onCambiarEstado && data.onCambiarEstado(id, 'Completado')} className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${data.status === 'Completado' ? 'bg-theme-trabajo text-theme-bg' : 'text-theme-text/50 hover:text-theme-text'}`}>Listo</button>
          <div className="w-[1px] h-3 bg-theme-border/60" />
          <button onClick={() => data.onEliminarNodo && data.onEliminarNodo(id)} className="text-theme-text/50 hover:text-theme-casa p-0.5 rounded transition-colors cursor-pointer"><Trash2 className="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { nodoMeta: NodoMetaAutonomo, nodoGrupo: NodoGrupoExpandible };

// =========================================================
// 3. COMPONENTE PRINCIPAL
// =========================================================
export function GestionProyectosContenido() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const flowWrapper = useRef(null);
  
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const contadorMetasLocal = useRef(0);
  const contadorGruposLocal = useRef(0);

  // 🟢 PERSISTENCIA ATÓMICA EN SUPABASE
  const guardarEnSupabase = async (nodosAGuardar, edgesAGuardar) => {
    try {
      const nodosSerializables = nodosAGuardar.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        style: n.style,
        parentId: n.parentId,
        data: {
          id: n.data.id,
          label: n.data.label,
          status: n.data.status,
          color: n.data.color
        }
      }));

      await supabase
        .from('mapa_proyectos')
        .upsert({
          id: 'principal',
          nodes: nodosSerializables,
          edges: edgesAGuardar,
          updated_at: new Date().toISOString()
        });
    } catch (err) {
      console.error('Error al guardar mapa en Supabase:', err);
    }
  };

  const cambiarColorGrupo = useCallback((idGrupo, nuevoColor) => {
    setNodes((nds) => {
      const actualizados = nds.map((n) => {
        if (n.id === idGrupo) {
          return { ...n, data: { ...n.data, color: nuevoColor } };
        }
        return n;
      });
      guardarEnSupabase(actualizados, edgesRef.current);
      return actualizados;
    });
  }, []);

  const resizeGrupo = useCallback((idGrupo, width, height) => {
    setNodes((nds) => {
      const actualizados = nds.map((n) => {
        if (n.id === idGrupo) {
          return { ...n, style: { ...n.style, width, height } };
        }
        return n;
      });
      guardarEnSupabase(actualizados, edgesRef.current);
      return actualizados;
    });
  }, []);

  const cambiarEstadoMeta = useCallback((idNodo, nuevoEstado) => {
    setNodes((nds) => {
      const actualizados = nds.map((n) => {
        if (n.id === idNodo) return { ...n, data: { ...n.data, status: nuevoEstado } };
        return n;
      });
      guardarEnSupabase(actualizados, edgesRef.current);
      return actualizados;
    });
  }, []);

  const editarTextoMeta = useCallback((idNodo, nuevoTexto) => {
    setNodes((nds) => {
      const actualizados = nds.map((n) => {
        if (n.id === idNodo) {
          return { ...n, data: { ...n.data, label: nuevoTexto } };
        }
        return n;
      });
      guardarEnSupabase(actualizados, edgesRef.current);
      return actualizados;
    });
  }, []);

  const eliminarNodo = useCallback((idNodo) => {
    setNodes((nds) => {
      const nodoABorrar = nds.find(n => n.id === idNodo);
      const esGrupo = nodoABorrar?.type === 'nodoGrupo';
      const nodosFiltrados = nds.filter((n) => n.id !== idNodo);

      let actualizadosNodos = [];
      if (esGrupo) {
        // Liberar a los hijos si se elimina su contenedor
        actualizadosNodos = nodosFiltrados.map(n => {
          if (n.parentId === idNodo) {
            const posXAbs = n.position.x + (nodoABorrar.position?.x || 0);
            const posYAbs = n.position.y + (nodoABorrar.position?.y || 0);
            return { ...n, parentId: undefined, position: { x: posXAbs, y: posYAbs } };
          }
          return n;
        });
      } else {
        actualizadosNodos = nodosFiltrados;
      }

      setEdges((eds) => {
        const actualizadasEdges = eds.filter((e) => e.source !== idNodo && e.target !== idNodo);
        guardarEnSupabase(actualizadosNodos, actualizadasEdges);
        return actualizadasEdges;
      });

      return actualizadosNodos;
    });
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    const confirmar = window.confirm("¿Deseas eliminar este enlace de conexión?");
    if (!confirmar) return;

    setEdges((eds) => {
      const actualizadas = eds.filter((e) => e.id !== edge.id);
      guardarEnSupabase(nodesRef.current, actualizadas);
      return actualizadas;
    });
  }, []);

  const cargarMapa = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mapa_proyectos')
        .select('*')
        .eq('id', 'principal')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const rawNodes = data?.nodes || [];
      const rawEdges = data?.edges || [];

      contadorMetasLocal.current = rawNodes.filter(n => n.type !== 'nodoGrupo').length;
      contadorGruposLocal.current = rawNodes.filter(n => n.type === 'nodoGrupo').length;

      const nodosConFunciones = rawNodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          onCambiarEstado: cambiarEstadoMeta,
          onEliminarNodo: eliminarNodo,
          onEditarTexto: editarTextoMeta,
          onCambiarColorGrupo: cambiarColorGrupo,
          onResizeGrupo: resizeGrupo
        }
      }));

      setNodes(nodosConFunciones);
      setEdges(rawEdges.map(e => ({ ...e, ...defaultEdgeOptions })));
    } catch (e) {
      console.error("Error al cargar mapa desde Supabase:", e);
    }
  }, [cambiarEstadoMeta, eliminarNodo, editarTextoMeta, cambiarColorGrupo, resizeGrupo]);

  useEffect(() => {
    cargarMapa();
  }, [cargarMapa]);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const actualizados = applyNodeChanges(changes, nds);
      nodesRef.current = actualizados;
      return actualizados;
    });
  }, []);

  // 🎯 DETECCIÓN DE CONTENCIÓN EN GRUPOS AL SOLTAR EL NODO
  const onNodeDragStop = useCallback((event, nodoMovido) => {
    setNodes((nds) => {
      if (nodoMovido.type !== 'nodoMeta') {
        guardarEnSupabase(nds, edgesRef.current);
        return nds;
      }

      const grupos = nds.filter(n => n.type === 'nodoGrupo');
      
      // 1. Calcular posición absoluta en el lienzo
      let posXAbs = nodoMovido.position.x;
      let posYAbs = nodoMovido.position.y;

      if (nodoMovido.parentId) {
        const padreAnterior = nds.find(n => n.id === nodoMovido.parentId);
        if (padreAnterior) {
          posXAbs += padreAnterior.position.x;
          posYAbs += padreAnterior.position.y;
        }
      }

      const centroX = posXAbs + 112; // Ancho aproximado/2 (w-56)
      const centroY = posYAbs + 30;

      // 2. Verificar sobre cuál grupo cayó
      let nuevoPadre = null;
      for (const g of grupos) {
        const anchoG = (typeof g.style?.width === 'number' ? g.style.width : 380);
        const altoG = (typeof g.style?.height === 'number' ? g.style.height : 280);

        if (
          centroX >= g.position.x &&
          centroX <= g.position.x + anchoG &&
          centroY >= g.position.y &&
          centroY <= g.position.y + altoG
        ) {
          nuevoPadre = g;
          break;
        }
      }

      const nuevoParentId = nuevoPadre ? nuevoPadre.id : undefined;

      // 3. Si cambió de contenedor o fue sacado al lienzo
      if (nodoMovido.parentId !== nuevoParentId) {
        const nuevaX = nuevoPadre ? posXAbs - nuevoPadre.position.x : posXAbs;
        const nuevaY = nuevoPadre ? posYAbs - nuevoPadre.position.y : posYAbs;

        const actualizadosConPadre = nds.map(n => {
          if (n.id === nodoMovido.id) {
            return {
              ...n,
              parentId: nuevoParentId,
              position: { x: nuevaX, y: nuevaY }
            };
          }
          return n;
        });

        // Ordenar para que los grupos queden al fondo del árbol DOM
        const ordenados = [...actualizadosConPadre].sort((a, b) => (a.type === 'nodoGrupo' ? -1 : 1));
        guardarEnSupabase(ordenados, edgesRef.current);
        return ordenados;
      }

      guardarEnSupabase(nds, edgesRef.current);
      return nds;
    });
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      const actualizadas = applyEdgeChanges(changes, eds);
      edgesRef.current = actualizadas;
      return actualizadas;
    });
  }, []);

  const onConnect = useCallback((params) => {
    const nuevaConexion = { ...params, id: `edge_${Date.now()}`, ...defaultEdgeOptions };
    setEdges((eds) => {
      const actualizadas = addEdge(nuevaConexion, eds);
      guardarEnSupabase(nodesRef.current, actualizadas);
      return actualizadas;
    });
  }, []);

  const handleCrearNuevaMetaDirecta = (posicionExplicita = null) => {
    const texto = prompt("Contenido de la nota:");
    if (!texto || !texto.trim()) return;

    const idMeta = `meta_${Date.now()}`;
    const textoLimpio = texto.trim();

    let posicionFinal = posicionExplicita;
    if (!posicionFinal) {
      const desvíoX = (contadorMetasLocal.current % 8) * 20;
      const desvíoY = (contadorMetasLocal.current % 8) * 35;
      posicionFinal = { x: 250 + desvíoX, y: 150 + desvíoY };
    }

    contadorMetasLocal.current += 1;

    const nuevaTarjetaMeta = {
      id: idMeta, 
      type: 'nodoMeta', 
      position: posicionFinal,
      data: { 
        id: idMeta, 
        label: textoLimpio, 
        status: 'Por Hacer', 
        onCambiarEstado: cambiarEstadoMeta, 
        onEliminarNodo: eliminarNodo, 
        onEditarTexto: editarTextoMeta 
      }
    };

    setNodes((nds) => {
      const actualizados = [...nds, nuevaTarjetaMeta];
      guardarEnSupabase(actualizados, edgesRef.current);
      return actualizados;
    });
  };

  const handleCrearContenedorGrupo = () => {
    const nombre = prompt("Nombre del Grupo:");
    if (!nombre || !nombre.trim()) return;

    const idGrupo = `grupo_${Date.now()}`;
    const nombreLimpio = nombre.trim();

    const desvíoX = (contadorGruposLocal.current % 5) * 25;
    const desvíoY = (contadorGruposLocal.current % 5) * 40;
    const posicionCascada = { x: 150 + desvíoX, y: 100 + desvíoY };

    contadorGruposLocal.current += 1;

    const nuevoGrupo = {
      id: idGrupo, 
      type: 'nodoGrupo', 
      position: posicionCascada, 
      style: { width: 380, height: 280 }, 
      data: { 
        id: idGrupo,
        label: nombreLimpio, 
        color: 'purple',
        onEliminarNodo: eliminarNodo, 
        onCambiarColorGrupo: cambiarColorGrupo,
        onResizeGrupo: resizeGrupo
      }
    };

    setNodes((nds) => {
      const actualizados = [nuevoGrupo, ...nds];
      guardarEnSupabase(actualizados, edgesRef.current);
      return actualizados;
    });
  };

  const { screenToFlowPosition } = useReactFlow();

  const onPaneClick = useCallback((event) => {
    const posicionMapa = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    handleCrearNuevaMetaDirecta(posicionMapa);
  }, [screenToFlowPosition, handleCrearNuevaMetaDirecta]);

  return (
    <div className="h-[calc(100vh-40px)] w-full flex flex-col space-y-4 text-left font-mono bg-theme-bg p-4 text-theme-text">
      <div className="flex justify-between items-center border-b border-theme-border/40 pb-3">
        <div>
          <h2 className="text-xl font-medium text-theme-accent tracking-tight">Gráfico de Proyectos</h2>
          <p className="text-[11px] text-theme-text/50 tracking-wide mt-0.5">Mapa de Proyectos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleCrearContenedorGrupo} className="bg-theme-bg hover:opacity-80 text-theme-text border border-theme-border px-3 py-1.5 rounded-lg text-xs font-normal flex items-center transition-all cursor-pointer">
            <Layers className="w-3.5 h-3.5 mr-1.5 text-theme-accent" /> Crear Grupo
          </button>
        </div>
      </div>

      <div className="flex-1 w-full bg-theme-bg rounded-xl border border-theme-border relative overflow-hidden" ref={flowWrapper}>
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange} 
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange} 
          onConnect={onConnect} 
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick} 
          nodeTypes={nodeTypes}
          connectionLineStyle={connectionLineStyle}
          fitView={nodes.length > 1}
          fitViewOptions={{ minZoom: 0.1, maxZoom: 1, padding: 0.2 }}
          minZoom={0.1} 
          maxZoom={2}
          translateExtent={[[-7500, -3000], [7500, 3000]]}
          nodeExtent={[[-7500, -3000], [7500, 3000]]}
          className="z-10"
        >
          <Background color="var(--color-theme-border)" gap={20} size={1} />
          <Controls className="!bg-theme-bg !border-theme-border !shadow-2xl opacity-60 hover:opacity-100 transition-opacity" />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function GestionProyectos() {
  return (
    <ReactFlowProvider>
      <GestionProyectosContenido />
    </ReactFlowProvider>
  );
}