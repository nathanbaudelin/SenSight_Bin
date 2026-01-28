import Link from "next/link";
import { MapPin, Recycle } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Overview", href: "#overview" },
  { label: "Stats", href: "#stats" },
  { label: "Map", href: "#map" },
  { label: "Alerts", href: "#alerts" },
  { label: "Bins", href: "#bins" },
];

export default function SmartNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/40 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#overview" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <Recycle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-semibold text-slate-900">Smart Waste IoT</div>
            <div className="text-xs text-slate-500">Barcelona City Ops</div>
          </div>
        </a>

        <div className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
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
          <Button
            size="sm"
            className="rounded-full bg-slate-900 text-white hover:bg-slate-800"
            asChild
          >
            <Link href="/bin-test">
              <MapPin className="h-4 w-4" />
              Bin test
            </Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
