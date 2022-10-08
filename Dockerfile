FROM node:latest

WORKDIR /usr/src/app
RUN chmod 777 /usr/src/app
COPY . ./
RUN chmod +x ./scripts/*
RUN ./scripts/install.sh

RUN apt-get -qq update && \
    apt-get -qq -y install aria2 locales
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen 
ENV LANG en_US.UTF-8 
ENV LANGUAGE en_US:en 
ENV LC_ALL en_US.UTF-8
 
RUN npm install

CMD [ "npm", "start" ]

