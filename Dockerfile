FROM node:alpine as builder
WORKDIR /app

RUN apk add --update git bash

ADD package.json /app
RUN npm install --production

FROM node:alpine
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
ADD . ./

EXPOSE 3000
CMD ["node", "api/index.js"]
