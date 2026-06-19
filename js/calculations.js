import { TARE_PER_WEIGHING } from './constants.js';
import { roundWeight } from './utils.js';

/** Indica si un peso es una pesada válida (positiva y finita) */
export function isValidWeighing(weight) {
  return Number.isFinite(weight) && weight > 0;
}

/** Totales de un material según la regla de negocio */
export function calculateMaterialTotals(material, tarePerWeighing = TARE_PER_WEIGHING) {
  const validWeighings = material.weighings.filter((w) => isValidWeighing(w.grossWeight));

  const grossWeight = roundWeight(
    validWeighings.reduce((sum, w) => sum + w.grossWeight, 0)
  );
  const weighingCount = validWeighings.length;
  const totalTare = roundWeight(weighingCount * tarePerWeighing);
  const netWeight = roundWeight(grossWeight - totalTare);
  const hasLowWeighingWarning = validWeighings.some(
    (w) => w.grossWeight < tarePerWeighing
  );

  return {
    grossWeight,
    weighingCount,
    totalTare,
    netWeight,
    hasLowWeighingWarning,
  };
}

/** Totales globales de todos los materiales */
export function calculateGlobalTotals(materials, tarePerWeighing = TARE_PER_WEIGHING) {
  const materialTotals = materials.map((material) => ({
    materialId: material.id,
    type: material.type,
    ...calculateMaterialTotals(material, tarePerWeighing),
  }));

  const grossWeight = roundWeight(
    materialTotals.reduce((sum, m) => sum + m.grossWeight, 0)
  );
  const weighingCount = materialTotals.reduce((sum, m) => sum + m.weighingCount, 0);
  const totalTare = roundWeight(materialTotals.reduce((sum, m) => sum + m.totalTare, 0));
  const netWeight = roundWeight(materialTotals.reduce((sum, m) => sum + m.netWeight, 0));

  return {
    grossWeight,
    weighingCount,
    totalTare,
    netWeight,
    materialTotals,
  };
}
