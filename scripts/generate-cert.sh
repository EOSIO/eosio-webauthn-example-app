#!/bin/bash
openssl req \
-x509 \
-nodes \
-new \
-newkey rsa:4096 \
-keyout localhostca.key \
-out localhostca.crt \
-sha256 \
-days 3650 \
-config <(cat <<EOF

[ req ]
prompt = no
distinguished_name = subject
x509_extensions    = x509_ext

[ subject ]
commonName = localhost

[ x509_ext ]
subjectAltName = @alternate_names
basicConstraints=CA:TRUE,pathlen:0

[ alternate_names ]
DNS.1 = localhost

EOF
)

cat localhostca.crt localhostca.key > localhostca.pem

CLEAR="\033[0m"
GREEN="\033[32m"
YELLOW="\033[33m"
echo -e "${GREEN}Certificate generated, remember to import into your browser!${CLEAR}"
echo -e "${YELLOW}For security, it is recommended you remove this cert after testing is complete.${CLEAR}"
