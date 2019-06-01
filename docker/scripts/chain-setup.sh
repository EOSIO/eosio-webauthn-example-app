#!/bin/bash
# Create wallet
cleos wallet create --file /app/wallet/.wallet-password
cleos wallet import --private-key 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3

# Enable webauthn feature of nodeos
curl -X POST http://127.0.0.1:8888/v1/producer/schedule_protocol_feature_activations -d '{"protocol_features_to_activate": ["0ec7e080177b2c02b278d5088611686b49d739925a92d9bfcacd7fc6b74053bd"]}' | jq

# Create token account
cleos create account eosio eosio.token EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV

sleep 1s # Sleep because there seems to be a race condition of trying to deploy the contract too quickly

# Deploy contracts
cleos set contract eosio /app/eosio.contracts/build/contracts/eosio.bios -p eosio
cleos set contract eosio.token /app/eosio.contracts/build/contracts/eosio.token -p eosio.token

# Initialize accounts
cleos push action eosio activate '["4fca8bd82bbd181e714e283f83e1b45d95ca5af40fb89ad3977b653c448f78c2"]' -p eosio
cleos push action eosio.token create '["eosio","10000000.0000 SYS"]' -p eosio.token
cleos push action eosio.token issue '["eosio","10000000.0000 SYS",""]' -p eosio
