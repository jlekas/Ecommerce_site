#!/bin/bash
sudo yum update
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 6.11.2
cd ~/project4
npm install
npm install -g pm2
pm2 start app.js
pm2 startup
pm2 save

