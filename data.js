// data.js - Калькулятор брошюр
// Данные основаны на калькуляторе полиграфии + дополнены для брошюр

const API_URL = 'https://script.google.com/macros/s/AKfycbxFdnzxe6BGlbNFj6KG71gG8XVie6rdAzx45IJ59IqDlvXLTclXjJGRy6qI8mBZ421UAA/exec';
const CACHE_KEY = 'brochure_calc_cache';
const CACHE_TTL = 60 * 60 * 1000;

export async function loadData() {
  console.log('loadData для брошюр вызван');
  const urlParams = new URLSearchParams(window.location.search);
  const forceFresh = urlParams.has('nocache') || urlParams.has('fresh');

  try {
    if (!forceFresh) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            console.log('Используем кэшированные данные');
            return data;
          }
        } catch (e) {
          console.warn('Кэш повреждён, удаляем и идём в сеть');
          localStorage.removeItem(CACHE_KEY);
        }
      }
    }

    const freshParam = forceFresh ? '&nocache=1' : '';
    const url = `${API_URL}?type=brochures${freshParam}`;
    const res = await fetch(url);

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        const formattedData = formatBrochureData(json.data);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: formattedData,
            timestamp: Date.now()
          }));
        } catch (e) {}
        return formattedData;
      }
    }

    console.log('API недоступен, используем встроенные данные');
    return getFallbackData();

  } catch (error) {
    console.error('Ошибка загрузки данных:', error);
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached);
        console.log('Сеть упала, используем последний закэшированный ответ');
        return data;
      }
    } catch (e) {}
    return getFallbackData();
  }
}

function formatBrochureData(data) {
  if (!data || typeof data !== 'object') {
    return getFallbackData();
  }

  const sheetSizes = data.sheetSizes || {
    sra3: { w: 450, h: 320 },
    sra3_plus: { w: 330, h: 488 },
    sra3_plus_l: { w: 660, h: 330 }
  };

  const constants = data.constants || {
    minTotal: 950,
    colorMatchingPrice: 725,
    layoutPrice: 145,
    gap: 3,
    cutPercent: 0.1,
    scoringPrice: 6,
    foldingPrice: 6,
    gluingPrice: 6,
    urgency24: 1.3,
    urgency12: 1.5
  };

  const formats = data.formats || [
    { name: 'А5', code: 'A5', width: 148, height: 210 },
    { name: 'А4', code: 'A4', width: 210, height: 297 },
    { name: 'А6', code: 'A6', width: 105, height: 148 },
    { name: 'DL (99x210)', code: 'DL', width: 99, height: 210 },
    { name: 'Евро (105x210)', code: 'EURO', width: 105, height: 210 },
    { name: 'Свой формат', code: 'CUSTOM', width: null, height: null }
  ];

  const pageCounts = data.pageCounts || [
    { value: 4, name: '4 полосы' },
    { value: 8, name: '8 полос' },
    { value: 12, name: '12 полос' },
    { value: 16, name: '16 полос' },
    { value: 24, name: '24 полосы' },
    { value: 32, name: '32 полосы' },
    { value: 48, name: '48 полос' },
    { value: 64, name: '64 полосы' }
  ];

  let coverMaterials = [];
  if (Array.isArray(data.coverMaterials) && data.coverMaterials.length > 0) {
    coverMaterials = data.coverMaterials.filter(m => m && m.name && Array.isArray(m.densities));
  }
  if (coverMaterials.length === 0) {
    coverMaterials = getFallbackCoverMaterials();
  }

  let blockMaterials = [];
  if (Array.isArray(data.blockMaterials) && data.blockMaterials.length > 0) {
    blockMaterials = data.blockMaterials.filter(m => m && m.name && Array.isArray(m.densities));
  }
  if (blockMaterials.length === 0) {
    blockMaterials = getFallbackBlockMaterials();
  }

  const printTypes = data.printTypes || ['4+0', '4+4'];

  // Виды переплета - ДОБАВЛЕННЫЕ ДАННЫЕ
  const bindingTypes = data.bindingTypes || [
    { code: 'none', name: 'Без переплета', pricePerCopy: 0 },
    { code: 'staple', name: 'Скрепка', pricePerCopy: 3 },
    { code: 'spiral', name: 'Пружина', pricePerCopy: 15 },
    { code: 'glue', name: 'Клей (КБС)', pricePerCopy: 12 },
    { code: 'thermal', name: 'Термоклей', pricePerCopy: 18 },
    { code: 'perfect', name: 'Переплёт Euro', pricePerCopy: 25 }
  ];

  const laminationTypes = data.laminationTypes || [
    'без ламинации',
    'глянцевая 32',
    'матовая 32',
    'глянцевая 75',
    'матовая 75',
    'глянцевая 125',
    'матовая 125',
    'soft touch'
  ];

  const nonLaminatedMaterials = data.nonLaminatedMaterials || [
    'Офсет бумага',
    'Лён',
    'Majestic светлый',
    'Touch cover светлый (plike)',
    'Крафт'
  ];

  const prices = Array.isArray(data.prices) && data.prices.length > 0
    ? data.prices
    : getFallbackPrices();

  const laminationPrices = Array.isArray(data.laminationPrices) && data.laminationPrices.length > 0
    ? data.laminationPrices
    : getFallbackLaminationPrices();

  // Цены на фальцовку тетрадей - ДОБАВЛЕННЫЕ ДАННЫЕ
  const foldingPrices = data.foldingPrices || [
    { pages: 4, price: 2 },
    { pages: 8, price: 4 },
    { pages: 12, price: 6 },
    { pages: 16, price: 8 },
    { pages: 24, price: 12 },
    { pages: 32, price: 16 }
  ];

  const signatureConfig = data.signatureConfig || {
    pagesPerSignature: 16,
    wastePercent: 5
  };

  return {
    sheetSizes,
    constants,
    formats,
    pageCounts,
    coverMaterials,
    blockMaterials,
    printTypes,
    bindingTypes,
    laminationTypes,
    nonLaminatedMaterials,
    prices,
    laminationPrices,
    foldingPrices,
    signatureConfig
  };
}

// Материалы обложки (из оригинала)
function getFallbackCoverMaterials() {
  return [
    {
      name: 'Мелованная бумага',
      densities: [
        { value: 130, price: 15 },
        { value: 170, price: 18 },
        { value: 200, price: 22 },
        { value: 250, price: 28 },
        { value: 300, price: 35 }
      ]
    },
    {
      name: 'Офсет бумага',
      densities: [
        { value: 80, price: 12 },
        { value: 100, price: 14 },
        { value: 120, price: 16 }
      ]
    },
    {
      name: 'Дизайнерская бумага',
      densities: [
        { value: 250, price: 45 },
        { value: 300, price: 55 }
      ]
    }
  ];
}

// Материалы внутреннего блока - ДОБАВЛЕННЫЕ ДАННЫЕ
function getFallbackBlockMaterials() {
  return [
    {
      name: 'Мелованная бумага',
      densities: [
        { value: 90, price: 10 },
        { value: 115, price: 12 },
        { value: 130, price: 14 },
        { value: 150, price: 16 },
        { value: 170, price: 18 }
      ]
    },
    {
      name: 'Офсетная бумага',
      densities: [
        { value: 60, price: 8 },
        { value: 70, price: 9 },
        { value: 80, price: 10 },
        { value: 90, price: 11 },
        { value: 100, price: 12 }
      ]
    },
    {
      name: 'Бумага IQprint',
      densities: [
        { value: 90, price: 11 },
        { value: 100, price: 13 }
      ]
    }
  ];
}

// Цены печати (из оригинала)
function getFallbackPrices() {
  return [
    { min: 1, max: 4, price_40: 435, price_44: 508 },
    { min: 5, max: 9, price_40: 145, price_44: 217 },
    { min: 10, max: 19, price_40: 108, price_44: 180 },
    { min: 20, max: 29, price_40: 77, price_44: 135 },
    { min: 30, max: 49, price_40: 65, price_44: 120 },
    { min: 50, max: 99, price_40: 56, price_44: 105 },
    { min: 100, max: 199, price_40: 50, price_44: 96 },
    { min: 200, max: 299, price_40: 42, price_44: 80 },
    { min: 300, max: 499, price_40: 38, price_44: 74 },
    { min: 500, max: 999, price_40: 34, price_44: 68 },
    { min: 1000, max: Infinity, price_40: 32, price_44: 64 }
  ];
}

// Цены ламинации (из оригинала)
function getFallbackLaminationPrices() {
  return [
    { min: 1, max: 4, gloss_32: 395, matte_32: 435, gloss_75: 428, matte_75: 463, gloss_125: 454, matte_125: 481, soft_touch: 526 },
    { min: 5, max: 9, gloss_32: 105, matte_32: 145, gloss_75: 137, matte_75: 172, gloss_125: 163, matte_125: 235, soft_touch: 235 },
    { min: 10, max: 19, gloss_32: 69, matte_32: 109, gloss_75: 102, matte_75: 136, gloss_125: 127, matte_125: 200, soft_touch: 200 },
    { min: 20, max: 29, gloss_32: 49, matte_32: 89, gloss_75: 82, matte_75: 116, gloss_125: 107, matte_125: 180, soft_touch: 180 },
    { min: 30, max: 49, gloss_32: 45, matte_32: 85, gloss_75: 77, matte_75: 112, gloss_125: 102, matte_125: 175, soft_touch: 175 },
    { min: 50, max: 99, gloss_32: 40, matte_32: 80, gloss_75: 73, matte_75: 107, gloss_125: 98, matte_125: 170, soft_touch: 170 },
    { min: 100, max: 199, gloss_32: 36, matte_32: 76, gloss_75: 68, matte_75: 103, gloss_125: 94, matte_125: 166, soft_touch: 166 },
    { min: 200, max: 299, gloss_32: 33, matte_32: 73, gloss_75: 66, matte_75: 100, gloss_125: 91, matte_125: 164, soft_touch: 164 },
    { min: 300, max: 499, gloss_32: 34, matte_32: 72, gloss_75: 66, matte_75: 100, gloss_125: 91, matte_125: 163, soft_touch: 163 },
    { min: 500, max: 999, gloss_32: 34, matte_32: 73, gloss_75: 66, matte_75: 100, gloss_125: 91, matte_125: 163, soft_touch: 163 },
    { min: 1000, max: Infinity, gloss_32: 32, matte_32: 72, gloss_75: 65, matte_75: 100, gloss_125: 90, matte_125: 162, soft_touch: 162 }
  ];
}

export default { loadData };
