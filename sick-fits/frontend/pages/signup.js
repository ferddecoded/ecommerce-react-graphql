import SignupColumn from '../components/Signup';
import SigninColumn from '../components/Signin';
import RequestResetColumn from '../components/RequestReset';
import styled from 'styled-components';

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  grid-gap: 20px;
`;

const Signup = props => (
  <Columns>
    <SignupColumn />
    <SigninColumn />
    <RequestResetColumn />
  </Columns>
);

export default Signup;
