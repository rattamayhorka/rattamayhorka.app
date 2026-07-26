import { useState, useEffect } from 'react';
import Kanban from './components/Kanban';
import Bullet from './components/Bullet';
import Gases from './components/Gases';
import Compromisos from './components/CompromisosHST';
import Compras from './components/Compras';
import FutureLogHST from './components/FutureLogHST';
import RegistroRapido from './components/RegistroRapido';
import GestionProyectos from './components/GestionProyectos';
import GastosCasa from './components/GastosCasa';
import Deudas from './components/Deudas';
//import ReunionesCasa from './components/ReunionesCasa';

// 🛠️ Agregamos los iconos necesarios para el menú compacto
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
  CreditCard
} from 'lucide-react';

export default function App() {
  const [seccionActiva, setSeccionActiva] = useState('kanban');
  const [autenticado, setAutenticado] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState({});

  // 🔐 NUEVOS ESTADOS PARA AUTENTICACIÓN POR TELEGRAM
  const [pasoAuth, setPasoAuth] = useState(1); // 1: Solicitar código, 2: Verificar código
  const [codigoInput, setCodigoInput] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [errorAuth, setErrorAuth] = useState('');
  const [cargando, setCargando] = useState(false);

   useEffect(() => {
      // 🎯 BYPASS LOCAL: Si estás en tu computadora (localhost o 127.0.0.1)
      // te da acceso directo para que puedas desarrollar y ver tus cambios rápido.
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setAutenticado(true);
        return; // Nos salimos aquí para saltarnos el flujo en local
      }

      // 🔒 FLUJO DE PRODUCCIÓN: En internet sí valida tu sesión de forma estricta
      const sesionValida = sessionStorage.getItem('sesion_biomedica_st'); // <- Cambiado a sessionStorage
            if (sesionValida) {
        setAutenticado(true);
      }
    }, []);

  if (window.location.pathname === '/registro') {
    return <RegistroRapido />;
  }

  const cambiarSeccion = (seccion) => {
    if (seccionActiva === seccion) {
      setRefreshKeys(prev => ({
        ...prev,
        [seccion]: (prev[seccion] || 0) + 1
      }));
    } else {
      setSeccionActiva(seccion);
    }
  };

  // 🚀 SOLICITAR CÓDIGO AL BOT DE TELEGRAM (Llama a tu endpoint de Vercel)
  const solicitarCodigoTelegram = async () => {
    setCargando(true);
    setErrorAuth('');
    try {
      const res = await fetch('/api/send-code', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setTempToken(data.tempToken);
        setPasoAuth(2); // Pasamos al input para meter el código
      } else {
        setErrorAuth(data.error || 'Error al enviar el código.');
      }
    } catch (err) {
      setErrorAuth('Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  // 🔐 VERIFICAR CÓDIGO INGRESADO
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

  // 🔒 VISTA DE LOGIN AJUSTADA AL NUEVO FLUJO 2FA TELEGRAM
  if (!autenticado) {
    return (
      <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center p-4 font-sans text-[#f8fafc]">
        <div className="bg-[#1e293b] border border-[#334155] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-center p-8 border-t-4 border-t-[#38bdf8]">
          <div className="h-12 w-12 rounded-full bg-[#0c4a6e] border border-[#334155] flex items-center justify-center mx-auto mb-4 text-[#38bdf8]">
            {pasoAuth === 1 ? <Send className="w-5 h-5 animate-pulse" /> : <KeyRound className="w-5 h-5" />}
          </div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#f8fafc] mb-1">
            {pasoAuth === 1 ? 'Mandar Token' : 'Verificación 2FA'}
          </h2>
          <p className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest mb-6">rattamayhorka.app</p>
          
          {errorAuth && (
            <p className="text-[10px] font-black text-rose-400 uppercase italic text-center tracking-tight mb-4 bg-rose-950/30 p-2 rounded-xl border border-rose-900/30">
              {errorAuth}
            </p>
          )}

          {pasoAuth === 1 ? (
            <div className="space-y-4">
              <p className="text-xs text-[#94a3b8] text-center leading-relaxed">
                Para acceder, solicita un token único de acceso que se enviará directamente a tu cuenta de Telegram vinculada.
              </p>
              <button 
                onClick={solicitarCodigoTelegram}
                disabled={cargando}
                className="w-full bg-[#38bdf8] hover:bg-[#0ea5e9] text-slate-950 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer mt-2 disabled:opacity-50"
              >
                {cargando ? 'Enviando...' : 'Solicitar Código por Telegram'}
              </button>
            </div>
          ) : (
            <form onSubmit={manejarVerificacionCodigo} className="space-y-4 text-left">
              <div>
                <label className="block text-[9px] font-black uppercase text-[#94a3b8] mb-1.5 tracking-wider text-center">
                  Introduce el Token de 6 dígitos
                </label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={codigoInput}
                  onChange={(e) => setCodigoInput(e.target.value)}
                  placeholder="000000" 
                  disabled={cargando}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-xl p-3 text-lg text-center tracking-widest text-[#38bdf8] font-mono outline-none focus:border-[#38bdf8] transition-all"
                />
              </div>
              <button 
                type="submit" 
                disabled={cargando || codigoInput.length < 6}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer mt-2 disabled:opacity-50"
              >
                {cargando ? 'Verificando...' : 'Validar Acceso'}
              </button>
              <button
                type="button"
                onClick={() => setPasoAuth(1)}
                className="w-full text-center text-[9px] font-bold uppercase text-[#94a3b8] hover:text-[#f8fafc] transition-all block mt-2"
              >
                ← Volver a solicitar código
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f172a] text-[#f8fafc] flex h-dvh overflow-hidden font-sans">
      
      {/* MENÚ LATERAL RESPONSIVO CON SCROLL INTERNO PARA TABLETS */}
      <div className="w-16 xl:w-64 bg-[#1e293b] shadow-2xl border-r border-[#334155] flex-shrink-0 flex flex-col justify-between h-dvh overflow-hidden transition-all duration-200">
        
        {/* CONTENEDOR SUPERIOR CON SCROLL SOLO EN LOS BOTONES */}
        <div className="flex flex-col h-dvh overflow-hidden">
          {/* Título adaptable (Fijo arriba) */}
          <div className="hidden xl:block p-6 font-black text-[#38bdf8] border-b border-[#334155] italic uppercase tracking-tighter text-xl flex-shrink-0">
            Enfoque
          </div>

          {/* 🛠️ NAV CON SCROLL INTERNO */}
          <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2 min-h-0 custom-scrollbar">
            
            <button 
              onClick={() => cambiarSeccion('bullet')} 
              title="Bullet"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'bullet' ? 'bg-[#0c4a6e] text-[#38bdf8]' : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
              }`}
            >
              <Wrench className="w-4 h-4 flex-shrink-0 xl:hidden" /> 
              <span className="hidden xl:inline px-1">Bullet</span>
            </button>

            <button 
              onClick={() => cambiarSeccion('kanban')} 
              title="Kanban Trabajo"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'kanban' ? 'bg-[#0c4a6e] text-[#38bdf8]' : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
              }`}
            >
              <Columns3 className="w-4 h-4 flex-shrink-0 xl:hidden" /> 
              <span className="hidden xl:inline px-1">Kanban</span>
            </button>

            <button 
              onClick={() => cambiarSeccion('futureloghst')} 
              title="Future LOG Trabajo"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'futureloghst' ? 'bg-[#0c4a6e] text-[#38bdf8]' : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
              }`}
            >
              <Calendar className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Future LOG</span>
            </button>

            {/* Sección Trabajo */}
            <div className="hidden xl:block text-[11px] font-black text-[#38bdf8] uppercase tracking-widest px-3 mb-1 mt-6">
              Trabajo
            </div>

            <button 
              onClick={() => cambiarSeccion('compromisos')} 
              title="Compromisos"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'compromisos' ? 'bg-[#0c4a6e] text-[#38bdf8]' : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
              }`}
            >
              <FileText className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Compromisos</span>
            </button>

            <button 
              onClick={() => cambiarSeccion('compras')} 
              title="Compras"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'compras' ? 'bg-[#0c4a6e] text-[#38bdf8]' : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
              }`}
            >
              <ShoppingCart className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Compras</span>
            </button>
            
            <button 
              onClick={() => cambiarSeccion('gases')} 
              title="Control de Gases"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'gases' ? 'bg-[#0c4a6e] text-[#38bdf8]' : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
              }`}
            >
              <Activity className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Control de Gases</span>
            </button>

            {/* Sección Familia */}
            <div className="hidden xl:block text-[11px] font-black text-amber-400 uppercase tracking-widest px-3 mb-1 mt-6">
              Familia
            </div>

            <button 
              onClick={() => cambiarSeccion('casa_gastos')}  
              title="Finanzas"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'casa_gastos' 
                  ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' 
                  : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
              }`}
            >
              <DollarSign className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Finanzas</span>
            </button>

            {/* 💳 NUEVO BOTÓN CONTROL DE DEUDAS */}
            <button  
              onClick={() => cambiarSeccion('deudas')}  
              title="Tarjeta y Deudas"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'deudas'  
                  ? 'bg-blue-950/40 text-blue-400 border border-blue-900/40'  
                  : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
              }`}
            >
              <CreditCard className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Control Deudas</span>
            </button>

            <button  
              onClick={() => cambiarSeccion('proyectos_grafo')}  
              title="Mapa de Proyectos"
              className={`w-full flex items-center justify-center xl:justify-start gap-3 p-3 rounded-xl font-bold uppercase text-[11px] transition-all tracking-wider cursor-pointer ${
                seccionActiva === 'proyectos_grafo' ? 'bg-[#0c4a6e] text-[#38bdf8]' : 'text-[#94a3b8] hover:bg-[#334155] hover:text-[#f8fafc]'
              }`}
            >
              <Map className="w-4 h-4 flex-shrink-0 xl:hidden" />
              <span className="hidden xl:inline px-1">Mapa Proyectos</span>
            </button>
          </nav>
        </div>

        {/* 🛠️ SECCIÓN INFERIOR FIJA */}
        <div className="p-2 xl:p-4 border-t border-[#334155] bg-[#1e293b] flex flex-col items-center xl:items-stretch gap-2 flex-shrink-0">
          
          <a 
            href="https://docs.google.com/spreadsheets/d/1zAkCvBUPxxGFY_-a6M92hhqzJXNM6TPGCVVuL-Pu19Q" 
            target="_blank" 
            rel="noopener noreferrer"
            title="Base de Datos Google Sheets"
            className="w-full bg-zinc-900/60 hover:bg-zinc-800/80 text-slate-400 hover:text-violet-400 font-black p-3 xl:px-4 xl:py-2.5 rounded-xl border border-zinc-800/80 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center xl:justify-between shadow-md"
          >
            <Database className="w-4 h-4 flex-shrink-0 xl:hidden" /> 
            <span className="hidden xl:inline">Base de Datos</span>
            <span className="hidden xl:inline text-zinc-600 text-xs">↗</span>
          </a>

          <button 
            onClick={cerrarSesion}
            title="Salir del sistema"
            className="w-full flex items-center justify-center gap-2 p-3 xl:p-2.5 text-[10px] font-black uppercase text-rose-400 bg-rose-950/20 border border-rose-900/30 rounded-xl hover:bg-rose-950/50 hover:text-rose-300 transition-all cursor-pointer tracking-wider"
          >
            <LogOut className="w-4 h-4 flex-shrink-0 xl:hidden" /> 
            <span className="hidden xl:inline">salir</span>
          </button>
          
          <div className="hidden xl:block text-center text-[9px] font-bold text-[#94a3b8] tracking-widest mt-1">
            rattamayhorka v0.9.1 "project color"
          </div>
        </div>
      </div>

      {/* CONTENEDOR DE TRABAJO */}
      <main className="flex-1 overflow-y-auto p-4 xl:p-8 bg-[#0f172a]">
        <div id="contenedor-principal">
          {seccionActiva === 'kanban' && (
            <Kanban 
              key={refreshKeys['kanban'] || 0} 
              filtroTipo="Trabajo" 
            />
          )}

          {seccionActiva === 'casa_pendientes' && (
            <Kanban 
              key={refreshKeys['casa_pendientes'] || 0} 
              filtroTipo="Casa" 
            />
          )}
          {seccionActiva === 'bullet' && (
            <Bullet key={refreshKeys['bullet'] || 0} />
          )}
          
          {seccionActiva === 'gases' && (
            <Gases key={refreshKeys['gases'] || 0} />
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
          {/*
          {seccionActiva === 'casa_reuniones' && (
            <ReunionesCasa key={refreshKeys['casa_reuniones'] || 0} />
          )}
          */}
          {seccionActiva === 'casa_gastos' && (
            <GastosCasa key={refreshKeys['casa_gastos'] || 0} />
          )}
          {seccionActiva === 'deudas' && (
            <Deudas key={refreshKeys['deudas'] || 0} />
          )}  
        </div>
      </main>

      {/*
      <main className="flex-1 overflow-y-auto p-4 xl:p-8 bg-[#0f172a]">
        <div id="contenedor-principal">
          {seccionActiva === 'kanban' && <Kanban filtroTipo="Trabajo" refreshTrigger={refreshKeys['kanban']} />}
          {seccionActiva === 'casa_pendientes' && <Kanban filtroTipo="Casa" refreshTrigger={refreshKeys['casa_pendientes']} />}
          {seccionActiva === 'gases' && <Gases refreshTrigger={refreshKeys['gases']} />}
          {seccionActiva === 'compromisos' && <Compromisos refreshTrigger={refreshKeys['compromisos']} />}
          {seccionActiva === 'compras' && <Compras refreshTrigger={refreshKeys['compras']} />}
          {seccionActiva === 'futureloghst' && <FutureLogHST refreshTrigger={refreshKeys['futureloghst']} />}
          {seccionActiva === 'proyectos_grafo' && <GestionProyectos refreshTrigger={refreshKeys['proyectos_grafo']} />}
          {seccionActiva === 'casa_reuniones' && <ReunionesCasa refreshTrigger={refreshKeys['casa_reuniones']} />}
          {seccionActiva === 'casa_gastos' && <GastosCasa refreshTrigger={refreshKeys['casa_gastos']} />}
          {seccionActiva === 'deudas' && <Deudas refreshTrigger={refreshKeys['deudas']} />}  
        </div>
      </main>
      */}
    </div>
  );
}