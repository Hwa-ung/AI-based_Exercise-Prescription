import StorageService from '../storageService';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('set()으로 저장한 값을 get()으로 동일하게 가져온다', () => {
    StorageService.set('key1', { a: 1, b: '테스트' });
    expect(StorageService.get('key1')).toEqual({ a: 1, b: '테스트' });
  });

  test('존재하지 않는 키를 get()하면 null을 반환한다', () => {
    expect(StorageService.get('없는키')).toBeNull();
  });

  test('remove()로 값을 삭제하면 get()이 null을 반환한다', () => {
    StorageService.set('key2', [1, 2, 3]);
    StorageService.remove('key2');
    expect(StorageService.get('key2')).toBeNull();
  });

  test('localStorage에 손상된 JSON이 있으면 get()은 null을 반환한다 (예외 처리)', () => {
    // localStorage.setItem을 직접 호출해 JSON.parse가 실패하는 깨진 값을 주입
    Storage.prototype.setItem.call(localStorage, 'broken', '{invalid-json');
    expect(StorageService.get('broken')).toBeNull();
  });

  test('localStorage.getItem이 예외를 던져도 get()은 안전하게 null을 반환한다', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    expect(StorageService.get('any')).toBeNull();
  });
});
