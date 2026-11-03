FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs index.html app.css app-enhancements.js manifest.webmanifest icon.svg sw.js ./
COPY data/campus-knowledge.json ./data/campus-knowledge.json
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 DATA_DIR=/var/data
EXPOSE 3000
CMD ["node", "server.mjs"]

