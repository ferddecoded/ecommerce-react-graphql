const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('crypto');
// use to send reset email
const { transport, makeANiceEmail } = require('../mail');
// randomBytes can be run synchronosously
// but always best to run it asynchronously
// the way randomBytes works, it works via a callback function
// we use promisify to change callback based functions into promise based functions
const { promisify } = require('util');

const Mutations = {
  async createItem(parent, args, ctx, info) {
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
    const item = await ctx.db.query.item({ where }, `{ id title }`);
    // 2. check if they own the item or have permissions
    // TODO
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
      from: 'ferdinand.ismael@gmail.com',
      to: user.email,
      subject: 'Your password Reset Token',
      html: makeANiceEmail(`Your password token is here! \n\n <a href="${process.env.FRONTEND_URL}/reset?resetToken=${resetToken}">Click to Reset!</a>`),
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
      data: { password, resetToken: null, resetTokenExpiry: null }
    });
    // 6. generate new jwt
    const token = jwt.sign({ userId: updatedUser.id },  process.env.APP_SECRET);
    // 7. set the new jwt cookie
    ctx.response.cookie('token', token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year cookie
    });
    // 8. return the new user
    return updatedUser;
  },
};

module.exports = Mutations;
