FROM debian:trixie-slim AS rhvoice
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates g++ git libao-dev libboost-dev pkg-config scons \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN --mount=type=secret,id=build_ca \
    if [ -f /run/secrets/build_ca ]; then \
      cat /etc/ssl/certs/ca-certificates.crt /run/secrets/build_ca > /tmp/build-ca.pem; \
      export GIT_SSL_CAINFO=/tmp/build-ca.pem; \
    fi \
    && git init && git remote add origin https://github.com/RHVoice/RHVoice.git \
    && git fetch --depth 1 origin 8a819d0b481bb40c4c62f5293d1997e5918625c9 \
    && git checkout --detach FETCH_HEAD \
    && git submodule update --init --depth 1 --jobs 8 data/languages/Russian data/voices/aleksandr-hq external/libs/boost/libs \
    && rm -f /tmp/build-ca.pem
RUN scons -j4 DESTDIR=/stage install

FROM python:3.13-slim-trixie
RUN apt-get update && apt-get install -y --no-install-recommends libao4 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=rhvoice /stage/ /
RUN ldconfig
WORKDIR /app
COPY server.py .
COPY public/ public/
RUN chmod -R a+rX /app
USER 65534:65534
ENV HOST=0.0.0.0 PORT=8000
EXPOSE 8000
CMD ["python", "server.py"]
