export const validUserRoles = ["admin", "moderator", "visitor"] as const;

export type IUserRole = (typeof validUserRoles)[number];
