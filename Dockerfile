# Next.js 16 frontend (UI + /api/scan). Single stage keeps node_modules for `next start`.
FROM node:20-bookworm-slim AS web
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start"]
