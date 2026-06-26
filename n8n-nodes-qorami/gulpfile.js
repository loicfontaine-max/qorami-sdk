const { src, dest } = require('gulp');

// Copy node icons (svg/png) into dist alongside the compiled node, so n8n can
// resolve `icon: 'file:qorami.svg'` from the built node folder.
function buildIcons() {
	return src('nodes/**/*.{png,svg}').pipe(dest('dist/nodes'));
}

exports['build:icons'] = buildIcons;
