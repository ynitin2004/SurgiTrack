export default function Card({ title, subtitle, icon: Icon, action, children, className = '', padded = true }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface shadow-card ${padded ? 'p-5 md:p-6' : ''} ${className}`}>
      {title && (
        <header className={`mb-5 flex flex-wrap items-start justify-between gap-3 ${padded ? '' : 'px-5 pt-5 md:px-6 md:pt-6'}`}>
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="mt-0.5 rounded-lg bg-brand-wash p-2 text-brand" aria-hidden>
                <Icon size={16} />
              </span>
            )}
            <div>
              <h2 className="text-[0.95rem] font-bold text-ink">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
