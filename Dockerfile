FROM node:20-bullseye-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build && npm prune --omit=dev

EXPOSE 3001
CMD ["npm", "run", "start"]
