FROM node:alpine
WORKDIR /app
RUN apk update && \
    apk upgrade -U && \
    apk add ca-certificates ffmpeg libwebp libwebp-tools && \
    rm -rf /var/cache/*
ENV PATH /app/node_modules/.bin:$PATH
COPY package.json /app/package.json
RUN npm install npm@latest -g
RUN npm install -g
ENV PROJECT_ENV_CONFIG=prod
ENV DOCKER_CONTAINER=1
COPY . /app
EXPOSE 8096
ENTRYPOINT ["node", "index.js"]