FROM node:alpine

RUN mkdir -p /usr/src/app
RUN apk --quiet update && apk --quiet add python gcc make

WORKDIR /usr/src/app

ARG NODE_ENV
ENV NODE_ENV $NODE_ENV

COPY package.json /usr/src/app/package.json

RUN npm install --quiet --depth -1 # try to make npm not spam logs

COPY . /usr/src/app/

EXPOSE 7777

CMD ["node", "server.js"]
