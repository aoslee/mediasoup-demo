/**
 * Tasks:
 *
 * gulp dist
 *   Generates the browser app in development mode (unless NODE_ENV is set
 *   to 'production').
 *
 * gulp live
 *   Generates the browser app in development mode (unless NODE_ENV is set
 *   to 'production'), opens it and watches for changes in the source code.
 *

 * gulp
 *   Alias for `gulp dist`.
 */

const fs = require('fs');
const path = require('path');
const gulp = require('gulp');
const gulpif = require('gulp-if');
const gutil = require('gulp-util');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const header = require('gulp-header');
const touch = require('gulp-touch-cmd');
const shell = require('gulp-shell');
const browserify = require('browserify');
const watchify = require('watchify');
const envify = require('envify/custom');
const uglify = require('gulp-uglify-es').default;
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const del = require('del');
const mkdirp = require('mkdirp');
const ncp = require('ncp');
const eslint = require('gulp-eslint');
const stylus = require('gulp-stylus');
const cssBase64 = require('gulp-css-base64');
const nib = require('nib');
const electron = require('electron-connect').server.create();

const PKG = require('./package.json');
const BANNER = fs.readFileSync('banner.txt').toString();
const BANNER_OPTIONS =
{
	pkg         : PKG,
	currentYear : (new Date()).getFullYear()
};
const OUTPUT_DIR = 'public';

// Set Node 'development' environment (unless externally set).
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

gutil.log(`NODE_ENV: ${process.env.NODE_ENV}`);

function logError(error)
{
	gutil.log(gutil.colors.red(error.stack));
}

function bundle(options)
{
	options = options || {};

	const watch = Boolean(options.watch);

	let bundler = browserify(
		{
			entries      : 'lib/index.jsx', // PKG.main,
			extensions   : [ '.js', '.jsx' ],
			// required for sourcemaps (must be false otherwise).
			debug        : process.env.NODE_ENV === 'development',
			// required for watchify.
			cache        : {},
			// required for watchify.
			packageCache : {},
			// required to be true only for watchify.
			fullPaths    : watch
		})
		.external([ 'main.js', 'gulpfile.js' ])
		.transform('babelify')
		.transform(envify(
			{
				NODE_ENV : process.env.NODE_ENV,
				_        : 'purge'
			}));

	if (watch)
	{
		
		bundler = watchify(bundler);

		bundler.on('update', () =>
		{
			const start = Date.now();
			
			gutil.log('bundling...');
			rebundle();
			gutil.log('bundle took %sms', (Date.now() - start));
		});
	}

	function rebundle()
	{
		return bundler.bundle()
			.on('error', logError)
			.pipe(plumber())
			.pipe(source(`${PKG.name}.js`))
			.pipe(buffer())
			.pipe(rename(`${PKG.name}.js`))
			.pipe(gulpif(process.env.NODE_ENV === 'production',
				uglify()
			))
			.pipe(header(BANNER, BANNER_OPTIONS))
			.pipe(gulp.dest(OUTPUT_DIR));
	}

	return rebundle();
}

gulp.task('clean', () => del(OUTPUT_DIR, { force: true }));

gulp.task('lint', () =>
{
	const src =
	[
		'gulpfile.js',
		'lib/**/*.js',
		'lib/**/*.jsx'
	];

	return gulp.src(src)
		.pipe(plumber())
		.pipe(eslint())
		.pipe(eslint.format());
});

gulp.task('css', () =>
{
	return gulp.src('stylus/index.styl')
		.pipe(plumber())
		.pipe(stylus(
			{
				use      : nib(),
				compress : process.env.NODE_ENV === 'production'
			}))
		.on('error', logError)
		.pipe(cssBase64(
			{
				baseDir           : '.',
				maxWeightResource : 50000 // So big ttf fonts are not included, nice.
			}))
		.pipe(rename(`${PKG.name}.css`))
		.pipe(gulp.dest(OUTPUT_DIR))
		.pipe(touch());
});

gulp.task('html', () =>
{
	return gulp.src('index.html')
		.pipe(gulp.dest(OUTPUT_DIR));
});

gulp.task('resources', (done) =>
{
	const dst = path.join(OUTPUT_DIR, 'resources');

	mkdirp.sync(dst);
	ncp('resources', dst, { stopOnErr: true }, (error) =>
	{
		if (error && error[0].code !== 'ENOENT')
			throw new Error(`resources copy failed: ${error}`);

		done();
	});
});

gulp.task('bundle', () =>
{
	return bundle({ watch: false });
});

gulp.task('bundle:watch', () =>
{
	return bundle({ watch: true });
});

gulp.task('builder-win', shell.task('npm run package-win'));

gulp.task('dist-win', gulp.series(
	'clean',
	'lint',
	'bundle',
	'html',
	'css',
	'resources',
	'builder-win'
));

gulp.task('builder-mac', shell.task('npm run package-mac'));

gulp.task('dist-mac', gulp.series(
	'clean',
	'lint',
	'bundle',
	'html',
	'css',
	'resources',
	'builder-mac'
));

gulp.task('builder-linux', shell.task('npm run package-linux'));

gulp.task('dist-linux', gulp.series(
	'clean',
	'lint',
	'bundle',
	'html',
	'css',
	'resources',
	'builder-linux'
));

gulp.task('builder-all', shell.task('npm run package-all'));

gulp.task('dist', gulp.series(
	'clean',
	'lint',
	'bundle',
	'html',
	'css',
	'resources',
	'builder-all'
));

gulp.task('watch', (done) =>
{
	// Watch changes in HTML.
	gulp.watch([ 'index.html' ], gulp.series(
		'html',
		'electronreload'
	));

	// Watch changes in Stylus files.
	gulp.watch([ 'stylus/**/*.styl' ], gulp.series(
		'css',
		'electronreload'
	));

	// Watch changes in resources.
	gulp.watch([ 'resources/**/*' ], gulp.series(
		'resources',
		'css',
		'electronreload'
	));

	// Watch changes in JS files.
	gulp.watch([ 'gulpfile.js', 'lib/**/*.js', 'lib/**/*.jsx' ], gulp.series(
		'lint',
		'bundle',
		'electronreload'
	));

	done();
});
gulp.task('electronstart', (done) =>
{
	electron.start();
	done();
});
gulp.task('electronreload', (done) =>
{
	electron.reload();
	done();
});

gulp.task('electron:base', gulp.series(
	'clean',
	'lint',
	'html',
	'css',
	'resources',
	'watch',
	'bundle:watch',
	'electronstart'
));
gulp.task('live', gulp.series(
	'electron:base'
));

gulp.task('default', gulp.series('dist'));
