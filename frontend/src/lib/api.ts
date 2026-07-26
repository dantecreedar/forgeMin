const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const githubToken = typeof window !== 'undefined' ? localStorage.getItem('github_token') : null;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (githubToken) headers['x-github-token'] = githubToken;
  return headers;
}


async function handleResponse(r: Response) {
  if (r.status === 204) return { success: true };
  const text = await r.text();
  const data = text ? JSON.parse(text) : {};
  if (!r.ok) {
    throw new Error(data.message || `Error del servidor (${r.status})`);
  }
  return data;
}

export const api = {
  drive: {
    listFiles: (accessToken: string, folderId?: string, sharedWithMe?: boolean, recents?: boolean) =>
      fetch(`${API_BASE}/drive/list-files`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ accessToken, folderId, sharedWithMe, recents }),
      }).then(handleResponse),
    readFile: (fileId: string, accessToken: string) =>
      fetch(`${API_BASE}/drive/read-file`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ fileId, accessToken }),
      }).then(handleResponse),
  },
  engine: {
    command: (message: string) =>
      fetch(`${API_BASE}/engine/command`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ message }),
      }).then(handleResponse),
  },
  auth: {
    login: (token: string) => {
      localStorage.setItem('auth_token', token);
      return fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).then(handleResponse);
    },
    me: () => fetch(`${API_BASE}/auth/me`, { headers: getHeaders() }).then(handleResponse),
  },
  workspaces: {
    list: (userId: string) => fetch(`${API_BASE}/workspaces/user/${userId}`, { headers: getHeaders() }).then(handleResponse),
    get: (id: string) => fetch(`${API_BASE}/workspaces/${id}`, { headers: getHeaders() }).then(handleResponse),
    create: (name: string, ownerId: string, description?: string) =>
      fetch(`${API_BASE}/workspaces`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name, ownerId, description }) }).then(handleResponse),
    delete: (id: string) =>
      fetch(`${API_BASE}/workspaces/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  },
  projects: {
    list: (workspaceId: string) => fetch(`${API_BASE}/projects/workspace/${workspaceId}`, { headers: getHeaders() }).then(handleResponse),
    get: (id: string) => fetch(`${API_BASE}/projects/${id}`, { headers: getHeaders() }).then(handleResponse),
    create: (workspaceId: string, name: string, description?: string) =>
      fetch(`${API_BASE}/projects`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ workspaceId, name, description }) }).then(handleResponse),
    update: (id: string, data: { name?: string; description?: string }) =>
      fetch(`${API_BASE}/projects/${id}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) }).then(handleResponse),
    delete: (id: string) =>
      fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
    analyze: (id: string) =>
      fetch(`${API_BASE}/projects/${id}/analyze`, { method: 'POST', headers: getHeaders() }).then(handleResponse),
    getReadmeSummary: (id: string) =>
      fetch(`${API_BASE}/projects/${id}/readme`, { headers: getHeaders() }).then(handleResponse),
    getGitActivity: (id: string) =>
      fetch(`${API_BASE}/projects/${id}/git-activity`, { headers: getHeaders() }).then(handleResponse),
    getStatusSummary: (id: string) =>
      fetch(`${API_BASE}/projects/${id}/status-summary`, { headers: getHeaders() }).then(handleResponse),
  },


  objectives: {
    listByUser: (userId: string) => fetch(`${API_BASE}/objectives/user/${userId}`, { headers: getHeaders() }).then(handleResponse),
    list: (projectId: string) => fetch(`${API_BASE}/objectives/project/${projectId}`, { headers: getHeaders() }).then(handleResponse),
    get: (id: string) => fetch(`${API_BASE}/objectives/${id}`, { headers: getHeaders() }).then(handleResponse),
    create: (projectId: string, title: string, description?: string, tags?: string[]) =>
      fetch(`${API_BASE}/objectives`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({ projectId, title, description, tags }) }).then(handleResponse),
    delete: (id: string) =>
      fetch(`${API_BASE}/objectives/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  },
  repositories: {
    listGitHub: (username?: string, visibility: string = 'all') => {
      const params = new URLSearchParams();
      if (username) params.append('username', username);
      if (visibility) params.append('visibility', visibility);
      const query = params.toString();
      return fetch(`${API_BASE}/repositories/github${query ? `?${query}` : ''}`, { headers: getHeaders() }).then(handleResponse);
    },

    listByProject: (projectId: string) =>
      fetch(`${API_BASE}/repositories/project/${projectId}`, { headers: getHeaders() }).then(handleResponse),
    connect: (projectId: string, owner: string, name: string, defaultBranch: string, monitoredBranches: string[]) =>
      fetch(`${API_BASE}/repositories/connect`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, owner, name, defaultBranch, monitoredBranches }),
      }).then(handleResponse),
  },
  documents: {
    listByProject: (projectId: string) =>
      fetch(`${API_BASE}/documents/project/${projectId}`, { headers: getHeaders() }).then(handleResponse),
    create: (projectId: string, fileName: string, fileType: string, fileSize?: number, contentUrl?: string, repoId?: string) =>
      fetch(`${API_BASE}/documents`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ projectId, fileName, fileType, fileSize, contentUrl, repoId }),
      }).then(handleResponse),
    delete: (id: string) =>
      fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE', headers: getHeaders() }).then(handleResponse),
  },
  gmail: {
    getAuthUrl: () => fetch(`${API_BASE}/gmail/auth-url`, { headers: getHeaders() }).then(handleResponse),
    sendReport: (payload: { accessToken: string; to: string; subject: string; content: string; projectName?: string }) =>
      fetch(`${API_BASE}/gmail/send-report`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      }).then(handleResponse),
  },
};




