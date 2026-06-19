import BodyAnalyzer from '../bodyAnalyzer';

describe('BodyAnalyzer.calcBMI', () => {
  test('정상적인 키/체중으로 BMI를 계산한다', () => {
    // 70kg, 175cm => 70 / 1.75^2 = 22.86
    expect(BodyAnalyzer.calcBMI(175, 70)).toBeCloseTo(22.86, 2);
  });

  test('소수점 둘째자리까지 반환한다', () => {
    const bmi = BodyAnalyzer.calcBMI(180, 80);
    expect(bmi).toBe(24.69);
  });
});

describe('BodyAnalyzer.getBMIStatus', () => {
  test('18.5 미만이면 저체중', () => {
    expect(BodyAnalyzer.getBMIStatus(18.4)).toBe('저체중');
  });

  test('경계값 18.5는 정상으로 분류된다', () => {
    expect(BodyAnalyzer.getBMIStatus(18.5)).toBe('정상');
  });

  test('18.5~22.99는 정상', () => {
    expect(BodyAnalyzer.getBMIStatus(22.9)).toBe('정상');
  });

  test('경계값 23.0은 과체중으로 분류된다', () => {
    expect(BodyAnalyzer.getBMIStatus(23.0)).toBe('과체중');
  });

  test('23.0~24.99는 과체중', () => {
    expect(BodyAnalyzer.getBMIStatus(24.9)).toBe('과체중');
  });

  test('25.0 이상이면 비만', () => {
    expect(BodyAnalyzer.getBMIStatus(25.0)).toBe('비만');
    expect(BodyAnalyzer.getBMIStatus(30)).toBe('비만');
  });
});

describe('BodyAnalyzer.getBodyFatStatus', () => {
  test('값이 없으면 null을 반환한다', () => {
    expect(BodyAnalyzer.getBodyFatStatus(null, 'MALE')).toBeNull();
    expect(BodyAnalyzer.getBodyFatStatus(undefined, 'FEMALE')).toBeNull();
  });

  test('남성: 10 미만이면 부족', () => {
    expect(BodyAnalyzer.getBodyFatStatus(9, 'MALE')).toBe('부족');
  });

  test('남성: 10~19는 정상, 20~24는 경계, 25 이상은 과잉', () => {
    expect(BodyAnalyzer.getBodyFatStatus(15, 'MALE')).toBe('정상');
    expect(BodyAnalyzer.getBodyFatStatus(22, 'MALE')).toBe('경계');
    expect(BodyAnalyzer.getBodyFatStatus(26, 'MALE')).toBe('과잉');
  });

  test('여성: 남성과 다른 기준으로 분류된다', () => {
    expect(BodyAnalyzer.getBodyFatStatus(17, 'FEMALE')).toBe('부족');
    expect(BodyAnalyzer.getBodyFatStatus(20, 'FEMALE')).toBe('정상');
    expect(BodyAnalyzer.getBodyFatStatus(30, 'FEMALE')).toBe('경계');
    expect(BodyAnalyzer.getBodyFatStatus(33, 'FEMALE')).toBe('과잉');
  });
});

describe('BodyAnalyzer.getMuscleMassStatus', () => {
  test('muscleMass 또는 weight가 없으면 null을 반환한다', () => {
    expect(BodyAnalyzer.getMuscleMassStatus(null, 70)).toBeNull();
    expect(BodyAnalyzer.getMuscleMassStatus(30, 0)).toBeNull();
  });

  test('비율에 따라 우수/정상/경계/부족으로 분류된다', () => {
    // ratio = muscleMass / weight * 100
    expect(BodyAnalyzer.getMuscleMassStatus(40, 80)).toBe('우수'); // 50%
    expect(BodyAnalyzer.getMuscleMassStatus(32, 80)).toBe('정상'); // 40%
    expect(BodyAnalyzer.getMuscleMassStatus(24, 80)).toBe('경계'); // 30%
    expect(BodyAnalyzer.getMuscleMassStatus(10, 80)).toBe('부족'); // 12.5%
  });
});

describe('BodyAnalyzer.analyze', () => {
  test('비만 + 체지방 과잉 + 근육량 부족인 경우 종합 메시지를 만든다', () => {
    const result = BodyAnalyzer.analyze(
      { height: 170, weight: 90, bodyFat: 30, muscleMass: 10 },
      'MALE'
    );
    expect(result.bmiStatus).toBe('비만');
    expect(result.bodyFatStatus).toBe('과잉');
    expect(result.muscleMassStatus).toBe('부족');
    expect(result.analysisResult).toContain('비만');
    expect(result.analysisResult).toContain('체지방률이 높으므로');
    expect(result.analysisResult).toContain('근력 운동을 강화하세요');
  });

  test('정상 체형인 경우 체지방/근육량 관련 추가 문구가 붙지 않는다', () => {
    const result = BodyAnalyzer.analyze(
      { height: 175, weight: 70, bodyFat: 15, muscleMass: 35 },
      'MALE'
    );
    expect(result.bmiStatus).toBe('정상');
    expect(result.analysisResult).toBe('BMI가 정상 범위입니다. 꾸준한 운동으로 체형을 유지하세요.');
  });

  test('gender 기본값은 MALE이다', () => {
    const result = BodyAnalyzer.analyze({ height: 175, weight: 70, bodyFat: 15, muscleMass: 35 });
    expect(result.bodyFatStatus).toBe('정상');
  });
});
