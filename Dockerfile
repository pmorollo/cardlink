FROM node:20-alpine

WORKDIR /app

# Copy root package and backend package files
COPY package.json ./
COPY backend/package.json ./backend/

# Install backend dependencies
RUN cd backend && npm install --production

# Copy the full project
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
