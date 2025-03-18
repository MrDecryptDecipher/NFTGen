import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { createHttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { toast } from 'react-toastify';

// Define fragments for reusable field selections
const NFT_FIELDS = gql`
  fragment NFTFields on NFT {
    id
    name
    description
    image
    owner
    metadata {
      attributes {
        trait_type
        value
      }
    }
    status
  }
`;

const FRACTION_FIELDS = gql`
  fragment FractionFields on Fraction {
    id
    supply
    remaining
    pricePerFraction
  }
`;

const ROYALTY_FIELDS = gql`
  fragment RoyaltyFields on Royalty {
    id
    percentage
    beneficiary
  }
`;

// Define queries
export const GET_NFTS = gql`
  query GetNFTs($owner: String!) {
    nfts(owner: $owner) {
      ...NFTFields
      fractions {
        ...FractionFields
      }
      royalties {
        ...RoyaltyFields
      }
    }
  }
  ${NFT_FIELDS}
  ${FRACTION_FIELDS}
  ${ROYALTY_FIELDS}
`;

export const GET_NFT_BY_ID = gql`
  query GetNFTById($id: ID!) {
    nft(id: $id) {
      ...NFTFields
      fractions {
        ...FractionFields
      }
      royalties {
        ...RoyaltyFields
      }
    }
  }
  ${NFT_FIELDS}
  ${FRACTION_FIELDS}
  ${ROYALTY_FIELDS}
`;

// Create error handling link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
      toast.error(`Error: ${message}`);
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    toast.error('Network error occurred. Please try again.');
  }
});

// Create retry link for transient failures
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 2000,
    jitter: true,
  },
  attempts: {
    max: 2,
    retryIf: (error) => {
      const shouldRetry = !!error && error.statusCode !== 400 && error.statusCode !== 401;
      return shouldRetry;
    },
  },
});

// Create HTTP link
const httpLink = createHttpLink({
  uri: 'http://3.111.22.56:3000/graphql',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Create Apollo Client
export const client = new ApolloClient({
  link: retryLink.concat(errorLink.concat(httpLink)),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          nfts: {
            merge(existing, incoming) {
              return incoming;
            },
            read(existing) {
              return existing || [];
            }
          },
          nft: {
            merge(existing, incoming) {
              return incoming;
            },
            read(existing) {
              return existing || null;
            }
          }
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      nextFetchPolicy: 'cache-first',
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
}); 