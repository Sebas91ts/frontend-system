export const customModdle = {
  name: 'System BPM Custom',
  uri: 'http://systembpm.com/schema',
  prefix: 'custom',
  xml: {
    tagAlias: 'lowerCase',
  },
  types: [
    {
      name: 'areaRef',
      superClass: ['Element'],
      properties: [
        {
          name: 'body',
          isBody: true,
          type: 'String',
        },
      ],
    },
  ],
};
