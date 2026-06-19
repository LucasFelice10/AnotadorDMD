import { MATERIAL_TYPES, TARE_PER_WEIGHING } from './constants.js';
import { generateId, todayISO } from './utils.js';

/** Crea una pesada vacía */
export function createWeighing() {
  return {
    id: generateId(),
    grossWeight: null,
    rawInput: '',
    error: '',
  };
}

/** Crea un bloque de material con una pesada inicial */
export function createMaterial(type = MATERIAL_TYPES[0]) {
  return {
    id: generateId(),
    type,
    weighings: [createWeighing()],
  };
}

/** Estado inicial de la aplicación */
export function createInitialState() {
  const operationId = generateId().replace(/-/g, '').slice(0, 8).toUpperCase();
  return {
    client: '',
    date: todayISO(),
    tarePerWeighing: TARE_PER_WEIGHING,
    operationId,
    materials: [],
    clientError: '',
    toast: null,
    confirm: null,
    printMode: null,
    focusTarget: null,
    lastFocusedElement: null,
  };
}

/** Agrega un material al estado (inmutable) */
export function addMaterial(state) {
  const material = createMaterial();
  return {
    ...state,
    materials: [...state.materials, material],
    focusTarget: { materialId: material.id, weighingId: material.weighings[0].id },
  };
}

/** Elimina un material por id */
export function removeMaterial(state, materialId) {
  return {
    ...state,
    materials: state.materials.filter((m) => m.id !== materialId),
    focusTarget: null,
  };
}

/** Agrega una pesada a un material */
export function addWeighing(state, materialId) {
  const weighing = createWeighing();
  return {
    ...state,
    materials: state.materials.map((m) =>
      m.id === materialId
        ? { ...m, weighings: [...m.weighings, weighing] }
        : m
    ),
    focusTarget: { materialId, weighingId: weighing.id },
  };
}

/** Elimina una pesada de un material */
export function removeWeighing(state, materialId, weighingId) {
  return {
    ...state,
    materials: state.materials.map((m) => {
      if (m.id !== materialId) return m;
      const weighings = m.weighings.filter((w) => w.id !== weighingId);
      return {
        ...m,
        weighings: weighings.length > 0 ? weighings : [createWeighing()],
      };
    }),
    focusTarget: null,
  };
}

/** Actualiza el peso de una pesada */
export function updateWeighing(state, materialId, weighingId, rawValue) {
  return {
    ...state,
    materials: state.materials.map((m) => {
      if (m.id !== materialId) return m;
      return {
        ...m,
        weighings: m.weighings.map((w) => {
          if (w.id !== weighingId) return w;
          return { ...w, rawInput: rawValue };
        }),
      };
    }),
  };
}

/** Normaliza pesadas tras validación */
export function applyWeighingValidation(state, materialId, weighingId, result) {
  return {
    ...state,
    materials: state.materials.map((m) => {
      if (m.id !== materialId) return m;
      return {
        ...m,
        weighings: m.weighings.map((w) => {
          if (w.id !== weighingId) return w;
          return {
            ...w,
            grossWeight: result.grossWeight,
            error: result.error,
          };
        }),
      };
    }),
  };
}

/** Actualiza el tipo de material */
export function updateMaterialType(state, materialId, type) {
  return {
    ...state,
    materials: state.materials.map((m) =>
      m.id === materialId ? { ...m, type } : m
    ),
  };
}
