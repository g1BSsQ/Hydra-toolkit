# Credentials Directory Structure

This directory should contain the signing and verification keys for both Alice and Bob nodes.

## Required Files

### Alice Keys

- `alice-node.sk` - Alice's Cardano node signing key
- `alice-node.vk` - Alice's Cardano node verification key
- `alice-hydra.sk` - Alice's Hydra signing key
- `alice-hydra.vk` - Alice's Hydra verification key

### Bob Keys

- `bob-node.sk` - Bob's Cardano node signing key
- `bob-node.vk` - Bob's Cardano node verification key
- `bob-hydra.sk` - Bob's Hydra signing key
- `bob-hydra.vk` - Bob's Hydra verification key

## Generating Keys

You can generate these keys using the Hydra CLI tools:

```bash
# Generate Cardano keys
cardano-cli address key-gen \
  --verification-key-file alice-node.vk \
  --signing-key-file alice-node.sk

cardano-cli address key-gen \
  --verification-key-file bob-node.vk \
  --signing-key-file bob-node.sk

# Generate Hydra keys
hydra-tools gen-hydra-key --output-file alice-hydra
hydra-tools gen-hydra-key --output-file bob-hydra
```

## Security

⚠️ **Important**: Keep your signing keys secure and never commit them to version control!

This directory should be added to `.gitignore` to prevent accidental commits.
