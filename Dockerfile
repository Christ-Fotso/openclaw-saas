FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true
ENV WATCHPACK_POLLING_INTERVAL=2000

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "run", "dev"]
