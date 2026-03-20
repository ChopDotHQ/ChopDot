import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export type HackathonReadinessItem = {
  id: string;
  label: string;
  detail: string;
  status: "pass" | "warn" | "fail";
};

interface HackathonReadinessCardProps {
  title: string;
  subtitle?: string;
  items: HackathonReadinessItem[];
}

export function HackathonReadinessCard({
  title,
  subtitle,
  items,
}: HackathonReadinessCardProps) {
  if (items.length === 0) return null;

  return (
    <div className="card p-4 space-y-3">
      <div>
        <p className="text-label font-medium">{title}</p>
        {subtitle && <p className="text-caption text-secondary mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const Icon =
            item.status === "pass" ? CheckCircle2 : item.status === "warn" ? Info : AlertTriangle;
          const color =
            item.status === "pass"
              ? "var(--success)"
              : item.status === "warn"
                ? "var(--accent)"
                : "var(--danger)";

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-border/40 bg-muted/10 p-3 flex items-start gap-3"
            >
              <Icon className="w-4 h-4 mt-0.5" style={{ color }} />
              <div>
                <p className="text-label font-medium">{item.label}</p>
                <p className="text-caption text-secondary">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
