FROM node:16

COPY node_modules/ /usr/src/node_modules/
COPY ./Makefile /usr/src/
COPY ./Makefile.microproject /usr/src
COPY ./webpack.common.js /usr/src
COPY ./dist /usr/src/dist/
COPY ./www /usr/src/www/
COPY ./demo /usr/src/demo/
COPY ./package.json /usr/src/
COPY ./yarn.lock /usr/src/
COPY ./demo.port /usr/src/
EXPOSE 15557
ENV DEMO_PORT="15557"
CMD ["make", "demo"]
