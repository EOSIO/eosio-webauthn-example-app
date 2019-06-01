#!/bin/bash
pushd docker
docker build . -t eosio/nodeos-webauthn:latest -f Dockerfile-eosio
popd
