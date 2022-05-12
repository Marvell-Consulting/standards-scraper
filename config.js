try {
  require('dotenv/config');
} catch (e) {
  /* do nothing */
}

module.exports = {
  ckan: process.env.CKAN_URL || 'https://manage.dev.standards.nhs.uk',
  ckanKey: process.env.CKAN_KEY
};
