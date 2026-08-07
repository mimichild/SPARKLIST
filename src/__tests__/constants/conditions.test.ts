import { DEFAULT_CONDITION_LABELS, CONDITION_COUNT, MIN_CONDITIONS_TO_UNLOCK } from '../../constants/conditions';

describe('conditions constants', () => {
  it('有剛好 6 項預設條件文字', () => {
    expect(DEFAULT_CONDITION_LABELS).toHaveLength(6);
    expect(CONDITION_COUNT).toBe(6);
  });

  it('解鎖門檻是 3 項', () => {
    expect(MIN_CONDITIONS_TO_UNLOCK).toBe(3);
  });

  it('條件文字與 spec 逐字相符', () => {
    expect(DEFAULT_CONDITION_LABELS).toEqual([
      '可做出三套穿搭嗎？',
      '我可以在一個月內完全不用思考就穿出門嗎？',
      '符合我的風格嗎？',
      '我沒有類似的單品嗎？',
      'C/P 值夠高嗎？（值得嗎？）',
      '材質/洗滌方式我夠了解嗎？（耐用度高嗎）',
    ]);
  });
});
