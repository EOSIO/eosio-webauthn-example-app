#!/bin/bash
./scripts/start-chain.sh
haproxy -f haproxy-webauthn.cfg &> haproxy.log &
yarn server
