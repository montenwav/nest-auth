FROM node:20
RUN apt-get update && apt-get install -y openssl
WORKDIR /server
COPY package*.json ./
RUN npm install
COPY . .
# CMD ["npm", "run", "start:dev"]
EXPOSE 3000
