FROM node:20-bookworm-slim
ENV PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip fonts-noto-core fonts-noto-extra ca-certificates && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir --break-system-packages edge-tts
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
RUN mkdir -p uploads outputs
ENV PORT=8787
EXPOSE 8787
CMD ["npm","start"]
