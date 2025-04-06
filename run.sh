#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

OUT=$(ps -Alf | grep node | grep McpJsServer | awk '{print $4}')
if [ $OUT ]; then
    echo "McpJsServer is already Running."
else
    echo "Start McpJsServer!"
    nvm use 
    nohup node McpJsServer.js > log.txt 2>&1 &
fi
