import { Query } from 'react-apollo';
import gql from 'graphql-tag';
import PropTypes from 'prop-types';

const CURRENT_USER_QUERY = gql`
  query {
    me {
      id
      email
      name
      permissions
      cart {
        id
        quantity
        # due to the relationship created with cartItem
        # we can ask for the item properties 
        item {
          id
          price
          image
          description
          title
        }
      }
    }
  }
`;

const User = props => {
  return (
    <Query query={CURRENT_USER_QUERY} {...props}>
      {payload => {
        return props.children(payload);
      }}
    </Query>
  );
}

User.propTypes = {
  children: PropTypes.func.isRequired,
}

export default User;
export { CURRENT_USER_QUERY };
