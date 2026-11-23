export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  departmentId: string | null;
};
