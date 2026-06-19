import { calculateGlobalTotals, calculateMaterialTotals } from './calculations.js';
import { COMPANY_NAME } from './constants.js';
import { el, formatDateAR, formatDateTimeAR, formatWeight } from './utils.js';

/** Renderiza las secciones de impresión en el DOM de forma segura */
export function renderPrintSections(state, printRoot) {
  printRoot.replaceChildren();

  const global = calculateGlobalTotals(state.materials, state.tarePerWeighing);
  const clientDisplay = state.client.trim() || 'Sin especificar';
  const dateDisplay = formatDateAR(state.date);

  printRoot.appendChild(buildSummaryDocument(state, global, clientDisplay, dateDisplay));
  printRoot.appendChild(buildDetailDocument(state, global, clientDisplay, dateDisplay));
}

function buildPrintHeader(clientDisplay, dateDisplay, operationId, subtitle) {
  return el('header', { className: 'print-doc__header' }, [
    el('p', { className: 'print-doc__company', textContent: COMPANY_NAME }),
    el('h1', { className: 'print-doc__title', textContent: subtitle }),
    el('div', { className: 'print-doc__meta' }, [
      el('p', {}, [el('strong', { textContent: 'Cliente: ' }), document.createTextNode(clientDisplay)]),
      el('p', {}, [el('strong', { textContent: 'Fecha: ' }), document.createTextNode(dateDisplay)]),
      el('p', {}, [el('strong', { textContent: 'Operación N°: ' }), document.createTextNode(operationId)]),
    ]),
  ]);
}

function buildSummaryDocument(state, global, clientDisplay, dateDisplay) {
  const section = el('section', {
    className: 'print-doc print-doc--summary',
    id: 'print-summary',
    ariaHidden: 'true',
  });

  section.appendChild(buildPrintHeader(clientDisplay, dateDisplay, state.operationId, 'Boleta de Pesadas'));

  const table = el('table', { className: 'print-doc__table' });
  const thead = el('thead');
  const headRow = el('tr');
  ['Material', 'Peso bruto (kg)', 'Cant. pesadas', 'Tara descontada (kg)', 'Peso neto (kg)'].forEach((text) => {
    headRow.appendChild(el('th', { textContent: text }));
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = el('tbody');
  const activeMaterials = state.materials.filter((m) => {
    const t = calculateMaterialTotals(m, state.tarePerWeighing);
    return t.weighingCount > 0;
  });

  if (activeMaterials.length === 0) {
    const row = el('tr');
    const cell = el('td', { textContent: 'Sin pesadas registradas.' });
    cell.colSpan = 5;
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    activeMaterials.forEach((material, index) => {
      const totals = calculateMaterialTotals(material, state.tarePerWeighing);
      const row = el('tr');
      row.appendChild(el('td', { textContent: `${index + 1}. ${material.type}` }));
      row.appendChild(el('td', { textContent: formatWeight(totals.grossWeight) }));
      row.appendChild(el('td', { textContent: String(totals.weighingCount) }));
      row.appendChild(el('td', { textContent: `-${formatWeight(totals.totalTare)}` }));
      row.appendChild(el('td', { textContent: formatWeight(totals.netWeight) }));
      tbody.appendChild(row);
    });
  }

  table.appendChild(tbody);
  section.appendChild(table);

  section.appendChild(
    el('div', { className: 'print-doc__total' }, [
      el('p', { className: 'print-doc__total-label', textContent: 'Peso neto global' }),
      el('p', { className: 'print-doc__total-value', textContent: `${formatWeight(global.netWeight)} kg` }),
    ])
  );

  section.appendChild(
    el('div', { className: 'print-doc__signature' }, [
      el('div', { className: 'print-doc__signature-line' }),
      el('p', { textContent: 'Firma / Aclaración' }),
    ])
  );

  section.appendChild(
    el('footer', { className: 'print-doc__footer' }, [
      el('p', { textContent: `Generado: ${formatDateTimeAR()}` }),
      el('p', { textContent: `Tara fija: ${state.tarePerWeighing} kg por pesada positiva` }),
    ])
  );

  return section;
}

function buildDetailDocument(state, global, clientDisplay, dateDisplay) {
  const section = el('section', {
    className: 'print-doc print-doc--detail',
    id: 'print-detail',
    ariaHidden: 'true',
  });

  section.appendChild(buildPrintHeader(clientDisplay, dateDisplay, state.operationId, 'Detalle completo de pesadas'));

  const activeMaterials = state.materials.filter((m) => {
    const t = calculateMaterialTotals(m, state.tarePerWeighing);
    return t.weighingCount > 0;
  });

  if (activeMaterials.length === 0) {
    section.appendChild(el('p', { textContent: 'No hay pesadas registradas para mostrar el detalle.' }));
  } else {
    activeMaterials.forEach((material, matIndex) => {
      const totals = calculateMaterialTotals(material, state.tarePerWeighing);
      const block = el('article', { className: 'print-doc__material-block' });

      block.appendChild(
        el('h2', { className: 'print-doc__material-title', textContent: `Material ${matIndex + 1}: ${material.type}` })
      );

      const table = el('table', { className: 'print-doc__table print-doc__table--detail' });
      const thead = el('thead');
      const headRow = el('tr');
      ['N°', 'Peso bruto (kg)'].forEach((text) => headRow.appendChild(el('th', { textContent: text })));
      thead.appendChild(headRow);
      table.appendChild(thead);

      const tbody = el('tbody');
      let weighIndex = 0;
      material.weighings.forEach((w) => {
        if (w.grossWeight > 0) {
          weighIndex++;
          const row = el('tr');
          row.appendChild(el('td', { textContent: String(weighIndex) }));
          row.appendChild(el('td', { textContent: formatWeight(w.grossWeight) }));
          tbody.appendChild(row);
        }
      });
      table.appendChild(tbody);
      block.appendChild(table);

      block.appendChild(
        el('div', { className: 'print-doc__material-totals' }, [
          el('p', { textContent: `Peso bruto total: ${formatWeight(totals.grossWeight)} kg` }),
          el('p', { textContent: `Cantidad de pesadas: ${totals.weighingCount}` }),
          el('p', { textContent: `Tara total: -${formatWeight(totals.totalTare)} kg` }),
          el('p', { className: 'print-doc__material-net', textContent: `Peso neto del material: ${formatWeight(totals.netWeight)} kg` }),
        ])
      );

      section.appendChild(block);
    });
  }

  section.appendChild(
    el('div', { className: 'print-doc__total' }, [
      el('p', { className: 'print-doc__total-label', textContent: 'Peso neto global' }),
      el('p', { className: 'print-doc__total-value', textContent: `${formatWeight(global.netWeight)} kg` }),
    ])
  );

  section.appendChild(
    el('footer', { className: 'print-doc__footer' }, [
      el('p', { textContent: `Generado: ${formatDateTimeAR()}` }),
    ])
  );

  return section;
}

/** Activa el modo de impresión y dispara window.print() */
export function triggerPrint(mode) {
  document.body.classList.remove('printing--summary', 'printing--detail');
  document.body.classList.add(`printing--${mode}`);

  const cleanup = () => {
    document.body.classList.remove('printing--summary', 'printing--detail');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  window.print();
}
