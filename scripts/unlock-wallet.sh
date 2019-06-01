#!/bin/bash
docker-compose exec nodeos-webauthn-producer bash -c "cleos wallet unlock --password < /app/wallet/.wallet-password"
