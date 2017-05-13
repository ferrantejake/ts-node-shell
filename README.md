# ts-node-shell
A shell project for common nodejs + typescript standalone back-end applications.

## Features
- Gulp
- Typescript
- Azure Ready
- Opinionated TsLint
- Yarn

## Getting Started
Note this is just a shell. Running the project will run the included code but only to the extent to executing, sequentially, the inclusion of the three included files. This will not produce any useful output alone. To make this your own, include a more useful application body.

### Build Application
`gulp build`
**contrinuous build**
`gulp watch`

### Run Application
`gulp debug` or `node index.js`

## Publishing Project to Azure
This application can be published to Azure with continuous deployment. This is the significance of the `deploy.cmd` and `.deployment`. Once connected with GitHub or BitBucket, this application will rebuild itself and run of its own accord.
<more information to come>
