# Root Dockerfile for the Qorami MCP server (lives in ./mcp). Lets registries
# like Glama build & introspect it from the repository root. The server starts
# without a key so it can be introspected; set QORAMI_API_KEY to call the tools.
FROM node:20-slim
WORKDIR /app
COPY mcp/package.json ./
RUN npm install --omit=dev
COPY mcp/qorami-mcp.mjs ./
ENTRYPOINT ["node", "qorami-mcp.mjs"]
