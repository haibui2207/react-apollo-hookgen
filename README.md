# react-apollo-hookgen

Generate react hooks from graphql files for reusing


# TODO

- [X] Combine with apollo codegen
- [ ] Support typescript
- [X] Support javascript
- [X] Create templates for javascript
- [ ] Create templates for typescript
- [X] Support `.graphql`
- [ ] Support `.gql`

**Optional**
- [X] Custom template
- [X] Format file with prettier
- [ ] Dynamic destination directory
- [ ] Support terminal-link npm
- [ ] Console log see better
- [ ] Detect apollo generated files location

**Arguments**
- [X] graphql pattern: `/src/**/*.graphql`
- [X] prettier config file: `.prettierrc`, `.prettierrc.json`, `.prettierrc.yml`, `.prettierrc.yaml`
A .prettierrc.js

Options:

  --pattern: optional
    Graphql pattern. Default `./src/**/*.graphql`
    
  --prettier: optional
    Prettier configuration file location. Default `null`
    
  --dir-des: optional
    Directory where save generated files. Default `__generated__`

**Scripts**

    "scripts": {
        "codegen": "gql-gen --config codegen.config.ts --prettier=./.prettierrc",
        "generate-hooks": "node generate-hooks.js --pattern=./src/lib/**/*.graphql --prettier=./.prettierrc && npm run generate-graphql-index",
        "generate-graphql-index": "node generate-graphql-index.js --prettier=./.prettierrc"
    },

### Templates
 - [ ] query, lazy query - no variables
 - [ ] query, lazy query - has variables
 - [ ] mutation - no variables
 - [ ] mutation - has variables
