import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import { Transfer } from '../types';

const GET_TRANSFER_HISTORY = gql`
  query GetTransferHistory($address: String!) {
    transfers(
      where: { or: [{ from: $address }, { to: $address }] }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      from
      to
      tokenId
      transactionHash
      timestamp
      nft {
        id
        name
      }
    }
  }
`;

export const useTransferHistory = (address?: string) => {
  const { data, loading, error } = useQuery(GET_TRANSFER_HISTORY, {
    variables: { address: address?.toLowerCase() },
    skip: !address,
  });

  return {
    transfers: data?.transfers as Transfer[] ?? [],
    isLoading: loading,
    error,
  };
};