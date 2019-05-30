#!/bin/bash
docker pull eosio/nodeos-webauthn:latest

# Frontend setup
./scripts/frontend-setup.sh

# Create Local Cert
./scripts/generate-cert.sh

# Setup Chain
./scripts/chain-setup.sh
