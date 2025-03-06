.PHONY: all

# Lint using ESLint
lint:
	npx eslint .

# Run Prettier to format all files
pretty:
	npx prettier . --write

# Run Astro in Dev mode
dev:
	npm run dev

upgrade:
	npx @astrojs/upgrade
