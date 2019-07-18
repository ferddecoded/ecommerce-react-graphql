import PleaseSignin from '../components/PleaseSignin';
import OrdersList from '../components/OrdersList';

const OrdersPage = props => (
  <div>
    <PleaseSignin>
      <OrdersList id={props.query.id} />
    </PleaseSignin>
  </div>
);

export default OrdersPage;
