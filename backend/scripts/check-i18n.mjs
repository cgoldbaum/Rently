// Verificador barato de i18n del backend (standalone, sin framework de test).
// - Paridad de claves es/ vs en/ para cada namespace.
// - Cobertura: toda clave `errors:*` usada en `new AppError(...)` existe en errors.json.
// Falla con exit 1 si algo no cuadra. Correr con: npm run check:i18n
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localesDir = path.join(root, 'src', 'i18n', 'locales');
const NAMESPACES = ['zod', 'errors', 'notify'];

const load = (lng, ns) => JSON.parse(fs.readFileSync(path.join(localesDir, lng, `${ns}.json`), 'utf8'));
const flat = (obj, pre = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flat(v, `${pre}${k}.`) : [`${pre}${k}`],
  );

let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(`  ✗ ${msg}`);
};

// 1) Paridad es/en
for (const ns of NAMESPACES) {
  const es = new Set(flat(load('es', ns)));
  const en = new Set(flat(load('en', ns)));
  const onlyEs = [...es].filter((k) => !en.has(k));
  const onlyEn = [...en].filter((k) => !es.has(k));
  if (onlyEs.length || onlyEn.length) {
    fail(`[${ns}] paridad rota — solo ES: ${JSON.stringify(onlyEs)} solo EN: ${JSON.stringify(onlyEn)}`);
  } else {
    console.log(`  ✓ [${ns}] paridad OK (${es.size} claves)`);
  }
}

// 2) Cobertura de claves AppError (errors:*)
const errorKeys = new Set(flat(load('es', 'errors')));
const grep = execSync(
  `grep -rhoE "new AppError\\(\\s*['\\"]errors:[^'\\"]+['\\"]" src --include=*.ts`,
  { cwd: root, encoding: 'utf8' },
);
const used = [...new Set([...grep.matchAll(/errors:([^'"]+)/g)].map((m) => m[1]))];
const missing = used.filter((k) => !errorKeys.has(k));
if (missing.length) fail(`claves AppError faltantes en errors.json: ${JSON.stringify(missing)}`);
else console.log(`  ✓ AppError: ${used.length} claves usadas, todas presentes`);

if (failed) {
  console.error('\ni18n check: FAIL');
  process.exit(1);
}
console.log('\ni18n check: OK');
