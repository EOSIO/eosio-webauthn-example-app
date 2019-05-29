#!/bin/bash
./scripts/start-chain.sh
sleep 5s # Give nodeos time to startup
docker exec -it webauthn-nodeos /app/scripts/chain-setup.sh
./scripts/stop.sh