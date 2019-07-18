import React from 'react';
import StripedCheckout from 'react-stripe-checkout';
import { Mutation } from 'react-apollo';
import Router from 'next/router';
import NProgress from 'nprogress';
import PropTypes from 'prop-types';
import gql from 'graphql-tag';
import calcTotalPrice from '../lib/calcTotalPrice';
import Error from './ErrorMessage';
import User, { CURRENT_USER_QUERY } from './User';

const totalItems = cart => {
  return cart.reduce((tally, cartItem) => tally + cartItem.quantity, 0);
};

const CREATE_ORDER_MUTATION = gql`
  mutation CREATE_ORDER_MUTATION($token: String!) {
    createOrder(token: $token) {
      id
      charge
      total
      items {
        id
        title
      }
    }
  }
`;

class TakeMyMoney extends React.Component {
  onToken = async (res, createOrder) => {
    // call this once token has been submitted and created
    // we also need to send the token server side
    // this gives a UI treatment showing that the request has been sent
    NProgress.start();
    console.log('on token called', res);
    // manually call the mutation once we have the striped token
    const order = await createOrder({
      variables: {
        token: res.id,
      },
    }).catch(err => alert(err.message));
    console.log(order);
    Router.push({
      pathname: '/order',
      query: {
        id: order.data.createOrder.id,
      },
    });
  };
  render() {
    return (
      <User query={CURRENT_USER_QUERY}>
        {({ data: { me } }) => (
          <Mutation
            mutation={CREATE_ORDER_MUTATION}
            refetchQueries={[{ query: CURRENT_USER_QUERY }]}
          >
            {createOrder => (
              <StripedCheckout
                // mus t always pass cents to stripe
                // amount needs to be in that specific format
                amount={calcTotalPrice(me.cart)}
                name="cosign"
                description={`Order of ${totalItems(me.cart)} item(s)`}
                image={
                  me.cart.length && me.cart[0].item && me.cart[0].item.image
                }
                stripeKey="pk_test_tEVpKZsTAlyV0oiB8404gKLA00RUqqPSMZ"
                currency="CAD"
                email={me.email}
                // when the transaction goes through, it will create a token that we will
                // send to the server to actually charge the credit card
                // a token is created in order to hide the credit card credentials
                token={res => this.onToken(res, createOrder)}
              >
                {this.props.children}
              </StripedCheckout>
            )}
          </Mutation>
        )}
      </User>
    );
  }
}

export default TakeMyMoney;
