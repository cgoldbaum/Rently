# Frontend (Next.js) — build con la RAÍZ DEL REPO como contexto.
# @rently/shared se consume como código fuente desde ../shared, así que el
# build necesita tener shared/ y frontend/ como carpetas hermanas dentro
# de la imagen. En Railway: Root Directory = / y RAILWAY_DOCKERFILE_PATH=frontend/Dockerfile
#
# Rutas relativas al contexto (raíz del monorepo).

# ---------- build ----------
FROM node:20-slim AS builder
WORKDIR /app

# shared primero: cambia menos seguido y debe existir antes del npm ci
# (la dependencia file:../shared crea un symlink hacia /app/shared).
COPY shared ./shared

# shared se transpila desde /app/shared/src, fuera de frontend/. Sus imports
# resuelven dependencias desde /app/shared hacia arriba, así que instalamos el
# workspace raíz para dejar axios/zod/zustand disponibles en /app/node_modules.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# instalar deps del frontend con el lockfile
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# código del frontend y build
COPY frontend ./frontend

# NEXT_PUBLIC_* se inlinea en build-time: Railway pasa las variables del
# servicio como build-args, acá las exponemos como ENV antes del build.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN cd frontend && npm run build

# descartar devDependencies para el runtime
RUN cd frontend && npm prune --omit=dev

# ---------- runtime ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# shared debe estar presente para que el symlink @rently/shared resuelva
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend ./frontend

WORKDIR /app/frontend
EXPOSE 3000
# next start lee $PORT (Railway lo inyecta); fallback a 3000
CMD ["npm", "start"]
