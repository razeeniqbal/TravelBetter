export const multiDaySample = `DAY 1 6/8 WED
7:30 AM flight into Lisbon
Breakfast: Pastel de Belem
Alfama walk

DAY 2 - Thu
Time Out Market lunch
LX Factory
Notes: bring comfy shoes`;

export const mixedHeaderSample = `Day 1
9am coffee
Sintra Palace

DAY 2 - Tue
Belem Tower`;

export const noHeaderSample = `Arrive in Lisbon
Pastel de Belem
Alfama walk`;

export const headersOnlySample = `DAY 1

DAY 2`;

export const commaSeparatedSample = `12pm reached Neo Grand Hatyai, Krua Pa Yad 叫菜吃饭, thefellows.hdy café, Mookata Paeyim晚餐 5pm, Greeway Night Market 逛夜市 6pm`;

export const durationCommaSample = `2 days in klcc, trx, midvalley`;

export const durationCommaShortSample = `3 days in klcc, trx`;

export const hatyaiSample = `I'm planning a trip to 🇹🇭 HATYAI TRIP 6/8-8/8.

Places from my itinerary:
- 🇹🇭 HATYAI TRIP 6/8-8/8
- DAY 1 6/8 WED*
- 9am take van >> 11.30am reached
- 12pm reached Neo Grand Hatyai ️
- Krua Pa Yad 叫菜吃饭
- thefellows.hdy café ️
- Mookata Paeyim晚餐 5pm
- Greeway Night Market 逛夜市 6pm
- DAY 2 7/8 THURS*
- Choo Ja Roean Boat Noodle 早餐 9am
- Kim Yong Market 逛逛
- 东方燕窝 ️
- Porkleg Tuateaw @Samchai
- Central Festival Hatyai 2pm
- Maribu晚餐 6pm
- Lee Garden Night Market ️
- Lee Garden 按摩
- Pa Ad Fresh Milk 宵夜
- DAY3 8/8 FRI*
- Kuay Jab Jae Khwan
- Lee Garden附近走走
- 最大的7-11
- Baan Khun Bhu
- Hood Hatyai café ️
- 古早味炭烧鸡蛋糕`;

export const hatyaiSentenceSample = `trip to hatyai, i want to go neo grand hatyai, krua pa yad, thefellows.hdy café, mookata paeyim, greeway night market`;

export const hatyaiOneDaySample = `1 day to go neo grand hatyai, krua pa yad, thefellows.hdy café, mookata paeyim, greeway night market`;

export const hatyaiListSample = `neo grand hatyai, krua pa yad, thefellows.hdy café, mookata paeyim, greeway night market`;

export const editableDayGroupsSample = [
  {
    label: 'Day 1',
    date: null,
    places: [
      { name: 'Petronas Twin Towers', source: 'user' as const },
      { name: 'Merdeka Square', source: 'ai' as const },
    ],
  },
  {
    label: 'Day 2',
    date: null,
    places: [
      { name: 'The Exchange TRX', source: 'user' as const },
    ],
  },
];

export const itineraryDraftSaveSample = {
  editSession: {
    draftId: 'draft-001',
    baselineHash: 'baseline-hash-001',
  },
  days: [
    {
      dayNumber: 1,
      anchorStopId: 'stop-1',
      stops: [
        {
          stopId: 'stop-1',
          position: 0,
          arrivalTime: '09:00',
          stayDurationMinutes: 120,
        },
        {
          stopId: 'stop-2',
          position: 1,
          arrivalTime: '12:00',
          stayDurationMinutes: 90,
        },
      ],
    },
    {
      dayNumber: 2,
      stops: [
        {
          stopId: 'stop-3',
          position: 0,
          arrivalTime: '10:00',
          stayDurationMinutes: 60,
        },
      ],
    },
  ],
};

export const suggestionPlacementPreviewSample = {
  mode: 'ai' as const,
  selectedSuggestions: [
    {
      suggestionId: 'sug-1',
      displayName: 'KLCC Park',
    },
    {
      suggestionId: 'sug-2',
      displayName: 'Bukit Bintang',
    },
  ],
};

export const screenshotBatchSample = {
  destination: 'Kuala Lumpur',
  images: [
    {
      filename: 'itinerary-1.png',
      mimeType: 'image/png' as const,
      base64Data: 'ZmFrZS1pbWFnZS1kYXRhLTE=',
    },
    {
      filename: 'itinerary-2.png',
      mimeType: 'image/png' as const,
      base64Data: 'ZmFrZS1pbWFnZS1kYXRhLTI=',
    },
  ],
};
