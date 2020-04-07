FROM node:alpine
WORKDIR /app

ADD package.json /app
RUN apk add --update git bash && \
	npm install --production && \
	rm -rf /tmp/* /var/cache/apk/* ~/.npm

ADD . /app
EXPOSE 3000
CMD ["node", "api/index.js"]
