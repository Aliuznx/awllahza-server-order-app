FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
COPY --chown=node:node data ./data
COPY --chown=node:node database ./database
COPY --chown=node:node scripts ./scripts
USER node
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "scripts/run.js"]
