# Base image
FROM node:16.16.0

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package.json yarn.lock /app/

# Install app dependencies
RUN yarn install

# Bundle app source
COPY . /app

# Creates a "dist" folder with the production build
RUN yarn build

EXPOSE 3000

# Start the server using the production build
CMD [ "node", "dist/main.js" ]