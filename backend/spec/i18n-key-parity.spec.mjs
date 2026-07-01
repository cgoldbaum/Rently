// @ts-check
import { resources } from '../dist/i18n/resources.js';

/** Aplana las claves de un objeto anidado: { a: { b: 1 } } => ['a.b']
 * @param {Record<string, unknown>} obj
 * @returns {string[]} */
function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object' && !Array.isArray(value)
      ? flattenKeys(/** @type {Record<string, unknown>} */ (value), full)
      : [full];
  });
}

const es = /** @type {Record<string, Record<string, unknown>>} */ (resources.es);
const en = /** @type {Record<string, Record<string, unknown>>} */ (resources.en);
const NAMESPACES = Object.keys(es);

for (const ns of NAMESPACES) {
  describe(`i18n key parity — ${ns}`, () => {
    it('tiene las mismas claves en es y en', () => {
      const esKeys = flattenKeys(es[ns]).sort();
      const enKeys = flattenKeys(en[ns]).sort();
      expect(enKeys).toEqual(esKeys);
    });
  });
}
