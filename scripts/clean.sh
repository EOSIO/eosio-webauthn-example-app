#!/bin/bash
docker stop webauthn-nodeos &> /dev/null
docker rm webauthn-nodeos &> /dev/null
docker volume rm webauthn-nodeos-data &> /dev/null
