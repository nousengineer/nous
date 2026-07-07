import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import type { ServiceAccount } from 'firebase-admin'
import type { ServerConfig } from './config.js'

let ready = false

export function initFirebase(config: ServerConfig) {
  if (ready) return
  if (!config.firebase.serviceAccount) {
    console.warn('Firebase: FIREBASE_SERVICE_ACCOUNT not set')
    return
  }
  if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(config.firebase.serviceAccount) as ServiceAccount) })
  }
  ready = true
}

export function isFirebaseReady(): boolean { return ready }

export async function verifyFirebaseToken(token: string) {
  if (!ready) return null
  try { return await getAuth().verifyIdToken(token) } catch { return null }
}

export interface UserRecord {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  createdAt: number
  lastLoginAt: number
  role: 'admin' | 'user'
  enabled: boolean
  githubLogin?: string
}

export async function getOrCreateUser(uid: string, email?: string, displayName?: string, photoURL?: string) {
  const db = getFirestore()
  const ref = db.collection('users').doc(uid)
  const snap = await ref.get()
  if (snap.exists) {
    await ref.update({ lastLoginAt: Date.now() })
    return { uid, ...snap.data() } as UserRecord
  }
  const user: UserRecord = {
    uid, email: email || '', displayName: displayName || '', photoURL,
    createdAt: Date.now(), lastLoginAt: Date.now(), role: 'user', enabled: true,
  }
  await ref.set(user)
  return user
}

export async function listUsers(limit = 50, startAfter?: string) {
  const db = getFirestore()
  let q: FirebaseFirestore.Query = db.collection('users').orderBy('createdAt', 'desc').limit(limit)
  if (startAfter) {
    const s = await db.collection('users').doc(startAfter).get()
    if (s.exists) q = q.startAfter(s)
  }
  const snap = await q.get()
  return snap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserRecord[]
}

export async function updateUser(uid: string, data: Partial<UserRecord>) {
  await getFirestore().collection('users').doc(uid).update(data)
}

export async function deleteUser(uid: string) {
  await Promise.all([
    getAuth().deleteUser(uid),
    getFirestore().collection('users').doc(uid).delete(),
  ])
}
