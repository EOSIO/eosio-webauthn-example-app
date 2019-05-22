#!/bin/bash
docker run \
    -d \
    -p '8888:8888' \
    --name 'webauthn-nodeos' \
    -v "$(pwd)/webauthn-nodeos-data":/root/.local/share/eosio \
    -it eosio/eos-webauthn:latest \
    nodeos --data-dir /root/.local/share/eosio --plugin eosio::chain_api_plugin --plugin eosio::producer_api_plugin --http-validate-host 0 --access-control-allow-origin "*" --http-server-address=0.0.0.0:8888 -p eosio -e

haproxy -f haproxy-webauthn.cfg &> haproxy.log &
yarn server
