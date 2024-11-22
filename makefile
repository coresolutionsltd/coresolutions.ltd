.PHONY: lint pretty dev

# Lint using ESLint
lint:
	npx eslint .

# Run Prettier to format all files
pretty:
	npx prettier . --write

# Run Astro in Dev mode
dev:
	npm run dev
