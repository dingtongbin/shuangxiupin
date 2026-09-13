.PHONY: run run-admin build build-admin tidy vet

run:
	go run ./cmd/server -config configs/config.yaml

run-admin:
	go run ./cmd/admin -config configs/admin.yaml

build:
	go build -o bin/server ./cmd/server

build-admin:
	go build -o bin/admin ./cmd/admin

tidy:
	go mod tidy

vet:
	go vet ./...
