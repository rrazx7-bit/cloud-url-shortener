const ROLE_PERMISSIONS = { admin: ["admin:page", "stats:read"] };

// 인가: 인증된 사용자가 요청한 기능을 사용할 수 있는지 확인합니다.
export function authorize(user, permission) {
  const permissions = user ? ROLE_PERMISSIONS[user.role] : null;
  return Array.isArray(permissions) && permissions.includes(permission);
}
