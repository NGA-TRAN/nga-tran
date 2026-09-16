.DEFAULT_GOAL := help

.PHONY: help install ci dev build preview check astro clean

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make <target>\n\n"} \
		/^[a-zA-Z0-9_.-]+:.*## / { printf "  %-12s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install dependencies (npm install)
	npm install

ci: ## Clean install from lockfile (npm ci)
	npm ci

dev: ## Start the local Astro dev server
	npm run dev

build: ## Build the site and generate the Pagefind search index
	npm run build

preview: ## Serve the production build locally
	npm run preview

check: ## Run Astro type checking
	npx astro check

astro: ## Pass extra args through to the Astro CLI: make astro ARGS="info"
	npm run astro -- $(ARGS)

clean: ## Remove build artifacts
	rm -rf dist .astro
