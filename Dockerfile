FROM alpine

RUN apk add --update nodejs && \
    rm -rf /var/cache/apk/*

COPY package.json /code/package.json

WORKDIR /code

RUN npm install

WORKDIR /code

COPY server.js /code/server.js

EXPOSE 7777

CMD ["node", "server.js"]
