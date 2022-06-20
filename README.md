# react-apollo-hookgen

Generate react hooks from graphql files for reusing


# TODO

- [ ] Combine with apollo codegen
- [ ] Support typescript
- [ ] Support javascript
- [ ] Create templates for javascript
- [ ] Create templates for typescript
- [ ] Support `.graphql`, `gql`

**Optional**
- [ ] Custom template
- [ ] Format file with prettier
- [ ] Dynamic destination directory
- [ ] Support terminal-link npm
- [ ] Console log see better
- [ ] Detect apollo generated files location

**Arguments**
- [ ] graphql pattern: `/src/**/*.graphql`
- [ ] prettier config file: `.prettierrc`, `.prettierrc.json`, `.prettierrc.yml`, `.prettierrc.yaml`
A .prettierrc.js

**Run command**

    react-apollo-hookgen --pattern=./src/**/*.graphql --prettier=./.prettierrc
    
Options:

  --pattern: optional
    Graphql pattern. Default `./src/**/*.graphql`
    
  --prettier: optional
    Prettier configuration file location. Default `null`
    
  --dir-des: optional
    Directory where save generated files. Default `__generated__`



### Templates
 - [ ] query, lazy query - no variables
 - [ ] query, lazy query - has variables
 - [ ] mutation - no variables
 - [ ] mutation - has variables
