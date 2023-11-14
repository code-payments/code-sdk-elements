.PHONY: build-docker-image wasm

build-docker-image:
	docker build --platform linux/x86_64 -t kikcode-wasm-builder .

wasm: build-docker-image
	mkdir -p build
	docker run --platform linux/x86_64 --rm -v $(shell pwd):/src -u $(shell id -u):$(shell id -g) kikcode-wasm-builder emcmake cmake -B build -S .
	docker run --platform linux/x86_64 --rm -v $(shell pwd):/src -u $(shell id -u):$(shell id -g) kikcode-wasm-builder emmake make -C build

build: wasm
	rm -f ../frontend/sdk/src/utils/kik/kikcode_webassembly.js
	cp build/kikcode_webassembly.js ../frontend/sdk/src/utils/kik/kikcode_webassembly.js
