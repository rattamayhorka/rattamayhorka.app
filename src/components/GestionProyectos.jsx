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
  ReactFlowProvider,
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '../supabase';
import { 
  Layers, 
  Trash2, 
  Plus, 
  X, 
  FolderKanban, 
  ArrowRight, 
  ArrowLeftRight, 
  Minus 
} from 'lucide-react';

// =========================================================
// STYLES & THEME CONSTANTS (Obsidian Minimalist Aesthetic)
// =========================================================

const connectionLineStyle = { stroke: 'var(--color-theme-border)', strokeWidth: 1.5 };

const defaultEdgeOptions = {
  type: 'customMenuEdge',
  animated: false, 
  style: { 
    stroke: 'var(--color-theme-accent)',
    strokeWidth: 1.7,
  },

  //markerEnd: {
  //  type: MarkerType.ArrowClosed,
  //  width: 16,
  //  height: 16,
  //  color: 'var(--color-theme-accent)'
  //}

  markerEnd: undefined,
  markerStart: undefined,

};

const OPCIONES_COLOR_GRUPO = [
  { id: 'purple',  nombre: 'Morado',    bg: 'bg-purple-500/5',  border: 'border-purple-500/50',  dot: 'bg-purple-500',  text: 'text-purple-400' },
  { id: 'blue',    nombre: 'Azul',      bg: 'bg-blue-500/5',    border: 'border-blue-500/50',    dot: 'bg-blue-500',    text: 'text-blue-400' },
  { id: 'emerald', nombre: 'Esmeralda', bg: 'bg-emerald-500/5', border: 'border-emerald-500/50', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  { id: 'amber',   nombre: 'Ámbar',     bg: 'bg-amber-500/5',   border: 'border-amber-500/50',   dot: 'bg-amber-500',   text: 'text-amber-400' },
  { id: 'rose',    nombre: 'Rosa',      bg: 'bg-rose-500/5',    border: 'border-rose-500/50',    dot: 'bg-rose-500',    text: 'text-rose-400' },
  { id: 'zinc',    nombre: 'Gris',      bg: 'bg-zinc-500/5',    border: 'border-zinc-500/40',    dot: 'bg-zinc-400',    text: 'text-zinc-400' },
];

// =========================================================
// 🟢 CUSTOM EDGE INTERACTIVO CON MENÚ FLOTANTE
// =========================================================
function CustomMenuEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  markerStart,
  selected,
  data
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const menuVisible = data?.edgeMenuAbiertoId === id;

  return (
    <>
      {/* 🟢 Línea invisible con pointerEvents garantizado para capturar clic fácil */}
      {/* 🔴 ANTERIOR: strokeWidth={30} */}
      {/* 🟢 NUEVO: strokeWidth={36} para facilitar toque táctil */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={36}
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onClick={(e) => {
          e.stopPropagation();
          data?.onToggleMenuEdge?.(id);
        }}
      />

      {/* Línea visible principal */}
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        markerStart={markerStart} 
        style={{ 
          ...style, 
          cursor: 'pointer',
          stroke: selected || menuVisible ? 'var(--color-theme-accent)' : (style.stroke || 'var(--color-theme-accent)')
        }} 
      />
      
      <EdgeLabelRenderer>
        {/* 🟢 Menú contextual que aparece en el centro de la flecha al hacer clic */}
        {menuVisible && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan z-[100]"
          >
            <div 
              className="bg-theme-bg border border-theme-border rounded-lg shadow-2xl p-1.5 flex items-center gap-1 text-[10px] font-mono whitespace-nowrap backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Flecha en un sentido */}
              <button
                type="button"
                onClick={() => {
                  data?.onModificarEdge?.(id, {
                    markerStart: undefined,
                    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--color-theme-accent)' }
                  });
                  data?.onCerrarMenuEdge?.();
                }}
                className="p-1 hover:bg-theme-border/30 rounded text-theme-text/80 hover:text-theme-accent cursor-pointer"
                title="Flecha en un sentido"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* 2. Flecha en dos sentidos */}
              <button
                type="button"
                onClick={() => {
                  data?.onModificarEdge?.(id, {
                    markerStart: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--color-theme-accent)' },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--color-theme-accent)' }
                  });
                  data?.onCerrarMenuEdge?.();
                }}
                className="p-1 hover:bg-theme-border/30 rounded text-theme-text/80 hover:text-theme-accent cursor-pointer"
                title="Flecha en ambos sentidos"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              {/* 3. Solo unión (sin flechas) */}
              <button
                type="button"
                onClick={() => {
                  data?.onModificarEdge?.(id, {
                    markerStart: undefined,
                    markerEnd: undefined,
                    style: { ...style, strokeDasharray: undefined }
                  });
                  data?.onCerrarMenuEdge?.();
                }}
                className="p-1 hover:bg-theme-border/30 rounded text-theme-text/80 hover:text-theme-accent cursor-pointer"
                title="Línea sólida simple"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {/* 4. Unión punteada */}
              <button
                type="button"
                onClick={() => {
                  const tieneDash = !!style.strokeDasharray;
                  data?.onModificarEdge?.(id, {
                    style: {
                      ...style,
                      strokeDasharray: tieneDash ? undefined : '5,5'
                    }
                  });
                  data?.onCerrarMenuEdge?.();
                }}
                className="px-1.5 py-0.5 hover:bg-theme-border/30 rounded text-theme-text/80 hover:text-theme-accent cursor-pointer font-bold"
                title="Alternar línea punteada / sólida"
              >
                Punteada
              </button>

              <div className="w-[1px] h-3 bg-theme-border/60 mx-0.5" />

              {/* 5. Eliminar conexión */}
              <button
                type="button"
                onClick={() => {
                  data?.onEliminarEdge?.(id);
                  data?.onCerrarMenuEdge?.();
                }}
                className="p-1 hover:bg-theme-casa/20 rounded text-theme-text/80 hover:text-theme-casa cursor-pointer"
                title="Eliminar conexión"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

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

      {/* 🔴 ANTERIOR: <div className="opacity-0 group-hover/groupnode:opacity-100 transition-opacity duration-200"> */}
      {/* 🟢 NUEVO: Handles visibles en hover o al seleccionar la tarjeta en tablet */}
      <div className={`${selected ? 'opacity-100' : 'opacity-0 group-hover/groupnode:opacity-100'} transition-opacity duration-200`}>
        <Handle type="target" position={Position.Top} id="g-t-in" className="w-2.5 h-2.5 !bg-theme-border border-none z-50" />
        <Handle type="source" position={Position.Top} id="g-t-out" className="w-2 h-2 !bg-theme-accent border-none z-50" />
        <Handle type="target" position={Position.Bottom} id="g-b-in" className="w-2.5 h-2.5 !bg-theme-border border-none z-50" />
        <Handle type="source" position={Position.Bottom} id="g-b-out" className="w-2 h-2 !bg-theme-accent border-none z-50" />
        <Handle type="target" position={Position.Left} id="g-l-in" className="w-2.5 h-2.5 !bg-theme-border border-none z-50" />
        <Handle type="source" position={Position.Left} id="g-l-out" className="w-2 h-2 !bg-theme-accent border-none z-50" />
        <Handle type="target" position={Position.Right} id="g-r-in" className="w-2.5 h-2.5 !bg-theme-border border-none z-50" />
        <Handle type="source" position={Position.Right} id="g-r-out" className="w-2 h-2 !bg-theme-accent border-none z-50" />
      </div>

      <div 
        className="absolute top-3 left-4 flex items-center gap-2 nodrag select-none z-50 cursor-pointer"
        onClick={(e) => {
          // 🟢 NUEVO: Un toque sobre la etiqueta permite editar en tablet
          e.stopPropagation();
          const nuevoNombre = prompt("Editar nombre del grupo:", data.label);
          if (nuevoNombre && nuevoNombre.trim() && nuevoNombre.trim() !== data.label) {
            data.onEditarNombreGrupo && data.onEditarNombreGrupo(id, nuevoNombre.trim());
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const nuevoNombre = prompt("Editar nombre del grupo:", data.label);
          if (nuevoNombre && nuevoNombre.trim() && nuevoNombre.trim() !== data.label) {
            data.onEditarNombreGrupo && data.onEditarNombreGrupo(id, nuevoNombre.trim());
          }
        }}
        title="Doble clic para editar nombre del grupo"
      >
        <Layers className={`w-4 h-4 ${colorActual.text}`} />
        <span className="text-[12px] font-semibold tracking-wider text-theme-text uppercase bg-theme-bg/80 px-2 py-0.5 rounded border border-theme-border shadow-md hover:border-theme-accent transition-colors">
          {data.label}
        </span>
      </div>

      {/* 🔴 ANTERIOR: <div className="absolute top-full left-4 pt-2 z-[100] nodrag pointer-events-none opacity-0 group-hover/groupnode:opacity-100 transition-opacity duration-150"> */}
      {/* 🟢 NUEVO: Menú visible por hover O al tocar/seleccionar el nodo en tablet */}
      <div className={`absolute top-full left-4 pt-2 z-[100] nodrag transition-opacity duration-150 ${
        selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover/groupnode:opacity-100 group-hover/groupnode:pointer-events-auto'
      }`}>
        <div className="bg-theme-bg border border-theme-border rounded-md shadow-2xl px-2.5 py-1.5 flex items-center gap-2 pointer-events-auto antialiased [transform:translateZ(0)]">
          <div className="flex items-center gap-1">
            {OPCIONES_COLOR_GRUPO.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  data.onCambiarColorGrupo && data.onCambiarColorGrupo(id, c.id);
                }}
                className={`w-3.5 h-3.5 rounded-full ${c.dot} transition-transform hover:scale-125 cursor-pointer ${
                  (data.color || 'purple') === c.id ? 'ring-2 ring-theme-text scale-110' : 'opacity-60 hover:opacity-100'
                }`}
                title={c.nombre || `Color ${c.id}`}
              />
            ))}
          </div>
          <div className="w-[1px] h-3 bg-theme-border/60" />
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onEliminarNodo && data.onEliminarNodo(id);
            }} 
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

  // 🔴 ANTERIOR: const handleClass = "w-1.5 h-1.5 !bg-theme-border !opacity-0 group-hover/node:!opacity-100 transition-opacity !cursor-crosshair before:content-[''] before:absolute before:w-6 before:h-6 before:bg-transparent before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:z-[80]";
  // 🟢 NUEVO: Área táctil ampliada y visible al seleccionar en tablet
  const handleClass = `w-2 h-2 !bg-theme-border ${selected ? '!opacity-100' : '!opacity-0 group-hover/node:!opacity-100'} transition-opacity !cursor-crosshair before:content-[''] before:absolute before:w-8 before:h-8 before:bg-transparent before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:z-[80]`;

  return (
    <div className={`border rounded-lg p-3 w-56 shadow-2xl font-mono text-left transition-all duration-200 relative group/node ${statusColor} ${selected ? 'ring-2 ring-theme-accent border-theme-accent shadow-2xl' : ''}`}>
      <Handle type="target" position={Position.Top} id="t" className={`${handleClass} z-[60]`} />
      <Handle type="source" position={Position.Top} id="t-o" className={`${handleClass} z-[60]`} />
      <Handle type="target" position={Position.Bottom} id="b" className={`${handleClass} z-[70]`} style={{ bottom: '-4px' }} />
      <Handle type="source" position={Position.Bottom} id="b-o" className={`${handleClass} z-[70]`} style={{ bottom: '-4px' }} />
      <Handle type="target" position={Position.Left} id="l" className={`${handleClass} z-[60]`} />
      <Handle type="source" position={Position.Left} id="l-o" className={`${handleClass} z-[60]`} />
      <Handle type="target" position={Position.Right} id="r" className={`${handleClass} z-[60]`} />
      <Handle type="source" position={Position.Right} id="r-o" className={`${handleClass} z-[60]`} />

      <div 
        className="min-w-0 cursor-pointer select-none"
        onDoubleClick={(e) => {
          e.stopPropagation();
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

      {/* 🔴 ANTERIOR: <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 z-[50] nodrag pointer-events-none opacity-0 group-hover/node:opacity-100 transition-all duration-150 ease-out"> */}
      {/* 🟢 NUEVO: Menú contextual visible por hover O al tocar/seleccionar la tarjeta en tablet */}
      <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[100] nodrag transition-all duration-150 ease-out ${
        selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover/node:opacity-100 group-hover/node:pointer-events-auto'
      }`}>
        <div className="bg-theme-bg border border-theme-border rounded-md shadow-2xl px-2 py-1.5 flex items-center gap-1.5 backdrop-blur-md pointer-events-auto whitespace-nowrap">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onCambiarEstado && data.onCambiarEstado(id, 'Por Hacer');
            }} 
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${data.status === 'Por Hacer' ? 'bg-theme-border text-theme-bg' : 'text-theme-text/50 hover:text-theme-text'}`}
          >
            Nota
          </button>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onCambiarEstado && data.onCambiarEstado(id, 'En Progreso');
            }} 
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${data.status === 'En Progreso' ? 'bg-theme-accent text-theme-bg' : 'text-theme-text/50 hover:text-theme-text'}`}
          >
            Progreso
          </button>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onCambiarEstado && data.onCambiarEstado(id, 'Completado');
            }} 
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${data.status === 'Completado' ? 'bg-theme-trabajo text-theme-bg' : 'text-theme-text/50 hover:text-theme-text'}`}
          >
            Listo
          </button>
          
          {/* 🟢 NUEVO: Botón de editar directo para tablets */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nuevoTexto = prompt("Editar contenido de la nota:", data.label);
              if (nuevoTexto && nuevoTexto.trim() && nuevoTexto.trim() !== data.label) {
                data.onEditarTexto && data.onEditarTexto(id, nuevoTexto.trim());
              }
            }} 
            className="text-[9px] font-medium px-1.5 py-0.5 rounded text-theme-accent hover:bg-theme-accent/10 transition-colors cursor-pointer"
          >
            Editar
          </button>

          <div className="w-[1px] h-3 bg-theme-border/60" />
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onEliminarNodo && data.onEliminarNodo(id);
            }} 
            className="text-theme-text/50 hover:text-theme-casa p-1 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 🟢 DEFINICIÓN FUERA DE LOS COMPONENTES
const nodeTypes = { nodoMeta: NodoMetaAutonomo, nodoGrupo: NodoGrupoExpandible };
const edgeTypes = { customMenuEdge: CustomMenuEdge };

// =========================================================
// 3. COMPONENTE PRINCIPAL
// =========================================================
export function GestionProyectosContenido() {
  const [proyectos, setProyectos] = useState([]);
  const [tabActiva, setTabActiva] = useState('principal');

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [edgeMenuAbiertoId, setEdgeMenuAbiertoId] = useState(null);

  const flowWrapper = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const tabActivaRef = useRef('principal');
  // ==========================================
  // 🟢 NUEVO: Ref síncrona para proyectos y evitar sobrescribir con 'Proyecto'
  const proyectosRef = useRef([]);
  // ==========================================

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    tabActivaRef.current = tabActiva;
  }, [tabActiva]);

  // ==========================================
  // 🟢 NUEVO: Sincronizar referencia de proyectos
  useEffect(() => {
    proyectosRef.current = proyectos;
  }, [proyectos]);
  // ==========================================

  // 🟢 BLOQUEO GLOBAL DEL AUTOSCROLL DEL NAVEGADOR
  useEffect(() => {
    const prevenirAutoScrollGlobal = (e) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    window.addEventListener('mousedown', prevenirAutoScrollGlobal, { capture: true, passive: false });
    window.addEventListener('auxclick', prevenirAutoScrollGlobal, { capture: true, passive: false });

    return () => {
      window.removeEventListener('mousedown', prevenirAutoScrollGlobal, { capture: true });
      window.removeEventListener('auxclick', prevenirAutoScrollGlobal, { capture: true });
    };
  }, []);

  const contadorMetasLocal = useRef(0);
  const contadorGruposLocal = useRef(0);

  // 🟢 PERSISTENCIA EN SUPABASE
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

      const edgesSerializables = edgesAGuardar.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: 'customMenuEdge',
        style: e.style,
        markerStart: e.markerStart,
        markerEnd: e.markerEnd
      }));

      // ==========================================
      // 🔴 ANTERIOR: Tomaba el nombre de 'proyectos' desfasado o 'Proyecto' por default:
      // const proyectoActual = proyectos.find(p => p.id === tabActivaRef.current);
      // const nombreActual = proyectoActual ? proyectoActual.nombre : 'Proyecto';
      //
      // await supabase
      //   .from('mapa_proyectos')
      //   .upsert({
      //     id: tabActivaRef.current,
      //     nombre: nombreActual,
      //     nodes: nodosSerializables,
      //     edges: edgesSerializables,
      //     updated_at: new Date().toISOString()
      //   });
      //
      // 🟢 NUEVO: Busca primero en la ref síncrona; si no tiene nombre, NO sobrescribe la columna 'nombre'
      const proyectoActual = proyectosRef.current.find(p => p.id === tabActivaRef.current);
      
      const payloadUpsert = {
        id: tabActivaRef.current,
        nodes: nodosSerializables,
        edges: edgesSerializables,
        updated_at: new Date().toISOString()
      };

      if (proyectoActual && proyectoActual.nombre && proyectoActual.nombre.trim() !== '') {
        payloadUpsert.nombre = proyectoActual.nombre.trim();
      }

      await supabase
        .from('mapa_proyectos')
        .upsert(payloadUpsert);
      // ==========================================
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

  const editarNombreGrupo = useCallback((idGrupo, nuevoNombre) => {
    setNodes((nds) => {
      const actualizados = nds.map((n) => {
        if (n.id === idGrupo) {
          return { ...n, data: { ...n.data, label: nuevoNombre } };
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

  // =========================================================
  // 🟢 CONTROLADORES DEL MENÚ DE LA FLECHA
  // =========================================================
  const toggleMenuEdge = useCallback((idEdge) => {
    setEdgeMenuAbiertoId(prev => prev === idEdge ? null : idEdge);
  }, []);

  const cerrarMenuEdge = useCallback(() => {
    setEdgeMenuAbiertoId(null);
  }, []);

  const modificarEdge = useCallback((idEdge, nuevosProps) => {
    setEdges((eds) => {
      const actualizadas = eds.map((e) => {
        if (e.id === idEdge) {
          return {
            ...e,
            ...nuevosProps,
            style: { ...e.style, ...(nuevosProps.style || {}) }
          };
        }
        return e;
      });
      guardarEnSupabase(nodesRef.current, actualizadas);
      return actualizadas;
    });
  }, []);

  const eliminarEdge = useCallback((idEdge) => {
    setEdges((eds) => {
      const actualizadas = eds.filter((e) => e.id !== idEdge);
      guardarEnSupabase(nodesRef.current, actualizadas);
      return actualizadas;
    });
  }, []);

  // 🟢 Actualizar el edgeMenuAbiertoId en la data de cada edge
  useEffect(() => {
    setEdges(eds => eds.map(e => ({
      ...e,
      data: {
        ...e.data,
        edgeMenuAbiertoId,
        onToggleMenuEdge: toggleMenuEdge,
        onCerrarMenuEdge: cerrarMenuEdge,
        onModificarEdge: modificarEdge,
        onEliminarEdge: eliminarEdge
      }
    })));
  }, [edgeMenuAbiertoId, toggleMenuEdge, cerrarMenuEdge, modificarEdge, eliminarEdge]);

  const cargarListaProyectos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mapa_proyectos')
        .select('id, nombre, updated_at')
        .order('updated_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const inicial = { id: 'principal', nombre: 'Principal' };
        await supabase.from('mapa_proyectos').insert([{ id: 'principal', nombre: 'Principal', nodes: [], edges: [] }]);
        setProyectos([inicial]);
        proyectosRef.current = [inicial];
        setTabActiva('principal');
      } else {
        setProyectos(data);
        proyectosRef.current = data;
        if (!data.some(p => p.id === tabActivaRef.current)) {
          setTabActiva(data[0].id);
        }
      }
    } catch (e) {
      console.error("Error al cargar lista de proyectos:", e);
    }
  }, []);

  const cargarMapa = useCallback(async (idProyecto) => {
    if (!idProyecto) return;
    try {
      const { data, error } = await supabase
        .from('mapa_proyectos')
        .select('*')
        .eq('id', idProyecto)
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
          onEditarNombreGrupo: editarNombreGrupo,
          onResizeGrupo: resizeGrupo
        }
      }));

      // Inyectar customMenuEdge por defecto
      const edgesConFunciones = rawEdges.map(e => ({
        ...e,
        type: 'customMenuEdge',
        data: {
          edgeMenuAbiertoId: null,
          onToggleMenuEdge: toggleMenuEdge,
          onCerrarMenuEdge: cerrarMenuEdge,
          onModificarEdge: modificarEdge,
          onEliminarEdge: eliminarEdge
        }
      }));

      setNodes(nodosConFunciones);
      setEdges(edgesConFunciones);
    } catch (e) {
      console.error("Error al cargar mapa desde Supabase:", e);
    }
  }, [cambiarEstadoMeta, eliminarNodo, editarTextoMeta, cambiarColorGrupo, editarNombreGrupo, resizeGrupo, toggleMenuEdge, cerrarMenuEdge, modificarEdge, eliminarEdge]);

  useEffect(() => {
    cargarListaProyectos();
  }, [cargarListaProyectos]);

  useEffect(() => {
    if (tabActiva) {
      cargarMapa(tabActiva);
    }
  }, [tabActiva, cargarMapa]);

  const handleCrearProyecto = async () => {
    const nombre = prompt("Nombre del nuevo proyecto o pestaña:");
    if (!nombre || !nombre.trim()) return;

    const idNuevo = `proj_${Date.now()}`;
    const payload = {
      id: idNuevo,
      nombre: nombre.trim(),
      nodes: [],
      edges: []
    };

    try {
      await supabase.from('mapa_proyectos').insert([payload]);
      const nuevaLista = [...proyectosRef.current, { id: idNuevo, nombre: nombre.trim() }];
      setProyectos(nuevaLista);
      proyectosRef.current = nuevaLista;
      setTabActiva(idNuevo);
    } catch (err) {
      console.error("Error al crear pestaña:", err);
    }
  };

  const handleRenombrarProyecto = async (idProyecto, nombreActual) => {
    const nuevoNombre = prompt("Nuevo nombre para la pestaña:", nombreActual);
    if (!nuevoNombre || !nuevoNombre.trim() || nuevoNombre.trim() === nombreActual) return;

    const nombreLimpio = nuevoNombre.trim();

    const actualizados = proyectosRef.current.map(p => p.id === idProyecto ? { ...p, nombre: nombreLimpio } : p);
    setProyectos(actualizados);
    proyectosRef.current = actualizados;

    try {
      const { error } = await supabase
        .from('mapa_proyectos')
        .update({ nombre: nombreLimpio, updated_at: new Date().toISOString() })
        .eq('id', idProyecto);

      if (error) throw error;
    } catch (err) {
      console.error("Error al renombrar proyecto en Supabase:", err);
    }
  };

  const handleEliminarProyecto = async (idAEliminar, nombre) => {
    if (proyectos.length <= 1) {
      alert("Debes tener al menos un proyecto activo.");
      return;
    }

    const confirmar = window.confirm(`¿Seguro que deseas eliminar definitivamente la pestaña "${nombre}" y todo su contenido?`);
    if (!confirmar) return;

    try {
      await supabase.from('mapa_proyectos').delete().eq('id', idAEliminar);
      const restantes = proyectosRef.current.filter(p => p.id !== idAEliminar);
      setProyectos(restantes);
      proyectosRef.current = restantes;
      setTabActiva(restantes[0].id);
    } catch (err) {
      console.error("Error al borrar pestaña:", err);
    }
  };

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const actualizados = applyNodeChanges(changes, nds);
      nodesRef.current = actualizados;
      return actualizados;
    });
  }, []);

  const onNodeDragStop = useCallback((event, nodoMovido) => {
    setNodes((nds) => {
      if (nodoMovido.type !== 'nodoMeta') {
        guardarEnSupabase(nds, edgesRef.current);
        return nds;
      }

      const grupos = nds.filter(n => n.type === 'nodoGrupo');
      let posXAbs = nodoMovido.position.x;
      let posYAbs = nodoMovido.position.y;

      if (nodoMovido.parentId) {
        const padreAnterior = nds.find(n => n.id === nodoMovido.parentId);
        if (padreAnterior) {
          posXAbs += padreAnterior.position.x;
          posYAbs += padreAnterior.position.y;
        }
      }

      const centroX = posXAbs + 112;
      const centroY = posYAbs + 30;

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
    const nuevaConexion = { 
      ...params, 
      id: `edge_${Date.now()}`, 
      type: 'customMenuEdge',
      data: {
        edgeMenuAbiertoId: null,
        onToggleMenuEdge: toggleMenuEdge,
        onCerrarMenuEdge: cerrarMenuEdge,
        onModificarEdge: modificarEdge,
        onEliminarEdge: eliminarEdge
      },
      ...defaultEdgeOptions 
    };
    setEdges((eds) => {
      const actualizadas = addEdge(nuevaConexion, eds);
      guardarEnSupabase(nodesRef.current, actualizadas);
      return actualizadas;
    });
  }, [toggleMenuEdge, cerrarMenuEdge, modificarEdge, eliminarEdge]);

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

    let grupoPadreEncontrado = null;
    let posRelativa = { ...posicionFinal };

    const grupos = nodes.filter(n => n.type === 'nodoGrupo');
    for (const g of grupos) {
      const anchoG = (typeof g.style?.width === 'number' ? g.style.width : 380);
      const altoG = (typeof g.style?.height === 'number' ? g.style.height : 280);

      if (
        posicionFinal.x >= g.position.x &&
        posicionFinal.x <= g.position.x + anchoG &&
        posicionFinal.y >= g.position.y &&
        posicionFinal.y <= g.position.y + altoG
      ) {
        grupoPadreEncontrado = g;
        posRelativa = {
          x: posicionFinal.x - g.position.x,
          y: posicionFinal.y - g.position.y
        };
        break;
      }
    }

    contadorMetasLocal.current += 1;

    const nuevaTarjetaMeta = {
      id: idMeta, 
      type: 'nodoMeta', 
      position: posRelativa, 
      parentId: grupoPadreEncontrado ? grupoPadreEncontrado.id : undefined,
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
      const actualizados = [...nds, nuevaTarjetaMeta].sort((a, b) => (a.type === 'nodoGrupo' ? -1 : 1));
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
        onEditarNombreGrupo: editarNombreGrupo, 
        onResizeGrupo: resizeGrupo 
      }
    };

    setNodes((nds) => {
      const actualizados = [nuevoGrupo, ...nds];
      guardarEnSupabase(actualizados, edgesRef.current);
      return actualizados;
    });
  };

  const ejecutarAgrupacionDirecta = useCallback((nodosSeleccionados) => {
    if (!nodosSeleccionados || nodosSeleccionados.length === 0) return;

    const nombre = prompt("Nombre del nuevo grupo para la selección:");
    if (!nombre || !nombre.trim()) {
      setNodes((nds) => nds.map(n => ({ ...n, selected: false })));
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodosSeleccionados.forEach(n => {
      let xAbs = n.position.x;
      let yAbs = n.position.y;

      if (n.parentId) {
        const padre = nodesRef.current.find(p => p.id === n.parentId);
        if (padre) {
          xAbs += padre.position.x;
          yAbs += padre.position.y;
        }
      }

      const w = n.measured?.width || n.width || 224;
      const h = n.measured?.height || n.height || 85;

      minX = Math.min(minX, xAbs);
      minY = Math.min(minY, yAbs);
      maxX = Math.max(maxX, xAbs + w);
      maxY = Math.max(maxY, yAbs + h);
    });

    const paddingX = 35;
    const paddingTop = 50;
    const paddingBottom = 35;

    const grupoX = minX - paddingX;
    const grupoY = minY - paddingTop;
    const grupoWidth = Math.max((maxX - minX) + (paddingX * 2), 260);
    const grupoHeight = Math.max((maxY - minY) + paddingTop + paddingBottom, 180);

    const idGrupo = `grupo_${Date.now()}`;
    const nuevoGrupo = {
      id: idGrupo,
      type: 'nodoGrupo',
      position: { x: grupoX, y: grupoY },
      style: { width: grupoWidth, height: grupoHeight },
      data: {
        id: idGrupo,
        label: nombre.trim(),
        color: 'purple',
        onEliminarNodo: eliminarNodo,
        onCambiarColorGrupo: cambiarColorGrupo,
        onEditarNombreGrupo: editarNombreGrupo,
        onResizeGrupo: resizeGrupo
      }
    };

    const idsSeleccionados = new Set(nodosSeleccionados.map(n => n.id));
    const nodosActualizados = nodesRef.current.map(n => {
      if (idsSeleccionados.has(n.id)) {
        let xAbs = n.position.x;
        let yAbs = n.position.y;

        if (n.parentId) {
          const padre = nodesRef.current.find(p => p.id === n.parentId);
          if (padre) {
            xAbs += padre.position.x;
            yAbs += padre.position.y;
          }
        }

        return {
          ...n,
          parentId: idGrupo,
          position: { 
            x: xAbs - grupoX, 
            y: yAbs - grupoY 
          },
          selected: false
        };
      }
      return n;
    });

    const ordenados = [nuevoGrupo, ...nodosActualizados].sort((a, b) => (a.type === 'nodoGrupo' ? -1 : 1));
    setNodes(ordenados);
    guardarEnSupabase(ordenados, edgesRef.current);
  }, [eliminarNodo, cambiarColorGrupo, editarNombreGrupo, resizeGrupo]);

  const onSelectionEnd = useCallback(() => {
    setTimeout(() => {
      const seleccionados = nodesRef.current.filter(n => n.selected && n.type === 'nodoMeta');
      if (seleccionados.length > 0) {
        ejecutarAgrupacionDirecta(seleccionados);
      }
    }, 50);
  }, [ejecutarAgrupacionDirecta]);

  const { screenToFlowPosition } = useReactFlow();

  const onPaneDoubleClick = useCallback((event) => {
    const sobreNota = event.target?.closest('.group\\/node');
    const sobreBoton = event.target?.closest('button');
    const sobreResizer = event.target?.closest('.react-flow__resize-control');

    if (sobreNota || sobreBoton || sobreResizer) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const posicionMapa = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    handleCrearNuevaMetaDirecta(posicionMapa);
  }, [screenToFlowPosition, handleCrearNuevaMetaDirecta]);

  // 🟢 Cerrar el menú flotante al hacer clic en cualquier parte vacía del lienzo
  const onPaneClick = useCallback(() => {
    setEdgeMenuAbiertoId(null);
  }, []);

  return (
    <div className="h-[calc(100vh-40px)] w-full flex flex-col space-y-3 text-left font-mono bg-theme-bg p-4 text-theme-text">
      
      {/* 🟢 BARRA DE PESTAÑAS / PROYECTOS */}
      <div className="flex items-center justify-between border-b border-theme-border/40 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60vw] scrollbar-none">
          <FolderKanban className="w-4 h-4 text-theme-accent mr-1 flex-shrink-0" />
          {proyectos.map((p) => {
            const activa = p.id === tabActiva;
            return (
              <div
                key={p.id}
                onClick={() => setTabActiva(p.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border select-none ${
                  activa
                    ? 'bg-theme-accent text-theme-bg border-theme-accent shadow-md'
                    : 'bg-theme-bg/60 text-theme-text/60 border-theme-border/60 hover:text-theme-text hover:bg-theme-border/20'
                }`}
              >
                <span 
                  className="truncate max-w-[120px] hover:underline cursor-text"
                  title="Doble clic para cambiar nombre"
                  onClick={(e) => {
                    // 🟢 NUEVO: Soporte táctil para renombrar en tablet
                    if (activa) {
                      e.stopPropagation();
                      handleRenombrarProyecto(p.id, p.nombre);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleRenombrarProyecto(p.id, p.nombre);
                  }}
                >
                  {p.nombre}
                </span>

                {proyectos.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEliminarProyecto(p.id, p.nombre);
                    }}
                    className={`p-0.5 rounded transition-colors ${
                      activa ? 'hover:bg-black/20 text-theme-bg' : 'hover:bg-theme-casa/20 hover:text-theme-casa text-theme-text/40'
                    }`}
                    title="Eliminar pestaña"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleCrearProyecto}
            className="p-1.5 rounded-lg border border-dashed border-theme-border/60 text-theme-text/50 hover:text-theme-accent hover:border-theme-accent transition-all cursor-pointer flex items-center"
            title="Nueva pestaña de proyecto"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 🟢 NUEVO: Botones de acción directa para pantallas táctiles */}
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => handleCrearNuevaMetaDirecta()} 
            className="bg-theme-accent hover:opacity-90 text-theme-bg px-3 py-1.5 rounded-lg text-xs font-bold flex items-center shadow transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Nota
          </button>
          <button 
            type="button"
            onClick={handleCrearContenedorGrupo} 
            className="bg-theme-bg hover:opacity-80 text-theme-text border border-theme-border px-3 py-1.5 rounded-lg text-xs font-bold flex items-center shadow transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5 text-theme-accent" /> Grupo
          </button>
        </div>
      </div>

      {/* LIENZO DE REACT FLOW */}
      <div 
        className="flex-1 w-full bg-theme-bg rounded-xl border border-theme-border relative overflow-hidden" 
        ref={flowWrapper}
      >
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange} 
          onNodeDragStop={onNodeDragStop} 
          onEdgesChange={onEdgesChange} 
          onConnect={onConnect} 
          // 🟢 Cerrar menú al hacer clic en el lienzo
          onPaneClick={onPaneClick}
          // 🟢 Abrir menú de opciones al hacer clic en la flecha
          onEdgeClick={(e, edge) => {
            e.stopPropagation();
            toggleMenuEdge(edge.id);
          }}
          onDoubleClick={onPaneDoubleClick} 
          zoomOnDoubleClick={false}
          /* 🔴 ANTERIOR: panOnDrag={[1, 2]} selectionOnDrag={true} */
          /* 🟢 NUEVO: Soporte táctil para arrastrar lienzo con 1 dedo/toque */
          panOnDrag={[0, 1, 2]}
          selectionOnDrag={false}
          selectionMode="partial"
          onSelectionEnd={onSelectionEnd}
          nodeTypes={nodeTypes} 
          edgeTypes={edgeTypes}
          connectionLineStyle={connectionLineStyle} 
          fitView={nodes.length > 1} 
          fitViewOptions={{ minZoom: 0.1, maxZoom: 1, padding: 0.2 }} 
          minZoom={0.1} 
          maxZoom={2} 
          translateExtent={[[-7500, -3000], [7500, 3000]]} 
          nodeExtent={[[-7500, -3000], [7500, 3000]]} 
          className="z-10"
        >
          <Background 
            color="var(--color-theme-accent)" 
            style={{ opacity: 0.5 }} 
            gap={20} 
            size={1.5} 
          />
          <Controls className="!bg-theme-bg !border !border-theme-border !shadow-2xl [&_button]:!bg-theme-bg [&_button]:!border-b [&_button]:!border-theme-border [&_button]:!fill-theme-accent [&_button_svg]:!fill-theme-accent [&_button:hover]:!bg-theme-border/30 transition-all" />
       {/*<Controls className="!bg-theme-bg !border-theme-border !shadow-2xl opacity-80 hover:opacity-100 transition-opacity" /> */}

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