/**
 * Role-Based Access Control (RBAC) definitions.
 *
 * Defines all user roles, their permissions, and helper functions
 * for checking access levels throughout the app.  The hierarchy from
 * most to least privileged is:
 *   Business Owner > Admin > Operations > Dev Support > Customer Support > Client > User
 */

/** Internal enum of all role keys used in Firestore and custom claims. */
const ROLE_KEYS = {
  BUSINESS_OWNER: 'business_owner',
  ADMIN: 'admin',
  OPERATIONS: 'operations',
  DEVELOPER_SUPPORT: 'developer_support',
  CUSTOMER_SUPPORT: 'customer_support',
  CLIENT: 'client',
  USER: 'user',
};

export const PERMISSIONS = {
  MANAGE_TEAM: 'manage_team',
  MANAGE_MONEY: 'manage_money',
  MANAGE_OPERATIONS: 'manage_operations',
  MANAGE_CONTENT: 'manage_content',
  HANDLE_TECHNICAL_SUPPORT: 'handle_technical_support',
  HANDLE_CUSTOMER_SUPPORT: 'handle_customer_support',
  VIEW_CLIENT_WORKSPACE: 'view_client_workspace',
};

export const ROLE_DEFINITIONS = [
  {
    key: ROLE_KEYS.BUSINESS_OWNER,
    label: 'Business Owner',
    category: 'Internal leadership',
    summary: 'Owns the workspace and has full access to people, money, settings, and operations.',
    permissions: Object.values(PERMISSIONS),
    recommendedFor: 'Founder, managing director, or account owner',
    color: 'purple',
  },
  {
    key: ROLE_KEYS.ADMIN,
    label: 'Admin',
    category: 'Internal leadership',
    summary: 'Full dashboard access for trusted leaders who help run the business day to day.',
    permissions: Object.values(PERMISSIONS),
    recommendedFor: 'General manager, senior team lead, or trusted operator',
    color: 'blue',
  },
  {
    key: ROLE_KEYS.OPERATIONS,
    label: 'Operations',
    category: 'Internal team',
    summary: 'Runs the workflow, content queue, opportunities, challenges, and user support without moving money.',
    permissions: [
      PERMISSIONS.MANAGE_TEAM,
      PERMISSIONS.MANAGE_OPERATIONS,
      PERMISSIONS.MANAGE_CONTENT,
      PERMISSIONS.HANDLE_CUSTOMER_SUPPORT,
      PERMISSIONS.VIEW_CLIENT_WORKSPACE,
    ],
    recommendedFor: 'Operations manager, project coordinator, or community lead',
    color: 'emerald',
  },
  {
    key: ROLE_KEYS.DEVELOPER_SUPPORT,
    label: 'Developer Support',
    category: 'Internal support',
    summary: 'Helps with integrations, technical bugs, uploads, webhooks, and platform troubleshooting.',
    permissions: [
      PERMISSIONS.HANDLE_TECHNICAL_SUPPORT,
      PERMISSIONS.VIEW_CLIENT_WORKSPACE,
    ],
    recommendedFor: 'Engineer, integration partner, or technical support teammate',
    color: 'indigo',
  },
  {
    key: ROLE_KEYS.CUSTOMER_SUPPORT,
    label: 'Customer Support',
    category: 'Internal support',
    summary: 'Supports learners, creators, clients, and day-to-day customer questions with limited access.',
    permissions: [
      PERMISSIONS.HANDLE_CUSTOMER_SUPPORT,
      PERMISSIONS.VIEW_CLIENT_WORKSPACE,
    ],
    recommendedFor: 'Support agent, community helper, or client success teammate',
    color: 'amber',
  },
  {
    key: ROLE_KEYS.CLIENT,
    label: 'Client',
    category: 'Client workspace',
    summary: 'External business or institution contact who can follow their projects, plans, and deliverables.',
    permissions: [PERMISSIONS.VIEW_CLIENT_WORKSPACE],
    recommendedFor: 'Sponsor, institution contact, hiring partner, or paying customer',
    color: 'pink',
  },
  {
    key: ROLE_KEYS.USER,
    label: 'User',
    category: 'Community',
    summary: 'Default community member access for learners, creators, and public app users.',
    permissions: [],
    recommendedFor: 'Standard app member',
    color: 'slate',
  },
];

/** Dropdown-friendly array: [{ value: 'admin', label: 'Admin' }, …]. */
export const ROLE_OPTIONS = ROLE_DEFINITIONS.map(({ key, label }) => ({ value: key, label }));

/** Flat array of every valid role key string. */
export const VALID_ROLE_KEYS = ROLE_DEFINITIONS.map((role) => role.key);

/** Roles that can manage other users' roles and accounts. */
export const TEAM_MANAGEMENT_ROLES = [ROLE_KEYS.BUSINESS_OWNER, ROLE_KEYS.ADMIN, ROLE_KEYS.OPERATIONS];
const ADMIN_DASHBOARD_ROLES = [
  ROLE_KEYS.BUSINESS_OWNER,
  ROLE_KEYS.ADMIN,
  ROLE_KEYS.OPERATIONS,
  ROLE_KEYS.DEVELOPER_SUPPORT,
  ROLE_KEYS.CUSTOMER_SUPPORT,
];

/**
 * Returns the full role definition object for a given role key.
 * Falls back to the 'user' definition if the key is unknown.
 *
 * @param {string} roleKey - One of the ROLE_KEYS values.
 * @returns {Object} The matching role definition.
 */
export const getRoleDefinition = (roleKey) => (
  ROLE_DEFINITIONS.find((role) => role.key === roleKey) || ROLE_DEFINITIONS.find((role) => role.key === ROLE_KEYS.USER)
);

/**
 * Returns the human-readable label for a role key (e.g. 'admin' → 'Admin').
 * @param {string} roleKey
 * @returns {string}
 */
export const formatRoleLabel = (roleKey) => getRoleDefinition(roleKey)?.label || 'User';

/**
 * Returns true if the role has team-management permissions
 * (Business Owner, Admin, or Operations).
 * @param {string} roleKey
 * @returns {boolean}
 */
export const canManageTeam = (roleKey) => TEAM_MANAGEMENT_ROLES.includes((roleKey || '').toLowerCase());

/**
 * Returns true if the role has access to the admin dashboard
 * (includes support roles in addition to management roles).
 * @param {string} roleKey
 * @returns {boolean}
 */
export const hasAdminDashboardAccess = (roleKey) => ADMIN_DASHBOARD_ROLES.includes((roleKey || '').toLowerCase());

