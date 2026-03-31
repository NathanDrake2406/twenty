import { getCreateCompanyWhenAddingNewPersonCodeStepLogicFunctionDefinitions } from 'src/engine/workspace-manager/standard-objects-prefill-data/utils/prefill-workflow-code-step-logic-functions.util';

type LogicFunctionMain = (params: Record<string, unknown>) => Promise<unknown>;

const compileLogicFunctionMain = (
  sourceHandlerCode: string,
): LogicFunctionMain => {
  const transformedSource = `${sourceHandlerCode
    .replace("import psl from 'psl';", "const psl = require('psl');")
    .replace(
      'export const main = async (params) => {',
      'const main = async (params) => {',
    )}

module.exports = { main };`;

  const module = {
    exports: {} as { main?: LogicFunctionMain },
  };

  const evaluateModule = new Function(
    'require',
    'module',
    'exports',
    transformedSource,
  );

  evaluateModule(require, module, module.exports);

  if (!module.exports.main) {
    throw new Error('Failed to compile workflow logic function source');
  }

  return module.exports.main;
};

describe('prefilled workflow code-step logic functions', () => {
  const definitions =
    getCreateCompanyWhenAddingNewPersonCodeStepLogicFunctionDefinitions(
      'workspace-id',
    );

  const getMain = (name: string) => {
    const definition = definitions.find(
      (logicFunctionDefinition) => logicFunctionDefinition.name === name,
    );

    if (!definition) {
      throw new Error(`Missing logic function definition: ${name}`);
    }

    return compileLogicFunctionMain(definition.sourceHandlerCode);
  };

  it.each([
    [
      'periklis.theodoridis@themagnet.com.cy',
      'themagnet.com.cy',
      'https://themagnet.com.cy',
    ],
    ['contact@ccci.org.cy', 'ccci.org.cy', 'https://ccci.org.cy'],
    ['student@ucy.ac.cy', 'ucy.ac.cy', 'https://ucy.ac.cy'],
    ['user@twenty.co.uk', 'twenty.co.uk', 'https://twenty.co.uk'],
  ])(
    'extracts the PSL registrable domain for %s',
    async (email, expectedDomain, expectedUrl) => {
      const main = getMain('Extract domain from email');

      await expect(main({ email })).resolves.toEqual({
        domain: expectedDomain,
        url: expectedUrl,
      });
    },
  );

  it('matches companies by registrable domain instead of collapsing to the public suffix', async () => {
    const main = getMain('Find matching company by domain');

    await expect(
      main({
        domain: 'themagnet.com.cy',
        companies: [
          {
            id: 'fetch',
            domainName: { primaryLinkUrl: 'https://fetch.com.cy' },
          },
          {
            id: 'themagnet',
            domainName: { primaryLinkUrl: 'https://themagnet.com.cy' },
          },
          {
            id: 'cyta',
            domainName: { primaryLinkUrl: 'https://cyta.com.cy' },
          },
        ],
      }),
    ).resolves.toEqual({
      companyId: 'themagnet',
      hasMatch: true,
    });
  });

  it.each([
    ['periklis.theodoridis@themagnet.com.cy', false],
    ['contact@ccci.org.cy', false],
    ['student@ucy.ac.cy', false],
    ['person@gmail.com', true],
  ])('classifies %s as personal=%s', async (primaryEmail, isPersonal) => {
    const main = getMain('Is this a personal email?');

    await expect(main({ primaryEmail })).resolves.toEqual({ isPersonal });
  });
});
