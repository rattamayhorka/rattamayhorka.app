import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { 
  X, Plus, CreditCard, ChevronDown, ChevronRight, AlertTriangle, 
  ShieldCheck, Flame, Wallet, CheckCircle2, Settings, Trash2, TableProperties, Save,
  ArrowRightLeft // 🟢 NUEVO: Icono para traspasos entre cuentas
} from 'lucide-react';

export default function Finanzas({ refreshTrigger }) {
  const [transacciones, setTransacciones] = useState([]);
  const [presupuestosBase, setPresupuestosBase] = useState([]);
  const [mapaRubrosAMacro, setMapaRubrosAMacro] = useState({}); 
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalRegistro, setModalRegistro] = useState(false);
  
  // 💸 CONTROL DE SALDOS Y MÉTODOS
  const [modalSaldos, setModalSaldos] = useState(false);
  const [modalSettingsTabla, setModalSettingsTabla] = useState(false);
  const [tabSettings, setTabSettings] = useState('macros'); // 'macros' | 'cuentas' | 'mapeo'

  // ==========================================
  // 🟢 NUEVO: Estado para Traspaso entre Cuentas
  const [modalTraspaso, setModalTraspaso] = useState(false);
  const [formTraspaso, setFormTraspaso] = useState({
    cuentaOrigen: '',
    cuentaDestino: '',
    monto: ''
  });
  // ==========================================

  const [saldosCuentas, setSaldosCuentas] = useState({}); 
  const [listaMetodos, setListaMetodos] = useState([]);  

  // 📝 ESTADOS LOCALES PARA LA TABLA EDITABLE EN SETTINGS
  const [editCategorias, setEditCategorias] = useState([]);
  const [editCuentas, setEditCuentas] = useState([]);
  const [editMapeo, setEditMapeo] = useState([]);

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
  //  📡 INGESTIÓN DE DATA DESDE SUPABASE
  // =========================================================================
  const cargarDatos = async (silencioso = false) => {
    try {
      if (!silencioso) setCargando(true);

      const [resTransacciones, resCuentas, resCategorias, resMapeo] = await Promise.all([
        supabase.from('transacciones').select('*').order('id', { ascending: false }),
        supabase.from('cuentas_bancarias').select('*').order('id', { ascending: true }),
        supabase.from('categorias_presupuesto').select('*').order('id', { ascending: true }),
        supabase.from('mapeo_rubros').select('*').order('id', { ascending: true })
      ]);

      const dataTransacciones = (resTransacciones.data || []).map(row => ({
        id: row.id,
        Fecha: row.fecha,
        Importe: row.importe,
        Descripción: row.descripcion,
        'Metodo de pago': row.metodo_pago,
        Rubro: row.rubro
      }));

      const rawCuentas = resCuentas.data || [];
      const rawCategorias = resCategorias.data || [];
      const rawMapeo = resMapeo.data || [];

      setEditCategorias(rawCategorias);
      setEditCuentas(rawCuentas);
      setEditMapeo(rawMapeo);

      if (Array.isArray(dataTransacciones)) setTransacciones(dataTransacciones);
      
      const mapaSaldosDetectados = {};
      const metodosDetectados = [];
      rawCuentas.forEach(cuenta => {
        if (cuenta.nombre && cuenta.nombre.trim() !== '') {
          const nombreMetodo = cuenta.nombre.trim();
          const saldo = parseFloat(cuenta.saldo_actual) || 0;
          mapaSaldosDetectados[nombreMetodo] = saldo;
          metodosDetectados.push(nombreMetodo);
        }
      });

      setSaldosCuentas(mapaSaldosDetectados);
      if (metodosDetectados.length > 0) {
        setListaMetodos(metodosDetectados);
        const primerMetodoConSaldo = metodosDetectados.find(m => (mapaSaldosDetectados[m] || 0) > 0) || metodosDetectados[0];
        setForm(prev => ({ ...prev, metodo_pago: prev.metodo_pago || primerMetodoConSaldo }));
        
        // 🟢 NUEVO: Precargar cuentas por defecto para Traspaso
        setFormTraspaso(prev => ({
          cuentaOrigen: prev.cuentaOrigen || metodosDetectados[0],
          cuentaDestino: prev.cuentaDestino || (metodosDetectados[1] || metodosDetectados[0]),
          monto: prev.monto || ''
        }));
      }

      const presupuestosAdaptados = rawCategorias.map(cat => ({
        Categoria_Macro: cat.categoria_macro?.trim() || '',
        Asignacion_Quincenal: parseFloat(cat.asignacion_quincenal) || 0
      }));
      setPresupuestosBase(presupuestosAdaptados);

      const mapaConstruido = {};
      rawMapeo.forEach(m => {
        if (m.sub_rubro && m.categoria_macro) {
          mapaConstruido[m.sub_rubro.trim()] = m.categoria_macro.trim();
        }
      });
      setMapaRubrosAMacro(mapaConstruido);

      const rubrosDisponibles = Object.keys(mapaConstruido);
      if (rubrosDisponibles.length > 0) {
        setForm(prev => ({ ...prev, rubro: prev.rubro || rubrosDisponibles[0] }));
      }
    } catch (error) {
      console.error("Error al sincronizar con Supabase:", error);
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
      metodo_pago: form.metodo_pago || (listaMetodos[0] || 'Efectivo'),
      rubro: form.rubro || (listadoRubros[0] || 'Varios')
    };

    setTransacciones(prev => [
      {
        Fecha: payload.fecha,
        Importe: payload.importe,
        Descripción: payload.descripcion,
        'Metodo de pago': payload.metodo_pago,
        Rubro: payload.rubro
      },
      ...prev
    ]);
    setModalRegistro(false);
    setPaginaActual(1);
    
    try {
      const { error } = await supabase.from('transacciones').insert([payload]);
      if (error) throw error;
    } catch (err) {
      console.error('Error al guardar transacción en Supabase:', err);
    }

    setForm(prev => ({ ...prev, importe: "", descripcion: "", tipo: "GASTO" }));
    setGuardando(false);
    cargarDatos(false);
  };

  // ==========================================
  // 🟢 NUEVO: EJECUTAR TRASPASO ENTRE CUENTAS
  // ==========================================
  const ejecutarTraspaso = async (e) => {
    e.preventDefault();
    const montoNum = parseFloat(formTraspaso.monto);
    if (!montoNum || montoNum <= 0) return alert("Ingresa un monto válido");
    if (formTraspaso.cuentaOrigen === formTraspaso.cuentaDestino) return alert("Elige cuentas distintas para el traspaso");

    setGuardando(true);
    const fechaHoy = new Date().toLocaleDateString('es-MX');

    // 1. Dos transacciones espejo: salida (+) y entrada (-)
    const registrosTraspaso = [
      {
        fecha: fechaHoy,
        importe: montoNum, // Salida de origen
        descripcion: `[TRASPASO SALIDA] -> ${formTraspaso.cuentaDestino.toUpperCase()}`,
        metodo_pago: formTraspaso.cuentaOrigen,
        rubro: 'TRASPASO'
      },
      {
        fecha: fechaHoy,
        importe: -montoNum, // Entrada a destino
        descripcion: `[TRASPASO ENTRADA] <- ${formTraspaso.cuentaOrigen.toUpperCase()}`,
        metodo_pago: formTraspaso.cuentaDestino,
        rubro: 'TRASPASO'
      }
    ];

    // 2. Nuevos saldos actualizados
    const saldoOrigenActual = saldosCuentas[formTraspaso.cuentaOrigen] || 0;
    const saldoDestinoActual = saldosCuentas[formTraspaso.cuentaDestino] || 0;
    const nuevoSaldoOrigen = saldoOrigenActual - montoNum;
    const nuevoSaldoDestino = saldoDestinoActual + montoNum;

    try {
      // Insertar transacciones
      const { error: errTrans } = await supabase.from('transacciones').insert(registrosTraspaso);
      if (errTrans) throw errTrans;

      // Actualizar cuentas bancarias en Supabase
      //await Promise.all([
      //  supabase.from('cuentas_bancarias').update({ saldo_actual: nuevoSaldoOrigen }).eq('nombre', formTraspaso.cuentaOrigen),
      //  supabase.from('cuentas_bancarias').update({ saldo_actual: nuevoSaldoDestino }).eq('nombre', formTraspaso.cuentaDestino)
      //]);

      setModalTraspaso(false);
      setFormTraspaso(prev => ({ ...prev, monto: '' }));
      await cargarDatos(false);
    } catch (err) {
      console.error("Error al ejecutar traspaso:", err);
      alert("Ocurrió un error al procesar el traspaso");
    } finally {
      setGuardando(false);
    }
  };

  const ejecutarActualizarSaldos = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const promesas = Object.entries(saldosCuentas).map(([metodo, nuevoSaldo]) =>
        supabase
          .from('cuentas_bancarias')
          .update({ saldo_actual: nuevoSaldo })
          .eq('nombre', metodo)
      );
      await Promise.all(promesas);
    } catch (err) {
      console.error('Error al actualizar saldos en Supabase:', err);
    }

    setModalSaldos(false);
    setGuardando(false);
    cargarDatos(false);
  };

  // -------------------------------------------------------------
  // ⚙️ CONTROLADORES DEL EDITOR DE TABLAS (GRID SETTINGS)
  // -------------------------------------------------------------
  const agregarFilaCategoria = () => {
    setEditCategorias(prev => [...prev, { categoria_macro: 'Nueva Categoría', asignacion_quincenal: 0, _esNuevo: true }]);
  };

  const agregarFilaCuenta = () => {
    setEditCuentas(prev => [...prev, { nombre: 'Nueva Cuenta', saldo_actual: 0, _esNuevo: true }]);
  };

  const agregarFilaMapeo = () => {
    const primeraMacro = editCategorias[0]?.categoria_macro || 'Facturas / Vivienda';
    setEditMapeo(prev => [...prev, { sub_rubro: 'Nuevo Subrubro', categoria_macro: primeraMacro, _esNuevo: true }]);
  };

  const guardarTodoSettingsTabla = async () => {
    setGuardando(true);
    try {
      await supabase.from('categorias_presupuesto').delete().neq('id', 0);
      const categoriasLimpias = editCategorias
        .filter(c => c.categoria_macro?.trim())
        .map(c => ({
          categoria_macro: c.categoria_macro.trim(),
          asignacion_quincenal: parseFloat(c.asignacion_quincenal) || 0
        }));
      if (categoriasLimpias.length > 0) {
        await supabase.from('categorias_presupuesto').insert(categoriasLimpias);
      }

      await supabase.from('cuentas_bancarias').delete().neq('id', 0);
      const cuentasLimpias = editCuentas
        .filter(c => c.nombre?.trim())
        .map(c => ({
          nombre: c.nombre.trim(),
          saldo_actual: parseFloat(c.saldo_actual) || 0
        }));
      if (cuentasLimpias.length > 0) {
        await supabase.from('cuentas_bancarias').insert(cuentasLimpias);
      }

      await supabase.from('mapeo_rubros').delete().neq('id', 0);
      const mapeosLimpios = editMapeo
        .filter(m => m.sub_rubro?.trim() && m.categoria_macro?.trim())
        .map(m => ({
          sub_rubro: m.sub_rubro.trim(),
          categoria_macro: m.categoria_macro.trim()
        }));
      if (mapeosLimpios.length > 0) {
        await supabase.from('mapeo_rubros').insert(mapeosLimpios);
      }

      setModalSettingsTabla(false);
      await cargarDatos(false);
    } catch (err) {
      console.error("Error al guardar tablas de presupuesto en Supabase:", err);
    } finally {
      setGuardando(false);
    }
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
  let ingresosRegalo = 0;
  let presupuestoGlobalEstatico = 0;
  let totalDeudaMitigada = 0;
  let compromisosCriticosAsignados = 0;
  let compromisosCriticosGastados = 0;

  const gastosPorMetodo = {};
  const macroEstructura = {};
  const macrosObligatorias = ["Facturas / Vivienda", "Servicios / Internet", "Educacion"];

  presupuestosBase.forEach(p => {
    const lim = parseFloat(p.Asignacion_Quincenal?.toString().replace(/[$,\s]/g, '')) || 0;
    const macroNombre = p.Categoria_Macro;
    
    if (macroNombre && !macroNombre.includes("Saldo_Actual")) {
      macroEstructura[macroNombre] = { asignado: lim, gastado: 0, rubros: {} };
      presupuestoGlobalEstatico += lim;
      if (macrosObligatorias.includes(macroNombre)) compromisosCriticosAsignados += lim;
    }
  });

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

  transaccionesFiltradasYProcesadas.forEach(t => {
    const rubroUpper = t.rubroFinal.toUpperCase();
    
    if (rubroUpper === "TRASPASO") return; 

    if (rubroUpper === "SUELDO") {
      ingresosSueldo += t.montoAbsoluto;
      return; 
    }
    if (rubroUpper === "SOBRANTE") {
      ingresosSobrante += t.montoAbsoluto;
      return;
    }
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

  const diferenciaPresupuesto = presupuestoGlobalEstatico - ingresosTotalesFlujo;
  const presupuestoExcedido = ingresosTotalesFlujo > 0 && diferenciaPresupuesto > 1.00;
  const presupuestoFaltante = ingresosTotalesFlujo > 0 && diferenciaPresupuesto < -1.00;

  const ingresosPorMetodo = {};
  
  transaccionesFiltradasYProcesadas.forEach(t => {
    const rubroUpper = t.rubroFinal.toUpperCase();
    const metodo = t['Metodo de pago'] || t.metodo_pago || "Efectivo";
   
    if (rubroUpper === "SUELDO" || rubroUpper === "SOBRANTE" || rubroUpper === "REGALO") {
      ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] || 0) + t.montoAbsoluto;
    }

    if (rubroUpper === "TRASPASO") {
      if (t.importe < 0 || (typeof t.Importe === 'string' && t.Importe.includes('('))) {
        ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] || 0) + t.montoAbsoluto;
      } else {
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
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* BOTÓN DE CONFIGURACIÓN EN TABLAS EDITABLES */}
          <button 
            onClick={() => setModalSettingsTabla(true)} 
            className="bg-theme-bg hover:opacity-80 text-theme-text/70 border border-theme-border px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center transition-all cursor-pointer"
            title="Editar Tablas de Presupuestos, Cuentas y Mapeo"
          >
            <TableProperties className="w-3.5 h-3.5 mr-1.5 text-theme-accent" /> Tablas Presupuesto
          </button>

          {/* 🟢 NUEVO BOTÓN: MOVER DINERO (TRASPASO) */}
          <button 
            onClick={() => setModalTraspaso(true)} 
            className="bg-theme-bg hover:opacity-80 text-theme-accent border border-theme-border px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center transition-all cursor-pointer"
            title="Transferir fondos entre cuentas/canales"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 mr-1.5 text-theme-accent" /> Mover Dinero
          </button>

          <button 
            onClick={() => setModalSaldos(true)} 
            className="bg-theme-bg hover:opacity-80 text-theme-text/70 border border-theme-border px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center transition-all cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 mr-1.5 text-theme-text/50" /> Ajustar Saldos
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

        {/* TARJETA PRESUPUESTO / CAJA LIBRE */}
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

                let colorBarra = "bg-theme-trabajo";
                let statusBadgeText = "Estable";
                let badgeStyle = "bg-theme-trabajo/10 text-theme-trabajo border-theme-trabajo/20";

                if (sobregirado) {
                  colorBarra = "bg-theme-casa";
                  statusBadgeText = "Sobregiro";
                  badgeStyle = "bg-theme-casa/20 text-theme-casa border-theme-casa/30";
                } else if (vaAdelantadoAlDia && periodoSeleccionado === obtenerQuincenaActualId()) {
                  colorBarra = "bg-theme-accent";
                  statusBadgeText = "Gasto Rápido";
                  badgeStyle = "bg-theme-accent/20 text-theme-accent border-theme-accent/30";
                } else if (porcentajeBarra > 85) {
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
                    const esIngresoPuro = rubroUpper === "SUELDO" || rubroUpper === "SOBRANTE" || rubroUpper === "REGALO";
                    const esTraspaso = rubroUpper === "TRASPASO";

                    return (
                      <tr key={idx} className="hover:bg-theme-border/10 transition-colors">
                        <td className="p-4">
                          <div className="text-xs font-black text-theme-text uppercase tracking-tight leading-tight">{t.Descripción || t.descripcion}</div>
                          <div className="text-[8px] font-bold text-theme-text/40 font-mono mt-0.5 flex gap-2 items-center">
                            <span>{t.Fecha || t.fecha}</span>
                            <span className="text-theme-text/60 font-semibold">• {t['Metodo de pago'] || t.metodo_pago}</span>
                          </div>
                        </td>
                        <td className="p-4 text-transform: uppercase text-[10px] font-black text-theme-text/80 tracking-tight">
                          {esTraspaso ? "TRASPASO" : esIngresoPuro ? "INGRESOS" : macro}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase bg-theme-bg border border-theme-border italic ${
                            esTraspaso ? 'text-theme-accent border-theme-accent/40' :
                            esIngresoPuro ? 'text-theme-trabajo border-theme-trabajo/30' : 
                            esDeuda ? 'text-theme-accent' : 'text-theme-casa'
                          }`}>
                            {rubro}
                          </span>
                        </td>
                        <td className={`p-4 text-right text-xs font-black tabular-nums ${
                          esTraspaso ? 'text-theme-accent' :
                          esIngresoPuro ? 'text-theme-trabajo' : 
                          esDeuda ? 'text-theme-accent' : 'text-theme-casa'
                        }`}>
                          {esIngresoPuro ? '+$' : esTraspaso ? (t.Importe < 0 ? '+$' : '-$') : '-$'}
                          {t.montoAbsoluto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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

      {/* ========================================================================= */}
      {/* 🟢 NUEVO MODAL: TRANSFERENCIA / MOVER DINERO ENTRE CUENTAS */}
      {/* ========================================================================= */}
      {modalTraspaso && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-left border border-theme-border border-t-4 border-t-theme-accent">
            <div className="bg-theme-bg p-4 text-theme-text font-black uppercase text-[10px] tracking-widest flex justify-between border-b border-theme-border">
              <span className="flex items-center gap-1.5 text-theme-accent">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transferencia entre Cuentas
              </span>
              <button onClick={() => setModalTraspaso(false)} className="cursor-pointer text-theme-text/50 hover:text-theme-text">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={ejecutarTraspaso} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1">Monto a Mover ($)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  placeholder="0.00" 
                  value={formTraspaso.monto} 
                  onChange={(e) => setFormTraspaso(prev => ({ ...prev, monto: e.target.value }))} 
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-sm font-bold text-theme-accent outline-none focus:border-theme-accent tabular-nums" 
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-casa mb-1">Cuenta Origen (Sale Dinero)</label>
                <select 
                  value={formTraspaso.cuentaOrigen} 
                  onChange={(e) => setFormTraspaso(prev => ({ ...prev, cuentaOrigen: e.target.value }))} 
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-[11px] font-bold text-theme-text uppercase outline-none focus:border-theme-accent cursor-pointer"
                >
                  {listaMetodos.map(m => (
                    <option key={m} value={m}>
                      {m} (${(saldosCuentas[m] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-center my-1">
                <div className="bg-theme-border/20 p-1.5 rounded-full border border-theme-border/40">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-theme-accent" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-theme-trabajo mb-1">Cuenta Destino (Entra Dinero)</label>
                <select 
                  value={formTraspaso.cuentaDestino} 
                  onChange={(e) => setFormTraspaso(prev => ({ ...prev, cuentaDestino: e.target.value }))} 
                  className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-[11px] font-bold text-theme-text uppercase outline-none focus:border-theme-accent cursor-pointer"
                >
                  {listaMetodos.map(m => (
                    <option key={m} value={m}>
                      {m} (${(saldosCuentas[m] || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={guardando} 
                  className="w-full bg-theme-accent hover:opacity-90 text-theme-bg py-3 rounded-lg text-[10px] font-black uppercase shadow-lg cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  {guardando ? 'Procesando Traspaso...' : 'Ejecutar Traspaso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REGISTRO DE MOVIMIENTO */}
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
                          descripcion: val === "SOBRANTE" ? "SOBRANTE PERIODO ANTERIOR" : val === "REGALO" ? "REGALO RECIBIDO" : "NÓMINA QUINCENAL"
                        }));
                      }}
                      className="w-full bg-theme-bg border border-theme-border rounded-lg p-2.5 text-[11px] font-black text-theme-trabajo uppercase outline-none cursor-pointer"
                    >
                      <option value="SUELDO">💼 SUELDO</option>
                      <option value="SOBRANTE">📦 SOBRANTE</option>
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
                {guardando ? 'Sincronizando con Supabase...' : 'Ejecutar Transacción'}
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
              <p className="text-[9px] font-bold text-theme-text/50 uppercase tracking-wider mb-2">Modifica los fondos corrientes de tus canales:</p>
              
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
                {guardando ? 'Sincronizando Montos en Supabase...' : 'Actualizar montos'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITOR DE TABLAS DINÁMICAS (GRID COMPLETO) */}
      {modalSettingsTabla && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[85] flex items-center justify-center p-4">
          <div className="bg-theme-bg rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden text-left border border-theme-border flex flex-col max-h-[92vh]">
            
            {/* Header Modal */}
            <div className="bg-theme-bg p-4 border-b border-theme-border flex justify-between items-center">
              <div className="flex items-center gap-2 text-theme-accent font-black text-xs uppercase tracking-wider">
                <TableProperties className="w-4 h-4" /> Configuración de Presupuesto en Tablas
              </div>
              <button onClick={() => setModalSettingsTabla(false)} className="cursor-pointer text-theme-text/50 hover:text-theme-text">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selector de Pestañas */}
            <div className="flex border-b border-theme-border/60 bg-theme-border/5 px-4 pt-2 gap-2 text-[10px] font-black uppercase">
              <button
                onClick={() => setTabSettings('macros')}
                className={`px-4 py-2 rounded-t-lg transition-colors cursor-pointer ${
                  tabSettings === 'macros'
                    ? 'bg-theme-bg border-t border-x border-theme-border text-theme-accent'
                    : 'text-theme-text/50 hover:text-theme-text'
                }`}
              >
                1. Categorías Macro & Topes (Cols A-B)
              </button>
              <button
                onClick={() => setTabSettings('cuentas')}
                className={`px-4 py-2 rounded-t-lg transition-colors cursor-pointer ${
                  tabSettings === 'cuentas'
                    ? 'bg-theme-bg border-t border-x border-theme-border text-theme-accent'
                    : 'text-theme-text/50 hover:text-theme-text'
                }`}
              >
                2. Canales & Cuentas (Cols C-D)
              </button>
              <button
                onClick={() => setTabSettings('mapeo')}
                className={`px-4 py-2 rounded-t-lg transition-colors cursor-pointer ${
                  tabSettings === 'mapeo'
                    ? 'bg-theme-bg border-t border-x border-theme-border text-theme-accent'
                    : 'text-theme-text/50 hover:text-theme-text'
                }`}
              >
                3. Sub-Rubros Mapeados (Cols E-F)
              </button>
            </div>

            {/* Contenido de Tablas */}
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              
              {/* TAB 1: CATEGORÍAS MACRO */}
              {tabSettings === 'macros' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-theme-text/60 uppercase">
                      Define los nombres de categoría macro y su tope quincenal asignado.
                    </span>
                    <button
                      onClick={agregarFilaCategoria}
                      className="bg-theme-accent/10 border border-theme-accent/30 text-theme-accent hover:bg-theme-accent hover:text-theme-bg px-2.5 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Agregar Fila
                    </button>
                  </div>

                  <div className="border border-theme-border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-theme-border/10 text-theme-text/60 text-[9px] uppercase font-bold border-b border-theme-border">
                        <tr>
                          <th className="p-2.5 w-1/2">Categoria_Macro (Col A)</th>
                          <th className="p-2.5 w-1/3">Asignacion_Quincenal (Col B)</th>
                          <th className="p-2.5 text-center w-16">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border/40 text-xs">
                        {editCategorias.map((item, idx) => (
                          <tr key={idx} className="hover:bg-theme-border/5">
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.categoria_macro || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditCategorias(prev => prev.map((c, i) => i === idx ? { ...c, categoria_macro: val } : c));
                                }}
                                className="w-full bg-theme-bg border border-theme-border/60 rounded px-2 py-1 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={item.asignacion_quincenal ?? 0}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditCategorias(prev => prev.map((c, i) => i === idx ? { ...c, asignacion_quincenal: val } : c));
                                }}
                                className="w-full bg-theme-bg border border-theme-border/60 rounded px-2 py-1 text-xs font-bold text-theme-text outline-none focus:border-theme-accent tabular-nums"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => setEditCategorias(prev => prev.filter((_, i) => i !== idx))}
                                className="text-theme-text/40 hover:text-theme-casa cursor-pointer p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: CUENTAS Y MÉTODOS */}
              {tabSettings === 'cuentas' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-theme-text/60 uppercase">
                      Canales y métodos de pago donde guardas fondos corrientes.
                    </span>
                    <button
                      onClick={agregarFilaCuenta}
                      className="bg-theme-accent/10 border border-theme-accent/30 text-theme-accent hover:bg-theme-accent hover:text-theme-bg px-2.5 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Agregar Cuenta
                    </button>
                  </div>

                  <div className="border border-theme-border rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-theme-border/10 text-theme-text/60 text-[9px] uppercase font-bold border-b border-theme-border">
                        <tr>
                          <th className="p-2.5 w-1/2">Metodos_Pago (Col C)</th>
                          <th className="p-2.5 w-1/3">Saldo_Actual (Col D)</th>
                          <th className="p-2.5 text-center w-16">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border/40 text-xs">
                        {editCuentas.map((item, idx) => (
                          <tr key={idx} className="hover:bg-theme-border/5">
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.nombre || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditCuentas(prev => prev.map((c, i) => i === idx ? { ...c, nombre: val } : c));
                                }}
                                className="w-full bg-theme-bg border border-theme-border/60 rounded px-2 py-1 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="0.01"
                                value={item.saldo_actual ?? 0}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditCuentas(prev => prev.map((c, i) => i === idx ? { ...c, saldo_actual: val } : c));
                                }}
                                className="w-full bg-theme-bg border border-theme-border/60 rounded px-2 py-1 text-xs font-bold text-theme-text outline-none focus:border-theme-accent tabular-nums"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => setEditCuentas(prev => prev.filter((_, i) => i !== idx))}
                                className="text-theme-text/40 hover:text-theme-casa cursor-pointer p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: MAPEO SUB-RUBROS */}
              {tabSettings === 'mapeo' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-theme-text/60 uppercase">
                      Vincula cada Sub-Rubro específico a su Categoría Macro correspondiente.
                    </span>
                    <button
                      onClick={agregarFilaMapeo}
                      className="bg-theme-accent/10 border border-theme-accent/30 text-theme-accent hover:bg-theme-accent hover:text-theme-bg px-2.5 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" /> Agregar Sub-Rubro
                    </button>
                  </div>

                  <div className="border border-theme-border rounded-xl overflow-hidden max-h-[420px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-theme-border/10 text-theme-text/60 text-[9px] uppercase font-bold border-b border-theme-border sticky top-0 bg-theme-bg">
                        <tr>
                          <th className="p-2.5 w-1/2">Sub_Rubro (Col E)</th>
                          <th className="p-2.5 w-1/3">Categorias_Macro (Col F)</th>
                          <th className="p-2.5 text-center w-16">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-theme-border/40 text-xs">
                        {editMapeo.map((item, idx) => (
                          <tr key={idx} className="hover:bg-theme-border/5">
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.sub_rubro || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditMapeo(prev => prev.map((m, i) => i === idx ? { ...m, sub_rubro: val } : m));
                                }}
                                className="w-full bg-theme-bg border border-theme-border/60 rounded px-2 py-1 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent"
                              />
                            </td>
                            <td className="p-2">
                              <select
                                value={item.categoria_macro || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditMapeo(prev => prev.map((m, i) => i === idx ? { ...m, categoria_macro: val } : m));
                                }}
                                className="w-full bg-theme-bg border border-theme-border/60 rounded px-2 py-1 text-xs font-bold text-theme-text uppercase outline-none focus:border-theme-accent cursor-pointer"
                              >
                                {editCategorias.map((cat, i) => (
                                  <option key={i} value={cat.categoria_macro}>{cat.categoria_macro}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => setEditMapeo(prev => prev.filter((_, i) => i !== idx))}
                                className="text-theme-text/40 hover:text-theme-casa cursor-pointer p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Modal con Botón de Guardado */}
            <div className="p-3 border-t border-theme-border bg-theme-border/5 flex justify-between items-center">
              <span className="text-[9px] text-theme-text/50 font-bold uppercase">
                * Los cambios afectarán métricas y selects inmediatamente.
              </span>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setModalSettingsTabla(false)} 
                  className="px-4 py-2 text-[10px] font-black uppercase text-theme-text/60 hover:text-theme-text cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  disabled={guardando} 
                  onClick={guardarTodoSettingsTabla} 
                  className="bg-theme-accent hover:opacity-90 text-theme-bg px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}