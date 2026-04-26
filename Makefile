# ─────────────────────────────────────────────
#  Rently — Makefile
#  Uso: make <target>
# ─────────────────────────────────────────────

.PHONY: help install install-api install-web \
        dev dev-api dev-web kill \
	db-up db-down db-reset db-generate db-migrate db-seed db-studio \
        setup build clean

# Colores
RESET  := \033[0m
BOLD   := \033[1m
GREEN  := \033[32m
YELLOW := \033[33m
CYAN   := \033[36m

# Configuración DB (host)
# Se intenta primero HOST_DB_PORT y, si está ocupado, fallback a ALT_HOST_DB_PORT.
HOST_DB_PORT ?= 5432
ALT_HOST_DB_PORT ?= 5433
DB_PORT_FILE := .make-db-port

## ── Ayuda ────────────────────────────────────
##tener docker abierto 
help:
	@echo ""
	@echo "$(BOLD)Rently — comandos disponibles$(RESET)"
	@echo ""
	@echo "  $(CYAN)make setup$(RESET)        Setup completo: instalar deps + DB + migraciones + seed"
	@echo ""
	@echo "  $(GREEN)make dev$(RESET)          Levantar API y web en paralelo"
	@echo "  $(GREEN)make dev-api$(RESET)      Solo el backend  (localhost:4001)"
	@echo "  $(GREEN)make dev-web$(RESET)      Solo el frontend (localhost:3001)"
	@echo ""
	@echo "  $(YELLOW)make db-up$(RESET)        Iniciar PostgreSQL (auto fallback 5432 -> 5433)"
	@echo "  $(YELLOW)make db-down$(RESET)      Detener contenedor de PostgreSQL"
	@echo "  $(YELLOW)make db-generate$(RESET)  Regenerar cliente de Prisma"
	@echo "  $(YELLOW)make db-migrate$(RESET)   Aplicar migraciones de Prisma"
	@echo "  $(YELLOW)make db-seed$(RESET)      Cargar datos de ejemplo"
	@echo "  $(YELLOW)make db-reset$(RESET)     Resetear DB y re-aplicar migraciones"
	@echo "  $(YELLOW)make db-studio$(RESET)    Abrir Prisma Studio en el navegador"
	@echo ""
	@echo "  make install      Instalar deps de api y web"
	@echo "  make build        Compilar api y web para producción"
	@echo "  make clean        Eliminar node_modules y artefactos de build"
	@echo ""

## ── Setup completo ───────────────────────────

setup: install db-up db-generate db-migrate db-seed
	@echo "$(GREEN)$(BOLD)✓ Setup completo con datos demo. Corré 'make dev' para arrancar.$(RESET)"

## ── Instalación de dependencias ──────────────

install: install-api install-web

install-api:
	@echo "$(CYAN)Instalando dependencias del backend...$(RESET)"
	cd backend && npm install

install-web:
	@echo "$(CYAN)Instalando dependencias del frontend...$(RESET)"
	cd frontend && npm install

## ── Desarrollo ───────────────────────────────
kill:
	@echo "$(YELLOW)Liberando puertos 3001 y 4001...$(RESET)"
	@powershell.exe -Command "Get-NetTCPConnection -LocalPort 3000,3001,3002,4000,4001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$$_.OwningProcess -Force -ErrorAction SilentlyContinue }" 2>/dev/null || true
	@echo "$(GREEN)✓ Puertos liberados$(RESET)"

dev:
	@echo "$(GREEN)Levantando API (puerto 4001) y Web (puerto 3001)...$(RESET)"
	@make -j2 dev-api dev-web

dev-api:
	@echo "$(GREEN)Iniciando API en http://localhost:4001$(RESET)"
	@DB_PORT=$$(cat $(DB_PORT_FILE) 2>/dev/null || echo $(HOST_DB_PORT)); \
	cd backend && DATABASE_URL="postgresql://rently:rently@localhost:$$DB_PORT/rently?schema=public" npm run dev
	cd backend && npm run dev

dev-web:
	@echo "$(GREEN)Iniciando Web en http://localhost:3001$(RESET)"
	cd frontend && npm run dev

## ── Base de datos ────────────────────────────

db-up:
	@echo "$(YELLOW)Iniciando PostgreSQL...$(RESET)"
	@PORT_IN_USE=""; \
	if HOST_DB_PORT=$(HOST_DB_PORT) docker compose up -d db >/dev/null 2>&1; then \
		PORT_IN_USE=$(HOST_DB_PORT); \
		echo "$(GREEN)✓ DB levantada en localhost:$(HOST_DB_PORT)$(RESET)"; \
	else \
		echo "$(YELLOW)Puerto $(HOST_DB_PORT) ocupado. Reintentando en $(ALT_HOST_DB_PORT)...$(RESET)"; \
		HOST_DB_PORT=$(ALT_HOST_DB_PORT) docker compose up -d db; \
		PORT_IN_USE=$(ALT_HOST_DB_PORT); \
		echo "$(GREEN)✓ DB levantada en localhost:$(ALT_HOST_DB_PORT)$(RESET)"; \
	fi; \
	echo $$PORT_IN_USE > $(DB_PORT_FILE)
	@echo "$(YELLOW)Esperando que la DB esté lista...$(RESET)"
	@DB_PORT=$$(cat $(DB_PORT_FILE) 2>/dev/null || echo $(HOST_DB_PORT)); \
	i=0; \
	while [ $$i -lt 30 ]; do \
		if docker compose exec -T db pg_isready -U rently >/dev/null 2>&1; then \
			echo "$(GREEN)✓ PostgreSQL listo en localhost:$$DB_PORT$(RESET)"; \
			exit 0; \
		fi; \
		i=`expr $$i + 1`; \
		sleep 1; \
	done; \
	echo "$(YELLOW)La DB no quedó lista. Últimos logs del contenedor:$(RESET)"; \
	docker compose logs --tail 30 db; \
	echo "$(YELLOW)Si el error indica incompatibilidad de versión de PostgreSQL, corré: docker compose down -v$(RESET)"; \
	exit 1

db-down:
	@echo "$(YELLOW)Deteniendo PostgreSQL...$(RESET)"
	docker compose stop db
	@rm -f $(DB_PORT_FILE)

db-generate:
	@echo "$(YELLOW)Generando cliente de Prisma...$(RESET)"
	cd backend && npx prisma generate
	@echo "$(GREEN)✓ Cliente de Prisma actualizado$(RESET)"

db-migrate: db-generate
	@echo "$(YELLOW)Aplicando migraciones de Prisma...$(RESET)"
	@DB_PORT=$$(cat $(DB_PORT_FILE) 2>/dev/null || echo $(HOST_DB_PORT)); \
	cd backend && DATABASE_URL="postgresql://rently:rently@localhost:$$DB_PORT/rently?schema=public" npx prisma migrate deploy
	@echo "$(GREEN)✓ Migraciones aplicadas$(RESET)"

db-seed:
	@echo "$(CYAN)Cargando datos de ejemplo...$(RESET)"
	@DB_PORT=$$(cat $(DB_PORT_FILE) 2>/dev/null || echo $(HOST_DB_PORT)); \
	cd backend && DATABASE_URL="postgresql://rently:rently@localhost:$$DB_PORT/rently?schema=public" npm run db:seed
	@echo "$(GREEN)✓ Datos de ejemplo cargados$(RESET)"

db-reset:
	@echo "$(YELLOW)Reseteando base de datos...$(RESET)"
	@DB_PORT=$$(cat $(DB_PORT_FILE) 2>/dev/null || echo $(HOST_DB_PORT)); \
	cd backend && DATABASE_URL="postgresql://rently:rently@localhost:$$DB_PORT/rently?schema=public" npx prisma migrate reset --force
	@echo "$(GREEN)✓ DB reseteada$(RESET)"

db-studio:
	@echo "$(CYAN)Abriendo Prisma Studio...$(RESET)"
	@DB_PORT=$$(cat $(DB_PORT_FILE) 2>/dev/null || echo $(HOST_DB_PORT)); \
	cd backend && DATABASE_URL="postgresql://rently:rently@localhost:$$DB_PORT/rently?schema=public" npx prisma studio

## ── Build producción ─────────────────────────

build:
	@echo "$(CYAN)Compilando API...$(RESET)"
	cd backend && npm run build
	@echo "$(CYAN)Compilando Web...$(RESET)"
	cd frontend && npm run build
	@echo "$(GREEN)✓ Build completo$(RESET)"

## ── Limpieza ─────────────────────────────────

clean:
	@echo "Eliminando node_modules y builds..."
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/.next
	@echo "$(GREEN)✓ Limpieza completa$(RESET)"
