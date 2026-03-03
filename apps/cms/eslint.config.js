import antfu from '@antfu/eslint-config'

export default await antfu(
    {
      jsonc: false,
      yaml: false,
      rules: {
        'antfu/top-level-function': 'off',
        'test/prefer-lowercase-title': 'off',
        'node/prefer-global/process': 'off',
        'vue/block-order': 'off',
        'vue/attribute-hyphenation': 'off',
        'vue/v-on-event-hyphenation': 'off',
        'test/no-identical-title': 'off',
        'vue/no-unused-refs': 'off',
        'ts/no-use-before-define': 'off',
        'vue/require-component-is': 'off',
        'regexp/no-obscure-range': 'off',
        'array-callback-return': 'off',
        'ts/consistent-type-definitions': 'off',
      },
      vue: {
        vueVersion: 3,
        sfcBlocks: {
          blocks: {
            styles: false,
          },
        }
      },
      ignores: [
      '**/*.js',
      ],
    },
)
