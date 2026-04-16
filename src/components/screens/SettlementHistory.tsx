import { TopBar } from "../TopBar";
import { Download, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "../EmptyState";
import { exportSettlementHistoryToCSV } from "../../utils/export";
import { formatCurrencyAmount } from "../../utils/currencyFormat";
import type { SettlementLeg } from "../../types/app";
import { useChapterState } from "../../hooks/useChapterState";

// ─── Legacy settlement (from the old Settlement[] array) ──────────────────────

interface LegacySettlement {
  id: string;
  method: "cash" | "bank" | "paypal" | "twint";
  personName: string;
  amount: number;
  currency: string;
  date: string;
  potNames?: string[];
  personId?: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SettlementHistoryProps {
  settlements: LegacySettlement[];
  legs?: SettlementLeg[];          // typed legs (passed in or self-loaded when potId given)
  potId?: string;                  // when provided, legs are self-loaded via useChapterState
  members?: Array<{ id: string; name: string }>;
  currentUserId?: string;
  baseCurrency?: string;
  onBack: () => void;
  personId?: string;
  onRetryProof?: (settlementId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  paypal: "PayPal",
  twint: "TWINT",
};

const LEG_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid — awaiting confirmation",
  confirmed: "Confirmed",
};

const LEG_STATUS_COLORS: Record<string, string> = {
  pending: "var(--text-secondary)",
  paid: "var(--accent)",
  confirmed: "var(--success)",
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getMemberName(
  members: Array<{ id: string; name: string }>,
  id: string,
  currentUserId?: string,
): string {
  if (id === currentUserId) return "You";
  return members.find(m => m.id === id)?.name ?? id.slice(0, 8);
}

// ─── Typed leg card ───────────────────────────────────────────────────────────

function LegCard({
  leg,
  members,
  currentUserId,
  baseCurrency,
}: {
  leg: SettlementLeg;
  members: Array<{ id: string; name: string }>;
  currentUserId?: string;
  baseCurrency: string;
}) {
  const fromName = getMemberName(members, leg.fromMemberId, currentUserId);
  const toName = getMemberName(members, leg.toMemberId, currentUserId);
  const amountStr = formatCurrencyAmount(leg.amount, baseCurrency);
  const statusColor = LEG_STATUS_COLORS[leg.status] ?? "var(--text-secondary)";

  return (
    <div className="p-4 card rounded-xl space-y-2 card-hover-lift transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-label font-medium truncate">{fromName}</span>
          <ArrowRight className="w-3 h-3 flex-shrink-0 text-secondary" />
          <span className="text-label font-medium truncate">{toName}</span>
        </div>
        <span className="text-[18px] tabular-nums font-bold flex-shrink-0 ml-2">{amountStr}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {leg.status === "confirmed" ? (
          <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
        ) : (
          <Clock className="w-3.5 h-3.5" style={{ color: statusColor }} />
        )}
        <span className="text-caption" style={{ color: statusColor }}>
          {LEG_STATUS_LABELS[leg.status] ?? leg.status}
        </span>
      </div>

      <div className="pt-2 border-t border-border space-y-0.5">
        <div className="flex justify-between text-caption text-secondary">
          <span>Proposed</span>
          <span>{formatDate(leg.createdAt)}</span>
        </div>
        {leg.paidAt && (
          <div className="flex justify-between text-caption text-secondary">
            <span>Paid</span>
            <span>
              {leg.method ? `${METHOD_LABELS[leg.method] ?? leg.method} · ` : ""}
              {formatDate(leg.paidAt)}
            </span>
          </div>
        )}
        {leg.confirmedAt && (
          <div className="flex justify-between text-caption text-secondary">
            <span>Confirmed</span>
            <span>{formatDate(leg.confirmedAt)}</span>
          </div>
        )}
        {leg.reference && (
          <div className="flex justify-between text-caption text-secondary">
            <span>Reference</span>
            <span>{leg.reference}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legacy settlement card ───────────────────────────────────────────────────

function LegacyCard({ settlement }: { settlement: LegacySettlement }) {
  return (
    <div className="p-4 card rounded-xl space-y-2 card-hover-lift transition-shadow duration-200 hover:shadow-[var(--shadow-fab)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-label font-semibold">{METHOD_LABELS[settlement.method] ?? settlement.method}</p>
          <p className="text-micro text-secondary mt-0.5">{formatDate(settlement.date)}</p>
        </div>
        <div className="text-right">
          <p className="text-[18px] tabular-nums font-bold">
            ${settlement.amount.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="pt-2 border-t border-border space-y-0.5">
        <div className="flex justify-between text-caption text-secondary">
          <span>Person</span>
          <span>{settlement.personName}</span>
        </div>
        {settlement.potNames && settlement.potNames.length > 0 && (
          <div className="flex justify-between text-caption text-secondary">
            <span>Pots</span>
            <span className="text-right">{settlement.potNames.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SettlementHistory({
  settlements,
  legs: legsProp = [],
  potId,
  members = [],
  currentUserId,
  baseCurrency = "USD",
  onBack,
  personId,
}: SettlementHistoryProps) {
  // Self-load typed legs from Supabase when potId is provided
  const { legs: loadedLegs } = useChapterState({
    potId,
    currentUserId: currentUserId ?? '',
  });
  const legs = legsProp.length > 0 ? legsProp : loadedLegs;
  const filteredLegacy = useMemo(() => {
    if (!personId) return settlements;
    return settlements.filter((s: any) => {
      const matchById = typeof s.personId === "string" && s.personId === personId;
      const matchByName =
        s.personName && s.personName.toLowerCase() === personId.toLowerCase();
      return matchById || matchByName;
    });
  }, [settlements, personId]);

  // Filter legs: if personId is a member ID, show only legs involving that member
  const filteredLegs = useMemo(() => {
    if (!personId) return legs;
    return legs.filter(l => l.fromMemberId === personId || l.toMemberId === personId);
  }, [legs, personId]);

  const isEmpty = filteredLegacy.length === 0 && filteredLegs.length === 0;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={personId ? "Settlements" : "Settlement History"}
        onBack={onBack}
      />
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {isEmpty ? (
          <div className="pt-8">
            <EmptyState
              icon={CheckCircle}
              message="No settlements yet"
              description="Your settlement history will appear here once you propose a chapter"
            />
          </div>
        ) : (
          <>
            {/* Typed legs first — they carry the full commitment story */}
            {filteredLegs.map(leg => (
              <LegCard
                key={leg.id}
                leg={leg}
                members={members}
                currentUserId={currentUserId}
                baseCurrency={baseCurrency}
              />
            ))}

            {/* Legacy settlements below */}
            {filteredLegacy.map(settlement => (
              <LegacyCard key={settlement.id} settlement={settlement} />
            ))}
          </>
        )}
      </div>
      <div className="p-4 border-t border-border">
        <button
          onClick={() => exportSettlementHistoryToCSV(filteredLegacy)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-body font-medium card card-hover-lift transition-all"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
    </div>
  );
}
