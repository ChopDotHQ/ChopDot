export const JOURNEYS = [
  { id: '01', slug: 'enter', name: 'Enter ChopDot', phase: 'Core loop', next: ['02','04'] },
  { id: '02', slug: 'home', name: 'Home / Orientation', phase: 'Core loop', next: ['03','04','05','08','10','11','16','27'] },
  { id: '03', slug: 'create-group', name: 'Create a Group', phase: 'Core loop', next: ['04','05','08'] },
  { id: '04', slug: 'invite', name: 'Invite / Join a Group', phase: 'Core loop', next: ['08','05','22'] },
  { id: '05', slug: 'add-expense', name: 'Add an Expense', phase: 'Core loop', next: ['06','07','08'] },
  { id: '06', slug: 'expense', name: 'Review / Correct an Expense', phase: 'Core loop', next: ['07','08'] },
  { id: '07', slug: 'review', name: 'Review / Agree / Raise an Issue', phase: 'Core loop', next: ['08','10','11','18'] },
  { id: '08', slug: 'group', name: 'Group Home', phase: 'Core loop', next: ['05','06','07','09','11','26'] },
  { id: '09', slug: 'people', name: 'Manage People', phase: 'Support', next: ['11','13','20'] },
  { id: '10', slug: 'position', name: 'Overall Position', phase: 'Core loop', next: ['08','09','11','13'] },
  { id: '11', slug: 'settle', name: 'Settle Up', phase: 'Core loop', next: ['12','20','21'] },
  { id: '12', slug: 'settlement-result', name: 'Complete Settlement', phase: 'Core loop', next: ['02','08','15'] },
  { id: '13', slug: 'request', name: 'Request Money', phase: 'Support', next: ['18','14'] },
  { id: '14', slug: 'receive', name: 'Receive / Share Payment Details', phase: 'Support', next: ['20','21','22'] },
  { id: '15', slug: 'settlement-history', name: 'Settlement History', phase: 'Support', next: ['08','09','12'] },
  { id: '16', slug: 'savings', name: 'Savings Group', phase: 'Expansion', next: ['17','18'] },
  { id: '17', slug: 'savings-action', name: 'Contribute / Withdraw Savings', phase: 'Expansion', next: ['16','18','21'] },
  { id: '18', slug: 'activity', name: 'Activity & Notifications', phase: 'Support', next: ['04','05','06','07','08','11','13','15'] },
  { id: '19', slug: 'insights', name: 'Insights', phase: 'Expansion', next: ['08','27'] },
  { id: '20', slug: 'payment-methods', name: 'Payment Methods', phase: 'Support', next: ['11','14','21','27'] },
  { id: '21', slug: 'wallet', name: 'Wallet & Crypto', phase: 'Support', next: ['11','12','14','17','27'] },
  { id: '22', slug: 'qr', name: 'QR Flows', phase: 'Expansion', next: ['04','09','14'] },
  { id: '23', slug: 'import', name: 'Import Data / Group', phase: 'Expansion', next: ['08','24','28'] },
  { id: '24', slug: 'export', name: 'Export / Portability', phase: 'Expansion', next: [] },
  { id: '25', slug: 'storage', name: 'Storage / Backup / Recovery', phase: 'Expansion', next: ['27','28'] },
  { id: '26', slug: 'group-settings', name: 'Group Lifecycle', phase: 'Support', next: ['02','08','24'] },
  { id: '27', slug: 'account', name: 'Account & Preferences', phase: 'Expansion', next: ['01','19','20','21','23','25'] },
  { id: '28', slug: 'recovery', name: 'Things Go Wrong / Recovery', phase: 'Cross-cutting', next: [] },
];

export const JOURNEY_BY_ID = new Map(JOURNEYS.map((journey) => [journey.id, journey]));
export const JOURNEY_BY_SLUG = new Map(JOURNEYS.map((journey) => [journey.slug, journey]));

export function routeForJourney(id) {
  return JOURNEY_BY_ID.get(id)?.slug ?? 'home';
}
