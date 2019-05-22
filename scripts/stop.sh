#!/bin/bash
docker stop webauthn-nodeos
docker rm webauthn-nodeos
pgrep haproxy | xargs kill 