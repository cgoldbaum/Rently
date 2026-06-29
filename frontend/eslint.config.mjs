import next from 'eslint-config-next'

/**
 * Configuración flat de ESLint 9 para el web (Next.js 16).
 * `eslint-config-next` ya incluye `next/core-web-vitals`, `next/typescript`
 * y los ignores de build (.next, out, build, next-env.d.ts).
 *
 * @type {import('eslint').Linter.Config[]}
 */
const eslintConfig = [...next]

export default eslintConfig
