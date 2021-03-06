const assert = require('assert');
const fetch = require('node-fetch');
const mkdir = require('mkdirp');
const { readFile, writeFile } = require('fs/promises');

const config = require('./config');
const saveResults = require('./lib/save-results');

// hide cookie popups
const hiddenElementSelector = [
  '#CybotCookiebotDialog',
  '#CybotCookiebotDialogBodyContentTitle',
  '#hs-eu-cookie-confirmation',
  '#tna-cookie-prompt-banner'
].join();

const contentSelectors = {
  'digital.nhs.uk': 'article',
  'theprsb.org': '.page-content',
  'webarchive.nationalarchives.gov.uk': '',
  'www.dicomstandard.org': ''
};

describe('standards-scraper', () => {
  before(async () => {
    const req = await fetch(`${config.ckan}/api/3/action/package_search?include_private=true&rows=1000`, { headers: { Authorization: config.ckanKey } });
    const result = await req.json();
    this.standards = result.result.results;
  });

  it('runner', async () => {
    let msg = 'Found changes to the following standards:';
    let hasChanged = 0;
    await mkdir('./actualTexts');

    for await (const standard of this.standards) {
      let baselineText = '';
      const name = standard.name;

      const url = new URL(standard.documentation_link);
      const host = url.hostname;

      if (!contentSelectors[host]) {
        console.log(`Unsupported host: ${host}`);
        console.log(standard.documentation_link);
        continue;
      }

      try {
        baselineText = await readFile(`./baselineTexts/${name}.txt`);
        baselineText = baselineText.toString();
      } catch (e) {
        if (e.code !== 'ENOENT') {
          continue;
        }
      }
      try {
        let imgComparison = 0;
        await browser.reloadSession();
        await browser.url(standard.documentation_link);
        await browser.pause(2000);
        const hidden = await browser.$$(hiddenElementSelector);
        const contentElement = await browser.$(contentSelectors[host]);
        try {
          imgComparison = await browser.checkElement(contentElement, standard.name, {
            hideScrollBars: true,
            hideElements: [
              ...hidden
            ]
          });
        } catch (e) {
          console.error(`Could not perform image comparison on standard: ${name}`);
          console.error('Performaing text-only comparison');
          console.error(standard.documentation_link);
          console.error(e.message);
        }

        const text = await contentElement.getText();

        if (imgComparison !== 0 || text !== baselineText) {
          hasChanged++;
          msg += `\n* ${name}`;
          await writeFile(`./actualTexts/${name}.txt`, text);
        }
      } catch (e) {
        console.error(`Failed to check standard: ${name}`);
        console.error(standard.documentation_link);
        console.error(e);
      }
    }

    if (hasChanged) {
      console.log(msg);
      await saveResults(msg);
    }
  });

});
