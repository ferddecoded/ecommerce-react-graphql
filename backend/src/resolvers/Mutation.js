const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const { randomBytes } = require('crypto');
// use to send reset email
const { transport, makeANiceEmail } = require('../mail');
const { hasPermission } = require('../utils');
// has all the methods for charging, pulling data, pulling receipts etc.
const stripe = require('../stripe');
// randomBytes can be run synchronosously
// but always best to run it asynchronously
// the way randomBytes works, it works via a callback function
// we use promisify to change callback based functions into promise based functions

const Mutations = {
  async createItem(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that');
    }
    // info contains information regarding the query
    // coming from the front end which be used
    // to intreact with the backend
    // ctx.db.mutation.createItem returns a promise
    // we make this method an async method and await the creation of the item
    // can also jsut return the promise
    // e,g, return ctx.db.mutation.createItem
    const item = await ctx.db.mutation.createItem(
      {
        data: {
          // this is how we create a relationship between the item and the user
          user: {
            connect: {
              id: ctx.request.userId,
            },
          },
          ...args,
        },
      },
      info,
    );

    return item;
  },
  updateItem(parent, args, ctx, info) {
    // first take a copy of the updates
    const updates = { ...args };
    // remove the id from the updates
    delete updates.id;
    // run the update method
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id,
        },
      },
      info,
    );
  },
  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    // 1. find the item
    const item = await ctx.db.query.item({ where }, `{ id title user { id } }`);
    // 2. check if they own the item or have permissions
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPermissions = ctx.request.user.permissions.some(permission =>
      ['ADMIN', 'ITEMDELETE'].includes(permission),
    );
    if (!ownsItem && hasPermissions) {
      throw new Error('You dont have permissions to do that');
    }
    // 3. delete it
    return ctx.db.mutation.deleteItem({ where }, info);
  },
  async signup(parent, args, ctx, info) {
    // lowercase their email
    args.email = args.email.toLowerCase();
    // hash their password
    const password = await bcrypt.hash(args.password, 10);
    // create the user in the database
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ['USER'] },
        },
      },
      info,
    );
    // create the JWT token for them
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // We set the jwt as a cookie on the response
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // Finalllllly we return the user to the browser
    return user;
  },
  async signin(parents, { email, password }, ctx, info) {
    // 1. check if their is a user with that email
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user found for email: ${email}`);
    }
    // 2. check if their password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error(`Invalid Password`);
    }
    // 3. generate the jwt token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    // 4. set the cookie with the token
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // 5. return the user
    return user;
  },
  signout(parents, args, ctx, info) {
    // remove token from cookies
    ctx.response.clearCookie('token');
    return { message: 'Goodbye!' };
  },
  async requestReset(parents, args, ctx, info) {
    // 1. check if this is a real user
    const user = await ctx.db.query.user({ where: { email: args.email } });
    if (!user) {
      throw new Error(`No such user found for email: ${email}`);
    }
    // 2. set a restToken and expiry on that user
    // needs to be random and unique
    // we promisify the callback function
    const randomBytesPromisified = promisify(randomBytes);
    const resetToken = (await randomBytesPromisified(20)).toString('hex');
    // give randomBytes a length of how long it should be
    // randomBytes will return a buffer
    // and convert buffer to hex
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    await ctx.db.mutation.updateUser({
      // we want to update the specfic user
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry },
    });
    // 3. email them that reset token
    await transport.sendMail({
      from: 'contact@ferddecoded.ca',
      to: user.email,
      subject: 'Your password Reset Token',
      html: makeANiceEmail(
        `Your password token is here for Cosign! \n\n <a href="${
          process.env.FRONTEND_URL
        }/reset?resetToken=${resetToken}">Click to Reset!</a>`,
      ),
    });
    // 4. return the message
    return { message: 'Thanks! ' };
  },
  async resetPassword(parent, args, ctx, info) {
    // 1. check if the passwords match
    if (!args.password === args.confirmPassword) {
      throw new Error('Passwords do not match');
    }
    // 2. check if its a legit resetToken
    // 3. check if its expired
    // we decide to use users instead of user so that we can query
    // with a where field that is not unique (resetToken)
    // otherwise we make resetToken in the data Model unique
    const [user] = await ctx.db.query.users({
      where: {
        // first looks for the user with this token
        resetToken: args.reseToken,
        // then sees if the resetTokenExpiry is greater than the current time
        // meaning it hasnt expired yet
        resetTokenExpiry_gte: Date.now(),
      },
    });
    if (!user) {
      throw new Error('This token is either invalid or expired.');
    }
    // 4. hash their newpassowrd
    const password = await bcrypt.hash(args.password, 10);
    // 5. save new password to the user and remove old resetToken field
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: { password, resetToken: null, resetTokenExpiry: null },
    });
    // 6. generate new jwt
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    // 7. set the new jwt cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // 8. return the new user
    return updatedUser;
  },
  async updatePermissions(parent, args, ctx, info) {
    // 1. check if they are logged in
    if (!ctx.request.userId) {
      throw new Error('Must be logged in');
    }
    // 2. Query the current user
    const currentUser = await ctx.db.query.user(
      {
        where: {
          id: ctx.request.userId,
        },
      },
      info,
    );
    // 3. Check if they have permissions to do this
    hasPermission(currentUser, ['ADMIN', 'PERMISSIONUPDATE']);
    // 4. update the permissions
    return ctx.db.mutation.updateUser(
      {
        data: {
          permissions: {
            set: args.permissions,
          },
          // we use set due to the enum of permission
        },
        where: { id: args.userId },
        // we use args instead of ctx.request
        // because we might update someone elses permissions
      },
      info,
    );
    // passing the info of the query to the updated user
  },
  async addToCart(parent, args, ctx, info) {
    // make sure the user is signed in
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error('You must be signed in');
    }
    // 2. Query the Users current cart
    // we want to query both on the users id and the item id that they are putting in
    // has this user put this item in the cart before
    // if not, we will make a new one
    // we also use cartItems vs cartItem because we can search by both userId and itemId, where as cartItem only uses item id
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: {
        user: { id: userId },
        item: { id: args.id },
      },
    });
    // 3. check if the item is already in their cart and increment by 1 if it is
    if (existingCartItem) {
      console.log('this item is already in their cart');
      return ctx.db.mutation.updateCartItem(
        {
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 },
        },
        info,
      );
    }
    // 4. if its not, create a fresh cartItem for that user
    return ctx.db.mutation.createCartItem(
      {
        data: {
          user: {
            connect: { id: userId },
          },
          item: {
            connect: { id: args.id },
          },
        },
      },
      info,
    );
  },
  async removeFromCart(parent, args, ctx, info) {
    // 1. find the cart item
    const cartItem = await ctx.db.query.cartItem(
      { where: { id: args.id } },
      `{ id user { id } }`,
    );
    if (!cartItem) {
      throw new Error('No cart item found');
    }
    // 2. make sure they own that cart item
    if (cartItem.user.id !== ctx.request.userId) {
      throw new Error('Cheatin Huh');
    }
    // 3. delete that cart item
    return ctx.db.mutation.deleteCartItem(
      {
        where: { id: args.id },
      },
      info,
    );
  },
  async createOrder(parent, args, ctx, info) {
    // 1. query the current user and make sure they are signed in
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error('You must be signed in to complete this order');
    }
    const user = await ctx.db.query.user(
      {
        where: { id: userId },
      },
      `
      {
        id
        name
        email
        cart {
          id
          quantity 
          item { 
            title 
            price 
            id 
            description 
            image
            largeImage
          }
        }
      }`,
    );
    // 2. recalculate the total of the price MUST because users can change price on client side
    const amount = user.cart.reduce(
      (tally, cartItem) => tally + cartItem.item.price * cartItem.quantity,
      0,
    );
    console.log(`Going to charge for a total of ${amount}`);
    // 3. create the stripe charge(turn token into money)
    const charge = await stripe.charges.create({
      amount,
      currency: 'CAD',
      source: args.token,
    });
    // 4. convert the cart item to order items
    const orderItems = user.cart.map(cartItem => {
      const orderItem = {
        // we want to copy the existing fields over from the cartItem (ie. description, title, image etc)
        // we dont want to reference them because the item can be modified or deleted
        ...cartItem.item,
        quantity: cartItem.quantity,
        user: { connect: { id: userId } },
      };
      delete orderItem.id;
      return orderItem;
    });
    // 5. create the order
    const order = await ctx.db.mutation.createOrder({
      data: {
        // amonut is returned back from stripe
        total: charge.amount,
        // id of the charge
        charge: charge.id,
        // cool little syntax that will allow you to create your order
        // while also creating the array of orderItems in the same mutation
        items: { create: orderItems },
        user: { connect: { id: userId } },
      },
    });
    // 6. clear the user's cart, delete cartItems
    const cartItemIds = user.cart.map(cartItem => cartItem.id);
    await ctx.db.mutation.deleteManyCartItems({
      where: { id_in: cartItemIds },
    });
    // 7. return the order to the client
    return order;
  },
};

module.exports = Mutations;
