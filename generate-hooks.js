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
const { glob } = require('glob');
const prettier = require('prettier');
const graphql = require('graphql');
const rimraf = require('rimraf');
const { getOperationName } = require('@apollo/client/utilities');

// Input arguments
const pattern = argv.pattern || 'src/**/*.graphql'; // --pattern
const hookFilePrefix = argv.prefix || 'use';
const destinationDir = '../hooks'; // Destination directory which inside the pattern folder
const fileExtension = 'ts'; // ts | js
const skipAbsoluteOperationName = true; // Skip generate if operationName not match with fileName

const tempIndexFileContent = [];

glob(pattern, {})
  .then((files) => {
    if (files.length === 0) {
      throw new Error('Files not found');
    }

    console.log('Generating...');

    removeHooksDir();

    loadPrettier()
      .then((formatOptions) =>
        Promise.all(
          files.map((file) => {
            fs.readFile(file, 'utf8', (err, data) => {
              if (err) throw err;
              const document = graphql.parse(data);
              const operationName = getOperationName(document);
              const operation = document.definitions[0].operation; // query | mutation | undefined
              const hasVariables = !!document.definitions[0].variableDefinitions?.length;
              // Allow same graphql schema but different selected fields
              const selectionNames = document.definitions[0].selectionSet.selections.map((item) => item.name.value);
              const selectionName =
                operationName && selectionNames.includes(lowerCase(operationName)) ? operationName : selectionNames[0];

              return createHookFile(operation, operationName, selectionName, file, hasVariables, formatOptions);
            });
          })
        )
      )
      .finally(() => {
        process.on('exit', () => {
          console.log('Finish');
        });
      });
  })
  .catch((error) => {
    throw error;
  });

const createHookFile = async (operation, operationName, selectionName, file, hasVariables, formatOptions) => {
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

  await writeFileWithPrettier(hookFilePath, hookFileContent, formatOptions);
  await saveIndexFileContent(hookIndexFilePath, hookFileName, formatOptions);
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

const loadPrettier = async () => {
  const configFilePath = await prettier.resolveConfigFile(process.cwd());
  const options = await prettier.resolveConfig(configFilePath);

  return {
    parser: fileExtension === 'ts' ? 'typescript' : 'babel',
    ...options
  };
};

const writeFileWithPrettier = async (filePath, fileContent, formatOptions) => {
  const formattedCode = await prettier.format(fileContent, formatOptions);
  await fs.promises.writeFile(filePath, formattedCode);
};

const saveIndexFileContent = async (filePath, fileName, formatOptions) => {
  tempIndexFileContent.push(`export * from './${fileName}';`);
  // Sort to keep index file less changed as much as possible
  tempIndexFileContent
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())) // Sort by alphabet
    .sort((a, b) => a.length - b.length); // Sort by length

  await writeFileWithPrettier(filePath, tempIndexFileContent.join(''), formatOptions);
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
