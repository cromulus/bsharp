FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache make
COPY package*.json ./
RUN npm ci
COPY src ./src
COPY static ./static
COPY scripts/build-pwa.mjs ./scripts/build-pwa.mjs
COPY Makefile ./
RUN make build

FROM nginx:stable-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
