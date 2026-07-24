export enum UserRole {
  WORKSPACE_OWNER = 'workspace_owner',
  ADMIN = 'admin',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
}

export interface IUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  roles: Record<string, UserRole[]>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export class User implements IUser {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly displayName: string,
    public readonly photoUrl: string | undefined,
    public readonly roles: Record<string, UserRole[]>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly lastLoginAt: Date | undefined,
    public readonly isActive: boolean,
  ) {}

  getRoleForWorkspace(workspaceId: string): UserRole | undefined {
    const workspaceRoles = this.roles[workspaceId];
    if (!workspaceRoles || workspaceRoles.length === 0) return undefined;
    return workspaceRoles[0];
  }

  hasPermission(workspaceId: string, requiredRole: UserRole): boolean {
    const role = this.getRoleForWorkspace(workspaceId);
    if (!role) return false;
    const hierarchy = [
      UserRole.VIEWER,
      UserRole.DEVELOPER,
      UserRole.ADMIN,
      UserRole.WORKSPACE_OWNER,
    ];
    return hierarchy.indexOf(role) >= hierarchy.indexOf(requiredRole);
  }
}
