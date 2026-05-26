import { Link } from "@tanstack/react-router";

export function Logo({ size = "default" }: { size?: "default" | "lg" }) {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className={`relative ${size === "lg" ? "h-10 w-10" : "h-8 w-8"} rounded-lg bg-gradient-primary shadow-glow flex items-center justify-center font-display font-bold text-primary-foreground transition-transform group-hover:scale-105`}>
        <span className={size === "lg" ? "text-lg" : "text-sm"}>D</span>
      </div>
      <span className={`font-display font-bold ${size === "lg" ? "text-2xl" : "text-lg"} tracking-tight`}>
        Dev<span className="text-gradient">Collab</span>
      </span>
    </Link>
  );
}
