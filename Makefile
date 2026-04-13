# ─────────────────────────────────────────────
#  Rently — Makefile
#  Uso: make <target>
# ─────────────────────────────────────────────

.PHONY: help install install-api install-web \
        dev dev-api dev-web \
        db-up db-down db-reset db-migrate db-seed db-studio \
        setup build clean

# Colores
RESET  := \033[0m
BOLD   := \033[1m
GREEN  := \033[32m
YELLOW := \033[33m
CYAN   := \033[36m

## ── Ayuda ────────────────────────────────────

help:
	@echo ""
	@echo "$(BOLD)Rently — comandos disponibles$(RESET)"
	@echo ""
	@echo "  $(CYAN)make setup$(RESET)        Setup completo: instalar deps + DB + migraciones"
	@echo ""
	@echo "  $(GREEN)make dev$(RESET)          Levantar API y web en paralelo"
	@echo "  $(GREEN)make dev-api$(RESET)      Solo el backend  (localhost:4000)"
	@echo "  $(GREEN)make dev-web$(RESET)      Solo el frontend (localhost:3000)"
	@echo ""
	@echo "  $(YELLOW)make db-up$(RESET)        Iniciar contenedor de PostgreSQL"
	@echo "  $(YELLOW)make db-down$(RESET)      Detener contenedor de PostgreSQL"
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

setup: install db-up db-migrate
	@echo "$(GREEN)$(BOLD)✓ Setup completo. Corré 'make dev' para arrancar.$(RESET)"

## ── Instalación de dependencias ──────────────

install: install-api install-web

install-api:
	@echo "$(CYAN)Instalando dependencias del backend...$(RESET)"
	cd backend && npm install

install-web:
	@echo "$(CYAN)Instalando dependencias del frontend...$(RESET)"
	cd frontend && npm install

## ── Desarrollo ───────────────────────────────

dev:
	@echo "$(GREEN)Levantando API (puerto 4000) y Web (puerto 3000)...$(RESET)"
	@make -j2 dev-api dev-web

dev-api:
	@echo "$(GREEN)Iniciando API en http://localhost:4000$(RESET)"
	cd backend && npm run dev

dev-web:
	@echo "$(GREEN)Iniciando Web en http://localhost:3000$(RESET)"
	cd frontend && npm run dev

## ── Base de datos ────────────────────────────

db-up:
	@echo "$(YELLOW)Iniciando PostgreSQL...$(RESET)"
	@docker start rently-db 2>/dev/null || docker compose up -d db
	@echo "$(YELLOW)Esperando que la DB esté lista...$(RESET)"
	@sleep 3
	@echo "$(GREEN)✓ PostgreSQL listo en localhost:5432$(RESET)"

db-down:
	@echo "$(YELLOW)Deteniendo PostgreSQL...$(RESET)"
	docker compose stop db

db-migrate:
	@echo "$(YELLOW)Aplicando migraciones de Prisma...$(RESET)"
	cd backend && npx prisma migrate deploy
	@echo "$(GREEN)✓ Migraciones aplicadas$(RESET)"

db-seed:
	@echo "$(CYAN)Cargando datos de ejemplo...$(RESET)"
	cd backend && npm run db:seed
	@echo "$(GREEN)✓ Datos de ejemplo cargados$(RESET)"

db-reset:
	@echo "$(YELLOW)Reseteando base de datos...$(RESET)"
	cd backend && npx prisma migrate reset --force
	@echo "$(GREEN)✓ DB reseteada$(RESET)"

db-studio:
	@echo "$(CYAN)Abriendo Prisma Studio...$(RESET)"
	cd backend && npx prisma studio

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
