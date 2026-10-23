'use client';

export default function KineticWordmark({ name, className = '' }: { name: string; className?: string }) {
  // La última letra y el punto son la marca: samgpl(e.) — el punto parpadea como un REC
  const body = name.slice(0, -1) || name;
  const last = name.slice(-1);

  return (
    <span className={`font-kinetic font-black lowercase inline-flex items-center tracking-tight ${className}`}>
      {body}
      <span className="text-[var(--signal)]">{last}</span>
      <span aria-hidden="true" className="rec-dot ml-[3px]" style={{ width: '0.28em', height: '0.28em' }} />
    </span>
  );
}
