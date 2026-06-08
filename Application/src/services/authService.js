import StorageService from './storageService';

const USERS_KEY   = 'wefit_users';
const SESSION_KEY = 'wefit_session';

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
    StorageService.set(SESSION_KEY, session);
    return session;
  },

  logout() {
    StorageService.remove(SESSION_KEY);
  },

  getCurrentUser() {
    return StorageService.get(SESSION_KEY);
  },

  updateProfile({ userId, name, birthDate, gender }) {
    const users = StorageService.get(USERS_KEY) || {};
    if (!users[userId]) throw new Error('사용자를 찾을 수 없습니다.');
    users[userId] = { ...users[userId], name, birthDate, gender };
    StorageService.set(USERS_KEY, users);
    const session = StorageService.get(SESSION_KEY);
    if (session) StorageService.set(SESSION_KEY, { ...session, name, birthDate, gender });
  },
};

export default AuthService;
