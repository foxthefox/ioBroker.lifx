import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
	{ files: [ '**/*.js' ], languageOptions: { sourceType: 'commonjs' } },
	{
		ignores: [
			'.dev-server/**/*',
			'admin/build/**/*',
			'admin/words.js',
			'test/**/*',
			'main.test.js',
			'lib/**/*',
			'main_old.js'
		]
	},
	{ languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended
];
