const { gql } = require('apollo-server-express');
const NFT = require('./models/nft');

const typeDefs = gql`
  type Attribute {
    trait_type: String!
    value: String!
  }

  type Metadata {
    attributes: [Attribute!]!
  }

  type Fraction {
    id: ID!
    supply: Int!
    remaining: Int!
    pricePerFraction: Float!
  }

  type Royalty {
    id: ID!
    percentage: Float!
    beneficiary: String!
  }

  type NFT {
    id: ID!
    name: String!
    description: String!
    image: String!
    owner: String!
    metadata: Metadata!
    status: String!
    fractions: [Fraction!]
    royalties: [Royalty!]
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    nfts(owner: String!): [NFT!]!
    nft(id: ID!): NFT
    allNFTs: [NFT!]!
  }

  input AttributeInput {
    trait_type: String!
    value: String!
  }

  input MetadataInput {
    attributes: [AttributeInput!]!
  }

  input FractionInput {
    supply: Int!
    pricePerFraction: Float!
  }

  input RoyaltyInput {
    percentage: Float!
    beneficiary: String!
  }

  type Mutation {
    createNFT(
      name: String!
      description: String!
      image: String!
      owner: String!
      metadata: MetadataInput!
    ): NFT!

    updateNFT(
      id: ID!
      name: String
      description: String
      image: String
      metadata: MetadataInput
    ): NFT!

    deleteNFT(id: ID!): Boolean!

    updateNFTStatus(
      id: ID!
      status: String!
    ): NFT!

    addFractions(
      id: ID!
      fraction: FractionInput!
    ): NFT!

    addRoyalty(
      id: ID!
      royalty: RoyaltyInput!
    ): NFT!

    transferNFT(
      id: ID!
      newOwner: String!
    ): NFT!
  }
`;

const resolvers = {
  Query: {
    nfts: async (_, { owner }) => {
      try {
        return await NFT.find({ owner });
      } catch (error) {
        console.error('Error fetching NFTs:', error);
        throw new Error('Failed to fetch NFTs');
      }
    },
    nft: async (_, { id }) => {
      try {
        return await NFT.findById(id);
      } catch (error) {
        console.error('Error fetching NFT:', error);
        throw new Error('Failed to fetch NFT');
      }
    },
    allNFTs: async () => {
      try {
        return await NFT.find({});
      } catch (error) {
        console.error('Error fetching all NFTs:', error);
        throw new Error('Failed to fetch all NFTs');
      }
    }
  },
  Mutation: {
    createNFT: async (_, args) => {
      try {
        const nft = new NFT({
          ...args,
          status: 'created'
        });
        return await nft.save();
      } catch (error) {
        console.error('Error creating NFT:', error);
        throw new Error('Failed to create NFT');
      }
    },

    updateNFT: async (_, { id, ...updates }) => {
      try {
        return await NFT.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true, runValidators: true }
        );
      } catch (error) {
        console.error('Error updating NFT:', error);
        throw new Error('Failed to update NFT');
      }
    },

    deleteNFT: async (_, { id }) => {
      try {
        const result = await NFT.findByIdAndDelete(id);
        return !!result;
      } catch (error) {
        console.error('Error deleting NFT:', error);
        throw new Error('Failed to delete NFT');
      }
    },

    updateNFTStatus: async (_, { id, status }) => {
      try {
        return await NFT.findByIdAndUpdate(
          id,
          { $set: { status } },
          { new: true, runValidators: true }
        );
      } catch (error) {
        console.error('Error updating NFT status:', error);
        throw new Error('Failed to update NFT status');
      }
    },

    addFractions: async (_, { id, fraction }) => {
      try {
        return await NFT.findByIdAndUpdate(
          id,
          { 
            $push: { 
              fractions: {
                ...fraction,
                remaining: fraction.supply
              }
            },
            $set: { status: 'fractional' }
          },
          { new: true, runValidators: true }
        );
      } catch (error) {
        console.error('Error adding fractions:', error);
        throw new Error('Failed to add fractions');
      }
    },

    addRoyalty: async (_, { id, royalty }) => {
      try {
        return await NFT.findByIdAndUpdate(
          id,
          { $push: { royalties: royalty } },
          { new: true, runValidators: true }
        );
      } catch (error) {
        console.error('Error adding royalty:', error);
        throw new Error('Failed to add royalty');
      }
    },

    transferNFT: async (_, { id, newOwner }) => {
      try {
        return await NFT.findByIdAndUpdate(
          id,
          { $set: { owner: newOwner } },
          { new: true, runValidators: true }
        );
      } catch (error) {
        console.error('Error transferring NFT:', error);
        throw new Error('Failed to transfer NFT');
      }
    }
  }
};

module.exports = { typeDefs, resolvers }; 