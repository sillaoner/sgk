FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
<<<<<<< HEAD
COPY --from=deps /app/node_modules ./node_modules
COPY . .
=======
ARG NEXT_PUBLIC_API_BASE_URL
ARG API_BASE_URL_INTERNAL
ARG NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV API_BASE_URL_INTERNAL=$API_BASE_URL_INTERNAL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN rm -f .env.production
RUN printf "NEXT_PUBLIC_API_BASE_URL=%s\n" "$NEXT_PUBLIC_API_BASE_URL" >> .env.production \
  && printf "API_BASE_URL_INTERNAL=%s\n" "$API_BASE_URL_INTERNAL" >> .env.production \
  && printf "NEXT_PUBLIC_APP_NAME=%s\n" "$NEXT_PUBLIC_APP_NAME" >> .env.production
>>>>>>> abd55b3 (fixes)
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
<<<<<<< HEAD
ENV NODE_ENV=production
ENV PORT=3000
=======
ARG NEXT_PUBLIC_API_BASE_URL
ARG API_BASE_URL_INTERNAL
ARG NEXT_PUBLIC_APP_NAME
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV API_BASE_URL_INTERNAL=$API_BASE_URL_INTERNAL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
>>>>>>> abd55b3 (fixes)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
