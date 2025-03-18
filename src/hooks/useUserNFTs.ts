import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { NFT } from '../types';

const GET_USER_NFTS = gql`
  query GetUserNFTs($owner: String!) {
    nfts(where: { owner: $owner }) {
      id
      name
      description
      image
      owner
      fractions
      royalties
      createdAt
    }
  }
`;

export const useUserNFTs = (address?: string) => {
  const { data, loading, error } = useQuery(GET_USER_NFTS, {
    variables: { owner: address?.toLowerCase() },
    skip: !address,
  });

  return {
    nfts: data?.nfts as NFT[] ?? [],
    isLoading: loading,
    error,
  };
};