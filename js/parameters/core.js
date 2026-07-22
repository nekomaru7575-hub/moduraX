// js/parameters/core.js
import { buildParameters } from './paramFactory.js';

export const CORE_DEFAULT_PARAMETERS = [
  { key: 'hp', label: 'HP', value: 0 },
  { key: 'initiative', label: 'イニシアチブ', value: 0, locked: true },
];

export function buildDefaultParameters() {
  return buildParameters('core', CORE_DEFAULT_PARAMETERS);
}