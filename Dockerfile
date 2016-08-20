FROM alpine:3.4

RUN apk add --update nodejs && \
    rm -rf /var/cache/apk/*

COPY package.json /code/package.json

WORKDIR /code

RUN npm install

WORKDIR /code

COPY server.js /code/server.js

COPY protocol.js /code/protocol.js

COPY tech_profile.js /code/tech_profile.js

EXPOSE 7777

CMD ["node", "server.js"]
