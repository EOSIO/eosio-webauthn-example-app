#!/bin/bash
# Frontend setup
./scripts/frontend-setup.sh

# Create Local Cert
./scripts/generate-cert.sh

# Setup Chain
./scripts/chain-setup.sh