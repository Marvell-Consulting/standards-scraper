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
  '#hs-eu-cookie-confirmation'
].join();

const contentSelectors = {
  'nhs-digital': 'article',
  'professional-record-standards-body': '.page-content'
};

describe('standards-scraper', () => {
  before(async () => {
    const req = await fetch(`${config.ckan}/api/3/action/package_search?include_private=true&rows=1000`, { headers: { Authorization: config.ckanKey } });
    const result = await req.json();
    this.standards = result.result.results.slice(0, 10);
  });

  it('runner', async () => {
    let msg = 'Found changes to the following standards:';
    let hasChanged = 0;
    await mkdir('./actualTexts');

    for await (const standard of this.standards) {
      let baselineText = '';
      const name = standard.name;
      const org = standard.organization.name;

      if (!contentSelectors[org]) {
        console.log(`Unknown organisation: ${org}`);
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
        await browser.reloadSession();
        await browser.url(standard.documentation_link);
        await browser.pause(2000);
        const hidden = await browser.$$(hiddenElementSelector);
        const imgComparison = await browser.checkFullPageScreen(standard.name, {
          hideScrollBars: true,
          hideElements: [
            ...hidden
          ]
        });
        const content = await browser.$(contentSelectors[org]);
        const text = await content.getText();

        if (imgComparison !== 0 || text !== baselineText) {
          if(text !== baselineText) {
            console.log(text);
            console.log(baselineText);
          }
          hasChanged++;
          msg += `\n* ${name}`;
          await writeFile(`./actualTexts/${name}.txt`, text);
        }
      } catch (e) {
        console.error(`Failed to check standard: ${name}`);
        console.error(e);
      }
    }

    if (hasChanged) {
      console.log(msg);
      await saveResults(msg);
    }
  });

});
