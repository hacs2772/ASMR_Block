# =====================================================
# ASMR Block 웹 (React) - 빌드 후 nginx로 제공
# =====================================================
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# 브라우저가 호출할 백엔드 주소 (빌드할 때 코드에 박힘)
ARG REACT_APP_API_URL=http://localhost:8080/api/v1
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
