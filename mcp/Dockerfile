# Qorami MCP server — container image (used by registries like Glama and for
# self-hosting). The server starts without a key so it can be introspected;
# set QORAMI_API_KEY at runtime to actually call the tools.
FROM node:20-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY qorami-mcp.mjs ./
ENTRYPOINT ["node", "qorami-mcp.mjs"]
