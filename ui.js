// ui.js - Калькулятор брошюр
import { calculate, updateConstants } from './calc.js';
import { loadData } from './data.js';

let DATA;
let COVER_MATERIALS = [];
let BLOCK_MATERIALS = [];

const PRODUCT_IDS = {
  A5: 686,
  A4: 690,
  A6: 698,
  DL: 686,
  EURO: 686,
  CUSTOM: 676,
  DELIVERY: 416
};

const WEBHOOK_URL = 'https://grafiksv.bitrix24.ru/rest/8/cwtdbplshhnj21iy/';

function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function getDealIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('deal_id') || urlParams.get('DEAL_ID');
  if (dealId) return parseInt(dealId);
  return null;
}

export async function initUI(data) {
  console.log('initUI для брошюр вызван');
  DATA = data;
  updateConstants(DATA);

  COVER_MATERIALS = DATA.coverMaterials || [];
  BLOCK_MATERIALS = DATA.blockMaterials || [];

  const loadingEl = document.getElementById('loading');
  const resultsEl = document.getElementById('results');
  if (loadingEl) loadingEl.style.display = 'none';
  if (resultsEl) resultsEl.style.display = 'block';

  initSelects();
  bindUI();
  setupBackButton();

  setTimeout(() => {
    const coverMaterialSelect = document.getElementById('coverMaterialSelect');
    if (coverMaterialSelect && coverMaterialSelect.options.length > 0) {
      const melIndex = COVER_MATERIALS.findIndex(m => m.name === 'Мелованная бумага');
      if (melIndex !== -1) {
        coverMaterialSelect.value = melIndex;
        updateCoverDensityOptions(melIndex);
        setTimeout(() => {
          const densityRadios = document.querySelectorAll('input[name="coverDensity"]');
          for (const radio of densityRadios) {
            if (parseFloat(radio.value) === 250) {
              radio.checked = true;
              break;
            }
          }
        }, 50);
      }
    }

    const blockMaterialSelect = document.getElementById('blockMaterialSelect');
    if (blockMaterialSelect && blockMaterialSelect.options.length > 0) {
      const melIndex = BLOCK_MATERIALS.findIndex(m => m.name === 'Мелованная бумага');
      if (melIndex !== -1) {
        blockMaterialSelect.value = melIndex;
        updateBlockDensityOptions(melIndex);
        setTimeout(() => {
          const densityRadios = document.querySelectorAll('input[name="blockDensity"]');
          for (const radio of densityRadios) {
            if (parseFloat(radio.value) === 130) {
              radio.checked = true;
              break;
            }
          }
        }, 50);
      }
    }

    recalc();
  }, 100);

  updateLastUpdateTime();
}

function setupBackButton() {
  const backButton = document.getElementById('backButton');
  if (!backButton) return;

  const dealId = getDealIdFromUrl();

  backButton.addEventListener('click', function(e) {
    e.preventDefault();
    let targetUrl = 'https://misc.gv-integration.ru/';
    if (dealId) {
      targetUrl += '?deal_id=' + dealId;
    }
    window.location.href = targetUrl;
  });
}

function initSelects() {
  const formatSelect = document.getElementById('formatSelect');
  if (formatSelect && DATA.formats) {
    formatSelect.innerHTML = '';
    DATA.formats.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.code;
      opt.textContent = f.name;
      formatSelect.appendChild(opt);
    });
    if (formatSelect.options.length > 0) formatSelect.selectedIndex = 0;
  }

  const pageCountSelect = document.getElementById('pageCountSelect');
  if (pageCountSelect && DATA.pageCounts) {
    pageCountSelect.innerHTML = '';
    DATA.pageCounts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.value;
      opt.textContent = p.name;
      pageCountSelect.appendChild(opt);
    });
    if (pageCountSelect.options.length > 1) pageCountSelect.selectedIndex = 1;
  }

  updateCoverMaterialSelect();
  updateBlockMaterialSelect();

  const lamSelect = document.getElementById('laminationSelect');
  if (lamSelect && DATA.laminationTypes) {
    lamSelect.innerHTML = '';
    DATA.laminationTypes.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      lamSelect.appendChild(opt);
    });
    const noLamIndex = DATA.laminationTypes.findIndex(t => t.toLowerCase().includes('без ламинации'));
    if (noLamIndex !== -1) {
      lamSelect.selectedIndex = noLamIndex;
    }
  }

  const bindingSelect = document.getElementById('bindingSelect');
  if (bindingSelect && DATA.bindingTypes) {
    bindingSelect.innerHTML = '';
    DATA.bindingTypes.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.code;
      opt.textContent = b.name;
      bindingSelect.appendChild(opt);
    });
    if (bindingSelect.options.length > 1) bindingSelect.selectedIndex = 1;
  }
}

function updateCoverMaterialSelect() {
  const materialSelect = document.getElementById('coverMaterialSelect');
  if (!materialSelect) return;

  materialSelect.innerHTML = '';
  COVER_MATERIALS.forEach((m, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = m.name;
    materialSelect.appendChild(opt);
  });

  if (materialSelect.options.length > 0) {
    materialSelect.selectedIndex = 0;
    updateCoverDensityOptions(0);
  }
}

function updateBlockMaterialSelect() {
  const materialSelect = document.getElementById('blockMaterialSelect');
  if (!materialSelect) return;

  materialSelect.innerHTML = '';
  BLOCK_MATERIALS.forEach((m, index) => {
    const opt = document.createElement('option');
    opt.value = index;
    opt.textContent = m.name;
    materialSelect.appendChild(opt);
  });

  if (materialSelect.options.length > 0) {
    materialSelect.selectedIndex = 0;
    updateBlockDensityOptions(0);
  }
}

function updateCoverDensityOptions(materialIndex) {
  const container = document.getElementById('coverDensityContainer');
  if (!container) return;

  container.innerHTML = '';
  const material = COVER_MATERIALS[materialIndex];
  if (!material || !material.densities) return;

  material.densities.forEach((d, i) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'coverDensity';
    radio.value = d.value;
    if (i === 0) radio.checked = true;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(` ${d.value} г/м2`));
    container.appendChild(label);
  });
}

function updateBlockDensityOptions(materialIndex) {
  const container = document.getElementById('blockDensityContainer');
  if (!container) return;

  container.innerHTML = '';
  const material = BLOCK_MATERIALS[materialIndex];
  if (!material || !material.densities) return;

  material.densities.forEach((d, i) => {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'blockDensity';
    radio.value = d.value;
    if (i === 0) radio.checked = true;
    label.appendChild(radio);
    label.appendChild(document.createTextNode(` ${d.value} г/м2`));
    container.appendChild(label);
  });
}

function bindUI() {
  const formatSelect = document.getElementById('formatSelect');
  if (formatSelect) {
    formatSelect.addEventListener('change', function() {
      const customSizeGroup = document.getElementById('customSizeGroup');
      if (customSizeGroup) {
        customSizeGroup.style.display = (this.value === 'CUSTOM') ? 'grid' : 'none';
      }
      recalc();
    });
  }

  const coverMaterialSelect = document.getElementById('coverMaterialSelect');
  if (coverMaterialSelect) {
    coverMaterialSelect.addEventListener('change', function() {
      updateCoverDensityOptions(parseInt(this.value));
      recalc();
    });
  }

  const blockMaterialSelect = document.getElementById('blockMaterialSelect');
  if (blockMaterialSelect) {
    blockMaterialSelect.addEventListener('change', function() {
      updateBlockDensityOptions(parseInt(this.value));
      recalc();
    });
  }

  document.querySelectorAll('input[name="coverDensity"]').forEach(radio => {
    radio.addEventListener('change', recalc);
  });

  document.querySelectorAll('input[name="blockDensity"]').forEach(radio => {
    radio.addEventListener('change', recalc);
  });

  const pageCountSelect = document.getElementById('pageCountSelect');
  if (pageCountSelect) {
    pageCountSelect.addEventListener('change', recalc);
  }

  const circulationInput = document.getElementById('circulationInput');
  if (circulationInput) {
    circulationInput.addEventListener('input', recalc);
  }

  const laminationSelect = document.getElementById('laminationSelect');
  if (laminationSelect) {
    laminationSelect.addEventListener('change', recalc);
  }

  const bindingSelect = document.getElementById('bindingSelect');
  if (bindingSelect) {
    bindingSelect.addEventListener('change', recalc);
  }

  document.querySelectorAll('input[name="colorModeCover"]').forEach(radio => {
    radio.addEventListener('change', recalc);
  });

  document.querySelectorAll('input[name="colorModeBlock"]').forEach(radio => {
    radio.addEventListener('change', recalc);
  });

  document.querySelectorAll('input[name="colorMatching"]').forEach(radio => {
    radio.addEventListener('change', recalc);
  });

  const layoutsInput = document.getElementById('layoutsCount');
  if (layoutsInput) {
    layoutsInput.addEventListener('input', recalc);
  }

  document.querySelectorAll('input[name="urgency"]').forEach(radio => {
    radio.addEventListener('change', recalc);
  });

  const discountInput = document.getElementById('discountInput');
  if (discountInput) {
    discountInput.addEventListener('input', recalc);
  }

  const deliveryInput = document.getElementById('deliveryInput');
  if (deliveryInput) {
    deliveryInput.addEventListener('input', recalc);
  }

  const saveLocalBtn = document.getElementById('saveLocalBtn');
  if (saveLocalBtn) {
    saveLocalBtn.addEventListener('click', saveScreenshot);
  }

  const addProductBtn = document.getElementById('addProductBtn');
  if (addProductBtn) {
    addProductBtn.addEventListener('click', addToBitrix);
  }
}

function getFormData() {
  const format = document.getElementById('formatSelect')?.value || 'A5';
  const customWidth = parseFloat(document.getElementById('customWidth')?.value) || 0;
  const customHeight = parseFloat(document.getElementById('customHeight')?.value) || 0;
  const circulation = parseInt(document.getElementById('circulationInput')?.value) || 100;
  const pageCount = parseInt(document.getElementById('pageCountSelect')?.value) || 8;

  const coverMaterialIndex = parseInt(document.getElementById('coverMaterialSelect')?.value) || 0;
  const coverMaterial = COVER_MATERIALS[coverMaterialIndex];
  const coverDensityRadio = document.querySelector('input[name="coverDensity"]:checked');
  const coverDensity = coverDensityRadio ? parseFloat(coverDensityRadio.value) : 170;

  const blockMaterialIndex = parseInt(document.getElementById('blockMaterialSelect')?.value) || 0;
  const blockMaterial = BLOCK_MATERIALS[blockMaterialIndex];
  const blockDensityRadio = document.querySelector('input[name="blockDensity"]:checked');
  const blockDensity = blockDensityRadio ? parseFloat(blockDensityRadio.value) : 90;

  const colorModeCover = document.querySelector('input[name="colorModeCover"]:checked')?.value || '40';
  const colorModeBlock = document.querySelector('input[name="colorModeBlock"]:checked')?.value || '40';
  const lamination = document.getElementById('laminationSelect')?.value || 'без ламинации';
  const bindingType = document.getElementById('bindingSelect')?.value || 'none';
  const colorMatching = document.querySelector('input[name="colorMatching"]:checked')?.value || 'no';
  const layoutsCount = parseInt(document.getElementById('layoutsCount')?.value) || 1;
  const urgency = document.querySelector('input[name="urgency"]:checked')?.value || 'none';
  const discountPercent = parseFloat(document.getElementById('discountInput')?.value) || 0;
  const deliveryCost = parseFloat(document.getElementById('deliveryInput')?.value) || 0;

  return {
    format,
    customWidth,
    customHeight,
    circulation,
    pageCount,
    coverMaterial,
    coverDensity,
    blockMaterial,
    blockDensity,
    colorModeCover,
    colorModeBlock,
    lamination,
    bindingType,
    colorMatching,
    layoutsCount,
    urgency,
    discountPercent,
    deliveryCost
  };
}

function recalc() {
  try {
    const input = getFormData();
    const result = calculate(input, DATA);
    updateResults(result);

    const errorEl = document.getElementById('error');
    if (errorEl) errorEl.style.display = 'none';

  } catch (error) {
    console.error('Ошибка расчёта:', error);
    showError(error.message);
  }
}

function updateResults(result) {
  document.getElementById('coverPrintCost').textContent = result.coverPrintPrice + ' руб.';
  document.getElementById('coverMaterialCost').textContent = result.coverMaterialPrice + ' руб.';
  document.getElementById('coverLaminationCost').textContent = result.coverLaminationPrice + ' руб.';
  document.getElementById('blockPrintCost').textContent = result.blockPrintPrice + ' руб.';
  document.getElementById('blockMaterialCost').textContent = result.blockMaterialPrice + ' руб.';
  document.getElementById('foldingCost').textContent = result.foldingPrice + ' руб.';
  document.getElementById('bindingCost').textContent = result.totalBindingPrice + ' руб.';

  const colorMatchingRow = document.getElementById('colorMatchingRow');
  const colorMatchingCost = document.getElementById('colorMatchingCost');
  if (result.colorMatchingPrice > 0) {
    colorMatchingRow.style.display = 'flex';
    colorMatchingCost.textContent = result.colorMatchingPrice + ' руб.';
  } else {
    colorMatchingRow.style.display = 'none';
  }

  const layoutsRow = document.getElementById('layoutsRow');
  const layoutsCost = document.getElementById('layoutsCost');
  if (result.layoutsPrice > 0) {
    layoutsRow.style.display = 'flex';
    layoutsCost.textContent = result.layoutsPrice + ' руб.';
  } else {
    layoutsRow.style.display = 'none';
  }

  const urgencyRow = document.getElementById('urgencyRow');
  const urgencyCost = document.getElementById('urgencyCost');
  if (result.urgencyAmount > 0) {
    urgencyRow.style.display = 'flex';
    urgencyCost.textContent = result.urgencyAmount + ' руб.';
  } else {
    urgencyRow.style.display = 'none';
  }

  const discountRow = document.getElementById('discountRow');
  const discountAmount = document.getElementById('discountAmount');
  if (result.discountAmount > 0) {
    discountRow.style.display = 'flex';
    discountAmount.textContent = result.discountAmount + ' руб.';
  } else {
    discountRow.style.display = 'none';
  }

  document.getElementById('deliveryCost').textContent = result.deliveryCost + ' руб.';
  document.getElementById('totalEl').textContent = result.total + ' руб.';
  document.getElementById('perPieceEl').textContent = result.perPiece.toFixed(2) + ' руб.';

  if (result.isMinPriceApplied) {
    document.getElementById('minimumCostMessage').style.display = 'flex';
    document.getElementById('minimumCostValue').textContent = result.minPriceValue + ' руб.';
  } else {
    document.getElementById('minimumCostMessage').style.display = 'none';
  }

  document.getElementById('weightValue').textContent = Math.round(result.totalWeight) + ' г';

  const details = document.getElementById('details');
  if (details) {
    details.innerHTML = `
      Формат бумаги: ${result.sheetSizeForDisplay} мм<br>
      Листов обложки: ${result.coverSheets}<br>
      Листов блока: ${result.totalBlockSheets}
    `;
  }
}

function showError(message) {
  const errorEl = document.getElementById('error');
  if (errorEl) {
    errorEl.style.display = 'block';
    errorEl.textContent = message;
  }
}

function updateLastUpdateTime() {
  const lastUpdate = document.getElementById('lastUpdate');
  if (lastUpdate) {
    const now = new Date();
    const timeStr = now.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    lastUpdate.textContent = 'Данные обновлены: ' + timeStr;
  }
}

async function saveScreenshot() {
  const calculator = document.getElementById('calculator');
  if (!calculator) return;

  try {
    if (typeof html2canvas !== 'undefined') {
      const canvas = await html2canvas(calculator);
      const link = document.createElement('a');
      link.download = 'brochure-calculator.png';
      link.href = canvas.toDataURL();
      link.click();
    } else {
      window.print();
    }
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    alert('Не удалось сохранить. Попробуйте нажать Ctrl+P.');
  }
}

async function addToBitrix() {
  const dealId = getDealIdFromUrl();
  if (!dealId) {
    alert('ID сделки не найден в URL. Невозможно добавить товар.');
    return;
  }

  const input = getFormData();
  const result = calculate(input, DATA);

  const productData = {
    id: PRODUCT_IDS[input.format] || PRODUCT_IDS.CUSTOM,
    price: result.total,
    quantity: input.circulation,
    properties: {
      format: input.format,
      pageCount: input.pageCount,
      coverMaterial: input.coverMaterial?.name || '',
      coverDensity: input.coverDensity,
      blockMaterial: input.blockMaterial?.name || '',
      blockDensity: input.blockDensity,
      lamination: input.lamination,
      binding: input.bindingType
    }
  };

  try {
    const response = await fetch(WEBHOOK_URL + 'crm.productrow.add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          OWNER_TYPE: 'D',
          OWNER_ID: dealId,
          PRODUCT_ID: productData.id,
          PRICE: productData.price,
          QUANTITY: productData.quantity
        }
      })
    });

    if (response.ok) {
      alert('Товар успешно добавлен в сделку!');
    } else {
      throw new Error('Ошибка добавления');
    }
  } catch (error) {
    console.error('Ошибка Bitrix:', error);
    alert('Не удалось добавить товар в Битрикс24.');
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    const data = await loadData();
    await initUI(data);
  } catch (error) {
    console.error('Критическая ошибка инициализации:', error);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.innerHTML = '<div class="error">Ошибка загрузки данных: ' + error.message + '</div>';
    }
  }
});
