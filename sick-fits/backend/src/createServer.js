const { GraphQLServer } = require('graphql-yoga');

// resolvers answer the question, where does this data come from
// or what does this data do in the database

// 2 kinds
// query resolvers, when you pull data
// mutation resolver, when you push data

const Mutation = require('./resolvers/Mutation');
const Query = require('./resolvers/Query');
const db = require('./db');

// Create the GraphQL Yoga Server

function createServer() {
  return new GraphQLServer({
    // ingest a schema.gql
    typeDefs: 'src/schema.graphql',
    // match everything in the schema with a mutation or query
    resolvers: {
      Mutation,
      Query
    },
    resolverValidationOptions: {
      requireResolversForResolveType: false
    },
    // expose database to every single request
    context: req => ({ ...req, db })
  })
}

module.exports = createServer;