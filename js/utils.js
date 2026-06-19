import { WEIGHT_DECIMALS } from './constants.js';

/** Genera un identificador único con fallback seguro */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Fecha local en formato ISO (YYYY-MM-DD) sin depender de UTC */
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Formatea una fecha ISO a formato argentino evitando desfases por zona horaria */
export function formatDateAR(isoDate) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return 'Sin fecha';
  }
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }
  return date.toLocaleDateString('es-AR', { dateStyle: 'medium' });
}

/** Formatea fecha y hora de generación para impresión */
export function formatDateTimeAR(date = new Date()) {
  return date.toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Redondeo centralizado para pesos */
export function roundWeight(value) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** WEIGHT_DECIMALS;
  return Math.round(value * factor) / factor;
}

/** Formatea un peso para visualización (formato argentino) */
export function formatWeight(value) {
  const rounded = roundWeight(value);
  return rounded.toLocaleString('es-AR', {
    minimumFractionDigits: WEIGHT_DECIMALS,
    maximumFractionDigits: WEIGHT_DECIMALS,
  });
}

/** Crea un elemento DOM con atributos y hijos de forma segura */
export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (val === undefined || val === null) continue;
    if (key === 'className') {
      element.className = val;
    } else if (key === 'textContent') {
      element.textContent = val;
    } else if (key === 'htmlFor') {
      element.htmlFor = val;
    } else if (key === 'disabled') {
      element.disabled = Boolean(val);
    } else if (key.startsWith('data-')) {
      element.setAttribute(key, String(val));
    } else if (
      key.startsWith('aria') ||
      key === 'role' ||
      key === 'id' ||
      key === 'type' ||
      key === 'name' ||
      key === 'value' ||
      key === 'placeholder' ||
      key === 'inputMode' ||
      key === 'maxlength' ||
      key === 'tabIndex' ||
      key === 'autocomplete' ||
      key === 'required'
    ) {
      element.setAttribute(key, String(val));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else {
      element.appendChild(child);
    }
  }
  return element;
}
