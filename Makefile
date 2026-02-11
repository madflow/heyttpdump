# In order to run this makefile, you need to install the following tools:
# make 
# Node.Js 22 or higher
# see https://github.com/nvm-sh/nvm for a battle tested way to install Node.Js
# npm (which comes with Node.Js)
SHELL = /bin/sh
UID := $(shell id -u)
GID := $(shell id -g)
SYSTEM := $(shell uname -s)
PROCESSOR := $(shell uname -p)

.PHONY: help
help: ## shows this help
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_\-\.]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: init
init: ## initialize the project
	@deno task migrate


.PHONY: dev
dev: ## start development server
	@deno task dev

.PHONY: check
check: ## checking and linting
	@deno lint

.PHONY: docker-up
docker-up: ## start the project with docker
	@docker-compose up -d --build --remove-orphans

.PHONY: docker-down
docker-down: ## stop the project with docker
	@docker-compose down

.PHONY: docker-logs
docker-logs: ## view the project logs with docker
	@docker-compose logs -f


