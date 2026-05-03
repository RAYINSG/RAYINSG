import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo' || __DEV__;

let TextRecognition: any;
if (!isExpoGo) {
  try {
    TextRecognition = require('@react-native-ml-kit/text-recognition').default;
  } catch {}
}

const MON: Record<string, number> = {
  JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5,
  JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11,
};

type ParseFn = (m: RegExpMatchArray) => Date | null;

/**
 * 日期 regex 清單（依優先順序排列）
 *
 * 覆蓋範圍：
 *  ① 中文/日文            2025年12月31日、2025年12月
 *  ② 8位數緊湊 YYYYMMDD   20251231
 *  ③ 4位年完整            2025/12/31、31/12/2025（含 - .）
 *  ④ DD MON YYYY          31 DEC 2025、31DEC2025、31DEC25
 *  ⑤ MON DD YYYY          DEC 31 2025、DEC31,2025
 *  ⑥ YYYY MON / MON YYYY  2025 DEC、DEC 2025
 *  ⑦ 月年（4位）          12/2025、2025/12
 *  ⑧ 6位數緊湊 YYMMDD     251231
 *  ⑨ 2位年完整            31/12/25、25/12/31
 *  ⑩ MON/YY               DEC/25、DEC-25
 *  ⑪ MM/YY（月/2位年）    12/25
 *  ⑫ MM/DD or DD/MM（無年）09/28、28.09
 */
const DATE_PATTERNS: { label: string; regex: RegExp; parse: ParseFn }[] = [

  // ① 中文/日文
  {
    label: 'YYYY年MM月DD日',
    regex: /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
    parse: m => new Date(+m[1], +m[2] - 1, +m[3]),
  },
  {
    label: 'YYYY年MM月',
    regex: /(\d{4})\s*年\s*(\d{1,2})\s*月/,
    parse: m => new Date(+m[1], +m[2] - 1, 1),
  },

  // ② 8位數緊湊 YYYYMMDD（e.g. 20251231）
  {
    label: 'YYYYMMDD',
    regex: /(?<!\d)(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?!\d)/,
    parse: m => new Date(+m[1], +m[2] - 1, +m[3]),
  },

  // ③ 4位年完整
  // YYYY/MM/DD、YYYY-MM-DD、YYYY.MM.DD
  {
    label: 'YYYY/MM/DD',
    regex: /(20\d{2})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,
    parse: m => new Date(+m[1], +m[2] - 1, +m[3]),
  },
  // DD/MM/YYYY、DD-MM-YYYY、DD.MM.YYYY
  {
    label: 'DD/MM/YYYY',
    regex: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](20\d{2})/,
    parse: m => {
      // 如果第一個數 > 12，確定是 DD/MM/YYYY
      // 否則兩種都合理，預設 DD/MM/YYYY（歐洲包裝更常見）
      return new Date(+m[3], +m[2] - 1, +m[1]);
    },
  },

  // ④ DD MON YYYY / DDMONYYYY / DDMONYY（最常見於罐頭、乾糧）
  // e.g. 31 DEC 2025、31DEC2025、31DEC25
  {
    label: 'DD MON YYYY/YY',
    regex: /(\d{1,2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{2,4})/i,
    parse: m => {
      const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      return new Date(year, MON[m[2].toUpperCase()], +m[1]);
    },
  },

  // ⑤ MON DD YYYY / MON DD, YYYY
  // e.g. DEC 31 2025、DEC 31, 2025
  {
    label: 'MON DD YYYY',
    regex: /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{1,2})[,\s]\s*(20\d{2})/i,
    parse: m => new Date(+m[3], MON[m[1].toUpperCase()], +m[2]),
  },

  // ⑥ YYYY MON / MON YYYY（只有月年）
  {
    label: 'YYYY MON',
    regex: /(20\d{2})\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/i,
    parse: m => new Date(+m[1], MON[m[2].toUpperCase()], 1),
  },
  {
    label: 'MON YYYY',
    regex: /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(20\d{2})/i,
    parse: m => new Date(+m[2], MON[m[1].toUpperCase()], 1),
  },

  // ⑦ 月年（4位年）
  // MM/YYYY or MM.YYYY（e.g. 12/2025）
  {
    label: 'MM/YYYY',
    regex: /(?<!\d)(\d{1,2})[\/\.](20\d{2})(?!\d)/,
    parse: m => {
      if (+m[1] < 1 || +m[1] > 12) return null;
      return new Date(+m[2], +m[1] - 1, 1);
    },
  },
  // YYYY/MM or YYYY.MM（e.g. 2025/12）
  {
    label: 'YYYY/MM',
    regex: /(20\d{2})[\/\.](\d{1,2})(?![\/\.\d])/,
    parse: m => {
      if (+m[2] < 1 || +m[2] > 12) return null;
      return new Date(+m[1], +m[2] - 1, 1);
    },
  },

  // ⑧ 6位數緊湊 YYMMDD（e.g. 251231 → 2025年12月31日）
  {
    label: 'YYMMDD',
    regex: /(?<!\d)([2-3]\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?!\d)/,
    parse: m => new Date(2000 + +m[1], +m[2] - 1, +m[3]),
  },

  // ⑨ 2位年完整日期
  // YY/MM/DD（e.g. 25/12/31）
  {
    label: 'YY/MM/DD',
    regex: /(?<!\d)([2-3]\d)[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})(?!\d)/,
    parse: m => {
      const year = 2000 + +m[1];
      const month = +m[2];
      const day = +m[3];
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;
      return new Date(year, month - 1, day);
    },
  },
  // DD/MM/YY（e.g. 31/12/25）— 若第一個數 > 12 則確定是 DD
  {
    label: 'DD/MM/YY',
    regex: /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]([2-3]\d)(?!\d)/,
    parse: m => {
      const year = 2000 + +m[3];
      let day = +m[1];
      let month = +m[2];
      // 若第一個數 <= 12，歐洲包裝通常也是 DD/MM
      if (day > 31 || month > 12) return null;
      return new Date(year, month - 1, day);
    },
  },

  // ⑩ MON/YY、MON-YY（e.g. DEC/25、DEC-25）
  {
    label: 'MON/YY',
    regex: /(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[\/\-](\d{2})(?!\d)/i,
    parse: m => new Date(2000 + +m[2], MON[m[1].toUpperCase()], 1),
  },

  // ⑪ MM/YY（月/2位年）（e.g. 12/25、09/26）
  {
    label: 'MM/YY',
    regex: /(?<!\d)(\d{1,2})[\/\-\.]([2-3]\d)(?!\d)/,
    parse: m => {
      if (+m[1] < 1 || +m[1] > 12) return null;
      return new Date(2000 + +m[2], +m[1] - 1, 1);
    },
  },

  // ⑫ MM/DD 或 DD/MM（無年份）（e.g. 09/28、28.09）
  // 最低優先度，只在關鍵字行才可信
  {
    label: 'MM/DD (no year)',
    regex: /(?<![\/\-\.\d])(\d{1,2})[\/\-\.](\d{1,2})(?![\/\-\.]\d)/,
    parse: m => {
      let month = +m[1] - 1;
      let day = +m[2];
      // 若第一個數 > 12，確定是 DD/MM 格式
      if (+m[1] > 12 && +m[2] <= 12) {
        month = +m[2] - 1;
        day = +m[1];
      }
      if (month < 0 || month > 11 || day < 1 || day > 31) return null;
      const now = new Date();
      let d = new Date(now.getFullYear(), month, day);
      // 若日期已過（超過7天前），推到下一年
      const threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (d < threshold) {
        d = new Date(now.getFullYear() + 1, month, day);
      }
      return d;
    },
  },
];

const TRIGGER_KEYWORDS = [
  // 中文
  '有效期', '到期', '保存期', '賞味期', '使用期限', '最佳賞味', '保質期', '效期', '效日',
  // 英文
  'exp', 'best before', 'best by', 'use by', 'use before',
  'expiry', 'expiration', 'bb', 'best end', 'sell by',
  // 日文
  '賞味期限', '消費期限', '使用期限',
  // 韓文（羅馬化）
  '유통기한', '소비기한',
];

function isValidDate(d: Date): boolean {
  if (!d || isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  return year >= 2020 && year <= 2040;
}

function tryParseDate(text: string): Date | null {
  for (const { regex, parse } of DATE_PATTERNS) {
    const match = text.match(regex);
    if (match) {
      try {
        const d = parse(match);
        if (d && isValidDate(d)) return d;
      } catch {}
    }
  }
  return null;
}

export async function extractExpiryDateFromImage(imageUri: string): Promise<Date | null> {
  // Expo Go 沒有原生 ML Kit 模組，直接回傳 null
  if (isExpoGo || !TextRecognition) return null;

  try {
    const result = await TextRecognition.recognize(imageUri);
    const fullText = result.text;
    const lines = fullText.split('\n').map((l: string) => l.trim()).filter(Boolean);

    const candidates: Date[] = [];

    // 第一輪：優先找含關鍵字的行（可信度高），收集所有符合的日期
    for (const keyword of TRIGGER_KEYWORDS) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
          const d = tryParseDate(line);
          if (d) candidates.push(d);
          if (i + 1 < lines.length) {
            const d2 = tryParseDate(line + ' ' + lines[i + 1]);
            if (d2) candidates.push(d2);
          }
          if (i > 0) {
            const d3 = tryParseDate(lines[i - 1] + ' ' + line);
            if (d3) candidates.push(d3);
          }
        }
      }
    }

    // 若關鍵字輪找到日期，取最晚的（過期日通常比製造日晚）
    if (candidates.length > 0) {
      return candidates.reduce((latest, d) => d > latest ? d : latest);
    }

    // 第二輪：沒有關鍵字，掃所有行，但排除最低優先的無年份格式
    const patternsWithYear = DATE_PATTERNS.filter(p => p.label !== 'MM/DD (no year)');
    for (const line of lines) {
      for (const { regex, parse } of patternsWithYear) {
        const match = line.match(regex);
        if (match) {
          try {
            const d = parse(match);
            if (d && isValidDate(d)) candidates.push(d);
          } catch {}
        }
      }
    }

    // 第二輪也取最晚的日期
    if (candidates.length > 0) {
      return candidates.reduce((latest, d) => d > latest ? d : latest);
    }

    return null;
  } catch {
    return null;
  }
}
