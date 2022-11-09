// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
	docs: [
		'introduction',
		{
			type: 'category',
			label: 'NBT',
			link: {
				type: 'generated-index',
			},
			collapsed: false,
			items: [
				'nbt/file',
				'nbt/region',
				'nbt/chunk',
				'nbt/tag',
				{
					type: 'category',
					label: 'Types',
					link: {
						type: 'doc',
						id: 'nbt/type',
					},
					collapsed: true,
					items: [
						'nbt/type/end',
						'nbt/type/byte',
						'nbt/type/short',
						'nbt/type/int',
						'nbt/type/long',
						'nbt/type/float',
						'nbt/type/double',
						'nbt/type/bytearray',
						'nbt/type/string',
						'nbt/type/list',
						'nbt/type/compound',
						'nbt/type/intarray',
						'nbt/type/longarray',
					],
				},
			],
		},
	],
}

module.exports = sidebars
