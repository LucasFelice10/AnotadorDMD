import { MAX_CLIENT_LENGTH, MAX_WEIGHT, WEIGHT_DECIMALS } from './constants.js';
import { roundWeight } from './utils.js';

/** Normaliza el nombre del cliente */
export function normalizeClient(value) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, MAX_CLIENT_LENGTH);
}

/** Valida el nombre del cliente */
export function validateClient(value) {
  const normalized = normalizeClient(value);
  if (normalized.length === 0) {
    return { valid: true, normalized, message: '' };
  }
  if (normalized.length > MAX_CLIENT_LENGTH) {
    return {
      valid: false,
      normalized: normalized.slice(0, MAX_CLIENT_LENGTH),
      message: `El nombre no puede superar ${MAX_CLIENT_LENGTH} caracteres.`,
    };
  }
  return { valid: true, normalized, message: '' };
}

/** Valida una fecha ISO (YYYY-MM-DD) */
export function validateDate(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') {
    return { valid: false, message: 'Ingrese una fecha válida.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return { valid: false, message: 'Formato de fecha inválido.' };
  }
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { valid: false, message: 'Ingrese una fecha válida.' };
  }
  return { valid: true, message: '' };
}

/** Normaliza un valor de peso; null si está vacío o es inválido */
export function normalizeWeight(value) {
  if (value === '' || value === null || value === undefined) {
    return { grossWeight: null, error: '' };
  }

  const str = String(value).trim().replace(',', '.');
  if (str === '') {
    return { grossWeight: null, error: '' };
  }

  if (!/^\d+(\.\d{0,2})?$/.test(str)) {
    return { grossWeight: null, error: 'Ingrese un número válido (máx. 2 decimales).' };
  }

  const num = Number(str);
  if (!Number.isFinite(num)) {
    return { grossWeight: null, error: 'Valor numérico inválido.' };
  }
  if (num < 0) {
    return { grossWeight: null, error: 'No se permiten valores negativos.' };
  }
  if (num > MAX_WEIGHT) {
    return {
      grossWeight: MAX_WEIGHT,
      error: `El peso máximo permitido es ${MAX_WEIGHT.toLocaleString('es-AR')} kg.`,
    };
  }

  return { grossWeight: roundWeight(num), error: '' };
}

/** Valida si se puede imprimir */
export function validateForPrint(state) {
  const errors = [];
  const dateResult = validateDate(state.date);
  if (!dateResult.valid) errors.push(dateResult.message);

  const hasValidWeighing = state.materials.some((m) =>
    m.weighings.some((w) => Number.isFinite(w.grossWeight) && w.grossWeight > 0)
  );
  if (!hasValidWeighing) {
    errors.push('Agregue al menos una pesada con peso mayor a cero.');
  }

  return { valid: errors.length === 0, errors };
}
