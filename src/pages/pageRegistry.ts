export type AppPage = {
  id: string;        // stable key used by Roles
  label: string;     // human readable
  path: string;      // route path
  adminOnly?: boolean;
  showInMenu?: boolean;
  /** Pages that are always accessible regardless of role config (e.g. profile, detail views) */
  alwaysAccessible?: boolean;
};

// Central registry of app pages. Add to this list when introducing new pages.
// This enables Roles to discover pages automatically.
export const appPages: AppPage[] = [
  { id: 'home',                    label: 'Home',                      path: '/' },
  { id: 'techDashboard',           label: 'Tech Dashboard',            path: '/tech-dashboard' },
  { id: 'labels',                  label: 'Labels',                    path: '/labels' },
  { id: 'quickCheck',              label: 'Quick Check',               path: '/quick-check' },
  { id: 'noCheck',                 label: 'No Check',                  path: '/no-check' },
  { id: 'vsi',                     label: 'VSI',                       path: '/vsi' },
  { id: 'stateInspections',        label: 'State Inspections',         path: '/state-inspection-records' },
  { id: 'activeStickers',          label: 'Active Stickers',           path: '/oil-change-stickers' },
  { id: 'archivedStaticStickers',  label: 'Archived Static Stickers',  path: '/oil-change-stickers/archived' },
  { id: 'archivedQuickCheck',      label: 'Archived Quick Check',      path: '/history' },
  { id: 'quickCheckRecords',       label: 'Quick Check Records',       path: '/quick-check-records' },
  { id: 'settings',                label: 'Settings',                  path: '/settings' },
  // Admin-only pages
  { id: 'labelManager',            label: 'Label Manager',             path: '/label-manager',                          adminOnly: true },
  { id: 'stateInspectionAnalytics',label: 'State Inspection Analytics',path: '/state-inspection-records?tab=2',         adminOnly: true },
  { id: 'databases',               label: 'Database',                  path: '/databases',                              adminOnly: true },
  { id: 'quickCheckDrafts',        label: 'Quick Check Drafts',        path: '/quick-check-drafts',                     adminOnly: true },
  { id: 'printTokenManager',       label: 'Print Token Manager',       path: '/print-token-manager',                    adminOnly: true },
  { id: 'printQueueArchive',       label: 'Print Queue Archive',       path: '/print-queue-archive',                    adminOnly: true },
  { id: 'roleManager',             label: 'Role Manager',              path: '/role-manager',                           adminOnly: true },
];

/**
 * Default page access per role.
 * Admins always have access to everything and bypass this map entirely.
 * These defaults are used when no Firestore override exists for a role.
 */
export const DEFAULT_ROLE_PAGES: Record<string, string[]> = {
  admin: appPages.map(p => p.id),
  manager: [
    'home', 'techDashboard', 'labels', 'quickCheck', 'noCheck', 'vsi',
    'stateInspections', 'activeStickers', 'archivedStaticStickers',
    'archivedQuickCheck', 'quickCheckRecords', 'settings',
    'quickCheckDrafts', 'printQueueArchive', 'stateInspectionAnalytics',
  ],
  service_advisor: [
    'home', 'labels', 'quickCheck', 'noCheck', 'vsi',
    'stateInspections', 'activeStickers', 'archivedStaticStickers',
    'archivedQuickCheck', 'quickCheckRecords', 'settings',
  ],
  technician: [
    'techDashboard', 'quickCheck', 'noCheck', 'vsi', 'settings',
  ],
};
