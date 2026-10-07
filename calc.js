// calc.js - Калькулятор брошюр
// Логика расчёта основана на калькуляторе листовой продукции

let MIN_TOTAL = 950;
let GAP = 3;
let CUT_PERCENT = 0.1;
let SCORING_PRICE = 6;
let FOLDING_PRICE = 6;
let GLUING_PRICE = 6;
let URGENCY_24 = 1.3;
let URGENCY_12 = 1.5;
let COLOR_MATCHING_PRICE = 725;
let LAYOUT_PRICE = 145;
let SRA3 = { w: 450, h: 320 };
let SRA3_PLUS = { w: 330, h: 488 };
let SRA3_PLUS_L = { w: 660, h: 330 };
let NON_LAMINATED_MATERIALS = [];

const FORMAT_MULTIPLIERS = {
  'sra3': { print: 1.0, lamination: 1.0, weightFactor: 0.145 },
  'sra3_plus': { print: 1.2, lamination: 1.2, weightFactor: 0.161 },
  'sra3_plus_l': { print: 1.6, lamination: 1.6, weightFactor: 0.218 }
};

const STANDARD_PRODUCT_SIZES = {
  'А5': { w: 148, h: 210 },
  'A5': { w: 148, h: 210 },
  'А4': { w: 210, h: 297 },
  'A4': { w: 210, h: 297 },
  'А6': { w: 105, h: 148 },
  'A6': { w: 105, h: 148 },
  'DL': { w: 99, h: 210 },
  'EURO': { w: 105, h: 210 }
};

export function updateConstants(data) {
  if (data.constants) {
    MIN_TOTAL = data.constants.minTotal || MIN_TOTAL;
    COLOR_MATCHING_PRICE = data.constants.colorMatchingPrice || COLOR_MATCHING_PRICE;
    LAYOUT_PRICE = data.constants.layoutPrice || LAYOUT_PRICE;
    GAP = data.constants.gap || GAP;
    CUT_PERCENT = data.constants.cutPercent || CUT_PERCENT;
    SCORING_PRICE = data.constants.scoringPrice || SCORING_PRICE;
    FOLDING_PRICE = data.constants.foldingPrice || FOLDING_PRICE;
    GLUING_PRICE = data.constants.gluingPrice || GLUING_PRICE;
    URGENCY_24 = data.constants.urgency24 || URGENCY_24;
    URGENCY_12 = data.constants.urgency12 || URGENCY_12;
  }

  if (data.sheetSizes) {
    SRA3 = data.sheetSizes.sra3 || SRA3;
    SRA3_PLUS = data.sheetSizes.sra3_plus || SRA3_PLUS;
    if (data.sheetSizes.sra3_plus_l) {
      SRA3_PLUS_L = data.sheetSizes.sra3_plus_l;
    }
  }

  if (data.nonLaminatedMaterials) {
    NON_LAMINATED_MATERIALS = data.nonLaminatedMaterials;
  }
}

export function checkFit(width, height, sheetWidth, sheetHeight) {
  const printableWidth = sheetWidth;
  const printableHeight = sheetHeight;
  const itemW = width + GAP;
  const itemH = height + GAP;

  const cols1 = Math.floor(printableWidth / itemW);
  const rows1 = Math.floor(printableHeight / itemH);
  const fit1 = cols1 * rows1;

  const cols2 = Math.floor(printableWidth / itemH);
  const rows2 = Math.floor(printableHeight / itemW);
  const fit2 = cols2 * rows2;

  if (fit1 === 0 && fit2 === 0) {
    if (width <= printableWidth && height <= printableHeight) {
      return { fits: true, count: 1, cols: 1, rows: 1, orientation: 'горизонтальная' };
    }
    if (height <= printableWidth && width <= printableHeight) {
      return { fits: true, count: 1, cols: 1, rows: 1, orientation: 'вертикальная' };
    }
  }

  const maxFit = Math.max(fit1, fit2);
  return {
    fits: maxFit > 0,
    count: maxFit,
    cols: fit1 >= fit2 ? cols1 : cols2,
    rows: fit1 >= fit2 ? rows1 : rows2,
    orientation: fit1 >= fit2 ? 'горизонтальная' : 'вертикальная'
  };
}

export function findBestFit(width, height) {
  const formats = [
    { name: 'sra3', size: SRA3, multiplier: FORMAT_MULTIPLIERS.sra3 },
    { name: 'sra3_plus', size: SRA3_PLUS, multiplier: FORMAT_MULTIPLIERS.sra3_plus },
    { name: 'sra3_plus_l', size: SRA3_PLUS_L, multiplier: FORMAT_MULTIPLIERS.sra3_plus_l }
  ];

  for (const format of formats) {
    const fitResult = checkFit(width, height, format.size.w, format.size.h);
    if (fitResult.fits && fitResult.count > 0) {
      return {
        fits: true,
        formatName: format.name,
        sheetSize: format.size,
        multiplier: format.multiplier,
        fitDetails: fitResult,
        sheetSizeForDisplay: `${format.size.w}x${format.size.h}`
      };
    }
  }

  return { fits: false };
}

export function getUrgencyMultiplier(urgency) {
  if (urgency === '24h') return URGENCY_24;
  if (urgency === '12h') return URGENCY_12;
  return 1;
}

export function getPrintPrice(qty, mode, table) {
  if (!table || !table.length) return 0;
  const key = mode === '40' ? 'price_40' : 'price_44';

  for (let i = 0; i < table.length; i++) {
    const row = table[i];
    if (qty >= row.min) {
      if (row.max === undefined || row.max === null || !isFinite(row.max) || qty <= row.max) {
        const price = row[key];
        if (price && price > 0) return qty * price;
      }
    }
  }

  return 0;
}

export function getLaminationPrice(qty, type, table) {
  if (!table || !table.length) return 0;
  if (!type || type.toLowerCase().includes('без ламинации')) return 0;

  const map = {
    'глянцевая 32': 'gloss_32',
    'матовая 32': 'matte_32',
    'глянцевая 75': 'gloss_75',
    'матовая 75': 'matte_75',
    'глянцевая 125': 'gloss_125',
    'матовая 125': 'matte_125',
    'soft touch': 'soft_touch'
  };

  const key = map[type.toLowerCase().trim()];
  if (!key) return 0;

  for (let i = 0; i < table.length; i++) {
    const row = table[i];
    if (qty >= row.min) {
      if (row.max === undefined || row.max === null || !isFinite(row.max) || qty <= row.max) {
        const price = row[key];
        if (price && price > 0) return qty * price;
      }
    }
  }

  return 0;
}

export function getMaterialPrice(material, density) {
  if (!material) return 10;
  if (!material.densities || !Array.isArray(material.densities)) return 10;

  const densityOption = material.densities.find(d => Math.abs(d.value - density) < 0.01);
  if (densityOption) return densityOption.price;

  return material.densities[0]?.price || 10;
}

export function getBindingPrice(bindingType, bindingTypes) {
  if (!bindingType || bindingType === 'none') return 0;
  if (!bindingTypes || !Array.isArray(bindingTypes)) return 0;

  const binding = bindingTypes.find(b => b.code === bindingType);
  return binding ? binding.pricePerCopy : 0;
}

export function getFoldingPrice(pageCount, pageCirculation, foldingPrices) {
  if (!foldingPrices || !Array.isArray(foldingPrices)) return 0;
  if (pageCount <= 0 || pageCirculation <= 0) return 0;

  const config = foldingPrices.find(f => f.pages >= pageCount);
  const pricePerSheet = config ? config.price : 5;

  const signatures = Math.ceil(pageCount / 16);
  const foldedSheets = pageCirculation * signatures;

  return foldedSheets * pricePerSheet;
}

export function calculate(input, data) {
  const {
    format,
    customWidth,
    customHeight,
    circulation,
    pageCount,
    colorModeCover,
    colorModeBlock,
    coverMaterial,
    coverDensity,
    blockMaterial,
    blockDensity,
    lamination,
    bindingType,
    colorMatching,
    layoutsCount,
    urgency,
    discountPercent,
    deliveryCost
  } = input;

  if (!circulation || circulation <= 0) {
    throw new Error('Укажите тираж');
  }

  if (!pageCount || pageCount < 4) {
    throw new Error('Количество полос должно быть не менее 4');
  }

  if (pageCount % 2 !== 0) {
    throw new Error('Количество полос должно быть чётным');
  }

  let productWidth, productHeight;

  if (format === 'Свой формат' || format === 'CUSTOM') {
    if (!customWidth || !customHeight || customWidth <= 0 || customHeight <= 0) {
      throw new Error('Укажите корректные размеры для своего формата');
    }
    productWidth = customWidth;
    productHeight = customHeight;
  } else {
    const productSize = STANDARD_PRODUCT_SIZES[format];
    if (!productSize) {
      throw new Error(`Неизвестный формат: ${format}`);
    }
    productWidth = productSize.w;
    productHeight = productSize.h;
  }

  let bestFit = findBestFit(productWidth, productHeight);
  if (!bestFit.fits) {
    throw new Error(`Размер ${productWidth}x${productHeight} мм не помещается ни на один из доступных форматов бумаги`);
  }

  const currentSheetSize = bestFit.sheetSize;
  const multiplier = bestFit.multiplier;
  const formatType = bestFit.formatName;
  const perSheet = bestFit.fitDetails.count;
  const fitDetails = bestFit.fitDetails;
  const sheetSizeForDisplay = bestFit.sheetSizeForDisplay;

  // Расчёт обложки
  const coverSheets = Math.ceil(circulation / perSheet);
  const coverMaterialPricePerSheet = getMaterialPrice(coverMaterial, coverDensity);
  const coverMaterialPrice = coverSheets * coverMaterialPricePerSheet;
  const coverPrintPrice = getPrintPrice(coverSheets, colorModeCover, data.prices) * multiplier.print;

  const hasLamination = lamination && !lamination.toLowerCase().includes('без ламинации');
  const isNonLaminatedCover = NON_LAMINATED_MATERIALS.includes(coverMaterial?.name);

  if (isNonLaminatedCover && hasLamination) {
    throw new Error(`Материал обложки "${coverMaterial.name}" нельзя ламинировать`);
  }

  const coverLaminationPrice = (!hasLamination || isNonLaminatedCover)
    ? 0
    : getLaminationPrice(coverSheets, lamination, data.laminationPrices) * multiplier.lamination;

  // Расчёт внутреннего блока
  const blockPagesPerCopy = pageCount / 2;
  const blockSheetsPerCopy = Math.ceil(blockPagesPerCopy / perSheet);
  const totalBlockSheets = blockSheetsPerCopy * circulation;
  const blockMaterialPricePerSheet = getMaterialPrice(blockMaterial, blockDensity);
  const blockMaterialPrice = totalBlockSheets * blockMaterialPricePerSheet;
  const blockPrintPrice = getPrintPrice(totalBlockSheets, colorModeBlock, data.prices) * multiplier.print;

  // Расчёт переплёта
  const bindingPricePerCopy = getBindingPrice(bindingType, data.bindingTypes);
  const totalBindingPrice = bindingPricePerCopy * circulation;

  // Расчёт фальцовки
  const foldingPrice = getFoldingPrice(pageCount, circulation, data.foldingPrices);

  // Дополнительные расходы
  const colorMatchingPriceTotal = colorMatching === 'yes' ? COLOR_MATCHING_PRICE : 0;
  const layoutsPriceTotal = (parseInt(layoutsCount) || 1) > 1 ? (parseInt(layoutsCount) || 1) * LAYOUT_PRICE : 0;

  // Итоговый расчёт
  let baseTotal = coverPrintPrice + coverMaterialPrice + coverLaminationPrice +
    blockMaterialPrice + blockPrintPrice +
    totalBindingPrice + foldingPrice +
    colorMatchingPriceTotal + layoutsPriceTotal;

  let isMinPriceApplied = false;
  const minPriceValue = MIN_TOTAL;
  if (baseTotal < MIN_TOTAL) {
    isMinPriceApplied = true;
    baseTotal = MIN_TOTAL;
  }

  const urgencyMultiplier = getUrgencyMultiplier(urgency);
  let urgencyAmount = 0;
  let urgencyPercent = 0;
  if (urgencyMultiplier > 1) {
    urgencyPercent = Math.round((urgencyMultiplier - 1) * 100);
    urgencyAmount = baseTotal * (urgencyMultiplier - 1);
  }

  const totalWithUrgency = baseTotal * urgencyMultiplier;
  const discountMultiplier = 1 - (discountPercent / 100);
  const discountedTotal = totalWithUrgency * discountMultiplier;
  const finalTotal = discountedTotal + (deliveryCost || 0);
  const perPiece = finalTotal / circulation;
  const discountAmount = totalWithUrgency * (discountPercent / 100);

  // Расчёт веса
  let totalWeight = 0;
  totalWeight += coverSheets * coverDensity * multiplier.weightFactor;

  if (hasLamination && !isNonLaminatedCover) {
    const laminationType = lamination.toLowerCase();
    const laminationWeightFactor = multiplier.weightFactor / 0.145;
    if (laminationType.includes('32')) {
      totalWeight += coverSheets * 12 * laminationWeightFactor;
    } else if (laminationType.includes('75')) {
      totalWeight += coverSheets * 30 * laminationWeightFactor;
    } else if (laminationType.includes('125') || laminationType.includes('soft')) {
      totalWeight += coverSheets * 50 * laminationWeightFactor;
    }
  }

  totalWeight += totalBlockSheets * blockDensity * multiplier.weightFactor;
  const totalWeightKg = totalWeight / 1000;

  return {
    total: Math.round(finalTotal),
    perPiece: perPiece,
    baseTotal: Math.round(baseTotal),
    discountedTotal: Math.round(discountedTotal),
    urgencyAmount: Math.round(urgencyAmount),
    urgencyPercent: urgencyPercent,
    urgencyMultiplier: urgencyMultiplier,
    discountAmount: Math.round(discountAmount),
    deliveryCost: deliveryCost || 0,
    coverSheets: coverSheets,
    coverMaterialPricePerSheet: coverMaterialPricePerSheet,
    coverMaterialPrice: Math.round(coverMaterialPrice),
    coverPrintPrice: Math.round(coverPrintPrice),
    coverLaminationPrice: Math.round(coverLaminationPrice),
    blockSheetsPerCopy: blockSheetsPerCopy,
    totalBlockSheets: totalBlockSheets,
    blockMaterialPricePerSheet: blockMaterialPricePerSheet,
    blockMaterialPrice: Math.round(blockMaterialPrice),
    blockPrintPrice: Math.round(blockPrintPrice),
    bindingPricePerCopy: bindingPricePerCopy,
    totalBindingPrice: Math.round(totalBindingPrice),
    foldingPrice: Math.round(foldingPrice),
    colorMatchingPrice: colorMatchingPriceTotal,
    layoutsPrice: layoutsPriceTotal,
    perSheet: perSheet,
    fitDetails: fitDetails,
    formatType: formatType,
    sheetSizeForDisplay: sheetSizeForDisplay,
    totalWeight: totalWeight,
    totalWeightKg: totalWeightKg,
    isMinPriceApplied: isMinPriceApplied,
    minPriceValue: minPriceValue
  };
}
