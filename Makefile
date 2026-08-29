# Welcome Copilot — common commands. Run `make help` for the list.

.PHONY: help dev build test push-script

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

dev: ## Run the web app locally (http://localhost:3000)
	cd web && npm run dev

build: ## Production build of the web app
	cd web && npm run build

test: ## Run web unit tests
	cd web && npm test

push-script: ## Push Apps Script sources to the bound project
	cd apps-script && clasp push
