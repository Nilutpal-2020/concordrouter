.PHONY: all build test dev-server dev-client dev

all: build test

test:
	@echo "==> Running Go backend unit and integration tests..."
	cd server && go test -v ./...

build:
	@echo "==> Building Go server binary..."
	cd server && go build -o bin/concord-server cmd/server/main.go
	@echo "==> Building Next.js frontend..."
	cd client && npm run build

dev-server:
	cd server && go run cmd/server/main.go

dev-client:
	cd client && npm run dev

dev:
	@echo "Starting ConcordRouter backend on :8080 and Next.js frontend on :3000..."
	@make -j 2 dev-server dev-client
