FROM alpine:3.4

RUN apk add --update nodejs && \
    rm -rf /var/cache/apk/*

COPY package.json /code/package.json

WORKDIR /code

RUN npm install

COPY constants.js /code/constants.js

COPY server.js /code/server.js

COPY analyze.js /code/analyze.js

EXPOSE 7777

CMD ["node", "server.js"]
