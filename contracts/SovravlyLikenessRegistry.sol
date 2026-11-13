// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SovravlyLikenessRegistry
 * @notice Self-executing on-chain biometric likeness registry and identity anchor.
 * "Sovravly: The Brother Protocol to Sovranly IP"
 *
 * CRITICAL ARCHITECTURAL & PRIVACY GUARANTEES:
 * 1. RAW BIOMETRIC MEDIA OFF-CHAIN: Raw photos, multi-angle frames, and voice WAV recordings
 *    are NEVER written to the blockchain. They are encrypted off-chain on the creator's client vault.
 * 2. ON-CHAIN COMMITS HASHES ONLY: This contract records ONLY cryptographic digests (Merkle root,
 *    SHA-256 / Keccak256 hashes) and machine-readable licensing covenants (ERC-2981 royalty splits).
 * 3. REGISTRY PURPOSE: A registry proves you own your likeness, establishes legal prior art, sets
 *    your commercial terms, and gives honest buyers a direct mechanism to pay you.
 *    Catching bad actors and deepfakes is an operational enforcement job handled via external crawlers
 *    and legal notice dispatchers (e.g. Royalty Spider & Official IP Communications).
 */
contract SovravlyLikenessRegistry is ERC721, ERC2981, AccessControl, Pausable {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    struct BiometricLikenessRecord {
        uint256 tokenId;
        address creator;
        string legalOrPersonaName;
        bytes32 headPoseMerkleRoot;    // 5-angle verification (center, left, right, up, down)
        bytes32 voiceprintAcousticHash; // SHA-256 acoustic biometric hash
        bytes32 fullBodySilhouetteHash; // Torso & body shot hash
        string ipfsMetadataUri;        // Encrypted biometric manifest & descriptor
        uint256 registrationTimestamp;
        bool commercialAiTrainingPermitted;
        uint96 minimumRoyaltyBasisPoints; // e.g. 8500 = 85% creator split
        bool active;
    }

    uint256 public nextTokenId = 1;
    mapping(uint256 => BiometricLikenessRecord) public likenessRecords;
    mapping(address => uint256[]) public creatorTokenIds;

    event LikenessAnchored(
        uint256 indexed tokenId, 
        address indexed creator, 
        string personaName, 
        bytes32 headPoseMerkleRoot, 
        bytes32 voiceprintHash
    );
    event CommercialTermsUpdated(uint256 indexed tokenId, bool permitted, uint96 royaltyBps);

    constructor(address initialAdmin) ERC721("SovravlyLikeness", "SOVRAVLY") {
        address admin = initialAdmin != address(0) ? initialAdmin : msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
        _grantRole(GUARDIAN_ROLE, admin);
    }

    function anchorLikeness(
        address to,
        string calldata personaName,
        bytes32 headPoseMerkleRoot,
        bytes32 voiceprintAcousticHash,
        bytes32 fullBodySilhouetteHash,
        string calldata ipfsMetadataUri,
        bool commercialAiTrainingPermitted,
        uint96 royaltyFeeNumerator
    ) external whenNotPaused returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(royaltyFeeNumerator <= 10000, "Fee exceeds 100%");

        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenRoyalty(tokenId, to, royaltyFeeNumerator);

        likenessRecords[tokenId] = BiometricLikenessRecord({
            tokenId: tokenId,
            creator: to,
            legalOrPersonaName: personaName,
            headPoseMerkleRoot: headPoseMerkleRoot,
            voiceprintAcousticHash: voiceprintAcousticHash,
            fullBodySilhouetteHash: fullBodySilhouetteHash,
            ipfsMetadataUri: ipfsMetadataUri,
            registrationTimestamp: block.timestamp,
            commercialAiTrainingPermitted: commercialAiTrainingPermitted,
            minimumRoyaltyBasisPoints: royaltyFeeNumerator,
            active: true
        });

        creatorTokenIds[to].push(tokenId);

        emit LikenessAnchored(tokenId, to, personaName, headPoseMerkleRoot, voiceprintAcousticHash);
        return tokenId;
    }

    function getCreatorLikenessCount(address creator) external view returns (uint256) {
        return creatorTokenIds[creator].length;
    }

    function emergencyPause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    function emergencyUnpause() external onlyRole(GUARDIAN_ROLE) {
        _unpause();
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
