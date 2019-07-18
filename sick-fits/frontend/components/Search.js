import React from 'react';
import Downshift, { resetIdCounter } from 'downshift';
import Router from 'next/router';
import { ApolloConsumer } from 'react-apollo';
import gql from 'graphql-tag';
// used to take all the requests that occur in a short amount of time and will fire only once after the expected time
// to use this, wrap the function with the debounce function, providing the second arguement with how much time you want it to take before sending the request
import debounce from 'lodash.debounce';
import { DropDown, DropDownItem, SearchStyles } from './styles/DropDown';

// search query that uses the users input and search on title or description
const SEARCH_ITEMS_QUERY = gql`
  query SEARCH_ITEMS_QUERY($searchTerm: String!) {
    items(
      # OR is written here to search either title or description
      where: {
        OR: [
          { title_contains: $searchTerm }
          { description_contains: $searchTerm }
        ]
      }
    ) {
      id
      image
      title
    }
  }
`;

// doesnt need to be a part of the class
const routeToItem = item => {
  Router.push({
    pathname: '/item',
    query: {
      id: item.id,
    },
  });
};

// one of the main concerns for our search is
// normally we would wrap our input in a Query component
// drawback to this is that the Query would run on page load, which is unneccessary
// thats why we need direct access to our apollo client Apollo Consumer
// Apollo consumer will expose the client directly to it
// by directly accessing the apollo consumer, we can pass the onChange event to the class method while also accessing the query from the apollo client
class AutoComplete extends React.Component {
  state = {
    items: [],
    loading: false,
  };
  onChange = debounce(async (e, apolloClient) => {
    // turn loading on
    this.setState({ loading: true });
    // manually query apollo client
    const response = await apolloClient.query({
      query: SEARCH_ITEMS_QUERY,
      variables: { searchTerm: e.target.value },
    });
    this.setState({ items: response.data.items, loading: false });
  }, 350);
  render() {
    // this is to reset the counter that occurs in downshift from the server
    // server side, this count will continuous;y count hence why we will reset upon render
    resetIdCounter();
    return (
      <SearchStyles>
        {/* we use the itemToString value here to ensure that what's returned on click is the title */}
        {/* because what we pass to ItemToProps is an object, we need to specifiy this */}
        <Downshift
          itemToString={item => (item === null ? '' : item.title)}
          onChange={routeToItem}
        >
          {/* desctructed values from downshifts render props */}
          {({
            getInputProps,
            getItemProps,
            isOpen,
            inputValue,
            highlightedIndex,
          }) => (
            <div>
              <ApolloConsumer>
                {apolloClient => (
                  // getInputProps is pread into the input
                  // it also takes in an object as an argument
                  // which contains the props we want to use
                  <input
                    {...getInputProps({
                      onChange: e => {
                        e.persist();
                        this.onChange(e, apolloClient);
                      },
                      type: 'search',
                      id: 'search',
                      placeholder: 'Search for an item',
                      className: this.state.loading ? 'loading' : '',
                    })}
                  />
                )}
              </ApolloConsumer>
              {/* boolean that uses isOpen from Downshift  */}
              {isOpen && (
                <DropDown>
                  {this.state.items.map((item, index) => (
                    <DropDownItem
                      {...getItemProps({ item })}
                      key={item.id}
                      highlighted={index === highlightedIndex}
                    >
                      <img width="50" src={item.image} alt={item.title} />
                      {item.title}
                    </DropDownItem>
                  ))}
                  {!this.state.items.length && !this.state.loading && (
                    <DropDownItem>Nothing Found for {inputValue}</DropDownItem>
                  )}
                </DropDown>
              )}
            </div>
          )}
        </Downshift>
      </SearchStyles>
    );
  }
}

export default AutoComplete;
