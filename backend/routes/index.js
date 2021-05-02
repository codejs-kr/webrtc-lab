const ROUTES = require('./urls.js');

/**
 * Routes
 * @param app
 */
module.exports = (app) => {
  ROUTES.forEach(({ url, title, renderFile }) => {
    app.get(url, (_, res) => {
      res.render(renderFile, {
        title: title ? `- ${title}` : '',
      });
    });
  });
};
