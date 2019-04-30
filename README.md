
```
yarn
rm -rf node_modules/eosjs && bash -c "cd external/eosjs && yarn" && yarn add file:external/eosjs
rm -rf dist && yarn server
```

Connect to http://localhost:8000
