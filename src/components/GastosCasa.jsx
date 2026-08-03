import { useEffect, useState } from 'react';
import { database } from '../api';
import { X, Plus, CreditCard, ChevronDown, ChevronRight, AlertTriangle, ShieldCheck, Flame, Wallet, CheckCircle2 } from 'lucide-react';

export default function Finanzas({ refreshTrigger }) {
  const [transacciones, setTransacciones] = useState([]);
  const [presupuestosBase, setPresupuestosBase] = useState([]);
  const [mapaRubrosAMacro, setMapaRubrosAMacro] = useState({}); 
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalRegistro, setModalRegistro] = useState(false);
  
  // 💸 CONTROL DE SALDOS Y MÉTODOS
  const [modalSaldos, setModalSaldos] = useState(false);
  const [saldosCuentas, setSaldosCuentas] = useState({}); 
  const [listaMetodos, setListaMetodos] = useState([]);  

  // 📅 SELECCIÓN DE PERIODO DINÁMICO
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(obtenerQuincenaActualId());
  
  // FILTRO POR MACRO
  const [macroFiltroSeleccionado, setMacroFiltroSeleccionado] = useState(null);
  
  const [macrosAbiertas, setMacrosAbiertas] = useState({ "Facturas / Vivienda": true, "Deudas / Tarjetas": true });
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 9;

  const [form, setForm] = useState({
    importe: "",
    descripcion: "",
    metodo_pago: "", 
    rubro: "",
    tipo: "GASTO" // GASTO o INGRESO
  });

  // =========================================================================
  //  📅 MOTOR DE FECHAS Y QUINCENAS CONFORME A DÍAS DE PAGO (15 Y 30)
  // =========================================================================
  function obtenerQuincenaActualId() {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth() + 1;
    const dia = hoy.getDate();

    let añoFinal = año;
    let mesFinal = mes;
    let quincena = 'Q1';

    if (dia < 15) {
      quincena = 'Q1';
    } else if (dia >= 15 && dia < 30) {
      quincena = 'Q2';
    } else {
      quincena = 'Q1';
      mesFinal = mes + 1;
      if (mesFinal > 12) {
        mesFinal = 1;
        añoFinal += 1;
      }
    }
    return `${añoFinal}-${String(mesFinal).padStart(2, '0')}-${quincena}`;
  }

  function parsearFechaAQuincenaId(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.includes('-') ? fechaStr.split('-') : fechaStr.split('/');
    let año, mes, dia;
    if (partes[0].length === 4) { 
      [año, mes, dia] = partes.map(Number);
    } else { 
      [dia, mes, año] = partes.map(Number);
    }
    
    let añoFinal = año;
    let mesFinal = mes;
    let qId = 'Q1';

    if (dia < 15) {
      qId = 'Q1';
    } else if (dia >= 15 && dia < 30) {
      qId = 'Q2';
    } else {
      qId = 'Q1';
      mesFinal = mes + 1;
      if (mesFinal > 12) {
        mesFinal = 1;
        añoFinal += 1;
      }
    }
    return `${añoFinal}-${String(mesFinal).padStart(2, '0')}-${qId}`;
  }

  function calcularProgresoTiempoQuincena() {
    const hoy = new Date();
    const dia = hoy.getDate();
    
    if (dia < 15) {
      return { actual: dia, total: 14, pct: (dia / 14) * 100 };
    } else if (dia >= 15 && dia < 30) {
      const diaActualQ2 = dia - 14;
      return { actual: diaActualQ2, total: 15, pct: (diaActualQ2 / 15) * 100 };
    } else {
      const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
      const diaActualNuevaQ1 = dia === 30 ? 1 : 2;
      const totalDiasNuevaQ1 = 14 + (ultimoDiaMes - 30);
      return { actual: diaActualNuevaQ1, total: totalDiasNuevaQ1, pct: (diaActualNuevaQ1 / totalDiasNuevaQ1) * 100 };
    }
  }

  function generarOpcionesDeQuincenas() {
    const opciones = [];
    const hoy = new Date();
    const mesesEtiquetas = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    for (let i = -2; i <= 1; i++) {
      const fechaIterada = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
      const año = fechaIterada.getFullYear();
      const mesNum = String(fechaIterada.getMonth() + 1).padStart(2, '0');
      const mesNombre = mesesEtiquetas[fechaIterada.getMonth()];

      opciones.push({ id: `${año}-${mesNum}-Q1`, texto: `${mesNombre} ${año} - Pago del 30 (Días 30 al 14)` });
      opciones.push({ id: `${año}-${mesNum}-Q2`, texto: `${mesNombre} ${año} - Pago del 15 (Días 15 al 29)` });
    }
    return opciones.reverse();
  }

  const progresoQuincena = calcularProgresoTiempoQuincena();

  // =========================================================================
  //  📡 INGESTIÓN DE DATA (CON ACTUALIZACIÓN SILENCIOSA EN SEGUNDO PLANO)
  // =========================================================================
  const cargarDatos = async (silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);
      const [dataTransacciones, dataPresupuestos, dataMapeo] = await Promise.all([
        database.obtenerSeccion('transacciones'),
        database.obtenerSeccion('presupuestos_macro'), 
        database.obtenerSeccion('mapeo_rubros')
      ]);

      if (Array.isArray(dataTransacciones)) setTransacciones(dataTransacciones);
      
      if (Array.isArray(dataPresupuestos)) {
        setPresupuestosBase(dataPresupuestos);
        const mapaSaldosDetectados = {};
        const metodosDetectados = [];

        dataPresupuestos.forEach(fila => {
          if (fila.Metodos_Pago && fila.Metodos_Pago.trim() !== "") {
            const nombreMetodo = fila.Metodos_Pago.trim();
            const saldoMetodo = parseFloat(fila.Saldo_Actual?.toString().replace(/[$,\s]/g, '')) || 0;
            mapaSaldosDetectados[nombreMetodo] = saldoMetodo;
            metodosDetectados.push(nombreMetodo);
          }
        });

        setSaldosCuentas(mapaSaldosDetectados);
        if (metodosDetectados.length > 0) {
          setListaMetodos(metodosDetectados);
          const primerMetodoConSaldo = metodosDetectados.find(m => (mapaSaldosDetectados[m] || 0) > 0) || metodosDetectados[0];
          setForm(prev => ({ ...prev, metodo_pago: prev.metodo_pago || primerMetodoConSaldo }));
        }
      }
      
      if (Array.isArray(dataMapeo) && dataMapeo.length > 0) {
        const mapaConstruido = dataMapeo.reduce((acc, curr) => {
          if (curr.Sub_Rubro && curr.Categoria_Macro) {
            acc[curr.Sub_Rubro.trim()] = curr.Categoria_Macro.trim();
          }
          return acc;
        }, {});
        
        setMapaRubrosAMacro(mapaConstruido);
        const rubrosDisponibles = Object.keys(mapaConstruido);
        if (rubrosDisponibles.length > 0) {
          setForm(prev => ({ ...prev, rubro: prev.rubro || rubrosDisponibles[0] }));
        }
      }
    } catch (error) {
      console.error("Error al sincronizar con Búnker Sheets:", error);
    } finally {
      if (!silencioso) setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos(false);
  }, [refreshTrigger]);

  useEffect(() => {
    const TIEMPO_POLLING = 5 * 60 * 1000;
    const intervaloAuto = setInterval(() => {
      cargarDatos(true); 
    }, TIEMPO_POLLING);

    return () => clearInterval(intervaloAuto);
  }, []);

  const toggleMacro = (macro) => {
    setMacrosAbiertas(prev => ({ ...prev, [macro]: !prev[macro] }));
  };

  const ejecutarGuardar = async (e) => {
    e.preventDefault();
    if (!form.importe || !form.descripcion.trim()) return alert("Completa los campos requeridos");

    setGuardando(true);
    
    const importeNumerico = Math.abs(parseFloat(form.importe));
    const finalImporte = form.tipo === 'INGRESO' ? -importeNumerico : importeNumerico;

    const payload = {
      fecha: new Date().toLocaleDateString('es-MX'),
      importe: finalImporte, 
      descripcion: form.descripcion.toUpperCase().trim(),
      metodo_pago: form.metodo_pago,
      rubro: form.rubro
    };

    setTransacciones(prev => [payload, ...prev]);
    setModalRegistro(false);
    setPaginaActual(1);
    
    await database.guardarDatos('guardarTransaccion', payload);

    setForm(prev => ({ ...prev, importe: "", descripcion: "", tipo: "GASTO" }));
    setGuardando(false);
    cargarDatos(false);
  };

  const ejecutarActualizarSaldos = async (e) => {
    e.preventDefault();
    setGuardando(true);
    await database.guardarDatos('actualizarSaldos', saldosCuentas);
    setModalSaldos(false);
    setGuardando(false);
    cargarDatos(false);
  };

  const listadoRubros = Object.keys(mapaRubrosAMacro);

  if (cargando) {
    return <p className="text-xs font-black uppercase tracking-wider text-theme-text/50 animate-pulse text-left p-4">Actualizando...</p>;
  }

  // =========================================================================
  //  🧠 MOTOR DE PROCESAMIENTO UNIFICADO
  // =========================================================================
  let gastoGlobal = 0;
  let ingresosSueldo = 0;
  let ingresosSobrante = 0;
  // AGREGADO: Acumulador de Ingreso tipo REGALO
  let ingresosRegalo = 0;
  let presupuestoGlobalEstatico = 0;
  let totalDeudaMitigada = 0;
  let compromisosCriticosAsignados = 0;
  let compromisosCriticosGastados = 0;

  const gastosPorMetodo = {};
  const macroEstructura = {};
  const macrosObligatorias = ["Facturas / Vivienda", "Servicios / Internet", "Educacion"];

  // 1. Inicializar macros fijas de la hoja
  presupuestosBase.forEach(p => {
    const lim = parseFloat(p.Asignacion_Quincenal?.toString().replace(/[$,\s]/g, '')) || 0;
    const macroNombre = p.Categoria_Macro;
    
    if (macroNombre && !macroNombre.includes("Saldo_Actual")) {
      macroEstructura[macroNombre] = { asignado: lim, gastado: 0, rubros: {} };
      presupuestoGlobalEstatico += lim;
      if (macrosObligatorias.includes(macroNombre)) compromisosCriticosAsignados += lim;
    }
  });

  // 2. Procesar transacciones directo mediante segmentación limpia
  const transaccionesFiltradasYProcesadas = transacciones.map(t => {
    const fechaFila = t.Fecha || t.fecha || "";
    const rubroActual = (t.Rubro || t.rubro || "Extras").trim();
    const macroAsignada = mapaRubrosAMacro[rubroActual] || "Extras";
    const importeCrudo = t.Importe || t.importe || "0";
    
    const impLimpio = Math.abs(parseFloat(importeCrudo.toString().replace(/[$,\s\-()]/g, ''))) || 0;
    const qIdCalculado = parsearFechaAQuincenaId(fechaFila);

    return {
      ...t,
      qIdFinal: qIdCalculado,
      montoAbsoluto: impLimpio,
      rubroFinal: rubroActual,
      macroFinal: macroAsignada
    };
  }).filter(t => t.qIdFinal === periodoSeleccionado);

  // 3. Ejecutar clasificaciones agregadas para el periodo activo
  transaccionesFiltradasYProcesadas.forEach(t => {
    const rubroUpper = t.rubroFinal.toUpperCase();
    
    if (rubroUpper === "TRASPASO") {
      return; 
    }

    if (rubroUpper === "SUELDO") {
      ingresosSueldo += t.montoAbsoluto;
      return; 
    }
    if (rubroUpper === "SOBRANTE") {
      ingresosSobrante += t.montoAbsoluto;
      return;
    }
    // AGREGADO: Captura e integración del rubro REGALO
    if (rubroUpper === "REGALO") {
      ingresosRegalo += t.montoAbsoluto;
      return;
    }

    gastoGlobal += t.montoAbsoluto;
    const metodoActual = t['Metodo de pago'] || t.metodo_pago || "Efectivo";
    gastosPorMetodo[metodoActual] = (gastosPorMetodo[metodoActual] || 0) + t.montoAbsoluto;

    if (!macroEstructura[t.macroFinal]) {
      macroEstructura[t.macroFinal] = { asignado: 0, gastado: 0, rubros: {} };
    }

    macroEstructura[t.macroFinal].gastado += t.montoAbsoluto;
    macroEstructura[t.macroFinal].rubros[t.rubroFinal] = (macroEstructura[t.macroFinal].rubros[t.rubroFinal] || 0) + t.montoAbsoluto;

    if (t.macroFinal === "Deudas / Tarjetas") totalDeudaMitigada += t.montoAbsoluto;
    if (macrosObligatorias.includes(t.macroFinal)) compromisosCriticosGastados += t.montoAbsoluto;
  });

  const ingresosTotalesFlujo = ingresosSueldo + ingresosSobrante + ingresosRegalo;
  
  const efectivoFisicoTotal = Object.values(saldosCuentas).reduce((acc, curr) => acc + curr, 0);
  const deudasAsignadas = macroEstructura["Deudas / Tarjetas"] ? macroEstructura["Deudas / Tarjetas"].asignado : 0;
  const bolsaDisponibleFlujoLibre = (presupuestoGlobalEstatico - deudasAsignadas) - (gastoGlobal - totalDeudaMitigada);

  // =========================================================================
  //  ⚠️ CÁLCULO DE ALERTA POR DESFASE DE PRESUPUESTO
  // =========================================================================

  // NUEVA IMPLEMENTACIÓN BIDIRECCIONAL (CON MARGEN DE TOLERANCIA DE $1.00):
  const diferenciaPresupuesto = presupuestoGlobalEstatico - ingresosTotalesFlujo;
  
  // Te pasas si el presupuesto asignado es mayor a tus ingresos reales
  const presupuestoExcedido = ingresosTotalesFlujo > 0 && diferenciaPresupuesto > 1.00;
  
  // Te falta asignar si los ingresos reales son mayores que el presupuesto asignado
  const presupuestoFaltante = ingresosTotalesFlujo > 0 && diferenciaPresupuesto < -1.00;

  // =========================================================================
  //  🔍 CONCILIADOR INDIVIDUAL CUENTA POR CUENTA
  // =========================================================================
  const ingresosPorMetodo = {};
  
  transaccionesFiltradasYProcesadas.forEach(t => {
    const rubroUpper = t.rubroFinal.toUpperCase();
    const metodo = t['Metodo de pago'] || t.metodo_pago || "Efectivo";
   
    if (rubroUpper === "SUELDO" || rubroUpper === "SOBRANTE" || rubroUpper === "REGALO") {
      const metodo = t['Metodo de pago'] || t.metodo_pago || "Efectivo";
      ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] || 0) + t.montoAbsoluto;
    }

    if (rubroUpper === "TRASPASO") {
      const importeCrudo = parseFloat((t.Importe || t.importe || "0").toString().replace(/[$,\s()]/g, '')) || 0;
      // Si en Sheets viene como (1,000) o negativo, es ENTRADA a esa cuenta:
      if (t.importe < 0 || (typeof t.Importe === 'string' && t.Importe.includes('('))) {
        ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] || 0) + t.montoAbsoluto;
      } else {
        // Si viene positivo, es SALIDA de esa cuenta:
        gastosPorMetodo[metodo] = (gastosPorMetodo[metodo] || 0) + t.montoAbsoluto;
      }
    }


  });

  const cuentasDescuadradas = [];
  let totalGastosFaltantesGlobal = 0;

  listaMetodos.forEach(metodo => {
    const saldoActualEnSheet = saldosCuentas[metodo] || 0;
    const ingresosCuenta = ingresosPorMetodo[metodo] || 0;
    const gastosRegistradosCuenta = gastosPorMetodo[metodo] || 0;

    if (ingresosCuenta > 0 || gastosRegistradosCuenta > 0) {
      const saldoTeoricoQueDeberiaTener = ingresosCuenta - gastosRegistradosCuenta;
      const diferenciaAbsoluta = saldoTeoricoQueDeberiaTener - saldoActualEnSheet;

      if (Math.abs(diferenciaAbsoluta) > 15) {
        totalGastosFaltantesGlobal += Math.abs(diferenciaAbsoluta);
        cuentasDescuadradas.push({ 
          nombre: metodo, 
          montoFaltante: Math.abs(diferenciaAbsoluta),
          tipo: diferenciaAbsoluta > 0 ? "gasto" : "ingreso"
        });
      }
    }
  });

  const transaccionesParaTabla = transaccionesFiltradasYProcesadas.filter(t => {
    return !macroFiltroSeleccionado || t.macroFinal === macroFiltroSeleccionado;
  });

  const totalPaginas = Math.ceil(transaccionesParaTabla.length / itemsPorPagina) || 1;
  const indiceUltimoItem = paginaActual * itemsPorPagina;
  const indicePrimerItem = indiceUltimoItem - itemsPorPagina;
  
  const transaccionesPaginadas = [...transaccionesParaTabla].reverse().slice(indicePrimerItem, indiceUltimoItem);

  return (
    <div className="space-y-6 text-left p-2 bg-theme-bg text-theme-text font-mono min-h-screen">
      
      {/* HEADER */}
      <div className="border-b border-theme-border/40 pb-5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tighter uppercase italic text-theme-text flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-theme-accent stroke-[2.5]" /> Control Financiero
          </h2>
          <div className="mt-2 flex items-center gap-2 bg-theme-bg p-1.5 border border-theme-border rounded-xl">
            <span className="text-[9px] font-black uppercase text-theme-text/50 pl-2">Corte:</span>
            <select 
              value={periodoSeleccionado}
              onChange={(e) => { 
                setPeriodoSeleccionado(e.target.value);
                setPaginaActual(1);
                setMacroFiltroSeleccionado(null);
              }}
              className="bg-theme-bg border border-theme-border text-xs font-bold text-theme-text rounded px-2.5 py-1 focus:outline-none focus:border-theme-accent cursor-pointer"
            >
              {generarOpcionesDeQuincenas().map(opcion => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.texto} {opcion.id === obtenerQuincenaActualId() ? "• (En Curso)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setModalSaldos(true)} 
            className="bg-theme-bg hover:opacity-80 text-theme-text/70 border border-theme-border px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center transition-all cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 mr-1.5 text-theme-text/50" /> Ajustar Canales Fijos
          </button>
          <button 
            onClick={() => setModalRegistro(true)} 
            className="bg-theme-accent hover:opacity-90 text-theme-bg px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1 stroke-[3]" /> Registrar Movimiento
          </button>
        </div>
      </div>

      {/* PROGRESS BAR */}
      {periodoSeleccionado === obtenerQuincenaActualId() && (
        <div className="bg-theme-bg border border-theme-border/60 rounded-xl p-4">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-wider mb-2">
            <span className="text-theme-text/60">Progreso Temporal del Periodo</span>
            <span className="text-theme-accent">Día {progresoQuincena.actual} de {progresoQuincena.total} ({Math.round(progresoQuincena.pct)}%)</span>
          </div>
          <div className="w-full bg-theme-bg border border-theme-border h-2 rounded-full overflow-hidden">
            <div className="bg-theme-accent h-full transition-all" style={{ width: `${progresoQuincena.pct}%` }}></div>
          </div>
        </div>
      )}

      {/* 📊 CUADRO DE MANDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CONTROL DE INGRESOS */}
        <div className="bg-theme-bg border border-theme-border rounded-xl p-4 flex flex-col justify-between border-t-2 border-t-theme-trabajo">
          <span className="text-[9px] font-black uppercase tracking-wider text-theme-trabajo">Ingresos Obtenidos Q.</span>
          <div className="mt-2 space-y-1">
            <div className="text-xl font-black text-theme-trabajo tabular-nums">
              ${ingresosTotalesFlujo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <div className="pt-1.5 border-t border-theme-border/40 space-y-0.5 text-[9px] uppercase font-bold text-theme-text/70">
              <div className="flex justify-between">
                <span className="text-theme-text/50 font-semibold">💼 Sueldo Base:</span>
                <span className="text-theme-text font-mono">${ingresosSueldo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-text/50 font-semibold">📦 15na anterior:</span>
                <span className="text-theme-trabajo font-mono">${ingresosSobrante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-text/50 font-semibold">🎁 Extras:</span>
                <span className="text-theme-trabajo font-mono">${ingresosRegalo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* DETECTOR DE GASTOS OLVIDADOS */}
        <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${totalGastosFaltantesGlobal > 10 ? 'bg-theme-casa/10 border-theme-casa/60 border-t-2 border-t-theme-casa animate-pulse' : 'bg-theme-bg border-theme-border'}`}>
          <span className={`text-[9px] font-black uppercase tracking-wider ${totalGastosFaltantesGlobal > 10 ? 'text-theme-casa' : 'text-theme-text/50'}`}>
            {totalGastosFaltantesGlobal > 10 ? '⚠️ Gastos Sin Registrar' : 'Cuentas Cuadradas'}
          </span>
          <div className="mt-2 space-y-1">
            <div className={`text-xl font-black tabular-nums ${totalGastosFaltantesGlobal > 10 ? 'text-theme-casa' : 'text-theme-text/70'}`}>
              ${totalGastosFaltantesGlobal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            {cuentasDescuadradas.length > 0 ? (
              <div className="pt-2 border-t border-theme-border/40 space-y-1">
                {cuentasDescuadradas.map(c => {
                  const esGasto = c.tipo === "gasto";
                  return (
                    <div key={c.nombre} className="text-[10px] font-black uppercase flex justify-between items-center tracking-tight py-0.5">
                      <span className="text-theme-text/70">{c.nombre}</span>
                      <span className={`font-mono font-bold ${esGasto ? 'text-theme-casa' : 'text-theme-trabajo'}`}>
                        $ {c.montoFaltante.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[8px] text-theme-text/50 uppercase font-bold tracking-tight">Realidad física coincide con flujo</p>
            )}
          </div>
        </div>

        {/* NUEVA TARJETA CON SOPORTE PARA EXCESO Y REPARTO FALTANTE */}
        <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 ${
          presupuestoExcedido 
            ? 'bg-theme-casa/10 border-theme-casa border-t-4 border-t-theme-casa animate-pulse' 
            : presupuestoFaltante
              ? 'bg-theme-trabajo/10 border-theme-trabajo/50 border-t-4 border-t-theme-trabajo'
              : 'bg-theme-bg border-theme-border'
        }`}>
          <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
            presupuestoExcedido ? 'text-theme-casa' : 'text-theme-trabajo'
          }`}>
            <Flame className={`w-3 h-3 ${presupuestoExcedido ? 'text-theme-casa' : 'text-theme-trabajo'}`} /> 
            {presupuestoExcedido ? '🚨 Presupuesto Excedido' : 'Caja de Seguridad Libre'}
          </span>
          <div className="mt-2">
            <div className={`text-xl font-black tabular-nums ${
              presupuestoExcedido || bolsaDisponibleFlujoLibre < 0 ? 'text-theme-casa' : 'text-theme-trabajo'
            }`}>
              ${bolsaDisponibleFlujoLibre.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <p className={`text-[8px] mt-1 uppercase font-bold tracking-tight ${
              presupuestoExcedido ? 'text-theme-casa/80' : presupuestoFaltante ? 'text-theme-trabajo/80' : 'text-theme-text/50'
            }`}>
              {presupuestoExcedido && 
                `Te excedes por: $${Math.abs(diferenciaPresupuesto).toFixed(2)} en presupuesto`
              }
              {presupuestoFaltante && 
                `Falta asignar: $${Math.abs(diferenciaPresupuesto).toFixed(2)} a presupuesto`
              }
              {!presupuestoExcedido && !presupuestoFaltante && 
                'Fondos netos ideales de supervivencia'
              }
            </p>
          </div>
        </div>

        {/* TOTAL REAL BÚNKER */}
        <div className="bg-theme-bg border border-theme-border rounded-xl p-4 flex flex-col justify-between border-l-4 border-l-theme-accent">
          <span className="text-[9px] font-black uppercase tracking-wider text-theme-accent">Total Búnker Real Bancos/Efectivo</span>
          <div className="mt-2 space-y-1">
            <div className="text-xl font-black text-theme-accent tabular-nums">
              ${efectivoFisicoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            <div className="pt-1.5 border-t border-theme-border/40 space-y-0.5 text-[9px] uppercase font-bold text-theme-text/70 max-h-[60px] overflow-y-auto custom-scrollbar">
              {listaMetodos
                .filter(metodo => (saldosCuentas[metodo] || 0) > 0)
                .map(metodo => (
                  <div key={metodo} className="flex justify-between">
                    <span className="text-theme-text/50 font-semibold truncate max-w-[110px]">{metodo}:</span>
                    <span className="text-theme-text font-mono">${(saldosCuentas[metodo] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* GRID SECCIONES TRASERAS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 space-y-4">
          <h3 className="text-sm font-black text-theme-text uppercase italic tracking-tighter">Métricas de Ritmo Quincenal</h3>
          <div className="bg-theme-bg border border-theme-border rounded-xl p-4 max-h-[600px] overflow-y-auto space-y-3 custom-scrollbar">
            {Object.keys(macroEstructura)
              .filter(macro => macroEstructura[macro].gastado > 0 || macroEstructura[macro].asignado > 0)
              .map(macro => {
                const item = macroEstructura[macro];
                const disponible = item.asignado - item.gastado;
                const porcentajeBarra = item.asignado > 0 ? (item.gastado / item.asignado) * 100 : 0;
                const estaAbierto = !!macrosAbiertas[macro];

                const sobregirado = disponible < 0;
                const gastoIdealProporcional = (item.asignado / 100) * progresoQuincena.pct;
                const vaAdelantadoAlDia = item.gastado > gastoIdealProporcional && (item.gastado - gastoIdealProporcional) > 40;

                /* let colorBarra = "bg-emerald-400"; */
                let colorBarra = "bg-theme-trabajo";
                let statusBadgeText = "Estable";
                let badgeStyle = "bg-theme-trabajo/10 text-theme-trabajo border-theme-trabajo/20";

                if (sobregirado) {
                  colorBarra = "bg-theme-casa";
                  statusBadgeText = "Sobregiro";
                  badgeStyle = "bg-theme-casa/20 text-theme-casa border-theme-casa/30";
                } else if (vaAdelantadoAlDia && periodoSeleccionado === obtenerQuincenaActualId()) {
                  /* colorBarra = "bg-orange-400"; */
                  colorBarra = "bg-theme-accent";
                  statusBadgeText = "Gasto Rápido";
                  badgeStyle = "bg-theme-accent/20 text-theme-accent border-theme-accent/30";
                } else if (porcentajeBarra > 85) {
                  /* colorBarra = "bg-amber-500"; */
                  colorBarra = "bg-theme-accent";
                  statusBadgeText = "Límite Crítico";
                  badgeStyle = "bg-theme-accent/20 text-theme-accent border-theme-accent/30";
                }

                const esMacroFiltrada = macroFiltroSeleccionado === macro;

                return (                  
                  <div 
                    key={macro} 
                    className={`rounded border overflow-hidden transition-all duration-200 bg-theme-bg ${
                      esMacroFiltrada 
                        ? 'border-theme-accent shadow-md' 
                        : sobregirado 
                          ? 'border-theme-casa/60' 
                          : 'border-theme-border'
                    }`}
                  > 
                    <div 
                      onClick={() => {
                        setMacroFiltroSeleccionado(macroFiltroSeleccionado === macro ? null : macro);
                        setPaginaActual(1);
                      }}
                      className="p-3 flex justify-between items-start select-none cursor-pointer hover:bg-theme-border/10"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-1.5">
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); toggleMacro(macro); }} 
                            className="p-1 hover:bg-theme-border/20 rounded cursor-pointer bg-transparent border-none"
                          >
                            {estaAbierto ? <ChevronDown className="w-3.5 h-3.5 text-theme-accent" /> : <ChevronRight className="w-3.5 h-3.5 text-theme-text/50" />}
                          </button>

                          <span className={`text-[10px] font-black uppercase tracking-tight transition-colors ${esMacroFiltrada ? 'text-theme-accent' : 'text-theme-text'}`}>
                            {macro}
                          </span>

                          <span className={`px-1.5 py-0.5 text-[7px] font-bold rounded-full border uppercase tracking-wider ${badgeStyle}`}>
                            {statusBadgeText}
                          </span>
                        </div>
                        <div className="text-[8px] font-bold text-theme-text/50 uppercase tracking-wider pl-7">Tope Q: ${item.asignado.toFixed(2)}</div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-xs font-black text-theme-text tabular-nums">${item.gastado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                        <div className={`text-[9px] uppercase tracking-tighter ${sobregirado ? 'text-theme-casa font-bold' : 'text-theme-text/50'}`}>
                          {sobregirado ? `Exceso: ` : `Disp: `}${Math.abs(disponible).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="px-3 pb-3">
                      <div className="w-full bg-theme-bg rounded-full h-1.5 overflow-hidden border border-theme-border/40">
                        <div className={`${colorBarra} h-full transition-all duration-500`} style={{ width: `${Math.min(porcentajeBarra, 100)}%` }}></div>
                      </div>
                    </div>

                    {estaAbierto && Object.keys(item.rubros).length > 0 && (
                      <div className="bg-theme-bg border-t border-theme-border/40 px-3 py-2 space-y-2 text-[9px] uppercase font-bold text-theme-text/70">
                        {Object.keys(item.rubros).map(sub => (
                          <div key={sub} className="flex justify-between items-center pl-4 border-l border-theme-border py-0.5">
                            <span>{sub}</span>
                            <span className="text-theme-text tabular-nums">${item.rubros[sub].toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <h3 className="text-sm font-black text-theme-text uppercase italic tracking-tighter">Huella de Transacciones de este Periodo</h3>
          <div className="bg-theme-bg shadow-2xl rounded-xl overflow-hidden border border-theme-border">
            <div className="overflow-x-auto">
              <div className="flex justify-between items-center bg-theme-bg border border-theme-border rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-wider">

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="text-theme-text/50 italic">Mostrando {transaccionesFiltradasYProcesadas.length > 0 ? indicePrimerItem + 1 : 0}-{Math.min(indiceUltimoItem, transaccionesFiltradasYProcesadas.length)} de {transaccionesFiltradasYProcesadas.length} registros</span>
                
                  {macroFiltroSeleccionado && (
                    <div className="flex items-center gap-1.5 bg-theme-accent/10 border border-theme-accent/30 text-theme-accent px-2 py-0.5 rounded-md text-[8px] font-black tracking-wide w-fit">
                      <span>FILTRADO POR: {macroFiltroSeleccionado}</span>
                      <button 
                        type="button" 
                        onClick={() => setMacroFiltroSeleccionado(null)} 
                        className="text-theme-accent hover:opacity-80 font-sans text-[10px] pl-1 font-bold cursor-pointer bg-transparent border-none"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-theme-text/60">Pág. <span className="text-theme-text tabular-nums">{paginaActual}</span> de <span className="text-theme-text tabular-nums">{totalPaginas}</span></span>
                  <div className="flex gap-1">
                    <button type="button" disabled={paginaActual === 1} onClick={() => setPaginaActual(prev => prev - 1)} className="bg-theme-bg hover:opacity-80 text-theme-text disabled:opacity-30 border border-theme-border px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer">&lt; Ant</button>
                    <button type="button" disabled={paginaActual === totalPaginas} onClick={() => setPaginaActual(prev => prev + 1)} className="bg-theme-bg hover:opacity-80 text-theme-text disabled:opacity-30 border border-theme-border px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer">Sig &gt;</button>
                  </div>
                </div>
              </div>

              <table className="w-full">
                <thead className="bg-theme-bg text-theme-text/60 text-[9px] uppercase tracking-widest font-black border-b border-theme-border">
                  <tr>
                    <th className="p-4 text-left">Detalle / Fecha</th>
                    <th className="p-4 text-left">Categoría Macro</th>
                    <th className="p-4 text-left">Sub-Rubro</th>
                    <th className="p-4 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/40 text-left">
                  {transaccionesPaginadas.length > 0 ? transaccionesPaginadas.map((t, idx) => {
                    const rubro = t.rubroFinal;
                    const macro = t.macroFinal;
                    const rubroUpper = rubro.toUpperCase();
                    const esDeuda = macro === "Deudas / Tarjetas";
                    // ANTERIOR: const esIngresoPuro = rubroUpper === "SUELDO" || rubroUpper === "SOBRANTE";
                    // AGREGADO: Se incluye REGALO como un ingreso puro
                    const esIngresoPuro = rubroUpper === "SUELDO" || rubroUpper === "SOBRANTE" || rubroUpper === "REGALO";

                    return (
                      <tr key={idx} className="hover:bg-theme-border/10 transition-colors">
                        <td className="p-4">
                          <div className="text-xs font-black text-theme-text uppercase tracking-tight leading-tight">{t.Descripción || t.descripcion}</div>
                          <div className="text-[8px] font-bold text-theme-text/40 font-mono mt-0.5">{t.Fecha || t.fecha}</div>
                        </td>
                        <td className="p-4 text-transform: uppercase text-[10px] font-black text-theme-text/80 tracking-tight">{esIngresoPuro ? "INGRESOS" : macro}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase bg-theme-bg border border-theme-border italic ${esIngresoPuro ? 'text-theme-trabajo border-theme-trabajo/30' : esDeuda ? 'text-theme-accent' : 'text-theme-casa'}`}>{rubro}</span>
                        </td>
                        <td className={`p-4 text-right text-xs font-black tabular-nums ${esIngresoPuro ? 'text-theme-trabajo' : esDeuda ? 'text-theme-accent' : 'text-theme-casa'}`}>
                          {esIngresoPuro ? '+$' : esDeuda ? '-$' : '-$'}{t.montoAbsoluto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="4" className="p-10 text-center text-theme-text/40 font-bold uppercase text-xs">Cero registros vinculados en esta quincena</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL REGISTRO */}
      {modalRegistro && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-left border border-theme-border border-t-4 border-t-theme-accent">
            <div className="bg-theme-bg p-4 text-theme-text font-black uppercase text-[10px] tracking-widest flex justify-between border-b border-theme-border">
              Inyectar Registro Financiero
              <button onClick={() => setModalRegistro(false)} className="cursor-pointer text-theme-text/50 hover:text-theme-text"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={ejecutarGuardar} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1.5">Naturaleza del Flujo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, tipo: 'GASTO', rubro: listadoRubros[0] || "", descripcion: "" }))}
                    className={`py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${form.tipo === 'GASTO' ? 'bg-theme-casa/10 text-theme-casa border-theme-casa' : 'bg-theme-bg text-theme-text/50 border-theme-border'}`}
                  >
                    🔴 Gasto Corriente
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, tipo: 'INGRESO', rubro: 'SUELDO', descripcion: 'NÓMINA QUINCENAL' }))}
                    className={`py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${form.tipo === 'INGRESO' ? 'bg-theme-trabajo/10 text-theme-trabajo border-theme-trabajo' : 'bg-theme-bg text-theme-text/50 border-theme-border'}`}
                  >
                    🟢 Ingreso Liquido
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Concepto / Descripción</label>
                <input type="text" required placeholder="Ej. SUPER DE LA SEMANA" value={form.descripcion} onChange={(e) => setForm(prev => ({...prev, descripcion: e.target.value}))} className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent" />
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Importe ($)</label>
                <input type="number" step="0.01" required placeholder="0.00" value={form.importe} onChange={(e) => setForm(prev => ({...prev, importe: e.target.value}))} className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent tabular-nums" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Sub-Rubro</label>
                  {form.tipo === 'INGRESO' ? (
                    <select 
                      value={form.rubro} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(prev => ({
                          ...prev, 
                          rubro: val, 
                          // ANTERIOR: descripcion: val === "SOBRANTE" ? "SOBRANTE PERIODO ANTERIOR" : "NÓMINA QUINCENAL"
                          // AGREGADO: Se agrega el autocompletado por defecto para REGALO
                          descripcion: val === "SOBRANTE" ? "SOBRANTE PERIODO ANTERIOR" : val === "REGALO" ? "REGALO RECIBIDO" : "NÓMINA QUINCENAL"
                        }));
                      }}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-[11px] font-black text-theme-trabajo uppercase outline-none cursor-pointer"
                    >
                      <option value="SUELDO">💼 SUELDO</option>
                      <option value="SOBRANTE">📦 SOBRANTE</option>
                      {/* AGREGADO: Opción para guardar con la cadena explícita 'REGALO' en la columna rubro */}
                      <option value="REGALO">🎁 REGALO</option>
                    </select>
                  ) : (
                    <select value={form.rubro} onChange={(e) => setForm(prev => ({...prev, rubro: e.target.value}))} className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-[11px] font-bold text-theme-text uppercase outline-none focus:border-theme-accent cursor-pointer">
                      {listadoRubros.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Canal de Destino/Origen</label>
                  <select value={form.metodo_pago} onChange={(e) => setForm(prev => ({...prev, metodo_pago: e.target.value}))} className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-[11px] font-bold text-theme-text uppercase outline-none focus:border-theme-accent cursor-pointer">
                    {listaMetodos.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={guardando} className="w-full bg-theme-accent hover:opacity-90 text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50 transition-all mt-2">
                {guardando ? 'Sincronizando con Google Sheets...' : 'Ejecutar Transacción'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AJUSTAR SALDOS */}
      {modalSaldos && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left border border-theme-border border-t-4 border-t-theme-accent">
            <div className="bg-theme-bg p-4 text-theme-text font-black uppercase text-[10px] tracking-widest flex justify-between border-b border-theme-border">
              Corte y Liquidación de Saldos
              <button onClick={() => setModalSaldos(false)} className="cursor-pointer text-theme-text/50 hover:text-theme-text"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={ejecutarActualizarSaldos} className="p-6 space-y-4 max-h-[450px] overflow-y-auto custom-scrollbar">
              <p className="text-[9px] font-bold text-theme-text/50 uppercase tracking-wider mb-2">Modifica los fondos corrientes de tu columna C de la hoja:</p>
              
              <div className="space-y-3">
                {Object.keys(saldosCuentas).map(metodo => (
                  <div key={metodo} className="flex justify-between items-center bg-theme-bg p-2 rounded-lg border border-theme-border">
                    <label className="text-[10px] font-black uppercase text-theme-text/60 tracking-tight">{metodo}</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={saldosCuentas[metodo]} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSaldosCuentas(prev => ({ ...prev, [metodo]: val }));
                      }} 
                      className="w-28 bg-theme-bg border border-theme-border rounded p-1 text-right text-xs font-bold text-theme-text outline-none focus:border-theme-accent tabular-nums" 
                    />
                  </div>
                ))}
              </div>

              <button type="submit" disabled={guardando} className="w-full bg-theme-accent hover:opacity-90 text-theme-bg py-2.5 rounded-lg text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50 transition-all mt-4">
                {guardando ? 'Sincronizando Montos en google...' : 'Actualizar montos'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}