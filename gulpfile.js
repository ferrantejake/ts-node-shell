'use strict';

const gulp = require('gulp-help')(require('gulp-param')(require('gulp'), process.argv));
// const async = require('async');
const del = require('del');
const merge = require('merge2');
// const path = require('path');

// load gulp plugins
const G$ = require('gulp-load-plugins')({ lazy: true });

// load settings
const pkg = require('./package');
if (!pkg) {
    console.log('Could not find package.json!');
    process.exit(1);
}

const settings = require('./gulp.json');
const tsconfig = require('./tsconfig.json');
let tsProject = undefined;

gulp.task('debug', 'Run the project and auto-restart for changes', function (project, debug) {
    debug = debug || pkg.debug;
    console.log(`>> debug ${pkg.name} with DEBUG=${debug}`);
    G$.nodemon({
        script: pkg.main,
        ext: 'js',
        env: {
            NODE_ENV: 'development',
            DEBUG: debug
        },
        delay: 1, // Sec
        watch: `app`,
        ignore: pkg.src
    });
}, {
        options: {
            project: `Project name: ${pkg.name}`
        }
    });

// Transpiling
gulp.task(`typescript`, `Transpile typescript files`, transpileTask);
function transpileTask(callback) {
    const dest = settings.dest,
        src = settings.tsfiles
    const tsResult = gulp.src(src)
        .pipe(G$.sourcemaps.init())
        .pipe(G$.typescript.createProject(tsconfig.compilerOptions)());
    return merge([
        // .d.ts files
        tsResult.dts.pipe(gulp.dest(dest)),
        // .js files + sourcemaps
        settings.inlineSourcemaps
            ? tsResult.js
                .pipe(G$.sourcemaps.write()) // inline sourcemaps
                .pipe(gulp.dest(dest))
            : tsResult.js
                .pipe(G$.sourcemaps.write('.')) // separate .js.map files
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
gulp.task('build', 'Compiles all TypeScript source files and updates module references', buildTask);
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