'use strict';

const gulp =
    require('gulp-help')(require('gulp-param')(require('gulp'), process.argv));
const async = require('async');
const del = require('del');
const merge = require('merge2');
const path = require('path');
const DependencyResolver = require('dependency-resolver');

// load gulp plugins
const G$ = require('gulp-load-plugins')({ lazy: true });
let resolver;
const exec = require('child_process').exec;

// load settings
const pkg = require('./package');
if (!pkg) {
    console.log('Could not find package.json!');
    process.exit(1);
}

const settings = require('./gulp.json');
const tsconfig = require('./tsconfig.json');
let tsProject = undefined;

function getDependencyList() {
    const project = 'app';
    if (resolver === undefined) {
        resolver = new DependencyResolver();
        resolver.add(project);
        (Object.keys(pkg.dependencies) || []).forEach(dep =>
            resolver.setDependency(project, dep)
        );
    }
    return resolver.resolve(project);
}

// Run a series of commands.
function runCommands(commands, callback) {
    async.eachSeries(commands, function (command, done) {
        runCommand(command.cmd, { cwd: command.cwd }, done);
    }, function () {
        callback();
    });
}

// Execute child process commands.
function runCommand(command, options, callback) {
    exec(command, options, function (error, stdout, stderr) {
        console.log(`${path.resolve(options.cwd || '.')} ${command}`);
        console.log(stdout);
        console.log(stderr);
        if (error !== null)
            console.log('exec error: ', error);
        callback();
    });
}

// DO NOT CHANGE DEFAULT TASK - Azure depends on it
gulp.task('default', false, defaultTask);

function defaultTask(callback) {
    G$.sequence('startup', callback);
}

gulp.task('startup', false, startupTask);

function startupTask(callback) {
    G$.sequence('build', callback);
}
gulp.task('install', 'Install all npm modules', installTask);

// Install project dependencies.
function installTask(callback) {
    const deps = getDependencyList();
    const commands = deps.map(dep => {
        return { cmd: 'npm install', cwd: `${dep}` }
    });
    runCommands(commands, callback);
}

gulp.task(
    'debug',
    'Run the project and auto-restart for changes', function (project, debug) {
        debug = debug || pkg.debug;
        console.log(`>> debug ${pkg.name} with DEBUG=${debug}`);
        G$.nodemon({
            script: pkg.main,
            ext: 'js',
            env: { NODE_ENV: 'development', DEBUG: debug },
            delay: 1,  // Sec
            watch: `app`,
            ignore: pkg.src
        });
    }, { options: { project: `Project name: ${pkg.name}` } });

// Transpiling
gulp.task(`typescript`, `Transpile typescript files`, transpileTask);
function transpileTask(callback) {
    const dest = settings.dest, src = settings.tsfiles
    const tsResult =
        gulp.src(src)
            .pipe(G$.sourcemaps.init())
            .pipe(G$.typescript.createProject(tsconfig.compilerOptions)());
    return merge([
        // .d.ts files
        tsResult.dts.pipe(gulp.dest(dest)),
        // .js files + sourcemaps
        settings.inlineSourcemaps ?
            tsResult.js
                .pipe(G$.sourcemaps.write())  // inline sourcemaps
                .pipe(gulp.dest(dest)) :
            tsResult.js
                .pipe(G$.sourcemaps.write('.'))  // separate .js.map files
                .pipe(gulp.dest(dest)),
        // all other files
        gulp.src(settings.resources).pipe(gulp.dest(dest))
    ]);
}

// Lint TypeScript
// see https://www.npmjs.com/package/tslint
gulp.task('tslint', 'Lints all TypeScript source files', tsLintTask);
function tsLintTask(callback) {
    return gulp.src(settings.tsfiles)
        .pipe(G$.tslint({ formatter: 'verbose' }))
        .pipe(G$.tslint.report({ emitError: false }));
};

// Building
gulp.task(
    'build',
    'Compiles all TypeScript source files and updates module references',
    buildTask);
function buildTask(callback) {
    G$.sequence(['tslint', 'clean'], 'typescript', callback);
};

// Watching
gulp.task('watch', 'Contiuous build', ['build'], watchTask);
function watchTask(callback) {
    gulp.watch(settings.tsfiles, ['tslint', `typescript`]);
}

// Cleaning
gulp.task('clean', 'Cleans the generated files from lib directory', cleanTask);
function cleanTask(callback) {
    return del((settings.dest), { dot: true });
}