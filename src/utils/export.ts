/**
 * CSV Export Utilities
 * 
 * Functions to export pot data to CSV format for:
 * - Debugging and testing
 * - Accounting/reconciliation
 * - Sharing with developers
 * - External analysis
 */

interface Member {
  id: string;
  name: string;
  role?: "Owner" | "Member";
  status?: "active" | "pending";
}

interface Expense {
  id: string;
  amount: number;
  currency: string;
  paidBy: string;
  memo: string;
  date: string;
  split: { memberId: string; amount: number }[];
  attestations: string[];
  hasReceipt: boolean;
  attestationTxHash?: string;
  attestationTimestamp?: string;
}

/**
 * Export pot expenses to CSV
 * 
 * @param potName - Name of the pot
 * @param expenses - Array of expenses to export
 * @param members - Array of pot members (for name lookup)
 * @param currentUserId - Current user's ID (default: "owner")
 */
export function exportPotExpensesToCSV(
  potName: string,
  expenses: Expense[],
  members: Member[],
  currentUserId: string = "owner"
): void {
  // Helper: Get member name by ID
  const getMemberName = (memberId: string): string => {
    if (memberId === "owner") return "You";
    const member = members.find(m => m.id === memberId);
    return member?.name || memberId;
  };

  // CSV Headers
  const headers = [
    "Date",
    "Memo",
    "Amount",
    "Currency",
    "Paid By",
    "Your Split",
    "Confirmed",
    "Receipt",
    "Attestation Status",
    "On-chain Hash",
  ];

  // Generate CSV rows
  const rows = expenses
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Newest first
    .map(expense => {
      // Format date
      const date = new Date(expense.date);
      const formattedDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });

      // Get current user's split
      const userSplit = expense.split.find(s => s.memberId === currentUserId);
      const yourSplit = userSplit ? userSplit.amount.toFixed(2) : "0.00";

      // Confirmed status
      const totalMembers = members.length;
      const confirmedCount = expense.attestations.length;
      const isFullyConfirmed = confirmedCount === totalMembers - 1; // Exclude payer
      const confirmedStatus = expense.paidBy === currentUserId
        ? `${confirmedCount}/${totalMembers - 1}`
        : expense.attestations.includes(currentUserId)
        ? "✓ Yes"
        : "Pending";

      // Receipt status
      const receiptStatus = expense.hasReceipt ? "✓ Yes" : "No";

      // Attestation status
      const attestationStatus = expense.attestationTxHash
        ? "On-chain"
        : "Off-chain";

      // On-chain hash (truncated if present)
      const onChainHash = expense.attestationTxHash
        ? `${expense.attestationTxHash.slice(0, 10)}...${expense.attestationTxHash.slice(-8)}`
        : "";

      return [
        formattedDate,
        expense.memo,
        expense.amount.toFixed(2),
        expense.currency,
        getMemberName(expense.paidBy),
        yourSplit,
        confirmedStatus,
        receiptStatus,
        attestationStatus,
        onChainHash,
      ];
    });

  // Convert to CSV string
  const csvContent = [
    headers.join(","),
    ...rows.map(row => 
      row.map(cell => {
        // Escape cells containing commas or quotes
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(",")
    ),
  ].join("\n");

  // Generate filename
  const sanitizedPotName = potName.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${sanitizedPotName}_expenses_${dateStr}.csv`;

  // Trigger download
  downloadCSV(csvContent, filename);
}

/**
 * Download CSV file to user's device
 * 
 * @param content - CSV content as string
 * @param filename - Desired filename
 */
function downloadCSV(content: string, filename: string): void {
  // Create blob
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export pot summary to CSV (for multiple pots)
 * 
 * @param pots - Array of pots to export
 */
export function exportPotsSummaryToCSV(
  pots: Array<{
    id: string;
    name: string;
    type: "expense" | "savings";
    expenses?: Expense[];
    members?: Member[];
    totalPooled?: number;
    baseCurrency: string;
  }>
): void {
  // CSV Headers
  const headers = [
    "Pot Name",
    "Type",
    "Members",
    "Total Expenses",
    "Expense Count",
    "Currency",
    "Your Balance",
  ];

  // Generate CSV rows
  const rows = pots.map(pot => {
    const memberCount = pot.members?.length || 0;
    const expenseCount = pot.expenses?.length || 0;
    
    const totalExpenses = pot.expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;
    
    // Calculate your balance (simplified)
    const yourExpenses = pot.expenses?.filter(e => e.paidBy === "owner").reduce((sum, e) => sum + e.amount, 0) || 0;
    const yourShare = pot.expenses?.reduce((sum, e) => {
      const split = e.split.find(s => s.memberId === "owner");
      return sum + (split?.amount || 0);
    }, 0) || 0;
    const yourBalance = yourExpenses - yourShare;

    return [
      pot.name,
      pot.type,
      memberCount,
      totalExpenses.toFixed(2),
      expenseCount,
      pot.baseCurrency,
      yourBalance.toFixed(2),
    ];
  });

  // Convert to CSV string
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => String(cell)).join(",")),
  ].join("\n");

  // Generate filename
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `chopdot_pots_summary_${dateStr}.csv`;

  // Trigger download
  downloadCSV(csvContent, filename);
}
