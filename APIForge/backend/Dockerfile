FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --production

# Bundle app source
COPY . ./

ENV NODE_ENV=production
EXPOSE 4000

# Use PORT environment variable provided by Railway
CMD ["node", "server.js"]
