import { ApolloClient, InMemoryCache, HttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { toast } from 'react-toastify';

// Error handling link with retry logic
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      toast.error(`GraphQL Error: ${message}`);
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    toast.error('Network error occurred. Please check your connection.');
    
    // Retry the operation
    return forward(operation);
  }
});

// Create the HTTP link to your GraphQL API with timeout
const httpLink = new HttpLink({
  uri: process.env.REACT_APP_GRAPH_API_URL || 'http://localhost:8000/graphql',
  credentials: 'same-origin',
  fetchOptions: {
    timeout: 30000 // 30 second timeout
  }
});

// Create the Apollo client
export const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          nfts: {
            merge(existing = [], incoming: any[]) {
              return [...existing, ...incoming];
            },
            read(existing = []) {
              return existing;
            }
          },
          transfers: {
            merge(existing = [], incoming: any[]) {
              return [...existing, ...incoming];
            },
            read(existing = []) {
              return existing;
            }
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true
    },
    mutate: {
      errorPolicy: 'all'
    }
  },
});
