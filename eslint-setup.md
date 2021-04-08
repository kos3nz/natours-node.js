# Setting up for ESLint

## npm install

- eslint

- prettier

- eslint-config-prettier
<!-- disable formatting for eslint so that prettier will format the code -->

- eslint-plugin-prettier
<!-- allows eslint to show formatting errors as I type -->

- eslint-config-airbnb
<!-- the most popular javascript style guide -->
- eslint-plugin-node
<!-- adds a couple of specific eslint rules only for nodejs -->

- eslint-plugin-import
<!-- necessary in order to make the airbnb style guide work -->

- eslint-plugin-jsx-a11y
<!-- necessary in order to make the airbnb style guide work -->

- eslint-plugin-react
<!-- necessary in order to make the airbnb style guide work -->

### .prettierrc config

```.prettierrc
{
  "singleQuote": true,
  "printWidth": 50
}
```

### .eslintrc.json config

```.eslintrc.json
{
  "extends": [
    "airbnb",
    "prettier",
    "plugin:node/recommended"
  ],
  "plugins": ["prettier"],
  "rules": {
    "prettier/prettier": "error",
    "spaced-comment": "off",
    "no-console": "warn",
    "consistent-return": "off",
    "func-names": "off",
    "object-shorthand": "off",
    "no-process-exit": "off",
    "no-param-reassign": "off",
    "no-return-await": "off",
    "no-underscore-dangle": "off",
    "class-methods-use-this": "off",
    "prefer-destructuring": [
      "error",
      { "object": true, "array": false }
    ],
    "no-unused-vars": [
      "error",
      { "argsIgnorePattern": "req|res|next|val" }
    ]
  }
}
```
