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
import { database } from '../api'; 
import { Plus, Activity, CheckCircle2, RefreshCw, Layers, Trash2, FileText } from 'lucide-react';

// =========================================================
// STYLES & THEME CONSTANTS (Obsidian Minimalist Aesthetic)
// =========================================================
const connectionLineStyle = { stroke: 'var(--color-theme-border)', strokeWidth: 1.5 };

const defaultEdgeOptions = {
  animated: false, 
  style: { 
    stroke: 'var(--color-theme-accent)', // Cambiamos border tenue por el color de acento resplandeciente
    strokeWidth: 1.7,                      // Subimos de 2px a 3px para mayor visibilidad
  }, 
};

// AGREGADO: Configuración de paletas de color para los grupos
const OPCIONES_COLOR_GRUPO = [
  { id: 'purple', bg: 'bg-theme-bg', border: 'border-theme-trabajo/80', dot: 'bg-theme-trabajo', text: 'text-theme-trabajo' },
  { id: 'blue',   bg: 'bg-theme-bg', border: 'border-theme-accent/80',  dot: 'bg-theme-accent',  text: 'text-theme-accent' },
  { id: 'emerald',bg: 'bg-theme-bg', border: 'border-theme-trabajo/80',dot: 'bg-theme-trabajo',text: 'text-theme-trabajo' },
  { id: 'amber',  bg: 'bg-theme-bg', border: 'border-theme-casa/80',   dot: 'bg-theme-casa',   text: 'text-theme-casa' },
  { id: 'rose',   bg: 'bg-theme-bg', border: 'border-theme-casa/80',   dot: 'bg-theme-casa',   text: 'text-theme-casa' },
  { id: 'zinc',   bg: 'bg-theme-bg', border: 'border-theme-border',    dot: 'bg-theme-text/50',text: 'text-theme-text/70' },
];

// =========================================================
// 1. NODO GRUPO (Estilo Obsidian - Contraste Alto y Colores)
// =========================================================
function NodoGrupoExpandible(props) {
  const { id, data, selected } = props;
  
  // Obtenemos el esquema de color seleccionado o el morado por defecto
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
          const evt = new CustomEvent('grupo-resize', { 
            detail: { id: id, width: params.width, height: params.height } 
          });
          window.dispatchEvent(evt);
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

      {/* MENÚ FLOTANTE DE MENÚ / ACCIONES DEL GRUPO */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[100] nodrag pointer-events-none opacity-0 group-hover/groupnode:opacity-100 transition-all duration-150 ease-out">
        <div className="bg-theme-bg border border-theme-border rounded-md shadow-2xl px-2.5 py-1.5 flex items-center gap-2 backdrop-blur-md pointer-events-auto">
          
          <div className="flex items-center gap-1">
            {OPCIONES_COLOR_GRUPO.map((c) => (
              <button
                key={c.id}
                onClick={() => data.onCambiarColorGrupo && data.onCambiarColorGrupo(id, c.id)}
                className={`w-3 h-3 rounded-full ${c.dot} transition-transform hover:scale-125 cursor-pointer ${
                  (data.color || 'purple') === c.id ? 'ring-2 ring-theme-text scale-110' : 'opacity-60 hover:opacity-100'
                }`}
                title={`Color ${c.id}`}
              />
            ))}
          </div>
          <div className="w-[1px] h-3 bg-theme-border/60" />

          <button 
            onClick={() => data.onEliminarNodo(id)} 
            className="text-theme-text/60 hover:text-theme-casa p-1 rounded transition-colors cursor-pointer flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            <span className="text-[10px] font-normal">Eliminar</span>
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
            data.onEditarTexto(id, nuevoTexto.trim());
          }
        }}
      >
        <p className={`font-normal text-[13px] leading-snug tracking-wide break-words text-theme-text ${data.status === 'Completado' ? 'line-through opacity-50' : ''}`}>
          {data.label}
        </p>
      </div>

      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 z-[50] nodrag pointer-events-none opacity-0 group-hover/node:opacity-100 transition-all duration-150 ease-out">
        <div className="bg-theme-bg border border-theme-border rounded-md shadow-2xl px-2 py-1 flex items-center gap-1.5 backdrop-blur-md pointer-events-auto">
          <button onClick={() => data.onCambiarEstado(id, 'Por Hacer')} className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${data.status === 'Por Hacer' ? 'bg-theme-border text-theme-bg' : 'text-theme-text/50 hover:text-theme-text'}`}>Nota</button>
          <button onClick={() => data.onCambiarEstado(id, 'En Progreso')} className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${data.status === 'En Progreso' ? 'bg-theme-accent text-theme-bg' : 'text-theme-text/50 hover:text-theme-text'}`}>Progreso</button>
          <button onClick={() => data.onCambiarEstado(id, 'Completado')} className={`text-[9px] font-medium px-1.5 py-0.5 rounded transition-colors cursor-pointer ${data.status === 'Completado' ? 'bg-theme-trabajo text-theme-bg' : 'text-theme-text/50 hover:text-theme-text'}`}>Listo</button>
          <div className="w-[1px] h-3 bg-theme-border/60" />
          <button onClick={() => data.onEliminarNodo(id)} className="text-theme-text/50 hover:text-theme-casa p-0.5 rounded transition-colors cursor-pointer"><Trash2 className="w-3 h-3" /></button>
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
  const [cargando, setCargando] = useState(false);
  const flowWrapper = useRef(null);
  const debounceTimer = useRef(null);
  
  const contadorMetasLocal = useRef(0);
  const contadorGruposLocal = useRef(0);

  const nombrarGrupoX = (lista, id) => lista.find(n => n.id === id)?.position.x || 0;
  const nombrarGrupoY = (lista, id) => lista.find(n => n.id === id)?.position.y || 0;

  // AGREGADO: Callback para cambiar el color del grupo y persistir el estado
  const cambiarColorGrupo = useCallback((idGrupo, nuevoColor) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === idGrupo) {
        return { ...n, data: { ...n.data, color: nuevoColor } };
      }
      return n;
    }));

    if (database && typeof database.guardarDatos === 'function') {
      database.guardarDatos('cambiarStatusNodoFin', { idNodo: idGrupo, status: nuevoColor }).catch(()=>{});
    }
  }, []);

  // Sincronización del tamaño de contenedores
  useEffect(() => {
    const handleGrupoResize = (e) => {
      const { id, width, height } = e.detail;
      setNodes((nds) => {
        const nuevosNodos = nds.map((n) => {
          if (n.id === id) return { ...n, style: { ...n.style, width, height } };
          return n;
        });

        if (database && typeof database.guardarDatos === 'function') {
          const grupo = nuevosNodos.find(x => x.id === id);
          if (grupo) {
            database.guardarDatos('guardarDimensionesYCoordenadas', {
              id: grupo.id, x: grupo.position.x, y: grupo.position.y, width, height
            }).catch(()=>{});
          }
        }
        return nuevosNodos;
      });
    };

    window.addEventListener('grupo-resize', handleGrupoResize);
    return () => window.removeEventListener('grupo-resize', handleGrupoResize);
  }, []);

  const cambiarEstadoMeta = useCallback((idNodo, nuevoEstado) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === idNodo) return { ...n, data: { ...n.data, status: nuevoEstado } };
      return n;
    }));
    
    if (database && typeof database.guardarDatos === 'function') {
      database.guardarDatos('cambiarStatusNodoFin', { idNodo, status: nuevoEstado }).catch(()=>{});
    }
  }, []);

  const editarTextoMeta = useCallback((idNodo, nuevoTexto) => {
    let nodoActualizado = null;

    setNodes((nds) => {
      const resultado = nds.map((n) => {
        if (n.id === idNodo) {
          nodoActualizado = { ...n, data: { ...n.data, label: nuevoTexto } };
          return nodoActualizado;
        }
        return n;
      });

      if (nodoActualizado && database && typeof database.guardarDatos === 'function') {
        let xParaSheets = nodoActualizado.position.x;
        let yParaSheets = nodoActualizado.position.y;

        if (nodoActualizado.parentId) {
          xParaSheets += nombrarGrupoX(resultado, nodoActualizado.parentId);
          yParaSheets += nombrarGrupoY(resultado, nodoActualizado.parentId);
        }

        database.guardarDatos('guardarDimensionesYCoordenadas', {
          id: nodoActualizado.id,
          label: nuevoTexto,
          x: xParaSheets,
          y: yParaSheets,
          width: nodoActualizado.style?.width || '',
          height: nodoActualizado.style?.height || ''
        }).catch(()=>{});
      }

      return resultado;
    });
  }, [nombrarGrupoX, nombrarGrupoY]);

  const eliminarNodo = useCallback((idNodo) => {
    setNodes((nds) => {
      const nodoABorrar = nds.find(n => n.id === idNodo);
      const esGrupo = nodoABorrar?.type === 'nodoGrupo';
      const nodosFiltrados = nds.filter((n) => n.id !== idNodo);

      if (esGrupo) {
        return nodosFiltrados.map(n => {
          if (n.parentId === idNodo) {
            const posXAbs = n.position.x + (nodoABorrar.position?.x || 0);
            const posYAbs = n.position.y + (nodoABorrar.position?.y || 0);

            if (database && typeof database.guardarDatos === 'function') {
              database.guardarDatos('actualizarParentIdNodo', { idNodo: n.id, parentId: '' }).catch(()=>{});
            }

            return {
              ...n,
              parentId: undefined,
              position: { x: posXAbs, y: posYAbs }
            };
          }
          return n;
        });
      }
      return nodosFiltrados;
    });

    setEdges((eds) => eds.filter((e) => e.source !== idNodo && e.target !== idNodo));
    
    if (database && typeof database.guardarDatos === 'function') {
      database.guardarDatos('eliminarNodoCompleto', { id: idNodo }).catch(()=>{});
    }
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    const confirmar = window.confirm("¿Deseas eliminar este enlace de conexión?");
    if (!confirmar) return;

    setEdges((eds) => eds.filter((e) => e.id !== edge.id));

    if (database && typeof database.guardarDatos === 'function') {
      database.guardarDatos('eliminarConexionFlecha', { id: edge.id }).catch(()=>{});
    }
  }, []);

  const cargarMapa = useCallback(async (isMounted = { current: true }) => {
    if (!database || typeof database.obtenerSeccion !== 'function') return;
    setCargando(true);
    try {
      const [nodosData, conexionesData] = await Promise.all([
        database.obtenerSeccion('mapa_nodos'),
        database.obtenerSeccion('mapa_conexiones')
      ]);

      if (!isMounted.current) return;

      const arrayNodos = Array.isArray(nodosData) ? nodosData : [];
      const arrayConexiones = Array.isArray(conexionesData) ? conexionesData : [];

      contadorMetasLocal.current = arrayNodos.filter(n => n.Type !== 'nodoGrupo').length;
      contadorGruposLocal.current = arrayNodos.filter(n => n.Type === 'nodoGrupo').length;

      const nodosPlanos = arrayNodos.map(n => {
        const esGrupo = n.Type === 'nodoGrupo';
        let estiloGrupo = undefined;
        if (esGrupo) {
          const anchoGuardado = n.Width && !isNaN(parseFloat(n.Width)) ? parseFloat(n.Width) : 380;
          const altoGuardado = n.Height && !isNaN(parseFloat(n.Height)) ? parseFloat(n.Height) : 280;
          estiloGrupo = { width: anchoGuardado, height: altoGuardado };
        }

        return {
          id: n.Id,
          type: n.Type || 'nodoMeta',
          parentId: n.ParentId || undefined,
          extent: undefined, 
          style: estiloGrupo,
          _rawX: parseFloat(n.X || 200),
          _rawY: parseFloat(n.Y || 200),
          position: { x: parseFloat(n.X || 200), y: parseFloat(n.Y || 200) }, 
          data: { 
            id: n.Id, 
            label: n.Label, 
            status: n.Status || 'Por Hacer',
            color: esGrupo ? (n.Status || 'purple') : undefined, // Carga el color guardado en columna Status de Sheets
            onCambiarEstado: cambiarEstadoMeta, 
            onEliminarNodo: eliminarNodo,
            onEditarTexto: editarTextoMeta,
            onCambiarColorGrupo: cambiarColorGrupo // Inyectamos el handler
          }
        };
      });

      const mapeoGrupos = nodosPlanos.filter(n => n.type === 'nodoGrupo');
      const mapeoNotas = nodosPlanos.filter(n => n.type !== 'nodoGrupo');

      const notasCorregidas = mapeoNotas.map(nota => {
        if (nota.parentId) {
          const papa = mapeoGrupos.find(g => g.id === nota.parentId);
          if (papa) {
            return {
              ...nota,
              position: {
                x: nota._rawX - papa._rawX,
                y: nota._rawY - papa._rawY
              }
            };
          }
        }
        return nota;
      });

      const nodosOrdenados = [...mapeoGrupos, ...notasCorregidas];

      setNodes(nodosOrdenados);
      setEdges(arrayConexiones.map(c => ({
        id: c.Id, source: c.Source, target: c.Target, sourceHandle: c.SourceHandle, targetHandle: c.TargetHandle, ...defaultEdgeOptions
      })));
    } catch (e) {
      console.error("Error en carga:", e);
    } finally{
      if (isMounted.current) setCargando(false);
    }
  }, [cambiarEstadoMeta, eliminarNodo, cambiarColorGrupo]);

  useEffect(() => {
    const isMounted = { current: true };
    cargarMapa(isMounted); 
    return () => { isMounted.current = false; };
  }, [cargarMapa]); 

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const nodosActualizados = applyNodeChanges(changes, nds);
      const dragEndChange = changes.find(c => c.type === 'position' && !c.dragging);
      
      if (dragEndChange) {
        const nodoMovido = nodosActualizados.find(n => n.id === dragEndChange.id);
        const grupos = nodosActualizados.filter(n => n.type === 'nodoGrupo');

        if (nodoMovido && nodoMovido.type === 'nodoMeta') {
          let nuevoParentId = undefined;
          let posXAbsoluta = nodoMovido.position.x;
          let posYAbsoluta = nodoMovido.position.y;
          
          if (nodoMovido.parentId) {
            posXAbsoluta += nombrarGrupoX(nodosActualizados, nodoMovido.parentId);
            posYAbsoluta += nombrarGrupoY(nodosActualizados, nodoMovido.parentId);
          }

          const centroX = posXAbsoluta + 112; 
          const centroY = posYAbsoluta + 25;  

          for (const grupo of grupos) {
            const anchoG = grupo.style?.width || 380;
            const altoG = grupo.style?.height || 280;
            
            if (centroX >= grupo.position.x && centroX <= grupo.position.x + anchoG &&
                centroY >= grupo.position.y && centroY <= grupo.position.y + altoG) {
              nuevoParentId = grupo.id;
              break;
            }
          }

          if (nodoMovido.parentId !== nuevoParentId) {
            if (database && typeof database.guardarDatos === 'function') {
              database.guardarDatos('actualizarParentIdNodo', { idNodo: nodoMovido.id, parentId: nuevoParentId || '' }).catch(()=>{});
            }
            
            const resultadoMapeado = nodosActualizados.map(n => {
              if (n.id === nodoMovido.id) {
                const nuevaXLocal = nuevoParentId ? posXAbsoluta - nombrarGrupoX(nodosActualizados, nuevoParentId) : posXAbsoluta;
                const nuevaYLocal = nuevoParentId ? posYAbsoluta - nombrarGrupoY(nodosActualizados, nuevoParentId) : posYAbsoluta;
                
                return { 
                  ...n, 
                  parentId: nuevoParentId, 
                  extent: undefined, 
                  position: { x: nuevaXLocal, y: nuevaYLocal } 
                };
              }
              return n;
            });

            if (database && typeof database.guardarDatos === 'function') {
              const nModificado = resultadoMapeado.find(x => x.id === nodoMovido.id);
              let xSheets = nModificado.position.x + (nuevoParentId ? nombrarGrupoX(resultadoMapeado, nuevoParentId) : 0);
              let ySheets = nModificado.position.y + (nuevoParentId ? nombrarGrupoY(resultadoMapeado, nuevoParentId) : 0);
              
              database.guardarDatos('guardarDimensionesYCoordenadas', {
                id: nModificado.id, x: xSheets, y: ySheets, width: nModificado.style?.width || '', height: nModificado.style?.height || ''
              }).catch(()=>{});
            }

            return [...resultadoMapeado].sort((a, b) => (a.type === 'nodoGrupo' ? -1 : 1));
          }
        }
      }

      const saveChange = changes.find(c => c.type === 'position' && c.position);
      if (saveChange && database && typeof database.guardarDatos === 'function') {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
          setNodes((nodosFrescos) => {
            const n = nodosFrescos.find(x => x.id === saveChange.id);
            if (n) {
              let xParaSheets = n.position.x;
              let yParaSheets = n.position.y;

              if (n.parentId) {
                xParaSheets += nombrarGrupoX(nodosFrescos, n.parentId);
                yParaSheets += nombrarGrupoY(nodosFrescos, n.parentId);
              }

              database.guardarDatos('guardarDimensionesYCoordenadas', {
                id: n.id, x: xParaSheets, y: yParaSheets, width: n.style?.width || '', height: n.style?.height || ''
              }).catch(()=>{});
            }
            return nodosFrescos;
          });
        }, 800);
      }

      return [...nodosActualizados].sort((a, b) => (a.type === 'nodoGrupo' ? -1 : 1));
    });
  }, [nombrarGrupoX, nombrarGrupoY, cambiarEstadoMeta, eliminarNodo]);

  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);
  
  const onConnect = useCallback((params) => {
    const nuevaConexion = { ...params, id: `edge_${Date.now()}`, ...defaultEdgeOptions };
    setEdges((eds) => addEdge(nuevaConexion, eds));
    if (database && typeof database.guardarDatos === 'function') {
      database.guardarDatos('guardarConexionFlecha', {
        id: nuevaConexion.id, source: params.source, target: params.target, sourceHandle: params.sourceHandle, targetHandle: params.targetHandle
      }).catch(()=>{});
    }
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
      data: { id: idMeta, label: textoLimpio, status: 'Por Hacer', onCambiarEstado: cambiarEstadoMeta, onEliminarNodo: eliminarNodo, onEditarTexto: editarTextoMeta }
    };

    setNodes((nds) => [...nds, nuevaTarjetaMeta].sort((a, b) => (a.type === 'nodoGrupo' ? -1 : 1)));

    if (database && typeof database.guardarDatos === 'function') {
      database.guardarDatos('crearNodoMeta', { 
        id: idMeta, label: textoLimpio, type: 'nodoMeta', status: 'Por Hacer', parentId: '', x: posicionFinal.x, y: posicionFinal.y 
      }).catch(()=>{});
    }
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
        label: nombreLimpio, 
        color: 'purple', // Color inicial por defecto
        onEliminarNodo: eliminarNodo, 
        onCambiarColorGrupo: cambiarColorGrupo 
      }
    };

    setNodes((nds) => [nuevoGrupo, ...nds]);

    if (database && typeof database.guardarDatos === 'function') {
      database.guardarDatos('crearNodoMeta', { 
        id: idGrupo, label: nombreLimpio, type: 'nodoGrupo', status: 'purple', parentId: '', x: posicionCascada.x, y: posicionCascada.y, width: 380, height: 280 
      }).catch(()=>{});
    }
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
          onEdgesChange={onEdgesChange} 
          onConnect={onConnect} 
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick} 
          nodeTypes={nodeTypes}
          connectionLineStyle={connectionLineStyle}
          fitView={nodes.length > 1}
          fitViewOptions={{ minZoom: 0.1, maxZoom: 1, padding: 0.2 }}
          minZoom={0.2} 
          maxZoom={2}
          translateExtent={[[-2500, -2500], [2500, 2500]]}
          nodeExtent={[[-2500, -2500], [2500, 2500]]}
          className="z-10"
        >
          <Background color="var(--color-theme-border)" gap={20} size={1} />
          <Controls className="!bg-theme-bg !border-theme-border !shadow-2xl opacity-60 hover:opacity-100 transition-opacity" />
        </ReactFlow>
      </div>
    </div>
  );
}

// =========================================================
// EXPORT COMPUESTO CON PROVIDER
// =========================================================
export default function GestionProyectos() {
  return (
    <ReactFlowProvider>
      <GestionProyectosContenido />
    </ReactFlowProvider>
  );
}