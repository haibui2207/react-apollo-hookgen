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
const graphqlSchemaDir = 'src/lib/__generated__'; // Directory contains graphQL Schema
const fileExtension = 'ts'; // ts | js
const indexFileName = `index.${fileExtension}`;
const pattern = `${graphqlSchemaDir}/*.${fileExtension}`;
const indexFilePath = path.resolve(graphqlSchemaDir, indexFileName);
const tempIndexFileContent = [];

glob(pattern, { ignore: [`${graphqlSchemaDir}/${indexFileName}`] })
  .then((files) => {
    if (files.length === 0) {
      console.log('Files not found. You need to generate graphQL Schema first.');
    }

    console.log('Generating index file...');

    // hard code to re-export from generate-hooks script
    if (fs.existsSync(path.join(graphqlSchemaDir, 'hooks/index.ts'))) {
      tempIndexFileContent.push(`export * from './hooks';`);
    }

    files.forEach((file, index) => {
      fs.readFile(file, 'utf8', (err) => {
        if (err) throw err;

        saveIndexFileContent(file);
      });
    });

    process.on('exit', () => {
      console.log('Finish');
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

const saveIndexFileContent = async (file) => {
  const fileName = path.basename(file, `.${fileExtension}`);
  const content = `export * from './${fileName}';`;
  tempIndexFileContent.push(content);

  // Sort to keep index file not changed
  tempIndexFileContent
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())) // Sort by alphabet
    .sort((a, b) => a.length - b.length); // Sort by length

  await writeFileWithPrettier(indexFilePath, tempIndexFileContent.join(''));
};
