#!/bin/bash
pushd docker
docker build . -t eosio/eos-webauthn:latest -f Dockerfile-eosio
popd
