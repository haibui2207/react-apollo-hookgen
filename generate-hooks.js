/**
 * @Description
 * This script generates custom graphQL query/mutation hooks from graphQL schema
 * Before run this script, you might to generate graphql schema first by running command `npm run codegen:stg`
 * Then run this script after then by running command `npm run generate-hooks`
 * The result will be saved in `destinationDir`
 */
const fs = require('fs');
const path = require('path');
const argv = require('optimist').argv;
const glob = require('glob');
const prettier = require('prettier');
const graphql = require('graphql');
const rimraf = require('rimraf');
const { getOperationName } = require('@apollo/client/utilities');

// Input arguments
const pattern = argv.pattern || 'src/**/*.graphql'; // --pattern
const hookFilePrefix = argv.prefix || 'use';
const prettierConfigFile = argv.prettier || '.prettierrc'; // --prettier
const destinationDir = '../hooks'; // Destination directory which inside the pattern folder
const fileExtension = 'ts'; // ts | js
const skipAbsoluteOperationName = true; // Skip generate if operationName not match with fileName

const tempIndexFileContent = [];
const prettierConfigs = prettier.resolveConfig.sync(path.resolve(prettierConfigFile));
prettierConfigs.parser = fileExtension === 'ts' ? 'typescript' : 'babel';

glob(pattern, {}, (err, files) => {
  if (err) throw err;

  if (files.length === 0) {
    console.log('Files not found');
  }

  removeHooksDir();

  console.log('Generating...');

  files.forEach((file) => {
    fs.readFile(file, 'utf8', (err, data) => {
      if (err) throw err;

      const document = graphql.parse(data);
      const operationName = getOperationName(document);
      const operation = document.definitions[0].operation; // query | mutation | undefined
      const hasVariables = !!document.definitions[0].variableDefinitions?.length;
      // Allow same graphql schema but different selected fields
      const selectionName = document.definitions[0].selectionSet.selections[0].name.value;

      createHookFile(operation, operationName, selectionName, file, hasVariables);
    });
  });

  process.on('exit', () => {
    console.log('Finish');
  });
});

const createHookFile = (operation, operationName, selectionName, file, hasVariables) => {
  let template;
  const fileName = path.basename(file, '.graphql');

  if (!operation || !['query', 'mutation'].includes(operation)) {
    // console.log(`Skip generate file ${file}`);

    // Ignore Fragment graphql files which no operation and operation name
    return;
  }

  if (fileName !== operationName && skipAbsoluteOperationName) {
    console.log(`Skip generate file ${file} - operation name not match`);

    return;
  }

  switch (operation) {
    case 'query':
      template = hasVariables ? queryVariablesTemplate : queryTemplate;
      break;
    case 'mutation':
      template = hasVariables ? mutationVariablesTemplate : mutationTemplate;
      break;
    default:
      break;
  }

  if (!template) throw new Error(`Not support operation: ${operation} - ${operationName}`);

  const hookDir = createHooksDir(file);
  const hookFileName = `${hookFilePrefix}${operationName}${capitalize(operation)}`;
  const hookFileWithExt = `${hookFileName}.${fileExtension}`;
  const hookFilePath = path.resolve(hookDir, hookFileWithExt);
  const hookIndexFilePath = path.resolve(hookDir, `index.${fileExtension}`);
  const hookFileContent = template
    .replaceAll('<operationName>', operationName)
    .replaceAll('<selectionNameArgs>', lowerCase(selectionName));

  writeFileWithPrettier(hookFilePath, hookFileContent);
  saveIndexFileContent(hookIndexFilePath, hookFileName);
};

const createHooksDir = (file) => {
  const dir = path.dirname(file);
  const hookDir = path.join(dir, destinationDir);
  if (!fs.existsSync(hookDir)) {
    fs.mkdirSync(hookDir, { recursive: true });
  }

  return hookDir;
};

const removeHooksDir = () => {
  // Clean generate files before because some file can be changed/removed/renamed
  const dir = path.dirname(pattern);
  rimraf.sync(path.join(dir, destinationDir));
};

const writeFileWithPrettier = (filePath, fileContent) => {
  fs.writeFileSync(filePath, prettier.format(fileContent, prettierConfigs));
};

const saveIndexFileContent = (filePath, fileName) => {
  const content = `export * from './${fileName}';`;
  tempIndexFileContent.push(content);
  // Sort to keep index file not changed
  tempIndexFileContent
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())) // Sort by alphabel
    .sort((a, b) => a.length - b.length); // Sort by length

  writeFileWithPrettier(filePath, tempIndexFileContent.join(''));
};

const capitalize = (text) => text.charAt(0).toUpperCase() + text.substring(1);
const lowerCase = (text) => text.charAt(0).toLowerCase() + text.substring(1);

const queryTemplate = `
import { useCallback } from 'react';
import { useQuery, useLazyQuery, useApolloClient, QueryOptions, QueryHookOptions, LazyQueryHookOptions } from '@apollo/client';
import { useSnackbarHelper } from '../../useSnackbarHelper';
import QUERY from '../operations/<operationName>.graphql';
import { Query } from '../../__generated__/globalTypes';

export const use<operationName>Query = (options?: QueryHookOptions<Query>) => {
  const { t, enqueueSnackbar } = useSnackbarHelper();
  const result = useQuery<Query>(QUERY, {
    onError: error => {
      enqueueSnackbar(t(error.message), { variant: 'error' });
    },
    ...options
  });

  return result;
};

export const use<operationName>LazyQuery = (options?: LazyQueryHookOptions<Query>) => {
  const { t, enqueueSnackbar } = useSnackbarHelper();
  const [get<operationName>Query, result] = useLazyQuery<Query>(QUERY, {
    onError: error => {
      enqueueSnackbar(t(error.message), { variant: 'error' });
    },
    ...options
  });

  return { get<operationName>Query, ...result };
};

export const use<operationName>PromiseQuery = () => {
  const client = useApolloClient();

  const get<operationName> = useCallback((options?: Omit<QueryOptions<Record<string, unknown>, Query>, 'query'>) =>
    client.query<Query>({ ...options, query: QUERY }),
  [client]
  );

  return { get<operationName> };
};
`;

const queryVariablesTemplate = `
import { useCallback } from 'react';
import { useQuery, useLazyQuery, useApolloClient, QueryOptions, QueryHookOptions, LazyQueryHookOptions } from '@apollo/client';
import { useSnackbarHelper } from '../../useSnackbarHelper';
import QUERY from '../operations/<operationName>.graphql';
import { Query, Query<selectionNameArgs>Args } from '../../__generated__/globalTypes';

export const use<operationName>Query = (options?: QueryHookOptions<Query, Query<selectionNameArgs>Args >) => {
  const { t, enqueueSnackbar } = useSnackbarHelper();
  const result = useQuery<Query, Query<selectionNameArgs>Args >(QUERY, {
    onError: error => {
      enqueueSnackbar(t(error.message), { variant: 'error' });
    },
    ...options
  });

  return result;
};

export const use<operationName>LazyQuery = (
  options?: LazyQueryHookOptions<Query, Query<selectionNameArgs>Args >
) => {
  const { t, enqueueSnackbar } = useSnackbarHelper();
  const [get<operationName>, result] = useLazyQuery<Query, Query<selectionNameArgs>Args >(QUERY, {
    onError: error => {
      enqueueSnackbar(t(error.message), { variant: 'error' });
    },
    ...options
  });

  return { get<operationName>, ...result };
};

export const use<operationName>PromiseQuery = () => {
  const client = useApolloClient();

  const get<operationName> = useCallback((options?: Omit<QueryOptions<Query<selectionNameArgs>Args , Query>, 'query'>) =>
    client.query<Query, Query<selectionNameArgs>Args >({ ...options, query: QUERY }),
  [client]
  );

  return { get<operationName> };
};
`;

const mutationTemplate = `import { useMutation, MutationHookOptions } from '@apollo/client';
import MUTATION from '../operations/<operationName>.graphql';
import { Mutation } from '../../__generated__/globalTypes';

export const use<operationName>Mutation = (options?: MutationHookOptions<Mutation>) => {
  const [call<operationName>, result] = useMutation<Mutation>(MUTATION, options);

  return { call<operationName>, ...result };
};

export type <operationName>MutationFunction = Mutation['<selectionNameArgs>'];
`;

const mutationVariablesTemplate = `import { useMutation, MutationHookOptions } from '@apollo/client';
import MUTATION from '../operations/<operationName>.graphql';
import { Mutation, Mutation<selectionNameArgs>Args } from '../../__generated__/globalTypes';

export const use<operationName>Mutation = (options?: MutationHookOptions<Mutation, Mutation<selectionNameArgs>Args>) => {
  const [call<operationName>, result] = useMutation<Mutation, Mutation<selectionNameArgs>Args>(MUTATION, options);

  return { call<operationName>, ...result };
};

export type <operationName>MutationFunction = Mutation['<selectionNameArgs>'];
`;
