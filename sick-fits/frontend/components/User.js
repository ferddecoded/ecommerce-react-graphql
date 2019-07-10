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
