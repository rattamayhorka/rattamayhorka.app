import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
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
  useViewport,
  ReactFlowProvider,
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import getStroke from 'perfect-freehand';
import { supabase } from '../supabase';
import {
  Layers,
  Trash2,
  Plus,
  X,
  FolderKanban,
  ArrowRight,
  ArrowLeftRight,
  Minus,
  PenTool,
  Move,
  Eraser,
  FileText,
  Palette,
} from 'lucide-react';

// =========================================================
// UTILIDADES SVG PARA EL TRAZO LIBRE
// =========================================================
function getSvgPathFromStroke(stroke) {
  if (!stroke || stroke.length === 0) return '';

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );

  d.push('Z');
  return d.join(' ');
}

// =========================================================
// NODO PERSONALIZADO: DIBUJO LIBRE (SVG)
// =========================================================
const NodoDibujoLibre = memo(({ id, data, selected }) => {
  const points = data?.points || [];
  if (points.length === 0) return null;

  const stroke = getStroke(points, {
    size: data.size || 6,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5,
  });

  const pathData = getSvgPathFromStroke(stroke);

  return (
    // pointer-events-none permite que los trazos que cubran notas no bloqueen sus clics
    <div className="relative group/drawing w-px h-px pointer-events-none">
      <svg className="overflow-visible pointer-events-none absolute top-0 left-0">
        <path
          d={pathData}
          fill={data.color || 'var(--color-theme-accent)'}
          stroke={selected ? 'var(--color-theme-casa)' : 'transparent'}
          strokeWidth={selected ? 2 : 0}
        />
      </svg>
      {selected && data?.activeTool === 'move' && (
        <div className="absolute -top-3 -left-3 nodrag nopan z-[1100] pointer-events-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data?.onEliminarNodo?.(id);
            }}
            className="p-1 bg-theme-bg border border-theme-border rounded-md shadow-md text-theme-text/70 hover:text-theme-casa cursor-pointer"
            title="Borrar trazo"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
});

NodoDibujoLibre.displayName = 'NodoDibujoLibre';

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

const PALETA_DIBUJO = [
  { id: 'accent',  color: 'var(--color-theme-accent)',  bgClass: 'bg-theme-accent' },
  { id: 'trabajo', color: 'var(--color-theme-trabajo)', bgClass: 'bg-theme-trabajo' },
  { id: 'casa',    color: 'var(--color-theme-casa)',    bgClass: 'bg-theme-casa' },
  { id: 'text',    color: 'var(--color-theme-text)',    bgClass: 'bg-theme-text' },
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
  data,
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

      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={{
          ...style,
          cursor: 'pointer',
          stroke: selected || menuVisible ? 'var(--color-theme-accent)' : style.stroke || 'var(--color-theme-accent)',
        }}
      />

      <EdgeLabelRenderer>
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
              <button
                type="button"
                onClick={() => {
                  data?.onModificarEdge?.(id, {
                    markerStart: undefined,
                    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--color-theme-accent)' },
                  });
                  data?.onCerrarMenuEdge?.();
                }}
                className="p-1 hover:bg-theme-border/30 rounded text-theme-text/80 hover:text-theme-accent cursor-pointer"
                title="Flecha en un sentido"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  data?.onModificarEdge?.(id, {
                    markerStart: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--color-theme-accent)' },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: 'var(--color-theme-accent)' },
                  });
                  data?.onCerrarMenuEdge?.();
                }}
                className="p-1 hover:bg-theme-border/30 rounded text-theme-text/80 hover:text-theme-accent cursor-pointer"
                title="Flecha en ambos sentidos"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  data?.onModificarEdge?.(id, {
                    markerStart: undefined,
                    markerEnd: undefined,
                    style: { ...style, strokeDasharray: undefined },
                  });
                  data?.onCerrarMenuEdge?.();
                }}
                className="p-1 hover:bg-theme-border/30 rounded text-theme-text/80 hover:text-theme-accent cursor-pointer"
                title="Línea sólida simple"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const tieneDash = !!style.strokeDasharray;
                  data?.onModificarEdge?.(id, {
                    style: {
                      ...style,
                      strokeDasharray: tieneDash ? undefined : '5,5',
                    },
                  });
                  data?.onCerrarMenuEdge?.();
                }}
                className="px-1.5 py-0.5 hover:bg-theme-border/30 rounded text-theme-text/80 hover:text-theme-accent cursor-pointer font-bold"
                title="Alternar línea punteada / sólida"
              >
                Punteada
              </button>

              <div className="w-[1px] h-3 bg-theme-border/60 mx-0.5" />

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
  const colorActual = OPCIONES_COLOR_GRUPO.find((c) => c.id === data.color) || OPCIONES_COLOR_GRUPO[0];

  return (
    <div
      className={`w-full h-full border-[3px] rounded-2xl p-4 font-mono text-left relative min-w-[200px] min-h-[150px] transition-all duration-200 group/groupnode ${colorActual.bg} ${
        selected ? 'border-solid ring-1 ring-theme-text/20 ' + colorActual.border : colorActual.border + ' hover:brightness-125'
      }`}
    >
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
          e.stopPropagation();
          const nuevoNombre = prompt('Editar nombre del grupo:', data.label);
          if (nuevoNombre && nuevoNombre.trim() && nuevoNombre.trim() !== data.label) {
            data.onEditarNombreGrupo && data.onEditarNombreGrupo(id, nuevoNombre.trim());
          }
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const nuevoNombre = prompt('Editar nombre del grupo:', data.label);
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

      <div
        className={`absolute top-full left-4 pt-2 z-[100] nodrag transition-opacity duration-150 ${
          selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover/groupnode:opacity-100 group-hover/groupnode:pointer-events-auto'
        }`}
      >
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
  const handleClass = `w-2 h-2 !bg-theme-border ${
    selected ? '!opacity-100' : '!opacity-0 group-hover/node:!opacity-100'
  } transition-opacity !cursor-crosshair before:content-[''] before:absolute before:w-8 before:h-8 before:bg-transparent before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:z-[80]`;

  return (
    <div
      className={`border rounded-lg p-3 w-56 shadow-2xl font-mono text-left transition-all duration-200 relative group/node ${statusColor} ${
        selected ? 'ring-2 ring-theme-accent border-theme-accent shadow-2xl' : ''
      }`}
    >
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
          const nuevoTexto = prompt('Editar contenido de la nota:', data.label);
          if (nuevoTexto && nuevoTexto.trim() && nuevoTexto.trim() !== data.label) {
            data.onEditarTexto && data.onEditarTexto(id, nuevoTexto.trim());
          }
        }}
      >
        <p
          className={`font-normal text-[13px] leading-snug tracking-wide break-words text-theme-text ${
            data.status === 'Completado' ? 'line-through opacity-50' : ''
          }`}
        >
          {data.label}
        </p>
      </div>

      <div
        className={`absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[100] nodrag transition-all duration-150 ease-out ${
          selected ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover/node:opacity-100 group-hover/node:pointer-events-auto'
        }`}
      >
        <div className="bg-theme-bg border border-theme-border rounded-md shadow-2xl px-2 py-1.5 flex items-center gap-1.5 backdrop-blur-md pointer-events-auto whitespace-nowrap">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onCambiarEstado && data.onCambiarEstado(id, 'Por Hacer');
            }}
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              data.status === 'Por Hacer' ? 'bg-theme-border text-theme-bg font-bold' : 'text-theme-text/50 hover:text-theme-text'
            }`}
          >
            Nota
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onCambiarEstado && data.onCambiarEstado(id, 'En Progreso');
            }}
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              data.status === 'En Progreso' ? 'bg-theme-accent text-theme-bg font-bold' : 'text-theme-text/50 hover:text-theme-text'
            }`}
          >
            Progreso
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              data.onCambiarEstado && data.onCambiarEstado(id, 'Completado');
            }}
            className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              data.status === 'Completado' ? 'bg-theme-trabajo text-theme-bg font-bold' : 'text-theme-text/50 hover:text-theme-text'
            }`}
          >
            Listo
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nuevoTexto = prompt('Editar contenido de la nota:', data.label);
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

const nodeTypes = {
  nodoMeta: NodoMetaAutonomo,
  nodoGrupo: NodoGrupoExpandible,
  drawing: NodoDibujoLibre,
};
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

  // 🟢 Switch de modo de tablero: 'notes' (modo notas normal) | 'draw' (modo dibujo mano alzada)
  const [boardMode, setBoardMode] = useState('notes');

  // Herramientas específicas de dibujo: 'pen' | 'eraser'
  const [drawTool, setDrawTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('var(--color-theme-accent)');
  const [strokeSize, setStrokeSize] = useState(6);
  const [currentStroke, setCurrentStroke] = useState([]);

  // Herramienta activa para compatibilidad interna ('move' cuando estamos en notas)
  const activeTool = boardMode === 'notes' ? 'move' : drawTool;

  // Radio de acción para el borrador
  const ERASER_RADIUS = 20;

  const isPointerDownRef = useRef(false);
  const huboBorradoEnArrastreRef = useRef(false);
  const flowWrapper = useRef(null);
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const tabActivaRef = useRef('principal');
  const proyectosRef = useRef([]);

  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);
  useEffect(() => { tabActivaRef.current = tabActiva; }, [tabActiva]);
  useEffect(() => { proyectosRef.current = proyectos; }, [proyectos]);

  useEffect(() => {
    const prevenirAutoScrollGlobal = (e) => {
      if (e.button === 1) e.preventDefault();
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

  const { screenToFlowPosition } = useReactFlow();
  const { x: vpX, y: vpY, zoom: vpZoom } = useViewport();

  const guardarEnSupabase = async (nodosAGuardar, edgesAGuardar) => {
    try {
      const nodosSerializables = nodosAGuardar.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        style: n.style,
        parentId: n.parentId,
        zIndex: n.zIndex,
        data: {
          id: n.data?.id,
          label: n.data?.label,
          status: n.data?.status,
          color: n.data?.color,
          points: n.data?.points,
          size: n.data?.size,
        },
      }));

      const edgesSerializables = edgesAGuardar.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: 'customMenuEdge',
        style: e.style,
        markerStart: e.markerStart,
        markerEnd: e.markerEnd,
      }));

      const proyectoActual = proyectosRef.current.find((p) => p.id === tabActivaRef.current);

      const payloadUpsert = {
        id: tabActivaRef.current,
        nodes: nodosSerializables,
        edges: edgesSerializables,
        updated_at: new Date().toISOString(),
      };

      if (proyectoActual && proyectoActual.nombre && proyectoActual.nombre.trim() !== '') {
        payloadUpsert.nombre = proyectoActual.nombre.trim();
      }

      await supabase.from('mapa_proyectos').upsert(payloadUpsert);
    } catch (err) {
      console.error('Error al guardar mapa en Supabase:', err);
    }
  };

  const eliminarNodo = useCallback((idNodo) => {
    setNodes((nds) => {
      const nodoABorrar = nds.find((n) => n.id === idNodo);
      const esGrupo = nodoABorrar?.type === 'nodoGrupo';
      const nodosFiltrados = nds.filter((n) => n.id !== idNodo);

      let actualizadosNodos = [];
      if (esGrupo) {
        actualizadosNodos = nodosFiltrados.map((n) => {
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

  const distPuntoASegmento = (px, py, x1, y1, x2, y2) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  const comprobarColisionConTrazo = useCallback((flowPoint, node) => {
    if (node.type !== 'drawing' || !node.data?.points || node.data.points.length === 0) return false;

    const originX = node.position.x;
    const originY = node.position.y;
    const grosor = node.data.size || 6;
    const tolerancia = 24 + grosor / 2;

    const pts = node.data.points;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const px = originX + pts[i][0];
      const py = originY + pts[i][1];
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    if (
      flowPoint.x < minX - tolerancia ||
      flowPoint.x > maxX + tolerancia ||
      flowPoint.y < minY - tolerancia ||
      flowPoint.y > maxY + tolerancia
    ) {
      return false;
    }

    if (pts.length === 1) {
      return Math.hypot(originX + pts[0][0] - flowPoint.x, originY + pts[0][1] - flowPoint.y) <= tolerancia;
    }

    for (let i = 0; i < pts.length - 1; i++) {
      const x1 = originX + pts[i][0];
      const y1 = originY + pts[i][1];
      const x2 = originX + pts[i + 1][0];
      const y2 = originY + pts[i + 1][1];

      if (distPuntoASegmento(flowPoint.x, flowPoint.y, x1, y1, x2, y2) <= tolerancia) {
        return true;
      }
    }

    return false;
  }, []);

  const borrarTrazosEnPunto = useCallback(
    (flowPoint) => {
      const nodosActuales = nodesRef.current;
      const trazosABorrar = nodosActuales.filter((n) => comprobarColisionConTrazo(flowPoint, n));

      if (trazosABorrar.length > 0) {
        huboBorradoEnArrastreRef.current = true;
        const idsABorrar = new Set(trazosABorrar.map((t) => t.id));
        setNodes((nds) => {
          const filtrados = nds.filter((n) => !idsABorrar.has(n.id));
          nodesRef.current = filtrados;
          return filtrados;
        });
      }
    },
    [comprobarColisionConTrazo]
  );

  const limpiarSoloTrazos = useCallback(() => {
    const confirmar = window.confirm('¿Deseas eliminar todos los trazos de dibujo de esta pestaña?');
    if (!confirmar) return;

    setNodes((nds) => {
      const sinTrazos = nds.filter((n) => n.type !== 'drawing');
      guardarEnSupabase(sinTrazos, edgesRef.current);
      return sinTrazos;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activo = document.activeElement;
        if (activo && (activo.tagName === 'INPUT' || activo.tagName === 'TEXTAREA' || activo.isContentEditable)) {
          return;
        }

        const seleccionados = nodesRef.current.filter((n) => n.selected);
        if (seleccionados.length > 0) {
          const idsABorrar = new Set(seleccionados.map((n) => n.id));
          setNodes((nds) => {
            const filtrados = nds.filter((n) => !idsABorrar.has(n.id));
            guardarEnSupabase(filtrados, edgesRef.current);
            return filtrados;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === 'drawing') {
          return {
            ...n,
            data: {
              ...n.data,
              activeTool,
            },
          };
        }
        return n;
      })
    );
  }, [activeTool]);

  // Handlers unificados de Pointer Events
  const onPointerDown = useCallback(
    (e) => {
      if (boardMode !== 'draw' || e.button !== 0) return;

      const target = e.target;
      if (target.closest('.react-flow__controls') || target.closest('button')) return;

      isPointerDownRef.current = true;
      const point = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (drawTool === 'pen') {
        setCurrentStroke([[point.x, point.y, e.pressure || 0.5]]);
      } else if (drawTool === 'eraser') {
        huboBorradoEnArrastreRef.current = false;
        borrarTrazosEnPunto(point);
      }
    },
    [boardMode, drawTool, screenToFlowPosition, borrarTrazosEnPunto]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (boardMode !== 'draw' || !isPointerDownRef.current) return;
      const point = screenToFlowPosition({ x: e.clientX, y: e.clientY });

      if (drawTool === 'pen') {
        setCurrentStroke((prev) => [...prev, [point.x, point.y, e.pressure || 0.5]]);
      } else if (drawTool === 'eraser') {
        borrarTrazosEnPunto(point);
      }
    },
    [boardMode, drawTool, screenToFlowPosition, borrarTrazosEnPunto]
  );

  const onPointerUp = useCallback(() => {
    if (boardMode !== 'draw' || !isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    if (drawTool === 'eraser') {
      if (huboBorradoEnArrastreRef.current) {
        guardarEnSupabase(nodesRef.current, edgesRef.current);
        huboBorradoEnArrastreRef.current = false;
      }
      return;
    }

    if (drawTool === 'pen' && currentStroke.length > 1) {
      const [originX, originY] = currentStroke[0];
      const relativePoints = currentStroke.map(([x, y, p]) => [x - originX, y - originY, p]);
      const idTrazo = `draw_${Date.now()}`;

      const newNode = {
        id: idTrazo,
        type: 'drawing',
        position: { x: originX, y: originY },
        zIndex: 1000,
        data: {
          id: idTrazo,
          points: relativePoints,
          color: strokeColor,
          size: strokeSize,
          activeTool,
          onEliminarNodo: eliminarNodo,
        },
      };

      setNodes((nds) => {
        const actualizados = [...nds, newNode];
        nodesRef.current = actualizados;
        guardarEnSupabase(actualizados, edgesRef.current);
        return actualizados;
      });
    }

    setCurrentStroke([]);
  }, [boardMode, drawTool, currentStroke, strokeColor, strokeSize, activeTool, eliminarNodo]);

  const onPointerLeave = useCallback(() => {
    if (isPointerDownRef.current && drawTool === 'eraser' && huboBorradoEnArrastreRef.current) {
      guardarEnSupabase(nodesRef.current, edgesRef.current);
      huboBorradoEnArrastreRef.current = false;
    }
    isPointerDownRef.current = false;
    setCurrentStroke([]);
  }, [drawTool]);

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

  // =========================================================
  // 🟢 CONTROLADORES DEL MENÚ DE LA FLECHA
  // =========================================================
  const toggleMenuEdge = useCallback((idEdge) => {
    setEdgeMenuAbiertoId((prev) => (prev === idEdge ? null : idEdge));
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
            style: { ...e.style, ...(nuevosProps.style || {}) },
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

  useEffect(() => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        data: {
          ...e.data,
          edgeMenuAbiertoId,
          onToggleMenuEdge: toggleMenuEdge,
          onCerrarMenuEdge: cerrarMenuEdge,
          onModificarEdge: modificarEdge,
          onEliminarEdge: eliminarEdge,
        },
      }))
    );
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
        if (!data.some((p) => p.id === tabActivaRef.current)) {
          setTabActiva(data[0].id);
        }
      }
    } catch (e) {
      console.error('Error al cargar lista de proyectos:', e);
    }
  }, []);

  const cargarMapa = useCallback(
    async (idProyecto) => {
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

        contadorMetasLocal.current = rawNodes.filter((n) => n.type !== 'nodoGrupo' && n.type !== 'drawing').length;
        contadorGruposLocal.current = rawNodes.filter((n) => n.type === 'nodoGrupo').length;

        const nodosConFunciones = rawNodes.map((n) => {
          if (n.type === 'drawing') {
            return {
              ...n,
              type: 'drawing',
              zIndex: 1000,
              data: {
                id: n.data?.id || n.id,
                points: n.data?.points || [],
                color: n.data?.color || 'var(--color-theme-accent)',
                size: n.data?.size || 6,
                activeTool,
                onEliminarNodo: eliminarNodo,
              },
            };
          }

          if (n.type === 'nodoGrupo') {
            return {
              ...n,
              zIndex: -1,
              data: {
                ...n.data,
                onEliminarNodo: eliminarNodo,
                onCambiarColorGrupo: cambiarColorGrupo,
                onEditarNombreGrupo: editarNombreGrupo,
                onResizeGrupo: resizeGrupo,
              },
            };
          }

          return {
            ...n,
            zIndex: 10,
            data: {
              ...n.data,
              onCambiarEstado: cambiarEstadoMeta,
              onEliminarNodo: eliminarNodo,
              onEditarTexto: editarTextoMeta,
              onCambiarColorGrupo: cambiarColorGrupo,
              onEditarNombreGrupo: editarNombreGrupo,
              onResizeGrupo: resizeGrupo,
            },
          };
        });

        const edgesConFunciones = rawEdges.map((e) => ({
          ...e,
          type: 'customMenuEdge',
          data: {
            edgeMenuAbiertoId: null,
            onToggleMenuEdge: toggleMenuEdge,
            onCerrarMenuEdge: cerrarMenuEdge,
            onModificarEdge: modificarEdge,
            onEliminarEdge: eliminarEdge,
          },
        }));

        setNodes(nodosConFunciones);
        setEdges(edgesConFunciones);
      } catch (e) {
        console.error('Error al cargar mapa desde Supabase:', e);
      }
    },
    [
      cambiarEstadoMeta,
      eliminarNodo,
      editarTextoMeta,
      cambiarColorGrupo,
      editarNombreGrupo,
      resizeGrupo,
      toggleMenuEdge,
      cerrarMenuEdge,
      modificarEdge,
      eliminarEdge,
      activeTool,
    ]
  );

  useEffect(() => {
    cargarListaProyectos();
  }, [cargarListaProyectos]);

  useEffect(() => {
    if (tabActiva) {
      cargarMapa(tabActiva);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabActiva]);

  const handleCrearProyecto = async () => {
    const nombre = prompt('Nombre del nuevo proyecto o pestaña:');
    if (!nombre || !nombre.trim()) return;

    const idNuevo = `proj_${Date.now()}`;
    const payload = {
      id: idNuevo,
      nombre: nombre.trim(),
      nodes: [],
      edges: [],
    };

    try {
      await supabase.from('mapa_proyectos').insert([payload]);
      const nuevaLista = [...proyectosRef.current, { id: idNuevo, nombre: nombre.trim() }];
      setProyectos(nuevaLista);
      proyectosRef.current = nuevaLista;
      setTabActiva(idNuevo);
    } catch (err) {
      console.error('Error al crear pestaña:', err);
    }
  };

  const handleRenombrarProyecto = async (idProyecto, nombreActual) => {
    const nuevoNombre = prompt('Nuevo nombre para la pestaña:', nombreActual);
    if (!nuevoNombre || !nuevoNombre.trim() || nuevoNombre.trim() === nombreActual) return;

    const nombreLimpio = nuevoNombre.trim();

    const actualizados = proyectosRef.current.map((p) => (p.id === idProyecto ? { ...p, nombre: nombreLimpio } : p));
    setProyectos(actualizados);
    proyectosRef.current = actualizados;

    try {
      const { error } = await supabase
        .from('mapa_proyectos')
        .update({ nombre: nombreLimpio, updated_at: new Date().toISOString() })
        .eq('id', idProyecto);

      if (error) throw error;
    } catch (err) {
      console.error('Error al renombrar proyecto en Supabase:', err);
    }
  };

  const handleEliminarProyecto = async (idAEliminar, nombre) => {
    if (proyectos.length <= 1) {
      alert('Debes tener al menos un proyecto activo.');
      return;
    }

    const confirmar = window.confirm(`¿Seguro que deseas eliminar definitivamente la pestaña "${nombre}" y todo su contenido?`);
    if (!confirmar) return;

    try {
      await supabase.from('mapa_proyectos').delete().eq('id', idAEliminar);
      const restantes = proyectosRef.current.filter((p) => p.id !== idAEliminar);
      setProyectos(restantes);
      proyectosRef.current = restantes;
      setTabActiva(restantes[0].id);
    } catch (err) {
      console.error('Error al borrar pestaña:', err);
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

      const grupos = nds.filter((n) => n.type === 'nodoGrupo');
      let posXAbs = nodoMovido.position.x;
      let posYAbs = nodoMovido.position.y;

      if (nodoMovido.parentId) {
        const padreAnterior = nds.find((n) => n.id === nodoMovido.parentId);
        if (padreAnterior) {
          posXAbs += padreAnterior.position.x;
          posYAbs += padreAnterior.position.y;
        }
      }

      const centroX = posXAbs + 112;
      const centroY = posYAbs + 30;

      let nuevoPadre = null;
      for (const g of grupos) {
        const anchoG = typeof g.style?.width === 'number' ? g.style.width : 380;
        const altoG = typeof g.style?.height === 'number' ? g.style.height : 280;

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

        const actualizadosConPadre = nds.map((n) => {
          if (n.id === nodoMovido.id) {
            return {
              ...n,
              parentId: nuevoParentId,
              position: { x: nuevaX, y: nuevaY },
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

  const onConnect = useCallback(
    (params) => {
      const nuevaConexion = {
        ...params,
        id: `edge_${Date.now()}`,
        type: 'customMenuEdge',
        data: {
          edgeMenuAbiertoId: null,
          onToggleMenuEdge: toggleMenuEdge,
          onCerrarMenuEdge: cerrarMenuEdge,
          onModificarEdge: modificarEdge,
          onEliminarEdge: eliminarEdge,
        },
        ...defaultEdgeOptions,
      };
      setEdges((eds) => {
        const actualizadas = addEdge(nuevaConexion, eds);
        guardarEnSupabase(nodesRef.current, actualizadas);
        return actualizadas;
      });
    },
    [toggleMenuEdge, cerrarMenuEdge, modificarEdge, eliminarEdge]
  );

  const handleCrearNuevaMetaDirecta = (posicionExplicita = null) => {
    const texto = prompt('Contenido de la nota:');
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

    const grupos = nodes.filter((n) => n.type === 'nodoGrupo');
    for (const g of grupos) {
      const anchoG = typeof g.style?.width === 'number' ? g.style.width : 380;
      const altoG = typeof g.style?.height === 'number' ? g.style.height : 280;

      if (
        posicionFinal.x >= g.position.x &&
        posicionFinal.x <= g.position.x + anchoG &&
        posicionFinal.y >= g.position.y &&
        posicionFinal.y <= g.position.y + altoG
      ) {
        grupoPadreEncontrado = g;
        posRelativa = {
          x: posicionFinal.x - g.position.x,
          y: posicionFinal.y - g.position.y,
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
        onEditarTexto: editarTextoMeta,
      },
    };

    setNodes((nds) => {
      const actualizados = [...nds, nuevaTarjetaMeta].sort((a, b) => (a.type === 'nodoGrupo' ? -1 : 1));
      guardarEnSupabase(actualizados, edgesRef.current);
      return actualizados;
    });
  };

  const handleCrearContenedorGrupo = () => {
    const nombre = prompt('Nombre del Grupo:');
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
        onResizeGrupo: resizeGrupo,
      },
    };

    setNodes((nds) => {
      const actualizados = [nuevoGrupo, ...nds];
      guardarEnSupabase(actualizados, edgesRef.current);
      return actualizados;
    });
  };

  const ejecutarAgrupacionDirecta = useCallback(
    (nodosSeleccionados) => {
      if (!nodosSeleccionados || nodosSeleccionados.length === 0) return;

      const nombre = prompt('Nombre del nuevo grupo para la selección:');
      if (!nombre || !nombre.trim()) {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
        return;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      nodosSeleccionados.forEach((n) => {
        let xAbs = n.position.x;
        let yAbs = n.position.y;

        if (n.parentId) {
          const padre = nodesRef.current.find((p) => p.id === n.parentId);
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
      const grupoWidth = Math.max(maxX - minX + paddingX * 2, 260);
      const grupoHeight = Math.max(maxY - minY + paddingTop + paddingBottom, 180);

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
          onResizeGrupo: resizeGrupo,
        },
      };

      const idsSeleccionados = new Set(nodosSeleccionados.map((n) => n.id));
      const nodosActualizados = nodesRef.current.map((n) => {
        if (idsSeleccionados.has(n.id)) {
          let xAbs = n.position.x;
          let yAbs = n.position.y;

          if (n.parentId) {
            const padre = nodesRef.current.find((p) => p.id === n.parentId);
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
              y: yAbs - grupoY,
            },
            selected: false,
          };
        }
        return n;
      });

      const ordenados = [nuevoGrupo, ...nodosActualizados].sort((a, b) => (a.type === 'nodoGrupo' ? -1 : 1));
      setNodes(ordenados);
      guardarEnSupabase(ordenados, edgesRef.current);
    },
    [eliminarNodo, cambiarColorGrupo, editarNombreGrupo, resizeGrupo]
  );

  const onSelectionEnd = useCallback(() => {
    setTimeout(() => {
      const seleccionados = nodesRef.current.filter((n) => n.selected && n.type === 'nodoMeta');
      if (seleccionados.length > 0) {
        ejecutarAgrupacionDirecta(seleccionados);
      }
    }, 50);
  }, [ejecutarAgrupacionDirecta]);

  const onPaneDoubleClick = useCallback(
    (event) => {
      // Si estamos en modo dibujo, ignoramos el doble clic de creación de notas
      if (boardMode === 'draw') return;
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
    },
    [screenToFlowPosition, handleCrearNuevaMetaDirecta, boardMode]
  );

  const onPaneClick = useCallback(() => {
    setEdgeMenuAbiertoId(null);
  }, []);

  const liveStrokePath = currentStroke.length
    ? getSvgPathFromStroke(
        getStroke(currentStroke, {
          size: strokeSize,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        })
      )
    : '';

  return (
    <div className="h-[calc(100vh-40px)] w-full flex flex-col space-y-3 text-left font-mono bg-theme-bg p-4 text-theme-text antialiased">
      {/* 🟢 BARRA DE PESTAÑAS / PROYECTOS */}
      <div className="flex flex-wrap items-center justify-between border-b border-theme-border/40 pb-2 gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[40vw] scrollbar-none">
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

        {/* 🟢 BARRA DE CONTROLES: SWITCH MODO + HERRAMIENTAS DE DIBUJO DINÁMICAS */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* SWITCH PRINCIPAL: NOTAS VS DIBUJO */}
          <div className="flex items-center bg-theme-bg border border-theme-border/60 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setBoardMode('notes')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                boardMode === 'notes'
                  ? 'bg-theme-accent text-theme-bg shadow'
                  : 'text-theme-text/70 hover:text-theme-text hover:bg-theme-border/20'
              }`}
              title="Modo Notas: edición, navegación y organización"
            >
              <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Notas</span>
            </button>

            <button
              type="button"
              onClick={() => setBoardMode('draw')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                boardMode === 'draw'
                  ? 'bg-theme-accent text-theme-bg shadow'
                  : 'text-theme-text/70 hover:text-theme-text hover:bg-theme-border/20'
              }`}
              title="Modo Freehand: dibujar sobre el lienzo"
            >
              <Palette className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Dibujo</span>
            </button>
          </div>

          {/* SUB-BARRA DE DIBUJO (Solo visible si boardMode === 'draw') */}
          {boardMode === 'draw' && (
            <div className="flex items-center gap-1.5 bg-theme-bg border border-theme-border/60 rounded-lg p-1 animate-in fade-in duration-200">
              {/* Lápiz */}
              <button
                type="button"
                onClick={() => setDrawTool('pen')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  drawTool === 'pen'
                    ? 'bg-theme-accent text-theme-bg shadow'
                    : 'text-theme-text/70 hover:text-theme-text hover:bg-theme-border/20'
                }`}
                title="Lápiz"
              >
                <PenTool className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Lápiz</span>
              </button>

              {/* Borrador */}
              <button
                type="button"
                onClick={() => setDrawTool('eraser')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  drawTool === 'eraser'
                    ? 'bg-theme-casa text-theme-bg shadow'
                    : 'text-theme-text/70 hover:text-theme-casa hover:bg-theme-border/20'
                }`}
                title="Borrador: arrastra sobre cualquier trazo"
              >
                <Eraser className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Borrador</span>
              </button>

              {/* Limpiar trazos */}
              <button
                type="button"
                onClick={limpiarSoloTrazos}
                className="p-1 hover:bg-theme-casa/20 text-theme-text/50 hover:text-theme-casa rounded transition-colors"
                title="Eliminar todos los trazos"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Controles de color y tamaño exclusivos del lápiz */}
              {drawTool === 'pen' && (
                <>
                  <div className="w-[1px] h-4 bg-theme-border/60" />

                  {/* Paleta rápida */}
                  <div className="flex items-center gap-1.5 px-1">
                    {PALETA_DIBUJO.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setStrokeColor(item.color)}
                        className={`w-3.5 h-3.5 rounded-full ${item.bgClass} transition-transform hover:scale-125 cursor-pointer ${
                          strokeColor === item.color ? 'ring-2 ring-theme-text scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="w-[1px] h-4 bg-theme-border/60" />

                  {/* Slider de tamaño */}
                  <div className="flex items-center gap-1.5 px-1">
                    <span className="text-[10px] text-theme-text/60">{strokeSize}px</span>
                    <input
                      type="range"
                      min="2"
                      max="24"
                      step="1"
                      value={strokeSize}
                      onChange={(e) => setStrokeSize(Number(e.target.value))}
                      className="w-16 accent-theme-accent cursor-pointer h-1 bg-theme-border rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* =========================================================
              BOTONES DE NOTA Y GRUPO (Comentados a petición)
             =========================================================
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
          ========================================================= */}
        </div>
      </div>

      {/* LIENZO DE REACT FLOW */}
      <div
        className={`flex-1 w-full bg-theme-bg rounded-xl border border-theme-border relative overflow-hidden select-none ${
          boardMode === 'draw'
            ? drawTool === 'eraser'
              ? 'cursor-cell'
              : 'cursor-crosshair'
            : ''
        }`}
        ref={flowWrapper}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          onEdgeClick={(e, edge) => {
            e.stopPropagation();
            toggleMenuEdge(edge.id);
          }}
          onDoubleClick={onPaneDoubleClick}
          zoomOnDoubleClick={false}
          panOnDrag={boardMode === 'notes' ? [0, 1, 2] : false}
          selectionOnDrag={false}
          selectionMode="partial"
          onSelectionEnd={onSelectionEnd}
          nodesDraggable={boardMode === 'notes'}
          elementsSelectable={boardMode === 'notes'}
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

          {/* Trazo temporal interactivo en vivo con z-[1000] por encima de todo */}
          {boardMode === 'draw' && currentStroke.length > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-[1000] overflow-visible"
              style={{
                transform: `translate(${vpX}px, ${vpY}px) scale(${vpZoom})`,
                transformOrigin: '0 0',
              }}
            >
              <path d={liveStrokePath} fill={strokeColor} />
            </svg>
          )}
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