FROM node:alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

COPY . /usr/src/app
RUN npm install --quiet --depth -1 # try to make npm not spam logs

EXPOSE 7777

CMD ["node", "server.js"]
