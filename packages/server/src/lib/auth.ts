import type { UserRecord } from './firebase.js'

const LOCAL_ADMIN: UserRecord = {
  uid: 'local',
  email: 'local@localhost',
  displayName: 'Local Admin',
  createdAt: 0,
  lastLoginAt: 0,
  role: 'admin',
  enabled: true,
}

export async function getServerSession(): Promise<UserRecord> {
  return LOCAL_ADMIN
}

export function requireRole(_user: UserRecord | null, ..._roles: string[]): boolean {
  return true
}
