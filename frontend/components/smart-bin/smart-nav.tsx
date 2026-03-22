import Link from "next/link";
import { MapPin, Recycle } from "lucide-react";

const navItems = [
  { label: "Overview", href: "#overview" },
  { label: "Stats", href: "#stats" },
  { label: "Map", href: "#map" },
  { label: "Alerts", href: "#alerts" },
  { label: "Bins", href: "#bins" },
];

export default function SmartNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--ops-divider)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        <a href="#overview" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ops-accent)] text-white">
            <Recycle className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-slate-900">SenSight Bin</div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Control Center</div>
          </div>
        </a>

        <div className="hidden items-center gap-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-500 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="transition-colors hover:text-slate-900"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/bin-test"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--ops-divider-strong)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[var(--ops-accent)] hover:text-[var(--ops-accent)]"
          >
            <MapPin className="h-4 w-4" />
            Bin test
          </Link>
        </div>
      </div>
    </nav>
  );
}
