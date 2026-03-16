FROM node:22-bullseye

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install -g npm@11.11.1 && npm install --legacy-peer-deps

COPY . .

ENV VITE_DATA_SOURCE=local
ENV VITE_SUPABASE_STRICT=false
ENV VITE_ENABLE_PVM_CLOSEOUT=1
ENV VITE_SIMULATE_PVM_CLOSEOUT=1
ENV VITE_SIMULATE_CHAIN=1

EXPOSE 4173

CMD ["npm", "run", "e2e:server"]
