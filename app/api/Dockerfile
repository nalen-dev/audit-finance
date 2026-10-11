# Stage 1: Build binary
FROM golang:alpine AS builder
WORKDIR /app

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/bin/server ./cmd/server

# Stage 2: Minimal runtime image
FROM alpine:3.20
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata curl
ENV TZ=Asia/Jakarta

COPY --from=builder /app/bin/server /app/server
COPY --from=builder /app/migrations /app/migrations

EXPOSE 8080
CMD ["/app/server"]
