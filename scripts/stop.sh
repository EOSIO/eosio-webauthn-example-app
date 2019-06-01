#!/bin/bash
docker-compose down
pgrep haproxy | xargs kill
