#!/bin/bash
# Re-sync local code to the EC2 instance and rebuild/restart the stack.
# Run from repo root:  bash deploy/redeploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PUBIP=$(cat deploy/.pubip)
KEY=deploy/complypatch-key.pem

rsync -az --delete -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
  --exclude '.git' --exclude 'node_modules' --exclude '.next' \
  --exclude '.venv' --exclude '__pycache__' --exclude '*.pyc' --exclude '.pytest_cache' \
  ./ "ec2-user@$PUBIP:~/app/"

ssh -i "$KEY" -o StrictHostKeyChecking=no "ec2-user@$PUBIP" \
  "cd ~/app && export DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 && \
   docker compose build && docker compose up -d && docker compose ps"

echo "Redeployed. App: https://$(cat deploy/.cfdomain)/"
