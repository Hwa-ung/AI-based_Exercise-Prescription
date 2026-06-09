const SESSION_KEY = 'wefit_session';

// 세션은 sessionStorage에 저장 → 탭/브라우저를 닫으면 사라짐 (매번 로그인 필요).
// 계정 데이터는 Supabase DB에 영구 보관 → 어느 기기에서도 로그인 가능.
const SessionStore = {
  get() {
    try {
      const v = sessionStorage.getItem(SESSION_KEY);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  set(val) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(val)); } catch {}
  },
  remove() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  },
};

const AuthService = {
  async register({ userId, password, name, birthDate, gender }) {
    const res = await fetch('/api/auth-register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, password, name, birthDate, gender }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '회원가입 실패');
    return data;
  },

  async login({ userId, password }) {
    const res = await fetch('/api/auth-login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '로그인 실패');
    SessionStore.set(data);
    return data;
  },

  logout() {
    SessionStore.remove();
  },

  getCurrentUser() {
    return SessionStore.get();
  },

  async updateProfile({ userId, name, birthDate, gender }) {
    const res = await fetch('/api/auth-update-profile', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, name, birthDate, gender }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '프로필 업데이트 실패');
    const session = SessionStore.get();
    if (session) SessionStore.set({ ...session, name, birthDate, gender });
  },
};

export default AuthService;
