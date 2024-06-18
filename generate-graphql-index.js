/**
 * @Description
 * This script generates an index file inside `graphqlSchemaDir` to re-export all of graphQL Schemas
 * This help places where used graphQL Schemas can import from an interface instead of from multiple files
 */
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const prettier = require('prettier');

// Input arguments
const graphqlSchemaDir = 'src/lib/hooks'; // Directory contains graphQL Schema
const fileExtension = 'ts'; // ts | js
const indexFileName = `index.${fileExtension}`;
const pattern = `${graphqlSchemaDir}/*.${fileExtension}`;
const indexFilePath = path.resolve(path.join(graphqlSchemaDir, indexFileName));
const tempIndexFileContent = [];

glob(pattern, { ignore: [indexFilePath] })
  .then((files) => {
    if (files.length === 0) {
      console.log('Files not found. You need to generate graphQL Schema first.');

      return;
    }

    console.log('Generating index file...');

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            fs.readFile(file, 'utf8', (err) => {
              if (err) {
                console.error(err);
                reject();
              }

              saveIndexFileContent(file);
              resolve();
            });
          })
      )
    )
      .then(() => writeFileWithPrettier(indexFilePath, tempIndexFileContent.join('')))
      .finally(() => {
        process.on('exit', () => {
          console.log('Finish');
        });
      });
  })
  .catch((error) => {
    throw error;
  });

const writeFileWithPrettier = async (filePath, fileContent) => {
  const configFilePath = await prettier.resolveConfigFile(process.cwd());
  const options = await prettier.resolveConfig(configFilePath);
  const formattedCode = await prettier.format(fileContent, {
    parser: fileExtension === 'ts' ? 'typescript' : 'babel',
    ...options
  });

  fs.writeFileSync(filePath, formattedCode);
};

const saveIndexFileContent = (file) => {
  const fileName = path.basename(file, `.${fileExtension}`);
  const content = `export * from './${fileName}';`;
  tempIndexFileContent.push(content);

  // Sort to keep index file not changed
  tempIndexFileContent
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())) // Sort by alphabet
    .sort((a, b) => a.length - b.length); // Sort by length
};
