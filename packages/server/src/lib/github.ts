export type GithubUser = {
  login: string
  id: number
  avatar_url: string
  name: string
  email: string
}

export type GithubEmail = {
  email: string
  primary: boolean
  verified: boolean
}

export async function getAccessToken(code: string, clientId: string, clientSecret: string): Promise<string> {
  const resp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  })
  if (!resp.ok) throw new Error(`GitHub OAuth token exchange failed: ${resp.status}`)
  const data = await resp.json()
  if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`)
  return data.access_token
}

export async function getUser(token: string): Promise<GithubUser> {
  const resp = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok) throw new Error(`GitHub API user failed: ${resp.status}`)
  return resp.json()
}

export async function getUserEmails(token: string): Promise<GithubEmail[]> {
  const resp = await fetch('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok) throw new Error(`GitHub API emails failed: ${resp.status}`)
  return resp.json()
}

export async function isOrgMember(token: string, org: string): Promise<boolean> {
  const resp = await fetch(`https://api.github.com/orgs/${org}/members`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  // 204 = member, 302/404 = not found, 403 = no access
  return resp.status === 204
}

export async function checkMembership(token: string, org: string, username: string): Promise<boolean> {
  const resp = await fetch(`https://api.github.com/orgs/${org}/members/${username}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return resp.status === 204
}
