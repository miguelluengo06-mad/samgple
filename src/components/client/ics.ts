import { buildIcs } from '@/lib/booking';

/** Descarga un archivo .ics para añadir la llamada al calendario. */
export function downloadCallIcs(callId: string, callAt: string) {
  const ics = buildIcs({ uid: `${callId}@samgple`, start: new Date(callAt), title: 'Llamada con samgple', description: 'Llamada de 30 minutos (horario de Madrid).' });
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'llamada-samgple.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
