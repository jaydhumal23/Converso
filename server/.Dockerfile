FROM node:24.13.1

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install 

COPY . .

EXPOSE 8000

CMD ["node","server.js"]