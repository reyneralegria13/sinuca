export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'core',
        'web',
        'physics',
        'rules',
        'render',
        'ui',
        'input',
        'audio',
        'docs',
        'deps',
        'ci',
        'repo',
      ],
    ],
    'subject-case': [0],
  },
};
