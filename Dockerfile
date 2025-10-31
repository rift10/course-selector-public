# syntax = docker/dockerfile:1

ARG NODE_VERSION=24.6.0

FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"

# Throw-away build stage to reduce size of final image
FROM base AS build

ARG SQLITE_YEAR=2025
ARG SQLITE_VERSION=3500400

# Install packages needed to download and build stuff
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential \
    node-gyp \
    pkg-config \
    python-is-python3 \
    wget \
    ca-certificates \
    libreadline-dev

WORKDIR /build

# Download and build SQLite
RUN wget https://www.sqlite.org/${SQLITE_YEAR}/sqlite-autoconf-${SQLITE_VERSION}.tar.gz && \
    tar xzf sqlite-autoconf-${SQLITE_VERSION}.tar.gz && \
    cd sqlite-autoconf-${SQLITE_VERSION}/ && \
    ./configure --prefix=/usr/local --enable-readline && make && make install

# Back to app
WORKDIR /app

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci

# Copy application code
COPY . .

# Final stage for app image
FROM base

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libreadline8 \
    && rm -rf /var/lib/apt/lists/*

# Copy built application
COPY --from=build /app /app

COPY --from=build /usr/local/bin/sqlite3 /usr/local/bin/sqlite3

ENV DB_DIR=/data
ENV DB_FILE=db.db
RUN mkdir -p /data
VOLUME /data

# Start the server by default, this can be overwritten at runtime
EXPOSE 8080
CMD [ "bash", "/app/create-db.sh" ]
