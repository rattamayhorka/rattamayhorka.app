import { createClient } from '@supabase/supabase-js';

// Cliente Supabase seguro desde variables de entorno
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Lectura estricta de variables de entorno de Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function enviarTelegram(mensaje) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Faltan variables de entorno de Telegram (TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID).');
    return;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: mensaje,
      parse_mode: 'HTML'
    })
  });
}

export default async function handler(req, res) {
  try {
    const ahora = new Date();
    // Ajuste de zona horaria México (UTC-6)
    const tzOffset = -6 * 60;
    const ahoraLocal = new Date(ahora.getTime() + (ahora.getTimezoneOffset() + tzOffset) * 60000);

    const diaNum = String(ahoraLocal.getDate()).padStart(2, '0');
    const mesNum = String(ahoraLocal.getMonth() + 1).padStart(2, '0');
    const anioNum = ahoraLocal.getFullYear();
    const fechaHoyStr = `${diaNum}/${mesNum}/${anioNum}`;
    const diaDelMes = ahoraLocal.getDate();
    const diaDeSemana = ahoraLocal.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb

    const horaActualStr = ahoraLocal.toTimeString().substring(0, 5); // "HH:MM"
    const MINUTOS_ANTICIPACION = 5;

    // 1. REVISAR EVENTOS DE FUTURELOG (reuniones)
    const { data: reuniones, error: errReuniones } = await supabase
      .from('reuniones')
      .select('*');

    if (!errReuniones && reuniones) {
      for (const r of reuniones) {
        if (!r.hora) continue;

        let aplicaHoy = false;

        if (!r.tipo_recurrencia || r.tipo_recurrencia === 'unica') {
          if (r.fecha === fechaHoyStr) aplicaHoy = true;
        } else if (r.tipo_recurrencia === 'mensual_dia') {
          if (parseInt(r.dia_mes, 10) === diaDelMes) aplicaHoy = true;
        } else if (r.tipo_recurrencia === 'mensual_rango') {
          const dias = (r.dias_mes || '').split(',').map(n => parseInt(n.trim(), 10));
          if (dias.includes(diaDelMes)) aplicaHoy = true;
        } else if (r.tipo_recurrencia === 'semanal_dias') {
          const diasSem = (r.dias_semana || '').split(',').map(n => parseInt(n.trim(), 10));
          if (diasSem.includes(diaDeSemana)) aplicaHoy = true;
        }

        if (aplicaHoy) {
          const [hEvent, mEvent] = r.hora.split(':').map(Number);
          const [hNow, mNow] = horaActualStr.split(':').map(Number);
          const diffMinutos = (hEvent * 60 + mEvent) - (hNow * 60 + mNow);

          if (diffMinutos >= 0 && diffMinutos <= MINUTOS_ANTICIPACION) {
            const msg = `🗓️ <b>Recordatorio de Evento (en ${diffMinutos} min):</b>\n\n` +
                        `📌 <b>${r.comite}</b>\n` +
                        `⏰ <b>Hora:</b> ${r.hora}\n` +
                        `📍 <b>Lugar:</b> ${r.lugar || 'No especificado'}\n` +
                        `🏷️ <b>Entorno:</b> ${r.tipo || 'Trabajo'}`;

            await enviarTelegram(msg);
          }
        }
      }
    }

    // 2. REVISAR TAREAS KANBAN CON HORA PROGRAMADA
    const { data: tareas, error: errTareas } = await supabase
      .from('kanban')
      .select('*')
      .neq('status', 'Terminado')
      .neq('status', 'Bullet');

    if (!errTareas && tareas) {
      for (const t of tareas) {
        if (t.tarea && t.tarea.includes(';')) {
          const partes = t.tarea.split(';');
          const textoTarea = partes[0].trim();
          const horaTarea = partes[1].trim();

          if (horaTarea && horaTarea.includes(':')) {
            const [hTask, mTask] = horaTarea.split(':').map(Number);
            const [hNow, mNow] = horaActualStr.split(':').map(Number);
            const diff = (hTask * 60 + mTask) - (hNow * 60 + mNow);

            if (diff >= 0 && diff <= MINUTOS_ANTICIPACION) {
              const msg = `⚡ <b>Recordatorio de Tarea Kanban (en ${diff} min):</b>\n\n` +
                          `📌 <b>${textoTarea}</b>\n` +
                          `⏰ <b>Hora:</b> ${horaTarea}`;

              await enviarTelegram(msg);
            }
          }
        }
      }
    }

    return res.status(200).json({ success: true, timestamp: ahoraLocal.toISOString() });
  } catch (error) {
    console.error('Error en cron de notificaciones:', error);
    return res.status(500).json({ error: error.message });
  }
}