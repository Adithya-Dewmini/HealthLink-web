import type { PropsWithChildren, ReactNode } from "react";

type CardProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  accent?: boolean;
}>;

export default function Card({ action, accent = false, children, subtitle, title }: CardProps) {
  return (
    <section className={`card${accent ? " card-accent" : ""}`}>
      {(title || subtitle || action) && (
        <div className="card-header">
          <div>
            {subtitle ? <p className="card-subtitle">{subtitle}</p> : null}
            {title ? <h3 className="card-title">{title}</h3> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
