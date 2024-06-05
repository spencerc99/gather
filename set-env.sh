#!/bin/bash

if [ $# -lt 1 ]; then
  echo "Usage: $0 <command>"
  exit 1
fi

(env $(cat .env | xargs) "$@")
