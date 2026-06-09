import StorageService from './storageService';

const USERS_KEY   = 'wefit_users';
const SESSION_KEY = 'wefit_session';

// 세션은 sessionStorage 에 저장 → 탭/브라우저를 닫으면 사라짐 (매번 로그인 필요).
// 계정 정보(USERS_KEY)는 localStorage 에 영구 보관되어 다시 로그인 가능.
const SessionStore = {
  get() {
    try {
      const v = sessionStorage.getItem(SESSION_KEY);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  set(val) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(val)); } catch { /* ignore */ }
  },
  remove() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  },
};

const AuthService = {
  register({ userId, password, name, birthDate, gender }) {
    if (!userId || userId.length < 4) throw new Error('아이디는 4자 이상이어야 합니다.');
    const users = StorageService.get(USERS_KEY) || {};
    if (users[userId]) throw new Error('이미 사용 중인 아이디입니다.');
    users[userId] = { userId, password, name, birthDate, gender };
    StorageService.set(USERS_KEY, users);
    return { userId };
  },

  login({ userId, password }) {
    const users = StorageService.get(USERS_KEY) || {};
    const user  = users[userId];
    if (!user || user.password !== password)
      throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.');
    const token = btoa(`${userId}:${Date.now()}`);
    const session = { userId, token, name: user.name, gender: user.gender, birthDate: user.birthDate };
    SessionStore.set(session);
    return session;
  },

  logout() {
    SessionStore.remove();
  },

  getCurrentUser() {
    return SessionStore.get();
  },

  updateProfile({ userId, name, birthDate, gender }) {
    const users = StorageService.get(USERS_KEY) || {};
    if (!users[userId]) throw new Error('사용자를 찾을 수 없습니다.');
    users[userId] = { ...users[userId], name, birthDate, gender };
    StorageService.set(USERS_KEY, users);
    const session = SessionStore.get();
    if (session) SessionStore.set({ ...session, name, birthDate, gender });
  },
};

export default AuthService;
