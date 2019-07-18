// requires stripe node module
// stripe secret is accessed from the stripe developer website
// and you then pass your stripe secret into the module
const stripe = require('stripe');
const config = stripe(process.env.STRIPE_SECRET);
module.exports = config;
