import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { RefreshCw, TrendingDown, Landmark, PiggyBank, Plus, Trash2, CheckCircle2, ShieldAlert, Heart, X, Edit3, GripVertical, Eye, EyeOff, Flame, ShieldCheck } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Deudas({ refreshTrigger }) {
  const [deudas, setDeudas] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoNW, setGuardandoNW] = useState(false);

  const [itemsNW, setItemsNW] = useState([]);
  const [formNW, setFormNW] = useState({ concepto: '', monto: '', tipo: 'NEED', asignado: 'ENRIQUE' });
  const [filtroPersona, setFiltroPersona] = useState('TODOS');

  // 🟢 ESTADO: Filtro por Fase / Urgencia de Deudas
  const [filtroFaseDeuda, setFiltroFaseDeuda] = useState('TODAS'); // 'TODAS' | 'URGENTES' | 'CONTROLADAS'

  // 🟢 ESTADOS: Drag and Drop para Needs vs Wants
  const [draggedNWId, setDraggedNWId] = useState(null);
  const [dragOverNWId, setDragOverNWId] = useState(null);

  // Modal Edición Needs / Wants
  const [mostrarModalEditarNW, setMostrarModalEditarNW] = useState(false);
  const [itemNWSeleccionado, setItemNWSeleccionado] = useState(null);
  const [formEditNW, setFormEditNW] = useState({ concepto: '', monto: '', tipo: 'NEED', asignado: 'ENRIQUE' });

  // 🟢 ESTADOS: Modal Edición de Deudas
  const [mostrarModalEditarDeuda, setMostrarModalEditarDeuda] = useState(false);
  const [deudaSeleccionada, setDeudaSeleccionada] = useState(null);
  const [formEditDeuda, setFormEditDeuda] = useState({
    tarjeta: '',
    descripcion: '',
    deuda_total: '',
    monto_inicial: '',
    fecha_inicial: '',
    fase: 'URGENTE'
  });
  const [guardandoDeuda, setGuardandoDeuda] = useState(false);

  // 🟢 ESTADOS: Modal Creación de Deuda / Préstamo
  const [mostrarModalCrearDeuda, setMostrarModalCrearDeuda] = useState(false);
  const [formCrearDeuda, setFormCrearDeuda] = useState({
    tarjeta: '',
    descripcion: '',
    deuda_total: '',
    monto_inicial: '',
    fecha_inicial: '',
    fase: 'URGENTE'
  });
  const [creandoDeuda, setCreandoDeuda] = useState(false);
 
  const sincronizarDatos = async (silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);

      const [resDeudas, resTransacciones, resNW] = await Promise.all([
        supabase.from('deudas').select('*').order('id', { ascending: true }),
        supabase.from('transacciones').select('*').order('id', { ascending: false }),
        supabase.from('needs_wants').select('*').order('id', { ascending: false })
      ]);
 
      const rawDeudas = resDeudas.data || [];
      const rawTransacciones = resTransacciones.data || [];
      const rawNW = resNW.data || [];

      const deudasMapeadas = rawDeudas.map(d => ({
        id: d.id,
        Tarjeta: d.tarjeta,
        Descripcion: d.descripcion,
        Fecha_Limite_de_Pago: d.fecha_limite,
        Fecha_De_Corte: d.fecha_corte,
        Fecha_Inicial: d.fecha_corte || '',
        Deuda_Total: d.deuda_total,
        Monto_Inicial: d.monto_inicial,
        Monto_Minimo: d.monto_minimo,
        Pago_No_Intereses: d.pago_no_intereses,
        Status: d.status,
        Fase: (d.status || '').toUpperCase() === 'CONTROLADA' ? 'CONTROLADA' : 'URGENTE'
      }));
      setDeudas(deudasMapeadas);

      const transaccionesMapeadas = rawTransacciones.map(t => ({
        id: t.id,
        Fecha: t.fecha,
        Importe: t.importe,
        Descripción: t.descripcion,
        'Metodo de pago': t.metodo_pago,
        Rubro: t.rubro
      }));
      setTransacciones(transaccionesMapeadas);

      const extraidosNW = rawNW.map((nw, idx) => ({
        id: nw.id,
        concepto: nw.concepto,
        monto: limpiarMonto(nw.monto),
        tipo: nw.tipo || 'NEED',
        asignado: nw.asignado || 'ENRIQUE',
        completado: (nw.status || '').toUpperCase() === 'COMPLETADO',
        prioridad: nw.prioridad !== null && nw.prioridad !== undefined ? Number(nw.prioridad) : idx + 1
      }));
      
      extraidosNW.sort((a, b) => (a.prioridad || 0) - (b.prioridad || 0));
      setItemsNW(extraidosNW);

    } catch (error) {
      console.error("Error al sincronizar con Supabase:", error);
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    sincronizarDatos(false);
  }, [refreshTrigger]);

  const limpiarMonto = (valorCrudo) => {
    if (valorCrudo === null || valorCrudo === undefined) return 0;
    if (typeof valorCrudo === 'number') return Math.abs(valorCrudo);
    const stringLimpio = valorCrudo.toString().replace(/[^0-9.]/g, '');
    const numero = parseFloat(stringLimpio);
    return isNaN(numero) ? 0 : Math.abs(numero);
  };

  const agregarItemNW = async (e) => {
    e.preventDefault();
    if (!formNW.concepto.trim() || !formNW.monto) return;

    setGuardandoNW(true);
    const siguientePrioridad = itemsNW.length > 0 ? Math.max(...itemsNW.map(i => i.prioridad || 0)) + 1 : 1;
    const nuevo = {
      concepto: formNW.concepto.toUpperCase().trim(),
      monto: parseFloat(formNW.monto) || 0,
      tipo: formNW.tipo,
      asignado: formNW.asignado,
      status: 'PENDIENTE',
      prioridad: siguientePrioridad
    };

    try {
      const { error } = await supabase.from('needs_wants').insert([nuevo]);
      if (error) throw error;
      setFormNW(prev => ({ ...prev, concepto: '', monto: '' }));
      await sincronizarDatos(true);
    } catch (err) {
      console.error("Error al agregar Need/Want en Supabase:", err);
    } finally {
      setGuardandoNW(false);
    }
  };

  // ==========================================
  // 🟢 CONTROLADORES DE REORDENAMIENTO DRAG & DROP
  // ==========================================
  const handleDragStartNW = (e, id) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedNWId(id);
  };

  const handleDragOverNW = (e, id) => {
    e.preventDefault();
    if (dragOverNWId !== id) {
      setDragOverNWId(id);
    }
  };

  const handleDropNW = async (e, targetId) => {
    e.preventDefault();
    setDragOverNWId(null);
    if (!draggedNWId || draggedNWId === targetId) return;

    const copia = [...itemsNW];
    const indexOrigen = copia.findIndex(i => i.id === draggedNWId);
    const indexDestino = copia.findIndex(i => i.id === targetId);

    if (indexOrigen === -1 || indexDestino === -1) return;

    const [itemMovido] = copia.splice(indexOrigen, 1);
    copia.splice(indexDestino, 0, itemMovido);

    const reordenados = copia.map((item, idx) => ({
      ...item,
      prioridad: idx + 1
    }));

    setItemsNW(reordenados);
    setDraggedNWId(null);

    try {
      for (const item of reordenados) {
        await supabase
          .from('needs_wants')
          .update({ prioridad: item.prioridad })
          .eq('id', item.id);
      }
    } catch (err) {
      console.error('Error al guardar prioridades reordenadas en Supabase:', err);
    }
  };
  // 🟢 EDICIÓN DE DEUDA
  const abrirModalEdicionDeuda = (deuda) => {
    setDeudaSeleccionada(deuda);
    setFormEditDeuda({
      tarjeta: deuda.Tarjeta || 'ORO BBVA',
      descripcion: deuda.Descripcion || '',
      deuda_total: deuda.Deuda_Total ?? '',
      monto_inicial: deuda.Monto_Inicial ?? '',
      fecha_inicial: deuda.Fecha_Inicial || '',
      fase: deuda.Fase || 'URGENTE'
    });
    setMostrarModalEditarDeuda(true);
  };

  const ejecutarModificarDeuda = async (e) => {
    e.preventDefault();
    if (!deudaSeleccionada) return;

    setGuardandoDeuda(true);
    const datosActualizados = {
      tarjeta: formEditDeuda.tarjeta.trim().toUpperCase(),
      descripcion: formEditDeuda.descripcion.trim().toUpperCase(),
      deuda_total: parseFloat(formEditDeuda.deuda_total) || 0,
      monto_inicial: parseFloat(formEditDeuda.monto_inicial) || 0,
      fecha_corte: formEditDeuda.fecha_inicial.trim(),
      status: formEditDeuda.fase === 'CONTROLADA' ? 'CONTROLADA' : 'ACTIVA'
    };

    try {
      const { error } = await supabase
        .from('deudas')
        .update(datosActualizados)
        .eq('id', deudaSeleccionada.id);

      if (error) throw error;
      setMostrarModalEditarDeuda(false);
      setDeudaSeleccionada(null);
      await sincronizarDatos(true);
    } catch (err) {
      console.error("Error al modificar Deuda en Supabase:", err);
    } finally {
      setGuardandoDeuda(false);
    }
  };

  // 🟢 CREAR NUEVA DEUDA
  const abrirModalCrearDeuda = () => {
    setFormCrearDeuda({
      tarjeta: '',
      descripcion: '',
      deuda_total: '',
      monto_inicial: '',
      fecha_inicial: new Date().toISOString().split('T')[0],
      fase: 'URGENTE'
    });
    setMostrarModalCrearDeuda(true);
  };

  const ejecutarCrearDeuda = async (e) => {
    e.preventDefault();
    if (!formCrearDeuda.tarjeta.trim() || !formCrearDeuda.descripcion.trim() || !formCrearDeuda.deuda_total) return;

    setCreandoDeuda(true);
    const montoInicialFinal = formCrearDeuda.monto_inicial ? parseFloat(formCrearDeuda.monto_inicial) : parseFloat(formCrearDeuda.deuda_total);

    const payload = {
      tarjeta: formCrearDeuda.tarjeta.trim().toUpperCase(),
      descripcion: formCrearDeuda.descripcion.trim().toUpperCase(),
      deuda_total: parseFloat(formCrearDeuda.deuda_total) || 0,
      monto_inicial: montoInicialFinal || 0,
      fecha_corte: formCrearDeuda.fecha_inicial.trim(),
      status: formCrearDeuda.fase === 'CONTROLADA' ? 'CONTROLADA' : 'ACTIVA'
    };

    try {
      const { error } = await supabase.from('deudas').insert([payload]);
      if (error) throw error;
      setMostrarModalCrearDeuda(false);
      setFormCrearDeuda({ tarjeta: '', descripcion: '', deuda_total: '', monto_inicial: '', fecha_inicial: '', fase: 'URGENTE' });
      await sincronizarDatos(true);
    } catch (err) {
      console.error("Error al registrar deuda/préstamo en Supabase:", err);
    } finally {
      setCreandoDeuda(false);
    }
  };

  const abrirModalEdicionNW = (item) => {
    setItemNWSeleccionado(item);
    setFormEditNW({
      concepto: item.concepto,
      monto: item.monto.toString(),
      tipo: item.tipo,
      asignado: item.asignado
    });
    setMostrarModalEditarNW(true);
  };

  const ejecutarModificarNW = async (e) => {
    e.preventDefault();
    if (!itemNWSeleccionado || !formEditNW.concepto.trim() || !formEditNW.monto) return;

    setGuardandoNW(true);
    const datosActualizados = {
      concepto: formEditNW.concepto.toUpperCase().trim(),
      monto: parseFloat(formEditNW.monto) || 0,
      tipo: formEditNW.tipo,
      asignado: formEditNW.asignado
    };

    try {
      const { error } = await supabase
        .from('needs_wants')
        .update(datosActualizados)
        .eq('id', itemNWSeleccionado.id);

      if (error) throw error;
      setMostrarModalEditarNW(false);
      setItemNWSeleccionado(null);
      await sincronizarDatos(true);
    } catch (err) {
      console.error("Error al modificar Need/Want en Supabase:", err);
    } finally {
      setGuardandoNW(false);
    }
  };

  const toggleStatusNW = async (item) => {
    setGuardandoNW(true);
    const nuevoStatus = item.completado ? 'PENDIENTE' : 'COMPLETADO';

    try {
      const { error } = await supabase
        .from('needs_wants')
        .update({ status: nuevoStatus })
        .eq('id', item.id);

      if (error) throw error;
      await sincronizarDatos(true);
    } catch (err) {
      console.error("Error al actualizar status de Need/Want en Supabase:", err);
    } finally {
      setGuardandoNW(false);
    }
  };

  const eliminarItemNW = async (idNW) => {
    setGuardandoNW(true);

    try {
      const { error } = await supabase
        .from('needs_wants')
        .delete()
        .eq('id', idNW);

      if (error) throw error;
      await sincronizarDatos(true);
    } catch (err) {
      console.error("Error al eliminar Need/Want en Supabase:", err);
    } finally {
      setGuardandoNW(false);
    }
  };

  if (cargando) {
    return <p className="text-xs font-black uppercase tracking-wider text-theme-text/50 animate-pulse text-left p-4">Actualizando...</p>;
  }

  // Deudas activas filtradas por fase (Urgentes vs Controladas)
  const deudasVigentes = deudas.filter(d => {
    const status = (d.Status || '').toString().trim().toUpperCase();
    if (status === 'LIQUIDADO' || status === 'COMPLETADO') return false;
    if (filtroFaseDeuda === 'URGENTES') return d.Fase === 'URGENTE';
    if (filtroFaseDeuda === 'CONTROLADAS') return d.Fase === 'CONTROLADA';
    return true;
  });

  const totalDeudaActual = deudasVigentes.reduce((acc, curr) => acc + limpiarMonto(curr.Deuda_Total), 0);

  const totalAhorrado = transacciones
    .filter(t => {
      const rubroT = (t.Rubro || t.rubro || "").toString().toUpperCase().trim();
      return rubroT === "AHORRO" || rubroT === "AHORROS";
    })
    .reduce((acc, curr) => acc + limpiarMonto(curr.Importe || curr.importe || 0), 0);

  // 🟢 CÁLCULO DE PATRIMONIO REAL DINÁMICO SEGÚN FASE
  const patrimonioNetoReal = totalAhorrado - totalDeudaActual;

  const formatearMonedaCompleta = (valor) => {
    if (valor === null || valor === undefined || isNaN(valor)) return '';
    return `$${Number(valor).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generarDatosGrafica = (deuda) => {
    const actual = limpiarMonto(deuda.Deuda_Total);
    const inicial = limpiarMonto(deuda.Monto_Inicial) || actual;
    const etiquetaInicio = deuda.Fecha_Inicial ? `Inicio (${deuda.Fecha_Inicial})` : 'Inicio';
    
    const descUpper = (deuda.Descripcion || '').toUpperCase().trim();
    const rubroFormatoPago = `PAGO DE ${descUpper}`;
    
    const abonosReales = transacciones
      .filter(t => {
        const rubroT = (t.Rubro || t.rubro || "").toString().trim().toUpperCase();
        const descT = (t.Descripción || t.descripcion || "").toString().trim().toUpperCase();
        
        return (
          rubroT === rubroFormatoPago || 
          rubroT === `PAGO A ${descUpper}` ||
          (descT.startsWith('PAGO') && descT.includes(descUpper))
        );
      })
      .map(t => ({
        fecha: t.Fecha || t.fecha || 'Abono',
        monto: limpiarMonto(t.Importe || t.importe || 0)
      }));

    const dataPuntos = [];
    let saldoFlujoReal = inicial;
    
    dataPuntos.push({
      name: etiquetaInicio,
      'Historial Real': saldoFlujoReal,
      'Proyección Proporcionada': null,
      montoPagoReal: 0
    });

    const abonosAgrupados = [];
    abonosReales.forEach((abono) => {
      const existe = abonosAgrupados.find(a => a.fecha === abono.fecha);
      if (existe) {
        existe.monto += abono.monto; 
      } else {
        abonosAgrupados.push({ ...abono }); 
      }
    });

    abonosAgrupados.forEach((abono) => {
      saldoFlujoReal = Math.max(actual, saldoFlujoReal - abono.monto);
      dataPuntos.push({
        name: abono.fecha,
        'Historial Real': saldoFlujoReal,
        'Proyección Proporcionada': null,
        montoPagoReal: abono.monto
      });
    });

    if (abonosAgrupados.length === 0) {
      dataPuntos.push({
        name: 'Actual',
        'Historial Real': actual,
        'Proyección Proporcionada': actual,
        montoPagoReal: 0
      });
    } else {
      const ultimoPunto = dataPuntos[dataPuntos.length - 1];
      ultimoPunto['Proyección Proporcionada'] = saldoFlujoReal;
    }

    const pagoPromedio = abonosReales.length > 0 
      ? abonosReales.reduce((acc, curr) => acc + curr.monto, 0) / abonosReales.length 
      : inicial * 0.15;

    let saldoSimulado = actual;
    let periodosProyectados = 1;
    const hoy = new Date();
    
    while (saldoSimulado > 0 && periodosProyectados <= 12) {
      saldoSimulado = Math.max(0, saldoSimulado - pagoPromedio);

      const fechaProyectada = new Date(hoy.getFullYear(), hoy.getMonth() + periodosProyectados, 1);
      const mesNombre = fechaProyectada.toLocaleDateString('es-MX', { month: 'short' });
      const añoCorto = fechaProyectada.getFullYear().toString().slice(-2);
      const etiquetaFecha = `${mesNombre.toUpperCase()} ${añoCorto}`;

      dataPuntos.push({
        name: etiquetaFecha,
        'Historial Real': null,
        'Proyección Proporcionada': Math.round(saldoSimulado * 100) / 100,
        montoPagoReal: 0
      });
      periodosProyectados++;
    }

    return dataPuntos;
  };

  const formatearEjeY = (tick) => {
    if (tick >= 1000) return `$${(tick / 1000).toFixed(0)}k`;
    return `$${tick}`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataNode = payload[0].payload;
      const balanceActual = dataNode['Historial Real'] !== null ? dataNode['Historial Real'] : dataNode['Proyección Proporcionada'];
      const abonoEfectuado = dataNode.montoPagoReal || 0;

      return (
        <div className="bg-theme-bg border border-theme-border p-3 rounded-xl shadow-xl font-mono text-left space-y-1">
          <p className="text-[10px] font-bold text-theme-text/60 uppercase tracking-wider">{dataNode.name}</p>
          <div className="text-xs">
            <span className="text-theme-text/70 font-medium">Balance: </span>
            <span className="text-theme-text font-bold">{formatearMonedaCompleta(balanceActual)}</span>
          </div>
          {abonoEfectuado > 0 && (
            <div className="text-xs border-t border-theme-border/40 pt-1 mt-1">
              <span className="text-theme-trabajo font-medium">Pago Detectado: </span>
              <span className="text-theme-trabajo font-black">+{formatearMonedaCompleta(abonoEfectuado)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const itemsNWFiltrados = itemsNW.filter(i => filtroPersona === 'TODOS' || i.asignado === filtroPersona);
  const totalNeeds = itemsNWFiltrados.filter(i => i.tipo === 'NEED' && !i.completado).reduce((acc, i) => acc + i.monto, 0);
  const totalWants = itemsNWFiltrados.filter(i => i.tipo === 'WANT' && !i.completado).reduce((acc, i) => acc + i.monto, 0);

  const getBadgePersonaStyle = (persona) => {
    switch (persona) {
      case 'VICTORIA': return 'bg-theme-trabajo/10 text-theme-trabajo border-theme-trabajo/30';
      case 'PAKAL': return 'bg-theme-accent/10 text-theme-accent border-theme-accent/30';
      case 'CASA': return 'bg-theme-casa/10 text-theme-casa border-theme-casa/30';
      default: return 'bg-theme-border/20 text-theme-text border-theme-border/40';
    }
  };

  return (
    <div className="space-y-8 text-left p-4 bg-theme-bg text-theme-text font-mono min-h-screen">
      
      {/* HEADER */}
      <div className="border-b border-theme-border/40 pb-5 flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-theme-text flex items-center gap-2">
            <Landmark className="text-theme-accent w-6 h-6 stroke-[2.5]" /> Dashboard de Tendencias
          </h2>
          <p className="text-[10px] font-bold text-theme-text/60 uppercase tracking-widest mt-1">
            Historial de abonos reales vs estimación discontinua de amortización
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Selector de Fases Integrado Arriba */}
          <div className="flex items-center gap-1 bg-theme-bg p-1 rounded-xl border border-theme-border/60">
            <span className="text-[8px] font-black uppercase text-theme-text/50 px-1.5 hidden sm:inline">Fase:</span>
            <button
              type="button"
              onClick={() => setFiltroFaseDeuda('TODAS')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                filtroFaseDeuda === 'TODAS'
                  ? 'bg-theme-accent text-theme-bg shadow'
                  : 'text-theme-text/60 hover:text-theme-text'
              }`}
            >
              Todas ({deudas.length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroFaseDeuda('URGENTES')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                filtroFaseDeuda === 'URGENTES'
                  ? 'bg-theme-casa text-theme-bg shadow'
                  : 'text-theme-casa/80 hover:text-theme-casa'
              }`}
            >
              <Flame className="w-3 h-3" /> Urgentes ({deudas.filter(d => d.Fase === 'URGENTE').length})
            </button>
            <button
              type="button"
              onClick={() => setFiltroFaseDeuda('CONTROLADAS')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                filtroFaseDeuda === 'CONTROLADAS'
                  ? 'bg-theme-trabajo text-theme-bg shadow'
                  : 'text-theme-trabajo/80 hover:text-theme-trabajo'
              }`}
            >
              <ShieldCheck className="w-3 h-3" /> Controladas ({deudas.filter(d => d.Fase === 'CONTROLADA').length})
            </button>
          </div>

          <button 
            type="button" 
            onClick={abrirModalCrearDeuda}
            className="bg-theme-accent hover:opacity-90 text-theme-bg px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg transition-all cursor-pointer h-9"
            title="Registrar nuevo préstamo o tarjeta"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Registrar Pasivo
          </button>
          <button 
            onClick={() => sincronizarDatos(false)} 
            className="bg-theme-bg border border-theme-border p-2 rounded-xl text-theme-text/60 hover:text-theme-text transition-all cursor-pointer h-9 flex items-center justify-center"
            title="Sincronizar datos"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CUADROS CONSOLIDADOS (CON PASIVOS Y PATRIMONIO AJUSTADOS A LA FASE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. Deuda Viva / Capital Total de Pasivos ajustado a la fase */}
        <div className="bg-theme-bg border border-theme-border rounded-2xl p-5 border-l-4 border-l-theme-casa shadow-xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-theme-text/60 block">
            Capital Total de Pasivos ({filtroFaseDeuda})
          </span>
          <div className="text-2xl sm:text-3xl font-black text-theme-text tabular-nums tracking-tight mt-1 font-mono">
            ${totalDeudaActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-theme-casa font-bold uppercase tracking-tight">
            <TrendingDown className="w-3.5 h-3.5" /> 
            {filtroFaseDeuda === 'TODAS' && 'Deuda viva consolidada'}
            {filtroFaseDeuda === 'URGENTES' && 'Deuda crítica / Bola de nieve'}
            {filtroFaseDeuda === 'CONTROLADAS' && 'Deuda estable / Controlada'}
          </div>
        </div>

        {/* 2. Ahorro Acumulado */}
        <div className="bg-theme-bg border border-theme-border rounded-2xl p-5 border-l-4 border-l-theme-trabajo shadow-xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-theme-text/60 block">Fondo de Ahorro Acumulado</span>
          <div className="text-2xl sm:text-3xl font-black text-theme-trabajo tabular-nums tracking-tight mt-1 font-mono">
            ${totalAhorrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-theme-trabajo font-bold uppercase tracking-tight">
            <PiggyBank className="w-3.5 h-3.5 text-theme-trabajo" /> Fondos en cuenta de ahorro
          </div>
        </div>

        {/* 3. REALIDAD FINANCIERA (PATRIMONIO NETO REAL) */}
        <div className={`bg-theme-bg border rounded-2xl p-5 shadow-xl border-l-4 ${patrimonioNetoReal < 0 ? 'border-l-red-500 bg-red-500/5' : 'border-l-theme-accent'}`}>
          <span className="text-[10px] font-black uppercase tracking-widest text-theme-text/60 block">
            Realidad Financiera ({filtroFaseDeuda})
          </span>
          <div className={`text-2xl sm:text-3xl font-black tabular-nums tracking-tight mt-1 font-mono ${patrimonioNetoReal < 0 ? 'text-red-400' : 'text-theme-trabajo'}`}>
            {patrimonioNetoReal < 0 ? '-' : ''}${Math.abs(patrimonioNetoReal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight text-theme-text/60">
            <span>Ahorro (${totalAhorrado.toLocaleString('es-MX', { maximumFractionDigits: 0 })}) - Deuda (${totalDeudaActual.toLocaleString('es-MX', { maximumFractionDigits: 0 })})</span>
          </div>
        </div>

      </div>

      {/* SECCIÓN DE GRÁFICAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deudasVigentes.map((deuda, index) => {
          const datosGrafica = generarDatosGrafica(deuda);
          
          return (
            <div key={index} className="bg-theme-bg border border-theme-border rounded-2xl p-5 space-y-4 shadow-xl">
              <div className="flex justify-between items-start border-b border-theme-border/40 pb-3">
                <div 
                  onClick={() => abrirModalEdicionDeuda(deuda)}
                  className="cursor-pointer group flex items-start gap-2"
                  title="Clic para editar saldos, fecha inicial y fase"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black bg-theme-bg px-2 py-0.5 rounded border border-theme-border text-theme-accent uppercase font-mono tracking-wider">
                        {deuda.Tarjeta}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                        deuda.Fase === 'URGENTE' 
                          ? 'bg-theme-casa/10 text-theme-casa border-theme-casa/30' 
                          : 'bg-theme-trabajo/10 text-theme-trabajo border-theme-trabajo/30'
                      }`}>
                        {deuda.Fase === 'URGENTE' ? '🔴 FASE CRÍTICA' : '🟢 CONTROLADA'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-theme-text uppercase tracking-tight mt-1 group-hover:text-theme-accent transition-colors flex items-center gap-1.5">
                      {deuda.Descripcion}
                      <Edit3 className="w-3.5 h-3.5 text-theme-text/40 group-hover:text-theme-accent transition-colors" />
                    </h3>
                  </div>
                </div>

                <div 
                  onClick={() => abrirModalEdicionDeuda(deuda)}
                  className="text-right font-mono cursor-pointer group"
                  title="Clic para editar saldo actual"
                >
                  <span className="text-[9px] text-theme-text/50 block uppercase font-bold group-hover:text-theme-accent transition-colors">Saldo Actual</span>
                  <span className="text-lg font-black text-theme-casa group-hover:brightness-125 transition-all">
                    ${limpiarMonto(deuda.Deuda_Total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="h-64 w-full bg-theme-bg p-2 rounded-xl border border-theme-border/60 overflow-hidden relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={datosGrafica} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id={`colorReal-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-theme-accent)" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="var(--color-theme-accent)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-theme-border)" opacity={0.3} vertical={false} />
                    
                    <XAxis 
                      dataKey="name" 
                      stroke="var(--color-theme-text)" 
                      opacity={0.6}
                      fontSize={9} 
                      fontWeight="bold"
                      tickLine={false} 
                      dy={8}
                    />
                    
                    <YAxis 
                      stroke="var(--color-theme-text)" 
                      opacity={0.6}
                      fontSize={10} 
                      fontWeight="bold"
                      tickLine={false} 
                      tickFormatter={formatearEjeY}
                    />
                    
                    <Tooltip content={<CustomTooltip />} />
                    
                    <Area
                      type="monotone"
                      dataKey="Historial Real"
                      stroke="var(--color-theme-accent)"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={`url(#colorReal-${index})`}
                      connectNulls={false}
                      dot={{ r: 5, fill: 'var(--color-theme-trabajo)', stroke: 'var(--color-theme-bg)', strokeWidth: 1.5 }}
                      activeDot={{ r: 7, fill: 'var(--color-theme-trabajo)' }}
                    />

                    <Line
                      type="monotone"
                      dataKey="Proyección Proporcionada"
                      stroke="var(--color-theme-text)"
                      opacity={0.4}
                      strokeWidth={2.5}
                      strokeDasharray="6 6"
                      dot={false}
                      connectNulls={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider pt-1">
                <span className="text-[8px] font-mono text-theme-text/40">
                  {deuda.Fecha_Inicial ? `Arranque: ${deuda.Fecha_Inicial}` : 'Fecha inicial: No fijada'}
                </span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-theme-trabajo rounded-full block border border-theme-bg"></span>
                    <span className="text-theme-text/70">Abonos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-b-2 border-dashed border-theme-text/50 block"></span>
                    <span className="text-theme-text/50">Proyección</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 🛡️ MODULO INTEGRADO: NEEDS VS WANTS CON DRAG & DROP DE PRIORIDADES */}
      {/* ========================================================================= */}
      <div className="bg-theme-bg border border-theme-border rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-theme-border/40 pb-4 gap-3">
          <div>
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-theme-text flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-theme-accent" /> Needs vs Wants
            </h3>
          </div>

          <div className="flex items-center gap-2 bg-theme-bg p-1 border border-theme-border rounded-xl">
            <span className="text-[9px] font-black uppercase text-theme-text/60 pl-2">Ver:</span>
            <select
              value={filtroPersona}
              onChange={(e) => setFiltroPersona(e.target.value)}
              className="bg-theme-bg border border-theme-border text-[10px] font-bold text-theme-text rounded px-2 py-1 outline-none cursor-pointer uppercase"
            >
              <option value="TODOS">TODOS</option>
              <option value="ENRIQUE">ENRIQUE</option>
              <option value="VICTORIA">VICTORIA</option>
              <option value="PAKAL">PAKAL</option>
              <option value="CASA">CASA</option>
            </select>
          </div>
        </div>

        {/* METRICAS TOTALES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-theme-bg border border-theme-border p-4 rounded-xl border-t-2 border-t-theme-casa">
            <span className="text-[9px] font-black uppercase tracking-wider text-theme-casa flex items-center gap-1">
              🔴 Necesidades (Needs)
            </span>
            <div className="text-2xl font-black text-theme-text font-mono mt-1 tabular-nums">
              ${totalNeeds.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="bg-theme-bg border border-theme-border p-4 rounded-xl border-t-2 border-t-theme-trabajo">
            <span className="text-[9px] font-black uppercase tracking-wider text-theme-trabajo flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-theme-trabajo" /> Deseos / Gustos (Wants)
            </span>
            <div className="text-2xl font-black text-theme-text font-mono mt-1 tabular-nums">
              ${totalWants.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* FORMULARIO DE CAPTURA */}
        <form onSubmit={agregarItemNW} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-theme-bg p-3 rounded-xl border border-theme-border">
          <input
            type="text"
            placeholder="CONCEPTO (EJ. REFACCIONES)"
            value={formNW.concepto}
            onChange={(e) => setFormNW(prev => ({ ...prev, concepto: e.target.value }))}
            className="sm:col-span-4 bg-theme-bg border border-theme-border rounded-lg p-2 text-xs font-bold text-theme-text outline-none focus:border-theme-accent uppercase"
          />
          <input
            type="number"
            step="0.01"
            placeholder="MONTO ($)"
            value={formNW.monto}
            onChange={(e) => setFormNW(prev => ({ ...prev, monto: e.target.value }))}
            className="sm:col-span-3 bg-theme-bg border border-theme-border rounded-lg p-2 text-xs font-bold text-theme-text outline-none focus:border-theme-accent tabular-nums"
          />
          <select
            value={formNW.asignado}
            onChange={(e) => setFormNW(prev => ({ ...prev, asignado: e.target.value }))}
            className="sm:col-span-2 bg-theme-bg border border-theme-border rounded-lg p-2 text-[10px] font-black text-theme-text outline-none cursor-pointer uppercase"
          >
            <option value="ENRIQUE">ENRIQUE</option>
            <option value="VICTORIA">VICTORIA</option>
            <option value="PAKAL">PAKAL</option>
            <option value="CASA">CASA</option>
          </select>
          <div className="sm:col-span-3 flex gap-2">
            <select
              value={formNW.tipo}
              onChange={(e) => setFormNW(prev => ({ ...prev, tipo: e.target.value }))}
              className="w-full bg-theme-bg border border-theme-border rounded-lg p-2 text-[10px] font-black text-theme-text outline-none cursor-pointer"
            >
              <option value="NEED">NEED 🔴</option>
              <option value="WANT">WANT 🟣</option>
            </select>
            <button
              type="submit"
              disabled={guardandoNW}
              className="bg-theme-accent hover:opacity-90 text-theme-bg px-3 py-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </form>

        {/* LISTADO DE ELEMENTOS CON SOPORTE DRAG & DROP */}
        <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
          {itemsNWFiltrados.length > 0 ? itemsNWFiltrados.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStartNW(e, item.id)}
              onDragOver={(e) => handleDragOverNW(e, item.id)}
              onDrop={(e) => handleDropNW(e, item.id)}
              className={`flex justify-between items-center p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                dragOverNWId === item.id ? 'border-t-4 border-t-theme-accent bg-theme-accent/10' : ''
              } ${
                item.completado
                  ? 'bg-theme-bg/40 border-theme-border/40 text-theme-text/40 line-through'
                  : 'bg-theme-bg border-theme-border text-theme-text hover:border-theme-accent/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Agarradera visual */}
                <GripVertical className="w-4 h-4 text-theme-text/30 flex-shrink-0" />
                
                <button
                  type="button"
                  onClick={() => toggleStatusNW(item)}
                  disabled={guardandoNW}
                  className="cursor-pointer bg-transparent border-none p-0 text-theme-text/50 hover:text-theme-trabajo disabled:opacity-50 flex-shrink-0"
                >
                  <CheckCircle2 className={`w-4 h-4 ${item.completado ? 'text-theme-trabajo' : ''}`} />
                </button>

                <div 
                  onClick={() => abrirModalEdicionNW(item)}
                  className="cursor-pointer flex-1 min-w-0 group"
                  title="Clic para editar"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-theme-text/40 font-bold">#{index + 1}</span>
                    <span className="text-xs font-black uppercase tracking-tight block truncate group-hover:text-theme-accent transition-colors">
                      {item.concepto}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border inline-block ${
                      item.tipo === 'NEED' 
                        ? 'bg-theme-casa/10 text-theme-casa border-theme-casa/30' 
                        : 'bg-theme-trabajo/10 text-theme-trabajo border-theme-trabajo/30'
                    }`}>
                      {item.tipo}
                    </span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border inline-block ${getBadgePersonaStyle(item.asignado)}`}>
                      {item.asignado}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <span 
                  onClick={() => abrirModalEdicionNW(item)}
                  className="text-xs font-black font-mono tabular-nums cursor-pointer hover:text-theme-accent transition-colors"
                  title="Clic para editar"
                >
                  ${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </span>
                <button
                  type="button"
                  onClick={() => eliminarItemNW(item.id)}
                  disabled={guardandoNW}
                  className="text-theme-text/40 hover:text-theme-casa transition-colors cursor-pointer bg-transparent border-none p-0 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )) : (
            <p className="text-center text-theme-text/50 font-bold uppercase text-[10px] py-6">Sin prioridades registradas</p>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🟢 MODAL REGISTRAR NUEVA DEUDA / PRÉSTAMO */}
      {/* ========================================================================= */}
      {mostrarModalCrearDeuda && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-bg border border-theme-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left border-t-4 border-t-theme-accent">
            <form onSubmit={ejecutarCrearDeuda} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-[9px] font-black bg-theme-bg px-2 py-0.5 rounded border border-theme-border text-theme-accent uppercase font-mono tracking-wider">
                    NUEVO REGISTRO
                  </span>
                  <h4 className="text-sm font-black text-theme-text uppercase tracking-tighter italic mt-1">
                    Registrar Pasivo / Préstamo
                  </h4>
                </div>
                <button 
                  type="button" 
                  onClick={() => setMostrarModalCrearDeuda(false)} 
                  className="text-theme-text/50 hover:text-theme-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Entidad / Banco</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. BBVA o FAMILIAR"
                      value={formCrearDeuda.tarjeta}
                      onChange={(e) => setFormCrearDeuda(prev => ({ ...prev, tarjeta: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Identificador Clave</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. PRESTAMO NOMINA"
                      value={formCrearDeuda.descripcion}
                      onChange={(e) => setFormCrearDeuda(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-casa mb-1">Saldo Vivo ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      placeholder="Ej. 15000.00"
                      value={formCrearDeuda.deuda_total}
                      onChange={(e) => setFormCrearDeuda(prev => ({ ...prev, deuda_total: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold outline-none text-theme-casa focus:border-theme-casa tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-trabajo mb-1">Monto Inicial ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="Monto original"
                      value={formCrearDeuda.monto_inicial}
                      onChange={(e) => setFormCrearDeuda(prev => ({ ...prev, monto_inicial: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold outline-none text-theme-trabajo focus:border-theme-trabajo tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Fecha Inicial</label>
                    <input 
                      type="date" 
                      value={formCrearDeuda.fecha_inicial}
                      onChange={(e) => setFormCrearDeuda(prev => ({ ...prev, fecha_inicial: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2 text-xs font-mono font-bold text-theme-text outline-none focus:border-theme-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Fase / Urgencia</label>
                    <select
                      value={formCrearDeuda.fase}
                      onChange={(e) => setFormCrearDeuda(prev => ({ ...prev, fase: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent cursor-pointer"
                    >
                      <option value="URGENTE">🔴 CRÍTICA / BOLA DE NIEVE</option>
                      <option value="CONTROLADA">🟢 CONTROLADA</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-6">
                <button 
                  type="submit" 
                  disabled={creandoDeuda}
                  className="w-full bg-theme-accent text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  {creandoDeuda ? 'Guardando...' : 'Crear en Supabase'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setMostrarModalCrearDeuda(false)} 
                  className="w-full text-center text-[10px] font-black uppercase text-theme-text/50 hover:text-theme-text cursor-pointer py-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🟢 MODAL EDITAR DEUDA (INCLUYE FECHA INICIAL Y FASE) */}
      {/* ========================================================================= */}
      {mostrarModalEditarDeuda && deudaSeleccionada && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-bg border border-theme-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left border-t-4 border-t-theme-casa">
            <form onSubmit={ejecutarModificarDeuda} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <span className="text-[9px] font-black bg-theme-bg px-2 py-0.5 rounded border border-theme-border text-theme-accent uppercase font-mono tracking-wider">
                    {deudaSeleccionada.Tarjeta}
                  </span>
                  <h4 className="text-sm font-black text-theme-text uppercase tracking-tighter italic mt-1">
                    Configurar {deudaSeleccionada.Descripcion}
                  </h4>
                </div>
                <button 
                  type="button" 
                  onClick={() => setMostrarModalEditarDeuda(false)} 
                  className="text-theme-text/50 hover:text-theme-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Tarjeta (Banco)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. ORO BBVA"
                      value={formEditDeuda.tarjeta}
                      onChange={(e) => setFormEditDeuda(prev => ({ ...prev, tarjeta: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Identificador</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Ej. TDCV"
                      value={formEditDeuda.descripcion}
                      onChange={(e) => setFormEditDeuda(prev => ({ ...prev, descripcion: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-casa mb-1">Deuda Viva ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      value={formEditDeuda.deuda_total}
                      onChange={(e) => setFormEditDeuda(prev => ({ ...prev, deuda_total: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold outline-none text-theme-casa focus:border-theme-casa tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-trabajo mb-1">Monto Inicial ($)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      value={formEditDeuda.monto_inicial}
                      onChange={(e) => setFormEditDeuda(prev => ({ ...prev, monto_inicial: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold outline-none text-theme-trabajo focus:border-theme-trabajo tabular-nums"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Fecha Inicial (Arranque)</label>
                    <input 
                      type="text" 
                      placeholder="DD/MM/AAAA o YYYY-MM-DD"
                      value={formEditDeuda.fecha_inicial}
                      onChange={(e) => setFormEditDeuda(prev => ({ ...prev, fecha_inicial: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2 text-xs font-mono font-bold text-theme-text outline-none focus:border-theme-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Fase</label>
                    <select
                      value={formEditDeuda.fase}
                      onChange={(e) => setFormEditDeuda(prev => ({ ...prev, fase: e.target.value }))}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent cursor-pointer"
                    >
                      <option value="URGENTE">🔴 BOLA DE NIEVE (URGENTE)</option>
                      <option value="CONTROLADA">🟢 CONTROLADA</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-6">
                <button 
                  type="submit" 
                  disabled={guardandoDeuda}
                  className="w-full bg-theme-casa text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  {guardandoDeuda ? 'Guardando...' : 'Guardar en Supabase'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setMostrarModalEditarDeuda(false)} 
                  className="w-full text-center text-[10px] font-black uppercase text-theme-text/50 hover:text-theme-text cursor-pointer py-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA EDITAR NEED / WANT */}
      {mostrarModalEditarNW && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-bg border border-theme-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left border-t-4 border-t-theme-accent">
            <form onSubmit={ejecutarModificarNW} className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-black text-theme-text uppercase tracking-tighter italic">
                  Editar Prioridad ({formEditNW.tipo})
                </h4>
                <button 
                  type="button" 
                  onClick={() => setMostrarModalEditarNW(false)} 
                  className="text-theme-text/50 hover:text-theme-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Concepto</label>
              <input 
                type="text" 
                required
                value={formEditNW.concepto}
                onChange={(e) => setFormEditNW(prev => ({ ...prev, concepto: e.target.value }))}
                className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold uppercase outline-none text-theme-text focus:border-theme-accent mb-4"
              />

              <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Monto ($)</label>
              <input 
                type="number" 
                step="0.01" 
                required
                value={formEditNW.monto}
                onChange={(e) => setFormEditNW(prev => ({ ...prev, monto: e.target.value }))}
                className="w-full bg-theme-bg border border-theme-border rounded-lg p-3 text-sm font-bold outline-none text-theme-text focus:border-theme-accent mb-4 tabular-nums"
              />

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Tipo</label>
                  <select 
                    value={formEditNW.tipo}
                    onChange={(e) => setFormEditNW(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent cursor-pointer"
                  >
                    <option value="NEED">NEED 🔴</option>
                    <option value="WANT">WANT 🟣</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Asignado</label>
                  <select 
                    value={formEditNW.asignado}
                    onChange={(e) => setFormEditNW(prev => ({ ...prev, asignado: e.target.value }))}
                    className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold uppercase outline-none text-theme-text focus:border-theme-accent cursor-pointer"
                  >
                    <option value="ENRIQUE">ENRIQUE</option>
                    <option value="VICTORIA">VICTORIA</option>
                    <option value="PAKAL">PAKAL</option>
                    <option value="CASA">CASA</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-6">
                <button 
                  type="submit" 
                  disabled={guardandoNW}
                  className="w-full bg-theme-accent text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  {guardandoNW ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setMostrarModalEditarNW(false)} 
                  className="w-full text-center text-[10px] font-black uppercase text-theme-text/50 hover:text-theme-text cursor-pointer py-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}