FROM node:20-slim
WORKDIR /client
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]
EXPOSE 5173
