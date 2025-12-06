// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFTGenERC1155 is ERC1155, ERC1155URIStorage, ERC1155Supply, Ownable, Pausable {
    using Strings for uint256;

    // Token counter
    uint256 private _currentTokenId;

    // Royalty information
    struct RoyaltyInfo {
        address recipient;
        uint256 percentage; // Using basis points (10000 = 100%)
    }
    RoyaltyInfo public royaltyInfo;

    // Token metadata
    struct TokenMetadata {
        string name;
        string description;
        string image;
        string external_url;
        string[] attributes;
    }
    mapping(uint256 => TokenMetadata) public tokenMetadata;

    // Events
    event TokenMinted(address indexed to, uint256 indexed tokenId, uint256 amount, string tokenURI);
    event BatchMinted(address indexed to, uint256[] tokenIds, uint256[] amounts);
    event RoyaltyUpdated(address indexed recipient, uint256 percentage);
    event MetadataUpdated(uint256 indexed tokenId, string name, string description);

    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {
        // Set default royalty to 5% to the contract owner
        royaltyInfo = RoyaltyInfo(initialOwner, 500); // 500 = 5%
        _currentTokenId = 1;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mintNFT(
        address recipient,
        uint256 amount,
        string memory tokenURI,
        TokenMetadata memory metadata
    ) public whenNotPaused returns (uint256) {
        uint256 newTokenId = _currentTokenId++;

        _mint(recipient, newTokenId, amount, "");
        _setURI(newTokenId, tokenURI);
        tokenMetadata[newTokenId] = metadata;

        emit TokenMinted(recipient, newTokenId, amount, tokenURI);
        return newTokenId;
    }

    // Simple mint function that matches the current API call signature
    function mint(address minter, string memory tokenURI) public whenNotPaused returns (uint256) {
        uint256 newTokenId = _currentTokenId++;

        // Create default metadata
        TokenMetadata memory metadata = TokenMetadata({
            name: string(abi.encodePacked("NFT #", newTokenId.toString())),
            description: "NFT created via simple mint function",
            image: "",
            external_url: "",
            attributes: new string[](0)
        });

        _mint(minter, newTokenId, 1, "");
        _setURI(newTokenId, tokenURI);
        tokenMetadata[newTokenId] = metadata;

        emit TokenMinted(minter, newTokenId, 1, tokenURI);
        return newTokenId;
    }

    function batchMintNFT(
        address recipient,
        uint256[] memory amounts,
        string[] memory tokenURIs,
        TokenMetadata[] memory metadataArray
    ) public onlyOwner whenNotPaused returns (uint256[] memory) {
        require(tokenURIs.length == metadataArray.length, "Arrays length mismatch");
        require(amounts.length == tokenURIs.length, "Amounts and URIs length mismatch");

        uint256[] memory tokenIds = new uint256[](tokenURIs.length);

        for (uint256 i = 0; i < tokenURIs.length; i++) {
            uint256 newTokenId = _currentTokenId++;

            _mint(recipient, newTokenId, amounts[i], "");
            _setURI(newTokenId, tokenURIs[i]);
            tokenMetadata[newTokenId] = metadataArray[i];

            tokenIds[i] = newTokenId;
        }

        emit BatchMinted(recipient, tokenIds, amounts);
        return tokenIds;
    }

    function updateTokenMetadata(
        uint256 tokenId,
        TokenMetadata memory metadata
    ) public onlyOwner {
        require(exists(tokenId), "Token does not exist");
        tokenMetadata[tokenId] = metadata;
        emit MetadataUpdated(tokenId, metadata.name, metadata.description);
    }

    function updateRoyalty(address recipient, uint256 percentage) public onlyOwner {
        require(percentage <= 1000, "Royalty percentage too high"); // Max 10%
        royaltyInfo = RoyaltyInfo(recipient, percentage);
        emit RoyaltyUpdated(recipient, percentage);
    }

    function getTokenMetadata(uint256 tokenId) public view returns (TokenMetadata memory) {
        require(exists(tokenId), "Token does not exist");
        return tokenMetadata[tokenId];
    }

    function getCurrentTokenId() public view returns (uint256) {
        return _currentTokenId;
    }

    function uri(uint256 tokenId) public view override(ERC1155, ERC1155URIStorage) returns (string memory) {
        return ERC1155URIStorage.uri(tokenId);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts
    ) internal override(ERC1155, ERC1155Supply) whenNotPaused {
        super._update(from, to, ids, amounts);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}