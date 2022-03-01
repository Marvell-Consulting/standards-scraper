const { Octokit } = require('@octokit/rest');
const { createActionAuth } = require('@octokit/auth-action');
const Git = require('@lennym/commit');
const mkdir = require('mkdirp');
const fs = require('fs/promises');
const path = require('path');

module.exports = async (msg) => {

  if (!process.env.GITHUB_TOKEN) {
    return Promise.reject(new Error('GITHUB_TOKEN is required'));
  }
  const execution = (new Date()).toISOString();
  const dir = path.resolve(__dirname, '../');
  const repo = 'marvell-consulting/standards-scraper';
  const params = { auth: process.env.GITHUB_TOKEN };

  const octokit = new Octokit(params);

  const branch = `visual-regression-${Date.now()}`;

  const changes = [];

  // prevent errors if directories do not exist
  await mkdir(path.join(dir, 'actual'));
  await mkdir(path.join(dir, 'actualTexts'));
  await mkdir(path.join(dir, 'diff'));

  const baselines = await fs.readdir(path.join(dir, 'actual'));
  const texts = await fs.readdir(path.join(dir, 'actualTexts'));
  const diffs = await fs.readdir(path.join(dir, 'diff'));

  console.log({ baselines, texts, diffs });

  for await (const name of baselines) {
    const content = await fs.readFile(path.resolve(dir, 'actual', name));
    changes.push({
      name: `baseline/${name}`,
      content
    });
  }

  for await (const name of texts) {
    const content = await fs.readFile(path.resolve(dir, 'actualTexts', name));
    changes.push({
      name: `baselineTexts/${name}`,
      content
    });
  };

  for await (const name of diffs) {
    const content = await fs.readFile(path.resolve(dir, 'diff', name));
    changes.push({
      name: `diff/${name}`,
      content
    });
  };

  if (!changes.length) {
    console.log('No changes to push');
    return Promise.resolve();
  }

  const client = Git({
    repo,
    token: process.env.GITHUB_TOKEN
  });

  changes.forEach(file => {
    client.add(file.name, file.content);
  });

  return client
    .branch(branch)
    .commit(`Update baseline content\n\n${msg}`)
    .push()
    .then(() => {
      return octokit.pulls.create({
        owner: 'marvell-consulting',
        repo: 'standards-scraper',
        title: `Update baseline content\n\n${msg}`,
        head: branch,
        base: 'main'
      });
    })
    .then(result => {
      console.log(`Opened PR at: ${result.data.html_url}`);
    });

};
