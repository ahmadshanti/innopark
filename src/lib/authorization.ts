import type { Profile, UserRole } from '../types/db';

type AccessProfile = Pick<Profile, 'role' | 'status'>;

const ROLE_HOME: Record<UserRole, '/admin' | '/judge'> = {
  admin: '/admin',
  judge: '/judge',
};

export function getHomePathForRole(role: UserRole) {
  return ROLE_HOME[role];
}

export function isApprovedProfile(
  profile: AccessProfile | null | undefined,
): profile is AccessProfile & { status: 'approved' } {
  return !!profile && profile.status === 'approved';
}

export function isAdminProfile(profile: AccessProfile | null | undefined) {
  return isApprovedProfile(profile) && profile.role === 'admin';
}

export function isJudgeProfile(profile: AccessProfile | null | undefined) {
  return isApprovedProfile(profile) && profile.role === 'judge';
}

export function getProfileAccessError(profile: AccessProfile | null | undefined) {
  if (!profile) return 'حسابك غير موجود في النظام';
  return isApprovedProfile(profile) ? null : 'الحساب غير مفعّل. تواصل مع الأدمن';
}
