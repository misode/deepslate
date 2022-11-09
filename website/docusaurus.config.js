const lightCodeTheme = require('prism-react-renderer/themes/github')
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

// With JSDoc @type annotations, IDEs can provide config autocompletion
/** @type {import('@docusaurus/types').DocusaurusConfig} */
(module.exports = {
	title: 'Deepslate',
	tagline: 'Library for rendering and emulating parts of Minecraft',
	url: 'https://misode.github.io',
	baseUrl: '/deepslate/',
	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'warn',
	favicon: 'img/logo.png',
	organizationName: 'misode',
	projectName: 'deepslate',
	trailingSlash: true,

	presets: [
		[
			'@docusaurus/preset-classic',
			/** @type {import('@docusaurus/preset-classic').Options} */
			({
				docs: {
					editUrl: 'https://github.com/misode/deepslate/edit/main/website/',
					routeBasePath: '/',
				},
				blog: false,
				theme: {
					customCss: require.resolve('./src/css/custom.css'),
				},
			}),
		],
	],

	plugins: [
		[
			'@docusaurus/plugin-content-docs', 
			/** @type {import('@docusaurus/plugin-content-docs').Options} */
			({
				id: 'examples',
				path: 'examples',
				routeBasePath: 'examples',
			}),
		],
	],

	themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
    	navbar: {
    		title: 'Deepslate',
    		logo: {
    			alt: 'Deepslate Logo',
    			src: 'img/logo.png',
    		},
    		items: [
    			{
    				type: 'doc',
    				docId: 'intro',
    				position: 'left',
    				label: 'Docs',
    			},
    			{
    				to: 'examples/splines',
    				position: 'left',
    				label: 'Examples',
    				activeBaseRegex: '/examples/',
    			},
    			{
    				href: 'https://github.com/misode/deepslate',
    				label: 'GitHub',
    				position: 'right',
    			},
    		],
    	},
    	footer: {
    		style: 'dark',
    		copyright: `Copyright © ${new Date().getFullYear()} Misode. Built with Docusaurus.`,
    	},
    	prism: {
    		theme: lightCodeTheme,
    		darkTheme: darkCodeTheme,
    	},
    }),
})
