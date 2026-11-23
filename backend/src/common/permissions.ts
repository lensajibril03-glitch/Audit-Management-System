export type Permission =
  | 'dashboard.view'
  | 'reports.view'
  | 'reports.create'
  | 'reports.edit'
  | 'reports.export'
  | 'recommendations.assign'
  | 'followup.view.all'
  | 'followup.view.assigned'
  | 'followup.submit'
  | 'followup.export'
  | 'justification.submit'
  | 'recommendations.close'
  | 'recommendations.reopen'
  | 'department.view'
  | 'archive.view'
  | 'archive.manage'
  | 'archive.export'
  | 'admin.users.manage'
  | 'admin.roles.manage'
  | 'admin.reference.manage'
  | 'notifications.manage';

type RolesMap = Record<string, Permission[]>;

const rolePermissions: RolesMap = {
  Audit: ['dashboard.view', 'reports.view', 'followup.view.assigned', 'followup.submit', 'justification.submit', 'archive.view'],
  'Audit Analyst': [
    'dashboard.view',
    'reports.view',
    'reports.create',
    'reports.edit',
    'reports.export',
    'recommendations.assign',
    'followup.view.all',
    'followup.export',
    'recommendations.close',
    'archive.view',
    'archive.manage',
    'archive.export',
  ],
  'Audit Supervisor': [
    'dashboard.view',
    'reports.view',
    'reports.export',
    'followup.view.all',
    'followup.export',
    'recommendations.reopen',
    'archive.view',
    'archive.manage',
    'archive.export',
  ],
  'Department Head': ['dashboard.view', 'reports.view', 'reports.export', 'department.view', 'archive.view', 'archive.export'],
  'System Admin': ['admin.users.manage', 'admin.roles.manage', 'admin.reference.manage', 'notifications.manage'],
};

export function hasPermission(roles: string[], permission: Permission): boolean {
  for (const role of roles) {
    if ((rolePermissions[role] ?? []).includes(permission)) {
      return true;
    }
  }
  return false;
}
