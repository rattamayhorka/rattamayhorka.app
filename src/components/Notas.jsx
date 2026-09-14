
import React, { useState, useEffect } from 'react';

const COLS = 20;
const ROWS = 12;
const START_CELL = { r: 5, c: 0 };
const END_CELL = { r: 5, c: 19 };

const ARSENAL = {
  gatling: {
    tag: 'G',
    nombre: 'Gatling',
    costo: 5,
    rango: 2.5,
    dmg: 4,
    color: 'text-emerald-400',
    desc: 'Cadencia rápida a corto alcance.',
    upgrades: [
      { costo: 10, dmg: 8, rango: 3 },
      { costo: 25, dmg: 18, rango: 3.5 }
    ]
  },
  goo: {
    tag: 'Q',
    nombre: 'Goo (Cryo)',
    costo: 10,
    rango: 2,
    dmg: 1,
    slowTurnos: 2,
    color: 'text-cyan-400',
    desc: 'Frena avance por turnos.',
    upgrades: [
      { costo: 15, dmg: 2.5, rango: 2.5, slowTurnos: 3 },
      { costo: 30, dmg: 5, rango: 3, slowTurnos: 4 }
    ]
  },
  missile: {
    tag: 'M',
    nombre: 'Missile',
    costo: 20,
    rango: 4.5,
    dmg: 35,
    splashRadius: 1.5,
    color: 'text-amber-400',
    desc: 'Largo alcance con daño en área.',
    upgrades: [
      { costo: 35, dmg: 75, rango: 5.5, splashRadius: 2 },
      { costo: 75, dmg: 160, rango: 6.5, splashRadius: 2.5 }
    ]
  },
  flame: {
    tag: 'F',
    nombre: 'Flame',
    costo: 35,
    rango: 1.8,
    dmg: 12,
    color: 'text-orange-400',
    desc: 'Ráfaga de fuego en celdas contiguas.',
    upgrades: [
      { costo: 50, dmg: 24, rango: 2.2 },
      { costo: 110, dmg: 55, rango: 2.8 }
    ]
  },
  tesla: {
    tag: 'T',
    nombre: 'Tesla',
    costo: 70,
    rango: 3.2,
    dmg: 25,
    chainCount: 3,
    color: 'text-purple-400',
    desc: 'Arco eléctrico a múltiples objetivos.',
    upgrades: [
      { costo: 90, dmg: 55, rango: 3.8, chainCount: 4 },
      { costo: 180, dmg: 120, rango: 4.5, chainCount: 6 }
    ]
  },
  laser: {
    tag: 'L',
    nombre: 'Laser',
    costo: 120,
    rango: 4,
    dmg: 180,
    color: 'text-pink-400',
    desc: 'Alta penetración contra blindados.',
    upgrades: [
      { costo: 160, dmg: 380, rango: 4.8 },
      { costo: 320, dmg: 850, rango: 5.8 }
    ]
  }
};

function calculatePath(grid) {
  const queue = [[START_CELL]];
  const visited = new Set([`${START_CELL.r},${START_CELL.c}`]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current.r === END_CELL.r && current.c === END_CELL.c) {
      return path;
    }

    const neighbors = [
      { r: current.r + 1, c: current.c },
      { r: current.r - 1, c: current.c },
      { r: current.r, c: current.c + 1 },
      { r: current.r, c: current.c - 1 }
    ];

    for (const n of neighbors) {
      if (
        n.r >= 0 && n.r < ROWS &&
        n.c >= 0 && n.c < COLS &&
        !grid[n.r][n.c] &&
        !visited.has(`${n.r},${n.c}`)
      ) {
        visited.add(`${n.r},${n.c}`);
        queue.push([...path, n]);
      }
    }
  }
  return null;
}

export default function TextBasedFieldrunnersClean() {
  const [vidas, setVidas] = useState(20);
  const [dinero, setDinero] = useState(35);
  const [ola, setOla] = useState(1);
  const [turnoTotal, setTurnoTotal] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [grid, setGrid] = useState(() =>
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );

  const [colaOleada, setColaOleada] = useState([]);
  const [enemigosActivos, setEnemigosActivos] = useState([]);
  const [torreSeleccionada, setTorreSeleccionada] = useState('gatling');
  const [torreInspeccionada, setTorreInspeccionada] = useState(null);
  const [logs, setLogs] = useState([
    'SYS_INIT: Plain matrix mounted (20x12).',
    'READY: [SPACE] to step tick.'
  ]);

  const addLog = (msg) => {
    setLogs((prev) => [msg, ...prev.slice(0, 8)]);
  };

  const prepararOleada = () => {
    const count = 8 + Math.floor(ola * 2.5);
    const esJefe = ola % 10 === 0;
    const esAerea = ola % 4 === 0 && ola > 3;
    const esBlindada = ola % 3 === 0 && !esAerea && !esJefe;

    const nuevaCola = [];
    for (let i = 0; i < count; i++) {
      if (esJefe) {
        nuevaCola.push({
          id: Math.random(),
          sigla: 'BS',
          hp: 800 + ola * 300,
          maxHp: 800 + ola * 300,
          color: 'text-rose-500 font-bold',
          reward: 45,
          esAereo: false,
          pathIndex: 0,
          slowCount: 0
        });
      } else if (esAerea) {
        nuevaCola.push({
          id: Math.random(),
          sigla: 'AR',
          hp: 25 + ola * 10,
          maxHp: 25 + ola * 10,
          color: 'text-purple-400 font-bold',
          reward: 4,
          esAereo: true,
          r: START_CELL.r,
          c: START_CELL.c,
          slowCount: 0
        });
      } else if (esBlindada) {
        nuevaCola.push({
          id: Math.random(),
          sigla: 'HV',
          hp: 60 + ola * 20,
          maxHp: 60 + ola * 20,
          color: 'text-amber-500 font-bold',
          reward: 3,
          esAereo: false,
          pathIndex: 0,
          slowCount: 0
        });
      } else {
        const esRapido = i % 2 === 0;
        nuevaCola.push({
          id: Math.random(),
          sigla: esRapido ? 'BK' : 'GR',
          hp: (esRapido ? 12 : 20) + ola * 6,
          maxHp: (esRapido ? 12 : 20) + ola * 6,
          color: esRapido ? 'text-yellow-300' : 'text-sky-400',
          reward: 1 + Math.floor(ola * 0.1),
          esAereo: false,
          pathIndex: 0,
          slowCount: 0
        });
      }
    }
    setColaOleada(nuevaCola);
    addLog(`WAVE_QUEUE: Wave #${ola} ready (${count} pkts).`);
  };

  useEffect(() => {
    prepararOleada();
  }, [ola]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        avanzarUnTurno();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const avanzarUnTurno = () => {
    if (gameOver) return;
    const currentPath = calculatePath(grid);
    if (!currentPath) {
      addLog('ERR: Grid blocked.');
      return;
    }

    setTurnoTotal((t) => t + 1);

    let colaTemp = [...colaOleada];
    let activosTemp = [...enemigosActivos];

    if (colaTemp.length > 0) {
      const proximo = colaTemp.shift();
      if (proximo.esAereo) {
        activosTemp.push({ ...proximo, r: START_CELL.r, c: START_CELL.c });
      } else {
        activosTemp.push({ ...proximo, r: currentPath[0].r, c: currentPath[0].c, pathIndex: 0 });
      }
      setColaOleada(colaTemp);
    }

    let vidasRestantes = vidas;
    activosTemp = activosTemp.map((en) => {
      if (en.slowCount > 0) {
        return { ...en, slowCount: en.slowCount - 1 };
      }

      if (en.esAereo) {
        const nextC = en.c + 1;
        if (nextC >= COLS) {
          vidasRestantes -= 1;
          addLog(`LEAK: [${en.sigla}] out.`);
          return null;
        }
        return { ...en, c: nextC };
      } else {
        const nextIdx = en.pathIndex + 1;
        if (nextIdx >= currentPath.length) {
          vidasRestantes -= 1;
          addLog(`LEAK: [${en.sigla}] out.`);
          return null;
        }
        const nextPos = currentPath[nextIdx];
        return { ...en, r: nextPos.r, c: nextPos.c, pathIndex: nextIdx };
      }
    }).filter(Boolean);

    if (vidasRestantes <= 0) {
      setVidas(0);
      setGameOver(true);
      addLog('FATAL: Core down.');
      return;
    }
    setVidas(vidasRestantes);

    let dineroGanado = 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tower = grid[r][c];
        if (!tower) continue;

        const blancos = activosTemp.filter((en) => {
          if (en.esAereo && (tower.tipo === 'flame' || tower.tipo === 'goo')) return false;
          const dist = Math.hypot(en.r - r, en.c - c);
          return dist <= tower.rango && en.hp > 0;
        });

        if (blancos.length > 0) {
          const target = blancos.sort((a, b) => (b.pathIndex || b.c) - (a.pathIndex || a.c))[0];
          target.hp -= tower.dmg;

          if (tower.slowTurnos) target.slowCount = tower.slowTurnos;
          if (tower.splashRadius) {
            blancos.forEach((b) => {
              if (Math.hypot(b.r - target.r, b.c - target.c) <= tower.splashRadius) {
                b.hp -= tower.dmg * 0.6;
              }
            });
          }
          if (tower.chainCount) {
            blancos.slice(0, tower.chainCount).forEach((b) => {
              b.hp -= tower.dmg;
            });
          }
        }
      }
    }

    activosTemp = activosTemp.filter((en) => {
      if (en.hp <= 0) {
        dineroGanado += en.reward;
        addLog(`KILL: [${en.sigla}] +$${en.reward}.`);
        return false;
      }
      return true;
    });

    setDinero((d) => d + dineroGanado);
    setEnemigosActivos(activosTemp);

    if (colaTemp.length === 0 && activosTemp.length === 0) {
      const bonus = 10 + Math.floor(ola * 2);
      setDinero((d) => d + bonus);
      addLog(`CLEAR: Wave #${ola} +$${bonus}.`);
      setOla((o) => o + 1);
    }
  };

  const handleCellClick = (r, c) => {
    if (gameOver) return;
    if ((r === START_CELL.r && c === START_CELL.c) || (r === END_CELL.r && c === END_CELL.c)) return;

    const currentTower = grid[r][c];
    if (currentTower) {
      setTorreInspeccionada({ r, c, torre: currentTower });
      return;
    }

    const cfg = ARSENAL[torreSeleccionada];
    if (dinero < cfg.costo) {
      addLog(`ERR: Need $${cfg.costo}.`);
      return;
    }

    const testGrid = grid.map((row) => [...row]);
    testGrid[r][c] = {
      ...cfg,
      tipo: torreSeleccionada,
      nivel: 1,
      totalInvertido: cfg.costo
    };

    if (!calculatePath(testGrid)) {
      addLog('ERR: Blocked path.');
      return;
    }

    setDinero((d) => d - cfg.costo);
    setGrid(testGrid);
    setTorreInspeccionada({ r, c, torre: testGrid[r][c] });
    addLog(`SET: [${cfg.tag}1] at (${r},${c}).`);
  };

  const upgradeTorre = () => {
    if (!torreInspeccionada) return;
    const { r, c, torre } = torreInspeccionada;
    if (torre.nivel >= 3) return;

    const upCfg = torre.upgrades[torre.nivel - 1];
    if (dinero < upCfg.costo) {
      addLog(`ERR: Upgrade $${upCfg.costo}.`);
      return;
    }

    setDinero((d) => d - upCfg.costo);
    const updatedGrid = grid.map((row) => [...row]);
    const upgraded = {
      ...torre,
      nivel: torre.nivel + 1,
      dmg: upCfg.dmg,
      rango: upCfg.rango,
      slowTurnos: upCfg.slowTurnos || torre.slowTurnos,
      splashRadius: upCfg.splashRadius || torre.splashRadius,
      chainCount: upCfg.chainCount || torre.chainCount,
      totalInvertido: torre.totalInvertido + upCfg.costo
    };

    updatedGrid[r][c] = upgraded;
    setGrid(updatedGrid);
    setTorreInspeccionada({ r, c, torre: upgraded });
    addLog(`UP: (${r},${c}) -> T${upgraded.nivel}.`);
  };

  const sellTorre = () => {
    if (!torreInspeccionada) return;
    const { r, c, torre } = torreInspeccionada;

    const refund = Math.floor(torre.totalInvertido * 0.75);
    setDinero((d) => d + refund);
    const updatedGrid = grid.map((row) => [...row]);
    updatedGrid[r][c] = null;

    setGrid(updatedGrid);
    setTorreInspeccionada(null);
    addLog(`SELL: (${r},${c}) +$${refund}.`);
  };

  const reiniciar = () => {
    setVidas(20);
    setDinero(35);
    setOla(1);
    setTurnoTotal(0);
    setGameOver(false);
    setGrid(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setEnemigosActivos([]);
    setTorreInspeccionada(null);
    setLogs(['SYS_RESET: Baseline restored.']);
  };

  return (
    <div className="bg-[#0c1017] text-[#c9d1d9] font-mono text-[11px] p-4 max-w-2xl mx-auto select-none">
      
      {/* 1. STATUS LINE */}
      <div className="pb-2 mb-3 flex justify-between items-center text-[10px] text-[#8b949e]">
        <div className="flex space-x-3">
          <span>TTY: <b className="text-white">MAZE-01</b></span>
          <span>WAVE: <b className="text-blue-400">#{ola}</b></span>
          <span>TICK: <b className="text-slate-200">{turnoTotal}</b></span>
          <span>CORE: <b className={vidas < 6 ? 'text-rose-400' : 'text-emerald-400'}>{vidas}/20</b></span>
          <span>FUNDS: <b className="text-amber-300">${dinero}</b></span>
          <span>QUEUE: <b className="text-purple-300">{colaOleada.length}</b></span>
        </div>
        <span className="text-[#484f58]">[SPACE]: Step</span>
      </div>

      {/* 2. PLAIN ASCII MATRIX (20x12) - SIN FONDOS GRISES */}
      <div className="mb-4 flex flex-col items-center">
        <div className="flex flex-col space-y-[2px]">
          {grid.map((row, r) => (
            <div key={r} className="flex space-x-[2px]">
              {row.map((tower, c) => {
                const isStart = r === START_CELL.r && c === START_CELL.c;
                const isEnd = r === END_CELL.r && c === END_CELL.c;
                const enemigo = enemigosActivos.find((en) => en.r === r && en.c === c);

                let cellContent = '·';
                let cellStyle = 'text-[#30363d] hover:text-[#8b949e]';

                if (isStart) {
                  cellContent = 'IN';
                  cellStyle = 'text-emerald-400 font-bold';
                } else if (isEnd) {
                  cellContent = 'OUT';
                  cellStyle = 'text-rose-400 font-bold';
                } else if (enemigo) {
                  const pct = Math.max(0, Math.round((enemigo.hp / enemigo.maxHp) * 100));
                  cellContent = `${enemigo.sigla}${pct < 99 ? pct : ''}`;
                  cellStyle = `${enemigo.color} font-bold`;
                } else if (tower) {
                  cellContent = `${tower.tag}${tower.nivel}`;
                  cellStyle = `${tower.color} font-bold`;
                }

                return (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    className={`w-6 h-4 text-[9px] flex items-center justify-center transition-colors bg-transparent border-0 p-0 ${cellStyle}`}
                  >
                    {cellContent}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 3. LOWER CONTROLS - LÍNEAS PLANAS */}
      <div className="grid grid-cols-12 gap-3 text-[10px]">
        
        {/* Arsenal */}
        <div className="col-span-6 flex flex-col justify-between">
          <div className="grid grid-cols-6 gap-1">
            {Object.entries(ARSENAL).map(([key, cfg]) => {
              const isSelected = torreSeleccionada === key;
              const canAfford = dinero >= cfg.costo;

              return (
                <button
                  key={key}
                  onClick={() => {
                    setTorreSeleccionada(key);
                    setTorreInspeccionada(null);
                  }}
                  className={`p-1 text-center transition-all bg-transparent border-0 ${
                    !canAfford
                      ? 'opacity-25 cursor-not-allowed'
                      : isSelected
                      ? 'text-white underline font-bold'
                      : 'text-[#8b949e] hover:text-white'
                  }`}
                >
                  <div className={`font-bold text-[10px] ${canAfford ? cfg.color : 'text-[#484f58]'}`}>
                    [{cfg.tag}]
                  </div>
                  <div className={`text-[8px] font-bold ${canAfford ? 'text-amber-300' : 'text-rose-500/70'}`}>
                    ${cfg.costo}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-[8px] text-[#8b949e] truncate pt-1">
            {ARSENAL[torreSeleccionada].desc}
          </div>
        </div>

        {/* Action Panel */}
        <div className="col-span-3 flex flex-col justify-between">
          {torreInspeccionada ? (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px]">
                <span className="font-bold text-white">[{torreInspeccionada.torre.tag}]</span>
                <span className="text-blue-400">T{torreInspeccionada.torre.nivel}/3</span>
              </div>
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  onClick={upgradeTorre}
                  disabled={torreInspeccionada.torre.nivel >= 3}
                  className="text-emerald-400 disabled:text-[#484f58] text-[8px] font-bold bg-transparent border-0 text-left"
                >
                  {torreInspeccionada.torre.nivel >= 3 ? '[MAX]' : `[UP $${torreInspeccionada.torre.upgrades[torreInspeccionada.torre.nivel - 1].costo}]`}
                </button>
                <button
                  onClick={sellTorre}
                  className="text-rose-400 text-[8px] font-bold bg-transparent border-0 text-right"
                >
                  [SELL +${Math.floor(torreInspeccionada.torre.totalInvertido * 0.75)}]
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full">
              <div className="text-[9px] text-[#8b949e]">
                <span>State: </span>
                <b className={gameOver ? 'text-rose-400' : 'text-emerald-400'}>
                  {gameOver ? 'HALTED' : 'READY'}
                </b>
              </div>

              {gameOver ? (
                <button
                  onClick={reiniciar}
                  className="text-blue-400 font-bold text-[10px] bg-transparent border-0 text-left"
                >
                  [RELOAD_SYS]
                </button>
              ) : (
                <button
                  onClick={avanzarUnTurno}
                  className="text-[#58a6ff] hover:text-white font-bold text-[10px] bg-transparent border-0 text-left"
                >
                  $ ./step.sh
                </button>
              )}
            </div>
          )}
        </div>

        {/* Micro Console Log */}
        <div className="col-span-3 overflow-hidden flex flex-col justify-between">
          <div className="space-y-[1px] overflow-hidden text-[8px]">
            {logs.slice(0, 3).map((l, i) => (
              <div key={i} className="truncate text-[#8b949e]">
                &gt; {l}
              </div>
            ))}
          </div>
          <div className="text-[7px] text-[#484f58] pt-0.5">
            Thread: IDLE
          </div>
        </div>

      </div>

    </div>
  );
}
