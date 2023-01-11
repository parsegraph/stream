FROM node:16

WORKDIR /usr/src
COPY node_modules/ ./node_modules/
COPY ./dist ./dist/
COPY ./www ./www/
COPY ./demo ./demo/
COPY ./package.json .
COPY ./yarn.lock .
COPY ./binding ./binding/
COPY ./parser ./parser/
COPY Makefile .
COPY Makefile.microproject .
COPY webpack.common.js .
EXPOSE 3000
CMD ["make", "demo"]
