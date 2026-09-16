# Frontend admin (vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /build/frontend
COPY okbong-admin-frontend/package.json okbong-admin-frontend/package-lock.json ./
RUN npm ci --omit=dev
COPY okbong-admin-frontend/ .
RUN npx vite build

# Backend (multi‑stage TypeScript)
FROM node:20-alpine AS base
WORKDIR /app
COPY okbong-backend/package.json okbong-backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS build
COPY okbong-backend/ .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=frontend-builder /build/frontend/dist ./public
EXPOSE 3000
CMD ["node", "dist/main.js"]
