global.assert = require('assert');

const AdminToken = require('../models/admin-token.js');


before(async function ()  {
    process.env.UNIQUE_TOKEN = await AdminToken.getAdminToken();
  });

