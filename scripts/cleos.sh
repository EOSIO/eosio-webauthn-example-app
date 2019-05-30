#!/bin/bash
./scripts/unlock-wallet.sh
docker-compose exec nodeos-webauthn-producer cleos "$@"
