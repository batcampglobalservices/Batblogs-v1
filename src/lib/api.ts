export type AuthUser = {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  socialLinks: string[];
  avatarUrl?: string;
  authProvider?: "local" | "google";
  role: "user" | "admin" | "superadmin";
  isBanned: boolean;
};

export type AuthResponse = {
  message?: string;
  token: string;
  user: AuthUser;
};

type ApiStreamStatusEvent = {
  type: 'status';
  message: string;
};

type ApiStreamPartialEvent<T> = {
  type: 'partial';
  data: Partial<T>;
};

type ApiStreamFinalEvent<T> = {
  type: 'final';
  data: T;
  generationId?: string;
};

type ApiStreamErrorEvent = {
  type: 'error';
  message: string;
};

type ApiStreamEvent<T> =
  | ApiStreamStatusEvent
  | ApiStreamPartialEvent<T>
  | ApiStreamFinalEvent<T>
  | ApiStreamErrorEvent;

type ApiStreamHandlers<T> = {
  onStatus?: (message: string) => void;
  onPartial?: (data: Partial<T>) => void;
  onFinal?: (data: T, generationId?: string) => void;
  onError?: (message: string) => void;
};

const API_BASE =
  (process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");

const LOCAL_TOKEN_KEY = "batblogs_token";
const LOCAL_USER_KEY = "batblogs_user";
const SESSION_TOKEN_KEY = "batblogs_session_token";
const SESSION_USER_KEY = "batblogs_session_user";

const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

export const setAuthSession = (
  token: string,
  user: AuthUser,
  persistSession = true
) => {
  if (persistSession) {
    localStorage.setItem(LOCAL_TOKEN_KEY, token);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_USER_KEY);
    return;
  }

  sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  localStorage.removeItem(LOCAL_TOKEN_KEY);
  localStorage.removeItem(LOCAL_USER_KEY);
};

export const clearAuthSession = () => {
  localStorage.removeItem(LOCAL_TOKEN_KEY);
  localStorage.removeItem(LOCAL_USER_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_USER_KEY);
};

export const getAuthToken = () =>
  localStorage.getItem(LOCAL_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY);

export const getAuthUser = (): AuthUser | null =>
  safeParse<AuthUser>(localStorage.getItem(LOCAL_USER_KEY)) ||
  safeParse<AuthUser>(sessionStorage.getItem(SESSION_USER_KEY));

export const isAuthenticated = () => Boolean(getAuthToken());

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const raw = await response.text();
  const payload = raw ? (safeParse<T & { message?: string }>(raw) || {}) : {};

  if (!response.ok) {
    const errorMessage =
      (payload as { message?: string }).message ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload as T;
};

export const apiStreamRequest = async <T>(
  path: string,
  options: RequestInit = {},
  handlers: ApiStreamHandlers<T> = {}
): Promise<T> => {
  const token = getAuthToken();
  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!isFormData) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const separator = path.includes('?') ? '&' : '?';
  const response = await fetch(`${API_BASE}${path}${separator}stream=1`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const raw = await response.text();
    const payload = raw ? (safeParse<{ message?: string }>(raw) || {}) : {};
    throw new Error(payload.message || `Request failed with status ${response.status}`);
  }

  if (!response.body) {
    throw new Error('Streaming is not supported in this browser.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload: T | null = null;

  const handleStreamLine = (line: string) => {
    const event = safeParse<ApiStreamEvent<T>>(line);

    if (!event) {
      return;
    }

    switch (event.type) {
      case 'status':
        handlers.onStatus?.(event.message);
        break;
      case 'partial':
        handlers.onPartial?.(event.data);
        break;
      case 'final':
        finalPayload = event.data;
        handlers.onFinal?.(event.data, event.generationId);
        break;
      case 'error':
        handlers.onError?.(event.message);
        throw new Error(event.message);
      default:
        break;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const normalizedLine = line.trim();

      if (!normalizedLine) {
        continue;
      }

      handleStreamLine(normalizedLine);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    handleStreamLine(buffer.trim());
  }

  if (!finalPayload) {
    throw new Error('AI stream ended before a final response was received.');
  }

  return finalPayload;
};
