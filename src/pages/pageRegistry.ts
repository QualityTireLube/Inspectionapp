export type AppPage = {
  id: string;        // stable key used by Roles
  label: string;     // human readable
  path: string;      // route path
  adminOnly?: boolean;
  showInMenu?: boolean;
};

// Central registry of app pages. Add to this list when introducing new pages.
// This enables Roles to discover pages automatically.
export const appPages: AppPage[] = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'techDashboard', label: 'Tech Dashboard', path: '/tech-dashboard' },
  { id: 'labels', label: 'Labels', path: '/labels' },
  { id: 'quickCheck', label: 'Quick Check', path: '/quick-check' },
  { id: 'noCheck', label: 'No Check', path: '/no-check' },
  { id: 'vsi', label: 'VSI', path: '/vsi' },
  { id: 'stateInspections', label: 'State Inspections', path: '/state-inspection-records' },
  { id: 'archivedStaticStickers', label: 'Archived Static Stickers', path: '/oil-change-stickers/archived' },
  { id: 'archivedQuickCheck', label: 'Archived Quick Check', path: '/history' },
  { id: 'labelManager', label: 'Label Manager', path: '/label-manager', adminOnly: true },
  { id: 'shopmonkey', label: 'ShopMonkey', path: '/shopmonkey' },
  { id: 'shopmonkeyAdmin', label: 'ShopMonkey Admin', path: '/shopmonkey-admin', adminOnly: true },
  { id: 'stateInspectionAnalytics', label: 'State Inspection Analytics', path: '/state-inspection-records?tab=2', adminOnly: true },
  { id: 'databases', label: 'Database', path: '/databases', adminOnly: true },
  { id: 'quickCheckDrafts', label: 'Quick Check Drafts', path: '/quick-check-drafts', adminOnly: true },
  { id: 'printTokenManager', label: 'Print Token Manager', path: '/print-token-manager', adminOnly: true },
  // Removed Parts Ordering page
  { id: 'settings', label: 'Settings', path: '/settings' },
];


