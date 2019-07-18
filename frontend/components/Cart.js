import React from 'react';
import { Query, Mutation } from 'react-apollo';
import gql from 'graphql-tag';
// we will use the below function to clean up the render prop mess we have
import { adopt } from 'react-adopt';
import CartStyles from './styles/CartStyles';
import Supreme from './styles/Supreme';
import CloseButton from './styles/CloseButton';
import SickButton from './styles/SickButton';
import User from './User';
import CartItem from './CartItem';
import calcTotalPrice from '../lib/calcTotalPrice';
import formatMoney from '../lib/formatMoney';
import TakeMyMoney from './TakeMyMoney';

// takes an object of all the things we would like to compose into each other
const Composed = adopt({
  // we must provide the render as a child or else errors will occur stating that the prop children is required but undefined
  user: ({ render }) => <User>{render}</User>,
  toggleCart: ({ render }) => (
    <Mutation mutation={TOGGLE_CART_MUTATION}>{render}</Mutation>
  ),
  localState: ({ render }) => <Query query={LOCAL_STATE_QUERY}>{render}</Query>,
});

const LOCAL_STATE_QUERY = gql`
  query {
    # we tag a directive here @client
    # lets appolo dont try to go to grab this from the server
    # lets it know to grab it directly from appolo store
    cartOpen @client
  }
`;

const TOGGLE_CART_MUTATION = gql`
  mutation {
    toggleCart @client
  }
`;

const Cart = () => (
  <Composed>
    {/* the render function takes a object which we will destructure to the composed properties */}
    {({ user, toggleCart, localState }) => {
      const me = user.data.me;
      if (!me) return null;
      return (
        // by removing the Mutation component, we expose the toggleCart function and expose it to the closeButton
        // we also remove the Query component and now must add the localState prefix on our data for CartStyles
        <CartStyles open={localState.data.cartOpen}>
          <header>
            <CloseButton title="close" onClick={toggleCart}>
              &times;
            </CloseButton>
            <Supreme>{me.name}'s Cart</Supreme>
            <p>
              {' '}
              You have {me.cart.length} Item
              {me.cart.length === 1 ? '' : 's'} in your cart.
            </p>
          </header>
          <ul>
            {me.cart.map(cartItem => (
              <CartItem
                id={cartItem.id}
                cartItem={cartItem}
                key={cartItem.id}
              />
            ))}
          </ul>
          <footer>
            <p>{formatMoney(calcTotalPrice(me.cart))}</p>
            {me.cart.length && (
              <TakeMyMoney>
                <SickButton>Checkout</SickButton>
              </TakeMyMoney>
            )}
          </footer>
        </CartStyles>
        // by removing the Mutation component, we expose the toggleCart function and expose it to the closeButton
      );
    }}
  </Composed>
);

// before implementing composed
// const Cart = () => (
//   <User>
//     {({ data: { me } }) => {
//       if (!me) return null;
//       console.log(me);
//       return (
//         <Mutation mutation={TOGGLE_CART_MUTATION}>
//           {toggleCart => (
//             <Query query={LOCAL_STATE_QUERY}>
//               {({ data }) => (
//                 <CartStyles open={data.cartOpen}>
//                   <header>
//                     <CloseButton title="close" onClick={toggleCart}>
//                       &times;
//                     </CloseButton>
//                     <Supreme>{me.name}'s Cart</Supreme>
//                     <p>
//                       {' '}
//                       You have {me.cart.length} Item
//                       {me.cart.length === 1 ? '' : 's'} in your cart.
//                     </p>
//                   </header>
//                   <ul>
//                     {me.cart.map(cartItem => (
//                       <CartItem
//                         id={cartItem.id}
//                         cartItem={cartItem}
//                         key={cartItem.id}
//                       />
//                     ))}
//                   </ul>
//                   <footer>
//                     <p>{formatMoney(calcTotalPrice(me.cart))}</p>
//                     <SickButton>Checkout</SickButton>
//                   </footer>
//                 </CartStyles>
//               )}
//             </Query>
//           )}
//         </Mutation>
//       );
//     }}
//   </User>
// );

export default Cart;
export { LOCAL_STATE_QUERY, TOGGLE_CART_MUTATION };
