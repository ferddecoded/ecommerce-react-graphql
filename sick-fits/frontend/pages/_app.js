import App, { Container } from 'next/app';
import { ApolloProvider } from 'react-apollo';
import Page from '../components/Page';
import withData from '../lib/withData';

// this is good for keeping state when navigating pages
// the entire app is wrapped in an App component which allows you to share data across pages
// here, we use that to share query params

class MyApp extends App {
  // runs before render
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};
    // if component we are trying to render has props, grab them
    if(Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }
    // this exposes the query to the user
    pageProps.query = ctx.query;
    // this exposes props in the render method
    // this getInitalProps function is run before the render method
    return { pageProps };
  }
  render() {
    const { Component, apollo, pageProps } = this.props;

    return (
      <Container>
        <ApolloProvider client={apollo}>
          <Page>
            <Component {...pageProps} />
          </Page>
        </ApolloProvider>
      </Container>
    )
  }
}

// withData makes the appolo client avaibale via this.props
export default withData(MyApp);