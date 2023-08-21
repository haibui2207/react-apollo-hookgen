/**
 * @Description
 * This script generates an index file inside `graphqlSchemaDir` to re-export all of graphQL Schemas
 * This help places where used graphQL Schemas can import from an interface instead of from multiple files
 */
const fs = require('fs');
const path = require('path');
const argv = require('optimist').argv;
const glob = require('glob');
const prettier = require('prettier');

// Input arguments
const prettierConfigFile = argv.prettier || '.prettierrc'; // --prettier
const graphqlSchemaDir = 'src/lib/__generated__'; // Directory contains graphQL Schema
const fileExtension = 'ts'; // ts | js
const indexFileName = `index.${fileExtension}`;
const pattern = `${graphqlSchemaDir}/*.${fileExtension}`;
const indexFilePath = path.resolve(graphqlSchemaDir, indexFileName);
const tempIndexFileContent = [];
const prettierConfigs = prettier.resolveConfig.sync(path.resolve(prettierConfigFile));
prettierConfigs.parser = fileExtension === 'ts' ? 'typescript' : 'babel';

glob(pattern, { ignore: [`${graphqlSchemaDir}/${indexFileName}`] }, (err, files) => {
  if (err) throw err;

  if (files.length === 0) {
    console.log('Files not found. You need to generate graphQL Schema first.');
  }

  console.log('Generating index file...');

  // hard code to re-export from generate-hooks script
  if (fs.existsSync(path.join(graphqlSchemaDir, 'hooks/index.ts'))) {
    tempIndexFileContent.push(`export * from './hooks';`);
  }

  files.forEach((file, index) => {
    fs.readFile(file, 'utf8', err => {
      if (err) throw err;

      saveIndexFileContent(file);
    });
  });

  process.on('exit', () => {
    console.log('Finish');
  });
});

const writeFileWithPrettier = (filePath, fileContent) => {
  fs.writeFileSync(filePath, prettier.format(fileContent, prettierConfigs));
};

const saveIndexFileContent = file => {
  const fileName = path.basename(file, `.${fileExtension}`);
  const content = `export * from './${fileName}';`;
  tempIndexFileContent.push(content);

  // Sort to keep index file not changed
  tempIndexFileContent
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())) // Sort by alphabel
    .sort((a, b) => a.length - b.length); // Sort by length

  writeFileWithPrettier(indexFilePath, tempIndexFileContent.join(''));
};
