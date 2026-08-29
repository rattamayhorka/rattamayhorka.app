import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function enviarTelegram(mensaje) {
  if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) {
    console.error('Faltan variables de entorno de Telegram.');
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
    // 1. Obtener la hora y fecha exacta en la zona horaria de México
    const ahora = new Date();
    const formatoMexico = new Intl.DateTimeFormat('es-MX', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(ahora);

    const partes = {};
    formatoMexico.forEach(p => partes[p.type] = p.value);

    const diaNum = partes.day;
    const mesNum = partes.month;
    const anioNum = partes.year;
    
    // Soporte para ambos formatos de fecha
    const fechaSlash = `${diaNum}/${mesNum}/${anioNum}`; // "29/08/2026"
    const fechaDash = `${anioNum}-${mesNum}-${diaNum}`;  // "2026-08-29"

    const diaDelMes = parseInt(diaNum, 10);
    
    // Calcular día de la semana en México (0=Dom, 1=Lun, ..., 6=Sáb)
    const fechaObjLocal = new Date(`${anioNum}-${mesNum}-${diaNum}T12:00:00`);
    const diaDeSemana = fechaObjLocal.getDay();

    const horaActualStr = `${partes.hour}:${partes.minute}`;
    const [hNow, mNow] = [parseInt(partes.hour, 10), parseInt(partes.minute, 10)];
    const MINUTOS_ANTICIPACION = 5;

    let notificacionesEnviadas = 0;

    // 2. REVISAR EVENTOS DE FUTURELOG (reuniones)
    const { data: reuniones, error: errReuniones } = await supabase
      .from('reuniones')
      .select('*');

    if (!errReuniones && reuniones) {
      for (const r of reuniones) {
        if (!r.hora) continue;

        let aplicaHoy = false;
        const fechaEvento = (r.fecha || '').trim();

        // Normalización y chequeo de recurrencia
        if (!r.tipo_recurrencia || r.tipo_recurrencia === 'unica') {
          if (fechaEvento === fechaSlash || fechaEvento === fechaDash) {
            aplicaHoy = true;
          }
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
          const diffMinutos = (hEvent * 60 + mEvent) - (hNow * 60 + mNow);

          // Si el evento ocurre en los próximos 0 a 5 minutos
          if (diffMinutos >= 0 && diffMinutos <= MINUTOS_ANTICIPACION) {
            const msg = `🗓️ <b>Recordatorio de Evento (en ${diffMinutos} min):</b>\n\n` +
                        `📌 <b>${r.comite}</b>\n` +
                        `⏰ <b>Hora:</b> ${r.hora}\n` +
                        `📍 <b>Lugar:</b> ${r.lugar || 'No especificado'}\n` +
                        `🏷️ <b>Entorno:</b> ${r.tipo || 'Trabajo'}`;

            await enviarTelegram(msg);
            notificacionesEnviadas++;
          }
        }
      }
    }

    // 3. REVISAR TAREAS KANBAN CON HORA PROGRAMADA
    const { data: tareas, error: errTareas } = await supabase
      .from('kanban')
      .select('*')
      .neq('status', 'Terminado')
      .neq('status', 'Bullet');

    if (!errTareas && tareas) {
      for (const t of tareas) {
        if (t.tarea && t.tarea.includes(';')) {
          const partesT = t.tarea.split(';');
          const textoTarea = partesT[0].trim();
          const horaTarea = partesT[1].trim();

          if (horaTarea && horaTarea.includes(':')) {
            const [hTask, mTask] = horaTarea.split(':').map(Number);
            const diff = (hTask * 60 + mTask) - (hNow * 60 + mNow);

            if (diff >= 0 && diff <= MINUTOS_ANTICIPACION) {
              const msg = `⚡ <b>Recordatorio de Tarea Kanban (en ${diff} min):</b>\n\n` +
                          `📌 <b>${textoTarea}</b>\n` +
                          `⏰ <b>Hora:</b> ${horaTarea}`;

              await enviarTelegram(msg);
              notificacionesEnviadas++;
            }
          }
        }
      }
    }

    return res.status(200).json({ 
      success: true, 
      hora_mexico: horaActualStr,
      fecha_mexico: fechaSlash,
      notificaciones_enviadas: notificacionesEnviadas 
    });
  } catch (error) {
    console.error('Error en cron de notificaciones:', error);
    return res.status(500).json({ error: error.message });
  }
}