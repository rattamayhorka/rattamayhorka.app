import React, { useState, useEffect } from 'react';

// === ÍCONOS SVG AUTÓNOMOS ===
const IconPlus = () => (
  <svg className="w-4 h-4 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const IconTrash = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const IconCheck = ({ active }) => (
  <svg className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-zinc-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const IconAlert = () => (
  <svg className="w-5 h-5 text-amber-400 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const IconHeart = () => (
  <svg className="w-3.5 h-3.5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
  </svg>
);

export default function NeedsVsWants() {
  const [items, setItems] = useState(() => {
    try {
      const guardados = localStorage.getItem('bunker_needs_wants');
      return guardados ? JSON.parse(guardados) : [
        { id: 1, concepto: 'Mantenimiento Coche', monto: 1500, tipo: 'NEED', asignado: 'COMPARTIDO', completado: false },
        { id: 2, concepto: 'Audífonos IEMs FiiO', monto: 2200, tipo: 'WANT', asignado: 'YO', completado: false }
      ];
    } catch (e) {
      return [];
    }
  });

  const [form, setForm] = useState({ concepto: '', monto: '', tipo: 'NEED', asignado: 'YO' });
  const [filtroPersona, setFiltroPersona] = useState('TODOS');

  useEffect(() => {
    localStorage.setItem('bunker_needs_wants', JSON.stringify(items));
  }, [items]);

  const agregarItem = (e) => {
    e.preventDefault();
    if (!form.concepto.trim() || !form.monto) return;

    const nuevo = {
      id: Date.now(),
      concepto: form.concepto.toUpperCase().trim(),
      monto: parseFloat(form.monto) || 0,
      tipo: form.tipo,
      asignado: form.asignado,
      completado: false
    };

    setItems(prev => [nuevo, ...prev]);
    setForm(prev => ({ ...prev, concepto: '', monto: '' }));
  };

  const toggleCompletado = (id) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, completado: !item.completado } : item));
  };

  const eliminarItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  // Estilos de badge por persona
  const getBadgePersonaStyle = (persona) => {
    switch (persona) {
      case 'VICTORIA':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/30';
      case 'HIJO':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'COMPARTIDO':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default: // YO
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  const itemsFiltrados = items.filter(i => filtroPersona === 'TODOS' || i.asignado === filtroPersona);

  const totalNeeds = itemsFiltrados.filter(i => i.tipo === 'NEED' && !i.completado).reduce((acc, i) => acc + i.monto, 0);
  const totalWants = itemsFiltrados.filter(i => i.tipo === 'WANT' && !i.completado).reduce((acc, i) => acc + i.monto, 0);

  return (
    <div className="space-y-6 bg-zinc-950 p-4 rounded-2xl border border-zinc-900 text-left font-sans text-zinc-200">
      {/* HEADER Y FILTRO POR PERSONA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-4 gap-3">
        <div>
          <h3 className="text-base font-black uppercase italic tracking-tighter text-slate-100 flex items-center gap-2">
            <IconAlert /> Clasificador Needs vs. Wants
          </h3>
          <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Priorización de Adquisiciones</p>
        </div>

        {/* SELECTOR DE FILTRO */}
        <div className="flex items-center gap-2 bg-zinc-900/80 p-1 border border-zinc-800 rounded-xl">
          <span className="text-[9px] font-black uppercase text-zinc-500 pl-2">Ver:</span>
          <select
            value={filtroPersona}
            onChange={(e) => setFiltroPersona(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-[10px] font-bold text-slate-200 rounded px-2 py-1 outline-none cursor-pointer uppercase"
          >
            <option value="TODOS">TODOS</option>
            <option value="YO">YO</option>
            <option value="VICTORIA">VICTORIA</option>
            <option value="HIJO">HIJO</option>
            <option value="COMPARTIDO">CASA / COMPARTIDO</option>
          </select>
        </div>
      </div>

      {/* MÉTRICAS TOTALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl border-t-2 border-t-red-500">
          <span className="text-[9px] font-black uppercase tracking-wider text-red-400 flex items-center gap-1">
            🔴 Necesidades Críticas (Needs)
          </span>
          <div className="text-2xl font-black text-slate-100 font-mono mt-1 tabular-nums">
            ${totalNeeds.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl border-t-2 border-t-purple-500">
          <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 flex items-center gap-1">
            <IconHeart /> Deseos / Gustos (Wants)
          </span>
          <div className="text-2xl font-black text-slate-100 font-mono mt-1 tabular-nums">
            ${totalWants.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* FORMULARIO DE CAPTURA */}
      <form onSubmit={agregarItem} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
        <input
          type="text"
          placeholder="CONCEPTO (EJ. REFACCIONES)"
          value={form.concepto}
          onChange={(e) => setForm(prev => ({ ...prev, concepto: e.target.value }))}
          className="sm:col-span-4 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-slate-100 outline-none focus:border-amber-400 uppercase"
        />
        <input
          type="number"
          step="0.01"
          placeholder="MONTO ($)"
          value={form.monto}
          onChange={(e) => setForm(prev => ({ ...prev, monto: e.target.value }))}
          className="sm:col-span-3 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs font-bold text-slate-100 outline-none focus:border-amber-400 tabular-nums"
        />
        <select
          value={form.asignado}
          onChange={(e) => setForm(prev => ({ ...prev, asignado: e.target.value }))}
          className="sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[10px] font-black text-slate-100 outline-none cursor-pointer uppercase"
        >
          <option value="YO">YO</option>
          <option value="VICTORIA">VICTORIA</option>
          <option value="HIJO">HIJO</option>
          <option value="COMPARTIDO">COMPARTIDO</option>
        </select>
        <div className="sm:col-span-3 flex gap-2">
          <select
            value={form.tipo}
            onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-[10px] font-black text-slate-100 outline-none cursor-pointer"
          >
            <option value="NEED">NEED 🔴</option>
            <option value="WANT">WANT 🟣</option>
          </select>
          <button
            type="submit"
            className="bg-amber-400 hover:bg-amber-500 text-zinc-950 px-3 py-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center"
          >
            <IconPlus />
          </button>
        </div>
      </form>

      {/* LISTA DE ELEMENTOS */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
        {itemsFiltrados.length > 0 ? itemsFiltrados.map(item => (
          <div
            key={item.id}
            className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
              item.completado
                ? 'bg-zinc-950/40 border-zinc-900 text-zinc-600 line-through'
                : 'bg-zinc-900/60 border-zinc-800 text-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => toggleCompletado(item.id)}
                className="cursor-pointer bg-transparent border-none p-0"
              >
                <IconCheck active={item.completado} />
              </button>
              <div>
                <span className="text-xs font-black uppercase tracking-tight block">{item.concepto}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border inline-block ${
                    item.tipo === 'NEED' 
                      ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}>
                    {item.tipo}
                  </span>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border inline-block ${getBadgePersonaStyle(item.asignado)}`}>
                    {item.asignado}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs font-black font-mono tabular-nums">
                ${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
              <button
                type="button"
                onClick={() => eliminarItem(item.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none p-0"
              >
                <IconTrash />
              </button>
            </div>
          </div>
        )) : (
          <p className="text-center text-zinc-600 font-bold uppercase text-[10px] py-6">Sin prioridades registradas</p>
        )}
      </div>
    </div>
  );
}