#!/bin/sh

if ! npx prettier --check .; then
  exit 1
fi
