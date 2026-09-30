export default function Marquee({ items, className = '' }: { items: React.ReactNode[]; className?: string }) {
  return (
    <div className={`overflow-hidden ${className}`}>
      <div className="home-marquee-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center shrink-0" aria-hidden={copy === 1}>
            {items.map((item, i) => (
              <div key={i} className="flex items-center shrink-0">
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
