Migrated to [@code-wallet/views](https://github.com/code-payments/code-sdk/tree/main/packages/views)

<img width="1280" alt="Code SDK Elements" src="https://github.com/code-payments/code-sdk-elements/assets/623790/987d3a97-453a-446b-bc79-028fb0678b72">

# Code SDK Elements
![license][license-image]
![version][version-image]

[version-image]: https://img.shields.io/badge/version-0.1.0-blue.svg?style=flat
[license-image]: https://img.shields.io/badge/license-MIT-blue.svg?style=flat

This repository contains the frontend components for the Code SDK [elements](https://www.npmjs.com/package/@code-wallet/elements) package. To learn more about the SDK, please visit [sdk.getcode.com](https://sdk.getcode.com).

## Development
The codebase is split into the following packages:

* `frontend` - A Vue codebase for rendering the individual SDK elements. The codebase includes all logic necessary to generate a send intent against the Code Sequencer. Including things like the GRPC protocol, the KikCode, and the send intent.
* `kikcode` - A C++ library for rendering KikCodes. This library is compiled to WASM and wrapped in a JS library for use in the frontend.

The elements in this project are exposed as iframe components through the SDK. The elements are not intended to be used directly in a web application. Instead, they should be used through the SDK. The SDK handles the complex setup and communication channels between the elements the developer SDK.

## Quick Start
Each package has its own `Makefile`, which can be used to build and run the package. Additionally, you can run each package in a Docker container. Use `npm run dev` to run the local development environment both the frontend and backend.

<img width="50%" src="https://github.com/code-wallet/code-sdk-elements/assets/623790/5453a69d-d81a-448e-8edf-9345568fbf82">

## Getting Help

If you have any questions or need help integrating Code into your website or application, please reach out to us on [Discord](https://discord.gg/T8Tpj8DBFp) or [Twitter](https://twitter.com/getcode).

##  Contributing

For now the best way to contribute is to share feedback on [Discord](https://discord.gg/T8Tpj8DBFp). This will evolve as we continue to build out the platform and open up more ways to contribute. 
