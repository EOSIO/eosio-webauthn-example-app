#!/bin/bash
./scripts/start-chain.sh
sleep 5s # Give nodeos time to startup
docker-compose exec nodeos-webauthn-producer /app/scripts/chain-setup.sh
./scripts/stop.sh
