import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";

export function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="text-base tracking-tight">
            Pollution Guardian <span className="text-primary">AI</span>
          </span>
        </Link>
        <nav className="hidden gap-1 sm:flex">
          {[
            { to: "/", label: "Home" },
            { to: "/report", label: "Report" },
            { to: "/dashboard", label: "Live Map" },
            { to: "/alerts", label: "Officials" },
          ].map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              activeProps={{ className: "bg-accent text-accent-foreground font-medium" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/report"
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:hidden"
        >
          Report
        </Link>
      </div>
    </header>
  );
}
