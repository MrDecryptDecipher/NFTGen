import { gql } from '@apollo/client';

export const GET_NFTS = gql`
  query GetNFTs($owner: String!) {
    nfts(owner: $owner) {
      id
      name
      description
      image
      owner
      fractions {
        id
        percentage
        owner
      }
      royalties {
        id
        percentage
        recipient
      }
      createdAt
    }
  }
`;

export const GET_TRANSFERS = gql`
  query GetTransfers(
    $address: String!
    $orderBy: TransferOrderBy
  ) {
    transfers(
      address: $address
      orderBy: $orderBy
    ) {
      id
      from
      to
      tokenId
      timestamp
      transactionHash
      nft {
        id
        name
        image
      }
    }
  }
`; 