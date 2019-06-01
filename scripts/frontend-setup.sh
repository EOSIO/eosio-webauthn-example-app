#!/bin/bash
# Setup JS App
yarn
rm -rf node_modules/eosjs 
(
    cd external/eosjs && yarn
)
yarn add file:external/eosjs