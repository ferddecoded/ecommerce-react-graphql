const Mutations = {
  async createItem(parent, args, ctx, info) {
    // TODO: Check if they are logged in
    
    // info contains information regarding the query
    // coming from the front end which be used
    // to intreact with the backend
    // ctx.db.mutation.createItem returns a promise
    // we make this method an async method and await the creation of the item
    // can also jsut return the promise
    // e,g, return ctx.db.mutation.createItem

    const item = await ctx.db.mutation.createItem({
      data: {
        ...args
      }
    }, info);

    return item;
  }
  // createDog(parent, args, ctx, info) {
  //   global.dogs = global.dogs || [];
  //   // create a dog!
  //   const newDog = { name: args.name };
  //   global.dogs.push(newDog);
  //   return newDog;
  // }
};

module.exports = Mutations;
