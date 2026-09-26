# Build context is the repo root so shared/ (theme tokens) is available.
FROM node:22-alpine AS build
WORKDIR /repo
COPY shared ./shared
WORKDIR /repo/web
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npm run build

FROM nginx:alpine
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/web/dist /usr/share/nginx/html
EXPOSE 80
