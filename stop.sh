#!/bin/bash
OUT=$(ps -Alf | grep node | grep McpJsServer | awk '{print $4}')
if [ $OUT ]; then
    echo "Server PID was $OUT. kill -9 $OUT"
    kill -9 $OUT
else
    echo "Server is not Running."
fi

