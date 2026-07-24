const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export const api = {
  engine: {
    command: (message: string) =>
      fetch(`${API_BASE}/engine/command`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message }),
      }).then((r) => r.json()),
  },
  auth: {
    login: (token: string) => {
      localStorage.setItem('auth_token', token);
      return fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).then(async (r) => {
        const data = await r.json();
        return data;
      });
    },
    me: () => fetch(`${API_BASE}/auth/me`, { headers: getHeaders() }).then((r) => r.json()),
  },
  workspaces: {
    list: (userId: string) => fetch(`${API_BASE}/workspaces/user/${userId}`, { headers: getHeaders() }).then((r) => r.json()),
    get: (id: string) => fetch(`${API_BASE}/workspaces/${id}`, { headers: getHeaders() }).then((r) => r.json()),
    create: (name: string, ownerId: string, description?: string) =>
      fetch(`${API_BASE}/workspaces`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, ownerId, description }) }).then((r) => r.json()),
  },
  projects: {
    list: (workspaceId: string) => fetch(`${API_BASE}/projects/workspace/${workspaceId}`, { headers: getHeaders() }).then((r) => r.json()),
    get: (id: string) => fetch(`${API_BASE}/projects/${id}`, { headers: getHeaders() }).then((r) => r.json()),
    create: (workspaceId: string, name: string, description?: string) =>
      fetch(`${API_BASE}/projects`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ workspaceId, name, description }) }).then((r) => r.json()),
    update: (id: string, data: { name?: string; description?: string }) =>
      fetch(`${API_BASE}/projects/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) }).then((r) => r.json()),
    delete: (id: string) =>
      fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE', headers: getHeaders() }).then((r) => r.json()),
  },
  objectives: {
    listByUser: (userId: string) => fetch(`${API_BASE}/objectives/user/${userId}`, { headers: getHeaders() }).then((r) => r.json()),
    list: (projectId: string) => fetch(`${API_BASE}/objectives/project/${projectId}`, { headers: getHeaders() }).then((r) => r.json()),
    get: (id: string) => fetch(`${API_BASE}/objectives/${id}`, { headers: getHeaders() }).then((r) => r.json()),
    create: (projectId: string, title: string, description?: string, tags?: string[]) =>
      fetch(`${API_BASE}/objectives`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ projectId, title, description, tags }) }).then((r) => r.json()),
    delete: (id: string) =>
      fetch(`${API_BASE}/objectives/${id}`, { method: 'DELETE', headers: getHeaders() }).then((r) => r.json()),
  },
  repositories: {
    listGitHub: (username?: string) =>
      fetch(`${API_BASE}/repositories/github${username ? `?username=${encodeURIComponent(username)}` : ''}`, { headers: getHeaders() }).then((r) => r.json()),
    connect: (projectId: string, owner: string, name: string, defaultBranch: string, monitoredBranches: string[]) =>
      fetch(`${API_BASE}/repositories/connect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, owner, name, defaultBranch, monitoredBranches }),
      }).then((r) => r.json()),
  },
};

