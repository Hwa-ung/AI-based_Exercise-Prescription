// BodyAnalyzer — BMI 계산 및 신체 분석 (요구사항 FR-08 구현)
const BodyAnalyzer = {
  calcBMI(height, weight) {
    const h = height / 100;
    return parseFloat((weight / (h * h)).toFixed(2));
  },

  getBMIStatus(bmi) {
    if (bmi < 18.5) return '저체중';
    if (bmi < 23.0) return '정상';
    if (bmi < 25.0) return '과체중';
    return '비만';
  },

  getBodyFatStatus(bodyFat, gender) {
    if (!bodyFat) return null;
    if (gender === 'MALE') {
      if (bodyFat < 10) return '저체중';
      if (bodyFat < 20) return '정상';
      if (bodyFat < 25) return '경계';
      return '과잉';
    }
    if (bodyFat < 18) return '저체중';
    if (bodyFat < 28) return '정상';
    if (bodyFat < 32) return '경계';
    return '과잉';
  },

  getWaistStatus(waist, gender) {
    if (!waist) return null;
    return gender === 'MALE' ? (waist < 90 ? '정상' : '초과') : (waist < 85 ? '정상' : '초과');
  },

  getGripStatus(grip, gender) {
    if (!grip) return null;
    return gender === 'MALE' ? (grip >= 28 ? '정상' : '경계') : (grip >= 18 ? '정상' : '경계');
  },

  analyze(bodyData, gender = 'MALE') {
    const bmi          = this.calcBMI(bodyData.height, bodyData.weight);
    const bmiStatus    = this.getBMIStatus(bmi);
    const bodyFatStatus = this.getBodyFatStatus(bodyData.bodyFat, gender);
    const waistStatus  = this.getWaistStatus(bodyData.waist, gender);
    const gripStatus   = this.getGripStatus(bodyData.grip, gender);

    let analysisResult;
    if (bmiStatus === '비만')
      analysisResult = 'BMI 비만 단계입니다. 유산소 운동과 식이 조절이 강력히 권장됩니다.';
    else if (bmiStatus === '과체중')
      analysisResult = 'BMI 과체중 단계입니다. 유산소 운동과 식이 조절이 권장됩니다.';
    else if (bmiStatus === '정상')
      analysisResult = 'BMI가 정상 범위입니다. 꾸준한 운동으로 체형을 유지하세요.';
    else
      analysisResult = 'BMI가 저체중입니다. 근력 운동과 충분한 영양 섭취를 권장합니다.';

    if (bodyFatStatus === '과잉')
      analysisResult += ' 체지방률이 높으므로 유산소 병행을 권장합니다.';
    else if (bodyFatStatus === '경계')
      analysisResult += ' 체지방률이 경계 수치입니다.';

    return { bmi, bmiStatus, bodyFatStatus, waistStatus, gripStatus, analysisResult };
  },
};

export default BodyAnalyzer;
