import { useState, useEffect } from 'react';
import Kanban from './components/Kanban';
import Bullet from './components/Bullet';
import Prompts from './components/Prompts';
import Compromisos from './components/CompromisosHST';
import Compras from './components/Compras';
import FutureLogHST from './components/FutureLogHST';
import RegistroRapido from './components/RegistroRapido';
import GestionProyectos from './components/GestionProyectos';
import GastosCasa from './components/GastosCasa';
import Deudas from './components/Deudas';
import { database } from './api';

import {
  Lock,
  LogOut,
  Columns3,
  Wrench,
  Activity,
  FileText,
  ShoppingCart,
  Calendar,
  Home,
  Map,
  DollarSign,
  Database,
  KeyRound,
  Send,
  CreditCard,
  Terminal,
  X,
  ArrowRight,
  Zap,
  DollarSign as IconGasto,
  Calendar as IconEvent,
  HelpCircle,
  Bot,
  Palette
} from 'lucide-react';

const LISTA_TEMAS = [
  { id: 'dracula', nombre: 'Dracula' },
  { id: 'tokyo', nombre: 'Tokyo Night' },
  { id: 'monokai', nombre: 'Monokai Pro' },
  { id: 'onedark', nombre: 'One Dark Pro' },
  { id: 'synthwave', nombre: 'Cyberpunk' },
  { id: 'nord', nombre: 'Nord Dark' },
  { id: 'catppuccin', nombre: 'Catppuccin' },
  { id: 'gruvbox', nombre: 'Gruvbox' },
  { id: 'rose-pine', nombre: 'Rosé Pine' },
  { id: 'solarized', nombre: 'Solarized' },
  { id: 'github-dark', nombre: 'Github Dark' },
  { id: 'amber', nombre: 'Retro Amber' },
  { id: 'matrix', nombre: 'Matrix Green' },
  { id: 'tokyo-day', nombre: 'Tokyo Day' },
  { id: 'monokai-light', nombre: 'Monokai Light' },
  { id: 'one-light', nombre: 'One Light' },
  { id: 'nord-light', nombre: 'Nord Light' },
  { id: 'catppuccin-latte', nombre: 'Catppuccin Latte' },
  { id: 'gruvbox-light', nombre: 'Gruvbox Light' },
  { id: 'rose-pine-dawn', nombre: 'Rosé Pine Dawn' },
  { id: 'solarized-light', nombre: 'Solarized Light' },
  { id: 'github-light', nombre: 'Github Light' },
  { id: 'papercolor', nombre: 'Papercolor Light' }
];

// 🧠 COMANDOS DE NAVEGACIÓN TIPO VIM (:h <seccion>)
const COMANDOS_NAVEGACION = [
  { cmd: 'kanban', alias: 'k', desc: 'Ir al Tablero Kanban', seccion: 'kanban', icono: Columns3 },
  { cmd: 'bullet', alias: 'b', desc: 'Ir a Rapid Logging / Bitácora', seccion: 'bullet', icono: Wrench },
  { cmd: 'finanzas', alias: 'f', desc: 'Ir a Gastos y Finanzas Casa', seccion: 'casa_gastos', icono: DollarSign },
  { cmd: 'futurelog', alias: 'fl', desc: 'Ir a Future LOG Trabajo', seccion: 'futureloghst', icono: Calendar },
  { cmd: 'compromisos', alias: 'comp', desc: 'Ir a Compromisos HST', seccion: 'compromisos', icono: FileText },
  { cmd: 'compras', alias: 'shop', desc: 'Ir a Lista de Compras', seccion: 'compras', icono: ShoppingCart },
  { cmd: 'deudas', alias: 'd', desc: 'Ir a Control de Deudas y Tarjetas', seccion: 'deudas', icono: CreditCard },
  { cmd: 'proyectos', alias: 'mapa', desc: 'Ir al Mapa de Proyectos', seccion: 'proyectos_grafo', icono: Map }
];

export default function App() {
  const [seccionActiva, setSeccionActiva] = useState('kanban');
  const [autenticado, setAutenticado] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState({});

  // 🚀 ESTADO DEL COMMAND PROMPT FLOTANTE GLOBAL
  const [mostrarPromptGlobal, setMostrarPromptGlobal] = useState(false);
  const [comandoGlobal, setComandoGlobal] = useState('');
  const [procesandoComando, setProcesandoComando] = useState(false);

  // ⌨️ ESCUCHADOR GLOBAL PARA TECLA ":"
  useEffect(() => {
    const manejarTecladoGlobal = (e) => {
      const el = document.activeElement;
      const esCampoTexto = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;

      if (esCampoTexto) return;

      if (e.key === ':') {
        e.preventDefault();
        setMostrarPromptGlobal(true);
      }

      if (e.key === 'Escape') {
        setMostrarPromptGlobal(false);
        setComandoGlobal('');
      }
    };

    window.addEventListener('keydown', manejarTecladoGlobal);
    return () => window.removeEventListener('keydown', manejarTecladoGlobal);
  }, []);

  // 🎛️ EJECUTOR CON SINTAXIS VIM (:q PARA SALIR / :h PARA AYUDA/NAVEGACIÓN)
  const ejecutarComandoGlobal = async (e) => {
    e.preventDefault();
    if (!comandoGlobal.trim() || procesandoComando) return;

    setProcesandoComando(true);
    const input = comandoGlobal.trim();
    const cmdLower = input.toLowerCase();

    // 🔴 1. SALIR (:q / :quit)
    if (cmdLower === ':q' || cmdLower === 'q' || cmdLower === ':quit') {
      setComandoGlobal('');
      setMostrarPromptGlobal(false);
      setProcesandoComando(false);
      return;
    }

    // 🟢 2. NAVEGACIÓN Y AYUDA CON :h O :help
    let comandoLimpio = cmdLower;
    if (cmdLower.startsWith(':h ') || cmdLower.startsWith('h ')) {
      comandoLimpio = cmdLower.replace(/^:?h\s+/, '').trim();
    } else if (cmdLower.startsWith(':help ') || cmdLower.startsWith('help ')) {
      comandoLimpio = cmdLower.replace(/^:?help\s+/, '').trim();
    }

    // Buscar si es un comando de sección
    const navega = COMANDOS_NAVEGACION.find(c => c.cmd === comandoLimpio || c.alias === comandoLimpio);
    if (navega) {
      setSeccionActiva(navega.seccion);
      setComandoGlobal('');
      setMostrarPromptGlobal(false);
      setProcesandoComando(false);
      return;
    }

    // 🟢 3. CREACIÓN RÁPIDA DE BULLET (. / $ / # / ! / -)
    const hoy = new Date();
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, '0')}/${String(hoy.getMonth() + 1).padStart(2, '0')}/${hoy.getFullYear()}`;

    try {
      if (input.startsWith('.')) {
        const contenido = input.substring(1).trim();
        await database.guardarDatos('guardarTarea', {
          datos: { tarea: contenido, status: 'Por Hacer', fecha: fechaFormateada, tipo: 'Trabajo' }
        });
        setRefreshKeys(prev => ({ ...prev, kanban: (prev['kanban'] || 0) + 1 }));
      } 
      else if (input.startsWith('$')) {
        const partes = input.substring(1).trim().split(';');
        const concepto = partes[0] || 'Gasto Prompt';
        const monto = parseFloat(partes[1]) || 0;
        await database.guardarDatos('guardarTransaccion', {
          fecha: fechaFormateada, importe: monto, descripcion: concepto.toUpperCase(), metodo_pago: 'Efectivo', rubro: ''
        });
        setRefreshKeys(prev => ({ ...prev, casa_gastos: (prev['casa_gastos'] || 0) + 1 }));
      } 
      else if (input.startsWith('#')) {
        const partes = input.substring(1).trim().split(';');
        await database.guardarDatos('guardarReunion', {
          datos: { comite: (partes[0] || 'EVENTO').toUpperCase(), fecha: partes[1] || fechaFormateada, hora: partes[2] || '09:00', lugar: partes[3] || 'Pendiente', tipo: 'Trabajo' }
        });
        setRefreshKeys(prev => ({ ...prev, futureloghst: (prev['futureloghst'] || 0) + 1 }));
      } 
      else {
        await database.guardarDatos('guardarTarea', {
          datos: { tarea: input, status: 'Bullet', fecha: fechaFormateada, tipo: 'BulletJournal' }
        });
        setRefreshKeys(prev => ({ ...prev, bullet: (prev['bullet'] || 0) + 1 }));
      }
    } catch (err) {
      console.error("Error ejecutando desde prompt:", err);
    } finally {
      setComandoGlobal('');
      setMostrarPromptGlobal(false);
      setProcesandoComando(false);
    }
  };

  // 🎨 ESTADO Y PERSISTENCIA DE TEMAS
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('theme_app') || 'tokyo';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('theme_app', tema);
  }, [tema]);

  const cambiarSiguienteTema = () => {
    const indiceActual = LISTA_TEMAS.findIndex(t => t.id === tema);
    const siguienteIndice = (indiceActual + 1) % LISTA_TEMAS.length;
    setTema(LISTA_TEMAS[siguienteIndice].id);
  };

  const [pasoAuth, setPasoAuth] = useState(1);
  const [codigoInput, setCodigoInput] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [errorAuth, setErrorAuth] = useState('');
  const [cargando, setCargando] = useState(false);

  const ENLACES_DATABASE = {
    kanban: 'https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q/edit?gid=816871407',
    bullet: 'https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q/edit?gid=816871407',
    futureloghst: 'https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q/edit?gid=1273409378',
    compromisos: 'https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q/edit?gid=215090502',
    compras: 'https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q/edit?gid=1191916610',
    casa_gastos: 'https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q/edit?gid=361143608',
    deudas: 'https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q/edit?gid=2015874162',
    proyectos_grafo: 'https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q/edit?gid=1108017808',
    default: 'https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q/edit?gid=816871407'
  };

  useEffect(() => {
    const host = window.location.hostname;
    const esEntornoLocal = host === 'localhost' || host === '127.0.0.1' || /^192\.168\./.test(host) || /^10\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host);

    if (esEntornoLocal) {
      setAutenticado(true);
      return;
    }
    const sesionValida = sessionStorage.getItem('sesion_biomedica_st');
    if (sesionValida) {
      setAutenticado(true);
    }
  }, []);

  if (window.location.pathname === '/registro') {
    return <RegistroRapido />;
  }

  const cambiarSeccion = (seccion) => {
    if (seccionActiva === seccion) {
      setRefreshKeys(prev => ({ ...prev, [seccion]: (prev[seccion] || 0) + 1 }));
    } else {
      setSeccionActiva(seccion);
    }
  };

  const solicitarCodigoTelegram = async () => {
    setCargando(true);
    setErrorAuth('');
    try {
      const res = await fetch('/api/send-code', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setTempToken(data.tempToken);
        setPasoAuth(2);
      } else {
        setErrorAuth(data.error || 'Error al enviar el código.');
      }
    } catch (err) {
      setErrorAuth('Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  const manejarVerificacionCodigo = async (e) => {
    e.preventDefault();
    setCargando(true);
    setErrorAuth('');

    try {
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputCode: codigoInput, tempToken })
      });
      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('sesion_biomedica_st', data.sessionToken); 
        setAutenticado(true);
        setCodigoInput('');
        setErrorAuth('');
      } else {
        setErrorAuth(data.error || 'Código incorrecto.');
        setCodigoInput('');
      }
    } catch (err) {
      setErrorAuth('Error al validar el código.');
    } finally {
      setCargando(false);
    }
  };

  const cerrarSesion = () => {
    sessionStorage.removeItem('sesion_biomedica_st');
    setAutenticado(false);
    setPasoAuth(1);
  };

  if (!autenticado) {
    return (
      <div className="h-screen w-screen bg-theme-bg flex items-center justify-center p-4 font-mono text-theme-text">
        <div className="bg-theme-bg border border-theme-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 border-t-4 border-t-theme-accent">
          <div className="h-12 w-12 rounded-full bg-theme-bg border border-theme-border flex items-center justify-center mx-auto mb-4 text-theme-accent">
            {pasoAuth === 1 ? <Send className="w-5 h-5 animate-pulse" /> : <KeyRound className="w-5 h-5" />}
          </div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-theme-text mb-1">
            {pasoAuth === 1 ? 'Mandar Token' : 'Verificación 2FA'}
          </h2>
          <p className="text-[10px] font-bold text-theme-text/60 uppercase tracking-widest mb-6">rattamayhorka.app</p>
          
          {errorAuth && (
            <p className="text-[10px] font-black text-theme-casa uppercase italic text-center tracking-tight mb-4 bg-theme-casa/10 p-2 rounded-xl border border-theme-casa/30">
              {errorAuth}
            </p>
          )}

          {pasoAuth === 1 ? (
            <div className="space-y-4">
              <p className="text-xs text-theme-text/60 text-center leading-relaxed">
                Para acceder, solicita un token único de acceso que se enviará directamente a tu cuenta de Telegram vinculada.
              </p>
              <button 
                onClick={solicitarCodigoTelegram}
                disabled={cargando}
                className="w-full bg-theme-accent hover:opacity-90 text-theme-bg py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer mt-2 disabled:opacity-50"
              >
                {cargando ? 'Enviando...' : 'Solicitar Código por Telegram'}
              </button>
            </div>
          ) : (
            <form onSubmit={manejarVerificacionCodigo} className="space-y-4 text-left">
              <div>
                <label className="block text-[9px] font-black uppercase text-theme-text/60 mb-1.5 tracking-wider text-center">
                  Introduce el Token de 6 dígitos
                </label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  placeholder="000000" 
                  disabled={cargando}
                  className="w-full bg-theme-bg border border-theme-border rounded-xl p-3 text-lg text-center tracking-widest text-theme-accent font-mono outline-none focus:border-theme-accent transition-all"
                />
              </div>
              <button 
                type="submit" 
                disabled={cargando || codigoInput.length < 6}
                className="w-full bg-theme-trabajo hover:opacity-90 text-theme-bg py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer mt-2 disabled:opacity-50"
              >
                {cargando ? 'Verificando...' : 'Validar Acceso'}
              </button>
              <button
                type="button"
                onClick={() => setPasoAuth(1)}
                className="w-full text-center text-[9px] font-bold uppercase text-theme-text/60 hover:text-theme-text transition-all block mt-2"
              >
                ← Volver a solicitar código
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Filtrado de comandos para la lista interactiva
  const textoLimpioParaFiltro = comandoGlobal.replace(/^:?h\s+/, '').replace(/^:?help\s+/, '').replace(/^:/, '').toLowerCase();
  const comandosFiltrados = COMANDOS_NAVEGACION.filter(c => 
    c.cmd.includes(textoLimpioParaFiltro) || c.alias.includes(textoLimpioParaFiltro)
  );

  return (
    <div className="bg-theme-bg text-theme-text flex h-dvh overflow-hidden font-mono">
      <div className="w-16 xl:w-64 bg-theme-bg shadow-2xl border-r border-theme-border flex-shrink-0 flex flex-col justify-between h-dvh overflow-hidden transition-all duration-200">
        <div className="flex flex-col h-dvh overflow-hidden">
          <button 
            onClick={cambiarSiguienteTema}
            title={`Tema actual: ${LISTA_TEMAS.find(t => t.id === tema)?.nombre}. Clic para cambiar.`}
            className="p-4 xl:p-6 font-black text-theme-accent border-b border-theme-border italic uppercase tracking-tighter text-xl flex-shrink-0 flex items-center justify-center xl:justify-start hover:opacity-80 transition-opacity cursor-pointer select-none"
          >
            <Palette className="w-5 h-5 flex-shrink-0 xl:hidden" />
            <span className="hidden xl:inline">Enfoque</span>
          </button>

          <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2 min-h-0 custom-scrollbar">
            <button 
              onClick={() => cambiarSeccion('bullet')} 
              title="Bullet"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'bullet' ? 'bg-theme-accent text-theme-bg' : 'text-theme-text/60 hover:bg-theme-border/20 hover:text-theme-text'
              }`}
            >
              <Wrench className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Bullet</span>
            </button>

            <button 
              onClick={() => cambiarSeccion('kanban')} 
              title="Kanban Trabajo"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'kanban' ? 'bg-theme-accent text-theme-bg' : 'text-theme-text/60 hover:bg-theme-border/20 hover:text-theme-text'
              }`}
            >
              <Columns3 className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Kanban</span>
            </button>

            <button
              onClick={() => cambiarSeccion('futureloghst')}
              title="Future LOG Trabajo"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'futureloghst' ? 'bg-theme-accent text-theme-bg' : 'text-theme-text/60 hover:bg-theme-border/20 hover:text-theme-text'
              }`}
            >
              <Calendar className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Future LOG</span>
            </button>

            <div className="hidden xl:block text-[11px] font-black text-theme-trabajo uppercase tracking-widest px-3 mb-1 mt-6">
              Trabajo
            </div>

            <button 
              onClick={() => cambiarSeccion('compromisos')} 
              title="Compromisos"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'compromisos' ? 'bg-theme-trabajo text-theme-bg' : 'text-theme-text/60 hover:bg-theme-border/20 hover:text-theme-text'
              }`}
            >
              <FileText className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Compromisos</span>
            </button>

            <button 
              onClick={() => cambiarSeccion('compras')} 
              title="Compras"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'compras' ? 'bg-theme-trabajo text-theme-bg' : 'text-theme-text/60 hover:bg-theme-border/20 hover:text-theme-text'
              }`}
            >
              <ShoppingCart className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Compras</span>
            </button>
            
            <div className="hidden xl:block text-[11px] font-black text-theme-casa uppercase tracking-widest px-3 mb-1 mt-6">
              Familia
            </div>

            <button 
              onClick={() => cambiarSeccion('casa_gastos')}  
              title="Finanzas"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'casa_gastos' 
                  ? 'bg-theme-casa text-theme-bg border border-theme-casa' 
                  : 'text-theme-text/60 hover:bg-theme-border/20 hover:text-theme-text'
              }`}
            >
              <DollarSign className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Finanzas</span>
            </button>

            <button   
              onClick={() => cambiarSeccion('deudas')}  
              title="Tarjeta y Deudas"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'deudas'  
                  ? 'bg-theme-casa text-theme-bg border border-theme-casa'  
                  : 'text-theme-text/60 hover:bg-theme-border/20 hover:text-theme-text'
              }`}
            >
              <CreditCard className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Control Deudas</span>
            </button>


            <button   
              onClick={() => cambiarSeccion('proyectos_grafo')}  
              title="Mapa de Proyectos"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'proyectos_grafo' ? 'bg-theme-accent text-theme-bg' : 'text-theme-text/60 hover:bg-theme-border/20 hover:text-theme-text'
              }`}
            >
              <Map className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Mapa Proyectos</span>
            </button>

            <button
              onClick={() => cambiarSeccion('prompts')}
              title="Prompts"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'prompts' ? 'bg-theme-accent text-theme-bg' : 'text-theme-text/60 hover:bg-theme-border/20 hover:text-theme-text'
              }`}
            >
              <Bot className="w-4 h-4 flex-shrink-0 xl:hidden" /> 
              <span className="hidden xl:inline px-1">Prompts</span>
            </button>

          </nav>
        </div>

        <div className="p-2 xl:p-4 border-t border-theme-border bg-theme-bg flex flex-col items-center xl:items-stretch gap-2 flex-shrink-0">
          <a 
            href={ENLACES_DATABASE[seccionActiva] || ENLACES_DATABASE.default} 
            target="_blank" 
            rel="noopener noreferrer"
            title={`Abrir hoja de ${seccionActiva} en Google Sheets`}
            className="w-full bg-theme-bg hover:opacity-80 text-theme-text/70 hover:text-theme-accent font-black p-3 xl:px-4 xl:py-2.5 rounded-xl border border-theme-border transition-all text-[10px] uppercase tracking-widest flex items-center justify-center xl:justify-between shadow-md"
          >
            <Database className="w-4 h-4 flex-shrink-0 xl:hidden" /> 
            <span className="hidden xl:inline">Base de Datos</span>
            <span className="hidden xl:inline text-theme-text/40 text-xs">↗</span>
          </a>

          <button 
            onClick={cerrarSesion}
            title="Salir del sistema"
            className="w-full flex items-center justify-center gap-2 p-3 xl:p-2.5 text-[10px] font-black uppercase text-theme-casa bg-theme-casa/10 border border-theme-casa/30 rounded-xl hover:bg-theme-casa/20 transition-all cursor-pointer tracking-wider"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 xl:hidden" /> 
            <span className="hidden xl:inline">salir</span>
          </button>
          
          <div className="hidden xl:block text-center text-[9px] font-bold text-theme-text/50 tracking-widest mt-1">
            rattamayhorka v1.0.4 "jetbrains"
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 xl:p-8 bg-theme-bg">
        <div id="contenedor-principal">
          {seccionActiva === 'kanban' && (
            <Kanban key={refreshKeys['kanban'] || 0} filtroTipo="Trabajo" />
          )}

          {seccionActiva === 'casa_pendientes' && (
            <Kanban key={refreshKeys['casa_pendientes'] || 0} filtroTipo="Casa" />
          )}
          {seccionActiva === 'bullet' && (
            <Bullet key={refreshKeys['bullet'] || 0} />
          )}
          
          {seccionActiva === 'prompts' && (
            <Prompts key={refreshKeys['prompts'] || 0} />
          )}

          {seccionActiva === 'compromisos' && (
            <Compromisos key={refreshKeys['compromisos'] || 0} />
          )}
          {seccionActiva === 'compras' && (
            <Compras key={refreshKeys['compras'] || 0} />
          )}
          {seccionActiva === 'futureloghst' && (
            <FutureLogHST key={refreshKeys['futureloghst'] || 0} />
          )}
          {seccionActiva === 'proyectos_grafo' && (
            <GestionProyectos key={refreshKeys['proyectos_grafo'] || 0} />
          )}
          {seccionActiva === 'casa_gastos' && (
            <GastosCasa key={refreshKeys['casa_gastos'] || 0} />
          )}
          {seccionActiva === 'deudas' && (
            <Deudas key={refreshKeys['deudas'] || 0} />
          )}  
        </div>
      </main>

      {/* 🔮 VIM-STYLE COMMAND PROMPT (SINTAXIS :h / :q / ACCIONES BULLET) */}
      {mostrarPromptGlobal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[9999] flex items-start justify-center pt-16 p-4">
          <div className="bg-theme-bg border border-theme-accent/50 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden font-mono border-t-4 border-t-theme-accent animate-fadeIn">
            <div className="p-3.5 bg-theme-bg border-b border-theme-border/40 flex items-center justify-between text-theme-accent text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-2">
                <Terminal className="w-4 h-4 animate-pulse" /> Vim Command Mode
              </span>
              <button 
                onClick={() => { setMostrarPromptGlobal(false); setComandoGlobal(''); }}
                className="text-theme-text/50 hover:text-theme-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={ejecutarComandoGlobal} className="p-4 flex items-center gap-3 border-b border-theme-border/30">
              <span className="text-theme-accent font-black text-base select-none">:</span>
              <input
                type="text"
                autoFocus
                value={comandoGlobal}
                onChange={(e) => setComandoGlobal(e.target.value)}
                placeholder="Escribe :h <sección>, :q para salir, o . / $ / # para crear..."
                className="w-full bg-transparent outline-none border-none text-theme-text text-sm font-bold placeholder-theme-text/30"
              />
              <button
                type="submit"
                disabled={!comandoGlobal.trim() || procesandoComando}
                className="bg-theme-accent text-theme-bg p-2 rounded-xl disabled:opacity-30 cursor-pointer flex-shrink-0"
              >
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </form>

            {/* 📋 GUÍA RÁPIDA DE SINTAXIS */}
            <div className="px-4 py-2 bg-theme-border/10 border-b border-theme-border/30 flex justify-between text-[9px] font-black uppercase text-theme-text/60 gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-theme-accent"><HelpCircle className="w-3 h-3" /> :h &lt;módulo&gt;</span>
              <span className="flex items-center gap-1 text-theme-casa"><Zap className="w-3 h-3" /> . tarea</span>
              <span className="flex items-center gap-1 text-theme-trabajo"><IconGasto className="w-3 h-3" /> $ gasto;monto</span>
              <span className="flex items-center gap-1 text-theme-accent"><X className="w-3 h-3" /> :q (salir)</span>
            </div>

            {/* 🧭 SUGERENCIAS INTERACTIVAS AL ESCRIBIR :h */}
            <div className="max-h-60 overflow-y-auto p-2 space-y-1">
              <div className="text-[8px] font-black text-theme-text/40 uppercase tracking-widest px-3 py-1">Escribe :h o selecciona para ir</div>
              {comandosFiltrados.length === 0 ? (
                <p className="text-[10px] italic text-theme-text/40 px-3 py-2">Presiona Enter para ejecutar la acción...</p>
              ) : (
                comandosFiltrados.map((item, idx) => {
                  const IconoCmd = item.icono;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSeccionActiva(item.seccion);
                        setMostrarPromptGlobal(false);
                        setComandoGlobal('');
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-theme-border/30 text-left transition-all group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <IconoCmd className="w-4 h-4 text-theme-accent" />
                        <span className="text-xs font-bold text-theme-text uppercase">{item.desc}</span>
                      </div>
                      <span className="text-[9px] font-black text-theme-accent bg-theme-accent/10 px-2 py-0.5 rounded border border-theme-accent/30 group-hover:bg-theme-accent group-hover:text-theme-bg transition-all">
                        :h {item.cmd} ({item.alias})
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="px-4 py-2 bg-theme-bg border-t border-theme-border/20 flex justify-between text-[8px] text-theme-text/40 uppercase font-black tracking-widest">
              <span>[:q o ESC] Salir</span>
              <span>[ENTER] Ejecutar</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}