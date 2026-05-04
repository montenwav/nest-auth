FROM node:20-slim
RUN apt-get update && apt-get install -y openssl
WORKDIR /server
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "build"]
EXPOSE 3000
