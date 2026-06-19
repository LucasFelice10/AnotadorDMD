import { createInitialState, addMaterial, removeMaterial, addWeighing, removeWeighing, updateWeighing, applyWeighingValidation, updateMaterialType } from './state.js';
import { normalizeWeight, validateClient, validateDate, validateForPrint } from './validation.js';
import { renderApp, renderSummaryOnly, updateWeighingError } from './renderer.js';
import { renderPrintSections, triggerPrint } from './printing.js';

/** Aplicación principal — orquestación de estado, eventos y renderizado */
class App {
  constructor() {
    this.state = createInitialState();
    this.refs = {
      header: document.getElementById('app-header'),
      operationForm: document.getElementById('operation-form'),
      materialsArea: document.getElementById('materials-area'),
      summaryPanel: document.getElementById('summary-panel'),
      toastRoot: document.getElementById('toast-root'),
      modalRoot: document.getElementById('modal-root'),
      printRoot: document.getElementById('print-root'),
    };
    this.toastTimer = null;
    this.isPrinting = false;
  }

  init() {
    this.bindEvents();
    this.render(true);
  }

  setState(updater) {
    const prev = this.state;
    this.state = typeof updater === 'function' ? updater(prev) : updater;
    this.state = { ...this.state, focusTarget: this.state.focusTarget ?? null };
    this.render();
  }

  render(fullRender = false) {
    renderPrintSections(this.state, this.refs.printRoot);

    if (fullRender || this.state.focusTarget || this.state.confirm) {
      renderApp(this.state, this.refs);
      this.state = { ...this.state, focusTarget: null };
    } else {
      renderSummaryOnly(this.state, this.refs);
    }
  }

  showToast(message, type = 'info') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.state = { ...this.state, toast: { message, type } };
    renderApp(this.state, this.refs);
    this.toastTimer = setTimeout(() => {
      this.state = { ...this.state, toast: null };
      renderApp(this.state, this.refs);
    }, 4000);
  }

  showConfirm({ title, message, confirmLabel, cancelLabel, onConfirm }) {
    this.state.lastFocusedElement = document.activeElement;
    this.state = {
      ...this.state,
      confirm: { title, message, confirmLabel, cancelLabel, onConfirm },
    };
    renderApp(this.state, this.refs);

    requestAnimationFrame(() => {
      document.getElementById('confirm-cancel')?.focus();
    });
  }

  closeConfirm() {
    const restore = this.state.lastFocusedElement;
    this.state = { ...this.state, confirm: null, lastFocusedElement: null };
    renderApp(this.state, this.refs);
    restore?.focus?.();
  }

  bindEvents() {
    const app = document.getElementById('app');

    app.addEventListener('input', (e) => this.handleInput(e));
    app.addEventListener('change', (e) => this.handleChange(e));
    app.addEventListener('click', (e) => this.handleClick(e));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.confirm) {
        e.preventDefault();
        this.closeConfirm();
        return;
      }

      if (e.key === 'Tab' && this.state.confirm) {
        const modal = this.refs.modalRoot.querySelector('.modal');
        if (!modal) return;
        const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    this.refs.modalRoot.addEventListener('click', (e) => {
      const action = e.target.closest('[data-action]')?.dataset.action;
      if (action === 'confirm-cancel') this.closeConfirm();
      if (action === 'confirm-ok') {
        const btn = e.target.closest('#confirm-ok');
        const callback = btn?._onConfirm;
        this.closeConfirm();
        callback?.();
      }
    });
  }

  handleInput(e) {
    const target = e.target;
    if (target.name === 'client') {
      const value = target.value.slice(0, 100);
      const validation = validateClient(value);
      this.state = {
        ...this.state,
        client: value,
        clientError: validation.message,
      };
      renderSummaryOnly(this.state, this.refs);
      return;
    }

    if (target.dataset.action === 'update-weight') {
      const { materialId, weighingId } = target.dataset;
      this.state = updateWeighing(this.state, materialId, weighingId, target.value);
      const result = normalizeWeight(target.value);
      this.state = applyWeighingValidation(this.state, materialId, weighingId, result);
      updateWeighingError(weighingId, result.error);
      renderSummaryOnly(this.state, this.refs);
    }
  }

  handleChange(e) {
    const target = e.target;

    if (target.name === 'date') {
      const validation = validateDate(target.value);
      if (!validation.valid) {
        this.showToast(validation.message, 'error');
        return;
      }
      this.state = { ...this.state, date: target.value };
      renderSummaryOnly(this.state, this.refs);
      return;
    }

    if (target.dataset.action === 'change-type') {
      const { materialId } = target.dataset;
      this.state = updateMaterialType(this.state, materialId, target.value);
      renderSummaryOnly(this.state, this.refs);
    }
  }

  handleClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;

    const action = btn.dataset.action;

    switch (action) {
      case 'add-material':
        this.setState((s) => addMaterial(s));
        break;

      case 'add-weighing':
        this.setState((s) => addWeighing(s, btn.dataset.materialId));
        break;

      case 'remove-weighing':
        this.setState((s) => removeWeighing(s, btn.dataset.materialId, btn.dataset.weighingId));
        break;

      case 'remove-material':
        this.showConfirm({
          title: 'Eliminar material',
          message: '¿Confirma que desea eliminar este material y todas sus pesadas?',
          confirmLabel: 'Eliminar',
          cancelLabel: 'Cancelar',
          onConfirm: () => {
            this.setState((s) => removeMaterial(s, btn.dataset.materialId));
          },
        });
        break;

      case 'print-summary':
        this.print('summary');
        break;

      case 'print-detail':
        this.print('detail');
        break;

      default:
        break;
    }
  }

  print(mode) {
    if (this.isPrinting) return;

    const validation = validateForPrint(this.state);
    if (!validation.valid) {
      this.showToast(validation.errors[0], 'error');
      return;
    }

    this.isPrinting = true;
    renderPrintSections(this.state, this.refs.printRoot);
    triggerPrint(mode);

    setTimeout(() => {
      this.isPrinting = false;
    }, 1000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
