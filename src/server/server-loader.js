const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');

const app = express();
const server = require('http').Server(app);
const config = require('../../webpack.config.js');
const compiler = webpack(config);

const ts = require("typescript");
const process = require('child_process');

// process.execSync('mkdir -p dist/external/eosjs/src', { stdio: 'inherit' });
// process.execSync('cp external/eosjs/src/*.json dist/external/eosjs/src', { stdio: 'inherit' });

app.use(webpackDevMiddleware(compiler, {
    publicPath: config.output.publicPath
}));

app.use(require("webpack-hot-middleware")(compiler));

let serverMain;
function getServerMain() {
    if (serverMain)
        return serverMain;
    serverMain = require('../../dist/server/server.js');
    serverMain.start(io);
}

app.use(function (req, res, next) {
    getServerMain().router(req, res, next);
})

let io = require('socket.io')(server);
io.on('connection', socket => {
    getServerMain().connected(socket);
});

server.listen(8000);

const formatHost = {
    getCanonicalFileName: path => path,
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getNewLine: () => ts.sys.newLine
};

function recompileServer() {
    const configPath = ts.findConfigFile("./", ts.sys.fileExists, "tsconfig.server.json");
    if (!configPath)
        throw new Error("Could not find a valid 'tsconfig.json'.");
    const createProgram = ts.createSemanticDiagnosticsBuilderProgram;
    const host = ts.createWatchCompilerHost(configPath, {}, ts.sys, createProgram, reportDiagnostic, reportWatchStatusChanged);

    const origPostProgramCreate = host.afterProgramCreate;
    host.afterProgramCreate = program => {
        setTimeout(() => {
            if (serverMain) {
                serverMain.unloading();
                serverMain = null;
            }
            io.emit('reconnect');
            Object.keys(require.cache).forEach(id => {
                if (/dist\/server|dist\/common/.test(id)) {
                    console.log('--', id);
                    delete require.cache[id];
                }
            });
            getServerMain();
        });
        origPostProgramCreate(program);
    };
    ts.createWatchProgram(host);
}

function reportDiagnostic(diagnostic) {
    console.error("Error", diagnostic.code, ":", ts.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine()));
}

function reportWatchStatusChanged(diagnostic) {
    console.info(ts.formatDiagnostic(diagnostic, formatHost));
}

recompileServer();
