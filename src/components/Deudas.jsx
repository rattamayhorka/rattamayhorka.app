import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
// ==========================================
// 🔴 ANTERIOR: Sin icono X para modal de edición
// import { RefreshCw, TrendingDown, Landmark, PiggyBank, Plus, Trash2, CheckCircle2, ShieldAlert, Heart } from 'lucide-react';
// 🟢 NUEVO: Importación agregando icono X
import { RefreshCw, TrendingDown, Landmark, PiggyBank, Plus, Trash2, CheckCircle2, ShieldAlert, Heart, X } from 'lucide-react';
// ==========================================
import { ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function Deudas({ refreshTrigger }) {
  const [deudas, setDeudas] = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoNW, setGuardandoNW] = useState(false);

  const [itemsNW, setItemsNW] = useState([]);
  const [formNW, setFormNW] = useState({ concepto: '', monto: '', tipo: 'NEED', asignado: 'ENRIQUE' });
  const [filtroPersona, setFiltroPersona] = useState('TODOS');

  // ==========================================
  // 🟢 NUEVO: Estados para Modal de Edición de Needs / Wants
  const [mostrarModalEditarNW, setMostrarModalEditarNW] = useState(false);
  const [itemNWSeleccionado, setItemNWSeleccionado] = useState(null);
  const [formEditNW, setFormEditNW] = useState({ concepto: '', monto: '', tipo: 'NEED', asignado: 'ENRIQUE' });
  // ==========================================

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
        Deuda_Total: d.deuda_total,
        Monto_Inicial: d.monto_inicial,
        Monto_Minimo: d.monto_minimo,
        Pago_No_Intereses: d.pago_no_intereses,
        Status: d.status
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

      const extraidosNW = rawNW.map(nw => ({
        id: nw.id,
        concepto: nw.concepto,
        monto: limpiarMonto(nw.monto),
        tipo: nw.tipo || 'NEED',
        asignado: nw.asignado || 'ENRIQUE',
        completado: (nw.status || '').toUpperCase() === 'COMPLETADO'
      }));
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
    const nuevo = {
      concepto: formNW.concepto.toUpperCase().trim(),
      monto: parseFloat(formNW.monto) || 0,
      tipo: formNW.tipo,
      asignado: formNW.asignado,
      status: 'PENDIENTE'
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
  // 🟢 NUEVAS FUNCIONES: ABRIR MODAL Y GUARDAR EDICIÓN DE NEED/WANT
  // ==========================================
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
  // ==========================================

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

  const deudasPermitidas = ['TDCV', 'TDCE'];

  const deudasVigentes = deudas.filter(d => {
    const descripcion = (d.Descripcion || '').toString().trim().toUpperCase();
    return deudasPermitidas.includes(descripcion);
  });

  const totalDeudaActual = deudasVigentes.reduce((acc, curr) => acc + limpiarMonto(curr.Deuda_Total), 0);

  const totalAhorrado = transacciones
    .filter(t => {
      const rubroT = (t.Rubro || t.rubro || "").toString().toUpperCase().trim();
      return rubroT === "AHORRO" || rubroT === "AHORROS";
    })
    .reduce((acc, curr) => acc + limpiarMonto(curr.Importe || curr.importe || 0), 0);

  const formatearMonedaCompleta = (valor) => {
    if (valor === null || valor === undefined || isNaN(valor)) return '';
    return `$${Number(valor).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generarDatosGrafica = (deuda) => {
    const actual = limpiarMonto(deuda.Deuda_Total);
    const inicial = limpiarMonto(deuda.Monto_Inicial) || actual;
    
    const rubroBuscado = `Pago de ${deuda.Descripcion}`.toUpperCase().trim();
    const abonosReales = transacciones
      .filter(t => (t.Rubro || t.rubro || "").toString().trim().toUpperCase() === rubroBuscado)
      .map(t => ({
        fecha: t.Fecha || t.fecha || 'Abono',
        monto: limpiarMonto(t.Importe || t.importe || 0)
      }));

    const dataPuntos = [];
    let saldoFlujoReal = inicial;
    
    dataPuntos.push({
      name: 'Inicio',
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
      <div className="border-b border-theme-border/40 pb-5 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-theme-text flex items-center gap-2">
            <Landmark className="text-theme-accent w-6 h-6 stroke-[2.5]" /> Dashboard de Tendencias
          </h2>
          <p className="text-[10px] font-bold text-theme-text/60 uppercase tracking-widest mt-1">
            Historial de abonos reales vs estimación discontinua de amortización
          </p>
        </div>
        
        <button onClick={() => sincronizarDatos(false)} className="bg-theme-bg border border-theme-border p-2.5 rounded-xl text-theme-text/60 hover:text-theme-text transition-all cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* CUADROS CONSOLIDADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div className="bg-theme-bg border border-theme-border rounded-2xl p-6 border-l-4 border-l-theme-casa shadow-2xl backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-widest text-theme-text/60 block">Capital Total de Pasivos Activos</span>
          <div className="text-3xl sm:text-4xl font-black text-theme-text tabular-nums tracking-tight mt-1 font-mono">
            ${totalDeudaActual.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-theme-casa font-bold uppercase tracking-tight">
            <TrendingDown className="w-3.5 h-3.5" /> Portafolio de deuda viva analizado
          </div>
        </div>

        <div className="bg-theme-bg border border-theme-border rounded-2xl p-6 border-l-4 border-l-theme-trabajo shadow-2xl backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-widest text-theme-text/60 block">Fondo de Ahorro Acumulado</span>
          <div className="text-3xl sm:text-4xl font-black text-theme-trabajo tabular-nums tracking-tight mt-1 font-mono">
            ${totalAhorrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-theme-trabajo font-bold uppercase tracking-tight">
            <PiggyBank className="w-3.5 h-3.5 text-theme-trabajo" /> Registros vinculados al Rubro AHORRO
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
                <div>
                  <span className="text-[9px] font-black bg-theme-bg px-2 py-0.5 rounded border border-theme-border text-theme-accent uppercase font-mono tracking-wider">
                    {deuda.Tarjeta}
                  </span>
                  <h3 className="text-lg font-black text-theme-text uppercase tracking-tight mt-1">
                    {deuda.Descripcion}
                  </h3>
                </div>
                <div className="text-right font-mono">
                  <span className="text-[9px] text-theme-text/50 block uppercase font-bold">Saldo Actual</span>
                  <span className="text-lg font-black text-theme-casa">
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

              <div className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-wider pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-theme-trabajo rounded-full block border border-theme-bg"></span>
                  <span className="text-theme-text/70">Puntos de Pago Realizados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-b-2 border-dashed border-theme-text/50 block"></span>
                  <span className="text-theme-text/50">Proyección Estimada</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 🛡️ MODULO INTEGRADO: NEEDS VS WANTS */}
      {/* ========================================================================= */}
      <div className="bg-theme-bg border border-theme-border rounded-2xl p-6 space-y-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-theme-border/40 pb-4 gap-3">
          <div>
            <h3 className="text-lg font-black uppercase italic tracking-tighter text-theme-text flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-theme-accent" /> Needs vs Wants
            </h3>
            <p className="text-[10px] font-bold text-theme-text/60 uppercase mt-0.5">Priorización de Compras Futuras</p>
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

        {/* LISTADO DE ELEMENTOS */}
        <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
          {itemsNWFiltrados.length > 0 ? itemsNWFiltrados.map(item => (
            <div
              key={item.id}
              className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                item.completado
                  ? 'bg-theme-bg/40 border-theme-border/40 text-theme-text/40 line-through'
                  : 'bg-theme-bg border-theme-border text-theme-text hover:border-theme-accent/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => toggleStatusNW(item)}
                  disabled={guardandoNW}
                  className="cursor-pointer bg-transparent border-none p-0 text-theme-text/50 hover:text-theme-trabajo disabled:opacity-50 flex-shrink-0"
                >
                  <CheckCircle2 className={`w-4 h-4 ${item.completado ? 'text-theme-trabajo' : ''}`} />
                </button>
                {/* ========================================== */}
                {/* 🔴 ANTERIOR: Texto estático sin evento de clic */}
                {/* <div>
                  <span className="text-xs font-black uppercase tracking-tight block">{item.concepto}</span>
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
                </div> */}
                {/* 🟢 NUEVO: Contenedor interactivo para abrir edición al hacer clic */}
                <div 
                  onClick={() => abrirModalEdicionNW(item)}
                  className="cursor-pointer flex-1 min-w-0 group"
                  title="Clic para editar"
                >
                  <span className="text-xs font-black uppercase tracking-tight block truncate group-hover:text-theme-accent transition-colors">
                    {item.concepto}
                  </span>
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
                {/* ========================================== */}
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
      {/* 🟢 NUEVO: MODAL PARA EDITAR NEED / WANT */}
      {/* ========================================================================= */}
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