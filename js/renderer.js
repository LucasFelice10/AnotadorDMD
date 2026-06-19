import { calculateGlobalTotals, calculateMaterialTotals } from './calculations.js';
import { APP_TITLE, COMPANY_NAME, MATERIAL_TYPES, TARE_PER_WEIGHING } from './constants.js';
import { icons } from './icons.js';
import { el, formatDateAR, formatWeight } from './utils.js';

const FOCUSABLE = 'input:not([disabled]), select:not([disabled]), button:not([disabled])';

/** Renderiza la aplicación completa */
export function renderApp(state, refs) {
  renderHeader(refs.header);
  renderOperationData(state, refs.operationForm);
  renderMaterials(state, refs.materialsArea);
  renderSummaryPanel(state, refs.summaryPanel);
  renderToast(state, refs.toastRoot);
  renderConfirmModal(state, refs.modalRoot);
  restoreFocus(state, refs);
}

function renderHeader(container) {
  if (container.dataset.rendered) return;
  container.dataset.rendered = 'true';
  container.replaceChildren(
    el('div', { className: 'header__brand' }, [
      el('div', { className: 'header__logo', 'aria-hidden': 'true' }, [icons.scale()]),
      el('div', { className: 'header__titles' }, [
        el('p', { className: 'header__company', textContent: COMPANY_NAME }),
        el('h1', { className: 'header__title', textContent: APP_TITLE }),
        el('p', { className: 'header__subtitle', textContent: 'Registro y cálculo de metales' }),
      ]),
    ]),
    el('div', { className: 'header__badge', role: 'status' }, [
      el('span', { className: 'header__badge-label', textContent: 'Tara fija' }),
      el('span', { className: 'header__badge-value', textContent: `${TARE_PER_WEIGHING} kg por pesada` }),
    ])
  );
}

function renderOperationData(state, container) {
  const clientErrorId = 'client-error';
  container.replaceChildren(
    el('h2', { className: 'section-title', textContent: 'Datos de la operación' }),
    el('div', { className: 'form-grid' }, [
      buildField({
        id: 'field-date',
        label: 'Fecha',
        icon: icons.calendar(),
        input: el('input', {
          type: 'date',
          id: 'field-date',
          name: 'date',
          className: 'input',
          value: state.date,
          required: true,
        }),
      }),
      buildField({
        id: 'field-client',
        label: 'Cliente',
        icon: icons.user(),
        input: el('input', {
          type: 'text',
          id: 'field-client',
          name: 'client',
          className: `input${state.clientError ? ' input--error' : ''}`,
          value: state.client,
          placeholder: 'Nombre del cliente',
          maxlength: '100',
          autocomplete: 'off',
          'aria-describedby': state.clientError ? clientErrorId : undefined,
          'aria-invalid': state.clientError ? 'true' : 'false',
        }),
        error: state.clientError
          ? el('p', { id: clientErrorId, className: 'field-error', role: 'alert', textContent: state.clientError })
          : null,
      }),
    ])
  );
}

function buildField({ id, label, icon, input, error }) {
  const labelEl = el('label', { className: 'field-label', htmlFor: id }, [
    icon,
    document.createTextNode(` ${label}`),
  ]);
  const children = [labelEl, input];
  if (error) children.push(error);
  return el('div', { className: 'field' }, children);
}

function renderMaterials(state, container) {
  const header = el('div', { className: 'materials-header' }, [
    el('div', {}, [
      el('h2', { className: 'section-title', textContent: 'Materiales' }),
      el('p', {
        className: 'materials-count',
        textContent: `${state.materials.length} material${state.materials.length === 1 ? '' : 'es'} cargado${state.materials.length === 1 ? '' : 's'}`,
      }),
    ]),
    el('button', {
      type: 'button',
      className: 'btn btn--primary',
      id: 'btn-add-material',
      'data-action': 'add-material',
    }, [icons.add(), document.createTextNode(' Agregar material')]),
  ]);

  const list = el('div', { className: 'materials-list', id: 'materials-list' });

  if (state.materials.length === 0) {
    list.appendChild(
      el('div', { className: 'empty-state' }, [
        el('div', { className: 'empty-state__icon', 'aria-hidden': 'true' }, [icons.package()]),
        el('h3', { className: 'empty-state__title', textContent: 'Sin materiales registrados' }),
        el('p', {
          className: 'empty-state__text',
          textContent: 'Agregue un material para comenzar a registrar pesadas.',
        }),
      ])
    );
  } else {
    state.materials.forEach((material, index) => {
      list.appendChild(buildMaterialCard(material, index, state));
    });
  }

  container.replaceChildren(header, list);
}

function buildMaterialCard(material, index, state) {
  const totals = calculateMaterialTotals(material, state.tarePerWeighing);
  const cardId = `material-${material.id}`;

  const selectId = `select-${material.id}`;
  const select = el('select', {
    id: selectId,
    className: 'input input--select',
    name: 'material-type',
    'data-action': 'change-type',
    'data-material-id': material.id,
  });
  MATERIAL_TYPES.forEach((type) => {
    const option = el('option', { value: type, textContent: type });
    if (type === material.type) option.selected = true;
    select.appendChild(option);
  });

  const weighingsList = el('ol', { className: 'weighings-list' });
  material.weighings.forEach((weighing, wIndex) => {
    weighingsList.appendChild(buildWeighingRow(material, weighing, wIndex, state));
  });

  const warning = totals.hasLowWeighingWarning
    ? el('div', { className: 'alert alert--warning', role: 'status' }, [
        icons.warning(),
        el('span', {
          textContent: `Hay pesadas menores a ${state.tarePerWeighing} kg. El peso neto puede resultar negativo.`,
        }),
      ])
    : null;

  const cardChildren = [
    el('header', { className: 'material-card__header' }, [
      el('span', { className: 'material-card__number', textContent: `Material ${index + 1}` }),
      el('div', { className: 'material-card__type' }, [
        el('label', { className: 'field-label field-label--sm', htmlFor: selectId, textContent: 'Tipo' }),
        select,
      ]),
    ]),
    el('div', { className: 'material-card__body' }, [
      el('h3', { className: 'material-card__subtitle', textContent: 'Pesadas' }),
      weighingsList,
      el('div', { className: 'material-card__actions' }, [
        el('button', {
          type: 'button',
          className: 'btn btn--secondary btn--sm',
          'data-action': 'add-weighing',
          'data-material-id': material.id,
        }, [icons.add(), document.createTextNode(' Agregar pesada')]),
        el('button', {
          type: 'button',
          className: 'btn btn--danger btn--sm',
          'data-action': 'remove-material',
          'data-material-id': material.id,
        }, [icons.trash(), document.createTextNode(' Eliminar material')]),
      ]),
    ]),
    el('footer', { className: 'material-card__footer' }, [
      el('dl', { className: 'material-totals' }, [
        el('div', { className: 'material-totals__row' }, [
          el('dt', { textContent: 'Peso bruto' }),
          el('dd', { textContent: `${formatWeight(totals.grossWeight)} kg` }),
        ]),
        el('div', { className: 'material-totals__row' }, [
          el('dt', { textContent: `Tara (${totals.weighingCount}×${state.tarePerWeighing} kg)` }),
          el('dd', { textContent: `-${formatWeight(totals.totalTare)} kg` }),
        ]),
        el('div', { className: 'material-totals__row material-totals__row--net' }, [
          el('dt', { textContent: 'Peso neto' }),
          el('dd', { textContent: `${formatWeight(totals.netWeight)} kg` }),
        ]),
      ]),
    ]),
  ];

  if (warning) cardChildren.splice(2, 0, warning);

  return el('article', {
    className: 'material-card',
    id: cardId,
    'data-material-id': material.id,
  }, cardChildren);
}

function buildWeighingRow(material, weighing, index) {
  const inputId = `weight-${weighing.id}`;
  const errorId = `error-${weighing.id}`;
  const displayValue = weighing.rawInput !== ''
    ? weighing.rawInput
    : (weighing.grossWeight !== null ? String(weighing.grossWeight).replace('.', ',') : '');

  const input = el('input', {
    type: 'text',
    inputMode: 'decimal',
    id: inputId,
    className: `input input--weight${weighing.error ? ' input--error' : ''}`,
    name: 'weight',
    value: displayValue,
    placeholder: '0,00',
    'data-action': 'update-weight',
    'data-material-id': material.id,
    'data-weighing-id': weighing.id,
    'aria-describedby': weighing.error ? errorId : undefined,
    'aria-invalid': weighing.error ? 'true' : 'false',
    autocomplete: 'off',
  });

  return el('li', { className: 'weighing-row', 'data-weighing-id': weighing.id }, [
    el('span', { className: 'weighing-row__number', textContent: `${index + 1}.` }),
    el('div', { className: 'weighing-row__field' }, [
      el('label', { className: 'visually-hidden', htmlFor: inputId, textContent: `Peso de pesada ${index + 1}` }),
      el('div', { className: 'weight-input-group' }, [
        input,
        el('span', { className: 'weight-input-group__suffix', textContent: 'kg' }),
      ]),
      weighing.error
        ? el('p', { id: errorId, className: 'field-error', role: 'alert', textContent: weighing.error })
        : null,
    ]),
    el('button', {
      type: 'button',
      className: 'btn btn--icon btn--danger-ghost',
      'data-action': 'remove-weighing',
      'data-material-id': material.id,
      'data-weighing-id': weighing.id,
      'aria-label': `Eliminar pesada ${index + 1}`,
    }, [icons.remove()]),
  ]);
}

function renderSummaryPanel(state, container) {
  const global = calculateGlobalTotals(state.materials, state.tarePerWeighing);
  const clientDisplay = state.client.trim() || 'Sin especificar';
  const dateDisplay = formatDateAR(state.date);
  const hasWeighings = global.weighingCount > 0;

  container.replaceChildren(
    el('h2', { className: 'section-title', textContent: 'Resumen de operación' }),
    el('dl', { className: 'summary-stats' }, [
      summaryRow('Cliente', clientDisplay),
      summaryRow('Fecha', dateDisplay),
      summaryRow('Materiales', String(state.materials.length)),
      summaryRow('Pesadas válidas', String(global.weighingCount)),
      summaryRow('Peso bruto global', `${formatWeight(global.grossWeight)} kg`),
      summaryRow('Tara global', `-${formatWeight(global.totalTare)} kg`),
    ]),
    el('div', {
      className: 'summary-net',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'true',
    }, [
      el('span', { className: 'summary-net__label', textContent: 'Peso neto global' }),
      el('span', { className: 'summary-net__value', textContent: `${formatWeight(global.netWeight)} kg` }),
    ]),
    el('p', {
      className: 'summary-tare-note',
      textContent: `Se descuentan ${state.tarePerWeighing} kg de tara por cada pesada con peso mayor a cero.`,
    }),
    el('div', { className: 'summary-actions' }, [
      el('button', {
        type: 'button',
        className: 'btn btn--primary btn--block',
        id: 'btn-print-summary',
        'data-action': 'print-summary',
        disabled: !hasWeighings ? 'true' : undefined,
      }, [icons.print(), document.createTextNode(' Imprimir boleta')]),
      el('button', {
        type: 'button',
        className: 'btn btn--secondary btn--block',
        id: 'btn-print-detail',
        'data-action': 'print-detail',
        disabled: !hasWeighings ? 'true' : undefined,
      }, [icons.document(), document.createTextNode(' Imprimir detalle')]),
    ])
  );
}

function summaryRow(label, value) {
  return el('div', { className: 'summary-stats__row' }, [
    el('dt', { textContent: label }),
    el('dd', { textContent: value }),
  ]);
}

function renderToast(state, container) {
  container.replaceChildren();
  if (!state.toast) return;

  container.appendChild(
    el('div', {
      className: `toast toast--${state.toast.type}`,
      role: state.toast.type === 'error' ? 'alert' : 'status',
      'aria-live': 'polite',
      textContent: state.toast.message,
    })
  );
}

function renderConfirmModal(state, container) {
  container.replaceChildren();
  if (!state.confirm) return;

  const { title, message, confirmLabel, cancelLabel, onConfirm } = state.confirm;
  const titleId = 'confirm-title';
  const descId = 'confirm-desc';

  const cancelBtn = el('button', {
    type: 'button',
    className: 'btn btn--secondary',
    id: 'confirm-cancel',
    textContent: cancelLabel || 'Cancelar',
  });

  const confirmBtn = el('button', {
    type: 'button',
    className: 'btn btn--danger',
    id: 'confirm-ok',
    textContent: confirmLabel || 'Confirmar',
  });

  const dialog = el('div', {
    className: 'modal-overlay',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': titleId,
    'aria-describedby': descId,
  }, [
    el('div', { className: 'modal' }, [
      el('h2', { id: titleId, className: 'modal__title', textContent: title }),
      el('p', { id: descId, className: 'modal__message', textContent: message }),
      el('div', { className: 'modal__actions' }, [cancelBtn, confirmBtn]),
    ]),
  ]);

  container.appendChild(dialog);

  cancelBtn.dataset.action = 'confirm-cancel';
  confirmBtn.dataset.action = 'confirm-ok';
  confirmBtn._onConfirm = onConfirm;
}

function restoreFocus(state) {
  if (!state.focusTarget) return;

  const { materialId, weighingId } = state.focusTarget;
  const selector = weighingId
    ? `#weight-${weighingId}`
    : `#material-${materialId} ${FOCUSABLE}`;

  requestAnimationFrame(() => {
    const target = document.querySelector(selector);
    if (target) {
      target.focus();
      if (target.tagName === 'INPUT' && target.value) {
        target.setSelectionRange(target.value.length, target.value.length);
      }
    }
  });
}

/** Actualiza panel de resumen sin reemplazar campos activos */
export function renderSummaryOnly(state, refs) {
  updateClientValidation(state, refs.operationForm);
  renderSummaryPanel(state, refs.summaryPanel);
  updateMaterialFooters(state, refs);
}

function updateClientValidation(state, container) {
  const input = container.querySelector('#field-client');
  if (!input) return;

  const errorId = 'client-error';
  let errorEl = container.querySelector(`#${errorId}`);

  if (state.clientError) {
    input.classList.add('input--error');
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
    if (!errorEl) {
      const field = input.closest('.field');
      errorEl = el('p', { id: errorId, className: 'field-error', role: 'alert', textContent: state.clientError });
      field?.appendChild(errorEl);
    } else {
      errorEl.textContent = state.clientError;
    }
  } else {
    input.classList.remove('input--error');
    input.setAttribute('aria-invalid', 'false');
    input.removeAttribute('aria-describedby');
    errorEl?.remove();
  }
}

function updateMaterialFooters(state, refs) {
  state.materials.forEach((material) => {
    const card = refs.materialsArea.querySelector(`[data-material-id="${material.id}"]`);
    if (!card) return;

    const totals = calculateMaterialTotals(material, state.tarePerWeighing);
    const footer = card.querySelector('.material-card__footer');
    if (!footer) return;

    footer.replaceChildren(
      el('dl', { className: 'material-totals' }, [
        el('div', { className: 'material-totals__row' }, [
          el('dt', { textContent: 'Peso bruto' }),
          el('dd', { textContent: `${formatWeight(totals.grossWeight)} kg` }),
        ]),
        el('div', { className: 'material-totals__row' }, [
          el('dt', { textContent: `Tara (${totals.weighingCount}×${state.tarePerWeighing} kg)` }),
          el('dd', { textContent: `-${formatWeight(totals.totalTare)} kg` }),
        ]),
        el('div', { className: 'material-totals__row material-totals__row--net' }, [
          el('dt', { textContent: 'Peso neto' }),
          el('dd', { textContent: `${formatWeight(totals.netWeight)} kg` }),
        ]),
      ])
    );

    const existingWarning = card.querySelector('.alert--warning');
    if (totals.hasLowWeighingWarning && !existingWarning) {
      const warning = el('div', { className: 'alert alert--warning', role: 'status' }, [
        icons.warning(),
        el('span', {
          textContent: `Hay pesadas menores a ${state.tarePerWeighing} kg. El peso neto puede resultar negativo.`,
        }),
      ]);
      footer.before(warning);
    } else if (!totals.hasLowWeighingWarning && existingWarning) {
      existingWarning.remove();
    }
  });
}

/** Actualiza errores de pesada en una fila sin re-render completo */
export function updateWeighingError(weighingId, error) {
  const row = document.querySelector(`[data-weighing-id="${weighingId}"]`);
  if (!row) return;

  const input = row.querySelector('input');
  const errorId = `error-${weighingId}`;

  row.querySelector('.field-error')?.remove();

  if (error) {
    input.classList.add('input--error');
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorId);
    input.parentElement.appendChild(
      el('p', { id: errorId, className: 'field-error', role: 'alert', textContent: error })
    );
  } else {
    input.classList.remove('input--error');
    input.setAttribute('aria-invalid', 'false');
    input.removeAttribute('aria-describedby');
  }
}
