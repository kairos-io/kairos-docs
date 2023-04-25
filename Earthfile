VERSION 0.6

docs:
    FROM node:19-bullseye
    ARG TARGETARCH

    # Install dependencies
    RUN apt install git
    # renovate: datasource=github-releases depName=gohugoio/hugo
    ARG HUGO_VERSION="0.110.0"
    RUN wget --quiet "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-${TARGETARCH}.tar.gz" && \
        tar xzf hugo_extended_${HUGO_VERSION}_linux-${TARGETARCH}.tar.gz && \
        rm -r hugo_extended_${HUGO_VERSION}_linux-${TARGETARCH}.tar.gz && \
        mv hugo /usr/bin

    COPY . ./docs
    WORKDIR ./docs

    RUN npm install postcss-cli
    RUN npm run prepare

    RUN HUGO_ENV="production" /usr/bin/hugo --gc -b "/local/" -d "public/"
    SAVE ARTIFACT public /public AS LOCAL docs/