try {
  require('dotenv/config');
} catch (e) {
  /* do nothing */
}

module.exports = {
  ckan: process.env.CKAN_URL || 'https://manage.dev.nhs.marvell-consulting.com',
  ckanKey: process.env.CKAN_KEY
};
