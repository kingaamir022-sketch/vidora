# Vidora Dockerfile (Phase 9, Section M — M-DOCKER).
# Two-stage build: Node builds the Vite app, nginx serves the static
# files. No server-side code runs — projects live in the browser's
# localStorage, so there is no database to run.
#
# NOTE: Docker is not installed on the build VM, so this image has
# never been built there. The first real build needs a machine with
# Docker: `docker build -t vidora:1.0.0 .` then
# `docker compose up` (serves on http://localhost:4173).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
